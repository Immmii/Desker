import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import crypto from "crypto";

let db: Database.Database;

export function initDatabase() {
  const dbPath = path.join(app.getPath("userData"), "desker.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations();
  seedDefaults();
  dotArtDb.seedPresets();
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'task',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS room_objects (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      label TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dot_arts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grid_size INTEGER NOT NULL,
      pixels TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '내 작품',
      is_preset INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mcp_connections (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_type TEXT NOT NULL DEFAULT 'Bearer',
      expires_at TEXT,
      user_email TEXT,
      connected_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oauth_credentials (
      service TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL DEFAULT ''
    );
  `);

  // Add new columns if they don't exist (migration for existing DBs)
  try {
    db.exec("ALTER TABLE dot_arts ADD COLUMN category TEXT NOT NULL DEFAULT '내 작품'");
  } catch { /* column already exists */ }
  try {
    db.exec("ALTER TABLE dot_arts ADD COLUMN is_preset INTEGER NOT NULL DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT");
  } catch { /* column already exists */ }

  // task_todos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_todos (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // agent_contexts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_contexts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // timetable_blocks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS timetable_blocks (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      cell_key TEXT NOT NULL,
      task_id TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // habits + habit_logs tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(habit_id, date)
    );
  `);
}

function seedDefaults() {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM projects").get() as { cnt: number };
  if (count.cnt > 0) return;

  const now = new Date().toISOString();
  const insertProject = db.prepare(
    "INSERT INTO projects (id, name, icon, color, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertTask = db.prepare(
    "INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const seedTx = db.transaction(() => {
    insertProject.run("p1", "대학교", "🎓", "#6c5ce7", "task", now, now);
    insertProject.run("p2", "코딩 프로젝트", "💻", "#00b894", "task", now, now);
    insertProject.run("p3", "일기장", "📔", "#fdcb6e", "journal", now, now);

    insertTask.run("t1", "p1", "종합설계 과제 제출", "기말 프로젝트 보고서 작성", "todo", "high", "2026-03-25", now);
    insertTask.run("t2", "p1", "운영체제 복습", "중간고사 범위 정리", "in_progress", "medium", "2026-03-22", now);
    insertTask.run("t3", "p2", "Desker MVP 구현", "Phase 1 Foundation 완료", "in_progress", "high", null, now);
  });
  seedTx();
}

function genId() {
  return crypto.randomUUID();
}

export function getDb() {
  return db;
}

// ── Project CRUD ──
export const projectDb = {
  getAll: () => db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all(),

  add: (p: { name: string; icon: string; color: string; type: string }) => {
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO projects (id, name, icon, color, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, p.name, p.icon, p.color, p.type, now, now);
    return db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  },

  update: (id: string, updates: Record<string, unknown>) => {
    const fields = Object.keys(updates);
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => updates[f]);
    db.prepare(`UPDATE projects SET ${sets}, updated_at = ? WHERE id = ?`).run(
      ...values,
      new Date().toISOString(),
      id
    );
  },

  remove: (id: string) => {
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  },
};

// ── Task CRUD ──
export const taskDb = {
  getAll: (projectId?: string) => {
    if (projectId) {
      return db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC").all(projectId);
    }
    return db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
  },

  add: (t: { project_id: string; title: string; description: string; status: string; priority: string; due_date: string | null; start_date?: string | null }) => {
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, start_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, t.project_id, t.title, t.description, t.status, t.priority, t.due_date, t.start_date ?? null, now);
    return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  },

  update: (id: string, updates: Record<string, unknown>) => {
    const fields = Object.keys(updates);
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => updates[f]);
    db.prepare(`UPDATE tasks SET ${sets} WHERE id = ?`).run(...values, id);
  },

  remove: (id: string) => {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  },
};

// ── Room Objects ──
export const roomObjectDb = {
  getAll: () => db.prepare("SELECT * FROM room_objects").all(),

  save: (objects: { id: string; type: string; x: number; y: number; label: string }[]) => {
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM room_objects").run();
      const insert = db.prepare(
        "INSERT INTO room_objects (id, type, x, y, label) VALUES (?, ?, ?, ?, ?)"
      );
      for (const obj of objects) {
        insert.run(obj.id, obj.type, obj.x, obj.y, obj.label);
      }
    });
    tx();
  },
};

// ── Dot Art CRUD ──
export const dotArtDb = {
  getAll: (category?: string) => {
    if (category) {
      return db.prepare("SELECT * FROM dot_arts WHERE category = ? ORDER BY is_preset DESC, created_at DESC").all(category);
    }
    return db.prepare("SELECT * FROM dot_arts ORDER BY is_preset DESC, created_at DESC").all();
  },

  add: (t: { name: string; grid_size: number; pixels: string; category: string }) => {
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO dot_arts (id, name, grid_size, pixels, category, is_preset, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
    ).run(id, t.name, t.grid_size, t.pixels, t.category, now);
    return db.prepare("SELECT * FROM dot_arts WHERE id = ?").get(id);
  },

  remove: (id: string) => {
    const row = db.prepare("SELECT is_preset FROM dot_arts WHERE id = ?").get(id) as { is_preset: number } | undefined;
    if (row?.is_preset) throw new Error("프리셋은 삭제할 수 없습니다.");
    db.prepare("DELETE FROM dot_arts WHERE id = ?").run(id);
  },

  seedPresets: () => {
    const count = db.prepare("SELECT COUNT(*) as cnt FROM dot_arts WHERE is_preset = 1").get() as { cnt: number };
    if (count.cnt > 0) return;

    const now = new Date().toISOString();
    const insert = db.prepare(
      "INSERT INTO dot_arts (id, name, grid_size, pixels, category, is_preset, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)"
    );

    const tx = db.transaction(() => {
      // ── 가구 (8x8) ──
      // 미니 책상
      insert.run("preset-desk", "미니 책상", 8, JSON.stringify([
        [null,null,null,null,null,null,null,null],
        [null,null,"#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C",null,null],
        [null,"#8B5E3C","#A0522D","#A0522D","#A0522D","#A0522D","#8B5E3C",null],
        [null,"#8B5E3C","#A0522D","#CD853F","#CD853F","#A0522D","#8B5E3C",null],
        [null,"#8B5E3C","#A0522D","#A0522D","#A0522D","#A0522D","#8B5E3C",null],
        [null,null,"#5C3A1E",null,null,"#5C3A1E",null,null],
        [null,null,"#5C3A1E",null,null,"#5C3A1E",null,null],
        [null,null,"#5C3A1E",null,null,"#5C3A1E",null,null],
      ]), "가구", now);

      // 미니 의자
      insert.run("preset-chair", "미니 의자", 8, JSON.stringify([
        [null,null,null,"#4A90D9",null,null,null,null],
        [null,null,null,"#4A90D9",null,null,null,null],
        [null,"#4A90D9","#4A90D9","#4A90D9","#4A90D9","#4A90D9",null,null],
        [null,"#3B7DD8","#5BA0E0","#5BA0E0","#5BA0E0","#3B7DD8",null,null],
        [null,null,null,"#333333",null,null,null,null],
        [null,null,"#333333","#333333","#333333",null,null,null],
        [null,"#333333",null,null,null,"#333333",null,null],
        [null,"#333333",null,null,null,"#333333",null,null],
      ]), "가구", now);

      // 미니 침대
      insert.run("preset-bed", "미니 침대", 8, JSON.stringify([
        ["#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C"],
        ["#8B5E3C","#E8D5B7","#E8D5B7","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#8B5E3C"],
        ["#8B5E3C","#E8D5B7","#E8D5B7","#6CB4E0","#6CB4E0","#6CB4E0","#6CB4E0","#8B5E3C"],
        ["#8B5E3C","#F5E6CC","#F5E6CC","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#8B5E3C"],
        ["#8B5E3C","#F5E6CC","#F5E6CC","#6CB4E0","#6CB4E0","#6CB4E0","#6CB4E0","#8B5E3C"],
        ["#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C","#8B5E3C"],
        [null,"#5C3A1E",null,null,null,null,"#5C3A1E",null],
        [null,"#5C3A1E",null,null,null,null,"#5C3A1E",null],
      ]), "가구", now);

      // ── 데코 (8x8) ──
      // 꽃
      insert.run("preset-flower", "꽃", 8, JSON.stringify([
        [null,null,null,"#FF69B4",null,null,null,null],
        [null,null,"#FF69B4","#FFD700","#FF69B4",null,null,null],
        [null,"#FF69B4","#FFD700","#FFD700","#FFD700","#FF69B4",null,null],
        [null,null,"#FF69B4","#FFD700","#FF69B4",null,null,null],
        [null,null,null,"#FF69B4",null,null,null,null],
        [null,null,null,"#228B22",null,null,null,null],
        [null,null,"#228B22","#228B22","#228B22",null,null,null],
        [null,null,null,"#228B22",null,null,null,null],
      ]), "데코", now);

      // 별
      insert.run("preset-star", "별", 8, JSON.stringify([
        [null,null,null,"#FFD700",null,null,null,null],
        [null,null,null,"#FFD700",null,null,null,null],
        [null,"#FFD700","#FFD700","#FFD700","#FFD700","#FFD700",null,null],
        [null,null,"#FFD700","#FFF8DC","#FFD700",null,null,null],
        [null,null,"#FFD700","#FFD700","#FFD700",null,null,null],
        [null,"#FFD700",null,"#FFD700",null,"#FFD700",null,null],
        ["#FFD700",null,null,"#FFD700",null,null,"#FFD700",null],
        [null,null,null,null,null,null,null,null],
      ]), "데코", now);

      // 하트
      insert.run("preset-heart", "하트", 8, JSON.stringify([
        [null,null,null,null,null,null,null,null],
        [null,"#FF1744","#FF1744",null,"#FF1744","#FF1744",null,null],
        ["#FF1744","#FF5252","#FF1744","#FF1744","#FF1744","#FF5252","#FF1744",null],
        ["#FF1744","#FF1744","#FF1744","#FF1744","#FF1744","#FF1744","#FF1744",null],
        [null,"#FF1744","#FF1744","#FF1744","#FF1744","#FF1744",null,null],
        [null,null,"#FF1744","#FF1744","#FF1744",null,null,null],
        [null,null,null,"#FF1744",null,null,null,null],
        [null,null,null,null,null,null,null,null],
      ]), "데코", now);

      // ── 캐릭터 (8x8) ──
      // 고양이
      insert.run("preset-cat", "고양이", 8, JSON.stringify([
        [null,"#FF8C00",null,null,null,null,"#FF8C00",null],
        ["#FF8C00","#FFA500","#FF8C00",null,null,"#FF8C00","#FFA500","#FF8C00"],
        ["#FF8C00","#FFA500","#FFA500","#FFA500","#FFA500","#FFA500","#FFA500","#FF8C00"],
        ["#FF8C00","#FFA500","#2E2E2E","#FFA500","#FFA500","#2E2E2E","#FFA500","#FF8C00"],
        [null,"#FFA500","#FFA500","#FFB6C1","#FFA500","#FFA500","#FFA500",null],
        [null,null,"#FFA500","#FFA500","#FFA500","#FFA500",null,null],
        [null,null,null,"#FFA500","#FFA500",null,null,null],
        [null,null,null,null,null,null,null,null],
      ]), "캐릭터", now);

      // 강아지
      insert.run("preset-dog", "강아지", 8, JSON.stringify([
        [null,"#D2691E","#D2691E",null,null,"#D2691E","#D2691E",null],
        ["#D2691E","#DEB887","#DEB887","#D2691E","#D2691E","#DEB887","#DEB887","#D2691E"],
        [null,"#DEB887","#2E2E2E","#DEB887","#DEB887","#2E2E2E","#DEB887",null],
        [null,"#DEB887","#DEB887","#DEB887","#DEB887","#DEB887","#DEB887",null],
        [null,null,"#DEB887","#333333","#DEB887","#DEB887",null,null],
        [null,null,"#DEB887","#DEB887","#DEB887","#DEB887",null,null],
        [null,null,null,"#DEB887","#DEB887",null,null,null],
        [null,null,null,null,null,null,null,null],
      ]), "캐릭터", now);

      // ── 배경 (8x8) ──
      // 잔디
      insert.run("preset-grass", "잔디", 8, JSON.stringify([
        ["#228B22","#2E8B57","#228B22","#2E8B57","#228B22","#2E8B57","#228B22","#2E8B57"],
        ["#2E8B57","#228B22","#32CD32","#228B22","#2E8B57","#228B22","#32CD32","#228B22"],
        ["#228B22","#32CD32","#228B22","#2E8B57","#228B22","#32CD32","#228B22","#2E8B57"],
        ["#2E8B57","#228B22","#2E8B57","#228B22","#32CD32","#228B22","#2E8B57","#228B22"],
        ["#228B22","#2E8B57","#228B22","#32CD32","#228B22","#2E8B57","#228B22","#32CD32"],
        ["#32CD32","#228B22","#2E8B57","#228B22","#2E8B57","#228B22","#32CD32","#228B22"],
        ["#228B22","#2E8B57","#228B22","#2E8B57","#32CD32","#2E8B57","#228B22","#2E8B57"],
        ["#2E8B57","#228B22","#32CD32","#228B22","#228B22","#228B22","#2E8B57","#228B22"],
      ]), "배경", now);

      // 하늘
      insert.run("preset-sky", "하늘", 8, JSON.stringify([
        ["#87CEEB","#87CEEB","#ADD8E6","#87CEEB","#87CEEB","#ADD8E6","#87CEEB","#87CEEB"],
        ["#ADD8E6","#87CEEB","#87CEEB","#ffffff","#ffffff","#87CEEB","#87CEEB","#ADD8E6"],
        ["#87CEEB","#87CEEB","#ffffff","#ffffff","#ffffff","#ffffff","#87CEEB","#87CEEB"],
        ["#87CEEB","#ADD8E6","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#ADD8E6","#87CEEB"],
        ["#ADD8E6","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#ADD8E6"],
        ["#87CEEB","#87CEEB","#87CEEB","#ffffff","#ffffff","#87CEEB","#87CEEB","#87CEEB"],
        ["#87CEEB","#ADD8E6","#ffffff","#ffffff","#ffffff","#ffffff","#ADD8E6","#87CEEB"],
        ["#ADD8E6","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#87CEEB","#ADD8E6"],
      ]), "배경", now);
    });
    tx();
  },
};

// ── Task Todos ──
export const taskTodoDb = {
  getByTaskId: (taskId: string) =>
    db.prepare("SELECT * FROM task_todos WHERE task_id = ? ORDER BY sort_order ASC").all(taskId),

  add: (t: { task_id: string; text: string }) => {
    const id = genId();
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM task_todos WHERE task_id = ?").get(t.task_id) as { m: number };
    db.prepare(
      "INSERT INTO task_todos (id, task_id, text, done, sort_order) VALUES (?, ?, ?, 0, ?)"
    ).run(id, t.task_id, t.text, maxOrder.m + 1);
    return db.prepare("SELECT * FROM task_todos WHERE id = ?").get(id);
  },

  update: (id: string, updates: Record<string, unknown>) => {
    const fields = Object.keys(updates);
    const sets = fields.map((f) => `${f} = ?`).join(", ");
    const values = fields.map((f) => updates[f]);
    db.prepare(`UPDATE task_todos SET ${sets} WHERE id = ?`).run(...values, id);
  },

  remove: (id: string) => {
    db.prepare("DELETE FROM task_todos WHERE id = ?").run(id);
  },
};

// ── Agent Contexts ──
export const agentContextDb = {
  save: (taskId: string, agentRole: string, content: string) => {
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO agent_contexts (id, task_id, agent_role, content, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, taskId, agentRole, content, now);
    return db.prepare("SELECT * FROM agent_contexts WHERE id = ?").get(id);
  },

  getByTaskId: (taskId: string) =>
    db.prepare("SELECT * FROM agent_contexts WHERE task_id = ? ORDER BY created_at ASC").all(taskId),
};

// ── MCP Connections ──
export const mcpConnectionDb = {
  getAll: () => db.prepare("SELECT * FROM mcp_connections ORDER BY connected_at DESC").all(),

  get: (service: string) => db.prepare("SELECT * FROM mcp_connections WHERE service = ?").get(service),

  upsert: (conn: {
    service: string;
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_at?: string;
    user_email?: string;
  }) => {
    const id = genId();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO mcp_connections (id, service, access_token, refresh_token, token_type, expires_at, user_email, connected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(service) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_type = excluded.token_type,
        expires_at = excluded.expires_at,
        user_email = excluded.user_email,
        connected_at = excluded.connected_at
    `).run(id, conn.service, conn.access_token, conn.refresh_token ?? null, conn.token_type ?? "Bearer", conn.expires_at ?? null, conn.user_email ?? null, now);
    return db.prepare("SELECT * FROM mcp_connections WHERE service = ?").get(conn.service);
  },

  remove: (service: string) => {
    db.prepare("DELETE FROM mcp_connections WHERE service = ?").run(service);
  },
};

// ── OAuth Credentials (Client ID/Secret per service) ──
export const oauthCredentialDb = {
  get: (service: string) =>
    db.prepare("SELECT * FROM oauth_credentials WHERE service = ?").get(service) as
      | { service: string; client_id: string; client_secret: string }
      | undefined,

  getAll: () =>
    db.prepare("SELECT * FROM oauth_credentials").all() as {
      service: string;
      client_id: string;
      client_secret: string;
    }[],

  save: (service: string, clientId: string, clientSecret: string) => {
    db.prepare(`
      INSERT INTO oauth_credentials (service, client_id, client_secret)
      VALUES (?, ?, ?)
      ON CONFLICT(service) DO UPDATE SET
        client_id = excluded.client_id,
        client_secret = excluded.client_secret
    `).run(service, clientId, clientSecret);
  },

  remove: (service: string) => {
    db.prepare("DELETE FROM oauth_credentials WHERE service = ?").run(service);
  },
};

// ── Timetable Blocks ──
export const timetableBlockDb = {
  getByDate: (date: string) =>
    db.prepare("SELECT * FROM timetable_blocks WHERE date = ?").all(date),

  saveBatch: (date: string, blocks: { cell_key: string; task_id: string; color: string }[]) => {
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM timetable_blocks WHERE date = ?").run(date);
      const insert = db.prepare(
        "INSERT INTO timetable_blocks (id, date, cell_key, task_id, color, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const now = new Date().toISOString();
      for (const b of blocks) {
        insert.run(genId(), date, b.cell_key, b.task_id, b.color, now);
      }
    });
    tx();
  },

  clearDate: (date: string) => {
    db.prepare("DELETE FROM timetable_blocks WHERE date = ?").run(date);
  },
};

// ── Habits ──
export const habitDb = {
  getAll: () =>
    db.prepare("SELECT * FROM habits ORDER BY sort_order ASC").all(),

  add: (name: string) => {
    const id = genId();
    const now = new Date().toISOString();
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM habits").get() as { m: number };
    db.prepare(
      "INSERT INTO habits (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)"
    ).run(id, name, maxOrder.m + 1, now);
    return db.prepare("SELECT * FROM habits WHERE id = ?").get(id);
  },

  remove: (id: string) => {
    db.prepare("DELETE FROM habits WHERE id = ?").run(id);
  },

  reorder: (id: string, sortOrder: number) => {
    db.prepare("UPDATE habits SET sort_order = ? WHERE id = ?").run(sortOrder, id);
  },

  getLogs: (weekStart: string, weekEnd: string) =>
    db.prepare("SELECT * FROM habit_logs WHERE date >= ? AND date <= ?").all(weekStart, weekEnd),

  toggleLog: (habitId: string, date: string) => {
    const existing = db.prepare("SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?").get(habitId, date) as { id: string; done: number } | undefined;
    if (existing) {
      const newDone = existing.done ? 0 : 1;
      db.prepare("UPDATE habit_logs SET done = ? WHERE id = ?").run(newDone, existing.id);
      return newDone;
    } else {
      const id = genId();
      db.prepare("INSERT INTO habit_logs (id, habit_id, date, done) VALUES (?, ?, ?, 1)").run(id, habitId, date);
      return 1;
    }
  },
};
