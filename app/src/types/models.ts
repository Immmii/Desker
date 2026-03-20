export type ProjectType = "task" | "journal";

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
}

export type SessionState = "idle" | "working" | "error" | "completed";

export interface Session {
  id: string;
  taskId: string;
  state: SessionState;
  startedAt: string;
  endedAt: string | null;
}

export interface RoomObject {
  id: string;
  type: string;
  x: number;
  y: number;
  scale: number;
  zOrder: number;
}

export type SidebarPage =
  | "workspace"
  | "dot-editor"
  | "tasks"
  | "terminal"
  | "plugins"
  | "settings";
