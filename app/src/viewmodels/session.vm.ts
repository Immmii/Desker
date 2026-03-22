import { create } from "zustand";

export type TerminalMode = "shell" | "ai";
export type AiModel = "claude" | "chatgpt";

// ── Multi-Agent ──
export type AgentEnvironment = "general" | "development";
export type GeneralAgentRole = "task" | "research" | "docs";
export type DevAgentRole = "planning" | "client" | "server" | "testing" | "qa" | "devops" | "security";
export type AgentRole = GeneralAgentRole | DevAgentRole;

export interface AgentPreset {
  role: AgentRole;
  environment: AgentEnvironment;
  label: string;
  icon: string;
  color: string;
  description: string;
  systemPrompt: string;
}

export const AGENT_PRESETS: AgentPreset[] = [
  // ── General ──
  {
    role: "task",
    environment: "general",
    label: "태스크 수행",
    icon: "🎯",
    color: "#6c5ce7",
    description: "할 일 처리, 작업 실행",
    systemPrompt: "You are a task execution agent. Focus on completing the assigned task efficiently. Break down complex tasks into actionable steps and execute them one by one.",
  },
  {
    role: "research",
    environment: "general",
    label: "리서치",
    icon: "🔍",
    color: "#0984e3",
    description: "정보 수집, 조사, 분석",
    systemPrompt: "You are a research agent. Your role is to gather information, analyze data, compare options, and provide well-structured findings. Cite sources when possible.",
  },
  {
    role: "docs",
    environment: "general",
    label: "문서화",
    icon: "📄",
    color: "#00b894",
    description: "문서 작성, 정리, 요약",
    systemPrompt: "You are a documentation agent. Write clear, well-structured documents. Organize information logically with proper headings, lists, and formatting.",
  },

  // ── Development ──
  {
    role: "planning",
    environment: "development",
    label: "기획",
    icon: "📝",
    color: "#e17055",
    description: "개발 명세 작성, 아키텍처 설계",
    systemPrompt: "You are a planning agent. Create detailed development specifications, design system architecture, define data models, and write implementation plans. Output structured specs that other agents can follow.",
  },
  {
    role: "client",
    environment: "development",
    label: "Client Dev",
    icon: "🖥",
    color: "#74b9ff",
    description: "프론트엔드 개발 (React, UI)",
    systemPrompt: "You are a frontend development agent specializing in React, TypeScript, and CSS. Write clean component code, handle state management, and implement responsive UI. Follow the project's existing patterns and conventions.",
  },
  {
    role: "server",
    environment: "development",
    label: "Server Dev",
    icon: "⚙",
    color: "#fdcb6e",
    description: "백엔드 개발 (API, DB, 로직)",
    systemPrompt: "You are a backend development agent. Implement APIs, database schemas, business logic, and server-side functionality. Focus on performance, security, and clean architecture.",
  },
  {
    role: "testing",
    environment: "development",
    label: "Testing",
    icon: "🧪",
    color: "#a29bfe",
    description: "테스트 작성, 실행, 커버리지",
    systemPrompt: "You are a testing agent. Write unit tests, integration tests, and e2e tests. Ensure high code coverage and catch edge cases. Use the project's testing framework.",
  },
  {
    role: "qa",
    environment: "development",
    label: "QA",
    icon: "✅",
    color: "#55efc4",
    description: "코드 리뷰, 버그 탐지, 품질 검증",
    systemPrompt: "You are a QA agent. Review code for bugs, security issues, performance problems, and style inconsistencies. Suggest improvements and verify fixes. Be thorough but constructive.",
  },
  {
    role: "devops",
    environment: "development",
    label: "DevOps",
    icon: "📊",
    color: "#fd79a8",
    description: "Git commit/Issue/PR/Project 관리",
    systemPrompt: "You are a DevOps agent. Manage git workflows, write commit messages, create issues and PRs, track project progress, and handle CI/CD. Follow conventional commit standards.",
  },
  {
    role: "security",
    environment: "development",
    label: "Security",
    icon: "🔒",
    color: "#e74c3c",
    description: "보안 점검, 취약점 분석, 인증/인가",
    systemPrompt: "You are a security agent. Audit code for vulnerabilities (OWASP Top 10), review authentication/authorization flows, check for injection risks, validate input sanitization, and recommend security best practices.",
  },
];

export function getAgentPreset(role: AgentRole): AgentPreset | undefined {
  return AGENT_PRESETS.find((p) => p.role === role);
}

// ── Session ──
export interface TerminalSession {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  projectIcon: string;
  state: "idle" | "working" | "error";
  startedAt: string;
  mode: TerminalMode;
  aiModel?: AiModel;
  agentRole?: AgentRole;
  agentEnv?: AgentEnvironment;
}

interface SessionViewModel {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  createSession: (
    session: Omit<TerminalSession, "id" | "state" | "startedAt">
  ) => string;
  setActiveSession: (id: string | null) => void;
  removeSession: (id: string) => void;
  updateSessionState: (id: string, state: TerminalSession["state"]) => void;
}

let nextId = 1;

// ── Persistence helpers ──
const STORAGE_KEY = "desker-sessions";
const ACTIVE_KEY = "desker-active-session";

function loadSessions(): { sessions: TerminalSession[]; activeSessionId: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], activeSessionId: null };
    const sessions: TerminalSession[] = JSON.parse(raw).map((s: TerminalSession) => ({
      ...s,
      state: "idle" as const, // PTY is gone after restart
    }));
    if (sessions.length > 0) {
      const maxId = Math.max(...sessions.map((s) => {
        const m = s.id.match(/^session-(\d+)$/);
        return m ? Number(m[1]) : 0;
      }));
      nextId = maxId + 1;
    }
    const activeId = localStorage.getItem(ACTIVE_KEY);
    const activeSessionId = sessions.some((s) => s.id === activeId) ? activeId : sessions[0]?.id ?? null;
    return { sessions, activeSessionId };
  } catch {
    return { sessions: [], activeSessionId: null };
  }
}

function saveSessions(sessions: TerminalSession[], activeSessionId: string | null) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  if (activeSessionId) {
    localStorage.setItem(ACTIVE_KEY, activeSessionId);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

const initial = loadSessions();

export const useSessionVM = create<SessionViewModel>((set) => ({
  sessions: initial.sessions,
  activeSessionId: initial.activeSessionId,

  createSession: (session) => {
    const id = `session-${nextId++}`;
    set((s) => {
      const next = {
        sessions: [
          ...s.sessions,
          {
            ...session,
            id,
            state: "working" as const,
            startedAt: new Date().toISOString(),
          },
        ],
        activeSessionId: id,
      };
      saveSessions(next.sessions, next.activeSessionId);
      return next;
    });
    return id;
  },

  setActiveSession: (id) =>
    set((s) => {
      saveSessions(s.sessions, id);
      return { activeSessionId: id };
    }),

  removeSession: (id) =>
    set((s) => {
      const sessions = s.sessions.filter((ss) => ss.id !== id);
      const activeSessionId =
        s.activeSessionId === id
          ? s.sessions.find((ss) => ss.id !== id)?.id ?? null
          : s.activeSessionId;
      saveSessions(sessions, activeSessionId);
      return { sessions, activeSessionId };
    }),

  updateSessionState: (id, state) =>
    set((s) => {
      const sessions = s.sessions.map((ss) =>
        ss.id === id ? { ...ss, state } : ss
      );
      saveSessions(sessions, s.activeSessionId);
      return { sessions };
    }),
}));
