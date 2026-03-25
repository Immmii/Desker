import { useState, useCallback, useRef, useEffect } from "react";
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

function IconTask({ color = "#6c5ce7", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="13" y2="13" />
      <polyline points="7 17 9 17" />
    </svg>
  );
}

function IconResearch({ color = "#0984e3", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

function IconDocs({ color = "#00b894", size = 16 }) {
  return (
    <svg {...svgProps(color, size)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

// Puzzle piece icon for FAB
function IconPuzzle({ color = "#fff", size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v4h1.5a2.5 2.5 0 0 1 0 5H2v4a2 2 0 0 0 2 2h4v-1.5a2.5 2.5 0 0 1 5 0V21h4a2 2 0 0 0 2-2v-4h-1.5a2.5 2.5 0 0 1 0-5z" />
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
  task: IconTask,
  research: IconResearch,
  docs: IconDocs,
};

// ─── Agent role definitions ─────────────────────────────────────────────────

type AgentRole = "planning" | "client" | "server" | "testing" | "qa" | "devops" | "task" | "research" | "docs";

const AGENT_ROLES: Record<AgentRole, { label: string; color: string }> = {
  planning:  { label: "기획", color: "#74b9ff" },
  client:    { label: "클라이언트", color: "#a29bfe" },
  server:    { label: "서버", color: "#55efc4" },
  testing:   { label: "테스트", color: "#ffeaa7" },
  qa:        { label: "QA", color: "#ff9ff3" },
  devops:    { label: "DevOps", color: "#fd79a8" },
  task:      { label: "태스크", color: "#6c5ce7" },
  research:  { label: "리서치", color: "#0984e3" },
  docs:      { label: "문서화", color: "#00b894" },
};

// ─── Node data types ─────────────────────────────────────────────────────────

interface TriggerNodeData extends Record<string, unknown> {
  label: string;
}

interface AgentNodeData extends Record<string, unknown> {
  role: AgentRole;
  model: "claude" | "chatgpt";
  mcpTools?: string[];
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
  const [mcpTools, setMcpTools] = useState<string[]>(data.mcpTools ?? []);
  const [showMcpDropdown, setShowMcpDropdown] = useState(false);
  const [mcpServers, setMcpServers] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleInfo = AGENT_ROLES[data.role];
  const RoleIcon = NODE_ICONS[data.role];

  // Fetch MCP servers when dropdown opens
  useEffect(() => {
    if (!showMcpDropdown) return;
    const fetchServers = async () => {
      try {
        if (window.deskerAPI?.mcp?.list) {
          const servers = await window.deskerAPI.mcp.list();
          setMcpServers(Object.keys(servers));
        }
      } catch {
        setMcpServers([]);
      }
    };
    fetchServers();
  }, [showMcpDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showMcpDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setShowMcpDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMcpDropdown]);

  const toggleMcp = (server: string) => {
    setMcpTools((prev) =>
      prev.includes(server) ? prev.filter((s) => s !== server) : [...prev, server]
    );
  };

  const removeMcp = (server: string) => {
    setMcpTools((prev) => prev.filter((s) => s !== server));
  };

  // MCP tag colors cycle
  const MCP_COLORS = ["#6c5ce7", "#0984e3", "#00b894", "#e17055", "#fdcb6e", "#fd79a8"];
  const mcpColor = (i: number) => MCP_COLORS[i % MCP_COLORS.length];

  return (
    <div style={{ ...NODE_BASE, minWidth: 200 }}>
      <div style={{ height: 3, background: roleInfo.color }} />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <div style={{ padding: "10px 14px" }}>
        {/* Header */}
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

        {/* MCP section */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              MCP 도구
            </span>
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMcpDropdown((v) => !v); }}
                style={{
                  padding: "2px 7px",
                  borderRadius: 5,
                  border: "1px solid var(--color-border)",
                  background: showMcpDropdown ? "var(--color-accent)" : "transparent",
                  color: showMcpDropdown ? "#fff" : "var(--color-text-secondary)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "Pretendard, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.15s",
                }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                MCP
              </button>

              {showMcpDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: "calc(100% + 4px)",
                    zIndex: 100,
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    minWidth: 180,
                    padding: "6px 0",
                  }}
                >
                  {mcpServers.length === 0 ? (
                    <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>
                      MCP 서버 없음
                    </div>
                  ) : (
                    mcpServers.map((server, i) => (
                      <div
                        key={server}
                        onClick={() => toggleMcp(server)}
                        style={{
                          padding: "7px 14px",
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--color-text-primary)",
                          background: mcpTools.includes(server) ? "var(--color-bg-hover)" : "transparent",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = mcpTools.includes(server) ? "var(--color-bg-hover)" : "transparent")}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: mcpColor(i),
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{server}</span>
                        {mcpTools.includes(server) && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#55efc4" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Connected MCP tags */}
          {mcpTools.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {mcpTools.map((server, i) => (
                <span
                  key={server}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "2px 6px 2px 7px",
                    borderRadius: 10,
                    background: mcpColor(mcpServers.indexOf(server) >= 0 ? mcpServers.indexOf(server) : i) + "25",
                    border: `1px solid ${mcpColor(mcpServers.indexOf(server) >= 0 ? mcpServers.indexOf(server) : i)}55`,
                    fontSize: 10,
                    color: mcpColor(mcpServers.indexOf(server) >= 0 ? mcpServers.indexOf(server) : i),
                    fontWeight: 600,
                    maxWidth: 90,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{server}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); removeMcp(server); }}
                    style={{ cursor: "pointer", opacity: 0.7, flexShrink: 0, lineHeight: 1 }}
                  >
                    ✕
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
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

// ─── Edge defaults ─────────────────────────────────────────────────────────────

const EDGE_DEFAULTS: Partial<Edge> = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#6c5ce7" },
  style: { stroke: "#6c5ce7", strokeWidth: 1.5 },
};

// ─── Templates ───────────────────────────────────────────────────────────────

type WorkflowTemplate = "general" | "development" | "blank";

interface WorkflowData {
  name: string;
  nodes: Node[];
  edges: Edge[];
}

const GENERAL_NODES: Node[] = [
  { id: "trigger-1", type: "trigger", position: { x: 40, y: 150 }, data: { label: "태스크 시작" } },
  { id: "agent-task", type: "agent", position: { x: 240, y: 130 }, data: { role: "task", model: "claude", mcpTools: [] } },
  { id: "agent-research", type: "agent", position: { x: 480, y: 130 }, data: { role: "research", model: "claude", mcpTools: [] } },
  { id: "agent-docs", type: "agent", position: { x: 720, y: 130 }, data: { role: "docs", model: "claude", mcpTools: [] } },
  { id: "end-1", type: "end", position: { x: 960, y: 155 }, data: { label: "완료" } },
];

const GENERAL_EDGES: Edge[] = [
  { id: "e1", source: "trigger-1", target: "agent-task", ...EDGE_DEFAULTS },
  { id: "e2", source: "agent-task", target: "agent-research", ...EDGE_DEFAULTS },
  { id: "e3", source: "agent-research", target: "agent-docs", ...EDGE_DEFAULTS },
  { id: "e4", source: "agent-docs", target: "end-1", ...EDGE_DEFAULTS },
];

const DEV_NODES: Node[] = [
  { id: "trigger-1", type: "trigger", position: { x: 40, y: 180 }, data: { label: "태스크 시작" } },
  { id: "agent-planning", type: "agent", position: { x: 240, y: 160 }, data: { role: "planning", model: "claude", mcpTools: [] } },
  { id: "agent-client", type: "agent", position: { x: 460, y: 100 }, data: { role: "client", model: "claude", mcpTools: [] } },
  { id: "agent-server", type: "agent", position: { x: 460, y: 260 }, data: { role: "server", model: "claude", mcpTools: [] } },
  { id: "agent-testing", type: "agent", position: { x: 700, y: 160 }, data: { role: "testing", model: "claude", mcpTools: [] } },
  { id: "agent-qa", type: "agent", position: { x: 920, y: 160 }, data: { role: "qa", model: "claude", mcpTools: [] } },
  { id: "end-1", type: "end", position: { x: 1140, y: 185 }, data: { label: "완료" } },
];

const DEV_EDGES: Edge[] = [
  { id: "e1", source: "trigger-1", target: "agent-planning", ...EDGE_DEFAULTS },
  { id: "e2", source: "agent-planning", target: "agent-client", ...EDGE_DEFAULTS },
  { id: "e3", source: "agent-planning", target: "agent-server", ...EDGE_DEFAULTS },
  { id: "e4", source: "agent-client", target: "agent-testing", ...EDGE_DEFAULTS },
  { id: "e5", source: "agent-server", target: "agent-testing", ...EDGE_DEFAULTS },
  { id: "e6", source: "agent-testing", target: "agent-qa", ...EDGE_DEFAULTS },
  { id: "e7", source: "agent-qa", target: "end-1", ...EDGE_DEFAULTS },
];

const BLANK_NODES: Node[] = [
  { id: "trigger-1", type: "trigger", position: { x: 200, y: 200 }, data: { label: "트리거" } },
];
const BLANK_EDGES: Edge[] = [];

const STORAGE_KEY = "desker:workflow-data";

function saveWorkflow(data: WorkflowData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadWorkflow(): WorkflowData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkflowData;
  } catch {
    return null;
  }
}

// ─── Sidebar palette ──────────────────────────────────────────────────────────

const PALETTE_ITEMS = [
  { type: "trigger", label: "트리거", iconKey: "trigger", color: "#6c5ce7", desc: "시작 지점" },
  { type: "agent:task", label: "태스크 Agent", iconKey: "task", color: "#6c5ce7", desc: "할 일 처리" },
  { type: "agent:research", label: "리서치 Agent", iconKey: "research", color: "#0984e3", desc: "정보 수집" },
  { type: "agent:docs", label: "문서화 Agent", iconKey: "docs", color: "#00b894", desc: "문서 작성" },
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
        bottom: 80,
        right: 20,
        zIndex: 20,
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: 210,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid var(--color-border)", marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          노드 추가
        </span>
        <div
          onClick={onClose}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      </div>

      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => { onDragStart(e, item.type); onClose(); }}
          title={`${item.label} — ${item.desc}`}
          style={{
            borderRadius: 8,
            background: item.color + "12",
            border: "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "grab",
            transition: "all 0.12s",
            padding: "7px 10px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = item.color + "80";
            (e.currentTarget as HTMLDivElement).style.background = item.color + "22";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
            (e.currentTarget as HTMLDivElement).style.background = item.color + "12";
          }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 7, background: item.color + "25", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {NODE_ICONS[item.iconKey]?.({ color: item.color, size: 14 })}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.2 }}>
              {item.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── WorkflowCreationScreen ───────────────────────────────────────────────────

// Mini node chain preview
function MiniNodeChain({ roles, colors }: { roles: string[]; colors: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
      {roles.map((role, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 7px",
              borderRadius: 6,
              background: colors[i] + "20",
              border: `1px solid ${colors[i]}50`,
              fontSize: 10,
              fontWeight: 600,
              color: colors[i],
              whiteSpace: "nowrap",
            }}
          >
            {NODE_ICONS[role] ? NODE_ICONS[role]!({ color: colors[i], size: 10 }) : null}
            <span style={{ marginLeft: 2 }}>{role}</span>
          </span>
          {i < roles.length - 1 && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function WorkflowCreationScreen({ onCreate }: { onCreate: (template: WorkflowTemplate) => void }) {
  const templates = [
    {
      id: "general" as WorkflowTemplate,
      icon: "📋",
      title: "일반 파이프라인",
      desc: "태스크 수행, 리서치, 문서화로 이어지는 범용 AI 워크플로우",
      roles: ["trigger", "task", "research", "docs", "end"],
      colors: ["#6c5ce7", "#6c5ce7", "#0984e3", "#00b894", "#55efc4"],
    },
    {
      id: "development" as WorkflowTemplate,
      icon: "💻",
      title: "개발 파이프라인",
      desc: "기획부터 QA까지 전체 소프트웨어 개발 사이클 자동화",
      roles: ["trigger", "planning", "client", "server", "testing", "qa", "end"],
      colors: ["#6c5ce7", "#74b9ff", "#a29bfe", "#55efc4", "#ffeaa7", "#ff9ff3", "#55efc4"],
    },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--color-bg-primary)",
        gap: 32,
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 6 }}>
          워크플로우 만들기
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          템플릿을 선택하거나 빈 캔버스에서 시작하세요
        </div>
      </div>

      {/* Template cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => onCreate(tmpl.id)}
            style={{
              width: 260,
              padding: "20px 20px 18px",
              borderRadius: 14,
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-secondary)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.18s",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              fontFamily: "Pretendard, sans-serif",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "var(--color-accent)";
              el.style.transform = "translateY(-3px)";
              el.style.boxShadow = "0 8px 32px rgba(108,92,231,0.25)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = "var(--color-border)";
              el.style.transform = "none";
              el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.2)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{tmpl.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{tmpl.title}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{tmpl.desc}</div>
            <MiniNodeChain roles={tmpl.roles} colors={tmpl.colors} />
          </button>
        ))}

        {/* Blank canvas */}
        <button
          onClick={() => onCreate("blank")}
          style={{
            width: 260,
            padding: "20px 20px 18px",
            borderRadius: 14,
            border: "1.5px dashed var(--color-border)",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.18s",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            fontFamily: "Pretendard, sans-serif",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--color-accent)";
            el.style.background = "var(--color-bg-secondary)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.borderColor = "var(--color-border)";
            el.style.background = "transparent";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>빈 캔버스</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            처음부터 나만의 워크플로우를 자유롭게 구성하세요
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)", fontSize: 11 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            노드를 드래그해서 배치
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── WorkflowEditor ───────────────────────────────────────────────────────────

let nodeIdCounter = 100;

function WorkflowEditorInner() {
  const saved = loadWorkflow();
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowTemplate | null>(saved ? "general" : null);

  const [nodes, setNodes, onNodesChange] = useNodesState(saved?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(saved?.edges ?? []);
  const [workflowName, setWorkflowName] = useState(saved?.name ?? "워크플로우");
  const [isRunning, setIsRunning] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Persist on change
  useEffect(() => {
    if (activeWorkflow !== null) {
      saveWorkflow({ name: workflowName, nodes, edges });
    }
  }, [nodes, edges, workflowName, activeWorkflow]);

  const handleCreate = (template: WorkflowTemplate) => {
    let initNodes: Node[];
    let initEdges: Edge[];
    let name: string;

    if (template === "general") {
      initNodes = GENERAL_NODES;
      initEdges = GENERAL_EDGES;
      name = "일반 파이프라인";
    } else if (template === "development") {
      initNodes = DEV_NODES;
      initEdges = DEV_EDGES;
      name = "개발 파이프라인";
    } else {
      initNodes = BLANK_NODES;
      initEdges = BLANK_EDGES;
      name = "새 워크플로우";
    }

    setNodes(initNodes);
    setEdges(initEdges);
    setWorkflowName(name);
    setActiveWorkflow(template);
    saveWorkflow({ name, nodes: initNodes, edges: initEdges });
  };

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
        data = { role, model: "claude", mcpTools: [] };
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
    setActiveWorkflow(null);
    setNodes([]);
    setEdges([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  // Creation screen when no workflow active
  if (activeWorkflow === null) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg-primary)" }}>
        {/* Minimal toolbar */}
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
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>워크플로우</span>
        </div>
        <WorkflowCreationScreen onCreate={handleCreate} />
      </div>
    );
  }

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

        {/* Floating palette (bottom-right, above FAB) */}
        <FloatingPalette open={showPalette} onClose={() => setShowPalette(false)} />

        {/* FAB button (bottom-right) */}
        <button
          onClick={() => setShowPalette((v) => !v)}
          title="노드 추가"
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            zIndex: 20,
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: showPalette ? "#8b7cf0" : "var(--color-accent)",
            color: "#fff",
            border: "none",
            boxShadow: showPalette
              ? "0 4px 20px rgba(108,92,231,0.6)"
              : "0 4px 16px rgba(108,92,231,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.18s",
            transform: showPalette ? "rotate(45deg)" : "none",
          }}
          onMouseEnter={(e) => {
            if (!showPalette) {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(108,92,231,0.55)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = showPalette ? "rotate(45deg)" : "none";
            e.currentTarget.style.boxShadow = showPalette
              ? "0 4px 20px rgba(108,92,231,0.6)"
              : "0 4px 16px rgba(108,92,231,0.4)";
          }}
        >
          <IconPuzzle color="#fff" size={22} />
        </button>
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
