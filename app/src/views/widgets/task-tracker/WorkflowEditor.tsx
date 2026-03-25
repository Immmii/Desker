import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  type NodeTypes,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── SVG Icons ──────────────────────────────────────────────────────────────

const svgProps = (color: string, size = 16) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: color, strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

function IconTrigger({ color = "#6c5ce7", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} stroke="none" />
    </svg>
  );
}

function IconPlanning({ color = "#74b9ff", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="12" y1="4" x2="12" y2="22" />
      <rect x="8" y="1" width="8" height="4" rx="1" fill={color} stroke={color} />
    </svg>
  );
}

function IconClient({ color = "#a29bfe", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="7 8 10 11 7 14" />
      <line x1="13" y1="14" x2="17" y2="14" />
    </svg>
  );
}

function IconServer({ color = "#55efc4", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <rect x="3" y="2" width="18" height="6" rx="1.5" />
      <rect x="3" y="10" width="18" height="6" rx="1.5" />
      <circle cx="7" cy="5" r="1" fill={color} stroke="none" />
      <circle cx="7" cy="13" r="1" fill={color} stroke="none" />
      <line x1="11" y1="5" x2="17" y2="5" />
      <line x1="11" y1="13" x2="17" y2="13" />
      <line x1="7" y1="18" x2="7" y2="22" />
      <line x1="17" y1="18" x2="17" y2="22" />
    </svg>
  );
}

function IconTesting({ color = "#ffeaa7", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <path d="M9 3h6v5l4 9a1.5 1.5 0 0 1-1.4 2H6.4A1.5 1.5 0 0 1 5 17l4-9V3" />
      <line x1="9" y1="3" x2="15" y2="3" strokeWidth="2.5" />
      <path d="M7 15h10" strokeDasharray="2 2" />
      <circle cx="10" cy="13" r="0.8" fill={color} stroke="none" />
      <circle cx="14" cy="16" r="0.8" fill={color} stroke="none" />
    </svg>
  );
}

function IconQA({ color = "#ff9ff3", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <path d="M12 2l8 4v6c0 5.5-3.8 8.2-8 10-4.2-1.8-8-4.5-8-10V6l8-4z" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

function IconDevOps({ color = "#fd79a8", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M6 8.5v4c0 2.5 2.5 4.5 5 4.5h3" />
      <line x1="6" y1="8.5" x2="6" y2="15.5" />
    </svg>
  );
}

function IconCondition({ color = "#fdcb6e", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <path d="M12 3l8 9-8 9-8-9z" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}

function IconEnd({ color = "#55efc4", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

const NODE_ICONS: Record<string, (props: { color: string; size?: number }) => React.ReactNode> = {
  trigger: IconTrigger,
  planning: IconPlanning,
  client: IconClient,
  server: IconServer,
  testing: IconTesting,
  qa: IconQA,
  devops: IconDevOps,
  condition: IconCondition,
  end: IconEnd,
};

// ─── Agent role definitions ─────────────────────────────────────────────────

type AgentRole = "planning" | "client" | "server" | "testing" | "qa" | "devops";

const AGENT_ROLES: Record<AgentRole, { label: string; color: string }> = {
  planning: { label: "기획", color: "#74b9ff" },
  client:   { label: "클라이언트", color: "#a29bfe" },
  server:   { label: "서버", color: "#55efc4" },
  testing:  { label: "테스트", color: "#ffeaa7" },
  qa:       { label: "QA", color: "#ff9ff3" },
  devops:   { label: "DevOps", color: "#fd79a8" },
};

// ─── Node data types ─────────────────────────────────────────────────────────

interface TriggerNodeData extends Record<string, unknown> {
  label: string;
}

interface AgentNodeData extends Record<string, unknown> {
  role: AgentRole;
  model: "claude" | "chatgpt";
}

interface ConditionNodeData extends Record<string, unknown> {
  label: string;
}

interface EndNodeData extends Record<string, unknown> {
  label: string;
}

// ─── Shared node styles ───────────────────────────────────────────────────────

const NODE_BASE: React.CSSProperties = {
  minWidth: 160,
  borderRadius: 10,
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border)",
  fontFamily: "Pretendard, sans-serif",
  fontSize: 13,
  color: "var(--color-text-primary)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  overflow: "hidden",
};

const HANDLE_STYLE: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "var(--color-accent)",
  border: "2px solid var(--color-bg-primary)",
  borderRadius: "50%",
};

// ─── TriggerNode ─────────────────────────────────────────────────────────────

function TriggerNode({ data }: NodeProps<Node<TriggerNodeData>>) {
  return (
    <div style={{ ...NODE_BASE, minWidth: 140 }}>
      <div
        style={{
          height: 4,
          background: "linear-gradient(90deg, #6c5ce7, #a29bfe)",
          borderRadius: "10px 10px 0 0",
        }}
      />
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <IconTrigger color="#6c5ce7" size={18} />
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            트리거
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

// ─── AgentNode ───────────────────────────────────────────────────────────────

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const [model, setModel] = useState<"claude" | "chatgpt">(data.model ?? "claude");
  const roleInfo = AGENT_ROLES[data.role];
  const RoleIcon = NODE_ICONS[data.role];

  return (
    <div style={{ ...NODE_BASE, minWidth: 180 }}>
      <div style={{ height: 3, background: roleInfo.color }} />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: roleInfo.color + "22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {RoleIcon ? <RoleIcon color={roleInfo.color} size={16} /> : null}
          </span>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>
              Agent
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{roleInfo.label}</div>
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 10,
              background: roleInfo.color + "30",
              color: roleInfo.color,
              fontWeight: 600,
            }}
          >
            {roleInfo.label}
          </span>
        </div>
        {/* Model selector */}
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as "claude" | "chatgpt")}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            padding: "5px 8px",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-tertiary)",
            color: "var(--color-text-secondary)",
            fontSize: 12,
            fontFamily: "Pretendard, sans-serif",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="claude">Claude</option>
          <option value="chatgpt">ChatGPT</option>
        </select>
      </div>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

// ─── ConditionNode ────────────────────────────────────────────────────────────

function ConditionNode({ data }: NodeProps<Node<ConditionNodeData>>) {
  return (
    <div style={{ ...NODE_BASE, minWidth: 150 }}>
      <div style={{ height: 3, background: "#fdcb6e" }} />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#fdcb6e22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconCondition color="#fdcb6e" size={15} />
        </span>
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 1 }}>
            조건
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{data.label}</div>
        </div>
      </div>
      {/* Two outputs: true (top-right), false (bottom-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ ...HANDLE_STYLE, top: "35%", background: "#55efc4" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ ...HANDLE_STYLE, top: "65%", background: "#e17055" }}
      />
      <div
        style={{
          position: "absolute",
          right: 18,
          top: "26%",
          fontSize: 9,
          color: "#55efc4",
          fontWeight: 700,
        }}
      >
        Y
      </div>
      <div
        style={{
          position: "absolute",
          right: 18,
          top: "58%",
          fontSize: 9,
          color: "#e17055",
          fontWeight: 700,
        }}
      >
        N
      </div>
    </div>
  );
}

// ─── EndNode ─────────────────────────────────────────────────────────────────

function EndNode({ data }: NodeProps<Node<EndNodeData>>) {
  return (
    <div style={{ ...NODE_BASE, minWidth: 130 }}>
      <div
        style={{
          height: 4,
          background: "linear-gradient(90deg, #55efc4, #00b894)",
          borderRadius: "10px 10px 0 0",
        }}
      />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <IconEnd color="#55efc4" size={18} />
        <div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            완료
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{data.label}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Node types registry ──────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  condition: ConditionNode,
  end: EndNode,
};

// ─── Default pipeline ─────────────────────────────────────────────────────────

const DEFAULT_NODES: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 40, y: 180 },
    data: { label: "태스크 시작" },
  },
  {
    id: "agent-planning",
    type: "agent",
    position: { x: 240, y: 160 },
    data: { role: "planning", model: "claude" },
  },
  {
    id: "agent-client",
    type: "agent",
    position: { x: 460, y: 100 },
    data: { role: "client", model: "claude" },
  },
  {
    id: "agent-testing",
    type: "agent",
    position: { x: 680, y: 100 },
    data: { role: "testing", model: "claude" },
  },
  {
    id: "agent-qa",
    type: "agent",
    position: { x: 900, y: 160 },
    data: { role: "qa", model: "claude" },
  },
  {
    id: "end-1",
    type: "end",
    position: { x: 1120, y: 185 },
    data: { label: "완료" },
  },
];

const EDGE_DEFAULTS: Partial<Edge> = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#6c5ce7" },
  style: { stroke: "#6c5ce7", strokeWidth: 1.5 },
};

const DEFAULT_EDGES: Edge[] = [
  { id: "e1", source: "trigger-1", target: "agent-planning", ...EDGE_DEFAULTS },
  { id: "e2", source: "agent-planning", target: "agent-client", ...EDGE_DEFAULTS },
  { id: "e3", source: "agent-client", target: "agent-testing", ...EDGE_DEFAULTS },
  { id: "e4", source: "agent-testing", target: "agent-qa", ...EDGE_DEFAULTS },
  { id: "e5", source: "agent-qa", target: "end-1", ...EDGE_DEFAULTS },
];

// ─── Sidebar palette ──────────────────────────────────────────────────────────

const PALETTE_ITEMS = [
  { type: "trigger", label: "트리거", iconKey: "trigger", color: "#6c5ce7", desc: "시작 지점" },
  { type: "agent:planning", label: "기획 Agent", iconKey: "planning", color: "#74b9ff", desc: "기획·명세" },
  { type: "agent:client", label: "클라이언트 Agent", iconKey: "client", color: "#a29bfe", desc: "프론트엔드" },
  { type: "agent:server", label: "서버 Agent", iconKey: "server", color: "#55efc4", desc: "백엔드" },
  { type: "agent:testing", label: "테스트 Agent", iconKey: "testing", color: "#ffeaa7", desc: "테스트" },
  { type: "agent:qa", label: "QA Agent", iconKey: "qa", color: "#ff9ff3", desc: "품질 검증" },
  { type: "agent:devops", label: "DevOps Agent", iconKey: "devops", color: "#fd79a8", desc: "Git·배포" },
  { type: "condition", label: "조건 분기", iconKey: "condition", color: "#fdcb6e", desc: "분기 처리" },
  { type: "end", label: "완료", iconKey: "end", color: "#55efc4", desc: "파이프라인 끝" },
];

function FloatingPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        padding: "10px 12px",
        display: "flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => { onDragStart(e, item.type); onClose(); }}
          title={`${item.label} — ${item.desc}`}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: item.color + "18",
            border: "1px solid transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "grab",
            transition: "all 0.15s",
            flexDirection: "column",
            gap: 2,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = item.color;
            (e.currentTarget as HTMLDivElement).style.background = item.color + "30";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
            (e.currentTarget as HTMLDivElement).style.background = item.color + "18";
            (e.currentTarget as HTMLDivElement).style.transform = "none";
          }}
        >
          {NODE_ICONS[item.iconKey]?.({ color: item.color, size: 18 })}
          <span style={{ fontSize: 8, color: "var(--color-text-secondary)", fontWeight: 600, lineHeight: 1 }}>
            {item.label.replace(" Agent", "")}
          </span>
        </div>
      ))}
      {/* Close button */}
      <div
        onClick={onClose}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginLeft: 4,
          color: "var(--color-text-secondary)",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    </div>
  );
}

// ─── WorkflowEditor ───────────────────────────────────────────────────────────

let nodeIdCounter = 100;

function WorkflowEditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);
  const [workflowName, setWorkflowName] = useState("개발 파이프라인");
  const [isRunning, setIsRunning] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6c5ce7" },
            style: { stroke: "#6c5ce7", strokeWidth: 1.5 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const rawType = e.dataTransfer.getData("application/reactflow");
      if (!rawType) return;

      const position = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      const id = `node-${++nodeIdCounter}`;

      let type: string;
      let data: Record<string, unknown>;

      if (rawType.startsWith("agent:")) {
        const role = rawType.split(":")[1] as AgentRole;
        type = "agent";
        data = { role, model: "claude" };
      } else if (rawType === "trigger") {
        type = "trigger";
        data = { label: "트리거" };
      } else if (rawType === "condition") {
        type = "condition";
        data = { label: "조건 분기" };
      } else {
        type = "end";
        data = { label: "완료" };
      }

      const newNode: Node = { id, type, position, data };
      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const handleReset = () => {
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
  };

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg-primary)" }}>
      {/* Toolbar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-secondary)",
        }}
      >
        <span style={{ fontSize: 14, marginRight: 4 }}>⬡</span>
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--color-text-primary)",
            fontFamily: "Pretendard, sans-serif",
            width: 180,
          }}
        />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          노드 {nodes.length} · 연결 {edges.length}
        </span>
        <button
          onClick={() => setShowPalette((v) => !v)}
          style={{
            padding: "6px 14px",
            borderRadius: 7,
            border: showPalette ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
            background: showPalette ? "var(--color-accent)" : "transparent",
            color: showPalette ? "#fff" : "var(--color-text-secondary)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "Pretendard, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all 0.15s",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          노드
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: "6px 14px",
            borderRadius: 7,
            border: "1px solid var(--color-border)",
            background: "transparent",
            color: "var(--color-text-secondary)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "Pretendard, sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          초기화
        </button>
        <button
          onClick={handleRun}
          style={{
            padding: "6px 18px",
            borderRadius: 7,
            border: "none",
            background: isRunning ? "#55efc4" : "var(--color-accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Pretendard, sans-serif",
            transition: "background 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isRunning ? (
            <>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "inline-block",
                  animation: "pulse 1s infinite",
                }}
              />
              실행 중
            </>
          ) : (
            "▶ 실행"
          )}
        </button>
      </div>

      {/* Body: full canvas */}
      <div ref={reactFlowWrapper} style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "var(--color-bg-primary)" }}
          defaultEdgeOptions={{
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6c5ce7" },
            style: { stroke: "#6c5ce7", strokeWidth: 1.5 },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--color-border)"
          />
          <Controls
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
        </ReactFlow>
        <FloatingPalette open={showPalette} onClose={() => setShowPalette(false)} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .react-flow__controls-button {
          background: var(--color-bg-secondary) !important;
          border-color: var(--color-border) !important;
          color: var(--color-text-secondary) !important;
          fill: var(--color-text-secondary) !important;
        }
        .react-flow__controls-button:hover {
          background: var(--color-bg-hover) !important;
        }
        .react-flow__edge-path {
          stroke: #6c5ce7 !important;
        }
      `}</style>
    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
