import { useState, useRef, useEffect } from "react";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { useAppVM } from "../../../viewmodels/app.vm";
import type { Task, TaskStatus, TaskPriority } from "../../../types/models";
import type { TerminalMode, AiModel, AgentRole, AgentEnvironment } from "../../../viewmodels/session.vm";
import StartSessionModal from "../../shared/StartSessionModal";
import TaskDetailModal from "../../shared/TaskDetailModal";

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

  const handleStart = (mode: TerminalMode, aiModel?: AiModel, agentRole?: AgentRole, agentEnv?: AgentEnvironment) => {
    if (task.status === "todo") updateTaskStatus(task.id, "in_progress");
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

type CalendarMode = "monthly" | "weekly";

const WEEK_DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** Get Monday of the week containing the given date */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Sunday → go back 6, else go to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format date string as YYYY-MM-DD for comparison */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Check if a task falls on a given date (by dueDate or startDate~dueDate range) */
function taskFallsOnDate(task: Task, dateStr: string): boolean {
  if (task.startDate && task.dueDate) {
    return dateStr >= task.startDate && dateStr <= task.dueDate;
  }
  if (task.dueDate) return task.dueDate === dateStr;
  if (task.startDate) return task.startDate === dateStr;
  return false;
}

export default function CalendarView() {
  const { tasks, selectedProjectId } = useProjectVM();
  const [viewDate, setViewDate] = useState(new Date());
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("monthly");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const todayStr = toDateStr(today);
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid (monthly)
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  // Map tasks to dates (monthly)
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

  // Weekly view helpers
  const weekMonday = getMonday(viewDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    weekDays.push(d);
  }

  // Map tasks to week dates
  const tasksByWeekDate = new Map<string, Task[]>();
  for (const day of weekDays) {
    const ds = toDateStr(day);
    const dayTasks = filteredTasks.filter((t) => taskFallsOnDate(t, ds));
    if (dayTasks.length > 0) tasksByWeekDate.set(ds, dayTasks);
  }

  // Navigation
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const prevWeek = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 7);
    setViewDate(d);
  };
  const nextWeek = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 7);
    setViewDate(d);
  };
  const goToday = () => setViewDate(new Date());

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setDetailTaskId(task.id);
  };

  // Week header label
  const weekStartStr = `${weekDays[0].getMonth() + 1}.${weekDays[0].getDate()}`;
  const weekEndStr = `${weekDays[6].getMonth() + 1}.${weekDays[6].getDate()}`;

  const modeToggleStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 6,
    cursor: "pointer",
    border: "none",
    fontWeight: active ? 600 : 400,
    background: active ? "var(--color-accent)" : "transparent",
    color: active ? "#fff" : "var(--color-text-secondary)",
    fontFamily: "Pretendard, sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div style={{ padding: "16px 20px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }} className="text-text-primary">
          {calendarMode === "monthly"
            ? `${year}. ${month + 1}`
            : `${year}. ${weekStartStr} ~ ${weekEndStr}`}
        </h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={calendarMode === "monthly" ? prevMonth : prevWeek}
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
            onClick={calendarMode === "monthly" ? nextMonth : nextWeek}
            style={{ fontSize: 14, padding: "4px 10px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            ▶
          </button>
        </div>

        {/* View mode toggle */}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 2,
            borderRadius: 8,
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
          }}
        >
          <button onClick={() => setCalendarMode("monthly")} style={modeToggleStyle(calendarMode === "monthly")}>
            월간
          </button>
          <button onClick={() => setCalendarMode("weekly")} style={modeToggleStyle(calendarMode === "weekly")}>
            주간
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

      {calendarMode === "monthly" ? (
        <>
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
        </>
      ) : (
        /* ── Weekly View ── */
        <>
          {/* Week day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const isTodayCol = ds === todayStr;
              // Saturday = index 5 (토), Sunday = index 6 (일)
              const isSunday = i === 6;
              const isSaturday = i === 5;
              return (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    padding: "8px 4px",
                    borderBottom: "2px solid",
                    borderBottomColor: isTodayCol ? "var(--color-accent)" : "var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: isSunday
                        ? "var(--color-danger)"
                        : isSaturday
                          ? "var(--color-pixel-blue)"
                          : "var(--color-text-secondary)",
                      marginBottom: 2,
                    }}
                  >
                    {WEEK_DAY_LABELS[i]}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: isTodayCol ? 700 : 400,
                      width: isTodayCol ? 32 : "auto",
                      height: isTodayCol ? 32 : "auto",
                      borderRadius: isTodayCol ? "50%" : 0,
                      display: isTodayCol ? "inline-flex" : "block",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isTodayCol ? "var(--color-accent)" : "transparent",
                      color: isTodayCol ? "#fff" : "var(--color-text-primary)",
                    }}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week task columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const dayTasks = tasksByWeekDate.get(ds) || [];
              const isTodayCol = ds === todayStr;
              return (
                <div
                  key={i}
                  style={{
                    borderRight: i < 6 ? "1px solid rgba(46,46,66,0.2)" : "none",
                    padding: "8px 6px",
                    overflow: "auto",
                    background: isTodayCol ? "rgba(108,92,231,0.04)" : "transparent",
                  }}
                >
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => handleTaskClick(e, task)}
                      style={{
                        fontSize: 12,
                        padding: "6px 8px",
                        borderRadius: 6,
                        marginBottom: 4,
                        borderLeft: `3px solid ${STATUS_COLOR[task.status]}`,
                        background: STATUS_BG[task.status],
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                      className="text-text-primary hover:!opacity-80"
                      title={task.title}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {task.title}
                      </div>
                      <div style={{ fontSize: 10, color: STATUS_COLOR[task.status], fontWeight: 500 }}>
                        {STATUS_LABEL[task.status]}
                      </div>
                    </div>
                  ))}
                  {dayTasks.length === 0 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-secondary)",
                        opacity: 0.5,
                        textAlign: "center",
                        paddingTop: 12,
                      }}
                    >
                      -
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Task detail modal */}
      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
    </div>
  );
}
