import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import type { TerminalMode, AiModel, AgentRole } from "../viewmodels/session.vm";
import { getAgentPreset } from "../viewmodels/session.vm";
import { extractMath, type MathBlock } from "../views/widgets/terminal/MathOverlay";

const TERMINAL_THEME_DARK = {
  background: "#0f0f13",
  foreground: "#e8e8f0",
  cursor: "#6c5ce7",
  cursorAccent: "#0f0f13",
  selectionBackground: "#6c5ce744",
  black: "#0f0f13",
  red: "#ff8b76",
  green: "#55efc4",
  yellow: "#ffeaa7",
  blue: "#a2c4ff",
  magenta: "#a29bfe",
  cyan: "#81ecec",
  white: "#ffffff",
  brightBlack: "#d0d0e0",
  brightRed: "#ffb4a8",
  brightGreen: "#7dfce0",
  brightYellow: "#fff3c4",
  brightBlue: "#c4d7ff",
  brightMagenta: "#c4bfff",
  brightCyan: "#a8f0f0",
  brightWhite: "#ffffff",
};

const TERMINAL_THEME_LIGHT = {
  background: "#ffffff",
  foreground: "#000000",
  cursor: "#6c5ce7",
  cursorAccent: "#ffffff",
  selectionBackground: "#6c5ce733",
  black: "#1d1d1f",
  red: "#d63031",
  green: "#00856f",
  yellow: "#b8860b",
  blue: "#0066cc",
  magenta: "#6c5ce7",
  cyan: "#00897b",
  white: "#888888",
  brightBlack: "#000000",
  brightRed: "#e17055",
  brightGreen: "#00b894",
  brightYellow: "#fdcb6e",
  brightBlue: "#74b9ff",
  brightMagenta: "#a29bfe",
  brightCyan: "#55efc4",
  brightWhite: "#aaaaaa",
};

function getTerminalTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" ? TERMINAL_THEME_LIGHT : TERMINAL_THEME_DARK;
}

// Store terminals for reuse across re-renders
const terminalInstances = new Map<string, Terminal>();

// Pending file paths per session (set by file drop, consumed on Enter)
export type PendingFile = { name: string; path: string };
const pendingFilesMap = new Map<string, { files: PendingFile[]; onClear: () => void }>();

export function setPendingFiles(sessionId: string, files: PendingFile[], onClear: () => void) {
  if (files.length > 0) {
    pendingFilesMap.set(sessionId, { files, onClear });
  } else {
    pendingFilesMap.delete(sessionId);
  }
}

function consumePendingFiles(sessionId: string): string | null {
  const entry = pendingFilesMap.get(sessionId);
  if (!entry || entry.files.length === 0) return null;
  const paths = entry.files
    .map((f) => (f.path.includes(" ") ? `"${f.path}"` : f.path))
    .join(" ");
  entry.onClear();
  pendingFilesMap.delete(sessionId);
  return paths;
}


export function useTerminal(
  sessionId: string,
  containerRef: React.RefObject<HTMLDivElement | null>,
  mode: TerminalMode = "shell",
  aiModel?: AiModel,
  /** AI mode: don't forward keyboard to PTY (textarea handles input) */
  readOnly = false,
  agentRole?: AgentRole,
  taskId?: string,
  onMathDetected?: (blocks: MathBlock[]) => void,
) {
  const fitRef = useRef<FitAddon | null>(null);
  const spawnedRef = useRef(false);
  const mathIdCounter = useRef(0);
  const mathBufferRef = useRef("");

  useEffect(() => {
    if (!containerRef.current) return;

    // Reuse existing terminal
    let term = terminalInstances.get(sessionId);
    if (term) {
      if (term.element) {
        containerRef.current.appendChild(term.element);
      }
      const fit = new FitAddon();
      term.loadAddon(fit);
      fitRef.current = fit;
      // Multiple fit attempts to handle layout settling
      requestAnimationFrame(() => {
        try { fit.fit(); } catch {}
        setTimeout(() => { try { fit.fit(); } catch {} }, 100);
        setTimeout(() => { try { fit.fit(); } catch {} }, 300);
      });
      return;
    }

    // Create new terminal
    term = new Terminal({
      theme: getTerminalTheme(),
      fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: !readOnly,
      cursorStyle: readOnly ? "underline" : "bar",
      scrollback: 5000,
      allowProposedApi: true,
      disableStdin: readOnly,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitRef.current = fit;

    terminalInstances.set(sessionId, term);

    // Shift+Enter → newline instead of submit
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === "keydown" && e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        const api = window.deskerAPI;
        if (mode === "ai") {
          api.ai.write(sessionId, "\n");
        } else {
          api.pty.write(sessionId, "\n");
        }
        return false;
      }
      return true;
    });

    // Fit FIRST, then spawn with correct cols/rows
    if (!spawnedRef.current) {
      spawnedRef.current = true;
      const api = window.deskerAPI;

      // Wait until container has proper dimensions, then spawn
      const doSpawn = () => {
        try { fit.fit(); } catch {}
        const cols = term!.cols;
        const rows = term!.rows;

        // If container isn't ready yet (too narrow), retry
        if (cols < 20 && containerRef.current) {
          const w = containerRef.current.clientWidth;
          if (w < 100) {
            setTimeout(doSpawn, 100);
            return;
          }
        }

      // Math detection helper
      const detectMath = (data: string) => {
        if (!onMathDetected) return;
        mathBufferRef.current += data;
        // Flush detection on newline or after accumulating enough data
        if (mathBufferRef.current.includes("\n") || mathBufferRef.current.length > 500) {
          const blocks = extractMath(mathBufferRef.current, mathIdCounter);
          if (blocks.length > 0) {
            onMathDetected(blocks);
          }
          mathBufferRef.current = "";
        }
      };

      if (mode === "ai" && aiModel) {
        // AI CLI mode
        const agentPreset = agentRole ? getAgentPreset(agentRole) : null;

        api.ai.spawn(sessionId, aiModel, { cols, rows }).then(async () => {
          // Inject agent system prompt after spawn
          if (agentPreset) {
            await new Promise((r) => setTimeout(r, 1500));
            if (aiModel === "claude") {
              api.ai.writeHidden(sessionId, `/system ${agentPreset.systemPrompt}`);
            } else {
              // Codex: send system prompt as first user message
              api.ai.writeHidden(sessionId, `System instruction: ${agentPreset.systemPrompt}\r`);
            }
          }

          // Inject previous agent contexts for the same task (both Claude & Codex)
          if (agentPreset && taskId) {
            try {
              const contexts = await window.deskerAPI.db.getAgentContexts(taskId);
              if (contexts.length > 0) {
                const contextSummary = contexts
                  .map((ctx) => `[${ctx.agent_role}]: ${ctx.content}`)
                  .join("\n\n");
                await new Promise((r) => setTimeout(r, 500));
                api.ai.writeHidden(
                  sessionId,
                  `The following is context from previous agents working on the same task. Use this to inform your work:\n\n${contextSummary}`
                );
              }
            } catch {
              // ignore context fetch errors
            }
          }
        }).catch((err: Error) => {
          term!.writeln(`\x1b[31m  [AI CLI 오류: ${err.message}]\x1b[0m`);
          term!.writeln(`\x1b[90m  셸 모드로 전환합니다...\x1b[0m`);
          api.pty.create(sessionId, { cols, rows });
        });

        const unsubData = api.ai.onData((sid, data) => {
          if (sid === sessionId) {
            term!.write(data);
            detectMath(data);
          }
        });

        const unsubExit = api.ai.onExit((sid, code) => {
          if (sid === sessionId) {
            term!.writeln(`\r\n\x1b[90m  [AI 프로세스 종료: ${code}]\x1b[0m`);
          }
        });

        // Only forward keyboard input if not readOnly
        let disposable: { dispose: () => void } | null = null;
        if (!readOnly) {
          disposable = term.onData((data) => {
            if (data === "\r") {
              const pending = consumePendingFiles(sessionId);
              if (pending) {
                // Send file paths + Enter together so one Enter submits
                api.ai.writeHidden(sessionId, " " + pending + "\r");
                return;
              }
            }
            api.ai.write(sessionId, data);
          });
        }

        (term as unknown as Record<string, unknown>).__cleanup = () => {
          unsubData();
          unsubExit();
          disposable?.dispose();
        };
      } else {
        // Shell mode
        api.pty.create(sessionId, { cols, rows });

        const unsubData = api.pty.onData((sid, data) => {
          if (sid === sessionId) {
            term!.write(data);
            detectMath(data);
          }
        });
        const unsubExit = api.pty.onExit((sid, code) => {
          if (sid === sessionId) {
            term!.writeln(`\r\n\x1b[90m  [프로세스 종료: ${code}]\x1b[0m`);
          }
        });

        const disposable = term.onData((data) => {
          if (data === "\r") {
            consumePendingFiles(sessionId);
            // Shell mode: paths not injected (no hidden write for PTY)
          }
          api.pty.write(sessionId, data);
        });

        (term as unknown as Record<string, unknown>).__cleanup = () => {
          unsubData();
          unsubExit();
          disposable.dispose();
        };
      }
      };
      // Wait for layout to settle, then spawn
      setTimeout(doSpawn, 150);
    }

    // Don't dispose on unmount — keep for tab switching
    return () => {};
  }, [sessionId, mode, aiModel, containerRef, readOnly]);

  // Theme change handler — update existing terminal when app theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const term = terminalInstances.get(sessionId);
      if (term) {
        term.options.theme = getTerminalTheme();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [sessionId]);

  // Resize handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !fitRef.current) return;

    const ro = new ResizeObserver(() => {
      try {
        fitRef.current?.fit();
        const term = terminalInstances.get(sessionId);
        if (term) {
          const api = window.deskerAPI;
          if (mode === "ai") {
            api.ai.resize(sessionId, term.cols, term.rows).catch(() => {});
          } else {
            api.pty.resize(sessionId, term.cols, term.rows).catch(() => {});
          }
        }
      } catch {
        // ignore
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [sessionId, mode, containerRef]);

  return {
    getTerminal: () => terminalInstances.get(sessionId),
    dispose: () => {
      const term = terminalInstances.get(sessionId);
      if (term) {
        const cleanup = (term as unknown as Record<string, unknown>).__cleanup as (() => void) | undefined;
        cleanup?.();
        term.dispose();
        terminalInstances.delete(sessionId);
      }
      const api = window.deskerAPI;
      if (mode === "ai") {
        api.ai.kill(sessionId);
      } else {
        api.pty.kill(sessionId);
      }
    },
  };
}

/** Send text to AI CLI (for use from external textarea input) */
export function writeToAiSession(sessionId: string, text: string) {
  window.deskerAPI.ai.write(sessionId, text + "\n");
}
