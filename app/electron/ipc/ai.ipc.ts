import type { IpcMain, BrowserWindow } from "electron";
import { spawnAiCli, writeToAi, killAi, checkAiAvailable, getAi, addSuppressFilter, filterSuppressed } from "../services/ai.service";
import type { AiModel } from "../services/ai.service";

export function registerAiHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle(
    "ai:spawn",
    (_, sessionId: string, model: string, opts?: { cols?: number; rows?: number }) => {
      const aiProcess = spawnAiCli(sessionId, model as AiModel, opts);

      aiProcess.onData((data) => {
        const filtered = filterSuppressed(sessionId, data);
        if (filtered) {
          getWindow()?.webContents.send("ai:data", sessionId, filtered);
        }
      });

      aiProcess.onExit(({ exitCode }) => {
        getWindow()?.webContents.send("ai:exit", sessionId, exitCode);
      });
    }
  );

  ipcMain.handle("ai:write", (_, sessionId: string, data: string) => {
    writeToAi(sessionId, data);
  });

  // Write data to AI but suppress its echo from terminal display
  ipcMain.handle("ai:writeHidden", (_, sessionId: string, data: string) => {
    addSuppressFilter(sessionId, data);
    writeToAi(sessionId, data);
  });

  ipcMain.handle("ai:resize", (_, sessionId: string, cols: number, rows: number) => {
    const p = getAi(sessionId);
    if (p) p.resize(cols, rows);
  });

  ipcMain.handle("ai:kill", (_, sessionId: string) => {
    killAi(sessionId);
  });

  ipcMain.handle("ai:checkAvailable", (_, model: string) => {
    return checkAiAvailable(model as AiModel);
  });
}
