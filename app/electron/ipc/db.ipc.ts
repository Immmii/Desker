import type { IpcMain } from "electron";
import { projectDb, taskDb, roomObjectDb } from "../services/db.service";

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

  // ── Room Objects ──
  ipcMain.handle("db:roomObjects:getAll", () => roomObjectDb.getAll());

  ipcMain.handle("db:roomObjects:save", (_, objects) =>
    roomObjectDb.save(objects)
  );
}
