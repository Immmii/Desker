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

  ipcMain.handle("oauth:getStatus", async (_, service: string) => {
    const conn = await oauthService.getConnection(service);
    return conn ?? null;
  });

  ipcMain.handle("oauth:refresh", async (_, service: string) => {
    const success = await oauthService.refreshToken(service);
    if (!success) return null;
    // 갱신된 토큰 정보를 반환
    const conn = oauthService.getConnectionSync(service) as {
      access_token?: string;
      expires_at?: string;
    } | undefined;
    return conn ? { access_token: conn.access_token, expires_at: conn.expires_at ?? null } : null;
  });

  ipcMain.handle(
    "oauth:connectWithToken",
    async (_, service: string, mcpName: string, mcpPackage: string, env: Record<string, string>, account?: string) => {
      // 이미 등록된 MCP 서버면 env만 직접 수정, 아니면 새로 추가
      const existing = await mcpService.list();
      if (existing[mcpName]) {
        await mcpService.updateEnv(mcpName, env);
      } else {
        await mcpService.add(mcpName, mcpPackage, env);
      }
      mcpConnectionDb.upsert({
        service,
        access_token: "mcp-token",
        token_type: "MCP",
        user_email: account || undefined,
      });
    }
  );
}
