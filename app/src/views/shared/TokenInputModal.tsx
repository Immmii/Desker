import { useState } from "react";
import type { PluginConfig } from "../../config/pluginConfigs";
import { ServiceIcon } from "./ServiceIcons";

interface TokenInputModalProps {
  config: PluginConfig;
  onSubmit: (envValues: Record<string, string>, account: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function TokenInputModal({ config, onSubmit, onClose, loading }: TokenInputModalProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(config.envVars.map((v) => [v.key, ""]))
  );
  const [account, setAccount] = useState("");

  const allFilled = config.envVars.every((v) => values[v.key]?.trim());

  const handleSubmit = () => {
    if (!allFilled || loading) return;
    onSubmit(values, account.trim());
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: 440, maxHeight: "80vh", overflowY: "auto",
          padding: 28, borderRadius: 16,
          background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ServiceIcon name={config.name} />
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700 }} className="text-text-primary">
              {config.name} 연결
            </h3>
            <p style={{ fontSize: 13, marginTop: 2 }} className="text-text-secondary">
              API 토큰으로 연결합니다
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            padding: "14px 16px", borderRadius: 12, marginBottom: 20,
            background: "var(--color-bg-primary)", border: "1px solid var(--color-border)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }} className="text-text-primary">
            토큰 발급 방법
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {config.tokenInstructions.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span
                  style={{
                    width: 20, height: 20, borderRadius: "50%", fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                  className="bg-accent/15 text-accent"
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 12.5, lineHeight: 1.6 }} className="text-text-secondary">
                  {step}
                </span>
              </div>
            ))}
          </div>
          {config.tokenUrl && (
            <button
              onClick={() => window.deskerAPI.window.openExternal(config.tokenUrl)}
              style={{
                marginTop: 12, fontSize: 12.5, fontWeight: 600,
                padding: "6px 14px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "transparent",
                cursor: "pointer",
              }}
              className="text-accent hover:bg-accent/10 transition-colors"
            >
              토큰 발급 페이지 열기 ↗
            </button>
          )}
        </div>

        {/* Token Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {config.envVars.map((envVar) => (
            <div key={envVar.key}>
              <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }} className="text-text-primary">
                {envVar.label}
              </label>
              <input
                type="password"
                value={values[envVar.key] || ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [envVar.key]: e.target.value }))}
                placeholder={envVar.placeholder}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                style={{
                  width: "100%", fontSize: 13, padding: "10px 14px", borderRadius: 10,
                  border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)", outline: "none",
                  fontFamily: "monospace",
                }}
              />
            </div>
          ))}
        </div>

        {/* Account ID */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }} className="text-text-primary">
            계정 (선택)
          </label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="이메일 또는 사용자명"
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            style={{
              width: "100%", fontSize: 13, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
              color: "var(--color-text-primary)", outline: "none",
            }}
          />
          <p style={{ fontSize: 11.5, marginTop: 5 }} className="text-text-secondary">
            연결 후 플러그인 카드에 표시됩니다
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={!allFilled || loading}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: "none", cursor: allFilled && !loading ? "pointer" : "not-allowed",
              opacity: allFilled && !loading ? 1 : 0.5,
            }}
            className="bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            {loading ? "연결 중..." : "연결"}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14,
              border: "1px solid var(--color-border)", background: "transparent",
              cursor: "pointer",
            }}
            className="text-text-secondary hover:bg-bg-hover transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
