"use client";
import React, { useCallback } from "react";
import { Handle, NodeProps, Position, useReactFlow } from "reactflow";

type SwitchNodeData = {
  label: string;
  isClosed?: boolean; // true = cerrado (conduce), false = abierto (corta)
};

export default function SwitchNode({ id, data, selected }: NodeProps<SwitchNodeData>) {
  const rf = useReactFlow();
  const isClosed = data?.isClosed ?? true;

  const toggle = useCallback(() => {
    const next = !isClosed;

    // 1) actualiza el estado del nodo
    rf.setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        return {
          ...n,
          data: {
            ...(n.data as any),
            isClosed: next,
          },
        };
      })
    );

    // 2) desconecta: si ABIERTO, oculta edges que salen del switch
    rf.setEdges((prev) =>
      prev.map((e) => {
        if (e.source !== id) return e;
        return { ...e, hidden: !next };
      })
    );
  }, [rf, id, isClosed]);

  const dotColor = isClosed ? "rgba(40,180,99,0.95)" : "rgba(231,76,60,0.95)";
  const bg = isClosed ? "rgba(40,180,99,0.10)" : "rgba(231,76,60,0.10)";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      title="Click para ABRIR/CERRAR"
      style={{
        width: 58,
        height: 34,
        borderRadius: 10,
        border: `2px solid ${selected ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)"}`,
        background: "rgba(255,255,255,0.98)",
        boxShadow: selected
          ? "0 10px 20px rgba(0,0,0,0.12)"
          : "0 6px 14px rgba(0,0,0,0.10)",
        display: "grid",
        placeItems: "center",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
        padding: 0,
      }}
    >
      {/* Estado (texto mini) */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          padding: "2px 6px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.15)",
          background: bg,
          lineHeight: 1,
        }}
      >
        {isClosed ? "ON" : "OFF"}
      </div>

      {/* Puntito estado */}
      <div
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor,
        }}
      />

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ width: 9, height: 9 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ width: 9, height: 9 }}
      />
    </div>
  );
}