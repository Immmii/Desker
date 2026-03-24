import { contextBridge, ipcRenderer, webUtils } from "electron";

const api = {
  // ── Database ──
  db: {
    getProjects: () => ipcRenderer.invoke("db:projects:getAll"),
    addProject: (p: Record<string, unknown>) => ipcRenderer.invoke("db:projects:add", p),
    updateProject: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke("db:projects:update", id, updates),
    removeProject: (id: string) => ipcRenderer.invoke("db:projects:remove", id),

    getTasks: (projectId?: string) => ipcRenderer.invoke("db:tasks:getAll", projectId),
    addTask: (t: Record<string, unknown>) => ipcRenderer.invoke("db:tasks:add", t),
    updateTask: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke("db:tasks:update", id, updates),
    removeTask: (id: string) => ipcRenderer.invoke("db:tasks:remove", id),

    getTaskTodos: (taskId: string) => ipcRenderer.invoke("db:taskTodos:getAll", taskId),
    addTaskTodo: (t: { task_id: string; text: string }) => ipcRenderer.invoke("db:taskTodos:add", t),
    updateTaskTodo: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke("db:taskTodos:update", id, updates),
    removeTaskTodo: (id: string) => ipcRenderer.invoke("db:taskTodos:remove", id),

    saveAgentContext: (taskId: string, agentRole: string, content: string) =>
      ipcRenderer.invoke("db:agentContexts:save", taskId, agentRole, content),
    getAgentContexts: (taskId: string) =>
      ipcRenderer.invoke("db:agentContexts:getByTaskId", taskId),

    getRoomObjects: () => ipcRenderer.invoke("db:roomObjects:getAll"),
    saveRoomObjects: (objects: Record<string, unknown>[]) =>
      ipcRenderer.invoke("db:roomObjects:save", objects),

    getTimetableBlocks: (date: string) => ipcRenderer.invoke("db:timetableBlocks:getByDate", date),
    saveTimetableBlocks: (date: string, blocks: { cell_key: string; task_id: string; color: string }[]) =>
      ipcRenderer.invoke("db:timetableBlocks:saveBatch", date, blocks),
    clearTimetableBlocks: (date: string) => ipcRenderer.invoke("db:timetableBlocks:clearDate", date),

    getHabits: () => ipcRenderer.invoke("db:habits:getAll"),
    addHabit: (name: string) => ipcRenderer.invoke("db:habits:add", name),
    removeHabit: (id: string) => ipcRenderer.invoke("db:habits:remove", id),
    reorderHabit: (id: string, sortOrder: number) => ipcRenderer.invoke("db:habits:reorder", id, sortOrder),
    getHabitLogs: (weekStart: string, weekEnd: string) => ipcRenderer.invoke("db:habitLogs:get", weekStart, weekEnd),
    toggleHabitLog: (habitId: string, date: string) => ipcRenderer.invoke("db:habitLogs:toggle", habitId, date),

    getShortcuts: () => ipcRenderer.invoke("db:shortcuts:getAll"),
    addShortcut: (name: string, url: string) => ipcRenderer.invoke("db:shortcuts:add", name, url),
    removeShortcut: (id: string) => ipcRenderer.invoke("db:shortcuts:remove", id),
    reorderShortcuts: (ids: string[]) => ipcRenderer.invoke("db:shortcuts:reorder", ids),
  },

  // ── PTY Terminal ──
  pty: {
    create: (sessionId: string, opts?: { cols?: number; rows?: number }) =>
      ipcRenderer.invoke("pty:create", sessionId, opts),
    write: (sessionId: string, data: string) =>
      ipcRenderer.invoke("pty:write", sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.invoke("pty:resize", sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.invoke("pty:kill", sessionId),
    onData: (callback: (sessionId: string, data: string) => void) => {
      const handler = (_: unknown, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on("pty:data", handler);
      return () => {
        ipcRenderer.removeListener("pty:data", handler);
      };
    },
    onExit: (callback: (sessionId: string, code: number) => void) => {
      const handler = (_: unknown, sessionId: string, code: number) =>
        callback(sessionId, code);
      ipcRenderer.on("pty:exit", handler);
      return () => {
        ipcRenderer.removeListener("pty:exit", handler);
      };
    },
  },

  // ── AI CLI ──
  ai: {
    spawn: (sessionId: string, model: string, opts?: { cols?: number; rows?: number; systemPrompt?: string }) =>
      ipcRenderer.invoke("ai:spawn", sessionId, model, opts),
    write: (sessionId: string, data: string) =>
      ipcRenderer.invoke("ai:write", sessionId, data),
    writeHidden: (sessionId: string, data: string) =>
      ipcRenderer.invoke("ai:writeHidden", sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.invoke("ai:resize", sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.invoke("ai:kill", sessionId),
    onData: (callback: (sessionId: string, data: string) => void) => {
      const handler = (_: unknown, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on("ai:data", handler);
      return () => {
        ipcRenderer.removeListener("ai:data", handler);
      };
    },
    onExit: (callback: (sessionId: string, code: number) => void) => {
      const handler = (_: unknown, sessionId: string, code: number) =>
        callback(sessionId, code);
      ipcRenderer.on("ai:exit", handler);
      return () => {
        ipcRenderer.removeListener("ai:exit", handler);
      };
    },
    checkAvailable: (model: string) => ipcRenderer.invoke("ai:checkAvailable", model),
  },

  // ── AI Chat (non-TUI mode) ──
  aiChat: {
    send: (sessionId: string, message: string) =>
      ipcRenderer.invoke("ai-chat:send", sessionId, message),
    abort: (sessionId: string) =>
      ipcRenderer.invoke("ai-chat:abort", sessionId),
    clear: (sessionId: string) =>
      ipcRenderer.invoke("ai-chat:clear", sessionId),
    onChunk: (callback: (sessionId: string, chunk: string) => void) => {
      const handler = (_: unknown, sessionId: string, chunk: string) =>
        callback(sessionId, chunk);
      ipcRenderer.on("ai-chat:chunk", handler);
      return () => { ipcRenderer.removeListener("ai-chat:chunk", handler); };
    },
    onDone: (callback: (sessionId: string) => void) => {
      const handler = (_: unknown, sessionId: string) => callback(sessionId);
      ipcRenderer.on("ai-chat:done", handler);
      return () => { ipcRenderer.removeListener("ai-chat:done", handler); };
    },
    onError: (callback: (sessionId: string, error: string) => void) => {
      const handler = (_: unknown, sessionId: string, error: string) =>
        callback(sessionId, error);
      ipcRenderer.on("ai-chat:error", handler);
      return () => { ipcRenderer.removeListener("ai-chat:error", handler); };
    },
  },

  // ── Dot Art ──
  dotart: {
    getAll: (category?: string) => ipcRenderer.invoke("dotart:getAll", category),
    add: (t: { name: string; grid_size: number; pixels: string; category: string }) =>
      ipcRenderer.invoke("dotart:add", t),
    remove: (id: string) => ipcRenderer.invoke("dotart:remove", id),
  },

  // ── OAuth ──
  oauth: {
    getAll: () => ipcRenderer.invoke("oauth:getAll"),
    connect: (service: string) => ipcRenderer.invoke("oauth:connect", service),
    disconnect: (service: string, mcpName?: string) =>
      ipcRenderer.invoke("oauth:disconnect", service, mcpName),
    getStatus: (service: string) => ipcRenderer.invoke("oauth:getStatus", service),
    refresh: (service: string) => ipcRenderer.invoke("oauth:refresh", service),
    connectWithToken: (service: string, mcpName: string, mcpPackage: string, env: Record<string, string>, account?: string) =>
      ipcRenderer.invoke("oauth:connectWithToken", service, mcpName, mcpPackage, env, account),
  },

  // ── MCP ──
  mcp: {
    list: () => ipcRenderer.invoke("mcp:list"),
    add: (name: string, npmPackage: string, env?: Record<string, string>) =>
      ipcRenderer.invoke("mcp:add", name, npmPackage, env),
    addHttp: (name: string, url: string) => ipcRenderer.invoke("mcp:addHttp", name, url),
    remove: (name: string) => ipcRenderer.invoke("mcp:remove", name),
    discover: () => ipcRenderer.invoke("mcp:discover"),
    import: (names: string[]) => ipcRenderer.invoke("mcp:import", names),
  },

  // ── File System ──
  fs: {
    listDesktopFiles: () => ipcRenderer.invoke("fs:listDesktopFiles"),
    openFile: (name: string) => ipcRenderer.invoke("fs:openFile", name),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },

  // ── Window Controls ──
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    openExternal: (url: string) => ipcRenderer.invoke("window:openExternal", url),
    setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke("window:setAutoLaunch", enabled),
    onBlur: (cb: () => void) => {
      ipcRenderer.on("window:blur", cb);
      return () => { ipcRenderer.removeListener("window:blur", cb); };
    },
    onFocus: (cb: () => void) => {
      ipcRenderer.on("window:focus", cb);
      return () => { ipcRenderer.removeListener("window:focus", cb); };
    },
  },
};

contextBridge.exposeInMainWorld("deskerAPI", api);
