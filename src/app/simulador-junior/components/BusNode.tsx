"use client";
import React from "react";
import { Handle, NodeProps, Position } from "reactflow";

type BusNodeData = {
  label?: string;
  inputs?: number;  // cantidad de entradas (targets)
  outputs?: number; // cantidad de salidas (sources)
};

export default function BusNode({ data, selected }: NodeProps<BusNodeData>) {
  const inputs = Math.max(1, Math.min(12, data?.inputs ?? 4));
  const outputs = Math.max(1, Math.min(12, data?.outputs ?? 1));

  return (
    <div
      style={{
        // MÁS DELGADO
        width: 30,
        height: 240,
        borderRadius: 12,
        border: `2px solid ${selected ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)"}`,
        background: "rgba(255,255,255,0.95)",
        boxShadow: selected
          ? "0 10px 20px rgba(0,0,0,0.12)"
          : "0 6px 14px rgba(0,0,0,0.10)",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        userSelect: "none",
        padding: 0, // <- sin padding
      }}
      title="Bus: múltiples entradas y salidas"
    >
      {/* Barra vertical (más delgada) */}
      <div
        style={{
          width: 8,
          height: "82%",
          borderRadius: 999,
          background: "rgba(0,0,0,0.88)",
        }}
      />

      {/* Etiqueta arriba */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          fontWeight: 900,
          background: "rgba(255,255,255,0.9)",
          padding: "2px 6px",
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.15)",
          whiteSpace: "nowrap",
        }}
      >
        {data?.label ?? "Bus"}
      </div>

      {/* Entradas (targets) izquierda: in-0, in-1, ... */}
      {Array.from({ length: inputs }).map((_, i) => {
        const topPct = ((i + 1) / (inputs + 1)) * 100;
        return (
          <Handle
            key={`in-${i}`}
            type="target"
            id={`in-${i}`}
            position={Position.Left}
            style={{
              top: `${topPct}%`,
              width: 9,
              height: 9,
            }}
          />
        );
      })}

      {/* Salidas (sources) derecha: out-0, out-1, ... */}
      {Array.from({ length: outputs }).map((_, i) => {
        const topPct = ((i + 1) / (outputs + 1)) * 100;
        return (
          <Handle
            key={`out-${i}`}
            type="source"
            id={`out-${i}`}
            position={Position.Right}
            style={{
              top: `${topPct}%`,
              width: 9,
              height: 9,
            }}
          />
        );
      })}
    </div>
  );
}