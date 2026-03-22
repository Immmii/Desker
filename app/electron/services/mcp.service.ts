import { execFile } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import path from "path";

interface McpServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
  url?: string;
}

interface ClaudeJson {
  mcpServers?: Record<string, McpServer>;
  [key: string]: unknown;
}

// ~/.claude.json — User MCPs (root mcpServers)
const CLAUDE_JSON_PATH = path.join(homedir(), ".claude.json");

function runClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("claude", args, { timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

async function readClaudeJson(): Promise<ClaudeJson> {
  try {
    const raw = await readFile(CLAUDE_JSON_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeClaudeJson(data: ClaudeJson): Promise<void> {
  await writeFile(CLAUDE_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
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

  /** ~/.claude.json에서 User MCPs 읽기 */
  list: async (): Promise<Record<string, McpServer>> => {
    const data = await readClaudeJson();
    return data.mcpServers ?? {};
  },

  /** stdio 타입 MCP 서버 추가 (--scope user → User MCPs) */
  add: async (
    name: string,
    npmPackage: string,
    env?: Record<string, string>
  ): Promise<void> => {
    const args = ["mcp", "add", "--scope", "user", name];
    if (env) {
      for (const [k, v] of Object.entries(env)) {
        args.push("-e", `${k}=${v}`);
      }
    }
    args.push("--", "npx", "-y", npmPackage);
    await runClaude(args);
  },

  /** HTTP 타입 MCP 서버 추가 (--scope user) */
  addHttp: async (name: string, url: string): Promise<void> => {
    await runClaude(["mcp", "add", "--transport", "http", "--scope", "user", name, url]);
  },

  /** MCP 서버 제거 (--scope user) */
  remove: async (name: string): Promise<void> => {
    await runClaude(["mcp", "remove", "--scope", "user", name]);
  },

  /** MCP 서버의 env 값을 직접 업데이트 (~/.claude.json 수정) */
  updateEnv: async (
    name: string,
    env: Record<string, string>
  ): Promise<boolean> => {
    try {
      const data = await readClaudeJson();
      const server = data.mcpServers?.[name];
      if (!server) return false;

      server.env = { ...server.env, ...env };
      await writeClaudeJson(data);
      return true;
    } catch {
      return false;
    }
  },
};
