import React, { useMemo, useRef, useState } from "react";
import { addEdge, useEdgesState, useNodesState, type Edge, type OnConnect } from "reactflow";
import type { CsvObject, CustomNodeType, NodeData, PowerNodeType } from "../utils";
import { canConnect, quickCsvStats } from "../utils";

const initialNodes = [
  {
    id: "1",
    type: "generator" as const,
    position: { x: 100, y: 120 },
    data: { label: "Generador" },
  },
];

/**
 * Centralizes GridEditor state and actions.
 * Keeps the page focused on layout and composition.
 */
export function useGridEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [objects, setObjects] = useState<CsvObject[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [pendingNodeType, setPendingNodeType] = useState<PowerNodeType>("charge");

  const [isBusMenuOpen, setIsBusMenuOpen] = useState(false);
  const [pendingBusInputs, setPendingBusInputs] = useState<number>(4);
  const [pendingBusOutputs, setPendingBusOutputs] = useState<number>(1);

  const menuItems = useMemo(() => objects, [objects]);

  /** Opens the OS file picker for CSV import. */
  const openFilePicker = () => fileInputRef.current?.click();

  /**
   * Imports a CSV file into the menu as an object.
   * The selected node type is taken from pendingNodeType.
   */
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

  /** Adds a node to the canvas based on a previously imported CSV object. */
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

  /**
   * Removes a CSV object from the menu and deletes any nodes created from it.
   * Also cleans up edges referencing deleted nodes using a consistent snapshot.
   */
  const removeObject = (csvId: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== csvId));

    setNodes((prevNodes) => {
      const nextNodes = prevNodes.filter((n) => n.data?.sourceCsvId !== csvId);
      const remainingIds = new Set(nextNodes.map((n) => n.id));

      setEdges((prevEdges) =>
        prevEdges.filter((e) => remainingIds.has(e.source) && remainingIds.has(e.target))
      );

      return nextNodes;
    });
  };

  /** Deletes selected nodes and removes any connected edges. */
  const deleteSelected = () => {
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (!selectedIds.size) return;

    setNodes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setEdges((prev) =>
      prev.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target))
    );
  };

  /** Creates an edge if it passes validation rules. */
  const onConnect: OnConnect = (params) => {
    if (params.source === params.target) return;

    const sourceType = nodes.find((n) => n.id === params.source)?.type as
      | CustomNodeType
      | undefined;
    const targetType = nodes.find((n) => n.id === params.target)?.type as
      | CustomNodeType
      | undefined;

    if (!canConnect(sourceType, targetType)) return;

    setEdges((eds) => addEdge(params, eds));
  };

  /**
   * Sets the node type for an incoming CSV and triggers file selection.
   * The file will be imported as that node type.
   */
  const chooseTypeAndPickFile = (t: PowerNodeType) => {
    setPendingNodeType(t);
    setIsAddMenuOpen(false);
    openFilePicker();
  };

  /** Adds a switch node with default "closed" state. */
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

  /** Opens the bus configuration modal. */
  const openBusConfigMenu = () => setIsBusMenuOpen(true);

  /**
   * Creates a bus node using the selected inputs/outputs configuration.
   * Values are stored in node data.
   */
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

  /** Closes any open modal menus when clicking outside them. */
  const closeAllMenus = () => {
    setIsAddMenuOpen(false);
    setIsBusMenuOpen(false);
  };

  /** Removes edges that reference deleted nodes. */
  const onNodesDelete = (deleted: { id: string }[]) => {
    const deletedIds = new Set(deleted.map((n) => n.id));
    setEdges((prev) =>
      prev.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
    );
  };

  return {
    nodes,
    edges,
    menuItems,
    fileInputRef,

    isAddMenuOpen,
    setIsAddMenuOpen,
    isBusMenuOpen,
    setIsBusMenuOpen,

    pendingBusInputs,
    setPendingBusInputs,
    pendingBusOutputs,
    setPendingBusOutputs,

    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,

    handleCsvUpload,
    chooseTypeAndPickFile,
    addNodeFromObject,
    removeObject,
    deleteSelected,
    addSwitchNode,
    openBusConfigMenu,
    createBusWithConfig,
    closeAllMenus,
  };
}