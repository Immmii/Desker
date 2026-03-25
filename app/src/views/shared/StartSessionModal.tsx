import { useState, useEffect } from "react";
import { useAiVM } from "../../viewmodels/ai.vm";
import type { TerminalMode, AiModel, AgentRole, AgentEnvironment } from "../../viewmodels/session.vm";
import { AGENT_PRESETS } from "../../viewmodels/session.vm";

// ── Agent Role SVG Icons ──
function AgentIcon({ role, color, size = 18 }: { role: string; color: string; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (role) {
    case "task": // 타겟/체크
      return <svg {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill={color} /></svg>;
    case "research": // 돋보기+문서
      return <svg {...props}><circle cx="10" cy="10" r="6" /><line x1="14.5" y1="14.5" x2="20" y2="20" /><line x1="10" y1="7" x2="10" y2="13" /><line x1="7" y1="10" x2="13" y2="10" /></svg>;
    case "docs": // 문서+펜
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>;
    case "planning": // 설계도/클립보드
      return <svg {...props}><rect x="4" y="4" width="16" height="18" rx="2" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="12" y1="4" x2="12" y2="22" /><path d="M9 2h6v3H9z" fill={color} stroke={color} /></svg>;
    case "client": // 모니터+브러시
      return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /><path d="M7 8l3 3-3 3" /><line x1="12" y1="14" x2="17" y2="14" /></svg>;
    case "server": // 서버 랙
      return <svg {...props}><rect x="3" y="2" width="18" height="6" rx="1" /><rect x="3" y="10" width="18" height="6" rx="1" /><circle cx="7" cy="5" r="1" fill={color} /><circle cx="7" cy="13" r="1" fill={color} /><line x1="17" y1="18" x2="17" y2="22" /><line x1="7" y1="18" x2="7" y2="22" /></svg>;
    case "testing": // 비커/플라스크
      return <svg {...props}><path d="M9 3h6v5l4 9a1 1 0 0 1-.9 1.4H5.9A1 1 0 0 1 5 17l4-9V3" /><line x1="9" y1="3" x2="15" y2="3" strokeWidth="2.5" /><path d="M7 15h10" strokeDasharray="2 2" /></svg>;
    case "qa": // 체크 쉴드
      return <svg {...props}><path d="M12 2l8 4v6c0 5.5-3.8 8.2-8 10-4.2-1.8-8-4.5-8-10V6l8-4z" /><path d="M8 12l3 3 5-6" /></svg>;
    case "devops": // git branch + 기어
      return <svg {...props}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="6" cy="18" r="2" /><path d="M6 8v4c0 2 2 4 4 4h4" /><line x1="6" y1="8" x2="6" y2="16" /></svg>;
    case "security": // 자물쇠
      return <svg {...props}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /><circle cx="12" cy="16" r="1" fill={color} /></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 3" /></svg>;
  }
}

interface StartSessionModalProps {
  taskTitle: string;
  onStart: (mode: TerminalMode, aiModel?: AiModel, agentRole?: AgentRole, agentEnv?: AgentEnvironment) => void;
  onClose: () => void;
}

export default function StartSessionModal({ taskTitle, onStart, onClose }: StartSessionModalProps) {
  const { claudeAvailable, chatgptAvailable, checkAvailability } = useAiVM();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<"mode" | "agent" | "install-guide">("mode");
  const [selectedMode, setSelectedMode] = useState<TerminalMode>("ai");
  const [selectedAiModel, setSelectedAiModel] = useState<AiModel>("claude");
  const [selectedEnv, setSelectedEnv] = useState<AgentEnvironment>("general");
  const [guideModel, setGuideModel] = useState<AiModel>("claude");
  const isWin = window.deskerAPI.system.platform === "win32";

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
          position: "relative", width: step === "agent" ? 480 : step === "install-guide" ? 400 : 360, padding: 24, borderRadius: 16,
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
                    <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">{isWin ? "PowerShell 터미널 세션" : "zsh 터미널 세션"}</p>
                  </div>
                </div>
              </button>

              {/* Claude */}
              <button
                onClick={() => {
                  if (claudeAvailable) handleModeSelect("ai", "claude");
                  else if (!checking) { setGuideModel("claude"); setStep("install-guide"); }
                }}
                style={{
                  padding: "14px 16px", borderRadius: 12, textAlign: "left",
                  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                  cursor: checking ? "default" : "pointer",
                }}
                className="hover:border-accent/50 transition-colors group"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L12 7.5L18 10L12 12.5L10 18L8 12.5L2 10L8 7.5L10 2Z" fill={claudeAvailable || checking ? "var(--color-accent)" : "var(--color-text-secondary)"} opacity={claudeAvailable || checking ? 1 : 0.4} />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">Claude</span>
                    <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">
                      {checking ? "확인 중..." : claudeAvailable ? "Claude CLI 연결됨 → 에이전트 선택" : "미설치 — 클릭하여 설치 가이드 보기"}
                    </p>
                  </div>
                  {!checking && !claudeAvailable && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
                      <polyline points="9,6 15,12 9,18" />
                    </svg>
                  )}
                </div>
              </button>

              {/* ChatGPT */}
              <button
                onClick={() => {
                  if (chatgptAvailable) handleModeSelect("ai", "chatgpt");
                  else if (!checking) { setGuideModel("chatgpt"); setStep("install-guide"); }
                }}
                style={{
                  padding: "14px 16px", borderRadius: 12, textAlign: "left",
                  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                  cursor: checking ? "default" : "pointer",
                }}
                className="hover:border-accent/50 transition-colors group"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke={chatgptAvailable || checking ? "#10a37f" : "var(--color-text-secondary)"} strokeWidth="1.5" opacity={chatgptAvailable || checking ? 1 : 0.4} />
                    <path d="M7 10.5L9 12.5L13.5 7.5" stroke={chatgptAvailable || checking ? "#10a37f" : "var(--color-text-secondary)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={chatgptAvailable || checking ? 1 : 0.4} />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">ChatGPT</span>
                    <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">
                      {checking ? "확인 중..." : chatgptAvailable ? "ChatGPT CLI 연결됨 → 에이전트 선택" : "미설치 — 클릭하여 설치 가이드 보기"}
                    </p>
                  </div>
                  {!checking && !chatgptAvailable && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
                      <polyline points="9,6 15,12 9,18" />
                    </svg>
                  )}
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
        ) : step === "agent" ? (
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <line x1="8" y1="9" x2="16" y2="9" />
                    <line x1="8" y1="13" x2="14" y2="13" />
                    <line x1="8" y1="17" x2="11" y2="17" />
                  </svg>
                  일반
                </span>
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16,18 22,12 16,6" />
                    <polyline points="8,6 2,12 8,18" />
                    <line x1="14" y1="4" x2="10" y2="20" />
                  </svg>
                  개발
                </span>
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
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${preset.color}20`,
                    }}>
                      <AgentIcon role={preset.role} color={preset.color} size={18} />
                    </div>
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
        ) : step === "install-guide" ? (

          <>
            {/* Step: Install Guide */}
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
                {guideModel === "claude" ? "Claude Code" : "Codex CLI"} 설치 가이드
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
              {guideModel === "claude" ? (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }} className="text-text-secondary">
                    Claude Code CLI를 설치하면 AI 에이전트 기능을 사용할 수 있습니다.
                  </p>

                  {/* Step 1 */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-accent)" }}>1. npm으로 설치</div>
                    <code style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 12,
                      background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      npm install -g @anthropic-ai/claude-code
                    </code>
                  </div>

                  {/* Step 2 */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-accent)" }}>2. 설치 확인</div>
                    <code style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 12,
                      background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      claude --version
                    </code>
                  </div>

                  {/* Step 3 */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--color-accent)" }}>3. 인증</div>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }} className="text-text-secondary">
                      처음 실행 시 Anthropic 계정 로그인이 필요합니다.
                    </p>
                    <code style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginTop: 6,
                      background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      claude
                    </code>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, lineHeight: 1.6 }} className="text-text-secondary">
                    Codex CLI를 설치하면 ChatGPT AI 에이전트 기능을 사용할 수 있습니다.
                  </p>

                  {/* Step 1 */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#10a37f" }}>1. npm으로 설치</div>
                    <code style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 12,
                      background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      npm install -g @openai/codex
                    </code>
                  </div>

                  {/* Step 2 */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#10a37f" }}>2. 설치 확인</div>
                    <code style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 12,
                      background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      codex --version
                    </code>
                  </div>

                  {/* Step 3 */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--color-bg-primary)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#10a37f" }}>3. 인증</div>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }} className="text-text-secondary">
                      OpenAI API 키가 필요합니다. 환경 변수를 설정하세요.
                    </p>
                    <code style={{
                      display: "block", padding: "8px 12px", borderRadius: 6, fontSize: 12, marginTop: 6,
                      background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}>
                      {isWin ? "$env:OPENAI_API_KEY=\"sk-...\"" : "export OPENAI_API_KEY=\"sk-...\""}
                    </code>
                  </div>
                </>
              )}

              {/* Tip */}
              <div style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                background: "var(--color-accent-alpha, rgba(108,92,231,0.08))",
                border: "1px solid var(--color-accent)",
                borderColor: guideModel === "claude" ? "var(--color-accent)" : "#10a37f",
                color: "var(--color-text-secondary)",
              }}>
                설치 후 Desker를 재시작하면 자동으로 감지됩니다.
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => {
                  const url = guideModel === "claude"
                    ? "https://docs.anthropic.com/en/docs/claude-code/overview"
                    : "https://github.com/openai/codex";
                  window.deskerAPI.window.openExternal(url);
                }}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: "none",
                  background: guideModel === "claude" ? "var(--color-accent)" : "#10a37f",
                  color: "#fff", cursor: "pointer",
                }}
              >
                공식 문서 열기
              </button>
              <button
                onClick={() => setStep("mode")}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13,
                  border: "1px solid var(--color-border)", background: "transparent",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                돌아가기
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
