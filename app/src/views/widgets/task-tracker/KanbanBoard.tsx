import { useState, useRef, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { useAppVM } from "../../../viewmodels/app.vm";
import type { Task, TaskStatus, TaskPriority } from "../../../types/models";
import type { TerminalMode, AiModel } from "../../../viewmodels/session.vm";
import StartSessionModal from "../../shared/StartSessionModal";

const COLUMNS: { status: TaskStatus; label: string; color: string; dotColor: string }[] = [
  { status: "todo", label: "시작 전", color: "text-text-secondary", dotColor: "bg-text-secondary" },
  { status: "in_progress", label: "진행 중", color: "text-pixel-blue", dotColor: "bg-pixel-blue" },
  { status: "done", label: "완료", color: "text-success", dotColor: "bg-success" },
];

const PRI: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };

const editInputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
  color: "var(--color-text-primary)", fontSize: 14, fontFamily: "Pretendard, sans-serif",
  width: "100%", outline: "none",
};
const editLabelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 3, display: "block",
};

// ── Edit Form ──
function KanbanEditForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { projects, updateTask } = useProjectVM();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [projectId, setProjectId] = useState(task.projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateTask(task.id, { projectId, title: title.trim(), description: description.trim(), priority, dueDate: dueDate || null });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 12, borderRadius: 10, border: "1px solid var(--color-accent)", background: "var(--color-bg-secondary)", marginBottom: 6 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div><label style={editLabelStyle}>제목 *</label><input style={editInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
        <div><label style={editLabelStyle}>설명</label><input style={editInputStyle} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><label style={editLabelStyle}>우선순위</label><select style={editInputStyle} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}><option value="high">🔴 높음</option><option value="medium">🟡 보통</option><option value="low">🟢 낮음</option></select></div>
          <div style={{ flex: 1 }}><label style={editLabelStyle}>마감일</label><input style={editInputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <div><label style={editLabelStyle}>프로젝트</label><select style={editInputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select></div>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)" }}>취소</button>
          <button type="submit" style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: "none", background: "var(--color-accent)", color: "#fff", fontWeight: 600, opacity: title.trim() ? 1 : 0.5 }} disabled={!title.trim()}>저장</button>
        </div>
      </div>
    </form>
  );
}

// ── Sortable Task Card ──
function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardContent task={task} />
    </div>
  );
}

// ── Card Content (shared between sortable + overlay) ──
function TaskCardContent({ task }: { task: Task }) {
  const { projects, removeTask } = useProjectVM();
  const createSession = useSessionVM((s) => s.createSession);
  const setPage = useAppVM((s) => s.setCurrentPage);
  const project = projects.find((p) => p.id === task.projectId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleStart = (mode: TerminalMode, aiModel?: AiModel) => {
    createSession({ taskId: task.id, taskTitle: task.title, projectName: project?.name ?? "프로젝트", projectIcon: project?.icon ?? "📁", mode, aiModel });
    setPage("terminal");
    setShowStartModal(false);
  };

  if (editing) return <KanbanEditForm task={task} onClose={() => setEditing(false)} />;

  return (
    <div
      style={{ padding: "14px 16px", borderRadius: 10, marginBottom: 6, cursor: "grab", position: "relative" }}
      className="bg-bg-secondary border border-border hover:border-accent/30 transition-colors group"
    >
      {/* Menu */}
      <div ref={menuRef} style={{ position: "absolute", top: 8, right: 8 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ width: 24, height: 24, borderRadius: 4, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }}
          className="group-hover:!opacity-100 hover:!bg-[var(--color-bg-hover)]"
        >...</button>
        {menuOpen && (
          <div style={{ position: "absolute", top: 28, right: 0, zIndex: 50, minWidth: 110, padding: 4, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setEditing(true); }} style={{ width: "100%", padding: "7px 12px", fontSize: 13, borderRadius: 6, border: "none", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>편집</button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeTask(task.id); setMenuOpen(false); }} style={{ width: "100%", padding: "7px 12px", fontSize: 13, borderRadius: 6, border: "none", background: "transparent", color: "var(--color-danger, #e17055)", cursor: "pointer", textAlign: "left" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>삭제</button>
          </div>
        )}
      </div>

      <div style={{ fontSize: 14, fontWeight: 500, paddingRight: 24 }} className="text-text-primary">{task.title}</div>
      {task.description && <div style={{ fontSize: 12, marginTop: 4 }} className="text-text-secondary truncate">{task.description}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        {project && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4 }} className="bg-bg-tertiary/60 text-text-secondary">{project.icon} {project.name}</span>}
        <span style={{ fontSize: 12 }}>{PRI[task.priority]}</span>
        {task.dueDate && <span style={{ fontSize: 11, marginLeft: "auto" }} className="text-text-secondary">{task.dueDate.slice(5)}</span>}
      </div>
      <button
        onClick={() => setShowStartModal(true)}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ fontSize: 12, marginTop: 8, padding: "4px 10px", borderRadius: 6 }}
        className="text-accent bg-accent/10 hover:bg-accent/20 cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
      >▶ 시작</button>

      {showStartModal && <StartSessionModal taskTitle={task.title} onStart={handleStart} onClose={() => setShowStartModal(false)} />}
    </div>
  );
}

// ── Quick Add ──
function QuickAddTask({ status }: { status: TaskStatus }) {
  const { addTask, selectedProjectId, projects } = useProjectVM();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const projectId = selectedProjectId || projects[0]?.id || "p1";
    addTask({ projectId, title: title.trim(), description: "", status, priority: "medium" as TaskPriority, dueDate: null });
    setTitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }} style={{ padding: "8px 12px", fontSize: 13, borderRadius: 8, marginTop: 4, textAlign: "left", width: "100%" }} className="text-text-secondary/40 hover:text-accent hover:bg-bg-hover/50 transition-colors cursor-pointer">
        + 새 태스크
      </button>
    );
  }

  return (
    <div style={{ padding: 10, borderRadius: 10, marginTop: 4, border: "1px solid var(--color-border)" }} className="bg-bg-secondary">
      <input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setOpen(false); setTitle(""); } }} placeholder="태스크 이름 입력..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 14, outline: "none", border: "1px solid var(--color-border)", background: "var(--color-bg-primary)", color: "var(--color-text-primary)", fontFamily: "Pretendard, sans-serif" }} />
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={() => { setOpen(false); setTitle(""); }} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)" }}>취소</button>
        <button onClick={handleSubmit} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", border: "none", background: "var(--color-accent)", color: "#fff", fontWeight: 600, opacity: title.trim() ? 1 : 0.5 }} disabled={!title.trim()}>추가</button>
      </div>
    </div>
  );
}

// ── Column droppable ──
function KanbanColumn({ status, label, color, dotColor, tasks: colTasks, isOver }: {
  status: TaskStatus; label: string; color: string; dotColor: string; tasks: Task[]; isOver: boolean;
}) {
  const taskIds = useMemo(() => colTasks.map((t) => t.id), [colTasks]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%" }} className={dotColor} />
        <span style={{ fontSize: 14, fontWeight: 600 }} className={color}>{label}</span>
        <span style={{ fontSize: 13 }} className="text-text-secondary">{colTasks.length}</span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          style={{
            flex: 1, overflowY: "auto", padding: 4, borderRadius: 10, minHeight: 60,
            border: isOver ? "2px dashed var(--color-accent)" : "2px dashed transparent",
            transition: "border-color 0.15s",
          }}
          className={isOver ? "bg-accent/5" : ""}
        >
          {colTasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
          {colTasks.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 13, borderRadius: 10 }} className="text-text-secondary/30">
              {isOver ? "여기에 드롭" : "태스크 없음"}
            </div>
          )}
        </div>
      </SortableContext>

      <QuickAddTask status={status} />
    </div>
  );
}

// ── Main Kanban Board ──
export default function KanbanBoard() {
  const { tasks, updateTaskStatus, reorderTasks, selectedProjectId } = useProjectVM();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  const tasksByCol = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of filteredTasks) map[t.status].push(t);
    return map;
  }, [filteredTasks]);

  // Find which column a task id belongs to
  const findColumn = (id: string): TaskStatus | null => {
    for (const col of COLUMNS) {
      if (tasksByCol[col.status].some((t) => t.id === id)) return col.status;
    }
    // id might be a column status itself (droppable area)
    if (COLUMNS.some((c) => c.status === id)) return id as TaskStatus;
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = filteredTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverCol(null); return; }

    const overColumn = findColumn(over.id as string);
    setOverCol(overColumn);

    if (!activeTask || !overColumn) return;

    // If dragged to a different column, update status immediately for visual feedback
    if (activeTask.status !== overColumn) {
      const updatedTask = { ...activeTask, status: overColumn };
      setActiveTask(updatedTask);

      const newTasks = tasks.map((t) => t.id === activeTask.id ? { ...t, status: overColumn } : t);

      // Reorder: insert at the position of the over item
      const overIndex = newTasks.filter((t) => t.status === overColumn).findIndex((t) => t.id === (over.id as string));
      if (overIndex >= 0) {
        // Remove from current position and insert at overIndex
        const withoutActive = newTasks.filter((t) => t.id !== activeTask.id);
        const colItems = withoutActive.filter((t) => t.status === overColumn);
        const others = withoutActive.filter((t) => t.status !== overColumn);
        colItems.splice(overIndex, 0, updatedTask);
        reorderTasks([...others, ...colItems]);
      } else {
        reorderTasks(newTasks);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverCol(null);

    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);

    if (!activeCol || !overCol) return;

    // Same column reorder
    if (activeCol === overCol && active.id !== over.id) {
      const colItems = tasks.filter((t) => t.status === activeCol);
      const oldIndex = colItems.findIndex((t) => t.id === active.id);
      const newIndex = colItems.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(colItems, oldIndex, newIndex);
        const others = tasks.filter((t) => t.status !== activeCol);
        reorderTasks([...others, ...reordered]);
      }
    }

    // Cross-column: persist the status change to DB
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      const finalCol = findColumn(active.id as string);
      if (finalCol && finalCol !== activeCol) {
        // Already visually moved in handleDragOver, now persist
      }
      // Always persist current status
      const currentTask = tasks.find((t) => t.id === active.id);
      if (currentTask && currentTask.status !== activeCol) {
        updateTaskStatus(currentTask.id, currentTask.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: "flex", gap: 12, height: "100%", padding: "16px 20px" }}>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            dotColor={col.dotColor}
            tasks={tasksByCol[col.status]}
            isOver={overCol === col.status}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div style={{ opacity: 0.85, transform: "rotate(3deg)" }}>
            <TaskCardContent task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
