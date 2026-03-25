import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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

// ─── Agent role definitions ─────────────────────────────────────────────────

type AgentRole = "planning" | "client" | "server" | "testing" | "qa" | "devops";

const AGENT_ROLES: Record<AgentRole, { label: string; icon: string; color: string }> = {
  planning: { label: "기획", icon: "📝", color: "#74b9ff" },
  client:   { label: "클라이언트", icon: "🖥", color: "#a29bfe" },
  server:   { label: "서버", icon: "⚙", color: "#55efc4" },
  testing:  { label: "테스트", icon: "🧪", color: "#ffeaa7" },
  qa:       { label: "QA", icon: "✅", color: "#ff9ff3" },
  devops:   { label: "DevOps", icon: "📊", color: "#fd79a8" },
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
        <span style={{ fontSize: 16 }}>⚡</span>
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
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {roleInfo.icon}
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
            fontSize: 13,
          }}
        >
          ⬦
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
        <span style={{ fontSize: 16 }}>🏁</span>
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
  { type: "trigger", label: "트리거", icon: "⚡", color: "#6c5ce7", desc: "시작 지점" },
  { type: "agent:planning", label: "기획 Agent", icon: "📝", color: "#74b9ff", desc: "기획·명세" },
  { type: "agent:client", label: "클라이언트 Agent", icon: "🖥", color: "#a29bfe", desc: "프론트엔드" },
  { type: "agent:server", label: "서버 Agent", icon: "⚙", color: "#55efc4", desc: "백엔드" },
  { type: "agent:testing", label: "테스트 Agent", icon: "🧪", color: "#ffeaa7", desc: "테스트" },
  { type: "agent:qa", label: "QA Agent", icon: "✅", color: "#ff9ff3", desc: "품질 검증" },
  { type: "agent:devops", label: "DevOps Agent", icon: "📊", color: "#fd79a8", desc: "Git·배포" },
  { type: "condition", label: "조건 분기", icon: "⬦", color: "#fdcb6e", desc: "분기 처리" },
  { type: "end", label: "완료", icon: "🏁", color: "#55efc4", desc: "파이프라인 끝" },
];

function Sidebar() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: "var(--color-bg-secondary)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 14px 8px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        노드 팔레트
      </div>
      <div style={{ overflowY: "auto", flex: 1, padding: "8px 8px" }}>
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              marginBottom: 4,
              cursor: "grab",
              border: "1px solid transparent",
              transition: "all 0.15s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "var(--color-bg-hover)";
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = "transparent";
              (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: item.color + "22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
                borderLeft: `3px solid ${item.color}`,
              }}
            >
              {item.icon}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
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

      {/* Body: sidebar + canvas */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <div ref={reactFlowWrapper} style={{ flex: 1, position: "relative" }}>
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
            <MiniMap
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
              nodeColor={(node) => {
                if (node.type === "agent") {
                  const d = node.data as AgentNodeData;
                  return AGENT_ROLES[d.role]?.color ?? "#6c5ce7";
                }
                if (node.type === "trigger") return "#6c5ce7";
                if (node.type === "end") return "#55efc4";
                return "#fdcb6e";
              }}
              maskColor="rgba(0,0,0,0.5)"
            />
          </ReactFlow>
        </div>
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
