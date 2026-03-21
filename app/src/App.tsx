import { useEffect } from "react";
import AppShell from "./views/layouts/AppShell";
import { useSettingsStore } from "./views/pages/SettingsPage";

export default function App() {
  const mode = useSettingsStore((s) => s.mode);

  useEffect(() => {
    // Apply theme on mount and when mode changes
    const effectiveTheme =
      mode === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode;
    document.documentElement.dataset.theme = effectiveTheme;

    // Listen for system theme changes when mode is "system"
    if (mode === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      };
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [mode]);

  // Window focus/blur → dim traffic lights via CSS
  useEffect(() => {
    const api = window.deskerAPI?.window;
    if (!api?.onBlur) return;
    const unBlur = api.onBlur(() => {
      document.documentElement.dataset.focused = "false";
    });
    const unFocus = api.onFocus(() => {
      document.documentElement.dataset.focused = "true";
    });
    document.documentElement.dataset.focused = "true";
    return () => { unBlur(); unFocus(); };
  }, []);

  return <AppShell />;
}
