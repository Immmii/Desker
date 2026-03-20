import { create } from "zustand";

export type AiModel = "claude" | "chatgpt";

interface AiViewModel {
  selectedModel: AiModel;
  availableModels: AiModel[];
  claudeAvailable: boolean;
  chatgptAvailable: boolean;

  setModel: (model: AiModel) => void;
  checkAvailability: () => Promise<void>;
}

export const useAiVM = create<AiViewModel>((set) => ({
  selectedModel: "claude",
  availableModels: ["claude", "chatgpt"],
  claudeAvailable: false,
  chatgptAvailable: false,

  setModel: (model) => set({ selectedModel: model }),

  checkAvailability: async () => {
    const [claude, chatgpt] = await Promise.all([
      window.deskerAPI.ai.checkAvailable("claude"),
      window.deskerAPI.ai.checkAvailable("chatgpt"),
    ]);
    set({ claudeAvailable: claude, chatgptAvailable: chatgpt });
  },
}));
