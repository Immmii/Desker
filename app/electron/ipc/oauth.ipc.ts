import type { IpcMain } from "electron";
import { oauthService } from "../services/oauth.service";

export function registerOAuthHandlers(ipcMain: IpcMain) {
  ipcMain.handle("oauth:connect", async (_, service: string) => {
    try {
      return await oauthService.startOAuthFlow(service);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("oauth:disconnect", (_, service: string) =>
    oauthService.disconnect(service)
  );

  ipcMain.handle("oauth:getAll", () => oauthService.getAllConnections());

  ipcMain.handle("oauth:getStatus", (_, service: string) =>
    oauthService.getConnection(service) ?? null
  );
}
