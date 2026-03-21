import { create } from "zustand";
import { getPluginConfig, PLUGIN_CONFIGS } from "../config/pluginConfigs";

export interface McpConnection {
  id: string;
  service: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: string | null;
  userEmail: string | null;
  connectedAt: string;
}

interface PluginViewModel {
  connections: Record<string, McpConnection>;
  connecting: string | null;
  loading: boolean;
  error: string | null;
  tokenModalService: string | null;

  loadConnections: () => Promise<void>;
  connect: (service: string) => void;
  connectWithToken: (service: string, envValues: Record<string, string>, account?: string) => Promise<void>;
  disconnect: (service: string) => Promise<void>;
  openTokenModal: (service: string) => void;
  closeTokenModal: () => void;
  clearError: () => void;
}

function toModel(row: {
  id: string;
  service: string;
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_at: string | null;
  user_email: string | null;
  connected_at: string;
}): McpConnection {
  return {
    id: row.id,
    service: row.service,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenType: row.token_type,
    expiresAt: row.expires_at,
    userEmail: row.user_email,
    connectedAt: row.connected_at,
  };
}

export const usePluginVM = create<PluginViewModel>((set, get) => ({
  connections: {},
  connecting: null,
  loading: false,
  error: null,
  tokenModalService: null,

  loadConnections: async () => {
    set({ loading: true });
    try {
      // 1) DB에 저장된 연결 정보
      const rows = await window.deskerAPI.oauth.getAll();
      const connections: Record<string, McpConnection> = {};
      for (const row of rows) {
        const conn = toModel(row);
        connections[conn.service] = conn;
      }

      // 2) ~/.claude/settings.json의 mcpServers 확인 → DB에 없지만 로컬에 있으면 반영
      try {
        const mcpServers = await window.deskerAPI.mcp.list();
        const mcpNames = Object.keys(mcpServers);
        for (const config of PLUGIN_CONFIGS) {
          if (!connections[config.name] && mcpNames.includes(config.mcpName)) {
            connections[config.name] = {
              id: `local-${config.mcpName}`,
              service: config.name,
              accessToken: "mcp-local",
              refreshToken: null,
              tokenType: "MCP",
              expiresAt: null,
              userEmail: null,
              connectedAt: new Date().toISOString(),
            };
          }
        }
      } catch {
        // mcp.list 실패해도 DB 연결은 유지
      }

      set({ connections, loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  connect: (service) => {
    const config = getPluginConfig(service);
    if (!config) {
      set({ error: `${service}: 지원하지 않는 서비스입니다.` });
      return;
    }

    if (config.authType === "token") {
      set({ tokenModalService: service });
    } else {
      // OAuth 방식 (Google 등) — 기존 플로우
      set({ connecting: service, error: null });
      window.deskerAPI.oauth
        .connect(service)
        .then(() => get().loadConnections())
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          set({ error: `${service} 연결 실패: ${msg}` });
        })
        .finally(() => set({ connecting: null }));
    }
  },

  connectWithToken: async (service, envValues, account) => {
    const config = getPluginConfig(service);
    if (!config) return;

    set({ connecting: service, error: null, tokenModalService: null });
    try {
      const env = config.buildEnv ? config.buildEnv(envValues) : envValues;
      await window.deskerAPI.oauth.connectWithToken(service, config.mcpName, config.mcpPackage, env, account);
      await get().loadConnections();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: `${service} 연결 실패: ${msg}` });
    } finally {
      set({ connecting: null });
    }
  },

  disconnect: async (service) => {
    const config = getPluginConfig(service);
    try {
      await window.deskerAPI.oauth.disconnect(service, config?.mcpName);
      set((s) => {
        const connections = { ...s.connections };
        delete connections[service];
        return { connections };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: `연결 해제 실패: ${msg}` });
    }
  },

  openTokenModal: (service) => set({ tokenModalService: service }),
  closeTokenModal: () => set({ tokenModalService: null }),
  clearError: () => set({ error: null }),
}));
