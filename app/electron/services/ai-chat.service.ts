import { spawn, execSync, type ChildProcess } from "child_process";

const activeSessions = new Map<string, ChildProcess>();
const conversationStarted = new Map<string, boolean>();

function whichClaude(): string | null {
  try {
    return execSync("which claude", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function sendChatMessage(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const bin = whichClaude();
  if (!bin) {
    onError("claude CLI not found. Install it first.");
    return;
  }

  // Kill any running process for this session
  abortChat(sessionId);

  const isResume = conversationStarted.get(sessionId) === true;
  const args = ["-p", message, "--output-format", "text"];
  if (isResume) {
    args.push("--resume");
  }

  const proc = spawn(bin, args, {
    cwd: process.env.HOME || "/",
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["pipe", "pipe", "pipe"],
  });

  activeSessions.set(sessionId, proc);
  conversationStarted.set(sessionId, true);

  proc.stdout?.on("data", (data: Buffer) => {
    onChunk(data.toString("utf8"));
  });

  proc.stderr?.on("data", (data: Buffer) => {
    const text = data.toString("utf8");
    // Claude CLI sometimes writes status to stderr, forward as chunk
    if (text.trim()) {
      onChunk(text);
    }
  });

  proc.on("close", (_code) => {
    activeSessions.delete(sessionId);
    onDone();
  });

  proc.on("error", (err) => {
    activeSessions.delete(sessionId);
    onError(err.message);
  });
}

export function abortChat(sessionId: string) {
  const proc = activeSessions.get(sessionId);
  if (proc) {
    proc.kill("SIGTERM");
    activeSessions.delete(sessionId);
  }
}

export function clearChatSession(sessionId: string) {
  abortChat(sessionId);
  conversationStarted.delete(sessionId);
}
