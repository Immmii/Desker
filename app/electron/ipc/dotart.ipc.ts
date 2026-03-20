import type { IpcMain } from "electron";
import { dotArtDb } from "../services/db.service";

export function registerDotArtHandlers(ipcMain: IpcMain) {
  ipcMain.handle("dotart:getAll", (_, category?: string) =>
    dotArtDb.getAll(category)
  );

  ipcMain.handle("dotart:add", (_, t) => dotArtDb.add(t));

  ipcMain.handle("dotart:remove", (_, id: string) => dotArtDb.remove(id));
}
