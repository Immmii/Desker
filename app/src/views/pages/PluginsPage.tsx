import { useEffect, useState } from "react";
import { usePluginVM } from "../../viewmodels/plugin.vm";

interface PluginDef {
  name: string;
  icon: string;
  desc: string;
  category: "추천" | "전체";
}

const PLUGINS: PluginDef[] = [
  { name: "Notion", icon: "📝", desc: "노션 워크스페이스에 연결하여 검색, 업데이트, 워크플로우를 지원합니다.", category: "추천" },
  { name: "Gmail", icon: "📧", desc: "답장 작성, 스레드 요약, 받은편지함 검색을 지원합니다.", category: "추천" },
  { name: "Google Calendar", icon: "📅", desc: "일정을 관리하고 미팅을 손쉽게 조율합니다.", category: "추천" },
  { name: "Slack", icon: "💬", desc: "메시지를 보내고, 캔버스를 만들고, Slack 데이터를 가져옵니다.", category: "추천" },
  { name: "Figma", icon: "🎨", desc: "Figma 컨텍스트로 다이어그램과 더 나은 코드를 생성합니다.", category: "추천" },
  { name: "Canva", icon: "🖼️", desc: "검색, 생성, 자동완성, Canva 디자인을 내보냅니다.", category: "추천" },
  { name: "Google Docs", icon: "📄", desc: "문서에 접근하고 편집합니다.", category: "전체" },
  { name: "Microsoft Word", icon: "📃", desc: "Word 문서를 읽고 편집합니다.", category: "전체" },
  { name: "Linear", icon: "📐", desc: "이슈, 프로젝트, 팀 워크플로우를 관리합니다.", category: "전체" },
  { name: "GitHub", icon: "🐙", desc: "레포지토리, 이슈, PR을 관리합니다.", category: "전체" },
];

function PluginCard({
  plugin,
  connected,
  connecting,
  userEmail,
  onConnect,
  onDisconnect,
}: {
  plugin: PluginDef;
  connected: boolean;
  connecting: boolean;
  userEmail?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
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
      <span style={{ fontSize: 28, flexShrink: 0 }}>{plugin.icon}</span>
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
  const [tab, setTab] = useState<"추천" | "전체">("추천");
  const [search, setSearch] = useState("");
  const { connections, connecting, error, loadConnections, connect, disconnect, clearError } = usePluginVM();

  useEffect(() => { loadConnections(); }, [loadConnections]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 5000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  const filtered = PLUGINS.filter((p) => {
    if (search) return p.name.toLowerCase().includes(search.toLowerCase());
    return tab === "추천" ? p.category === "추천" : true;
  });

  return (
    <div style={{ padding: "24px 28px" }} className="h-full overflow-y-auto">
      <h1 style={{ fontSize: 18, fontWeight: 700 }} className="text-text-primary">커넥터</h1>
      <p style={{ fontSize: 14, marginTop: 8, maxWidth: 560, lineHeight: 1.6 }} className="text-text-secondary">
        외부 앱, 파일 및 서비스에 연결하세요. AI Agent가 연결된 서비스를 활용하여 더 나은 작업을 수행합니다.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["추천", "전체"] as const).map((t) => (
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
          />
        ))}
      </div>

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
