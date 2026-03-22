import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { useAppVM } from "../../../viewmodels/app.vm";
import type { Task } from "../../../types/models";
import TaskDetailModal from "../../shared/TaskDetailModal";
import { useSettingsStore } from "../../pages/SettingsPage";

// ── Clock ──
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const DAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(d: Date) {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}. ${DAY_KR[d.getDay()]}요일`;
}

function formatTime(d: Date) {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${m}`;
}

// ── Timetable (Study Planner style) ──
// 06:00 ~ 다음날 02:00, 5분 단위
const HOURS = Array.from({ length: 21 }, (_, i) => i + 6);
const SLOTS_PER_HOUR = 12; // 60 / 5
const HEADER_LABELS = [10, 20, 30, 40, 50, "00"];

// Cell key: "H:M" e.g. "6:0", "6:5", "6:10" ...
function cellKey(hour: number, slotIdx: number) {
  return `${hour}:${slotIdx * 5}`;
}

function parseCellKey(key: string): [number, number] {
  const [h, m] = key.split(":").map(Number);
  return [h, m];
}

// Compare two cell keys for ordering
function cellIndex(hour: number, minute: number) {
  return hour * 60 + minute;
}

interface TimeBlock {
  taskId: string;
  color: string;
}

// ── Task assign modal after drag ──
function TimeAssignModal({
  startTime,
  endTime,
  onAssign,
  onClose,
}: {
  startTime: string;
  endTime: string;
  onAssign: (taskId: string) => void;
  onClose: () => void;
}) {
  const { tasks, projects } = useProjectVM();
  const activeTasks = tasks.filter((t) => t.status !== "done");

  const fmtTime = (key: string) => {
    const [h, m] = parseCellKey(key);
    const dh = h >= 24 ? h - 24 : h;
    return `${String(dh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: 340, padding: 24, borderRadius: 16,
          background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }} className="text-text-primary">
          태스크 할당
        </h3>
        <p style={{ fontSize: 13, marginBottom: 16 }} className="text-text-secondary">
          {fmtTime(startTime)} ~ {fmtTime(endTime)}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
          {activeTasks.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13 }} className="text-text-secondary/50">할당할 태스크가 없습니다</div>
          ) : (
            activeTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              return (
                <button
                  key={task.id}
                  onClick={() => onAssign(task.id)}
                  style={{
                    padding: "10px 12px", borderRadius: 10, textAlign: "left",
                    border: "1px solid var(--color-border)", cursor: "pointer",
                    background: "var(--color-bg-primary)",
                  }}
                  className="hover:border-accent/50 transition-colors"
                >
                  <div style={{ fontSize: 14, fontWeight: 500 }} className="text-text-primary">{task.title}</div>
                  {project && (
                    <div style={{ fontSize: 11, marginTop: 2 }} className="text-text-secondary">
                      {project.icon} {project.name}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 12, width: "100%", padding: "8px 0", borderRadius: 10, fontSize: 13,
            border: "1px solid var(--color-border)", background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer",
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

function Timetable() {
  const now = useClock();
  const { tasks, projects } = useProjectVM();
  const sessions = useSessionVM((s) => s.sessions);
  const currentHour = now.getHours();
  const currentSlot = Math.floor(now.getMinutes() / 5);

  // Blocks from sessions: startedAt ~ now, 5분 내림
  const sessionBlocks = useMemo(() => {
    const result: Record<string, TimeBlock> = {};
    const todayStr = now.toISOString().slice(0, 10);

    for (const session of sessions) {
      const start = new Date(session.startedAt);
      // 오늘 세션만
      if (start.toISOString().slice(0, 10) !== todayStr) continue;

      const task = tasks.find((t) => t.id === session.taskId);
      const project = task ? projects.find((p) => p.id === task.projectId) : null;
      const color = project?.color ?? "var(--color-accent)";

      // 시작 시간을 5분 단위로 내림
      const startHour = start.getHours();
      const startMinute = Math.floor(start.getMinutes() / 5) * 5;

      // 끝: 현재 시간을 5분 단위로 내림
      const endHour = now.getHours();
      const endMinute = Math.floor(now.getMinutes() / 5) * 5;

      const startIdx = cellIndex(startHour, startMinute);
      const endIdx = cellIndex(endHour, endMinute);

      for (const h of HOURS) {
        const displayH = h >= 24 ? h - 24 : h;
        for (let s = 0; s < SLOTS_PER_HOUR; s++) {
          const ci = cellIndex(displayH, s * 5);
          if (ci >= startIdx && ci <= endIdx) {
            const key = cellKey(h, s);
            if (!result[key]) {
              result[key] = { taskId: session.taskId, color };
            }
          }
        }
      }
    }
    return result;
  }, [sessions, tasks, projects, now]);

  // Manual blocks (from drag) — persisted to DB
  const [manualBlocks, setManualBlocks] = useState<Record<string, TimeBlock>>({});

  // Load manual blocks from DB on mount (today's date)
  const todayDateStr = now.toISOString().slice(0, 10);
  const loadedDateRef = useRef<string>("");
  useEffect(() => {
    if (loadedDateRef.current === todayDateStr) return;
    loadedDateRef.current = todayDateStr;
    window.deskerAPI.db.getTimetableBlocks(todayDateStr).then((rows) => {
      const loaded: Record<string, TimeBlock> = {};
      for (const row of rows) {
        loaded[row.cell_key] = { taskId: row.task_id, color: row.color };
      }
      setManualBlocks(loaded);
    });
  }, [todayDateStr]);

  // Save manual blocks to DB helper
  const saveBlocksToDb = useCallback((blocks: Record<string, TimeBlock>) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const entries = Object.entries(blocks).map(([key, val]) => ({
      cell_key: key,
      task_id: val.taskId,
      color: val.color,
    }));
    window.deskerAPI.db.saveTimetableBlocks(dateStr, entries);
  }, []);

  // Persist session blocks to DB when a session is removed
  const prevSessionIdsRef = useRef<Set<string>>(new Set());
  const prevSessionBlocksRef = useRef<Record<string, TimeBlock>>({});

  useEffect(() => {
    const currentIds = new Set(sessions.map((s) => s.id));
    const prevIds = prevSessionIdsRef.current;

    // Detect removed sessions
    const removedIds = new Set<string>();
    for (const id of prevIds) {
      if (!currentIds.has(id)) removedIds.add(id);
    }

    // If sessions were removed, save their blocks into manualBlocks
    if (removedIds.size > 0) {
      const blocksToSave: Record<string, TimeBlock> = {};
      for (const [key, block] of Object.entries(prevSessionBlocksRef.current)) {
        if (removedIds.has(block.taskId) || !sessionBlocks[key]) {
          blocksToSave[key] = block;
        }
      }

      if (Object.keys(blocksToSave).length > 0) {
        setManualBlocks((prev) => {
          const next = { ...prev, ...blocksToSave };
          saveBlocksToDb(next);
          return next;
        });
      }
    }

    prevSessionIdsRef.current = currentIds;
    prevSessionBlocksRef.current = { ...sessionBlocks };
  }, [sessions, sessionBlocks, saveBlocksToDb]);

  // Merge: session blocks + manual blocks (manual takes priority)
  const blocks = useMemo(() => ({ ...sessionBlocks, ...manualBlocks }), [sessionBlocks, manualBlocks]);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ hour: number; slot: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ hour: number; slot: number } | null>(null);

  // Assign modal
  const [assignRange, setAssignRange] = useState<{ start: string; end: string } | null>(null);
  const pendingCells = useRef<string[]>([]);

  // Get cells in drag range
  const getDragCells = useCallback((start: { hour: number; slot: number }, end: { hour: number; slot: number }) => {
    const si = cellIndex(start.hour, start.slot * 5);
    const ei = cellIndex(end.hour, end.slot * 5);
    const lo = Math.min(si, ei);
    const hi = Math.max(si, ei);
    const cells: string[] = [];
    for (const h of HOURS) {
      for (let s = 0; s < SLOTS_PER_HOUR; s++) {
        const ci = cellIndex(h, s * 5);
        if (ci >= lo && ci <= hi) {
          cells.push(cellKey(h, s));
        }
      }
    }
    return cells;
  }, []);

  const isInDragRange = useCallback((hour: number, slot: number) => {
    if (!dragging || !dragStart.current || !dragCurrent) return false;
    const si = cellIndex(dragStart.current.hour, dragStart.current.slot * 5);
    const ei = cellIndex(dragCurrent.hour, dragCurrent.slot * 5);
    const ci = cellIndex(hour, slot * 5);
    return ci >= Math.min(si, ei) && ci <= Math.max(si, ei);
  }, [dragging, dragCurrent]);

  const handleMouseDown = (hour: number, slot: number) => {
    // If already has a manual block, remove it (session blocks can't be removed)
    const key = cellKey(hour, slot);
    if (manualBlocks[key]) {
      setManualBlocks((prev) => {
        const next = { ...prev };
        delete next[key];
        saveBlocksToDb(next);
        return next;
      });
      return;
    }
    // Don't start drag on session blocks
    if (sessionBlocks[key]) return;
    setDragging(true);
    dragStart.current = { hour, slot };
    setDragCurrent({ hour, slot });
  };

  const handleMouseEnter = (hour: number, slot: number) => {
    if (!dragging) return;
    setDragCurrent({ hour, slot });
  };

  const handleMouseUp = () => {
    if (!dragging || !dragStart.current || !dragCurrent) {
      setDragging(false);
      return;
    }
    const cells = getDragCells(dragStart.current, dragCurrent);
    pendingCells.current = cells;

    const startKey = cellKey(dragStart.current.hour, dragStart.current.slot);
    // End time: last cell + 5 minutes
    const endHour = dragCurrent.hour;
    const endMinute = dragCurrent.slot * 5 + 5;
    const adjHour = endMinute >= 60 ? endHour + 1 : endHour;
    const adjMinute = endMinute >= 60 ? endMinute - 60 : endMinute;
    const endKey = `${adjHour}:${adjMinute}`;

    setAssignRange({ start: startKey, end: endKey });
    setDragging(false);
    dragStart.current = null;
    setDragCurrent(null);
  };

  // Global mouseup in case mouse leaves the table
  useEffect(() => {
    const handler = () => {
      if (dragging) handleMouseUp();
    };
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  });

  const handleAssign = (taskId: string) => {
    const project = projects.find((p) => {
      const task = tasks.find((t) => t.id === taskId);
      return task && p.id === task.projectId;
    });
    const color = project?.color ?? "var(--color-accent)";
    setManualBlocks((prev) => {
      const next = { ...prev };
      for (const key of pendingCells.current) {
        next[key] = { taskId, color };
      }
      saveBlocksToDb(next);
      return next;
    });
    pendingCells.current = [];
    setAssignRange(null);
  };

  // Get task name for tooltip
  const getTaskName = (taskId: string) => tasks.find((t) => t.id === taskId)?.title ?? "";

  return (
    <div style={{ fontSize: 11, fontFamily: "Pretendard, sans-serif", userSelect: "none" }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }} className="text-text-secondary">
        TIME TABLE
      </div>
      <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
        {/* Header — 10분 단위 라벨 (6칸, 각 칸 = 2셀) */}
        <div style={{ display: "grid", gridTemplateColumns: "30px repeat(6, 1fr)", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{
            padding: "4px 0", textAlign: "center",
            borderRight: "1px solid var(--color-border)",
            background: "var(--color-bg-tertiary)",
          }} className="text-text-secondary" />
          {HEADER_LABELS.map((label, i) => (
            <div
              key={i}
              style={{
                padding: "4px 0", textAlign: "center",
                borderRight: i < 5 ? "1px solid rgba(46,46,66,0.08)" : "none",
                background: "var(--color-bg-tertiary)",
                fontSize: 9,
              }}
              className="text-text-secondary"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {HOURS.map((h, hIdx) => {
          const displayH = h >= 24 ? h - 24 : h;
          const isCurrentHour = displayH === currentHour;
          const isLast = hIdx === HOURS.length - 1;

          return (
            <div
              key={h}
              style={{
                display: "grid",
                gridTemplateColumns: "30px repeat(12, 1fr)",
                borderBottom: !isLast ? "1px solid var(--color-border)" : "none",
                background: isCurrentHour ? "var(--color-accent-alpha, rgba(116,185,255,0.04))" : "transparent",
              }}
            >
              <div
                style={{
                  padding: "5px 0",
                  textAlign: "center",
                  borderRight: "1px solid var(--color-border)",
                  fontWeight: isCurrentHour ? 700 : 400,
                  fontSize: 10,
                }}
                className={isCurrentHour ? "text-accent" : "text-text-secondary"}
              >
                {String(displayH).padStart(2, "0")}
              </div>
              {Array.from({ length: 12 }, (_, s) => {
                const key = cellKey(h, s);
                const block = blocks[key];
                const inDrag = isInDragRange(h, s);
                const isNow = isCurrentHour && s === currentSlot;

                return (
                  <div
                    key={s}
                    onMouseDown={() => handleMouseDown(h, s)}
                    onMouseEnter={() => handleMouseEnter(h, s)}
                    title={block ? getTaskName(block.taskId) : undefined}
                    style={{
                      padding: "5px 0",
                      borderRight: s < 11 ? (s % 2 === 1 ? "1px solid rgba(46,46,66,0.08)" : "none") : "none",
                      background: block
                        ? block.color
                        : inDrag
                          ? "var(--color-accent)"
                          : isNow
                            ? "var(--color-accent)"
                            : "transparent",
                      opacity: block ? 0.7 : inDrag ? 0.3 : isNow ? 0.5 : 1,
                      cursor: "pointer",
                      minHeight: 10,
                      transition: block ? "none" : "background 0.05s",
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {assignRange && (
        <TimeAssignModal
          startTime={assignRange.start}
          endTime={assignRange.end}
          onAssign={handleAssign}
          onClose={() => { setAssignRange(null); pendingCells.current = []; }}
        />
      )}
    </div>
  );
}

// ── Today's tasks ──
// ── Sortable Today Task Item ──
function SortableTodayItem({ task, onToggle, onOpen }: { task: Task; onToggle: (t: Task) => void; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", borderRadius: 6, cursor: "pointer" }}
      className="hover:bg-bg-hover/50 group"
      onClick={() => onOpen(task.id)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{
          cursor: "grab", display: "flex", alignItems: "center",
          color: "var(--color-text-secondary)", opacity: 0,
          transition: "opacity 0.15s", flexShrink: 0,
        }}
        className="group-hover:!opacity-40"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
          <circle cx="4" cy="6" r="1" /><circle cx="8" cy="6" r="1" />
          <circle cx="4" cy="9" r="1" /><circle cx="8" cy="9" r="1" />
        </svg>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task); }}
        style={{
          width: 18, height: 18, borderRadius: "50%",
          border: "2px solid", flexShrink: 0, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderColor: task.status === "done" ? "var(--color-success, #00b894)" : "var(--color-text-secondary)",
          background: task.status === "done" ? "rgba(0,184,148,0.2)" : "transparent",
          opacity: task.status === "done" ? 1 : 0.5,
          transition: "all 0.15s",
        }}
        className={task.status === "done" ? "" : "hover:!border-accent hover:!opacity-100"}
      >
        {task.status === "done" && (
          <span style={{ fontSize: 10, color: "var(--color-success, #00b894)", fontWeight: 700 }}>✓</span>
        )}
      </button>
      <span
        style={{
          flex: 1, fontSize: 13,
          textDecoration: task.status === "done" ? "line-through" : "none",
          opacity: task.status === "done" ? 0.5 : 1,
        }}
        className={task.status === "done" ? "text-text-secondary" : "text-text-primary"}
      >
        {task.title}
      </span>
    </div>
  );
}

function ProjectDropdown({
  projects,
  selectedId,
  onSelect,
}: {
  projects: { id: string; name: string; icon: string; color: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = projects.find((p) => p.id === selectedId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
          border: `1px solid ${open ? "var(--color-accent)" : "var(--color-border)"}`,
          background: "var(--color-bg-primary)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
        className="text-text-primary"
      >
        <span>{selected ? `${selected.icon} ${selected.name}` : "프로젝트 선택"}</span>
        <span style={{ fontSize: 10, opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </div>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
            borderRadius: 10, padding: 4, zIndex: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            maxHeight: 180, overflowY: "auto",
          }}
        >
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => { onSelect(p.id); setOpen(false); }}
              style={{
                padding: "7px 10px", borderRadius: 7, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                background: p.id === selectedId ? "var(--color-bg-tertiary, rgba(255,255,255,0.06))" : "transparent",
                transition: "background 0.12s",
              }}
              className="text-text-primary hover:bg-white/5"
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: p.color, flexShrink: 0,
              }} />
              <span>{p.icon} {p.name}</span>
              {p.id === selectedId && <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickTaskAddModal({ onClose }: { onClose: () => void }) {
  const { projects, addTask } = useProjectVM();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  const handleSubmit = () => {
    if (!title.trim() || !projectId) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    addTask({
      projectId,
      title: title.trim(),
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: todayStr,
      startDate: null,
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: "var(--color-bg-secondary)", borderRadius: 14,
          padding: 20, width: 320, border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }} className="text-text-primary">
          태스크 추가
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }} className="text-text-secondary">프로젝트</div>
          <ProjectDropdown
            projects={projects}
            selectedId={projectId}
            onSelect={setProjectId}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }} className="text-text-secondary">제목</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="태스크 이름 입력..."
            autoFocus
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
              border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
              border: "none", background: "var(--color-accent)", color: "#fff",
              cursor: "pointer", fontWeight: 600,
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

function TodayTasks({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const { tasks, updateTask, reorderTasks } = useProjectVM();
  const setPage = useAppVM((s) => s.setCurrentPage);
  const [showAddModal, setShowAddModal] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => {
    if (t.dueDate === todayStr) return true;
    if (t.status === "in_progress") return true;
    if (t.startDate && t.dueDate && t.startDate <= todayStr && t.dueDate >= todayStr) return true;
    if (t.status === "done" && t.dueDate === todayStr) return true;
    return false;
  });

  const toggleDone = (task: Task) => {
    const next = task.status === "done" ? "todo" : "done";
    updateTask(task.id, { status: next });
  };

  const todaySensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleTodayDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = todayTasks.findIndex((t) => t.id === active.id);
    const newIndex = todayTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(todayTasks, oldIndex, newIndex);
    const otherTasks = tasks.filter((t) => !todayTasks.some((tt) => tt.id === t.id));
    reorderTasks([...reordered, ...otherTasks]);
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }} className="text-text-secondary">
        TODAY
      </div>
      {todayTasks.length === 0 ? (
        <div style={{ padding: "12px 0", fontSize: 13 }} className="text-text-secondary/40">
          오늘 할 일이 없습니다
        </div>
      ) : (
        <DndContext sensors={todaySensors} collisionDetection={closestCenter} onDragEnd={handleTodayDragEnd}>
          <SortableContext items={todayTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {todayTasks.map((task) => (
                <SortableTodayItem key={task.id} task={task} onToggle={toggleDone} onOpen={onOpenDetail} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <button
        onClick={() => setShowAddModal(true)}
        style={{ fontSize: 12, marginTop: 6, padding: "4px 0", display: "block" }}
        className="text-text-secondary/40 hover:text-accent cursor-pointer transition-colors"
      >
        + 태스크 추가
      </button>
      {showAddModal && (
        <QuickTaskAddModal onClose={() => setShowAddModal(false)} />
      )}
      <button
        onClick={() => setPage("tasks")}
        style={{ fontSize: 12, marginTop: 4, padding: "4px 0", display: "block" }}
        className="text-text-secondary/40 hover:text-accent cursor-pointer transition-colors"
      >
        전체 태스크 보기 →
      </button>

    </div>
  );
}

// ── Project card button ──
function ProjectButton({ p, onClick }: { p: { id: string; icon: string; name: string; color: string }; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 14px", borderRadius: 10, minWidth: 72, flexShrink: 0,
        border: `1.5px solid ${p.color}40`,
        cursor: "pointer",
        background: `${p.color}15`,
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = `${p.color}25`; e.currentTarget.style.borderColor = `${p.color}70`; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = `${p.color}15`; e.currentTarget.style.borderColor = `${p.color}40`; }}
    >
      <span style={{ fontSize: 22 }}>{p.icon}</span>
      {p.name.split(" ").map((word, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2 }} className="text-text-secondary">
          {word}
        </span>
      ))}
    </button>
  );
}

// ── Project list (horizontal) with LIFE section ──
function ProjectStrip() {
  const { projects, selectProject, addProject } = useProjectVM();
  const setPage = useAppVM((s) => s.setCurrentPage);

  const handleClick = (projectId: string) => {
    selectProject(projectId);
    setPage("tasks");
  };

  const taskProjects = projects.filter((p) => p.type === "task");
  const lifeProjects = projects.filter((p) => p.type === "journal");

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
      {/* PROJECTS */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }} className="text-text-secondary">
          PROJECTS
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {taskProjects.map((p) => (
            <ProjectButton key={p.id} p={p} onClick={() => handleClick(p.id)} />
          ))}
          <button
            onClick={() => addProject({ name: "새 프로젝트", icon: "📁", color: "#6c5ce7", type: "task" })}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 14px", borderRadius: 10, minWidth: 72, flexShrink: 0,
              border: "1.5px dashed var(--color-border)",
              cursor: "pointer", background: "transparent",
              transition: "all 0.15s",
            }}
            className="hover:border-accent/50 hover:bg-accent/5"
          >
            <span style={{ fontSize: 20, lineHeight: 1 }} className="text-text-secondary/40">+</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, margin: "0 14px", alignSelf: "stretch" }} className="bg-border" />

      {/* LIFE */}
      <div style={{ flex: 0.5, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }} className="text-text-secondary">
          LIFE
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {lifeProjects.map((p) => (
            <ProjectButton key={p.id} p={p} onClick={() => handleClick(p.id)} />
          ))}
          <button
            onClick={() => addProject({ name: "새 기록", icon: "📔", color: "#fdcb6e", type: "journal" })}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 14px", borderRadius: 10, minWidth: 72, flexShrink: 0,
              border: "1.5px dashed var(--color-border)",
              cursor: "pointer", background: "transparent",
              transition: "all 0.15s",
            }}
            className="hover:border-accent/50 hover:bg-accent/5"
          >
            <span style={{ fontSize: 20, lineHeight: 1 }} className="text-text-secondary/40">+</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Right Panel: Total Work Time + Timetable ──
export function TimePanel() {
  const now = useClock();
  const sessions = useSessionVM((s) => s.sessions);
  const todayStr = now.toISOString().slice(0, 10);

  // 오늘 세션들의 누적 작업시간
  const totalMs = sessions.reduce((acc, s) => {
    const start = new Date(s.startedAt);
    if (start.toISOString().slice(0, 10) !== todayStr) return acc;
    return acc + (now.getTime() - start.getTime());
  }, 0);
  const totalMinutesAll = Math.floor(totalMs / 60000);
  const totalHours = Math.floor(totalMinutesAll / 60);
  const totalMinutes = totalMinutesAll % 60;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Total work time */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }} className="text-text-secondary">
          TOTAL WORK TIME
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700 }} className="text-text-primary">
            {totalHours}h {String(totalMinutes).padStart(2, "0")}m
          </span>
        </div>
        <div style={{ fontSize: 11, marginTop: 2 }} className="text-text-secondary/50">
          오늘 누적 작업시간
        </div>
      </div>

      <div style={{ height: 1 }} className="bg-border" />

      {/* Timetable */}
      <Timetable />
    </div>
  );
}

// ── Mini Calendar ──
function MiniCalendar() {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }} className="text-text-secondary">
          CALENDAR
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "none", background: "transparent", cursor: "pointer" }} className="text-text-secondary hover:bg-bg-hover">◀</button>
          <span style={{ fontSize: 11, padding: "2px 4px", fontWeight: 600 }} className="text-text-primary">{month + 1}월</span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "none", background: "transparent", cursor: "pointer" }} className="text-text-secondary hover:bg-bg-hover">▶</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ fontSize: 9, textAlign: "center", padding: "2px 0", fontWeight: 600 }}
            className={i === 0 ? "text-danger" : i === 6 ? "text-pixel-blue" : "text-text-secondary"}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((day, i) => {
          const isToday = isCurrentMonth && day === today;
          const colIdx = i % 7;
          return (
            <div
              key={i}
              style={{
                fontSize: 10, textAlign: "center", padding: "4px 0",
                borderRadius: isToday ? "50%" : 0,
                background: isToday ? "var(--color-accent)" : "transparent",
                color: isToday ? "#fff" : colIdx === 0 ? "var(--color-danger)" : colIdx === 6 ? "var(--color-pixel-blue)" : "var(--color-text-primary)",
                fontWeight: isToday ? 700 : 400,
              }}
            >
              {day ?? ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Habit Tracker ──
// Helper: get week dates (Mon~Sun) for current week
function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function HabitTracker() {
  const [habits, setHabits] = useState<{ id: string; name: string }[]>([]);
  const [logs, setLogs] = useState<Record<string, boolean>>({}); // key: "habitId:date"
  const [newHabit, setNewHabit] = useState("");
  const weekDates = useMemo(() => getWeekDates(), []);

  // Load habits and logs from DB on mount
  useEffect(() => {
    window.deskerAPI.db.getHabits().then((rows) => {
      setHabits(rows.map((r) => ({ id: r.id, name: r.name })));
    });
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    window.deskerAPI.db.getHabitLogs(weekStart, weekEnd).then((rows) => {
      const logMap: Record<string, boolean> = {};
      for (const row of rows) {
        if (row.done) logMap[`${row.habit_id}:${row.date}`] = true;
      }
      setLogs(logMap);
    });
  }, [weekDates]);

  const toggleDay = (habitId: string, dateStr: string) => {
    const key = `${habitId}:${dateStr}`;
    setLogs((prev) => ({ ...prev, [key]: !prev[key] }));
    window.deskerAPI.db.toggleHabitLog(habitId, dateStr);
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    window.deskerAPI.db.addHabit(newHabit.trim()).then((row) => {
      setHabits((prev) => [...prev, { id: row.id, name: row.name }]);
    });
    setNewHabit("");
  };

  const removeHabit = (id: string) => {
    window.deskerAPI.db.removeHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }} className="text-text-secondary">
        HABIT
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        <div />
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ fontSize: 9, textAlign: "center", fontWeight: 600 }} className="text-text-secondary">{d}</div>
        ))}
      </div>

      {/* Habits */}
      {habits.map((habit) => (
        <div key={habit.id} style={{ display: "grid", gridTemplateColumns: "auto repeat(7, 1fr)", gap: 2, marginBottom: 4, alignItems: "center" }} className="group">
          <div style={{ fontSize: 11, paddingRight: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span className="text-text-primary" style={{ maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{habit.name}</span>
            <button
              onClick={() => removeHabit(habit.id)}
              style={{ fontSize: 9, border: "none", background: "transparent", cursor: "pointer", opacity: 0, transition: "opacity 0.15s", color: "var(--color-text-secondary)" }}
              className="group-hover:!opacity-60"
            >✕</button>
          </div>
          {weekDates.map((dateStr, dIdx) => {
            const done = logs[`${habit.id}:${dateStr}`] ?? false;
            return (
              <button
                key={dIdx}
                onClick={() => toggleDay(habit.id, dateStr)}
                style={{
                  width: 16, height: 16, borderRadius: 4, margin: "0 auto",
                  border: done ? "none" : "1.5px solid var(--color-border)",
                  background: done ? "var(--color-accent)" : "transparent",
                  cursor: "pointer", transition: "all 0.1s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {done && <span style={{ fontSize: 8, color: "#fff", fontWeight: 700 }}>✓</span>}
              </button>
            );
          })}
        </div>
      ))}

      {/* Add habit */}
      <input
        value={newHabit}
        onChange={(e) => setNewHabit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHabit(); } }}
        placeholder="+ 습관 추가"
        style={{
          width: "100%", fontSize: 11, padding: "4px 0", marginTop: 4,
          border: "none", borderBottom: "1px dashed var(--color-border)",
          background: "transparent", color: "var(--color-text-primary)",
          outline: "none", fontFamily: "Pretendard, sans-serif",
        }}
      />
    </div>
  );
}

// ── Widget card wrapper ──
const cardStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  background: "var(--color-bg-secondary)",
  border: "1px solid var(--color-border)",
  opacity: 0.95,
};

// ── Greeting ──
function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 9) return "좋은 아침이에요";
  if (hour >= 9 && hour < 12) return "오전도 화이팅";
  if (hour >= 12 && hour < 14) return "점심 맛있게 드세요";
  if (hour >= 14 && hour < 18) return "좋은 오후에요";
  if (hour >= 18 && hour < 21) return "좋은 저녁이에요";
  if (hour >= 21 || hour < 2) return "좋은 밤이에요";
  return "좋은 새벽이에요";
}

// ── Shortcuts ──
interface Shortcut {
  id: string;
  name: string;
  url: string;
}

function getFaviconUrl(url: string) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}

function useShortcuts() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  // Load from DB on mount + migrate localStorage data
  useEffect(() => {
    window.deskerAPI.db.getShortcuts().then(async (rows) => {
      if (rows.length === 0) {
        // Migrate from localStorage if DB is empty
        try {
          const stored = JSON.parse(localStorage.getItem("desker-shortcuts") ?? "[]") as Shortcut[];
          if (stored.length > 0) {
            for (const sc of stored) {
              await window.deskerAPI.db.addShortcut(sc.name, sc.url);
            }
            const migrated = await window.deskerAPI.db.getShortcuts();
            setShortcuts(migrated.map((r) => ({ id: r.id, name: r.name, url: r.url })));
            localStorage.removeItem("desker-shortcuts");
            return;
          }
        } catch { /* ignore parse errors */ }
      }
      setShortcuts(rows.map((r) => ({ id: r.id, name: r.name, url: r.url })));
    });
  }, []);

  const add = useCallback((name: string, url: string) => {
    window.deskerAPI.db.addShortcut(name, url).then((row) => {
      setShortcuts((prev) => [...prev, { id: row.id, name: row.name, url: row.url }]);
    });
  }, []);

  const remove = useCallback((id: string) => {
    window.deskerAPI.db.removeShortcut(id);
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const reorder = useCallback((oldIndex: number, newIndex: number) => {
    setShortcuts((prev) => {
      const next = arrayMove(prev, oldIndex, newIndex);
      window.deskerAPI.db.reorderShortcuts(next.map((s) => s.id));
      return next;
    });
  }, []);

  return { shortcuts, add, remove, reorder };
}

function ShortcutAddModal({ onAdd, onClose }: { onAdd: (name: string, url: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !url.trim()) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//.test(finalUrl)) finalUrl = "https://" + finalUrl;
    onAdd(name.trim(), finalUrl);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", background: "var(--color-bg-secondary)", borderRadius: 14,
          padding: 20, width: 300, border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }} className="text-text-primary">
          바로가기 추가
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 (예: Github)"
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
            border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)", marginBottom: 8, outline: "none",
            boxSizing: "border-box",
          }}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL (예: https://github.com)"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
            border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
            color: "var(--color-text-primary)", marginBottom: 14, outline: "none",
            boxSizing: "border-box",
          }}
        />
        {url && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <img
              src={getFaviconUrl(url)}
              alt=""
              style={{ width: 24, height: 24, borderRadius: 4 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span style={{ fontSize: 12 }} className="text-text-secondary">미리보기</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
              border: "1px solid var(--color-border)", background: "transparent",
              color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
              border: "none", background: "var(--color-accent)", color: "#fff",
              cursor: "pointer", fontWeight: 600,
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Shortcut Item ──
function SortableShortcutItem({
  sc,
  onContextMenu,
}: {
  sc: Shortcut;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sc.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    cursor: "grab", position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => window.deskerAPI.window.openExternal(sc.url)}
      onContextMenu={onContextMenu}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "var(--color-bg-tertiary)", display: "flex",
        alignItems: "center", justifyContent: "center",
        border: "1px solid var(--color-border)",
        transition: "transform 0.15s",
      }}
        className="hover:!scale-110"
      >
        <img
          src={getFaviconUrl(sc.url)}
          alt=""
          style={{ width: 20, height: 20, pointerEvents: "none" }}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            el.parentElement!.textContent = sc.name[0];
          }}
        />
      </div>
      <span style={{ fontSize: 10, maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }} className="text-text-secondary">
        {sc.name}
      </span>
    </div>
  );
}

// ── Main Dashboard ──
export default function HomeDashboard() {
  const now = useClock();
  const nickname = useSettingsStore((s) => s.nickname);
  const greeting = getGreeting(now.getHours());
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const { shortcuts, add: addShortcut, remove: removeShortcut, reorder: reorderShortcut } = useShortcuts();
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const shortcutSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [draggingShortcut, setDraggingShortcut] = useState<Shortcut | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Date + Greeting + Time + Shortcuts */}
      <div>
        <div style={{ fontSize: 13, marginBottom: 4 }} className="text-text-secondary">
          {formatDate(now)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className="text-text-primary">
              {nickname ? `안녕하세요, ${nickname}님! ${greeting} ~` : `안녕하세요! ${greeting} ~`}
            </span>
            <span className="text-text-secondary">
              {formatTime(now)}
            </span>
          </div>

          {/* Shortcuts */}
          <DndContext
            sensors={shortcutSensors}
            collisionDetection={closestCenter}
            onDragStart={(event: DragStartEvent) => {
              setDraggingShortcut(shortcuts.find((s) => s.id === event.active.id) ?? null);
            }}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                const oldIndex = shortcuts.findIndex((s) => s.id === active.id);
                const newIndex = shortcuts.findIndex((s) => s.id === over.id);
                if (oldIndex !== -1 && newIndex !== -1) reorderShortcut(oldIndex, newIndex);
              }
              setDraggingShortcut(null);
            }}
          >
          <SortableContext items={shortcuts.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {shortcuts.map((sc) => (
              <SortableShortcutItem
                key={sc.id}
                sc={sc}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: sc.id, x: e.clientX, y: e.clientY });
                }}
              />
            ))}

            {/* Add shortcut button */}
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
              onClick={() => setShowShortcutModal(true)}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "transparent", display: "flex",
                alignItems: "center", justifyContent: "center",
                border: "1.5px dashed var(--color-border)",
                transition: "border-color 0.15s",
              }}
                className="hover:!border-accent"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary">
                  <line x1="8" y1="3" x2="8" y2="13" />
                  <line x1="3" y1="8" x2="13" y2="8" />
                </svg>
              </div>
              <span style={{ fontSize: 10 }} className="text-text-secondary">추가</span>
            </div>
          </div>
          </SortableContext>
          <DragOverlay>
            {draggingShortcut && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "grabbing", opacity: 0.9 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--color-bg-tertiary)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--color-accent)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}>
                  <img
                    src={getFaviconUrl(draggingShortcut.url)}
                    alt=""
                    style={{ width: 20, height: 20, pointerEvents: "none" }}
                  />
                </div>
                <span style={{ fontSize: 10 }} className="text-text-secondary">
                  {draggingShortcut.name}
                </span>
              </div>
            )}
          </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Context menu for shortcut delete */}
      {contextMenu && (
        <div
          style={{
            position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 400,
            background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
            borderRadius: 8, padding: 4, minWidth: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { removeShortcut(contextMenu.id); setContextMenu(null); }}
            style={{
              display: "block", width: "100%", padding: "6px 12px", borderRadius: 6,
              border: "none", background: "transparent", color: "var(--color-error, #e74c3c)",
              fontSize: 12, cursor: "pointer", textAlign: "left",
            }}
            className="hover:bg-bg-hover"
          >
            삭제
          </button>
        </div>
      )}

      {showShortcutModal && (
        <ShortcutAddModal
          onAdd={addShortcut}
          onClose={() => setShowShortcutModal(false)}
        />
      )}

      {/* Projects */}
      <div style={cardStyle}>
        <ProjectStrip />
      </div>

      {/* Today + Calendar + Habit */}
      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        {/* TODAY - 2 */}
        <div style={{ ...cardStyle, flex: 2, minWidth: 0, overflowY: "auto" }}>
          <TodayTasks onOpenDetail={setDetailTaskId} />
        </div>

        {/* CALENDAR - 1 */}
        <div style={{ ...cardStyle, flex: 1, minWidth: 0, overflowY: "auto" }}>
          <MiniCalendar />
        </div>

        {/* HABIT - 1 */}
        <div style={{ ...cardStyle, flex: 1, minWidth: 0, overflowY: "auto" }}>
          <HabitTracker />
        </div>
      </div>

      {/* Modal — rendered at top level, above all widgets */}
      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
    </div>
  );
}
