"use client";

import React, { useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  type Node,
  type Edge,
  type OnConnect,
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

type NodeData = {
  label: string;
  // para poder borrar nodos asociados a un CSV
  sourceCsvId?: string;
};

const initialNodes: Node<NodeData>[] = [
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

  const rows = Math.max(0, lines.length - 1);
  const header = lines[0] ?? "";
  const cols = header.length ? header.split(",").length : 0;

  return { rows, cols };
}

export default function GridEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [objects, setObjects] = useState<CsvObject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        type: "default",
      },
    ]);
  };

  const removeObject = (csvId: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== csvId));

    // opcional (lo dejo ON): borrar nodos que fueron creados desde ese CSV
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
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (selectedNodeIds.size === 0) return;

    setNodes((prev) => prev.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((prev) => prev.filter((e) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
  };

  const onConnect: OnConnect = (params) => {
    if (params.source === params.target) return;
    setEdges((eds) => addEdge(params, eds));
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
        onConnect={onConnect}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        onNodesDelete={(deleted) => {
          const deletedIds = new Set(deleted.map((n) => n.id));
          setEdges((prev) => prev.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      <div
        style={{
          position: "absolute",
          left: 120,
          right: 24,
          bottom: 18,
          height: 120,
          zIndex: 50,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.20)",
            background:
              "linear-gradient(180deg, rgba(245,245,245,0.98), rgba(220,220,220,0.95))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.85), 0 12px 30px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            padding: "14px 14px",
            gap: 14,
            pointerEvents: "auto",
          }}
        >

          <div
            style={{
              flex: 1,
              height: "100%",
              display: "flex",
              alignItems: "center",
              gap: 14,
              overflowX: "auto",
              overflowY: "hidden",
              paddingTop: 6,
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
                  background: "rgba(255,255,255,0.60)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "10px 12px",
                  color: "rgba(0,0,0,0.65)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Menú de objetos</div>
                <div>Importá un CSV para que aparezca aquí.</div>
              </div>
            ) : (
              menuItems.map((obj) => (
                <div
                  key={obj.id}
                  style={{
                    height: 86,
                    minWidth: 160,
                    maxWidth: 240,
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => addNodeFromObject(obj)}
                    title="Click para agregar a la pizarra"
                    style={{
                      height: "100%",
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.20)",
                      background: "rgba(255,255,255,0.78)",
                      boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                        paddingRight: 18,
                      }}
                    >
                      {obj.filename}
                    </div>

                    <div style={{ fontSize: 12, color: "rgba(0,0,0,0.70)" }}>
                      {obj.rows} intervalos
                    </div>
                  </button>

                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removeObject(obj.id);
                    }}
                    aria-label={`Eliminar ${obj.filename}`}
                    title="Eliminar este CSV del menú"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      height: 22,
                      width: 22,
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.25)",
                      background: "rgba(255,255,255,0.9)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={deleteSelected}
              style={{
                height: 86,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.20)",
                background: "rgba(255,255,255,0.88)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.85), 0 6px 16px rgba(0,0,0,0.12)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
              title="Borra nodos seleccionados (Delete/Backspace también funciona)"
            >
              Eliminar seleccionado
            </button>

            {/* Upload */}
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
                background: "rgba(255,255,255,0.88)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.85), 0 6px 16px rgba(0,0,0,0.12)",
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