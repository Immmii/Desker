# Claude Code Plugin Architecture

## 디렉토리 구조

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json            # 매니페스트 (필수)
├── commands/                   # 슬래시 커맨드 (.md)
├── agents/                     # 서브에이전트 (.md)
├── skills/                     # 스킬 팩
│   └── skill-name/
│       ├── SKILL.md           # 핵심 문서 (1500-2000단어)
│       ├── scripts/           # 유틸리티 스크립트
│       ├── references/        # 상세 레퍼런스
│       └── examples/          # 실행 가능 예제
├── hooks/
│   ├── hooks.json             # Hook 이벤트 설정
│   └── scripts/               # Hook 구현 스크립트
├── .mcp.json                  # MCP 서버 설정 (선택)
└── README.md
```

## plugin.json 매니페스트

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "플러그인 설명",
  "author": { "name": "Author", "email": "a@b.com" },
  "commands": "./commands",
  "agents": "./agents",
  "hooks": "./hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

## Command (슬래시 커맨드)

**파일**: `commands/*.md` (자동 발견)

```markdown
---
description: 60자 이내 설명
argument-hint: [arg1] [arg2]
allowed-tools: Read, Write, Bash(git:*)
model: sonnet
---

## Context
- 현재 상태: !`git status`
- 변경사항: !`git diff HEAD`

## Task
위 컨텍스트를 기반으로 작업을 수행하세요.
```

### 핵심 문법
| 문법 | 설명 |
|------|------|
| `$ARGUMENTS` | 전체 인자 문자열 |
| `$1`, `$2` | 위치별 인자 |
| `@file-path` | 파일 내용 삽입 |
| `` !`command` `` | Bash 실행 후 출력 삽입 |
| `${CLAUDE_PLUGIN_ROOT}` | 플러그인 루트 경로 |

## Agent (서브에이전트)

**파일**: `agents/*.md` (자동 발견)

```markdown
---
name: code-reviewer
description: |
  Use this agent when the user asks to "review code"...
  <example>
  user: "Review my PR"
  assistant: "I'll use the code-reviewer agent."
  </example>
model: sonnet
color: green
tools: ["Read", "Grep", "Glob"]
---

You are a code review expert.

## Core Responsibilities
1. 코드 품질 검사
2. 보안 취약점 탐지
3. 성능 이슈 식별
```

### Agent 속성
| 필드 | 값 | 설명 |
|------|---|------|
| `model` | `inherit`, `sonnet`, `opus`, `haiku` | AI 모델 |
| `color` | `blue`, `cyan`, `green`, `yellow`, `magenta`, `red` | UI 색상 |
| `tools` | `["Tool1", "Tool2"]` | 사용 가능 도구 (생략 시 전체) |

## Hook (이벤트 훅)

**파일**: `hooks/hooks.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ${CLAUDE_PLUGIN_ROOT}/scripts/validate.py",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "프로젝트 안내 문구를 출력하세요."
          }
        ]
      }
    ]
  }
}
```

### Hook 이벤트
| 이벤트 | 시점 | 용도 |
|--------|------|------|
| `PreToolUse` | 도구 실행 전 | 검증/차단 |
| `PostToolUse` | 도구 실행 후 | 후처리 |
| `SessionStart` | 세션 시작 | 안내 문구/컨텍스트 |
| `Stop` | 턴 종료 전 | 품질 체크 |
| `UserPromptSubmit` | 사용자 입력 시 | 입력 검증 |

### Hook 타입
- **command**: Bash/Python 스크립트 실행 (빠른 결정적 검사)
- **prompt**: LLM 기반 판단 (컨텍스트 인식 결정)

## Skill (스킬)

**파일**: `skills/skill-name/SKILL.md`

```markdown
---
name: Hook Development
description: |
  This skill should be used when the user asks to
  "create a hook", "add PreToolUse hook"...
version: 0.1.0
---

## Overview
Hook 개발 가이드...

## Key Concepts
- PreToolUse: 도구 실행 전 검증
- PostToolUse: 도구 실행 후 처리

## Resources
- `scripts/validate-hook-schema.sh` - 스키마 검증
- `references/patterns.md` - 패턴 가이드
- `examples/validate-write.sh` - 실행 예제
```

### Progressive Disclosure
1. **메타데이터** (name + description) → 항상 로드 (~100단어)
2. **SKILL.md 본문** → 스킬 트리거 시 (~1500-2000단어)
3. **번들 리소스** → 필요 시 (scripts/, references/, examples/)

## MCP 연동

**파일**: `.mcp.json`

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "${CLAUDE_PROJECT_DIR}"]
  },
  "slack": {
    "type": "sse",
    "url": "https://mcp.slack.com/sse"
  },
  "custom-api": {
    "type": "http",
    "url": "https://api.example.com/mcp",
    "headers": { "Authorization": "Bearer ${API_TOKEN}" }
  }
}
```

### MCP 서버 타입
| 타입 | 용도 | 인증 |
|------|------|------|
| **stdio** | 로컬 프로세스 | 없음 |
| **sse** | 클라우드 서비스 | OAuth |
| **http** | REST API | Token/Header |

## Desker에 적용할 커스텀 포인트

### 1. SessionStart Hook → 프로젝트별 안내 문구
```json
{
  "SessionStart": [{
    "hooks": [{
      "type": "prompt",
      "prompt": "Welcome to Desker! 현재 프로젝트: ${PROJECT_NAME}"
    }]
  }]
}
```

### 2. 커스텀 Command → /desker 슬래시 명령
```markdown
---
description: Desker 프로젝트 컨텍스트 로드
allowed-tools: Read, Glob, Grep
---
현재 태스크와 관련된 파일을 분석하세요.
```

### 3. PreToolUse Hook → 코드 변경 추적
```bash
#!/bin/bash
# 변경된 파일을 Reference Panel로 전달
echo "{\"changedFile\": \"$FILE_PATH\"}" > /tmp/desker-changes.json
exit 0
```
