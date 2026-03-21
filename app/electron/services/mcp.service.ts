import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

interface McpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  url?: string;
}

interface McpSettings {
  mcpServers?: Record<string, McpServer>;
}

const SETTINGS_PATH = path.join(homedir(), ".claude", "settings.json");

function runClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("claude", args, { timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

export const mcpService = {
  /** claude CLI 설치 여부 */
  isInstalled: async (): Promise<boolean> => {
    try {
      await runClaude(["--version"]);
      return true;
    } catch {
      return false;
    }
  },

  /** ~/.claude/settings.json에서 mcpServers 읽기 */
  list: async (): Promise<Record<string, McpServer>> => {
    try {
      const raw = await readFile(SETTINGS_PATH, "utf-8");
      const settings: McpSettings = JSON.parse(raw);
      return settings.mcpServers ?? {};
    } catch {
      return {};
    }
  },

  /** stdio 타입 MCP 서버 추가 (npx 패키지 + env) */
  add: async (
    name: string,
    npmPackage: string,
    env?: Record<string, string>
  ): Promise<void> => {
    const args = ["mcp", "add", name];
    if (env) {
      for (const [k, v] of Object.entries(env)) {
        args.push("-e", `${k}=${v}`);
      }
    }
    args.push("--", "npx", "-y", npmPackage);
    await runClaude(args);
  },

  /** HTTP 타입 MCP 서버 추가 */
  addHttp: async (name: string, url: string): Promise<void> => {
    await runClaude(["mcp", "add", "--transport", "http", name, url]);
  },

  /** MCP 서버 제거 */
  remove: async (name: string): Promise<void> => {
    await runClaude(["mcp", "remove", name]);
  },
};
