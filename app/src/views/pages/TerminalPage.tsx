import { useRef, useState, useEffect } from "react";
import "@xterm/xterm/css/xterm.css";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSessionVM } from "../../viewmodels/session.vm";
import { useAppVM } from "../../viewmodels/app.vm";
import { useAiVM } from "../../viewmodels/ai.vm";
import { useTerminal, setPendingFiles } from "../../hooks/useTerminal";
import type { TerminalMode, AiModel, TerminalSession, AgentRole, AgentEnvironment } from "../../viewmodels/session.vm";
import { getAgentPreset } from "../../viewmodels/session.vm";
import StartSessionModal from "../shared/StartSessionModal";
import TaskDetailModal from "../shared/TaskDetailModal";
import { useProjectVM } from "../../viewmodels/project.vm";
import type { Task, TodoItem } from "../../types/models";

// ── Task label constants ──
const PRI_LABEL: Record<string, { label: string; color: string }> = {
  high: { label: "높음", color: "var(--color-danger)" },
  medium: { label: "보통", color: "var(--color-warning)" },
  low: { label: "낮음", color: "var(--color-success)" },
};

// ── Compact Task Bar (shown in each pane's tab bar) ──
function TaskBarCompact({ session }: { session: TerminalSession }) {
  const { tasks, projects, loadAll } = useProjectVM();
  const [visible, setVisible] = useState(true);

  useEffect(() => { loadAll(); }, [loadAll]);

  const task: Task | undefined = tasks.find((t) => t.id === session.taskId);
  const project = task ? projects.find((p) => p.id === task.projectId) : null;
  const isQuick = session.taskId === "quick";

  if (isQuick || !task) return null;

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="연관 태스크 보기"
        style={{
          padding: "4px 8px", borderRadius: 6, fontSize: 11,
          border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
          color: "var(--color-text-secondary)", cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", gap: 3,
        }}
        className="hover:bg-bg-hover transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </button>
    );
  }

  const pri = PRI_LABEL[task.priority];
  const truncTitle = task.title.length > 20 ? task.title.slice(0, 20) + "..." : task.title;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {/* Project */}
      {project && (
        <span
          style={{
            padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500,
            background: "var(--color-bg-primary)", border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4,
            maxWidth: 100, overflow: "hidden", whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 11 }}>{project.icon}</span>
          <span className="truncate">{project.name}</span>
        </span>
      )}

      {/* Title */}
      <span
        style={{
          padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
          background: "var(--color-bg-primary)", border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
          maxWidth: 160, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}
        title={task.title}
      >
        {truncTitle}
      </span>

      {/* Priority */}
      {pri && (
        <span
          style={{
            padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600,
            border: `1px solid ${pri.color}`,
            color: pri.color,
            background: `color-mix(in srgb, ${pri.color} 12%, transparent)`,
          }}
        >
          {pri.label}
        </span>
      )}

      {/* Hide */}
      <button
        onClick={() => setVisible(false)}
        title="숨기기"
        style={{
          padding: "3px 6px", borderRadius: 5, fontSize: 11,
          border: "1px solid var(--color-border)", background: "transparent",
          color: "var(--color-text-secondary)", cursor: "pointer",
          display: "flex", alignItems: "center",
        }}
        className="hover:bg-bg-hover transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
  );
}

// ── Project Icon (SVG, replaces emoji) ──
function ProjectIcon({ icon, mode, aiModel, size = 16 }: { icon?: string; mode?: TerminalMode; aiModel?: AiModel; size?: number }) {
  // If icon is a real project icon (not quick-start placeholder), render it
  if (icon && !["🟣", "🟢", "⬛", ""].includes(icon)) {
    return <span style={{ fontSize: size - 2, lineHeight: 1 }}>{icon}</span>;
  }
  // Claude
  if (mode === "ai" && aiModel === "claude") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M8 1L9.8 6.2L15 8L9.8 9.8L8 15L6.2 9.8L1 8L6.2 6.2L8 1Z" fill="var(--color-accent)" />
      </svg>
    );
  }
  // ChatGPT
  if (mode === "ai" && aiModel === "chatgpt") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="8" cy="8" r="6" stroke="#10a37f" strokeWidth="1.5" />
        <path d="M5.5 8.5L7 10L10.5 6.5" stroke="#10a37f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Shell
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <polyline points="5,7 7,9 5,11" />
      <line x1="9" y1="11" x2="11" y2="11" />
    </svg>
  );
}

// ── Dropped file chip ──
type DroppedFile = { name: string; path: string };

// ── Terminal with file drop overlay ──
function TerminalWithDrop({ sessionId, mode, aiModel, agentRole, taskId, droppedFiles, onFileDrop, onFileClear, onFileRemove }: {
  sessionId: string; mode: TerminalMode; aiModel?: AiModel; agentRole?: AgentRole; taskId?: string;
  droppedFiles: DroppedFile[];
  onFileDrop: (files: DroppedFile[]) => void;
  onFileClear: () => void;
  onFileRemove: (idx: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  useTerminal(sessionId, containerRef, mode, aiModel, false, agentRole, taskId);

  // Sync dropped files to pending map so useTerminal can consume on Enter
  const onClearRef = useRef(onFileClear);
  onClearRef.current = onFileClear;
  useEffect(() => {
    setPendingFiles(sessionId, droppedFiles, () => onClearRef.current());
  }, [sessionId, droppedFiles]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        dragCounter.current++;
        setDragOver(true);
      }
    };
    const onDragLeave = () => {
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setDragOver(false);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);

      const rawFiles = Array.from(e.dataTransfer?.files ?? []);
      if (rawFiles.length === 0) return;

      const dropped: DroppedFile[] = rawFiles
        .map((f) => {
          const p = window.deskerAPI.fs.getPathForFile(f);
          return p ? { name: f.name, path: p } : null;
        })
        .filter(Boolean) as DroppedFile[];

      if (dropped.length === 0) return;
      onFileDrop(dropped);
    };

    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", onDrop);
    };
  }, [sessionId, mode, onFileDrop]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* File chips — pinned to bottom of terminal, above the input line */}
      {droppedFiles.length > 0 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5,
          padding: "4px 8px",
          display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
        }}>
          {droppedFiles.map((f, i) => (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", borderRadius: 6, fontSize: 12,
              background: "var(--color-bg-tertiary)", color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span onClick={() => onFileRemove(i)} style={{ cursor: "pointer", opacity: 0.4, fontSize: 10 }} className="hover:opacity-100">✕</span>
            </div>
          ))}
        </div>
      )}
      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(108,92,231,0.08)",
          border: "2px dashed var(--color-accent)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "all",
        }}>
          <div style={{ textAlign: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: 13, color: "var(--color-accent)", fontWeight: 600 }}>파일 드래그</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionTerminal({ session, droppedFiles, onFileDrop, onFileClear, onFileRemove }: {
  session: TerminalSession;
  droppedFiles: DroppedFile[];
  onFileDrop: (files: DroppedFile[]) => void;
  onFileClear: () => void;
  onFileRemove: (idx: number) => void;
}) {
  return <TerminalWithDrop key={session.id} sessionId={session.id} mode={session.mode} aiModel={session.aiModel} agentRole={session.agentRole} taskId={session.taskId} droppedFiles={droppedFiles} onFileDrop={onFileDrop} onFileClear={onFileClear} onFileRemove={onFileRemove} />;
}

// ── Quick Action Bar ──
function QuickActionBar({ sessionId }: { sessionId: string }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const sendCommand = (text: string) => {
    window.deskerAPI.ai.write(sessionId, text + "\r");
    setShowSuggestions(false);
  };
  const suggestions: { label: string; icon: React.ReactNode }[] = [
    { label: "내 태스크 목록 보여줘", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg> },
    { label: "진행 중인 태스크 보여줘", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg> },
    { label: "오늘 마감인 태스크 있어?", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
    { label: "새 태스크 만들어줘", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> },
  ];
  return (
    <>
      {showSuggestions && (
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--color-border)", padding: "10px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)" }}>이런 대화 어때요?</span>
            <button onClick={() => setShowSuggestions(false)} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", opacity: 0.4, transition: "all 0.15s" }} className="hover:opacity-100 hover:bg-bg-hover">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestions.map((s) => (
              <button key={s.label} onClick={() => sendCommand(s.label)} style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }} className="hover:border-accent/50 hover:text-accent">
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="shrink-0 flex items-center gap-2 border-t border-border bg-bg-secondary/50" style={{ padding: "8px 8px" }}>
        <button onClick={() => sendCommand("내 프로젝트 목록 보여줘")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer" title="프로젝트 조회">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          프로젝트
        </button>
        <button onClick={() => sendCommand("내 태스크 목록 보여줘")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer" title="태스크 조회">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          태스크
        </button>
        <button onClick={() => setShowSuggestions(!showSuggestions)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${showSuggestions ? "text-accent bg-accent/10" : "text-text-secondary hover:text-accent hover:bg-accent/10"}`} title="대화 추천">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          추천
        </button>
      </div>
    </>
  );
}

// ── Session state sparkle icon (like Claude Code tab) ──
function SessionStateIcon({ state, mode }: { state: string; mode: TerminalMode }) {
  if (state === "working") {
    // Animated sparkle — spinning when active
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin" style={{ animationDuration: "3s" }}>
        <path d="M8 0C8 0 9.5 5 8 8C6.5 5 8 0 8 0Z" fill="currentColor" />
        <path d="M16 8C16 8 11 9.5 8 8C11 6.5 16 8 16 8Z" fill="currentColor" />
        <path d="M8 16C8 16 6.5 11 8 8C9.5 11 8 16 8 16Z" fill="currentColor" />
        <path d="M0 8C0 8 5 6.5 8 8C5 9.5 0 8 0 8Z" fill="currentColor" />
      </svg>
    );
  }
  if (state === "error") {
    // Static warning sparkle
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
      </svg>
    );
  }
  // Idle — static sparkle
  if (mode === "ai") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
        <path d="M8 1L9.2 6.8L15 8L9.2 9.2L8 15L6.8 9.2L1 8L6.8 6.8L8 1Z" fill="currentColor" opacity="0.5" />
      </svg>
    );
  }
  // Shell idle — terminal prompt icon
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" opacity="0.5">
      <polyline points="4,5 7,8 4,11" />
      <line x1="9" y1="11" x2="12" y2="11" />
    </svg>
  );
}

// ── Draggable Chip Tab ──
function DraggableTab({
  session,
  isActive,
  onClick,
  onClose,
}: {
  session: TerminalSession;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
    data: { session },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "13px",
        border: "none",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        cursor: "grab",
        transition: isDragging ? "none" : (transition ?? "all 0.15s"),
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        flexShrink: 0,
        userSelect: "none",
        fontWeight: isActive ? 600 : 400,
        opacity: isDragging ? 0.5 : 1,
        background: isActive ? "var(--color-text-primary)" : "transparent",
        color: isActive ? "var(--color-bg-primary)" : "var(--color-text-secondary)",
      }}
      className="hover:bg-bg-hover active:cursor-grabbing"
    >
      <SessionStateIcon state={session.state} mode={session.mode} />
      <span className="truncate max-w-[120px]">{session.taskTitle}</span>
      <span
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          width: "18px",
          height: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          fontSize: "10px",
          marginLeft: "2px",
          cursor: "pointer",
          transition: "all 0.15s",
          opacity: 0.5,
        }}
        className={isActive ? "hover:bg-bg-primary/20" : "hover:bg-danger/15 hover:text-danger"}
      >✕</span>
    </button>
  );
}

// ── Drag Overlay (ghost chip while dragging) ──
function TabDragOverlay({ session }: { session: TerminalSession }) {
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "var(--color-text-primary)",
        color: "var(--color-bg-primary)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <SessionStateIcon state={session.state} mode={session.mode} />
      <span className="truncate max-w-[120px]">{session.taskTitle}</span>
    </div>
  );
}

// ── Drop Zone (appears when dragging, flex-1 for ratio preview) ──
function SplitDropZone({ isDragging }: { isDragging: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: "split-new" });

  if (!isDragging) return null;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 border-l-2 border-dashed flex items-center justify-center transition-colors ${
        isOver
          ? "border-accent bg-accent/10"
          : "border-border bg-bg-secondary/30"
      }`}
    >
      <div className="text-center">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke={isOver ? "var(--color-accent)" : "var(--color-text-secondary)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1 opacity-60">
          <rect x="1" y="2" width="14" height="12" rx="2" />
          <line x1="8" y1="2" x2="8" y2="14" />
        </svg>
        <p className={`text-[12px] ${isOver ? "text-accent" : "text-text-secondary/50"}`}>
          여기에 놓아서 분할
        </p>
      </div>
    </div>
  );
}

// ── Pane (tab bar + terminal) ──
function Pane({
  paneSessions,
  activeId,
  onSetActive,
  onCloseSession,
  paneIndex,
  isDragging,
}: {
  paneSessions: TerminalSession[];
  activeId: string | null;
  onSetActive: (id: string) => void;
  onCloseSession: (id: string) => void;
  paneIndex: number;
  isDragging: boolean;
}) {
  const { isOver, setNodeRef: dropRef } = useDroppable({
    id: `pane-${paneIndex}`,
  });
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);

  const active = paneSessions.find((s) => s.id === activeId) ?? paneSessions[0];

  const handleFileDrop = (files: DroppedFile[]) => {
    setDroppedFiles((prev) => [...prev, ...files]);
  };
  const handleRemoveFile = (idx: number) => {
    setDroppedFiles((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleClearFiles = () => setDroppedFiles([]);

  return (
    <div
      ref={dropRef}
      className={`flex-1 min-w-0 flex flex-col ${paneIndex > 0 ? "border-l border-border" : ""} ${
        isOver && isDragging ? "bg-accent/5" : ""
      }`}
    >
      {/* Tab bar */}
      <div style={{ padding: "0 12px 0 16px", display: "flex", alignItems: "center", gap: "4px", borderBottom: "1px solid var(--color-border)", flexShrink: 0, height: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto", flex: 1, minWidth: 0 }}>
          <SortableContext items={paneSessions.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
            {paneSessions.map((s) => (
              <DraggableTab
                key={s.id}
                session={s}
                isActive={s.id === active?.id}
                onClick={() => onSetActive(s.id)}
                onClose={() => onCloseSession(s.id)}
              />
            ))}
          </SortableContext>
        </div>
        {/* Compact task bar — right-aligned */}
        {active && <TaskBarCompact session={active} />}
      </div>

      {/* Terminal */}
      <div className="flex-1 min-h-0 bg-bg-primary">
        {active && <SessionTerminal session={active} droppedFiles={droppedFiles} onFileDrop={handleFileDrop} onFileClear={handleClearFiles} onFileRemove={handleRemoveFile} />}
      </div>

      {/* Quick bar for AI */}
      {active?.mode === "ai" && <QuickActionBar sessionId={active.id} />}
    </div>
  );
}

// ── Empty state ──
function EmptyTerminal() {
  const setPage = useAppVM((s) => s.setCurrentPage);
  const createSession = useSessionVM((s) => s.createSession);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const handleQuickStart = (mode: TerminalMode, aiModel?: AiModel) => {
    createSession({
      taskId: "quick",
      taskTitle: mode === "ai" ? `${aiModel === "claude" ? "Claude" : "ChatGPT"} 세션` : "터미널",
      projectName: "빠른 시작",
      projectIcon: "",
      mode, aiModel,
    });
    setShowQuickStart(false);
  };
  return (
    <div className="h-full flex flex-col items-center justify-center text-text-secondary" style={{ gap: "24px" }}>
      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <polyline points="7,10 10,13 7,16" />
          <line x1="13" y1="16" x2="17" y2="16" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
          터미널 세션이 없습니다
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          새 세션을 시작하거나, 태스크에서 시작하세요
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => setShowQuickStart(true)}
          style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            border: "none", background: "var(--color-accent)", color: "#fff",
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: "4px",
          }}
          className="hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 세션
        </button>
        <button
          onClick={() => setPage("workspace")}
          style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 400,
            border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)",
            color: "var(--color-text-secondary)", cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: "4px",
          }}
          className="hover:bg-bg-hover"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          태스크로 이동
        </button>
      </div>

      {showQuickStart && <StartSessionModal taskTitle="빠른 시작" onStart={handleQuickStart} onClose={() => setShowQuickStart(false)} />}
    </div>
  );
}


// ── Terminal Header ──
function TerminalHeader({
  session,
  paneCount,
  isSplit,
  onNewSession,
}: {
  session: TerminalSession;
  paneCount: number;
  isSplit: boolean;
  onNewSession: () => void;
}) {
  return (
    <div
      style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0, borderBottom: "1px solid var(--color-border)" }}
    >
      {/* Session info group */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          session.state === "working"
            ? "bg-success animate-pulse"
            : session.state === "error"
            ? "bg-danger"
            : "bg-text-secondary/40"
        }`} />
        {/* Project icon + name */}
        <ProjectIcon icon={session.projectIcon} mode={session.mode} aiModel={session.aiModel} size={16} />
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }} className="truncate max-w-[160px]">
          {session.projectName}
        </span>
        {/* Separator */}
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", opacity: 0.4 }}>/</span>
        {/* Task */}
        <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }} className="truncate max-w-[180px]">
          {session.taskTitle}
        </span>
      </div>

      {/* Mode Badge — styled like editor category buttons */}
      {session.mode === "ai" ? (
        <div style={{
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600,
          border: `1px solid ${session.aiModel === "claude" ? "var(--color-accent)" : "#10a37f"}`,
          background: session.aiModel === "claude" ? "rgba(108,92,231,0.15)" : "rgba(16,163,127,0.15)",
          color: session.aiModel === "claude" ? "var(--color-accent)" : "#10a37f",
        }}>
          {session.aiModel === "claude" ? "Claude" : "ChatGPT"}
        </div>
      ) : (
        <div style={{
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-secondary)",
        }}>
          Shell
        </div>
      )}

      {/* Agent role badge */}
      {session.agentRole && (() => {
        const preset = getAgentPreset(session.agentRole);
        return preset ? (
          <div style={{
            padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
            border: `1px solid ${preset.color}50`,
            background: `${preset.color}15`,
            color: preset.color,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>{preset.icon}</span>
            {preset.label}
          </div>
        ) : null;
      })()}

      {/* Divider */}
      <div style={{ width: "1px", height: "24px", background: "var(--color-border)" }} />

      {/* Pane count — small button style */}
      {isSplit && (
        <div style={{
          padding: "5px 10px",
          borderRadius: "6px",
          fontSize: "12px",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-secondary)",
          color: "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="2" width="14" height="12" rx="2" />
            <line x1="5.5" y1="2" x2="5.5" y2="14" />
            <line x1="10.5" y1="2" x2="10.5" y2="14" />
          </svg>
          {paneCount}패널
        </div>
      )}

      {/* (task bar is now inline in each pane's tab bar) */}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Time */}
      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", opacity: 0.5, fontVariantNumeric: "tabular-nums" }}>
        {new Date(session.startedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
      </span>

      {/* New session — accent button style (like editor's accent button) */}
      <button
        onClick={onNewSession}
        style={{
          padding: "6px 16px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: 600,
          border: "none",
          background: "var(--color-accent)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        className="hover:opacity-90"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        새 세션
      </button>
    </div>
  );
}

// ── Right Task Panel ──
function TaskRightPanel({ session }: { session: TerminalSession }) {
  const { tasks, projects, updateTask } = useProjectVM();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const task = tasks.find((t) => t.id === session.taskId);
  const project = task ? projects.find((p) => p.id === task.projectId) : null;
  const isQuick = session.taskId === "quick";

  // Load todos
  useEffect(() => {
    if (!task) return;
    window.deskerAPI.db.getTaskTodos(task.id).then((rows) => {
      setTodos(rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        taskId: r.task_id as string,
        text: r.text as string,
        done: !!(r.done as number),
        sortOrder: r.sort_order as number,
      })));
    });
  }, [task?.id]);

  const toggleTodo = async (todo: TodoItem) => {
    await window.deskerAPI.db.updateTaskTodo(todo.id, { done: todo.done ? 0 : 1 });
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
  };

  if (isQuick || !task) return null;

  const statusLabel = task.status === "todo" ? "할 일" : task.status === "in_progress" ? "진행 중" : "완료";
  const statusColor = task.status === "todo" ? "#9090a8" : task.status === "in_progress" ? "#74b9ff" : "#00b894";
  const pri = PRI_LABEL[task.priority];
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div style={{
      width: 260, flexShrink: 0, borderLeft: "1px solid var(--color-border)",
      display: "flex", flexDirection: "column", overflowY: "auto",
      padding: "16px 14px", gap: 14,
    }}>
      {/* Header */}
      <div>
        {project && (
          <div style={{ fontSize: 11, marginBottom: 4 }} className="text-text-secondary">
            {project.icon} {project.name}
          </div>
        )}
        <div
          onClick={() => setDetailTaskId(task.id)}
          style={{ fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          className="text-text-primary hover:text-accent transition-colors"
        >
          {task.title}
        </div>
      </div>

      {/* Agent badge */}
      {session.agentRole && (() => {
        const preset = getAgentPreset(session.agentRole);
        return preset ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 8,
            background: `${preset.color}15`, border: `1px solid ${preset.color}40`,
          }}>
            <span style={{ fontSize: 14 }}>{preset.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: preset.color }}>{preset.label}</span>
          </div>
        ) : null;
      })()}

      {/* Status + Priority */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 6,
          color: statusColor, background: `${statusColor}20`, fontWeight: 500,
        }}>
          {statusLabel}
        </span>
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 6,
          color: pri.color, background: "var(--color-bg-tertiary)", fontWeight: 500,
        }}>
          {pri.label}
        </span>
      </div>

      {/* Dates */}
      {(task.startDate || task.dueDate) && (
        <div style={{ fontSize: 12 }} className="text-text-secondary">
          {task.startDate && <span>{task.startDate}</span>}
          {task.startDate && task.dueDate && <span> ~ </span>}
          {task.dueDate && <span>{task.dueDate}</span>}
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div style={{ fontSize: 13, lineHeight: 1.5 }} className="text-text-secondary">
          {task.description}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1 }} className="bg-border" />

      {/* Todos */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }} className="text-text-secondary">TODO</span>
          {todos.length > 0 && (
            <span style={{ fontSize: 11 }} className="text-text-secondary">{doneCount}/{todos.length}</span>
          )}
        </div>
        {todos.length === 0 ? (
          <div style={{ fontSize: 12 }} className="text-text-secondary/40">하위 TODO 없음</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {todos.map((todo) => (
              <div key={todo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px" }}>
                <button
                  onClick={() => toggleTodo(todo)}
                  style={{
                    width: 16, height: 16, borderRadius: "50%",
                    border: "2px solid",
                    flexShrink: 0, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderColor: todo.done ? "var(--color-success, #00b894)" : "var(--color-text-secondary)",
                    background: todo.done ? "rgba(0,184,148,0.2)" : "transparent",
                    opacity: todo.done ? 1 : 0.5,
                  }}
                >
                  {todo.done && <span style={{ fontSize: 9, color: "var(--color-success, #00b894)", fontWeight: 700 }}>✓</span>}
                </button>
                <span style={{
                  fontSize: 12,
                  textDecoration: todo.done ? "line-through" : "none",
                  opacity: todo.done ? 0.5 : 1,
                }} className={todo.done ? "text-text-secondary" : "text-text-primary"}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open detail button */}
      <button
        onClick={() => setDetailTaskId(task.id)}
        style={{ fontSize: 12, padding: "6px 0", marginTop: "auto" }}
        className="text-text-secondary/40 hover:text-accent cursor-pointer transition-colors"
      >
        상세 보기 →
      </button>

      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
    </div>
  );
}

// ── Pane state type ──
type PaneState = { id: string; sessionIds: string[]; activeId: string | null };
let paneIdCounter = 0;
function createPane(sessionIds: string[], activeId: string | null): PaneState {
  return { id: `pane-${++paneIdCounter}`, sessionIds, activeId };
}

const MAX_PANES = 3;

// ── Main page ──
export default function TerminalPage() {
  const { sessions, activeSessionId, setActiveSession, removeSession } = useSessionVM();
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const createSession = useSessionVM((s) => s.createSession);
  const checkAvailability = useAiVM((s) => s.checkAvailability);
  const [showNewSession, setShowNewSession] = useState(false);

  // Multi-pane state (max 3 panes)
  const [panes, setPanes] = useState<PaneState[]>([
    createPane(sessions.map((s) => s.id), activeSessionId),
  ]);
  const [draggingSession, setDraggingSession] = useState<TerminalSession | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { checkAvailability(); }, [checkAvailability]);

  // Sync panes when sessions change (cleanup removed sessions, add new ones to pane 0)
  useEffect(() => {
    const currentIds = new Set(sessions.map((s) => s.id));
    setPanes((prev) => {
      // Find session IDs already assigned to any pane
      const assignedIds = new Set(prev.flatMap((p) => p.sessionIds));
      // New sessions not yet in any pane → add to first pane
      const newIds = sessions.filter((s) => !assignedIds.has(s.id)).map((s) => s.id);

      let updated = prev.map((pane) => {
        const filtered = pane.sessionIds.filter((id) => currentIds.has(id));
        const withNew = pane === prev[0] ? [...filtered, ...newIds] : filtered;
        const activeStillExists = pane.activeId && withNew.includes(pane.activeId);
        return {
          ...pane,
          sessionIds: withNew,
          activeId: activeStillExists ? pane.activeId : (withNew[0] ?? null),
        };
      });

      // Remove empty panes (but keep at least one)
      updated = updated.filter((p) => p.sessionIds.length > 0);
      if (updated.length === 0) {
        updated = [createPane([], null)];
      }

      return updated;
    });
  }, [sessions]);

  // Keep global activeSessionId in sync with pane 0's active
  useEffect(() => {
    if (panes[0]?.activeId && panes[0].activeId !== activeSessionId) {
      setActiveSession(panes[0].activeId);
    }
  }, [panes, activeSessionId, setActiveSession]);

  if (sessions.length === 0) return <EmptyTerminal />;

  const isSplit = panes.length > 1;
  const canSplit = panes.length < MAX_PANES;

  // Helper: find which pane a session belongs to
  const findPaneIndex = (sessionId: string): number =>
    panes.findIndex((p) => p.sessionIds.includes(sessionId));

  // Helper: get TerminalSession objects for a pane
  const getPaneSessions = (pane: PaneState): TerminalSession[] =>
    pane.sessionIds.map((id) => sessions.find((s) => s.id === id)).filter(Boolean) as TerminalSession[];

  const handleNewSession = (mode: TerminalMode, aiModel?: AiModel, agentRole?: AgentRole, agentEnv?: AgentEnvironment) => {
    const preset = agentRole ? getAgentPreset(agentRole) : null;
    createSession({
      taskId: "quick",
      taskTitle: preset ? `${preset.icon} ${preset.label}` : mode === "ai" ? `${aiModel === "claude" ? "Claude" : "ChatGPT"} 세션` : "터미널",
      projectName: "빠른 시작",
      projectIcon: "",
      mode, aiModel, agentRole, agentEnv,
    });
    setShowNewSession(false);
  };

  const handleCloseSession = (id: string) => {
    if (sessions.find((s) => s.id === id)?.mode === "ai") {
      window.deskerAPI.ai.kill(id);
    } else {
      window.deskerAPI.pty.kill(id);
    }
    // Remove from panes
    setPanes((prev) => {
      let updated = prev.map((pane) => {
        const filtered = pane.sessionIds.filter((sid) => sid !== id);
        const activeStillExists = pane.activeId !== id;
        return {
          ...pane,
          sessionIds: filtered,
          activeId: activeStillExists ? pane.activeId : (filtered[0] ?? null),
        };
      });
      // Remove empty panes (keep at least one)
      updated = updated.filter((p) => p.sessionIds.length > 0);
      if (updated.length === 0) {
        updated = [createPane([], null)];
      }
      return updated;
    });
    removeSession(id);
  };

  const handleSetPaneActive = (paneIndex: number, sessionId: string) => {
    setPanes((prev) =>
      prev.map((pane, i) => (i === paneIndex ? { ...pane, activeId: sessionId } : pane))
    );
    // If it's the first pane, also update global active
    if (paneIndex === 0) {
      setActiveSession(sessionId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const session = sessions.find((s) => s.id === event.active.id);
    setDraggingSession(session ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingSession(null);
    if (!over || active.id === over.id) return;

    const sessionId = active.id as string;
    const target = over.id as string;
    const sourcePaneIndex = findPaneIndex(sessionId);
    const targetPaneIndexBySession = findPaneIndex(target);

    // Reorder within the same pane (dropped on another tab in the same pane)
    if (targetPaneIndexBySession !== -1 && targetPaneIndexBySession === sourcePaneIndex) {
      setPanes((prev) =>
        prev.map((pane, i) => {
          if (i !== sourcePaneIndex) return pane;
          const oldIndex = pane.sessionIds.indexOf(sessionId);
          const newIndex = pane.sessionIds.indexOf(target);
          if (oldIndex === -1 || newIndex === -1) return pane;
          return { ...pane, sessionIds: arrayMove(pane.sessionIds, oldIndex, newIndex) };
        })
      );
      return;
    }

    // Move to a different pane (dropped on a tab in another pane)
    if (targetPaneIndexBySession !== -1 && targetPaneIndexBySession !== sourcePaneIndex) {
      setPanes((prev) => {
        let updated = prev.map((pane, i) => {
          if (i === sourcePaneIndex) {
            const filtered = pane.sessionIds.filter((id) => id !== sessionId);
            return { ...pane, sessionIds: filtered, activeId: pane.activeId === sessionId ? (filtered[0] ?? null) : pane.activeId };
          }
          if (i === targetPaneIndexBySession) {
            const insertAt = pane.sessionIds.indexOf(target);
            const newIds = [...pane.sessionIds];
            newIds.splice(insertAt + 1, 0, sessionId);
            return { ...pane, sessionIds: newIds, activeId: sessionId };
          }
          return pane;
        });
        updated = updated.filter((p) => p.sessionIds.length > 0);
        if (updated.length === 0) updated = [createPane([], null)];
        return updated;
      });
      return;
    }

    if (target === "split-new") {
      // Create new pane with this session
      if (panes.length >= MAX_PANES) return;
      setPanes((prev) => {
        const updated = prev.map((pane, i) => {
          if (i !== sourcePaneIndex) return pane;
          const filtered = pane.sessionIds.filter((id) => id !== sessionId);
          return {
            ...pane,
            sessionIds: filtered,
            activeId: pane.activeId === sessionId ? (filtered[0] ?? null) : pane.activeId,
          };
        });
        // Add new pane
        updated.push(createPane([sessionId], sessionId));
        // Remove empty panes
        return updated.filter((p) => p.sessionIds.length > 0);
      });
    } else if (target.startsWith("pane-")) {
      const targetPaneIndex = parseInt(target.replace("pane-", ""), 10);
      if (isNaN(targetPaneIndex) || targetPaneIndex === sourcePaneIndex) return;

      setPanes((prev) => {
        // Remove from source pane
        let updated = prev.map((pane, i) => {
          if (i !== sourcePaneIndex) return pane;
          const filtered = pane.sessionIds.filter((id) => id !== sessionId);
          return {
            ...pane,
            sessionIds: filtered,
            activeId: pane.activeId === sessionId ? (filtered[0] ?? null) : pane.activeId,
          };
        });
        // Add to target pane
        updated = updated.map((pane, i) => {
          if (i !== targetPaneIndex) return pane;
          return {
            ...pane,
            sessionIds: [...pane.sessionIds, sessionId],
            activeId: sessionId,
          };
        });
        // Remove empty panes (keep at least one)
        updated = updated.filter((p) => p.sessionIds.length > 0);
        if (updated.length === 0) {
          updated = [createPane([], null)];
        }
        return updated;
      });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        {/* Header */}
        {activeSession && (
          <TerminalHeader
            session={activeSession}
            paneCount={panes.length}
            isSplit={isSplit}
            onNewSession={() => setShowNewSession(true)}
          />
        )}

        {/* Panes */}
        <div className="flex-1 min-h-0 flex">
          {panes.map((pane, i) => (
            <Pane
              key={pane.id}
              paneSessions={getPaneSessions(pane)}

              activeId={pane.activeId}
              onSetActive={(id) => handleSetPaneActive(i, id)}
              onCloseSession={handleCloseSession}
              paneIndex={i}
              isDragging={!!draggingSession}
            />
          ))}

          {/* Drop zone for new split — hide if dragged tab is the only one in its pane (would just create an empty pane) */}
          {canSplit && (() => {
            if (!draggingSession) return <SplitDropZone isDragging={false} />;
            const srcPane = panes.find((p) => p.sessionIds.includes(draggingSession.id));
            const srcHasMultiple = srcPane && srcPane.sessionIds.length > 1;
            return srcHasMultiple ? <SplitDropZone isDragging={true} /> : null;
          })()}

          {/* Right task panel */}
          {activeSession && <TaskRightPanel session={activeSession} />}
        </div>

        {showNewSession && (
          <StartSessionModal taskTitle="새 세션" onStart={handleNewSession} onClose={() => setShowNewSession(false)} />
        )}
      </div>

      {/* Drag ghost */}
      <DragOverlay dropAnimation={null}>
        {draggingSession && <TabDragOverlay session={draggingSession} />}
      </DragOverlay>
    </DndContext>
  );
}
