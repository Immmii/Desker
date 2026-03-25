import { useState, useRef, useCallback, useEffect } from "react";
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
import { useAppVM } from "../../viewmodels/app.vm";
import { useProjectVM } from "../../viewmodels/project.vm";
import type { ProjectType, Project } from "../../types/models";
import Sidebar from "./Sidebar";
import WorkspacePage from "../pages/WorkspacePage";
import DotEditorPage from "../pages/DotEditorPage";
import TasksPage from "../pages/TasksPage";
import TerminalPage from "../pages/TerminalPage";
import PluginsPage from "../pages/PluginsPage";
import SettingsPage from "../pages/SettingsPage";

// ── Sortable Project Item ──
function SortableProjectItem({
  project,
  isSelected,
  onSelect,
  onContextMenu,
}: {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    padding: "7px 12px",
    fontSize: 15,
    textAlign: "left" as const,
    borderRadius: 6,
    cursor: "grab",
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={`transition-colors ${
        isSelected ? "bg-accent/15 text-accent font-medium" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      {project.icon} {project.name}
    </button>
  );
}

const PRESET_ICONS = ["📁", "🎓", "💻", "📔", "🎨", "🏠", "🎮", "📊", "🧪", "🌱", "🎵", "📚"];
const PRESET_COLORS = ["#6c5ce7", "#00b894", "#fdcb6e", "#e17055", "#74b9ff", "#fd79a8", "#55efc4", "#2d3436"];

// ── Floating Modal for Project Add/Edit ──
function ProjectAddModal({
  onClose,
  editProject,
}: {
  onClose: () => void;
  editProject?: { id: string; name: string; icon: string; color: string; type: ProjectType } | null;
}) {
  const addProject = useProjectVM((s) => s.addProject);
  const updateProject = useProjectVM((s) => s.updateProject);
  const [name, setName] = useState(editProject?.name ?? "");
  const [icon, setIcon] = useState(editProject?.icon ?? "📁");
  const [type, setType] = useState<ProjectType>(editProject?.type ?? "task");
  const [color, setColor] = useState(editProject?.color ?? "#6c5ce7");

  const isEdit = !!editProject;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isEdit) {
      updateProject(editProject.id, { name: name.trim(), icon, color, type });
    } else {
      addProject({ name: name.trim(), icon, color, type });
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
      />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: 400, padding: 28, borderRadius: 16,
          background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }} className="text-text-primary">
          {isEdit ? "프로젝트 편집" : "새 프로젝트"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }} className="text-text-secondary">이름</label>
            <input
              style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 15, width: "100%", outline: "none",
                border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)", fontFamily: "Pretendard, sans-serif",
              }}
              placeholder="프로젝트 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }} className="text-text-secondary">아이콘</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic} type="button" onClick={() => setIcon(ic)}
                  style={{
                    width: 38, height: 38, borderRadius: 8, fontSize: 18, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: icon === ic ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: icon === ic ? "rgba(108,92,231,0.15)" : "var(--color-bg-primary)",
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }} className="text-text-secondary">유형</label>
            <select
              style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 15, width: "100%", outline: "none",
                border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)", fontFamily: "Pretendard, sans-serif",
              }}
              value={type}
              onChange={(e) => setType(e.target.value as ProjectType)}
            >
              <option value="task">📋 태스크형</option>
              <option value="journal">📔 일기형</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: "block" }} className="text-text-secondary">색상</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                    border: color === c ? "2px solid #fff" : "2px solid transparent",
                    outline: color === c ? "2px solid var(--color-accent)" : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: "8px 18px", borderRadius: 10, fontSize: 14, cursor: "pointer",
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-text-secondary)", fontFamily: "Pretendard, sans-serif",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 18px", borderRadius: 10, fontSize: 14, cursor: "pointer",
                border: "none", background: "var(--color-accent)", color: "#fff",
                fontWeight: 600, fontFamily: "Pretendard, sans-serif",
                opacity: name.trim() ? 1 : 0.5,
              }}
              disabled={!name.trim()}
            >
              {isEdit ? "저장" : "추가"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ── Project Context Menu ──
function ProjectContextMenu({
  x,
  y,
  projectId,
  onClose,
  onEdit,
}: {
  x: number;
  y: number;
  projectId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const removeProject = useProjectVM((s) => s.removeProject);
  const selectProject = useProjectVM((s) => s.selectProject);
  const selectedProjectId = useProjectVM((s) => s.selectedProjectId);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 110,
        minWidth: 130,
        padding: 4,
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <button
        onClick={() => { onClose(); onEdit(); }}
        style={{
          width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6,
          border: "none", background: "transparent", color: "var(--color-text-primary)",
          cursor: "pointer", textAlign: "left", fontFamily: "Pretendard, sans-serif",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        편집
      </button>
      <button
        onClick={() => {
          if (selectedProjectId === projectId) selectProject(null);
          removeProject(projectId);
          onClose();
        }}
        style={{
          width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6,
          border: "none", background: "transparent", color: "var(--color-danger, #e17055)",
          cursor: "pointer", textAlign: "left", fontFamily: "Pretendard, sans-serif",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        삭제
      </button>
    </div>
  );
}

// ── Project Panel (collapsible + resizable) ──
function ProjectPanel({
  collapsed,
  onToggle: _onToggle,
  width,
  onResizeStart,
}: {
  collapsed: boolean;
  onToggle: () => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const { projects, selectedProjectId, selectProject, reorderProjects } = useProjectVM();
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = projects.findIndex((p) => p.id === active.id);
    const newIdx = projects.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    reorderProjects(arrayMove(projects, oldIdx, newIdx));
  };
  const currentPage = useAppVM((s) => s.currentPage);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProject, setEditProject] = useState<{
    id: string; name: string; icon: string; color: string; type: ProjectType;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; projectId: string;
  } | null>(null);

  if (currentPage !== "tasks") return null;

  if (collapsed) return null;

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, projectId });
  };

  const handleEdit = (projectId: string) => {
    const p = projects.find((proj) => proj.id === projectId);
    if (p) {
      setEditProject({ id: p.id, name: p.name, icon: p.icon, color: p.color, type: p.type });
    }
  };

  return (
    <>
      <div
        style={{
          width, minWidth: 180, maxWidth: 400, position: "relative",
          borderTopLeftRadius: 0,
          background: "var(--color-bg-primary)",
          marginTop: 38,
        }}
        className="border-r border-border flex flex-col h-full overflow-hidden"
      >
        <div style={{ padding: "16px 16px 12px 20px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }} className="text-text-primary">Desker</h2>
          <p style={{ fontSize: 13, marginTop: 2 }} className="text-text-secondary">Task Tracker</p>
        </div>

        <div style={{ paddingLeft: 12, paddingRight: 12 }} className="flex flex-col flex-1 overflow-y-auto">
          <div style={{ paddingLeft: 8, paddingTop: 6, paddingBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }} className="text-text-secondary/60">프로젝트</span>
          </div>

          <button
            onClick={() => selectProject(null)}
            style={{ padding: "7px 12px", fontSize: 15, textAlign: "left", borderRadius: 6 }}
            className={`cursor-pointer transition-colors ${
              !selectedProjectId ? "bg-accent/15 text-accent font-medium" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            📁 전체 태스크
          </button>

          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
            <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {projects.map((p) => (
                <SortableProjectItem
                  key={p.id}
                  project={p}
                  isSelected={selectedProjectId === p.id}
                  onSelect={() => selectProject(p.id)}
                  onContextMenu={(e) => handleContextMenu(e, p.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: "7px 12px", fontSize: 14, textAlign: "left", borderRadius: 6, marginTop: 4 }}
            className="text-text-secondary/40 hover:text-accent hover:bg-bg-hover transition-colors cursor-pointer"
          >
            + 프로젝트 추가
          </button>

          <div style={{ paddingLeft: 8, paddingTop: 20, paddingBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }} className="text-text-secondary/60">바로가기</span>
          </div>
          <button style={{ padding: "7px 12px", fontSize: 14, textAlign: "left", borderRadius: 6 }} className="text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer">
            📔 일기장
          </button>
          <button style={{ padding: "7px 12px", fontSize: 14, textAlign: "left", borderRadius: 6 }} className="text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer">
            📊 주간 리포트
          </button>
        </div>

        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute", top: 0, right: -3, width: 6, height: "100%",
            cursor: "col-resize", zIndex: 10,
          }}
        />
      </div>

      {showAddModal && <ProjectAddModal onClose={() => setShowAddModal(false)} />}
      {editProject && (
        <ProjectAddModal
          onClose={() => setEditProject(null)}
          editProject={editProject}
        />
      )}
      {contextMenu && (
        <ProjectContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          projectId={contextMenu.projectId}
          onClose={() => setContextMenu(null)}
          onEdit={() => handleEdit(contextMenu.projectId)}
        />
      )}
    </>
  );
}

const PAGES: { key: string; Component: React.FC }[] = [
  { key: "workspace", Component: WorkspacePage },
  { key: "dot-editor", Component: DotEditorPage },
  { key: "tasks", Component: TasksPage },
  { key: "terminal", Component: TerminalPage },
  { key: "plugins", Component: PluginsPage },
  { key: "settings", Component: SettingsPage },
];

function PageContent() {
  const currentPage = useAppVM((s) => s.currentPage);
  return (
    <>
      {PAGES.map(({ key, Component }) => (
        <div
          key={key}
          style={{
            display: currentPage === key ? "contents" : "none",
          }}
        >
          <Component />
        </div>
      ))}
    </>
  );
}

// ── Custom Titlebar (Electron frameless) ──
function Titlebar({
  panelCollapsed,
  onToggle,
}: {
  panelCollapsed: boolean;
  onToggle: () => void;
  panelWidth: number;
}) {
  const currentPage = useAppVM((s) => s.currentPage);
  const showPanel = currentPage === "tasks";
  const sidebarW = 84;
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setFocused(document.documentElement.dataset.focused !== "false");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-focused"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 40, zIndex: 200,
        display: "flex",
        WebkitAppRegion: "drag" as unknown as string,
      } as React.CSSProperties}
    >
      <div
        style={{
          width: "100%", height: 38,
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center",
          paddingLeft: sidebarW + 8,
          cursor: "default",
        }}
      >
        {/* Fake traffic lights when window is blurred (macOS only) */}
        {!focused && navigator.platform.startsWith("Mac") && (
          <div style={{
            position: "fixed", left: 16, top: 15,
            display: "flex", gap: 8, zIndex: 201,
            pointerEvents: "none",
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--color-text-secondary)", opacity: 0.3 }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--color-text-secondary)", opacity: 0.3 }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--color-text-secondary)", opacity: 0.3 }} />
          </div>
        )}
        {/* Windows custom window controls */}
        {navigator.platform.startsWith("Win") && (
          <div style={{
            position: "fixed", right: 0, top: 0, height: 38,
            display: "flex", alignItems: "center", zIndex: 201,
            WebkitAppRegion: "no-drag" as unknown as string,
          } as React.CSSProperties}>
            <button
              onClick={() => window.deskerAPI.window.minimize()}
              style={{ width: 46, height: 38, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent" }}
              className="text-text-secondary hover:bg-bg-hover cursor-pointer"
            >
              <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
            </button>
            <button
              onClick={() => window.deskerAPI.window.maximize()}
              style={{ width: 46, height: 38, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent" }}
              className="text-text-secondary hover:bg-bg-hover cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
            </button>
            <button
              onClick={() => window.deskerAPI.window.close()}
              style={{ width: 46, height: 38, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent" }}
              className="text-text-secondary hover:bg-[#e81123] hover:text-white cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/></svg>
            </button>
          </div>
        )}
        {/* Desker title — centered */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1.5, opacity: 0.35 }} className="text-text-secondary">
            Desker
          </span>
        </div>

        {showPanel && (
          <button
            onClick={onToggle}
            title={panelCollapsed ? "사이드바 열기" : "사이드바 닫기"}
            style={{
              width: 28, height: 28, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              // Buttons must not be draggable
              WebkitAppRegion: "no-drag" as unknown as string,
            } as React.CSSProperties}
            className="text-text-secondary/50 hover:text-text-primary hover:bg-bg-hover/80 cursor-pointer transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="2" width="14" height="12" rx="2" />
              <line x1="6" y1="2" x2="6" y2="14" />
              {panelCollapsed ? (
                <polyline points="9,6 11,8 9,10" />
              ) : (
                <polyline points="11,6 9,8 11,10" />
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function AppShell() {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(240);
  const isResizing = useRef(false);
  const loadAll = useProjectVM((s) => s.loadAll);

  // Load data from DB on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = startWidth + (ev.clientX - startX);
      setPanelWidth(Math.max(180, Math.min(400, newWidth)));
    };

    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  return (
    <div className="flex h-full w-full">
      <Titlebar
        panelCollapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed((p) => !p)}
        panelWidth={panelWidth}
      />
      <Sidebar />
      <ProjectPanel
        collapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed((p) => !p)}
        width={panelWidth}
        onResizeStart={handleResizeStart}
      />
      <main className="flex-1 min-w-0 overflow-hidden" style={{ marginTop: 38, borderTopLeftRadius: 0, background: "var(--color-bg-primary)" }}>
        <PageContent />
      </main>
    </div>
  );
}
