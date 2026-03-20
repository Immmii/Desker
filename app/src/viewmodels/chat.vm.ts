import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  timestamp: string;
}

interface ChatState {
  /** Messages per session */
  messagesBySession: Record<string, ChatMessage[]>;
  /** Whether the assistant is currently streaming */
  streamingSession: string | null;
  /** Current streaming buffer */
  streamBuffer: string;
}

interface ChatActions {
  addUserMessage: (sessionId: string, content: string) => void;
  startStreaming: (sessionId: string) => void;
  appendChunk: (sessionId: string, chunk: string) => void;
  finishStreaming: (sessionId: string) => void;
  addError: (sessionId: string, error: string) => void;
  clearSession: (sessionId: string) => void;
}

let msgId = 1;

export const useChatVM = create<ChatState & ChatActions>((set, get) => ({
  messagesBySession: {},
  streamingSession: null,
  streamBuffer: "",

  addUserMessage: (sessionId, content) =>
    set((s) => ({
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [
          ...(s.messagesBySession[sessionId] ?? []),
          {
            id: `msg-${msgId++}`,
            role: "user",
            content,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })),

  startStreaming: (sessionId) =>
    set((s) => ({
      streamingSession: sessionId,
      streamBuffer: "",
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [
          ...(s.messagesBySession[sessionId] ?? []),
          {
            id: `msg-${msgId++}`,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })),

  appendChunk: (sessionId, chunk) => {
    const newBuffer = get().streamBuffer + chunk;
    set((s) => {
      const msgs = s.messagesBySession[sessionId] ?? [];
      const updated = [...msgs];
      // Update last assistant message
      if (updated.length > 0) {
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: newBuffer };
        }
      }
      return {
        streamBuffer: newBuffer,
        messagesBySession: { ...s.messagesBySession, [sessionId]: updated },
      };
    });
  },

  finishStreaming: (_sessionId) =>
    set({ streamingSession: null, streamBuffer: "" }),

  addError: (sessionId, error) =>
    set((s) => ({
      streamingSession: null,
      streamBuffer: "",
      messagesBySession: {
        ...s.messagesBySession,
        [sessionId]: [
          ...(s.messagesBySession[sessionId] ?? []),
          {
            id: `msg-${msgId++}`,
            role: "error",
            content: error,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })),

  clearSession: (sessionId) =>
    set((s) => {
      const copy = { ...s.messagesBySession };
      delete copy[sessionId];
      return { messagesBySession: copy };
    }),
}));
