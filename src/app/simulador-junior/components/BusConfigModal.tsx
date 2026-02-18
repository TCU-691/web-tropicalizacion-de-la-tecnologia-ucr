import React from "react";

type Props = {
  isOpen: boolean;
  inputs: number;
  outputs: number;
  setInputs: (fn: (v: number) => number) => void;
  setOutputs: (fn: (v: number) => number) => void;
  onCreate: () => void;
  onClose: () => void;
};

/** Modal to configure bus inputs/outputs before creating the node. */
export default function BusConfigModal({
  isOpen,
  inputs,
  outputs,
  setInputs,
  setOutputs,
  onCreate,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
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

      <div style={{ textAlign: "left", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
          Entradas (inputs)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setInputs((v) => Math.max(1, v - 1))}
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
            {inputs}
          </div>
          <button
            onClick={() => setInputs((v) => Math.min(12, v + 1))}
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

      <div style={{ textAlign: "left", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
          Salidas (outputs)
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setOutputs((v) => Math.max(1, v - 1))}
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
            {outputs}
          </div>
          <button
            onClick={() => setOutputs((v) => Math.min(12, v + 1))}
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
        onClick={onCreate}
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
        onClick={onClose}
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
  );
}