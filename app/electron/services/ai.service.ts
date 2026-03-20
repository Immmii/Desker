import * as pty from "node-pty";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export type AiModel = "claude" | "chatgpt";

const aiSessions = new Map<string, pty.IPty>();

function which(cmd: string): string | null {
  try {
    return execSync(`which ${cmd}`, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function checkAiAvailable(model: AiModel): boolean {
  const binName = model === "claude" ? "claude" : "chatgpt";
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
  const binName = model === "claude" ? "claude" : "chatgpt";
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
    env: process.env as Record<string, string>,
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
