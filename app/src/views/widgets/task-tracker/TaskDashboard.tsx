import { useState, useRef, useEffect } from "react";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { useAppVM } from "../../../viewmodels/app.vm";
import type { Task, TaskStatus, TaskPriority } from "../../../types/models";
import type { TerminalMode, AiModel } from "../../../viewmodels/session.vm";
import KanbanBoard from "./KanbanBoard";
import CalendarView from "./CalendarView";
import StartSessionModal from "../../shared/StartSessionModal";

const STATUS: Record<TaskStatus, { label: string; dot: string; text: string }> = {
  todo: { label: "할 일", dot: "bg-text-secondary", text: "text-text-secondary" },
  in_progress: { label: "진행 중", dot: "bg-pixel-blue", text: "text-pixel-blue" },
  done: { label: "완료", dot: "bg-success", text: "text-success" },
};

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-secondary)",
  color: "var(--color-text-primary)",
  fontSize: 15,
  fontFamily: "Pretendard, sans-serif",
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  marginBottom: 4,
  display: "block",
};

function TaskAddForm({ onClose }: { onClose: () => void }) {
  const { projects, addTask, selectedProjectId } = useProjectVM();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(selectedProjectId ?? projects[0]?.id ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    addTask({
      projectId,
      title: title.trim(),
      description: description.trim(),
      status: "todo",
      priority,
      dueDate: dueDate || null,
    });
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 16,
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>제목 *</label>
          <input
            style={inputStyle}
            placeholder="태스크 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label style={labelStyle}>설명</label>
          <input
            style={inputStyle}
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>우선순위</label>
            <select
              style={inputStyle}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="high">🔴 높음</option>
              <option value="medium">🟡 보통</option>
              <option value="low">🟢 낮음</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>마감일</label>
            <input
              style={inputStyle}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>프로젝트</label>
          <select
            style={inputStyle}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "Pretendard, sans-serif",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "Pretendard, sans-serif",
              opacity: title.trim() ? 1 : 0.5,
            }}
            disabled={!title.trim()}
          >
            추가
          </button>
        </div>
      </div>
    </form>
  );
}

function TaskEditForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { projects, updateTask } = useProjectVM();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [projectId, setProjectId] = useState(task.projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateTask(task.id, {
      projectId,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
    });
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 16,
        borderRadius: 10,
        border: "1px solid var(--color-accent)",
        background: "var(--color-bg-secondary)",
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={labelStyle}>제목 *</label>
          <input
            style={inputStyle}
            placeholder="태스크 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label style={labelStyle}>설명</label>
          <input
            style={inputStyle}
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>우선순위</label>
            <select
              style={inputStyle}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="high">🔴 높음</option>
              <option value="medium">🟡 보통</option>
              <option value="low">🟢 낮음</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>상태</label>
            <select
              style={inputStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <option value="todo">할 일</option>
              <option value="in_progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>마감일</label>
            <input
              style={inputStyle}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>프로젝트</label>
            <select
              style={inputStyle}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "Pretendard, sans-serif",
            }}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "Pretendard, sans-serif",
              opacity: title.trim() ? 1 : 0.5,
            }}
            disabled={!title.trim()}
          >
            저장
          </button>
        </div>
      </div>
    </form>
  );
}

type ViewMode = "list" | "kanban" | "calendar";

const VIEW_OPTIONS: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: "kanban", icon: "⊞", label: "상태별" },
  { mode: "list", icon: "☰", label: "리스트" },
  { mode: "calendar", icon: "📅", label: "캘린더" },
];

function TaskRowMenu({ task }: { task: Task }) {
  const { removeTask } = useProjectVM();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (editing) {
    return <TaskEditForm task={task} onClose={() => setEditing(false)} />;
  }

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: "none",
          background: "transparent",
          color: "var(--color-text-secondary)",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: "opacity 0.15s",
          flexShrink: 0,
        }}
        className="group-hover:!opacity-100 hover:!bg-[var(--color-bg-hover)]"
      >
        ...
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            zIndex: 50,
            minWidth: 120,
            padding: 4,
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-secondary)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); setEditing(true); }}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "Pretendard, sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            편집
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); removeTask(task.id); setOpen(false); }}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--color-danger, #e17055)",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "Pretendard, sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { updateTaskStatus, projects } = useProjectVM();
  const createSession = useSessionVM((s) => s.createSession);
  const setPage = useAppVM((s) => s.setCurrentPage);
  const project = projects.find((p) => p.id === task.projectId);
  const st = STATUS[task.status];
  const next: TaskStatus =
    task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
  const [showStartModal, setShowStartModal] = useState(false);

  const handleStart = (mode: TerminalMode, aiModel?: AiModel) => {
    if (task.status === "todo") updateTaskStatus(task.id, "in_progress");
    createSession({
      taskId: task.id,
      taskTitle: task.title,
      projectName: project?.name ?? "프로젝트",
      projectIcon: project?.icon ?? "📁",
      mode,
      aiModel,
    });
    setPage("terminal");
    setShowStartModal(false);
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-bg-hover/50 transition-colors group border-b border-border/30 last:border-0">
      <button
        onClick={() => updateTaskStatus(task.id, next)}
        style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", flexShrink: 0 }}
        className={`cursor-pointer flex items-center justify-center transition-colors ${
          task.status === "done"
            ? "border-success bg-success/20"
            : "border-text-secondary/30 hover:border-accent"
        }`}
      >
        {task.status === "done" && <span style={{ fontSize: 11 }} className="text-success font-bold">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <span
          style={{ fontSize: 15 }}
          className={task.status === "done" ? "line-through text-text-secondary" : "text-text-primary"}
        >
          {task.title}
        </span>
        {task.description && (
          <p style={{ fontSize: 13, marginTop: 2 }} className="text-text-secondary truncate">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {project && (
          <span style={{ fontSize: 13, padding: "3px 10px", borderRadius: 6 }} className="bg-bg-tertiary/60 text-text-secondary">
            {project.icon} {project.name}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: 13 }} className="text-text-secondary">{task.dueDate}</span>
        )}
        <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 10 }} className={`${st.text} bg-bg-tertiary/40 font-medium`}>
          {st.label}
        </span>
      </div>

      <button
        onClick={() => setShowStartModal(true)}
        style={{ fontSize: 13 }}
        className="text-text-secondary/0 group-hover:text-accent cursor-pointer transition-colors shrink-0 font-medium"
      >
        ▶ 시작
      </button>

      <TaskRowMenu task={task} />

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

export default function TaskDashboard() {
  const { projects, tasks, selectedProjectId } = useProjectVM();
  const [view, setView] = useState<ViewMode>("kanban");
  const [showAddForm, setShowAddForm] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isJournal = selectedProject?.type === "journal";
  const activeView = isJournal && view === "kanban" ? "list" : view;

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  const counts = {
    todo: filteredTasks.filter((t) => t.status === "todo").length,
    in_progress: filteredTasks.filter((t) => t.status === "in_progress").length,
    done: filteredTasks.filter((t) => t.status === "done").length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div style={{ padding: "14px 24px" }} className="border-b border-border flex items-center gap-4 shrink-0">
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>
          {selectedProject ? `${selectedProject.icon} ${selectedProject.name}` : "📋 전체 태스크"}
        </h1>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 2, marginLeft: 16 }}>
          {VIEW_OPTIONS
            .filter((opt) => !(isJournal && opt.mode === "kanban"))
            .map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setView(opt.mode)}
              style={{ fontSize: 13, padding: "5px 12px", borderRadius: 6 }}
              className={`cursor-pointer transition-colors ${
                activeView === opt.mode
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginLeft: "auto", fontSize: 13 }}>
          <span className="text-text-secondary">할 일 {counts.todo}</span>
          <span className="text-pixel-blue">진행 중 {counts.in_progress}</span>
          <span className="text-success">완료 {counts.done}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeView === "kanban" && <KanbanBoard />}
        {activeView === "calendar" && <CalendarView />}
        {activeView === "list" && (
          <div style={{ padding: "12px 24px" }} className="h-full overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <span style={{ fontSize: 32, marginBottom: 12 }}>📝</span>
                <p style={{ fontSize: 15 }}>태스크가 없습니다</p>
              </div>
            ) : (
              filteredTasks.map((task) => <TaskRow key={task.id} task={task} />)
            )}
            {showAddForm ? (
              <TaskAddForm onClose={() => setShowAddForm(false)} />
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                style={{ padding: "12px 16px", fontSize: 14, borderRadius: 10, marginTop: 8, width: "100%" }}
                className="text-left text-text-secondary/40 hover:text-accent hover:bg-bg-hover/30 transition-colors cursor-pointer border border-dashed border-border/40"
              >
                + 새 태스크 추가
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
