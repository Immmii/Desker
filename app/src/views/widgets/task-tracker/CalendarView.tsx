import { useState, useRef, useEffect } from "react";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { useAppVM } from "../../../viewmodels/app.vm";
import type { Task, TaskStatus, TaskPriority } from "../../../types/models";
import type { TerminalMode, AiModel } from "../../../viewmodels/session.vm";
import StartSessionModal from "../../shared/StartSessionModal";

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "#9090a8",
  in_progress: "#74b9ff",
  done: "#00b894",
};

const STATUS_BG: Record<TaskStatus, string> = {
  todo: "rgba(144,144,168,0.15)",
  in_progress: "rgba(116,185,255,0.15)",
  done: "rgba(0,184,148,0.15)",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  done: "완료",
};

const PRI_LABEL: Record<string, string> = { high: "🔴 높음", medium: "🟡 보통", low: "🟢 낮음" };

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const popupInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  fontSize: 13,
  fontFamily: "Pretendard, sans-serif",
  width: "100%",
  outline: "none",
};

const popupLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  marginBottom: 3,
  display: "block",
};

function CalendarTaskEditForm({ task, onClose }: { task: Task; onClose: () => void }) {
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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <label style={popupLabelStyle}>제목 *</label>
        <input style={popupInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <label style={popupLabelStyle}>설명</label>
        <input style={popupInputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={popupLabelStyle}>우선순위</label>
          <select style={popupInputStyle} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="high">🔴 높음</option>
            <option value="medium">🟡 보통</option>
            <option value="low">🟢 낮음</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={popupLabelStyle}>상태</label>
          <select style={popupInputStyle} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            <option value="todo">할 일</option>
            <option value="in_progress">진행 중</option>
            <option value="done">완료</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={popupLabelStyle}>마감일</label>
          <input style={popupInputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={popupLabelStyle}>프로젝트</label>
          <select style={popupInputStyle} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
        <button
          type="button" onClick={onClose}
          style={{
            padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
            border: "1px solid var(--color-border)", background: "transparent",
            color: "var(--color-text-secondary)", fontFamily: "Pretendard, sans-serif",
          }}
        >
          취소
        </button>
        <button
          type="submit"
          style={{
            padding: "5px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
            border: "none", background: "var(--color-accent)", color: "#fff",
            fontWeight: 600, fontFamily: "Pretendard, sans-serif",
            opacity: title.trim() ? 1 : 0.5,
          }}
          disabled={!title.trim()}
        >
          저장
        </button>
      </div>
    </form>
  );
}

function TaskPopup({
  task,
  anchorRect,
  onClose,
}: {
  task: Task;
  anchorRect: { top: number; left: number; bottom: number; right: number };
  onClose: () => void;
}) {
  const { projects, removeTask, updateTaskStatus } = useProjectVM();
  const createSession = useSessionVM((s) => s.createSession);
  const setPage = useAppVM((s) => s.setCurrentPage);
  const project = projects.find((p) => p.id === task.projectId);
  const popupRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

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
    onClose();
  };

  // Position popup: try below the anchor, or above if not enough space
  const popupWidth = 300;
  const popupStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 60,
    width: popupWidth,
    padding: 16,
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    background: "var(--color-bg-secondary)",
    boxShadow: "0 12px 36px rgba(0,0,0,0.35)",
    top: anchorRect.bottom + 4,
    left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - popupWidth - 8)),
  };

  // If popup would go below viewport, show above
  if (anchorRect.bottom + 280 > window.innerHeight) {
    popupStyle.top = undefined;
    popupStyle.bottom = window.innerHeight - anchorRect.top + 4;
  }

  return (
    <div ref={popupRef} style={popupStyle}>
      {editing ? (
        <CalendarTaskEditForm task={task} onClose={() => setEditing(false)} />
      ) : (
        <>
          {/* Title */}
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "var(--color-text-primary)" }}>
            {task.title}
          </div>

          {/* Description */}
          {task.description && (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10 }}>
              {task.description}
            </div>
          )}

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 60 }}>상태</span>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 10px",
                  borderRadius: 10,
                  color: STATUS_COLOR[task.status],
                  background: STATUS_BG[task.status],
                  fontWeight: 500,
                }}
              >
                {STATUS_LABEL[task.status]}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 60 }}>우선순위</span>
              <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{PRI_LABEL[task.priority]}</span>
            </div>
            {task.dueDate && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 60 }}>마감일</span>
                <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{task.dueDate}</span>
              </div>
            )}
            {project && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", width: 60 }}>프로젝트</span>
                <span style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{project.icon} {project.name}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setShowStartModal(true)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: "none", background: "var(--color-accent)", color: "#fff",
                fontWeight: 600, fontFamily: "Pretendard, sans-serif",
              }}
            >
              ▶ 시작
            </button>
            {showStartModal && (
              <StartSessionModal
                taskTitle={task.title}
                onStart={handleStart}
                onClose={() => setShowStartModal(false)}
              />
            )}
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-text-primary)", fontFamily: "Pretendard, sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              편집
            </button>
            <button
              onClick={() => { removeTask(task.id); onClose(); }}
              style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-danger, #e17055)", fontFamily: "Pretendard, sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CalendarView() {
  const { tasks, selectedProjectId } = useProjectVM();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<{
    task: Task;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  // Map tasks to dates
  const tasksByDate = new Map<number, typeof filteredTasks>();
  for (const task of filteredTasks) {
    if (!task.dueDate) continue;
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDate.has(day)) tasksByDate.set(day, []);
      tasksByDate.get(day)!.push(task);
    }
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date());

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSelectedTask({
      task,
      rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
    });
  };

  return (
    <div style={{ padding: "16px 20px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }} className="text-text-primary">
          {year}. {month + 1}
        </h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={prevMonth}
            style={{ fontSize: 14, padding: "4px 10px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            ◀
          </button>
          <button
            onClick={goToday}
            style={{ fontSize: 13, padding: "4px 12px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            오늘
          </button>
          <button
            onClick={nextMonth}
            style={{ fontSize: 14, padding: "4px 10px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            ▶
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginLeft: "auto", fontSize: 12 }}>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR.todo, display: "inline-block" }} />
            할 일
          </span>
          <span className="flex items-center gap-1.5 text-pixel-blue">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR.in_progress, display: "inline-block" }} />
            진행 중
          </span>
          <span className="flex items-center gap-1.5 text-success">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR.done, display: "inline-block" }} />
            완료
          </span>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            style={{ fontSize: 12, fontWeight: 600, padding: "6px 8px", textAlign: "center" }}
            className={i === 0 ? "text-danger" : i === 6 ? "text-pixel-blue" : "text-text-secondary"}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          flex: 1,
          gridAutoRows: "1fr",
        }}
      >
        {cells.map((day, i) => {
          const dayTasks = day ? tasksByDate.get(day) || [] : [];
          const colIdx = i % 7;

          return (
            <div
              key={i}
              style={{
                borderTop: "1px solid var(--color-border)",
                borderRight: colIdx < 6 ? "1px solid rgba(46,46,66,0.2)" : "none",
                padding: "4px 6px",
                minHeight: 0,
                overflow: "hidden",
              }}
              className={isToday(day ?? 0) ? "bg-accent/5" : ""}
            >
              {day && (
                <>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isToday(day) ? 700 : 400,
                      marginBottom: 2,
                      width: isToday(day) ? 24 : "auto",
                      height: isToday(day) ? 24 : "auto",
                      borderRadius: isToday(day) ? "50%" : 0,
                      display: isToday(day) ? "flex" : "block",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isToday(day) ? "var(--color-accent)" : "transparent",
                      color: isToday(day) ? "white" : colIdx === 0 ? "var(--color-danger)" : colIdx === 6 ? "var(--color-pixel-blue)" : "var(--color-text-primary)",
                    }}
                  >
                    {day}
                  </div>

                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => handleTaskClick(e, task)}
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        marginBottom: 2,
                        borderLeft: `3px solid ${STATUS_COLOR[task.status]}`,
                        background: STATUS_BG[task.status],
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                      className="text-text-primary hover:!opacity-80"
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div style={{ fontSize: 10, paddingLeft: 6 }} className="text-text-secondary">
                      +{dayTasks.length - 3}개
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Task popup */}
      {selectedTask && (
        <TaskPopup
          task={selectedTask.task}
          anchorRect={selectedTask.rect}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
