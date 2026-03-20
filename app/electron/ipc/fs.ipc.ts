import type { IpcMain } from "electron";
import { listDesktopFiles, openDesktopFile } from "../services/fs.service";

export function registerFsHandlers(ipcMain: IpcMain) {
  ipcMain.handle("fs:listDesktopFiles", () => listDesktopFiles());
  ipcMain.handle("fs:openFile", (_, name: string) => openDesktopFile(name));
}
