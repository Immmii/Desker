import http from "http";
import { shell } from "electron";
import https from "https";
import { URL } from "url";
import crypto from "crypto";
import { mcpConnectionDb } from "./db.service";
import { mcpService } from "./mcp.service";

interface OAuthConfig {
  clientId: string; // 실제 등록된 Client ID (빈 문자열이면 시뮬레이션)
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const CALLBACK_PORT = 17380;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;

// 서비스별 OAuth 설정
// clientId가 비어있으면 → 시뮬레이션 모드 (데모)
// 실제 Client ID가 있으면 → 진짜 OAuth 플로우
const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  Notion: {
    clientId: "",
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
  },
  GitHub: {
    clientId: "",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:user"],
  },
  Gmail: {
    clientId: "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  },
  "Google Calendar": {
    clientId: "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  },
  "Google Docs": {
    clientId: "",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/documents.readonly"],
  },
  Slack: {
    clientId: "",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write"],
  },
  Figma: {
    clientId: "",
    authUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://www.figma.com/api/oauth/token",
    scopes: ["files:read"],
  },
  Linear: {
    clientId: "",
    authUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes: ["read", "write"],
  },
  Canva: {
    clientId: "",
    authUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://www.canva.com/api/oauth/token",
    scopes: ["design:read"],
  },
  "Microsoft Word": {
    clientId: "",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["Files.ReadWrite", "offline_access"],
  },
};

// 서비스명 → MCP 설정 매핑 (토큰 갱신 시 settings.json env 업데이트용)
interface McpTokenMapping {
  mcpName: string;
  buildEnv: (accessToken: string) => Record<string, string>;
}

const MCP_TOKEN_MAPPINGS: Record<string, McpTokenMapping> = {
  Notion: {
    mcpName: "notion",
    buildEnv: (token) => ({
      OPENAPI_MCP_HEADERS: JSON.stringify({
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      }),
    }),
  },
  Slack: {
    mcpName: "slack",
    buildEnv: (token) => ({ SLACK_BOT_TOKEN: token }),
  },
  GitHub: {
    mcpName: "github",
    buildEnv: (token) => ({ GITHUB_PERSONAL_ACCESS_TOKEN: token }),
  },
  Figma: {
    mcpName: "figma",
    buildEnv: (token) => ({ FIGMA_API_KEY: token }),
  },
  Linear: {
    mcpName: "linear",
    buildEnv: (token) => ({ LINEAR_API_KEY: token }),
  },
  Gmail: {
    mcpName: "google-gmail",
    buildEnv: (token) => ({ GOOGLE_ACCESS_TOKEN: token }),
  },
  "Google Calendar": {
    mcpName: "google-calendar",
    buildEnv: (token) => ({ GOOGLE_ACCESS_TOKEN: token }),
  },
  "Google Docs": {
    mcpName: "google-docs",
    buildEnv: (token) => ({ GOOGLE_ACCESS_TOKEN: token }),
  },
  Canva: {
    mcpName: "canva",
    buildEnv: (token) => ({ CANVA_ACCESS_TOKEN: token }),
  },
  "Microsoft Word": {
    mcpName: "microsoft-word",
    buildEnv: (token) => ({ MICROSOFT_ACCESS_TOKEN: token }),
  },
};

let activeServer: http.Server | null = null;

function postJSON(
  urlStr: string,
  body: Record<string, string>,
  headers?: Record<string, string>
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = new URLSearchParams(body).toString();
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
          Accept: "application/json",
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk: Buffer) => (raw += chunk.toString()));
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error(`Invalid JSON response: ${raw}`)); }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export const oauthService = {
  startOAuthFlow: (
    service: string
  ): Promise<{ success: boolean; service: string; email?: string }> => {
    const config = OAUTH_CONFIGS[service];
    if (!config) return Promise.reject(new Error(`지원하지 않는 서비스: ${service}`));

    if (!config.clientId) {
      return Promise.reject(new Error(`${service}: OAuth Client ID가 설정되지 않았습니다. 토큰 방식으로 연결하세요.`));
    }

    // ── 실제 OAuth 플로우 ──
    if (activeServer) {
      activeServer.close();
      activeServer = null;
    }

    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const reqUrl = new URL(req.url ?? "/", `http://localhost:${CALLBACK_PORT}`);
        if (reqUrl.pathname !== "/callback") {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = reqUrl.searchParams.get("code");
        const error = reqUrl.searchParams.get("error");

        if (error || !code) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<html><body style='font-family:system-ui;text-align:center;padding:60px'><h2>연결 실패</h2><p>브라우저를 닫아도 됩니다.</p></body></html>");
          server.close();
          activeServer = null;
          reject(new Error(error ?? "인증 코드를 받지 못했습니다."));
          return;
        }

        oauthService
          .exchangeCodeForToken(service, code)
          .then((result) => {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<html><body style='font-family:system-ui;text-align:center;padding:60px'><h2>✓ 연결 완료!</h2><p>Desker로 돌아가세요.</p></body></html>");
            server.close();
            activeServer = null;
            resolve(result);
          })
          .catch((err) => {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(`<html><body style='font-family:system-ui;text-align:center;padding:60px'><h2>오류 발생</h2><p>${String(err)}</p></body></html>`);
            server.close();
            activeServer = null;
            reject(err);
          });
      });

      server.listen(CALLBACK_PORT, () => {
        activeServer = server;
        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: REDIRECT_URI,
          response_type: "code",
        });
        if (config.scopes.length > 0) params.set("scope", config.scopes.join(" "));
        if (service === "Notion") params.set("owner", "user");
        shell.openExternal(`${config.authUrl}?${params.toString()}`);
      });

      setTimeout(() => {
        if (activeServer === server) {
          server.close();
          activeServer = null;
          reject(new Error("OAuth 시간 초과 (5분)"));
        }
      }, 5 * 60 * 1000);
    });
  },

  exchangeCodeForToken: async (
    service: string,
    code: string
  ): Promise<{ success: boolean; service: string; email?: string }> => {
    const config = OAUTH_CONFIGS[service];
    if (!config) throw new Error(`지원하지 않는 서비스: ${service}`);

    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: config.clientId,
    };

    const tokenData = await postJSON(config.tokenUrl, body);
    const accessToken = (tokenData.access_token as string) ?? "";
    if (!accessToken) throw new Error("토큰을 받지 못했습니다.");

    mcpConnectionDb.upsert({
      service,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token as string | undefined,
      token_type: (tokenData.token_type as string) ?? "Bearer",
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
        : undefined,
      user_email: (tokenData.email as string) ?? undefined,
    });

    return { success: true, service, email: tokenData.email as string | undefined };
  },

  refreshToken: async (service: string): Promise<boolean> => {
    const config = OAUTH_CONFIGS[service];
    if (!config) return false;

    const conn = mcpConnectionDb.get(service) as {
      refresh_token?: string;
      client_id?: string;
    } | undefined;
    if (!conn?.refresh_token) return false;

    try {
      const body: Record<string, string> = {
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
        client_id: config.clientId,
      };

      // Notion uses Basic auth for token refresh
      const headers: Record<string, string> = {};
      if (service === "Notion" && config.clientId) {
        headers["Authorization"] = `Basic ${Buffer.from(`${config.clientId}:`).toString("base64")}`;
      }

      const tokenData = await postJSON(config.tokenUrl, body, headers);
      const accessToken = (tokenData.access_token as string) ?? "";
      if (!accessToken) return false;

      mcpConnectionDb.upsert({
        service,
        access_token: accessToken,
        refresh_token: (tokenData.refresh_token as string) ?? conn.refresh_token,
        token_type: (tokenData.token_type as string) ?? "Bearer",
        expires_at: tokenData.expires_in
          ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
          : undefined,
      });

      // MCP settings.json의 env도 새 토큰으로 업데이트
      const mapping = MCP_TOKEN_MAPPINGS[service];
      if (mapping) {
        await mcpService.updateEnv(mapping.mcpName, mapping.buildEnv(accessToken));
      }

      return true;
    } catch {
      return false;
    }
  },

  /** Get connection, auto-refresh if token expired */
  getConnection: async (service: string) => {
    const conn = mcpConnectionDb.get(service) as {
      expires_at?: string;
      refresh_token?: string;
      [key: string]: unknown;
    } | undefined;
    if (!conn) return null;

    // Check expiry (refresh 5 minutes before actual expiry)
    if (conn.expires_at) {
      const expiresAt = new Date(conn.expires_at).getTime();
      const now = Date.now();
      if (now > expiresAt - 5 * 60 * 1000) {
        // Token expired or about to expire
        if (conn.refresh_token) {
          const refreshed = await oauthService.refreshToken(service);
          if (refreshed) {
            return mcpConnectionDb.get(service);
          }
        }
        // Couldn't refresh — return null to force re-auth
        return null;
      }
    }

    return conn;
  },

  getConnectionSync: (service: string) => mcpConnectionDb.get(service),
  disconnect: (service: string) => mcpConnectionDb.remove(service),
  getAllConnections: () => mcpConnectionDb.getAll(),
};
