import type { IpcMain, BrowserWindow } from "electron";
import { createPty, writeToPty, resizePty, killPty } from "../services/pty.service";

export function registerPtyHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle(
    "pty:create",
    (_, sessionId: string, opts?: { cols?: number; rows?: number }) => {
      const ptyProcess = createPty(sessionId, opts);

      ptyProcess.onData((data) => {
        getWindow()?.webContents.send("pty:data", sessionId, data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        getWindow()?.webContents.send("pty:exit", sessionId, exitCode);
      });
    }
  );

  ipcMain.handle("pty:write", (_, sessionId: string, data: string) => {
    writeToPty(sessionId, data);
  });

  ipcMain.handle(
    "pty:resize",
    (_, sessionId: string, cols: number, rows: number) => {
      resizePty(sessionId, cols, rows);
    }
  );

  ipcMain.handle("pty:kill", (_, sessionId: string) => {
    killPty(sessionId);
  });
}
