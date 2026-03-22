import { useEffect, useState } from "react";
import { usePluginVM } from "../../viewmodels/plugin.vm";
import { PLUGIN_CONFIGS, getPluginConfig } from "../../config/pluginConfigs";
import TokenInputModal from "../shared/TokenInputModal";
import { ServiceIcon } from "../shared/ServiceIcons";

interface PluginDef {
  name: string;
  icon: string;
  desc: string;
  category: "추천" | "전체";
}

const PLUGINS: PluginDef[] = PLUGIN_CONFIGS.map((c) => ({
  name: c.name,
  icon: c.icon,
  desc: c.desc,
  category: c.category,
}));

function PluginCard({
  plugin,
  connected,
  connecting,
  userEmail,
  onConnect,
  onDisconnect,
  onTokenUpdate,
}: {
  plugin: PluginDef;
  connected: boolean;
  connecting: boolean;
  userEmail?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onTokenUpdate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 18px", borderRadius: 14,
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        transition: "border-color 0.15s", position: "relative",
      }}
      className="hover:border-accent/30"
    >
      <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ServiceIcon name={plugin.name} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }} className="text-text-primary">
          {plugin.name}
        </div>
        <div style={{ fontSize: 13, marginTop: 2 }} className="text-text-secondary truncate">
          {plugin.desc}
        </div>
        {connected && userEmail && (
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }} className="text-text-secondary">
            {userEmail}
          </div>
        )}
      </div>

      {connecting ? (
        <span
          style={{ fontSize: 13, padding: "6px 16px", borderRadius: 8, flexShrink: 0 }}
          className="bg-accent/12 text-accent font-medium"
        >
          연결 중...
        </span>
      ) : connected ? (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setShowMenu((p) => !p)}
            style={{ fontSize: 13, padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer" }}
            className="bg-success/12 text-success font-medium"
          >
            ✓ 연결됨
          </button>
          {showMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowMenu(false)} />
              <div
                style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 50,
                  borderRadius: 10, border: "1px solid var(--color-border)",
                  background: "var(--color-bg-secondary)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  overflow: "hidden", minWidth: 160,
                }}
              >
                <button
                  onClick={() => { onTokenUpdate(); setShowMenu(false); }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    fontSize: 13, border: "none", background: "transparent",
                    textAlign: "left", cursor: "pointer", color: "var(--color-text-primary)",
                  }}
                  className="hover:bg-bg-hover"
                >
                  토큰 업데이트
                </button>
                <button
                  onClick={() => { onConnect(); setShowMenu(false); }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    fontSize: 13, border: "none", background: "transparent",
                    textAlign: "left", cursor: "pointer", color: "var(--color-text-primary)",
                  }}
                  className="hover:bg-bg-hover"
                >
                  다른 계정으로 재인증
                </button>
                <button
                  onClick={() => { onDisconnect(); setShowMenu(false); }}
                  style={{
                    display: "block", width: "100%", padding: "10px 16px",
                    fontSize: 13, border: "none", background: "transparent",
                    textAlign: "left", cursor: "pointer", color: "var(--color-danger)",
                  }}
                  className="hover:bg-bg-hover"
                >
                  연결 해제
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={onConnect}
          style={{
            fontSize: 20, width: 36, height: 36, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, border: "none",
          }}
          className="bg-bg-tertiary text-text-secondary hover:text-accent hover:bg-accent/10 cursor-pointer transition-colors"
        >
          +
        </button>
      )}
    </div>
  );
}

export default function PluginsPage() {
  const [tab, setTab] = useState<"전체" | "추천">("전체");
  const [search, setSearch] = useState("");
  const {
    connections, connecting, error, tokenModalService,
    loadConnections, connect, connectWithToken, disconnect, openTokenModal, closeTokenModal, clearError,
  } = usePluginVM();

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  const filtered = PLUGINS.filter((p) => {
    if (search) return p.name.toLowerCase().includes(search.toLowerCase());
    return tab === "전체" ? true : p.category === "추천";
  }).sort((a, b) => {
    const aConn = connections[a.name] ? 1 : 0;
    const bConn = connections[b.name] ? 1 : 0;
    return bConn - aConn;
  });

  return (
    <div style={{ padding: "24px 28px" }} className="h-full overflow-y-auto">
      <h1 style={{ fontSize: 18, fontWeight: 700 }} className="text-text-primary">커넥터</h1>
      <p style={{ fontSize: 14, marginTop: 8, maxWidth: 560, lineHeight: 1.6 }} className="text-text-secondary">
        외부 앱, 파일 및 서비스에 연결하세요.<br />
        AI Agent가 연결된 서비스를 활용하여 더 나은 작업을 수행합니다.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["전체", "추천"] as const).map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              style={{ fontSize: 14, padding: "8px 18px", borderRadius: 8, fontWeight: tab === t ? 600 : 400 }}
              className={`cursor-pointer transition-colors ${tab === t ? "bg-text-primary text-bg-primary" : "text-text-secondary hover:bg-bg-hover"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="키워드로 검색..."
          style={{
            fontSize: 14, padding: "8px 16px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)",
            color: "var(--color-text-primary)", width: 240, outline: "none",
          }}
        />
        {Object.keys(connections).length > 0 && (
          <span style={{ fontSize: 13, marginLeft: "auto" }} className="text-text-secondary">
            {Object.keys(connections).length}개 연결됨
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, maxWidth: 800 }}>
        {filtered.map((plugin) => (
          <PluginCard
            key={plugin.name}
            plugin={plugin}
            connected={!!connections[plugin.name]}
            connecting={connecting === plugin.name}
            userEmail={connections[plugin.name]?.userEmail}
            onConnect={() => connect(plugin.name)}
            onDisconnect={() => disconnect(plugin.name)}
            onTokenUpdate={() => openTokenModal(plugin.name)}
          />
        ))}
      </div>

      {tokenModalService && (() => {
        const config = getPluginConfig(tokenModalService);
        if (!config) return null;
        return (
          <TokenInputModal
            config={config}
            loading={connecting === tokenModalService}
            onSubmit={(envValues, account) => connectWithToken(tokenModalService, envValues, account)}
            onClose={closeTokenModal}
          />
        );
      })()}

      {error && (
        <div
          style={{
            position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
            padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: "var(--color-bg-secondary)", color: "var(--color-danger)",
            border: "1px solid var(--color-danger)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            zIndex: 100, maxWidth: 500, textAlign: "center", cursor: "pointer",
          }}
          onClick={clearError}
        >
          {error}
        </div>
      )}
    </div>
  );
}
