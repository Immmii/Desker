import type { IpcMain } from "electron";
import { oauthService } from "../services/oauth.service";
import { mcpConnectionDb } from "../services/db.service";
import { mcpService } from "../services/mcp.service";

export function registerOAuthHandlers(ipcMain: IpcMain) {
  ipcMain.handle("oauth:connect", async (_, service: string) => {
    try {
      return await oauthService.startOAuthFlow(service);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("oauth:disconnect", async (_, service: string, mcpName?: string) => {
    oauthService.disconnect(service);
    if (mcpName) {
      try { await mcpService.remove(mcpName); } catch { /* ignore */ }
    }
  });

  ipcMain.handle("oauth:getAll", () => oauthService.getAllConnections());

  ipcMain.handle("oauth:getStatus", (_, service: string) =>
    oauthService.getConnection(service) ?? null
  );

  ipcMain.handle(
    "oauth:connectWithToken",
    async (_, service: string, mcpName: string, mcpPackage: string, env: Record<string, string>, account?: string) => {
      // 기존 동일 이름 MCP 서버 제거 후 재등록 (토큰 갱신 시 덮어쓰기)
      try { await mcpService.remove(mcpName); } catch { /* 없으면 무시 */ }
      await mcpService.add(mcpName, mcpPackage, env);
      mcpConnectionDb.upsert({
        service,
        access_token: "mcp-token",
        token_type: "MCP",
        user_email: account || undefined,
      });
    }
  );
}
