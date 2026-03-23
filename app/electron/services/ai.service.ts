import * as pty from "node-pty";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export type AiModel = "claude" | "chatgpt";

const aiSessions = new Map<string, pty.IPty>();

/** Cache the full login-shell PATH so we only resolve it once */
let _cachedLoginEnv: Record<string, string> | null = null;
function getLoginShellEnv(): Record<string, string> {
  if (_cachedLoginEnv) return _cachedLoginEnv;
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    const raw = execSync(`${shell} -l -c 'env'`, { encoding: "utf8" });
    const env: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) env[line.substring(0, idx)] = line.substring(idx + 1);
    }
    _cachedLoginEnv = env;
    return env;
  } catch {
    return process.env as Record<string, string>;
  }
}

function which(cmd: string): string | null {
  // Packaged Electron apps don't inherit the user's shell PATH.
  // Launch a login shell so .zshrc / .zprofile / .bash_profile are sourced.
  const shell = process.env.SHELL || "/bin/zsh";
  try {
    // Use login shell (-l) to source user profile and get full PATH
    return execSync(`${shell} -l -c 'which ${cmd}'`, {
      encoding: "utf8",
    }).trim();
  } catch {
    // Fallback: check common install locations directly
    const commonPaths = [
      `/usr/local/bin/${cmd}`,
      `${process.env.HOME}/.local/bin/${cmd}`,
      `${process.env.HOME}/.nvm/versions/node/*/bin/${cmd}`,
      `/opt/homebrew/bin/${cmd}`,
    ];
    for (const p of commonPaths) {
      // Handle glob-like paths (nvm)
      try {
        const resolved = execSync(`ls ${p} 2>/dev/null`, { encoding: "utf8" }).trim().split("\n")[0];
        if (resolved && fs.existsSync(resolved)) return resolved;
      } catch {
        if (fs.existsSync(p)) return p;
      }
    }
    return null;
  }
}

export function checkAiAvailable(model: AiModel): boolean {
  const binName = model === "claude" ? "claude" : "codex";
  return which(binName) !== null;
}

/**
 * Copy CLAUDE.md to the working directory if not present
 */
function ensureClaudeMd(cwd: string): void {
  try {
    const target = path.join(cwd, "CLAUDE.md");
    if (fs.existsSync(target)) return;

    const source = path.join(__dirname, "../../../mcp/CLAUDE.md");
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
    }
  } catch {
    // non-critical
  }
}

export function spawnAiCli(
  sessionId: string,
  model: AiModel,
  options?: { cols?: number; rows?: number }
): pty.IPty {
  const binName = model === "claude" ? "claude" : "codex";
  const binPath = which(binName);
  if (!binPath) {
    throw new Error(`${binName} CLI not found. Install it first.`);
  }

  const cwd = process.env.HOME || "/";

  if (model === "claude") {
    ensureClaudeMd(cwd);
  }

  const aiProcess = pty.spawn(binPath, [], {
    name: "xterm-256color",
    cols: options?.cols ?? 80,
    rows: options?.rows ?? 24,
    cwd,
    env: getLoginShellEnv(),
  });

  aiSessions.set(sessionId, aiProcess);
  return aiProcess;
}

export function writeToAi(sessionId: string, data: string) {
  aiSessions.get(sessionId)?.write(data);
}

// Suppressed output: paths written via writeHiddenToAi are filtered from PTY echo
const suppressFilters = new Map<string, { patterns: string[]; timeout: ReturnType<typeof setTimeout> }>();

export function addSuppressFilter(sessionId: string, text: string) {
  const entry = suppressFilters.get(sessionId) ?? { patterns: [], timeout: null as unknown as ReturnType<typeof setTimeout> };
  entry.patterns.push(text);
  // Auto-clear after 2s in case echo never comes
  clearTimeout(entry.timeout);
  entry.timeout = setTimeout(() => suppressFilters.delete(sessionId), 2000);
  suppressFilters.set(sessionId, entry);
}

export function filterSuppressed(sessionId: string, data: string): string {
  const entry = suppressFilters.get(sessionId);
  if (!entry || entry.patterns.length === 0) return data;

  let filtered = data;
  entry.patterns = entry.patterns.filter((pattern) => {
    if (filtered.includes(pattern)) {
      filtered = filtered.replace(pattern, "");
      return false; // consumed
    }
    return true; // keep for next chunk
  });

  if (entry.patterns.length === 0) {
    clearTimeout(entry.timeout);
    suppressFilters.delete(sessionId);
  }

  return filtered;
}

export function killAi(sessionId: string) {
  const p = aiSessions.get(sessionId);
  if (p) {
    p.kill();
    aiSessions.delete(sessionId);
  }
}

export function getAi(sessionId: string) {
  return aiSessions.get(sessionId);
}
