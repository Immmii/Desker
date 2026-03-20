#!/usr/bin/env node
/**
 * Desker MCP Server
 * Claude Code가 Desker의 프로젝트/태스크 DB에 접근하는 MCP 서버
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import path from "path";
import os from "os";
import crypto from "crypto";

// ── DB ──
const dbPath = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "desker",
  "desker.db"
);

let db;
try {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
} catch {
  process.stderr.write(`[desker-mcp] DB not found: ${dbPath}\n`);
}

// ── Server ──
const server = new Server(
  { name: "desker", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ── List Tools ──
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "desker_list_projects",
      description: "Desker 프로젝트 목록 조회",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "desker_list_tasks",
      description: "Desker 태스크 목록 조회 (project_id, status 필터 가능)",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "프로젝트 ID" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
        },
      },
    },
    {
      name: "desker_create_task",
      description: "Desker에 새 태스크 생성",
      inputSchema: {
        type: "object",
        properties: {
          project_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string", description: "YYYY-MM-DD" },
        },
        required: ["project_id", "title"],
      },
    },
    {
      name: "desker_update_task",
      description: "Desker 태스크 수정 (상태, 제목, 우선순위 등)",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string" },
        },
        required: ["task_id"],
      },
    },
    {
      name: "desker_create_project",
      description: "Desker에 새 프로젝트 생성",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          icon: { type: "string", description: "이모지" },
          color: { type: "string", description: "HEX 색상" },
          type: { type: "string", enum: ["task", "journal"] },
        },
        required: ["name"],
      },
    },
  ],
}));

// ── Call Tool ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!db) {
    return { content: [{ type: "text", text: "Error: Desker DB not found" }] };
  }

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "desker_list_projects": {
        const rows = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
        return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
      }

      case "desker_list_tasks": {
        let sql = "SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON t.project_id = p.id";
        const conds = [];
        const params = [];
        if (args?.project_id) { conds.push("t.project_id = ?"); params.push(args.project_id); }
        if (args?.status) { conds.push("t.status = ?"); params.push(args.status); }
        if (conds.length) sql += " WHERE " + conds.join(" AND ");
        sql += " ORDER BY t.created_at DESC";
        const rows = db.prepare(sql).all(...params);
        return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
      }

      case "desker_create_task": {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          "INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, created_at) VALUES (?, ?, ?, ?, 'todo', ?, ?, ?)"
        ).run(id, args.project_id, args.title, args.description || "", args.priority || "medium", args.due_date || null, now);
        const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
        return { content: [{ type: "text", text: `생성 완료:\n${JSON.stringify(row, null, 2)}` }] };
      }

      case "desker_update_task": {
        const fields = {};
        for (const k of ["title", "description", "status", "priority", "due_date"]) {
          if (args[k] !== undefined) fields[k] = args[k];
        }
        if (!Object.keys(fields).length) {
          return { content: [{ type: "text", text: "수정할 필드 없음" }] };
        }
        const sets = Object.keys(fields).map(k => `${k} = ?`).join(", ");
        db.prepare(`UPDATE tasks SET ${sets} WHERE id = ?`).run(...Object.values(fields), args.task_id);
        const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(args.task_id);
        return { content: [{ type: "text", text: `수정 완료:\n${JSON.stringify(row, null, 2)}` }] };
      }

      case "desker_create_project": {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          "INSERT INTO projects (id, name, icon, color, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(id, args.name, args.icon || "📁", args.color || "#6c5ce7", args.type || "task", now, now);
        const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
        return { content: [{ type: "text", text: `생성 완료:\n${JSON.stringify(row, null, 2)}` }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
    }
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }] };
  }
});

// ── Start ──
const transport = new StdioServerTransport();
await server.connect(transport);
