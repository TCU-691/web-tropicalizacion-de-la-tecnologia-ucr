from __future__ import annotations

from typing import List, Optional, Dict, Tuple
from datetime import datetime

from .models import (
    SimulationRequest,
    SimulationResult,
    SimulationSummary,
)

# Infer timestep in minutes from time array.
def _infer_step_minutes(time: List[str]) -> int:
    if len(time) < 2:
        return 60
    try:
        t0 = datetime.fromisoformat(time[0].replace("Z", ""))
        t1 = datetime.fromisoformat(time[1].replace("Z", ""))
        dt = int(round((t1 - t0).total_seconds() / 60.0))
        return max(dt, 1)
    except Exception:
        return 60

# Generate an array of zeros of length n.
def _zeros(n: int) -> List[float]:
    return [0.0] * n

# Sum other generation profiles into a single array.
def _sum_other_gen(other: Optional[Dict[str, List[float]]], n: int) -> List[float]:
    if not other:
        return _zeros(n)
    acc = [0.0] * n
    for arr in other.values():
        for i in range(min(n, len(arr))):
            acc[i] += float(arr[i])
    return acc

# Simulate microgrid operation based on input profiles and configuration. 
# Should return detailed time series and summary statistics
# TODO: Modularize further for readability and maintainability.
def simulate_microgrid(req: SimulationRequest) -> SimulationResult:
    n = len(req.time)
    if len(req.demand_kw) != n:
        raise ValueError("Length of demand_kw must match length of time")

    step_min = req.config.step_minutes or _infer_step_minutes(req.time)
    dt_h = step_min / 60.0

    # Generation profiles aligned
    pv = req.generation.pv if (req.generation and req.generation.pv) else _zeros(n)
    wind = req.generation.wind if (req.generation and req.generation.wind) else _zeros(n)
    other = _sum_other_gen(req.generation.other if req.generation else None, n)
    renew = [0.0] * n
    for i in range(n):
        renew[i] = float(pv[i] if i < len(pv) else 0.0) + \
                   float(wind[i] if i < len(wind) else 0.0) + \
                   float(other[i] if i < len(other) else 0.0)

    # Configs
    grid = req.config.grid
    gen_cfg = req.config.generator
    batt_cfg = req.config.battery

    # Battery state
    batt_soc_pct = []  # per step end-of-interval
    batt_charge_kw = _zeros(n)
    batt_discharge_kw = _zeros(n)
    batt_kwh: float = 0.0
    batt_min_kwh: float = 0.0
    batt_max_kwh: float = 0.0
    if batt_cfg:
        batt_kwh = batt_cfg.capacity_kwh * (batt_cfg.soc_init_pct / 100.0)
        batt_min_kwh = batt_cfg.capacity_kwh * (batt_cfg.soc_min_pct / 100.0)
        batt_max_kwh = batt_cfg.capacity_kwh * (batt_cfg.soc_max_pct / 100.0)

    generator_kw = _zeros(n)
    grid_import_kw = _zeros(n)
    grid_export_kw = _zeros(n)
    unmet_kw = _zeros(n)
    curtailed_kw = _zeros(n)

    # Metrics accumulators (kWh)
    total_pv_kwh = 0.0
    total_wind_kwh = 0.0
    total_renew_kwh = 0.0
    total_batt_ch_kwh = 0.0
    total_batt_dis_kwh = 0.0
    total_gen_kwh = 0.0
    total_grid_imp_kwh = 0.0
    total_grid_exp_kwh = 0.0
    total_unmet_kwh = 0.0
    total_curt_kwh = 0.0

    # Cost and emissions
    cost_import = 0.0
    revenue_export = 0.0
    cost_generator = 0.0
    total_co2_kg = 0.0

    # This needs modularization, looks awful
    for i in range(n):
        demand = float(req.demand_kw[i])
        p_pv = float(pv[i] if i < len(pv) else 0.0)
        p_wind = float(wind[i] if i < len(wind) else 0.0)
        p_other = float(other[i] if i < len(other) else 0.0)
        p_ren = p_pv + p_wind + p_other

        # Track production kWh regardless of usage
        total_pv_kwh += p_pv * dt_h
        total_wind_kwh += p_wind * dt_h
        total_renew_kwh += p_ren * dt_h

        net = p_ren - demand  # positive = surplus

        # Surplus case: charge battery, then export/curtail
        if net >= 0.0:
            surplus = net
            # Battery charge
            if batt_cfg and surplus > 0:
                # Maximum charging power w.r.t power and SOC
                soc_room_kwh = max(0.0, batt_max_kwh - batt_kwh)
                if dt_h > 0 and batt_cfg.charge_efficiency > 0:
                    p_soc_limit = soc_room_kwh / (batt_cfg.charge_efficiency * dt_h)
                else:
                    p_soc_limit = 0.0
                p_ch = max(0.0, min(surplus, batt_cfg.charge_power_kw, p_soc_limit))
                batt_charge_kw[i] = p_ch
                # energy stored
                e_in = p_ch * dt_h * batt_cfg.charge_efficiency
                batt_kwh = min(batt_kwh + e_in, batt_max_kwh)
                total_batt_ch_kwh += e_in
                surplus -= p_ch

            # Grid export or curtail
            if surplus > 0:
                if grid and grid.allow_export:
                    exp_limit = grid.export_limit_kw if grid.export_limit_kw is not None else surplus
                    p_exp = min(surplus, exp_limit)
                    grid_export_kw[i] = p_exp
                    e_exp = p_exp * dt_h
                    total_grid_exp_kwh += e_exp
                    revenue_export += e_exp * (grid.export_tariff_per_kwh if grid else 0.0)
                    surplus -= p_exp
                # Any remaining is curtailed
                if surplus > 0:
                    curtailed_kw[i] = surplus
                    total_curt_kwh += surplus * dt_h

        # Deficit case: discharge battery, then grid/gen/unmet
        else:
            deficit = -net  # positive magnitude

            # Battery discharge
            if batt_cfg and deficit > 0:
                avail_kwh = max(0.0, batt_kwh - batt_min_kwh)
                if dt_h > 0:
                    p_soc_limit = (avail_kwh * batt_cfg.discharge_efficiency) / dt_h
                else:
                    p_soc_limit = 0.0
                p_dis = max(0.0, min(deficit, batt_cfg.discharge_power_kw, p_soc_limit))
                batt_discharge_kw[i] = p_dis
                # energy removed from battery
                e_out = p_dis * dt_h / (batt_cfg.discharge_efficiency if batt_cfg.discharge_efficiency > 0 else 1.0)
                batt_kwh = max(batt_kwh - e_out, batt_min_kwh)
                total_batt_dis_kwh += p_dis * dt_h
                deficit -= p_dis

            def use_grid(need: float) -> float:
                if not grid or not grid.allow_import or need <= 0:
                    return 0.0
                imp_limit = grid.import_limit_kw if grid.import_limit_kw is not None else need
                p_imp = min(need, imp_limit)
                return p_imp

            def use_gen(need: float) -> Tuple[float, float, float]:
                """Return (p_gen, p_excess_export, p_excess_curtail)."""
                if not gen_cfg or not gen_cfg.enabled or gen_cfg.max_power_kw <= 0 or need <= 0:
                    return 0.0, 0.0, 0.0
                min_load = gen_cfg.min_loading_pct * gen_cfg.max_power_kw
                p_gen = min(need, gen_cfg.max_power_kw)
                if 0 < p_gen < min_load:
                    p_gen = min_load
                excess = max(0.0, p_gen - need)
                p_exp = 0.0
                p_cur = 0.0
                if excess > 0:
                    if grid and grid.allow_export:
                        exp_limit = grid.export_limit_kw if grid.export_limit_kw is not None else excess
                        p_exp = min(excess, exp_limit)
                        excess -= p_exp
                    if excess > 0:
                        p_cur = excess
                return p_gen, p_exp, p_cur

            # Dispatch order based on grid priority
            if grid and grid.priority == "before_gen":
                # Grid import first
                p_imp = use_grid(deficit)
                grid_import_kw[i] = p_imp
                total_grid_imp_kwh += p_imp * dt_h
                cost_import += p_imp * dt_h * (grid.import_tariff_per_kwh if grid else 0.0)
                deficit -= p_imp

                # Then generator
                p_gen, p_exp, p_cur = use_gen(deficit)
                generator_kw[i] = p_gen
                total_gen_kwh += p_gen * dt_h
                cost_generator += p_gen * dt_h * (gen_cfg.variable_cost_per_kwh if gen_cfg else 0.0)
                total_co2_kg += p_gen * dt_h * (gen_cfg.co2_kg_per_kwh if gen_cfg else 0.0)
                # handle export/curtail from generator
                if p_exp > 0:
                    grid_export_kw[i] += p_exp
                    total_grid_exp_kwh += p_exp * dt_h
                    revenue_export += p_exp * dt_h * (grid.export_tariff_per_kwh if grid else 0.0)
                if p_cur > 0:
                    curtailed_kw[i] += p_cur
                    total_curt_kwh += p_cur * dt_h
                deficit -= min(deficit, p_gen)
            else:
                # Generator first
                p_gen, p_exp, p_cur = use_gen(deficit)
                generator_kw[i] = p_gen
                total_gen_kwh += p_gen * dt_h
                cost_generator += p_gen * dt_h * (gen_cfg.variable_cost_per_kwh if gen_cfg else 0.0)
                total_co2_kg += p_gen * dt_h * (gen_cfg.co2_kg_per_kwh if gen_cfg else 0.0)
                # export/curtail from generator
                if p_exp > 0:
                    grid_export_kw[i] += p_exp
                    total_grid_exp_kwh += p_exp * dt_h
                    revenue_export += p_exp * dt_h * (grid.export_tariff_per_kwh if grid else 0.0)
                if p_cur > 0:
                    curtailed_kw[i] += p_cur
                    total_curt_kwh += p_cur * dt_h
                deficit -= min(deficit, p_gen)

                # Then grid import
                if deficit > 0:
                    p_imp = use_grid(deficit)
                    grid_import_kw[i] += p_imp
                    total_grid_imp_kwh += p_imp * dt_h
                    cost_import += p_imp * dt_h * (grid.import_tariff_per_kwh if grid else 0.0)
                    deficit -= p_imp

            # Anything left unmet
            if deficit > 0:
                unmet_kw[i] = deficit
                total_unmet_kwh += deficit * dt_h

        # Record SOC
        if batt_cfg:
            soc_pct = 100.0 * (batt_kwh / batt_cfg.capacity_kwh) if batt_cfg.capacity_kwh > 0 else 0.0
            batt_soc_pct.append(max(0.0, min(100.0, soc_pct)))
        else:
            batt_soc_pct.append(0.0)

    total_demand_kwh = sum(float(d) for d in req.demand_kw) * dt_h
    lolp_pct = 100.0 * (sum(1 for p in unmet_kw if p > 1e-6) / n) if n > 0 else 0.0
    total_cost = cost_import - revenue_export + cost_generator

    # Build summary with all metrics
    summary = SimulationSummary(
        total_demand_kwh=total_demand_kwh,
        total_pv_kwh=total_pv_kwh,
        total_wind_kwh=total_wind_kwh,
        total_renewables_kwh=total_renew_kwh,
        total_battery_charge_kwh=total_batt_ch_kwh,
        total_battery_discharge_kwh=total_batt_dis_kwh,
        total_generator_kwh=total_gen_kwh,
        total_grid_import_kwh=total_grid_imp_kwh,
        total_grid_export_kwh=total_grid_exp_kwh,
        total_unmet_kwh=total_unmet_kwh,
        total_curtailed_kwh=total_curt_kwh,
        lolp_pct=lolp_pct,
        cost_import=cost_import,
        revenue_export=revenue_export,
        cost_generator=cost_generator,
        total_cost=total_cost,
        total_co2_kg=total_co2_kg,
    )

    # Return detailed results
    return SimulationResult(
        time=req.time,
        demand_kw=[float(x) for x in req.demand_kw],
        pv_kw=[float(x) for x in pv],
        wind_kw=[float(x) for x in wind],
        renewables_kw=[float(x) for x in renew],
        batt_charge_kw=batt_charge_kw,
        batt_discharge_kw=batt_discharge_kw,
        batt_soc_pct=batt_soc_pct,
        generator_kw=generator_kw,
        grid_import_kw=grid_import_kw,
        grid_export_kw=grid_export_kw,
        unmet_kw=unmet_kw,
        curtailed_kw=curtailed_kw,
        summary=summary,
    )
