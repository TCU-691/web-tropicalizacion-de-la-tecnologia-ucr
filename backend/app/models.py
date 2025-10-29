from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class PowerProfileData(BaseModel):
    """Basic time-power profile used by the CSV upload endpoint."""
    time: List[str]
    power: List[float]


class GenerationProfiles(BaseModel):
    """Optional generation profiles as direct power (kW) time series aligned with demand."""
    pv: Optional[List[float]] = None
    wind: Optional[List[float]] = None
    other: Optional[Dict[str, List[float]]] = None

# Configuration for battery system in the microgrid.
class BatteryConfig(BaseModel):
    capacity_kwh: float = Field(..., gt=0)
    soc_init_pct: float = Field(50.0, ge=0.0, le=100.0)
    soc_min_pct: float = Field(10.0, ge=0.0, lt=100.0)
    soc_max_pct: float = Field(95.0, gt=0.0, le=100.0)
    charge_power_kw: float = Field(..., gt=0)
    discharge_power_kw: float = Field(..., gt=0)
    charge_efficiency: float = Field(0.95, gt=0.0, le=1.0)
    discharge_efficiency: float = Field(0.95, gt=0.0, le=1.0)

# Configuration for diesel or other generator in the microgrid.
class GeneratorConfig(BaseModel):
    enabled: bool = True
    max_power_kw: float = Field(0.0, ge=0.0)
    min_loading_pct: float = Field(0.2, ge=0.0, le=1.0)
    fuel_l_per_kwh: float = Field(0.27, ge=0.0)  # simple constant rate
    variable_cost_per_kwh: float = Field(0.0, ge=0.0)
    co2_kg_per_kwh: float = Field(0.0, ge=0.0)

# Configuration for grid interaction in the microgrid.
class GridConfig(BaseModel):
    allow_import: bool = True
    allow_export: bool = True
    import_tariff_per_kwh: float = Field(0.15, ge=0.0)
    export_tariff_per_kwh: float = Field(0.05, ge=0.0)
    import_limit_kw: Optional[float] = Field(None, ge=0.0)
    export_limit_kw: Optional[float] = Field(None, ge=0.0)
    priority: str = Field("after_gen", description="Order to use grid import relative to generator: 'before_gen' or 'after_gen'")

# Simulation configuration including all components.
class SimulationConfig(BaseModel):
    battery: Optional[BatteryConfig] = None
    generator: Optional[GeneratorConfig] = None
    grid: Optional[GridConfig] = GridConfig()
    step_minutes: Optional[int] = Field(None, gt=0, description="Timestep in minutes; if None it will be inferred from time array")

# Request model for simulation endpoint.
class SimulationRequest(BaseModel):
    time: List[str]
    demand_kw: List[float]
    generation: Optional[GenerationProfiles] = None
    config: SimulationConfig

# Result model for simulation endpoint.
class SimulationSummary(BaseModel):
    total_demand_kwh: float
    total_pv_kwh: float
    total_wind_kwh: float
    total_renewables_kwh: float
    total_battery_charge_kwh: float
    total_battery_discharge_kwh: float
    total_generator_kwh: float
    total_grid_import_kwh: float
    total_grid_export_kwh: float
    total_unmet_kwh: float
    total_curtailed_kwh: float
    lolp_pct: float
    cost_import: float
    revenue_export: float
    cost_generator: float
    total_cost: float
    total_co2_kg: float

# Result model for simulation endpoint.
class SimulationResult(BaseModel):
    time: List[str]
    demand_kw: List[float]
    pv_kw: List[float]
    wind_kw: List[float]
    renewables_kw: List[float]
    batt_charge_kw: List[float]
    batt_discharge_kw: List[float]
    batt_soc_pct: List[float]
    generator_kw: List[float]
    grid_import_kw: List[float]
    grid_export_kw: List[float]
    unmet_kw: List[float]
    curtailed_kw: List[float]
    summary: SimulationSummary