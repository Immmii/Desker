import type { IpcMain, BrowserWindow } from "electron";
import { sendChatMessage, abortChat, clearChatSession } from "../services/ai-chat.service";

export function registerAiChatHandlers(
  ipcMain: IpcMain,
  getWindow: () => BrowserWindow | null
) {
  ipcMain.handle(
    "ai-chat:send",
    (_, sessionId: string, message: string) => {
      sendChatMessage(
        sessionId,
        message,
        (chunk) => {
          getWindow()?.webContents.send("ai-chat:chunk", sessionId, chunk);
        },
        () => {
          getWindow()?.webContents.send("ai-chat:done", sessionId);
        },
        (err) => {
          getWindow()?.webContents.send("ai-chat:error", sessionId, err);
        }
      );
    }
  );

  ipcMain.handle("ai-chat:abort", (_, sessionId: string) => {
    abortChat(sessionId);
  });

  ipcMain.handle("ai-chat:clear", (_, sessionId: string) => {
    clearChatSession(sessionId);
  });
}
