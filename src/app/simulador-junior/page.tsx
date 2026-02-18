"use client";

import React from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

import GeneratorNode from "./components/GeneratorNode";
import ChargeNode from "./components/ChargeNode";
import BatteryNode from "./components/BatteryNode";
import SwitchNode from "./components/SwitchNode";
import BusNode from "./components/BusNode";
import { useGridEditor } from "./hooks/useGridEditor";
import AddCsvModal from "./components/AddCsvModal";
import BusConfigModal from "./components/BusConfigModal";
import BottomBar from "./components/BottomBar";

const nodeTypes = {
  generator: GeneratorNode,
  charge: ChargeNode,
  battery: BatteryNode,
  switch: SwitchNode,
  bus: BusNode,
};

/** Simulador Junior - Editor de red basado en ReactFlow. */
export default function GridEditor() {
  const grid = useGridEditor();

  return (
    <div style={{ position: "fixed", inset: 0 }} onClick={grid.closeAllMenus}>
      <ReactFlow
        nodes={grid.nodes}
        edges={grid.edges}
        nodeTypes={nodeTypes}
        onNodesChange={grid.onNodesChange}
        onEdgesChange={grid.onEdgesChange}
        onConnect={grid.onConnect}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        onNodesDelete={grid.onNodesDelete}
      >
        <Background />
        <Controls />
      </ReactFlow>

      <AddCsvModal
        isOpen={grid.isAddMenuOpen}
        onClose={() => grid.setIsAddMenuOpen(false)}
        onPickType={grid.chooseTypeAndPickFile}
      />

      <BusConfigModal
        isOpen={grid.isBusMenuOpen}
        inputs={grid.pendingBusInputs}
        outputs={grid.pendingBusOutputs}
        setInputs={grid.setPendingBusInputs}
        setOutputs={grid.setPendingBusOutputs}
        onCreate={grid.createBusWithConfig}
        onClose={() => grid.setIsBusMenuOpen(false)}
      />

      <BottomBar
        menuItems={grid.menuItems}
        onAddFromObject={grid.addNodeFromObject}
        onRemoveObject={grid.removeObject}
        onDeleteSelected={grid.deleteSelected}
        onAddSwitch={grid.addSwitchNode}
        onOpenBusConfig={grid.openBusConfigMenu}
        onToggleAddMenu={() => grid.setIsAddMenuOpen((v) => !v)}
        fileInput={
          <input
            ref={grid.fileInputRef}
            type="file"
            accept=".csv"
            onChange={grid.handleCsvUpload}
            style={{ display: "none" }}
          />
        }
      />
    </div>
  );
}