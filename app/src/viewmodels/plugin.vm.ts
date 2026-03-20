import { create } from "zustand";

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

  loadConnections: () => Promise<void>;
  connect: (service: string) => Promise<void>;
  disconnect: (service: string) => Promise<void>;
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

  loadConnections: async () => {
    set({ loading: true });
    try {
      const rows = await window.deskerAPI.oauth.getAll();
      const connections: Record<string, McpConnection> = {};
      for (const row of rows) {
        const conn = toModel(row);
        connections[conn.service] = conn;
      }
      set({ connections, loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },

  connect: async (service) => {
    set({ connecting: service, error: null });
    try {
      await window.deskerAPI.oauth.connect(service);
      await get().loadConnections();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: `${service} 연결 실패: ${msg}` });
    } finally {
      set({ connecting: null });
    }
  },

  disconnect: async (service) => {
    try {
      await window.deskerAPI.oauth.disconnect(service);
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

  clearError: () => set({ error: null }),
}));
