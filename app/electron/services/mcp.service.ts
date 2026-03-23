import { execFile } from "child_process";
import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { app } from "electron";
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

/** Discovered MCP server from user-level configs */
export interface DiscoveredMcp {
  name: string;
  source: "claude" | "codex" | "both";
  server: McpServer;
}

// ── File paths ──
const CLAUDE_JSON_PATH = path.join(homedir(), ".claude.json");
const CLAUDE_SETTINGS_PATH = path.join(homedir(), ".claude", "settings.json");
const CODEX_CONFIG_PATH = path.join(homedir(), ".codex", "config.toml");
function deskerMcpPath(): string {
  return path.join(app.getPath("userData"), "mcp.json");
}

// ── CLI helper ──
function runClaude(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("claude", args, { timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

// ── Desker mcp.json (source of truth) ──

async function readDeskerMcp(): Promise<Record<string, McpServer>> {
  try {
    const raw = await readFile(deskerMcpPath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeDeskerMcp(servers: Record<string, McpServer>): Promise<void> {
  const p = deskerMcpPath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(servers, null, 2), "utf-8");
}

// ── Claude ~/.claude.json ──

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

/** Read ~/.claude/settings.json */
async function readClaudeSettings(): Promise<ClaudeJson> {
  try {
    const raw = await readFile(CLAUDE_SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Read MCP servers from Claude's configs (both ~/.claude.json and ~/.claude/settings.json) */
async function readClaudeMcpServers(): Promise<Record<string, McpServer>> {
  const [json, settings] = await Promise.all([readClaudeJson(), readClaudeSettings()]);
  return { ...(settings.mcpServers ?? {}), ...(json.mcpServers ?? {}) };
}

// ── Codex ~/.codex/config.toml ──

async function readCodexConfig(): Promise<string> {
  try {
    return await readFile(CODEX_CONFIG_PATH, "utf-8");
  } catch {
    return "";
  }
}

async function writeCodexConfig(content: string): Promise<void> {
  await mkdir(path.dirname(CODEX_CONFIG_PATH), { recursive: true });
  await writeFile(CODEX_CONFIG_PATH, content, "utf-8");
}

/** Parse MCP servers from Codex config.toml */
function parseCodexMcpServers(config: string): Record<string, McpServer> {
  const servers: Record<string, McpServer> = {};
  const regex = /\[mcp_servers\.(\w+)\]([\s\S]*?)(?=\n\[|$)/g;
  let match;
  while ((match = regex.exec(config)) !== null) {
    const name = match[1];
    const block = match[2];
    const server: McpServer = {};

    const cmdMatch = block.match(/command\s*=\s*"([^"]*)"/);
    if (cmdMatch) server.command = cmdMatch[1];

    const argsMatch = block.match(/args\s*=\s*\[([^\]]*)\]/);
    if (argsMatch?.[1]) {
      server.args = argsMatch[1].match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, "")) ?? [];
    }

    const envMatch = block.match(/env\s*=\s*\{([^}]*)\}/);
    if (envMatch?.[1]) {
      server.env = {};
      for (const pair of envMatch[1].split(",")) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          const k = pair.substring(0, eqIdx).trim();
          const v = pair.substring(eqIdx + 1).trim().replace(/^"|"$/g, "");
          server.env[k] = v;
        }
      }
    }

    servers[name] = server;
  }
  return servers;
}

/** Build a TOML block for an MCP server entry */
function buildTomlMcpBlock(name: string, command: string, args: string[], env?: Record<string, string>): string {
  const lines: string[] = [];
  lines.push(`[mcp_servers.${name}]`);
  lines.push(`command = "${command}"`);
  lines.push(`args = [${args.map((a) => `"${a}"`).join(", ")}]`);
  if (env && Object.keys(env).length > 0) {
    const pairs = Object.entries(env)
      .map(([k, v]) => `${k} = "${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
      .join(", ");
    lines.push(`env = { ${pairs} }`);
  }
  return lines.join("\n");
}

/** Remove an MCP server block from config.toml content */
function codexRemoveBlock(config: string, name: string): string {
  const regex = new RegExp(
    `\\[mcp_servers\\.${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\][\\s\\S]*?(?=\\n\\[|$)`,
    "g"
  );
  return config.replace(regex, "").replace(/\n{3,}/g, "\n\n");
}

/** Add or update an MCP server in codex config.toml */
async function codexAddMcp(name: string, command: string, args: string[], env?: Record<string, string>): Promise<void> {
  try {
    let config = await readCodexConfig();
    config = codexRemoveBlock(config, name);
    const block = buildTomlMcpBlock(name, command, args, env);
    config = config.trimEnd() + "\n\n" + block + "\n";
    await writeCodexConfig(config);
  } catch {
    // non-critical
  }
}

/** Remove an MCP server from codex config.toml */
async function codexRemoveMcp(name: string): Promise<void> {
  try {
    let config = await readCodexConfig();
    config = codexRemoveBlock(config, name);
    await writeCodexConfig(config);
  } catch {
    // non-critical
  }
}

/** Update env values for an MCP server in codex config.toml */
async function codexUpdateEnv(name: string, env: Record<string, string>): Promise<void> {
  try {
    const config = await readCodexConfig();
    const sectionRegex = new RegExp(
      `(\\[mcp_servers\\.${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\])([\\s\\S]*?)(?=\\n\\[|$)`
    );
    const match = config.match(sectionRegex);
    if (!match) return;

    const section = match[2];
    const cmdMatch = section.match(/command\s*=\s*"([^"]*)"/);
    const argsMatch = section.match(/args\s*=\s*\[([^\]]*)\]/);
    const command = cmdMatch?.[1] ?? "npx";
    const args = argsMatch?.[1]
      ? argsMatch[1].match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, "")) ?? []
      : [];

    const envMatch = section.match(/env\s*=\s*\{([^}]*)\}/);
    const existingEnv: Record<string, string> = {};
    if (envMatch?.[1]) {
      for (const pair of envMatch[1].split(",")) {
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          const k = pair.substring(0, eqIdx).trim();
          const v = pair.substring(eqIdx + 1).trim().replace(/^"|"$/g, "");
          existingEnv[k] = v;
        }
      }
    }
    const mergedEnv = { ...existingEnv, ...env };

    const newBlock = buildTomlMcpBlock(name, command, args, mergedEnv);
    const updated = config.replace(sectionRegex, newBlock);
    await writeCodexConfig(updated);
  } catch {
    // non-critical
  }
}

// ── Sync helpers ──

/** Sync a single server to Claude's ~/.claude.json */
async function claudeAddMcp(name: string, server: McpServer): Promise<void> {
  const data = await readClaudeJson();
  if (!data.mcpServers) data.mcpServers = {};
  data.mcpServers[name] = server;
  await writeClaudeJson(data);
}

/** Remove a server from Claude's ~/.claude.json */
async function claudeRemoveMcp(name: string): Promise<void> {
  const data = await readClaudeJson();
  if (data.mcpServers?.[name]) {
    delete data.mcpServers[name];
    await writeClaudeJson(data);
  }
}

// ══════════════════════════════════════
// Public API
// ══════════════════════════════════════

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

  /** Desker mcp.json (source of truth) 기준으로 목록 반환 */
  list: async (): Promise<Record<string, McpServer>> => {
    return readDeskerMcp();
  },

  /** stdio 타입 MCP 서버 추가 → Desker + Claude + Codex */
  add: async (
    name: string,
    npmPackage: string,
    env?: Record<string, string>
  ): Promise<void> => {
    const server: McpServer = {
      command: "npx",
      args: ["-y", npmPackage],
      env,
    };

    // 1. Desker (source of truth)
    const servers = await readDeskerMcp();
    servers[name] = server;
    await writeDeskerMcp(servers);

    // 2. Claude
    await claudeAddMcp(name, server);

    // 3. Codex
    await codexAddMcp(name, "npx", ["-y", npmPackage], env);
  },

  /** HTTP 타입 MCP 서버 추가 */
  addHttp: async (name: string, url: string): Promise<void> => {
    const server: McpServer = { type: "http", url };

    const servers = await readDeskerMcp();
    servers[name] = server;
    await writeDeskerMcp(servers);

    // Claude only (codex doesn't support http type)
    try {
      await runClaude(["mcp", "add", "--transport", "http", "--scope", "user", name, url]);
    } catch {
      // fallback: direct write
      await claudeAddMcp(name, server);
    }
  },

  /** MCP 서버 제거 → Desker + Claude + Codex */
  remove: async (name: string): Promise<void> => {
    // 1. Desker
    const servers = await readDeskerMcp();
    delete servers[name];
    await writeDeskerMcp(servers);

    // 2. Claude
    await claudeRemoveMcp(name);

    // 3. Codex
    await codexRemoveMcp(name);
  },

  /** env 업데이트 → Desker + Claude + Codex */
  updateEnv: async (
    name: string,
    env: Record<string, string>
  ): Promise<boolean> => {
    try {
      // 1. Desker
      const servers = await readDeskerMcp();
      if (servers[name]) {
        servers[name].env = { ...servers[name].env, ...env };
        await writeDeskerMcp(servers);
      }

      // 2. Claude
      const data = await readClaudeJson();
      const server = data.mcpServers?.[name];
      if (server) {
        server.env = { ...server.env, ...env };
        await writeClaudeJson(data);
      }

      // 3. Codex
      await codexUpdateEnv(name, env);

      return true;
    } catch {
      return false;
    }
  },

  /**
   * 기존 User 레벨 MCP 설정 탐색
   * Claude ~/.claude.json + Codex ~/.codex/config.toml 에서
   * Desker mcp.json에 없는 서버를 찾아 반환
   */
  discover: async (): Promise<DiscoveredMcp[]> => {
    const deskerServers = await readDeskerMcp();
    const claudeServers = await readClaudeMcpServers();

    let codexServers: Record<string, McpServer> = {};
    try {
      const config = await readCodexConfig();
      codexServers = parseCodexMcpServers(config);
    } catch { /* ignore */ }

    // Merge: find servers NOT in Desker
    const allNames = new Set([...Object.keys(claudeServers), ...Object.keys(codexServers)]);
    const discovered: DiscoveredMcp[] = [];

    for (const name of allNames) {
      if (deskerServers[name]) continue; // already in Desker

      const inClaude = !!claudeServers[name];
      const inCodex = !!codexServers[name];
      const source: "claude" | "codex" | "both" = inClaude && inCodex ? "both" : inClaude ? "claude" : "codex";
      // Prefer Claude's definition (more complete JSON), fallback to Codex
      const server = claudeServers[name] ?? codexServers[name];
      discovered.push({ name, source, server });
    }

    return discovered;
  },

  /**
   * 기존 설정 가져오기 — discovered 서버를 Desker에 등록 + 양쪽 동기화
   */
  importServers: async (names: string[]): Promise<void> => {
    const claudeServers = await readClaudeMcpServers();
    let codexServers: Record<string, McpServer> = {};
    try {
      const config = await readCodexConfig();
      codexServers = parseCodexMcpServers(config);
    } catch { /* ignore */ }

    const deskerServers = await readDeskerMcp();

    for (const name of names) {
      const server = claudeServers[name] ?? codexServers[name];
      if (!server) continue;

      // Add to Desker
      deskerServers[name] = server;

      // Sync to Claude if missing
      if (!claudeServers[name]) {
        await claudeAddMcp(name, server);
      }

      // Sync to Codex if missing
      if (!codexServers[name] && server.command && server.args) {
        await codexAddMcp(name, server.command, server.args, server.env);
      }
    }

    await writeDeskerMcp(deskerServers);
  },
};
