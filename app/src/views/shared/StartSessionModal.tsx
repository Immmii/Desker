import { useState, useEffect } from "react";
import { useAiVM } from "../../viewmodels/ai.vm";
import type { TerminalMode, AiModel, AgentRole, AgentEnvironment } from "../../viewmodels/session.vm";
import { AGENT_PRESETS } from "../../viewmodels/session.vm";

interface StartSessionModalProps {
  taskTitle: string;
  onStart: (mode: TerminalMode, aiModel?: AiModel, agentRole?: AgentRole, agentEnv?: AgentEnvironment) => void;
  onClose: () => void;
}

export default function StartSessionModal({ taskTitle, onStart, onClose }: StartSessionModalProps) {
  const { claudeAvailable, chatgptAvailable, checkAvailability } = useAiVM();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<"mode" | "agent">("mode");
  const [selectedMode, setSelectedMode] = useState<TerminalMode>("ai");
  const [selectedAiModel, setSelectedAiModel] = useState<AiModel>("claude");
  const [selectedEnv, setSelectedEnv] = useState<AgentEnvironment>("general");

  useEffect(() => {
    checkAvailability().finally(() => setChecking(false));
  }, [checkAvailability]);

  const handleModeSelect = (mode: TerminalMode, aiModel?: AiModel) => {
    if (mode === "shell") {
      onStart(mode);
      return;
    }
    setSelectedMode(mode);
    setSelectedAiModel(aiModel ?? "claude");
    setStep("agent");
  };

  const handleAgentSelect = (role: AgentRole, env: AgentEnvironment) => {
    onStart(selectedMode, selectedAiModel, role, env);
  };

  const handleSkipAgent = () => {
    onStart(selectedMode, selectedAiModel);
  };

  const generalPresets = AGENT_PRESETS.filter((p) => p.environment === "general");
  const devPresets = AGENT_PRESETS.filter((p) => p.environment === "development");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: step === "agent" ? 480 : 360, padding: 24, borderRadius: 16,
          background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          transition: "width 0.2s",
        }}
      >
        {step === "mode" ? (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }} className="text-text-primary">
              세션 시작
            </h3>
            <p style={{ fontSize: 13, marginBottom: 18 }} className="text-text-secondary">
              {taskTitle}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Shell */}
              <button
                onClick={() => handleModeSelect("shell")}
                style={{
                  padding: "14px 16px", borderRadius: 12, textAlign: "left",
                  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)", cursor: "pointer",
                }}
                className="hover:border-accent/50 transition-colors group"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="16" height="14" rx="3" />
                    <polyline points="6,8 9,11 6,14" />
                    <line x1="11" y1="14" x2="14" y2="14" />
                  </svg>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">Shell</span>
                    <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">zsh 터미널 세션</p>
                  </div>
                </div>
              </button>

              {/* Claude */}
              <button
                onClick={() => { if (claudeAvailable) handleModeSelect("ai", "claude"); }}
                disabled={!claudeAvailable && !checking}
                style={{
                  padding: "14px 16px", borderRadius: 12, textAlign: "left",
                  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                  opacity: (!claudeAvailable && !checking) ? 0.4 : 1,
                  cursor: (!claudeAvailable && !checking) ? "not-allowed" : "pointer",
                }}
                className="hover:border-accent/50 transition-colors group"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L12 7.5L18 10L12 12.5L10 18L8 12.5L2 10L8 7.5L10 2Z" fill="var(--color-accent)" />
                  </svg>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">Claude</span>
                    <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">
                      {checking ? "확인 중..." : claudeAvailable ? "Claude CLI 연결됨 → 에이전트 선택" : "claude CLI 미설치"}
                    </p>
                  </div>
                </div>
              </button>

              {/* ChatGPT */}
              <button
                onClick={() => { if (chatgptAvailable) handleModeSelect("ai", "chatgpt"); }}
                disabled={!chatgptAvailable && !checking}
                style={{
                  padding: "14px 16px", borderRadius: 12, textAlign: "left",
                  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                  opacity: (!chatgptAvailable && !checking) ? 0.4 : 1,
                  cursor: (!chatgptAvailable && !checking) ? "not-allowed" : "pointer",
                }}
                className="hover:border-accent/50 transition-colors group"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="#10a37f" strokeWidth="1.5" />
                    <path d="M7 10.5L9 12.5L13.5 7.5" stroke="#10a37f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">ChatGPT</span>
                    <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">
                      {checking ? "확인 중..." : chatgptAvailable ? "ChatGPT CLI 연결됨 → 에이전트 선택" : "chatgpt CLI 미설치"}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 10, fontSize: 13,
                border: "1px solid var(--color-border)", background: "transparent",
                color: "var(--color-text-secondary)", cursor: "pointer",
              }}
            >
              취소
            </button>
          </>
        ) : (
          <>
            {/* Step 2: Agent role selection */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <button
                onClick={() => setStep("mode")}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: "none",
                  background: "transparent", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                className="text-text-secondary hover:bg-bg-hover"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="10,3 5,8 10,13" />
                </svg>
              </button>
              <h3 style={{ fontSize: 16, fontWeight: 700 }} className="text-text-primary">
                에이전트 선택
              </h3>
            </div>
            <p style={{ fontSize: 13, marginBottom: 14 }} className="text-text-secondary">
              {selectedAiModel === "claude" ? "Claude" : "ChatGPT"} · {taskTitle}
            </p>

            {/* Environment tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              <button
                onClick={() => setSelectedEnv("general")}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: selectedEnv === "general" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                  background: selectedEnv === "general" ? "var(--color-accent-alpha, rgba(116,185,255,0.1))" : "transparent",
                  color: selectedEnv === "general" ? "var(--color-accent)" : "var(--color-text-secondary)",
                  cursor: "pointer", fontFamily: "Pretendard, sans-serif",
                }}
              >
                📋 일반
              </button>
              <button
                onClick={() => setSelectedEnv("development")}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: selectedEnv === "development" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                  background: selectedEnv === "development" ? "var(--color-accent-alpha, rgba(116,185,255,0.1))" : "transparent",
                  color: selectedEnv === "development" ? "var(--color-accent)" : "var(--color-text-secondary)",
                  cursor: "pointer", fontFamily: "Pretendard, sans-serif",
                }}
              >
                💻 개발
              </button>
            </div>

            {/* Agent list */}
            <div style={{ display: "grid", gridTemplateColumns: selectedEnv === "development" ? "1fr 1fr" : "1fr", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {(selectedEnv === "general" ? generalPresets : devPresets).map((preset) => (
                <button
                  key={preset.role}
                  onClick={() => handleAgentSelect(preset.role, preset.environment)}
                  style={{
                    padding: "12px 14px", borderRadius: 10, textAlign: "left",
                    border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  className="hover:border-accent/50 group"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${preset.color}20`,
                    }}>
                      {preset.icon}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">
                        {preset.label}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 1 }} className="text-text-secondary">
                        {preset.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Skip agent */}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                onClick={handleSkipAgent}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
                  border: "1px solid var(--color-border)", background: "transparent",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                에이전트 없이 시작
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
                  border: "1px solid var(--color-border)", background: "transparent",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                취소
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
