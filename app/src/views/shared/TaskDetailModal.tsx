import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProjectVM } from "../../viewmodels/project.vm";
import { useSessionVM } from "../../viewmodels/session.vm";
import { useAppVM } from "../../viewmodels/app.vm";
import type { Task, TaskStatus, TaskPriority, TodoItem } from "../../types/models";
import type { TerminalMode, AiModel, AgentRole, AgentEnvironment } from "../../viewmodels/session.vm";
import StartSessionModal from "./StartSessionModal";

function toTodoItem(row: Record<string, unknown>): TodoItem {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    text: row.text as string,
    done: !!(row.done as number),
    sortOrder: row.sort_order as number,
  };
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; bg: string }[] = [
  { value: "todo", label: "할 일", color: "#9090a8", bg: "rgba(144,144,168,0.15)" },
  { value: "in_progress", label: "진행 중", color: "#74b9ff", bg: "rgba(116,185,255,0.15)" },
  { value: "done", label: "완료", color: "#00b894", bg: "rgba(0,184,148,0.15)" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; emoji: string }[] = [
  { value: "high", label: "높음", emoji: "🔴" },
  { value: "medium", label: "보통", emoji: "🟡" },
  { value: "low", label: "낮음", emoji: "🟢" },
];

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  fontSize: 14,
  fontFamily: "Pretendard, sans-serif",
  width: "100%",
  outline: "none",
};

// ── Sortable Todo Item ──
function SortableTodoItem({ todo, onToggle, onRemove }: { todo: TodoItem; onToggle: (t: TodoItem) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 8px", borderRadius: 8,
      }}
      className="hover:bg-bg-hover/50 group"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab", display: "flex", alignItems: "center",
          color: "var(--color-text-secondary)", opacity: 0,
          transition: "opacity 0.15s", flexShrink: 0,
        }}
        className="group-hover:!opacity-40"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
          <circle cx="4" cy="6" r="1" /><circle cx="8" cy="6" r="1" />
          <circle cx="4" cy="9" r="1" /><circle cx="8" cy="9" r="1" />
        </svg>
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        style={{
          width: 20, height: 20, borderRadius: "50%",
          border: "2px solid", flexShrink: 0, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
          borderColor: todo.done ? "var(--color-success, #00b894)" : "var(--color-text-secondary)",
          background: todo.done ? "rgba(0,184,148,0.2)" : "transparent",
          opacity: todo.done ? 1 : 0.5,
        }}
        className={todo.done ? "" : "hover:!border-accent hover:!opacity-100"}
      >
        {todo.done && (
          <span style={{ fontSize: 11, color: "var(--color-success, #00b894)", fontWeight: 700, lineHeight: 1 }}>✓</span>
        )}
      </button>

      {/* Text */}
      <span
        style={{
          flex: 1, fontSize: 14,
          textDecoration: todo.done ? "line-through" : "none",
          color: todo.done ? "var(--color-text-secondary)" : "var(--color-text-primary)",
          opacity: todo.done ? 0.6 : 1,
        }}
      >
        {todo.text}
      </span>

      {/* Delete */}
      <button
        onClick={() => onRemove(todo.id)}
        style={{
          width: 22, height: 22, borderRadius: 4,
          border: "none", background: "transparent",
          color: "var(--color-text-secondary)", fontSize: 13,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0, transition: "opacity 0.15s",
        }}
        className="group-hover:!opacity-70 hover:!opacity-100 hover:!text-[var(--color-danger,#e17055)]"
      >
        ✕
      </button>
    </div>
  );
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const { tasks, projects, updateTask, removeTask } = useProjectVM();
  const createSession = useSessionVM((s) => s.createSession);
  const setPage = useAppVM((s) => s.setCurrentPage);

  const task = tasks.find((t) => t.id === taskId);
  const project = task ? projects.find((p) => p.id === task.projectId) : null;

  // Local editable state (only saved on "저장" click)
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");

  // Todos (saved immediately — separate from task fields)
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const newTodoRef = useRef<HTMLInputElement>(null);

  const [showStartModal, setShowStartModal] = useState(false);

  // Initialize when modal opens
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setStartDate(task.startDate ?? "");
    setDueDate(task.dueDate ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Load todos
  const loadTodos = useCallback(async () => {
    const rows = await window.deskerAPI.db.getTaskTodos(taskId);
    setTodos(rows.map((r) => toTodoItem(r as unknown as Record<string, unknown>)));
  }, [taskId]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!task) return null;

  // ── Dirty check ──
  const isDirty =
    title.trim() !== task.title ||
    description.trim() !== task.description ||
    status !== task.status ||
    priority !== task.priority ||
    (startDate || null) !== (task.startDate || null) ||
    (dueDate || null) !== (task.dueDate || null);

  // ── Save all changes ──
  const handleSave = async () => {
    if (!isDirty || !title.trim()) return;
    await updateTask(taskId, {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
    });
    onClose();
  };

  // ── Todo CRUD (immediate) ──
  const addingRef = useRef(false);
  const addTodo = async () => {
    if (!newTodoText.trim() || addingRef.current) return;
    addingRef.current = true;
    await window.deskerAPI.db.addTaskTodo({ task_id: taskId, text: newTodoText.trim() });
    setNewTodoText("");
    await loadTodos();
    addingRef.current = false;
    requestAnimationFrame(() => newTodoRef.current?.focus());
  };

  const toggleTodo = async (todo: TodoItem) => {
    await window.deskerAPI.db.updateTaskTodo(todo.id, { done: todo.done ? 0 : 1 });
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
  };

  const removeTodo = async (id: string) => {
    await window.deskerAPI.db.removeTaskTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const todoDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleTodoDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = todos.findIndex((t) => t.id === active.id);
    const newIndex = todos.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(todos, oldIndex, newIndex);
    setTodos(reordered);
    // Persist sort_order
    for (let i = 0; i < reordered.length; i++) {
      await window.deskerAPI.db.updateTaskTodo(reordered[i].id, { sort_order: i });
    }
  };

  const handleDelete = () => {
    removeTask(taskId);
    onClose();
  };

  const handleStart = (mode: TerminalMode, aiModel?: AiModel, agentRole?: AgentRole, agentEnv?: AgentEnvironment) => {
    if (task.status === "todo") {
      updateTask(taskId, { status: "in_progress" });
    }
    createSession({
      taskId: task.id,
      taskTitle: task.title,
      projectName: project?.name ?? "프로젝트",
      projectIcon: project?.icon ?? "📁",
      mode,
      aiModel,
      agentRole,
      agentEnv,
    });
    setPage("terminal");
    setShowStartModal(false);
    onClose();
  };

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />

      {/* Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 28,
          borderRadius: 16,
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 28, height: 28, borderRadius: 6,
            border: "none", background: "transparent",
            color: "var(--color-text-secondary)", fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          className="hover:bg-bg-hover"
        >
          ✕
        </button>

        {/* Header: Project badge + Title */}
        {project && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 6,
                background: project.color + "20", color: project.color,
                fontWeight: 500,
              }}
            >
              {project.icon} {project.name}
            </span>
          </div>
        )}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          style={{
            fontSize: 20, fontWeight: 700, width: "100%", paddingRight: 32,
            border: "none", background: "transparent", outline: "none",
            color: "var(--color-text-primary)", fontFamily: "Pretendard, sans-serif",
          }}
        />

        {/* Meta: Status + Priority */}
        <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          {/* Status buttons */}
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500 }}>상태</div>
            <div style={{ display: "flex", gap: 4 }}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 13,
                    border: status === opt.value ? `1.5px solid ${opt.color}` : "1px solid var(--color-border)",
                    background: status === opt.value ? opt.bg : "transparent",
                    color: status === opt.value ? opt.color : "var(--color-text-secondary)",
                    cursor: "pointer", fontWeight: status === opt.value ? 600 : 400,
                    fontFamily: "Pretendard, sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority buttons */}
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500 }}>우선순위</div>
            <div style={{ display: "flex", gap: 4 }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 13,
                    border: priority === opt.value ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: priority === opt.value ? "var(--color-accent-alpha, rgba(116,185,255,0.1))" : "transparent",
                    color: priority === opt.value ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer", fontWeight: priority === opt.value ? 600 : 400,
                    fontFamily: "Pretendard, sans-serif",
                  }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date range */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500 }}>기간</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>~</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500 }}>메모</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="메모를 입력하세요..."
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: 60,
            }}
          />
        </div>

        {/* TODO list */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>하위 TODO</span>
            {todos.length > 0 && (
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                {doneCount}/{todos.length}
              </span>
            )}
            {todos.length > 0 && (
              <div style={{
                flex: 1, height: 4, borderRadius: 2, background: "var(--color-border)",
                maxWidth: 120, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: "var(--color-accent)",
                  width: `${(doneCount / todos.length) * 100}%`,
                  transition: "width 0.2s",
                }} />
              </div>
            )}
          </div>

          {/* Todo items (draggable) */}
          <DndContext sensors={todoDndSensors} collisionDetection={closestCenter} onDragEnd={handleTodoDragEnd}>
            <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {todos.map((todo) => (
                  <SortableTodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onRemove={removeTodo} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add todo input */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "6px 8px" }}>
            {/* Empty circle indicator */}
            <div
              style={{
                width: 20, height: 20, borderRadius: "50%",
                border: "2px dashed var(--color-text-secondary)",
                flexShrink: 0, opacity: 0.3,
              }}
            />
            <input
              ref={newTodoRef}
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTodo(); } }}
              placeholder="항목 추가 (Enter)"
              style={{
                flex: 1, fontSize: 14,
                padding: "5px 0",
                border: "none",
                borderBottom: "1px dashed var(--color-border)",
                background: "transparent",
                color: "var(--color-text-primary)",
                outline: "none",
                fontFamily: "Pretendard, sans-serif",
              }}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "space-between" }}>
          <button
            onClick={() => setShowStartModal(true)}
            style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 13,
              border: "none", background: "var(--color-accent)", color: "#fff",
              cursor: "pointer", fontWeight: 600, fontFamily: "Pretendard, sans-serif",
            }}
          >
            ▶ 세션 시작
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDelete}
              style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13,
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-danger, #e17055)", cursor: "pointer",
                fontFamily: "Pretendard, sans-serif",
              }}
              className="hover:bg-bg-hover"
            >
              삭제
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || !title.trim()}
              style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13,
                border: "none",
                background: isDirty && title.trim() ? "var(--color-accent)" : "var(--color-border)",
                color: isDirty && title.trim() ? "#fff" : "var(--color-text-secondary)",
                cursor: isDirty && title.trim() ? "pointer" : "default",
                fontWeight: 600, fontFamily: "Pretendard, sans-serif",
                opacity: isDirty && title.trim() ? 1 : 0.6,
                transition: "all 0.15s",
              }}
            >
              저장
            </button>
          </div>
        </div>
      </div>

      {showStartModal && (
        <StartSessionModal
          taskTitle={task.title}
          onStart={handleStart}
          onClose={() => setShowStartModal(false)}
        />
      )}
    </div>
  );
}
