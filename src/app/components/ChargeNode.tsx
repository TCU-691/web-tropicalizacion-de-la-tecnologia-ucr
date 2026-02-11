import { Handle, Position, NodeProps } from "reactflow";

export default function ChargeNode({ data }: NodeProps) {
  return (
    <div
      className="bg-white border rounded shadow px-4 py-2 min-w-[120px] text-center relative"
      style={{ borderColor: "#999" }}
    >
      <strong>{data.label}</strong>

      {/* Entrada */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="w-3 h-3 bg-blue-600"
      />

    </div>
  );
}
