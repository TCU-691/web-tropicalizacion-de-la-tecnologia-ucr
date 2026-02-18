import React from "react";
import type { CsvObject } from "../utils";
import { labelFromType } from "../utils";

type Props = {
  obj: CsvObject;
  onAdd: (obj: CsvObject) => void;
  onRemove: (id: string) => void;
};

/** Single CSV entry shown in the bottom menu. */
export default function CsvCard({ obj, onAdd, onRemove }: Props) {
  return (
    <div style={{ height: 86, minWidth: 170, position: "relative" }}>
      <button
        onClick={() => onAdd(obj)}
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
        <div style={{ fontSize: 11, opacity: 0.7 }}>Tipo: {labelFromType(obj.nodeType)}</div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(obj.id);
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
  );
}