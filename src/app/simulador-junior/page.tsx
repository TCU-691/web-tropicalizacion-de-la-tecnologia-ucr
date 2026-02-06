"use client";

import React, { useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

type CsvObject = {
  id: string;
  filename: string;
  size: number;
  rows: number;
  cols: number;
  uploadedAt: number;
  raw: string;
};

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 100, y: 100 },
    data: { label: "Generador" },
    type: "default",
  },
];

function quickCsvStats(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows = Math.max(0, lines.length - 1); // asume header en 1ra fila
  const header = lines[0] ?? "";
  const cols = header.length ? header.split(",").length : 0;

  return { rows, cols };
}

export default function GridEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [objects, setObjects] = useState<CsvObject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems = useMemo(() => objects, [objects]);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // permitir volver a subir el mismo archivo
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
    };

    setObjects((prev) => [...prev, newObj]);
  };

  const addNodeFromObject = (obj: CsvObject) => {
    const id = crypto.randomUUID();
    setNodes((prev) => [
      ...prev,
      {
        id,
        position: { x: 200 + prev.length * 30, y: 140 + prev.length * 20 },
        data: { label: obj.filename },
        type: "default",
      },
    ]);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        zIndex: 0,
        background: "transparent",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(params) => setEdges((eds) => addEdge(params, eds))}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* ===== Barra inferior tipo menú (dock) ===== */}
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 18,
          height: 120,
          zIndex: 50,
          pointerEvents: "none", // importante: no bloquear la pizarra
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.18)",
            background:
              "linear-gradient(180deg, rgba(240,240,240,0.95), rgba(220,220,220,0.95))",
            boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            padding: "14px 14px",
            gap: 14,
            pointerEvents: "auto", // ahora sí recibe clicks dentro
          }}
        >
          {/* Lista de objetos (scroll horizontal) */}
          <div
            style={{
              flex: 1,
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              overflowX: "auto",
              overflowY: "hidden",
              paddingBottom: 6,
            }}
          >
            {menuItems.length === 0 ? (
              <div
                style={{
                  height: 86,
                  minWidth: 260,
                  borderRadius: 12,
                  border: "1px dashed rgba(0,0,0,0.25)",
                  background: "rgba(255,255,255,0.55)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "10px 12px",
                  color: "rgba(0,0,0,0.65)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Menú de objetos
                </div>
                <div>Importá un CSV para que aparezca aquí.</div>
              </div>
            ) : (
              menuItems.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => addNodeFromObject(obj)}
                  title="Click para agregar a la pizarra"
                  style={{
                    height: 86,
                    minWidth: 140,
                    maxWidth: 220,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.20)",
                    background: "rgba(255,255,255,0.75)",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {obj.filename}
                  </div>

                  <div style={{ fontSize: 12, color: "rgba(0,0,0,0.70)" }}>
                    {obj.rows} filas · {obj.cols} cols
                  </div>

                  <div style={{ fontSize: 11, color: "rgba(0,0,0,0.55)" }}>
                    {(obj.size / 1024).toFixed(1)} KB
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Botón + CSV al extremo derecho */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              style={{ display: "none" }}
            />

            <button
              onClick={openFilePicker}
              style={{
                height: 86,
                width: 86,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "rgba(255,255,255,0.85)",
                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                fontSize: 34,
                fontWeight: 700,
                lineHeight: 1,
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