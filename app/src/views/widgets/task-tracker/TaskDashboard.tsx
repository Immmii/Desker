import { useState } from "react";
import { useProjectVM } from "../../../viewmodels/project.vm";
import KanbanBoard from "./KanbanBoard";
import CalendarView from "./CalendarView";
import WorkflowEditor from "./WorkflowEditor";
import TaskDetailModal from "../../shared/TaskDetailModal";

type ViewMode = "kanban" | "calendar" | "workflow";

interface ViewOption { mode: ViewMode; icon: string; label: string }

const DEFAULT_VIEW_OPTIONS: ViewOption[] = [
  { mode: "calendar", icon: "📅", label: "캘린더" },
  { mode: "kanban", icon: "⊞", label: "상태별" },
  { mode: "workflow", icon: "⬡", label: "워크플로우" },
];

const TAB_ORDER_KEY = "desker:task-tab-order";

function loadTabOrder(): ViewOption[] {
  try {
    const saved = localStorage.getItem(TAB_ORDER_KEY);
    if (!saved) return DEFAULT_VIEW_OPTIONS;
    const order: ViewMode[] = JSON.parse(saved);
    const valid = order
      .map((mode) => DEFAULT_VIEW_OPTIONS.find((o) => o.mode === mode))
      .filter(Boolean) as ViewOption[];
    for (const opt of DEFAULT_VIEW_OPTIONS) {
      if (!valid.find((v) => v.mode === opt.mode)) valid.push(opt);
    }
    return valid;
  } catch {
    return DEFAULT_VIEW_OPTIONS;
  }
}

function saveTabOrder(tabs: ViewOption[]) {
  localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(tabs.map((t) => t.mode)));
}

export default function TaskDashboard() {
  const { projects, tasks, selectedProjectId } = useProjectVM();
  const [viewTabs, setViewTabs] = useState<ViewOption[]>(loadTabOrder);
  const [view, setView] = useState<ViewMode>(viewTabs[0]?.mode ?? "calendar");
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const activeView = view;

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

        {/* View toggle (draggable tabs) */}
        <div style={{ display: "flex", gap: 2, marginLeft: 16 }}>
          {viewTabs.map((opt, idx) => (
            <button
              key={opt.mode}
              draggable
              onClick={() => setView(opt.mode)}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdx === null || dragIdx === idx) return;
                const updated = [...viewTabs];
                const [moved] = updated.splice(dragIdx, 1);
                updated.splice(idx, 0, moved);
                setViewTabs(updated);
                saveTabOrder(updated);
                setDragIdx(null);
              }}
              onDragEnd={() => setDragIdx(null)}
              style={{
                fontSize: 13, padding: "5px 12px", borderRadius: 6,
                cursor: "grab", border: "none", background: "transparent",
                opacity: dragIdx === idx ? 0.4 : 1,
                transition: "all 0.15s",
                fontFamily: "Pretendard, sans-serif",
              }}
              className={`transition-colors ${
                activeView === opt.mode
                  ? "!bg-accent/15 text-accent font-medium"
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
        {activeView === "workflow" && <WorkflowEditor />}
      </div>

      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
    </div>
  );
}
