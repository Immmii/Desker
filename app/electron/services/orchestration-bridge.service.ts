import http from "http";
import path from "path";
import fs from "fs";
import { app } from "electron";
import * as orchestration from "./orchestration.service";

let server: http.Server | null = null;
let portFilePath: string;

export function startOrchestrationBridge(): Promise<number> {
  portFilePath = path.join(app.getPath("userData"), "desker-orchestration-port");

  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      // CORS + JSON
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "127.0.0.1");

      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        try {
          const url = req.url || "";

          if (req.method === "POST" && url === "/orchestration/spawn") {
            const data = JSON.parse(body);
            const result = orchestration.spawnChildAgent(data);
            res.writeHead(200);
            res.end(JSON.stringify(result));
          }
          else if (req.method === "GET" && url.startsWith("/orchestration/status/")) {
            const sessionId = url.split("/").pop()!;
            const result = orchestration.getAgentStatus(sessionId);
            res.writeHead(result ? 200 : 404);
            res.end(JSON.stringify(result || { error: "not found" }));
          }
          else if (req.method === "GET" && url.startsWith("/orchestration/result/")) {
            const sessionId = url.split("/").pop()!;
            const result = orchestration.getAgentResult(sessionId);
            res.writeHead(result ? 200 : 404);
            res.end(JSON.stringify(result || { error: "not found" }));
          }
          else if (req.method === "POST" && url === "/orchestration/send") {
            const data = JSON.parse(body);
            const ok = orchestration.sendToAgent(data.session_id, data.message, data.from_session_id);
            res.writeHead(ok ? 200 : 404);
            res.end(JSON.stringify({ success: ok }));
          }
          else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: "not found" }));
          }
        } catch (err: unknown) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server!.address() as { port: number };
      fs.writeFileSync(portFilePath, String(addr.port), "utf8");
      console.log(`[Orchestration Bridge] listening on 127.0.0.1:${addr.port}`);
      resolve(addr.port);
    });
  });
}

export function stopOrchestrationBridge() {
  server?.close();
  try { fs.unlinkSync(portFilePath); } catch { /* ignore */ }
}
