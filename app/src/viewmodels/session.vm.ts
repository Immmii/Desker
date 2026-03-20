import { create } from "zustand";

export type TerminalMode = "shell" | "ai";
export type AiModel = "claude" | "chatgpt";

export interface TerminalSession {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  projectIcon: string;
  state: "idle" | "working" | "error";
  startedAt: string;
  mode: TerminalMode;
  aiModel?: AiModel;
}

interface SessionViewModel {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  createSession: (
    session: Omit<TerminalSession, "id" | "state" | "startedAt">
  ) => string;
  setActiveSession: (id: string | null) => void;
  removeSession: (id: string) => void;
  updateSessionState: (id: string, state: TerminalSession["state"]) => void;
}

let nextId = 1;

export const useSessionVM = create<SessionViewModel>((set) => ({
  sessions: [],
  activeSessionId: null,

  createSession: (session) => {
    const id = `session-${nextId++}`;
    set((s) => ({
      sessions: [
        ...s.sessions,
        {
          ...session,
          id,
          state: "working",
          startedAt: new Date().toISOString(),
        },
      ],
      activeSessionId: id,
    }));
    return id;
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((ss) => ss.id !== id),
      activeSessionId:
        s.activeSessionId === id
          ? s.sessions.find((ss) => ss.id !== id)?.id ?? null
          : s.activeSessionId,
    })),

  updateSessionState: (id, state) =>
    set((s) => ({
      sessions: s.sessions.map((ss) =>
        ss.id === id ? { ...ss, state } : ss
      ),
    })),
}));
