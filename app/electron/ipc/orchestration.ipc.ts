import { ipcMain, type BrowserWindow } from "electron";
import * as orchestration from "../services/orchestration.service";
import * as db from "../services/db.service";

export function registerOrchestrationHandlers(getWindow: () => BrowserWindow | null) {
  ipcMain.handle("orchestration:spawnChild", (_e, opts) => {
    return orchestration.spawnChildAgent(opts);
  });

  ipcMain.handle("orchestration:getStatus", (_e, sessionId: string) => {
    return orchestration.getAgentStatus(sessionId);
  });

  ipcMain.handle("orchestration:getResult", (_e, sessionId: string) => {
    return orchestration.getAgentResult(sessionId);
  });

  ipcMain.handle("orchestration:sendToAgent", (_e, sessionId: string, message: string, fromId?: string) => {
    return orchestration.sendToAgent(sessionId, message, fromId);
  });

  ipcMain.handle("orchestration:getChildren", (_e, parentSessionId: string) => {
    return db.getChildSessions(parentSessionId);
  });

  ipcMain.handle("orchestration:getMessages", (_e, sessionId: string) => {
    return db.getAgentMessages(sessionId);
  });

  ipcMain.handle("orchestration:updateStatus", (_e, sessionId: string, status: string, result?: string) => {
    orchestration.updateAgentStatus(sessionId, status, result);
  });

  // Push events to renderer
  const emitter = orchestration.getOrchestrationEmitter();
  emitter.on("statusChanged", (sessionId: string, status: string) => {
    const win = getWindow();
    if (win) win.webContents.send("orchestration:statusChanged", sessionId, status);
  });
}
