import { create } from "zustand";

type ThemeMode = "dark" | "light" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

function getEffectiveTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = getEffectiveTheme(mode);
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "light",
  setMode: (mode) => {
    applyTheme(mode);
    set({ mode });
  },
}));

// ── Theme SVG Icons ──
function DarkIcon({ active }: { active: boolean }) {
  const color = active ? "var(--color-accent)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function LightIcon({ active }: { active: boolean }) {
  const color = active ? "var(--color-accent)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function SystemIcon({ active }: { active: boolean }) {
  const color = active ? "var(--color-accent)" : "currentColor";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const THEME_OPTIONS = [
  { value: "light" as const, label: "라이트", Icon: LightIcon },
  { value: "dark" as const, label: "다크", Icon: DarkIcon },
  { value: "system" as const, label: "시스템", Icon: SystemIcon },
];

export default function SettingsPage() {
  const { mode, setMode } = useThemeStore();

  return (
    <div style={{ padding: "28px 32px" }} className="h-full overflow-y-auto">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 28 }} className="text-text-primary">
        설정
      </h2>

      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Theme */}
        <section>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }} className="text-text-primary">
            테마
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.value}
                onClick={() => setMode(theme.value)}
                style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14 }}
                className={`flex items-center gap-2 border cursor-pointer transition-colors ${
                  mode === theme.value
                    ? "border-accent bg-accent/15 text-accent font-medium"
                    : "border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover"
                }`}
              >
                <theme.Icon active={mode === theme.value} /> {theme.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, marginTop: 10 }} className="text-text-secondary">
            추후 커스텀 테마 색상 및 배경 이미지 설정이 추가될 예정입니다.
          </p>
        </section>

        {/* General */}
        <section>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }} className="text-text-primary">
            일반
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{ padding: "14px 18px", borderRadius: 12 }}
              className="flex items-center justify-between bg-bg-secondary border border-border"
            >
              <div>
                <p style={{ fontSize: 15 }} className="text-text-primary">알림</p>
                <p style={{ fontSize: 13, marginTop: 2 }} className="text-text-secondary">태스크 마감일 알림</p>
              </div>
              <div className="w-11 h-6 bg-accent rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5" />
              </div>
            </div>
            <div
              style={{ padding: "14px 18px", borderRadius: 12 }}
              className="flex items-center justify-between bg-bg-secondary border border-border"
            >
              <div>
                <p style={{ fontSize: 15 }} className="text-text-primary">시작 시 자동 실행</p>
                <p style={{ fontSize: 13, marginTop: 2 }} className="text-text-secondary">macOS 로그인 시 자동 시작</p>
              </div>
              <div className="w-11 h-6 bg-bg-tertiary rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-text-secondary rounded-full absolute top-0.5 left-0.5" />
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }} className="text-text-primary">
            정보
          </h3>
          <div style={{ padding: "14px 18px", borderRadius: 12 }} className="bg-bg-secondary border border-border">
            <p style={{ fontSize: 15 }} className="text-text-primary">Desker v0.1.0</p>
            <p style={{ fontSize: 13, marginTop: 4 }} className="text-text-secondary">
              대학생을 위한 AI Agent Task Tracker
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
