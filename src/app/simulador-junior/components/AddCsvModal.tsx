import React from "react";
import type { PowerNodeType } from "../utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPickType: (t: PowerNodeType) => void;
};

/** Modal to choose the node type for an incoming CSV before importing it. */
export default function AddCsvModal({ isOpen, onClose, onPickType }: Props) {
  if (!isOpen) return null;

  return (
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
          onClick={() => onPickType(item.t as PowerNodeType)}
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
        onClick={onClose}
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
  );
}