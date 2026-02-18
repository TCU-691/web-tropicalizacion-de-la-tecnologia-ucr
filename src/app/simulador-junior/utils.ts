export type PowerNodeType = "generator" | "battery" | "charge";
export type CustomNodeType = PowerNodeType | "switch" | "bus";

export type CsvObject = {
  id: string;
  filename: string;
  size: number;
  rows: number;
  cols: number;
  uploadedAt: number;
  raw: string;
  nodeType: PowerNodeType;
};

export type NodeData = {
  label: string;
  sourceCsvId?: string;
  isClosed?: boolean;
  inputs?: number;
  outputs?: number;
};

/**
 * Computes lightweight CSV stats (rows/cols) without parsing quoted fields.
 * Rows exclude the header line.
 */
export function quickCsvStats(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows = Math.max(0, lines.length - 1);
  const header = lines[0] ?? "";
  const cols = header.length ? header.split(",").length : 0;

  return { rows, cols };
}

/** Human label for a power node type. */
export function labelFromType(t: PowerNodeType) {
  if (t === "generator") return "Generador";
  if (t === "battery") return "Batería";
  return "Carga";
}

/**
 * Validates whether an edge can be created from sourceType to targetType.
 * This is purely type-based validation.
 */
export function canConnect(sourceType?: CustomNodeType, targetType?: CustomNodeType) {
  if (!sourceType || !targetType) return false;
  if (sourceType === "charge") return false;

  const isPowerSource = sourceType === "generator" || sourceType === "battery";
  const isSwitch = sourceType === "switch";
  const isBus = sourceType === "bus";

  return (
    (isPowerSource &&
      (targetType === "bus" ||
        targetType === "switch" ||
        targetType === "charge" ||
        targetType === "battery")) ||
    (isSwitch &&
      (targetType === "bus" ||
        targetType === "charge" ||
        targetType === "battery" ||
        targetType === "switch")) ||
    (isBus &&
      (targetType === "charge" || targetType === "switch" || targetType === "battery"))
  );
}