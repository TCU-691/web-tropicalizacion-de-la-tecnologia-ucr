"use client";
import React, { useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  type Edge,
  type OnConnect,
} from "reactflow";
import "reactflow/dist/style.css";

import GeneratorNode from "../components/GeneratorNode";
import ChargeNode from "../components/ChargeNode";
import BatteryNode from "../components/BatteryNode";
import SwitchNode from "../components/SwitchNode";
import BusNode from "../components/BusNode";

type PowerNodeType = "generator" | "battery" | "charge";
type CustomNodeType = PowerNodeType | "switch" | "bus";

type CsvObject = {
  id: string;
  filename: string;
  size: number;
  rows: number;
  cols: number;
  uploadedAt: number;
  raw: string;
  nodeType: PowerNodeType;
};

type NodeData = {
  label: string;
  sourceCsvId?: string;
  isClosed?: boolean; // switch
  inputs?: number;    // bus
  outputs?: number;   // bus
};

const nodeTypes = {
  generator: GeneratorNode,
  charge: ChargeNode,
  battery: BatteryNode,
  switch: SwitchNode,
  bus: BusNode,
};

const initialNodes = [
  {
    id: "1",
    type: "generator" as const,
    position: { x: 100, y: 120 },
    data: { label: "Generador" },
  },
];

function quickCsvStats(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows = Math.max(0, lines.length - 1);
  const header = lines[0] ?? "";
  const cols = header.length ? header.split(",").length : 0;

  return { rows, cols };
}

function labelFromType(t: PowerNodeType) {
  if (t === "generator") return "Generador";
  if (t === "battery") return "Batería";
  return "Carga";
}

export default function GridEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [objects, setObjects] = useState<CsvObject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MENÚ CENTRADO CSV
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [pendingNodeType, setPendingNodeType] = useState<PowerNodeType>("charge");

  // MENÚ CENTRADO BUS (config)
  const [isBusMenuOpen, setIsBusMenuOpen] = useState(false);
  const [pendingBusInputs, setPendingBusInputs] = useState<number>(4);
  const [pendingBusOutputs, setPendingBusOutputs] = useState<number>(1);

  const menuItems = useMemo(() => objects, [objects]);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    if (!file.name.toLowerCase().endsWith(".csv")) return;

    const raw = await file.text();
    const { rows, cols } = quickCsvStats(raw);

    const newObj: CsvObject = {
      id: crypto.randomUUID(),
      filename: file.name.replace(/\.csv$/i, ""),
      size: file.size,
      rows,
      cols,
      uploadedAt: Date.now(),
      raw,
      nodeType: pendingNodeType,
    };

    setObjects((prev) => [...prev, newObj]);
  };

  const addNodeFromObject = (obj: CsvObject) => {
    const id = crypto.randomUUID();

    setNodes((prev) => [
      ...prev,
      {
        id,
        position: { x: 220 + prev.length * 30, y: 160 + prev.length * 20 },
        data: { label: obj.filename, sourceCsvId: obj.id },
        type: obj.nodeType as CustomNodeType,
      },
    ]);
  };

  const removeObject = (csvId: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== csvId));
    setNodes((prev) => prev.filter((n) => n.data?.sourceCsvId !== csvId));

    setEdges((prevEdges) => {
      const remainingNodeIds = new Set(
        nodes.filter((n) => n.data?.sourceCsvId !== csvId).map((n) => n.id)
      );
      return prevEdges.filter(
        (e) => remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
      );
    });
  };

  const deleteSelected = () => {
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (!selectedIds.size) return;

    setNodes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setEdges((prev) =>
      prev.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target))
    );
  };

  const onConnect: OnConnect = (params) => {
  if (params.source === params.target) return;

  const sourceNode = nodes.find((n) => n.id === params.source);
  const targetNode = nodes.find((n) => n.id === params.target);

  const sourceType = sourceNode?.type as CustomNodeType | undefined;
  const targetType = targetNode?.type as CustomNodeType | undefined;

  // no salir de la carga
  if (sourceType === "charge") return;

  const isPowerSource = sourceType === "generator" || sourceType === "battery";
  const isSwitch = sourceType === "switch";
  const isBus = sourceType === "bus";

  const allow =
    // fuentes (gen/bat) -> bus/switch/charge/battery (si querés cargar la batería)
    (isPowerSource &&
      (targetType === "bus" ||
        targetType === "switch" ||
        targetType === "charge" ||
        targetType === "battery")) ||

    // switch -> bus/charge/battery/switch
    (isSwitch &&
      (targetType === "bus" ||
        targetType === "charge" ||
        targetType === "battery" ||
        targetType === "switch")) ||

    // bus -> charge/switch/battery  
    (isBus &&
      (targetType === "charge" ||
        targetType === "switch" ||
        targetType === "battery"));

  if (!allow) return;

  setEdges((eds) => addEdge(params, eds));
};

  const chooseTypeAndPickFile = (t: PowerNodeType) => {
    setPendingNodeType(t);
    setIsAddMenuOpen(false);
    openFilePicker();
  };

  const addSwitchNode = () => {
    const id = crypto.randomUUID();
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "switch",
        position: { x: 260 + prev.length * 20, y: 110 + prev.length * 16 },
        data: { label: "Switch", isClosed: true },
      },
    ]);
  };

  // Abrir menú de bus
  const openBusConfigMenu = () => setIsBusMenuOpen(true);

  // Crear bus con config elegida
  const createBusWithConfig = () => {
    const id = crypto.randomUUID();
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "bus",
        position: { x: 420 + prev.length * 8, y: 80 + prev.length * 8 },
        data: { label: "Bus", inputs: pendingBusInputs, outputs: pendingBusOutputs },
      },
    ]);
    setIsBusMenuOpen(false);
  };

  // cerrar menús al click fuera
  const closeAllMenus = () => {
    setIsAddMenuOpen(false);
    setIsBusMenuOpen(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0 }} onClick={closeAllMenus}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        onNodesDelete={(deleted) => {
          const deletedIds = new Set(deleted.map((n) => n.id));
          setEdges((prev) =>
            prev.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
          );
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/*  MENÚ CENTRADO CSV */}
      {isAddMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 240,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.20)",
            background: "white",
            padding: 16,
            zIndex: 9999,
            boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
            textAlign: "center",
          }}
        >
          <h4 style={{ marginBottom: 14, fontWeight: 800, fontSize: 15 }}>
            Agregar CSV como:
          </h4>

          {[
            { t: "generator", label: "Generador" },
            { t: "battery", label: "Batería" },
            { t: "charge", label: "Carga" },
          ].map((item) => (
            <button
              key={item.t}
              onClick={() => chooseTypeAndPickFile(item.t as PowerNodeType)}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "rgba(245,245,245,0.96)",
                cursor: "pointer",
                marginBottom: 10,
                fontWeight: 800,
              }}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => setIsAddMenuOpen(false)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.90)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/*  MENÚ CENTRADO BUS (config entradas/salidas) */}
      {isBusMenuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 280,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.20)",
            background: "white",
            padding: 16,
            zIndex: 10000,
            boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
            textAlign: "center",
          }}
        >
          <h4 style={{ marginBottom: 12, fontWeight: 900, fontSize: 15 }}>
            Configurar Bus
          </h4>

          {/* Inputs */}
          <div style={{ textAlign: "left", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              Entradas (inputs)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPendingBusInputs((v) => Math.max(1, v - 1))}
                style={{
                  width: 40,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(245,245,245,0.96)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                –
              </button>
              <div
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
              >
                {pendingBusInputs}
              </div>
              <button
                onClick={() => setPendingBusInputs((v) => Math.min(12, v + 1))}
                style={{
                  width: 40,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(245,245,245,0.96)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Outputs */}
          <div style={{ textAlign: "left", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              Salidas (outputs)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPendingBusOutputs((v) => Math.max(1, v - 1))}
                style={{
                  width: 40,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(245,245,245,0.96)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                –
              </button>
              <div
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
              >
                {pendingBusOutputs}
              </div>
              <button
                onClick={() => setPendingBusOutputs((v) => Math.min(12, v + 1))}
                style={{
                  width: 40,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(245,245,245,0.96)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={createBusWithConfig}
            style={{
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.20)",
              background: "rgba(245,245,245,0.96)",
              cursor: "pointer",
              fontWeight: 900,
              marginBottom: 10,
            }}
          >
            Crear Bus
          </button>

          <button
            onClick={() => setIsBusMenuOpen(false)}
            style={{
              width: "100%",
              height: 32,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.90)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ---------------- MENU INFERIOR ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 24,
          bottom: 18,
          height: 120,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.20)",
            background: "linear-gradient(180deg, #f5f5f5, #ddd)",
            boxShadow: "inset 0 1px white, 0 12px 30px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            padding: 14,
            gap: 14,
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* LISTA DE CSVs */}
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: 14,
              overflowX: "auto",
              height: "100%",
              alignItems: "center",
            }}
          >
            {menuItems.length === 0 ? (
              <div
                style={{
                  height: 86,
                  minWidth: 260,
                  borderRadius: 12,
                  border: "1px dashed rgba(0,0,0,0.25)",
                  background: "rgba(255,255,255,0.60)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>Menú de objetos</div>
                <div style={{ fontSize: 12 }}>Importá un CSV para que aparezca aquí.</div>
              </div>
            ) : (
              menuItems.map((obj) => (
                <div
                  key={obj.id}
                  style={{
                    height: 86,
                    minWidth: 170,
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => addNodeFromObject(obj)}
                    title="Agregar a la pizarra"
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.20)",
                      background: "white",
                      boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{obj.filename}</div>
                    <div style={{ fontSize: 12 }}>{obj.rows} intervalos</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                      Tipo: {labelFromType(obj.nodeType)}
                    </div>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeObject(obj.id);
                    }}
                    aria-label={`Eliminar ${obj.filename}`}
                    title="Eliminar este CSV del menú"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "1px solid rgba(0,0,0,0.25)",
                      background: "white",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* BOTONES DERECHA */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={deleteSelected}
              style={{
                height: 86,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "white",
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title="Borra nodos seleccionados"
            >
              Eliminar seleccionado
            </button>

            <button
              onClick={addSwitchNode}
              style={{
                height: 86,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "white",
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title="Agregar switch"
            >
              Switch
            </button>

            {/* BUS: ahora abre menú de configuración */}
            <button
              onClick={openBusConfigMenu}
              style={{
                height: 86,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "white",
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              title="Agregar bus (configurar entradas/salidas)"
            >
              Bus
            </button>

            {/* input oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              style={{ display: "none" }}
            />

            {/* botón + (abre menú centrado CSV) */}
            <button
              onClick={() => setIsAddMenuOpen((v) => !v)}
              style={{
                height: 86,
                width: 86,
                fontSize: 34,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "white",
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                cursor: "pointer",
              }}
              title="Agregar CSV"
              aria-label="Agregar CSV"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}