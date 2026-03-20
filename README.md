# Desker

**AI Agent Task Tracker — 터미널 기반 생산성 데스크톱 앱**

> Claude Code, ChatGPT CLI와 통합된 AI 터미널 + 태스크 관리를 하나의 앱에서.

<p align="center">
  <img src="https://github.com/user-attachments/assets/71a3133a-822a-461e-a11e-bf201f9921d2" alt="AI 터미널 + 태스크 패널" width="720" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/9a0719d5-80b6-46e3-ac8a-4df7c162ab97" alt="세션 시작 모달" width="350" />
  <img src="https://github.com/user-attachments/assets/a9970e48-271c-4ad7-bf2d-0b3852d522e8" alt="2-Pane 분할" width="350" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/fb53af34-17d1-4459-91f2-781785fd8115" alt="3-Pane 분할 (Claude + Claude + Shell)" width="720" />
</p>

---

## 주요 기능

### 🖥️ AI 터미널
- **Claude / ChatGPT CLI** 네이티브 통합
- **3-Pane 분할 뷰** — 최대 3개 터미널을 동시에 분할, 드래그로 비율 미리보기
- **Chip 탭** — 상태 아이콘(sparkle) + 드래그 정렬
- **파일 드래그앤드롭** — 파일을 터미널에 드롭하면 칩 표시, Enter 시 AI에 전달 (경로 미노출)
- **Shift+Enter** 줄바꿈 지원
- **세션 유지** — 탭 전환해도 터미널 상태 보존

### 📋 태스크 관리
- **칸반 / 리스트 / 캘린더** 3가지 뷰
- 태스크에서 바로 터미널 세션 시작
- 연관 태스크 사이드 패널 (터미널에서 바로 상태 변경)
- MCP 서버로 AI가 태스크 직접 조회/생성/수정

### 🎨 디자인 시스템
- **다크 / 라이트 테마** 완전 지원
- 플러그인/에디터와 통일된 버튼 스타일 (chip, smallBtn, accent)
- 커스텀 트래픽라이트 (블러 시 회색 원)
- 둥근 스크롤바

### 🧩 플러그인
- MCP 서버 기반 확장
- npm 패키지 / HTTP 엔드포인트 등록
- OAuth 서비스 연동

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| **프레임워크** | Electron + electron-vite |
| **UI** | React 19 + TypeScript |
| **스타일** | Tailwind CSS 4 + CSS Variables |
| **상태관리** | Zustand |
| **터미널** | xterm.js + node-pty |
| **DB** | SQLite (better-sqlite3) |
| **DnD** | @dnd-kit/core + @dnd-kit/sortable |
| **AI** | Claude CLI / ChatGPT CLI (PTY 기반) |

---

## 시작하기

### 요구사항

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 또는 ChatGPT CLI (선택)

### 설치 및 실행

```bash
cd app
npm install
npm run dev
```

### 빌드

```bash
cd app
npm run build
```

---

## 프로젝트 구조

```
desker/
├── app/
│   ├── electron/          # Electron 메인 프로세스
│   │   ├── main.ts        # 윈도우 생성, 트래픽라이트
│   │   ├── preload.ts     # contextBridge API
│   │   ├── ipc/           # IPC 핸들러 (pty, ai, db, mcp...)
│   │   └── services/      # 비즈니스 로직 (PTY, AI, DB, OAuth...)
│   ├── src/
│   │   ├── hooks/         # useTerminal, useDesktopFiles
│   │   ├── viewmodels/    # Zustand 스토어 (session, project, ai...)
│   │   ├── views/
│   │   │   ├── layouts/   # AppShell, Sidebar
│   │   │   ├── pages/     # Terminal, Workspace, Tasks, Editor...
│   │   │   ├── shared/    # StartSessionModal, Icons
│   │   │   └── widgets/   # KanbanBoard, ChatView, HomeOffice...
│   │   ├── types/         # TypeScript 타입 정의
│   │   └── styles.css     # 디자인 시스템 (테마, 스크롤바)
│   └── package.json
└── mcp/                   # Desker MCP 서버
    └── desker-mcp-server.mjs
```

---

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 기본 브랜치 (안정) |
| `feat/{기능}` | 새 기능 개발 |
| `fix/{수정}` | 버그 수정 |

PR → merge commit으로 합류.

---

## 라이선스

Private repository.
