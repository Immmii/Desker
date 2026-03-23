import type { Project, Task } from "./models";

interface DesktopFile {
  name: string;
  is_dir: boolean;
  size: number;
}

// DB row types (snake_case from SQLite)
interface ProjectRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
}

interface TaskTodoRow {
  id: string;
  task_id: string;
  text: string;
  done: number;
  sort_order: number;
}

interface AgentContextRow {
  id: string;
  task_id: string;
  agent_role: string;
  content: string;
  created_at: string;
}

interface TimetableBlockRow {
  id: string;
  date: string;
  cell_key: string;
  task_id: string;
  color: string;
  created_at: string;
}

interface HabitRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

interface HabitLogRow {
  id: string;
  habit_id: string;
  date: string;
  done: number;
}

interface ShortcutRow {
  id: string;
  name: string;
  url: string;
  sort_order: number;
  created_at: string;
}

interface DotArtRow {
  id: string;
  name: string;
  grid_size: number;
  pixels: string; // JSON string
  category: string;
  is_preset: number;
  created_at: string;
}

interface McpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  url?: string;
}

export interface DeskerAPI {
  db: {
    getProjects(): Promise<ProjectRow[]>;
    addProject(p: { name: string; icon: string; color: string; type: string }): Promise<ProjectRow>;
    updateProject(id: string, updates: Record<string, unknown>): Promise<void>;
    removeProject(id: string): Promise<void>;

    getTasks(projectId?: string): Promise<TaskRow[]>;
    addTask(t: {
      project_id: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      due_date: string | null;
      start_date?: string | null;
    }): Promise<TaskRow>;
    updateTask(id: string, updates: Record<string, unknown>): Promise<void>;
    removeTask(id: string): Promise<void>;

    getTaskTodos(taskId: string): Promise<TaskTodoRow[]>;
    addTaskTodo(t: { task_id: string; text: string }): Promise<TaskTodoRow>;
    updateTaskTodo(id: string, updates: Record<string, unknown>): Promise<void>;
    removeTaskTodo(id: string): Promise<void>;

    saveAgentContext(taskId: string, agentRole: string, content: string): Promise<AgentContextRow>;
    getAgentContexts(taskId: string): Promise<AgentContextRow[]>;

    getRoomObjects(): Promise<{ id: string; type: string; x: number; y: number; label: string }[]>;
    saveRoomObjects(objects: { id: string; type: string; x: number; y: number; label: string }[]): Promise<void>;

    getTimetableBlocks(date: string): Promise<TimetableBlockRow[]>;
    saveTimetableBlocks(date: string, blocks: { cell_key: string; task_id: string; color: string }[]): Promise<void>;
    clearTimetableBlocks(date: string): Promise<void>;

    getHabits(): Promise<HabitRow[]>;
    addHabit(name: string): Promise<HabitRow>;
    removeHabit(id: string): Promise<void>;
    reorderHabit(id: string, sortOrder: number): Promise<void>;
    getHabitLogs(weekStart: string, weekEnd: string): Promise<HabitLogRow[]>;
    toggleHabitLog(habitId: string, date: string): Promise<number>;

    getShortcuts(): Promise<ShortcutRow[]>;
    addShortcut(name: string, url: string): Promise<ShortcutRow>;
    removeShortcut(id: string): Promise<void>;
    reorderShortcuts(ids: string[]): Promise<void>;
  };

  dotart: {
    getAll(category?: string): Promise<DotArtRow[]>;
    add(t: { name: string; grid_size: number; pixels: string; category: string }): Promise<DotArtRow>;
    remove(id: string): Promise<void>;
  };

  oauth: {
    getAll(): Promise<{ id: string; service: string; access_token: string; refresh_token: string | null; token_type: string; expires_at: string | null; user_email: string | null; connected_at: string }[]>;
    connect(service: string): Promise<void>;
    disconnect(service: string, mcpName?: string): Promise<void>;
    getStatus(service: string): Promise<{ id: string; service: string; access_token: string } | null>;
    refresh(service: string): Promise<{ access_token: string; expires_at: string | null }>;
    connectWithToken(service: string, mcpName: string, mcpPackage: string, env: Record<string, string>, account?: string): Promise<void>;
  };

  mcp: {
    list(): Promise<Record<string, McpServer>>;
    add(name: string, npmPackage: string, env?: Record<string, string>): Promise<void>;
    addHttp(name: string, url: string): Promise<void>;
    remove(name: string): Promise<void>;
    discover(): Promise<{ name: string; source: "claude" | "codex" | "both"; server: McpServer }[]>;
    import(names: string[]): Promise<void>;
  };

  aiChat: {
    send(sessionId: string, message: string): Promise<void>;
    abort(sessionId: string): Promise<void>;
    clear(sessionId: string): Promise<void>;
    onChunk(cb: (sessionId: string, chunk: string) => void): () => void;
    onDone(cb: (sessionId: string) => void): () => void;
    onError(cb: (sessionId: string, error: string) => void): () => void;
  };

  pty: {
    create(sessionId: string, opts?: { cols?: number; rows?: number }): Promise<void>;
    write(sessionId: string, data: string): Promise<void>;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    kill(sessionId: string): Promise<void>;
    onData(cb: (sessionId: string, data: string) => void): () => void;
    onExit(cb: (sessionId: string, code: number) => void): () => void;
  };

  ai: {
    spawn(sessionId: string, model: string, opts?: { cols?: number; rows?: number }): Promise<void>;
    write(sessionId: string, data: string): Promise<void>;
    writeHidden(sessionId: string, data: string): Promise<void>;
    resize(sessionId: string, cols: number, rows: number): Promise<void>;
    kill(sessionId: string): Promise<void>;
    onData(cb: (sessionId: string, data: string) => void): () => void;
    onExit(cb: (sessionId: string, code: number) => void): () => void;
    checkAvailable(model: string): Promise<boolean>;
  };

  fs: {
    listDesktopFiles(): Promise<DesktopFile[]>;
    openFile(name: string): Promise<void>;
    getPathForFile(file: File): string;
  };

  window: {
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    openExternal(url: string): Promise<void>;
    setAutoLaunch(enabled: boolean): Promise<void>;
    onBlur(cb: () => void): () => void;
    onFocus(cb: () => void): () => void;
  };
}

declare global {
  interface Window {
    deskerAPI: DeskerAPI;
  }
}

export {};
