import type { IpcMain } from "electron";
import { projectDb, taskDb, roomObjectDb, taskTodoDb, agentContextDb, timetableBlockDb, habitDb, shortcutDb } from "../services/db.service";

export function registerDbHandlers(ipcMain: IpcMain) {
  // ── Projects ──
  ipcMain.handle("db:projects:getAll", () => projectDb.getAll());

  ipcMain.handle("db:projects:add", (_, p) => projectDb.add(p));

  ipcMain.handle("db:projects:update", (_, id: string, updates) =>
    projectDb.update(id, updates)
  );

  ipcMain.handle("db:projects:remove", (_, id: string) => projectDb.remove(id));

  // ── Tasks ──
  ipcMain.handle("db:tasks:getAll", (_, projectId?: string) =>
    taskDb.getAll(projectId)
  );

  ipcMain.handle("db:tasks:add", (_, t) => taskDb.add(t));

  ipcMain.handle("db:tasks:update", (_, id: string, updates) =>
    taskDb.update(id, updates)
  );

  ipcMain.handle("db:tasks:remove", (_, id: string) => taskDb.remove(id));

  // ── Task Todos ──
  ipcMain.handle("db:taskTodos:getAll", (_, taskId: string) =>
    taskTodoDb.getByTaskId(taskId)
  );

  ipcMain.handle("db:taskTodos:add", (_, t) => taskTodoDb.add(t));

  ipcMain.handle("db:taskTodos:update", (_, id: string, updates) =>
    taskTodoDb.update(id, updates)
  );

  ipcMain.handle("db:taskTodos:remove", (_, id: string) =>
    taskTodoDb.remove(id)
  );

  // ── Agent Contexts ──
  ipcMain.handle("db:agentContexts:save", (_, taskId: string, agentRole: string, content: string) =>
    agentContextDb.save(taskId, agentRole, content)
  );

  ipcMain.handle("db:agentContexts:getByTaskId", (_, taskId: string) =>
    agentContextDb.getByTaskId(taskId)
  );

  // ── Room Objects ──
  ipcMain.handle("db:roomObjects:getAll", () => roomObjectDb.getAll());

  ipcMain.handle("db:roomObjects:save", (_, objects) =>
    roomObjectDb.save(objects)
  );

  // ── Timetable Blocks ──
  ipcMain.handle("db:timetableBlocks:getByDate", (_, date: string) =>
    timetableBlockDb.getByDate(date)
  );

  ipcMain.handle("db:timetableBlocks:saveBatch", (_, date: string, blocks) =>
    timetableBlockDb.saveBatch(date, blocks)
  );

  ipcMain.handle("db:timetableBlocks:clearDate", (_, date: string) =>
    timetableBlockDb.clearDate(date)
  );

  // ── Habits ──
  ipcMain.handle("db:habits:getAll", () => habitDb.getAll());

  ipcMain.handle("db:habits:add", (_, name: string) => habitDb.add(name));

  ipcMain.handle("db:habits:remove", (_, id: string) => habitDb.remove(id));

  ipcMain.handle("db:habits:reorder", (_, id: string, sortOrder: number) =>
    habitDb.reorder(id, sortOrder)
  );

  ipcMain.handle("db:habitLogs:get", (_, weekStart: string, weekEnd: string) =>
    habitDb.getLogs(weekStart, weekEnd)
  );

  ipcMain.handle("db:habitLogs:toggle", (_, habitId: string, date: string) =>
    habitDb.toggleLog(habitId, date)
  );

  // ── Shortcuts ──
  ipcMain.handle("db:shortcuts:getAll", () => shortcutDb.getAll());

  ipcMain.handle("db:shortcuts:add", (_, name: string, url: string) =>
    shortcutDb.add(name, url)
  );

  ipcMain.handle("db:shortcuts:remove", (_, id: string) =>
    shortcutDb.remove(id)
  );

  ipcMain.handle("db:shortcuts:reorder", (_, ids: string[]) =>
    shortcutDb.reorder(ids)
  );
}
