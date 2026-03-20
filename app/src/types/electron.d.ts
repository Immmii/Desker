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
    }): Promise<TaskRow>;
    updateTask(id: string, updates: Record<string, unknown>): Promise<void>;
    removeTask(id: string): Promise<void>;

    getRoomObjects(): Promise<{ id: string; type: string; x: number; y: number; label: string }[]>;
    saveRoomObjects(objects: { id: string; type: string; x: number; y: number; label: string }[]): Promise<void>;
  };

  dotart: {
    getAll(category?: string): Promise<DotArtRow[]>;
    add(t: { name: string; grid_size: number; pixels: string; category: string }): Promise<DotArtRow>;
    remove(id: string): Promise<void>;
  };

  oauth: {
    getAll(): Promise<{ id: string; service: string; access_token: string; refresh_token: string | null; token_type: string; expires_at: string | null; user_email: string | null; connected_at: string }[]>;
    connect(service: string): Promise<void>;
    disconnect(service: string): Promise<void>;
    getStatus(service: string): Promise<{ id: string; service: string; access_token: string } | null>;
  };

  mcp: {
    list(): Promise<Record<string, McpServer>>;
    add(name: string, npmPackage: string, env?: Record<string, string>): Promise<void>;
    addHttp(name: string, url: string): Promise<void>;
    remove(name: string): Promise<void>;
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
  };
}

declare global {
  interface Window {
    deskerAPI: DeskerAPI;
  }
}

export {};
