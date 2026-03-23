import type { IpcMain } from "electron";
import { mcpService } from "../services/mcp.service";

export function registerMcpHandlers(ipcMain: IpcMain) {
  ipcMain.handle("mcp:list", async () => {
    try {
      return await mcpService.list();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(
    "mcp:add",
    async (_, name: string, npmPackage: string, env?: Record<string, string>) => {
      try {
        await mcpService.add(name, npmPackage, env);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err));
      }
    }
  );

  ipcMain.handle("mcp:addHttp", async (_, name: string, url: string) => {
    try {
      await mcpService.addHttp(name, url);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("mcp:remove", async (_, name: string) => {
    try {
      await mcpService.remove(name);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("mcp:discover", async () => {
    try {
      return await mcpService.discover();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle("mcp:import", async (_, names: string[]) => {
    try {
      await mcpService.importServers(names);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : String(err));
    }
  });
}
