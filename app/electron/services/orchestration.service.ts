import { spawnAiCli, writeToAi, getAi } from "./ai.service";
import * as db from "./db.service";
import { EventEmitter } from "events";
import crypto from "crypto";

const orchestrationEmitter = new EventEmitter();

export function getOrchestrationEmitter() { return orchestrationEmitter; }

export function spawnChildAgent(opts: {
  parentSessionId: string;
  role: string;
  environment: string;
  instructions: string;
  taskId?: string;
  aiModel?: string;
}): { sessionId: string } {
  const sessionId = `orch-${crypto.randomUUID().slice(0, 8)}`;
  const model = (opts.aiModel as "claude" | "chatgpt") || "claude";

  // Insert DB record
  const now = new Date().toISOString();
  db.insertWorkflowSession({
    id: sessionId,
    task_id: opts.taskId || null,
    parent_session_id: opts.parentSessionId,
    agent_role: opts.role,
    agent_env: opts.environment,
    status: "idle",
    result_summary: null,
    created_at: now,
    updated_at: now,
  });

  // Log spawn message
  db.insertAgentMessage({
    id: crypto.randomUUID(),
    from_session_id: opts.parentSessionId,
    to_session_id: sessionId,
    message_type: "spawn_request",
    content: JSON.stringify({ role: opts.role, instructions: opts.instructions }),
    created_at: now,
  });

  // Spawn AI CLI process
  try {
    spawnAiCli(sessionId, model);

    // Send instructions after a delay for CLI to initialize
    setTimeout(() => {
      writeToAi(sessionId, opts.instructions + "\r");
      db.updateWorkflowSession(sessionId, { status: "working", updated_at: new Date().toISOString() });
      orchestrationEmitter.emit("statusChanged", sessionId, "working");
    }, 2000);
  } catch (err) {
    db.updateWorkflowSession(sessionId, { status: "error", updated_at: new Date().toISOString() });
    orchestrationEmitter.emit("statusChanged", sessionId, "error");
  }

  return { sessionId };
}

export function getAgentStatus(sessionId: string): { status: string; role?: string; result?: string } | null {
  const session = db.getWorkflowSession(sessionId);
  if (!session) return null;
  return { status: session.status, role: session.agent_role, result: session.result_summary ?? undefined };
}

export function getAgentResult(sessionId: string): { result: string | null; messages: unknown[] } | null {
  const session = db.getWorkflowSession(sessionId);
  if (!session) return null;
  const messages = db.getAgentMessages(sessionId);
  return { result: session.result_summary, messages };
}

export function sendToAgent(sessionId: string, message: string, fromSessionId?: string): boolean {
  const ai = getAi(sessionId);
  if (!ai) return false;

  writeToAi(sessionId, message + "\r");

  db.insertAgentMessage({
    id: crypto.randomUUID(),
    from_session_id: fromSessionId || "system",
    to_session_id: sessionId,
    message_type: "message",
    content: message,
    created_at: new Date().toISOString(),
  });

  return true;
}

export function updateAgentStatus(sessionId: string, status: string, resultSummary?: string) {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (resultSummary) updates.result_summary = resultSummary;
  db.updateWorkflowSession(sessionId, updates);
  orchestrationEmitter.emit("statusChanged", sessionId, status);
}
