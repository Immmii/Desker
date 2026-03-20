import { create } from "zustand";
import type { Project, Task, TaskStatus, ProjectType } from "../types/models";

// ── Row → Model converters (snake_case → camelCase) ──
function toProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    type: row.type as ProjectType,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    status: row.status as TaskStatus,
    priority: row.priority as Task["priority"],
    dueDate: (row.due_date as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

interface ProjectViewModel {
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string | null;
  isLoading: boolean;

  // Init
  loadProjects: () => Promise<void>;
  loadTasks: (projectId?: string) => Promise<void>;
  loadAll: () => Promise<void>;

  // Project CRUD
  addProject: (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProject: (id: string, updates: Partial<Omit<Project, "id" | "createdAt">>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;

  // Task CRUD
  addTask: (t: Omit<Task, "id" | "createdAt">) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  reorderTasks: (reordered: Task[]) => void;
}

export const useProjectVM = create<ProjectViewModel>((set, get) => ({
  projects: [],
  tasks: [],
  selectedProjectId: null,
  isLoading: false,

  loadProjects: async () => {
    const rows = await window.deskerAPI.db.getProjects();
    set({ projects: rows.map((r) => toProject(r as unknown as Record<string, unknown>)) });
  },

  loadTasks: async (projectId) => {
    const rows = await window.deskerAPI.db.getTasks(projectId);
    set({ tasks: rows.map((r) => toTask(r as unknown as Record<string, unknown>)) });
  },

  loadAll: async () => {
    set({ isLoading: true });
    const [projectRows, taskRows] = await Promise.all([
      window.deskerAPI.db.getProjects(),
      window.deskerAPI.db.getTasks(),
    ]);
    set({
      projects: projectRows.map((r) => toProject(r as unknown as Record<string, unknown>)),
      tasks: taskRows.map((r) => toTask(r as unknown as Record<string, unknown>)),
      isLoading: false,
    });
  },

  addProject: async (project) => {
    const row = await window.deskerAPI.db.addProject({
      name: project.name,
      icon: project.icon,
      color: project.color,
      type: project.type,
    });
    const created = toProject(row as unknown as Record<string, unknown>);
    set((s) => ({ projects: [created, ...s.projects] }));
  },

  updateProject: async (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.type !== undefined) dbUpdates.type = updates.type;

    await window.deskerAPI.db.updateProject(id, dbUpdates);
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  removeProject: async (id) => {
    await window.deskerAPI.db.removeProject(id);
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
      selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
    }));
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  addTask: async (task) => {
    const row = await window.deskerAPI.db.addTask({
      project_id: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
    });
    const created = toTask(row as unknown as Record<string, unknown>);
    set((s) => ({ tasks: [created, ...s.tasks] }));
  },

  updateTask: async (taskId, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;

    await window.deskerAPI.db.updateTask(taskId, dbUpdates);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    }));
  },

  updateTaskStatus: async (taskId, status) => {
    await window.deskerAPI.db.updateTask(taskId, { status });
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }));
  },

  removeTask: async (id) => {
    await window.deskerAPI.db.removeTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  reorderTasks: (reordered) => {
    set({ tasks: reordered });
  },
}));
