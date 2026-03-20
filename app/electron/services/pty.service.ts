import * as pty from "node-pty";

const ptySessions = new Map<string, pty.IPty>();

export function createPty(
  sessionId: string,
  options?: { cols?: number; rows?: number }
): pty.IPty {
  const shell = process.env.SHELL || "/bin/zsh";
  const ptyProcess = pty.spawn(shell, ["-l"], {
    name: "xterm-256color",
    cols: options?.cols ?? 80,
    rows: options?.rows ?? 24,
    cwd: process.env.HOME || "/",
    env: process.env as Record<string, string>,
  });

  ptySessions.set(sessionId, ptyProcess);
  return ptyProcess;
}

export function writeToPty(sessionId: string, data: string) {
  ptySessions.get(sessionId)?.write(data);
}

export function resizePty(sessionId: string, cols: number, rows: number) {
  ptySessions.get(sessionId)?.resize(cols, rows);
}

export function killPty(sessionId: string) {
  const p = ptySessions.get(sessionId);
  if (p) {
    p.kill();
    ptySessions.delete(sessionId);
  }
}

export function getPty(sessionId: string) {
  return ptySessions.get(sessionId);
}
