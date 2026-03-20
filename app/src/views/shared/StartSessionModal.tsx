import { useState, useEffect, type ReactNode } from "react";
import { useAiVM } from "../../viewmodels/ai.vm";
import type { TerminalMode, AiModel } from "../../viewmodels/session.vm";

// ── Option Icons (SVG) ──
function ShellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="16" height="14" rx="3" />
      <polyline points="6,8 9,11 6,14" />
      <line x1="11" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function ClaudeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L12 7.5L18 10L12 12.5L10 18L8 12.5L2 10L8 7.5L10 2Z" fill="var(--color-accent)" />
    </svg>
  );
}

function ChatGPTIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="#10a37f" strokeWidth="1.5" />
      <path d="M7 10.5L9 12.5L13.5 7.5" stroke="#10a37f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface StartSessionModalProps {
  taskTitle: string;
  onStart: (mode: TerminalMode, aiModel?: AiModel) => void;
  onClose: () => void;
}

export default function StartSessionModal({ taskTitle, onStart, onClose }: StartSessionModalProps) {
  const { claudeAvailable, chatgptAvailable, checkAvailability } = useAiVM();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAvailability().finally(() => setChecking(false));
  }, [checkAvailability]);

  const options: { mode: TerminalMode; aiModel?: AiModel; label: string; icon: ReactNode; desc: string; available: boolean }[] = [
    {
      mode: "shell",
      label: "Shell",
      icon: <ShellIcon />,
      desc: "zsh 터미널 세션",
      available: true,
    },
    {
      mode: "ai",
      aiModel: "claude",
      label: "Claude",
      icon: <ClaudeIcon />,
      desc: checking ? "확인 중..." : claudeAvailable ? "Claude CLI 연결됨" : "claude CLI 미설치",
      available: claudeAvailable,
    },
    {
      mode: "ai",
      aiModel: "chatgpt",
      label: "ChatGPT",
      icon: <ChatGPTIcon />,
      desc: checking ? "확인 중..." : chatgptAvailable ? "ChatGPT CLI 연결됨" : "chatgpt CLI 미설치",
      available: chatgptAvailable,
    },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: 360, padding: 24, borderRadius: 16,
          background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }} className="text-text-primary">
          세션 시작
        </h3>
        <p style={{ fontSize: 13, marginBottom: 18 }} className="text-text-secondary">
          {taskTitle}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                if (opt.mode === "ai" && !opt.available) return;
                onStart(opt.mode, opt.aiModel);
              }}
              disabled={opt.mode === "ai" && !opt.available && !checking}
              style={{
                padding: "14px 16px", borderRadius: 12, textAlign: "left",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-primary)",
                opacity: (opt.mode === "ai" && !opt.available && !checking) ? 0.4 : 1,
                cursor: (opt.mode === "ai" && !opt.available && !checking) ? "not-allowed" : "pointer",
              }}
              className="hover:border-accent/50 transition-colors group"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {opt.icon}
                </div>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary group-hover:text-accent transition-colors">
                    {opt.label}
                  </span>
                  <p style={{ fontSize: 12, marginTop: 2 }} className="text-text-secondary">
                    {opt.desc}
                  </p>
                </div>
              </div>
            </button>
          ))}
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
      </div>
    </div>
  );
}
