# Desker - AI Agent HomeOffice Task Tracker

## 프로젝트 개요
대학생 타겟 MCP 기반 태스크 관리 트래커 macOS 응용 프로그램.
도트 감성의 HomeOffice 테마로 AI Agent를 시각화하고, 프로젝트/태스크를 관리한다.

## 기술 스택
- **프레임워크**: Electron + electron-vite
- **프론트엔드**: React 19 + TypeScript + Tailwind CSS 4 + Zustand 5
- **터미널**: xterm.js + node-pty (실제 PTY)
- **DB**: better-sqlite3 (SQLite, userData 경로)
- **그래픽**: Canvas 2D (HomeOffice 도트아트), Pixi.js
- **드래그앤드롭**: dnd-kit
- **AI CLI**: node-pty로 `claude`/`chatgpt` CLI 스폰
- **빌드**: electron-builder (DMG)

## 아키텍처: MVVM

```
View (React)              ViewModel (Zustand)         Model (Electron Main)
src/views/               src/viewmodels/*.vm.ts      electron/services/
  layouts/                 app.vm.ts (nav)             db.service.ts
  pages/                   project.vm.ts (CRUD→IPC)    pty.service.ts
  widgets/                 session.vm.ts (PTY)         ai.service.ts
  shared/                  dotart.vm.ts                fs.service.ts
                           ai.vm.ts (모델선택)
                                                      electron/ipc/
src/hooks/                                              db/pty/ai/fs.ipc.ts
  useTerminal.ts
  useDesktopFiles.ts      electron/preload.ts (contextBridge)
                          electron/main.ts (BrowserWindow)
```

**데이터 흐름**: View → ViewModel (async) → IPC → Model (main process) → DB/PTY/FS

## 디렉토리 구조
```
desker/
├── CLAUDE.md
├── app/
│   ├── electron/
│   │   ├── main.ts              # Electron 메인 프로세스, BrowserWindow 생성
│   │   ├── preload.ts           # contextBridge로 deskerAPI 노출
│   │   ├── services/
│   │   │   ├── db.service.ts    # better-sqlite3 CRUD + 마이그레이션 + 시딩
│   │   │   ├── pty.service.ts   # node-pty 세션 관리 (Map<id, IPty>)
│   │   │   ├── ai.service.ts    # AI CLI 스폰 (claude/chatgpt)
│   │   │   └── fs.service.ts    # ~/Desktop 파일 목록
│   │   └── ipc/
│   │       ├── db.ipc.ts        # ipcMain.handle("db:*")
│   │       ├── pty.ipc.ts       # invoke + webContents.send 스트리밍
│   │       ├── ai.ipc.ts        # AI 스트리밍 (pty.ipc와 동일 패턴)
│   │       └── fs.ipc.ts
│   ├── src/
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # 테마 적용 + AppShell
│   │   ├── styles.css           # Tailwind + CSS variables (dark/light)
│   │   ├── types/
│   │   │   ├── models.ts        # Project, Task, Session, RoomObject 타입
│   │   │   └── electron.d.ts    # window.deskerAPI 전역 타입
│   │   ├── viewmodels/
│   │   │   ├── app.vm.ts        # 네비게이션, 사이드바 (in-memory)
│   │   │   ├── project.vm.ts    # 프로젝트+태스크 CRUD (async IPC → DB)
│   │   │   ├── session.vm.ts    # 터미널 세션 (mode: shell|ai, aiModel)
│   │   │   ├── dotart.vm.ts     # 도트아트 (in-memory)
│   │   │   └── ai.vm.ts         # AI 모델 선택 상태
│   │   ├── views/
│   │   │   ├── layouts/
│   │   │   │   ├── AppShell.tsx  # 메인 레이아웃 + ProjectPanel + Titlebar
│   │   │   │   └── Sidebar.tsx   # 왼쪽 네비게이션 (84px)
│   │   │   ├── pages/
│   │   │   │   ├── WorkspacePage.tsx   # HomeOffice(40%) + TaskDashboard(60%)
│   │   │   │   ├── DotEditorPage.tsx   # 픽셀아트 에디터
│   │   │   │   ├── TasksPage.tsx       # 전체 TaskDashboard
│   │   │   │   ├── TerminalPage.tsx    # xterm + AI 모델 선택기
│   │   │   │   ├── PluginsPage.tsx     # MCP OAuth 플러그인
│   │   │   │   └── SettingsPage.tsx    # 테마 + 일반 설정
│   │   │   ├── widgets/
│   │   │   │   ├── home-office/HomeOfficeCanvas.tsx  # Canvas 2D 도트 HomeOffice
│   │   │   │   └── task-tracker/
│   │   │   │       ├── TaskDashboard.tsx  # Kanban/Calendar/List 탭
│   │   │   │       ├── KanbanBoard.tsx    # dnd-kit 칸반
│   │   │   │       └── CalendarView.tsx   # 월간/주간 캘린더
│   │   │   └── shared/
│   │   │       ├── Icons.tsx         # 사이드바 SVG 아이콘
│   │   │       └── EditorIcons.tsx   # 도트 에디터 SVG 아이콘
│   │   └── hooks/
│   │       ├── useTerminal.ts    # PTY/AI ↔ xterm.js 연결
│   │       └── useDesktopFiles.ts
│   ├── package.json
│   ├── electron.vite.config.ts   # main/preload/renderer 3-process 설정
│   ├── electron-builder.yml
│   ├── tsconfig.json             # renderer (src/)
│   ├── tsconfig.node.json        # main process (electron/)
│   └── index.html
└── *.jpeg/png/jpg               # Figma 레퍼런스 이미지
```

## 앱 레이아웃
- **왼쪽 사이드바**: Docker Desktop 스타일 (컴팩트, 아이콘+텍스트, 84px)
- **메뉴**: 홈(Workspace) / 도트 에디터 / 태스크 / 터미널 / 플러그인 / 설정
- **타이틀바**: Electron frameless (titleBarStyle: hidden, trafficLightPosition)
- **윈도우 드래그**: CSS `-webkit-app-region: drag` (Titlebar 컴포넌트)

## 핵심 기능 4가지

### 1. AI Agent Visualizer (도트 HomeOffice)
- Canvas 2D로 도트(pixel art) HomeOffice 렌더링
- 인터랙티브 오브젝트: 책상, 파일함(Desktop 파일), 일기장, 모니터(터미널), 램프, 커피 등
- 오브젝트 드래그&드롭 배치 + 카탈로그
- Agent 상태 시각화 (idle/working/error 애니메이션)
- DotArt Store에서 만든 도안 → HomeOffice에 적용

### 2. Task Tracker
- Workspace 메인: HomeOffice(40%) + TaskDashboard(60%)
- 프로젝트/태스크 CRUD → better-sqlite3 영속화
- Kanban (dnd-kit), Calendar, List 뷰
- "▶ 시작" → 터미널 세션 생성 (shell 또는 AI 모드)

### 3. 도트 에디터 (Pixel Art Editor)
- 그리드 기반 (8~64px), 연필/지우개/채우기/스포이드
- 색 팔레트 관리, Export/Import (PNG, JSON)

### 4. MCP Plugin (OAuth 연결)
- Notion, Gmail, Google Calendar, Slack, Figma, Canva 등
- OAuth 방식 인증, 전역 플러그인 관리

## IPC 패턴

### Request-Response (DB, FS)
```
renderer → ipcRenderer.invoke("db:projects:getAll") → ipcMain.handle → db.service → return
```

### Push Streaming (PTY, AI)
```
renderer → ipcRenderer.invoke("pty:create", id) → main에서 onData 리스너 등록
main → webContents.send("pty:data", id, data) → renderer에서 onData 콜백
```

### Preload API (window.deskerAPI)
- `db`: getProjects, addProject, updateProject, removeProject, getTasks, addTask, updateTask, removeTask
- `pty`: create, write, resize, kill, onData, onExit
- `ai`: spawn, write, kill, onData, onExit, checkAvailable
- `fs`: listDesktopFiles
- `window`: minimize, maximize, close

## DB 스키마 (better-sqlite3)
```sql
projects (id TEXT PK, name, icon, color, type, created_at, updated_at)
tasks (id TEXT PK, project_id FK, title, description, status, priority, due_date, created_at)
room_objects (id TEXT PK, type, x, y, label)
dot_arts (id TEXT PK, name, grid_size, pixels TEXT JSON, created_at)
```
- DB 경로: `app.getPath('userData')/desker.db`
- 첫 실행 시 기본 프로젝트/태스크 시딩

## AI CLI 연동
- `node-pty`로 `claude` 또는 `chatgpt` CLI 바이너리 스폰
- 세션 생성 시 `mode: 'shell' | 'ai'` + `aiModel: 'claude' | 'chatgpt'` 선택
- TerminalPage에 AI 모델 선택기 UI (세션 헤더)
- `ai.vm.ts`에서 `checkAvailability()`로 CLI 설치 여부 확인

## 디자인 시스템 & 테마
- **테마 모드**: 다크 / 라이트 / 시스템 연동
- CSS 변수 기반 (`--color-bg-primary`, `--color-accent` 등)
- `[data-theme="light"]` 오버라이드
- Pretendard Variable 폰트

## 빌드 & 실행
```bash
npm run dev       # electron-vite dev (HMR)
npm run build     # electron-vite build (production)
npm run package   # electron-builder → DMG
```

## Figma 레퍼런스 보드
- **파일**: https://www.figma.com/design/7Xfq4tDRIyLJgnmbvIWf6j/Desker
- **페이지**: 기획 레퍼런스 보드 (node-id: 0-1)

### 그룹 1: AI Agent Visualizer (node: 2:6)
| 항목 | 설명 | node |
|------|------|------|
| DotGame | 도트 감성 레퍼런스 | 1:10 |
| OpenClaw Custom | AI Agent 병렬 시각화 | 2:4 |
| Star Office UI | 도트 오피스 레퍼런스 | 2:5 |

### 그룹 2: Task Tracker (node: 2:7)
| 항목 | 설명 | node |
|------|------|------|
| Notion Template | Dashboard, Calendar, Inbox | 2:13 |
| Dashboard | 다크 테마 데이터 시각화 | 2:22 |
| Calendar RoadMap | 캘린더/로드맵 | 2:26 |
| TodoList 위젯 | macOS 네이티브 위젯 | 2:37 |
| Study Planner | 대학생 시간 관리 | 2:43 |

### 그룹 3: MCP Connector (node: 2:31)
| 항목 | 설명 | node |
|------|------|------|
| Claude MCP Connector | 커넥터 UI 레퍼런스 | 2:33 |
| MCP OAuth Plugin | 기능 명세 | 2:32 |
