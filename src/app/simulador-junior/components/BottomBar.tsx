import React from "react";
import type { CsvObject } from "../utils";
import CsvCard from "./CsvCard";

type Props = {
  menuItems: CsvObject[];
  onAddFromObject: (obj: CsvObject) => void;
  onRemoveObject: (id: string) => void;

  onDeleteSelected: () => void;
  onAddSwitch: () => void;
  onOpenBusConfig: () => void;

  onToggleAddMenu: () => void;

  fileInput: React.ReactNode;
};

/** Bottom toolbar: CSV list + action buttons. */
export default function BottomBar({
  menuItems,
  onAddFromObject,
  onRemoveObject,
  onDeleteSelected,
  onAddSwitch,
  onOpenBusConfig,
  onToggleAddMenu,
  fileInput,
}: Props) {
  return (
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
              <CsvCard
                key={obj.id}
                obj={obj}
                onAdd={onAddFromObject}
                onRemove={onRemoveObject}
              />
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={onDeleteSelected}
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
            onClick={onAddSwitch}
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

          <button
            onClick={onOpenBusConfig}
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

          {fileInput}

          <button
            onClick={onToggleAddMenu}
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
  );
}