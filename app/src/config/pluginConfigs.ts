export type AuthType = "token" | "oauth";

export interface EnvVarDef {
  key: string;
  label: string;
  placeholder: string;
}

export interface PluginConfig {
  name: string;
  icon: string;
  desc: string;
  category: "추천" | "전체";
  authType: AuthType;
  mcpPackage: string;
  mcpName: string;
  envVars: EnvVarDef[];
  tokenInstructions: string[];
  tokenUrl: string;
  /** Notion 등 특수 env 변환이 필요한 경우 */
  buildEnv?: (values: Record<string, string>) => Record<string, string>;
}

export const PLUGIN_CONFIGS: PluginConfig[] = [
  {
    name: "Notion",
    icon: "📝",
    desc: "노션 워크스페이스에 연결하여 검색, 업데이트, 워크플로우를 지원합니다.",
    category: "추천",
    authType: "token",
    mcpPackage: "@notionhq/notion-mcp-server",
    mcpName: "notion",
    envVars: [
      { key: "NOTION_TOKEN", label: "Notion Integration Token", placeholder: "ntn_xxxxxxxxxxxx..." },
    ],
    tokenInstructions: [
      "notion.so/profile/integrations 에 접속합니다.",
      '"새 통합(New integration)" 버튼을 클릭합니다.',
      "통합 이름을 입력하고 워크스페이스를 선택한 뒤 생성합니다.",
      '"내부 통합 시크릿(Internal Integration Secret)"을 복사합니다.',
      "연결할 노션 페이지에서 ··· → 연결 → 생성한 통합을 추가합니다.",
    ],
    tokenUrl: "https://www.notion.so/profile/integrations",
    buildEnv: (values) => ({
      OPENAPI_MCP_HEADERS: JSON.stringify({
        Authorization: `Bearer ${values.NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
      }),
    }),
  },
  {
    name: "Slack",
    icon: "💬",
    desc: "메시지를 보내고, 캔버스를 만들고, Slack 데이터를 가져옵니다.",
    category: "추천",
    authType: "token",
    mcpPackage: "@modelcontextprotocol/server-slack",
    mcpName: "slack",
    envVars: [
      { key: "SLACK_BOT_TOKEN", label: "Slack Bot Token", placeholder: "xoxb-xxxxxxxxxxxx..." },
      { key: "SLACK_TEAM_ID", label: "Slack Team ID", placeholder: "T0XXXXXXXXX" },
    ],
    tokenInstructions: [
      "api.slack.com/apps 에서 'Create New App' → 'From scratch'를 선택합니다.",
      "앱 이름과 워크스페이스를 선택하고 생성합니다.",
      "'OAuth & Permissions' 메뉴로 이동합니다.",
      "Bot Token Scopes에 channels:history, channels:read, chat:write, users:read 를 추가합니다.",
      "'Install to Workspace' 버튼을 클릭하고 권한을 허용합니다.",
      "'Bot User OAuth Token' (xoxb-...)을 복사합니다.",
      "Team ID는 워크스페이스 URL (app.slack.com/client/T0XXXXX/...) 에서 T로 시작하는 값입니다.",
    ],
    tokenUrl: "https://api.slack.com/apps",
  },
  {
    name: "GitHub",
    icon: "🐙",
    desc: "레포지토리, 이슈, PR을 관리합니다.",
    category: "전체",
    authType: "token",
    mcpPackage: "@modelcontextprotocol/server-github",
    mcpName: "github",
    envVars: [
      { key: "GITHUB_PERSONAL_ACCESS_TOKEN", label: "GitHub Personal Access Token", placeholder: "ghp_xxxxxxxxxxxx..." },
    ],
    tokenInstructions: [
      "github.com/settings/tokens 에 접속합니다.",
      '"Generate new token (classic)" 을 클릭합니다.',
      "토큰 이름을 입력하고 필요한 scope를 선택합니다 (repo, read:user 권장).",
      '"Generate token" 을 클릭하고 생성된 토큰을 복사합니다.',
    ],
    tokenUrl: "https://github.com/settings/tokens",
  },
  {
    name: "Figma",
    icon: "🎨",
    desc: "Figma 컨텍스트로 다이어그램과 더 나은 코드를 생성합니다.",
    category: "추천",
    authType: "token",
    mcpPackage: "figma-developer-mcp",
    mcpName: "figma",
    envVars: [
      { key: "FIGMA_API_KEY", label: "Figma Personal Access Token", placeholder: "figd_xxxxxxxxxxxx..." },
    ],
    tokenInstructions: [
      "Figma 앱의 좌측 상단 프로필 아이콘 → Settings를 클릭합니다.",
      "Security 탭으로 이동합니다.",
      '"Personal access tokens" 섹션에서 새 토큰을 생성합니다.',
      "토큰 이름을 입력하고, File content → Read only 권한을 선택합니다.",
      "생성된 토큰을 복사합니다.",
    ],
    tokenUrl: "https://www.figma.com/developers/api#access-tokens",
  },
  {
    name: "Linear",
    icon: "📐",
    desc: "이슈, 프로젝트, 팀 워크플로우를 관리합니다.",
    category: "전체",
    authType: "token",
    mcpPackage: "mcp-linear",
    mcpName: "linear",
    envVars: [
      { key: "LINEAR_API_KEY", label: "Linear API Key", placeholder: "lin_api_xxxxxxxxxxxx..." },
    ],
    tokenInstructions: [
      "linear.app 에 로그인합니다.",
      "Settings → Account → API 로 이동합니다.",
      '"Create key" 버튼을 클릭합니다.',
      "키 이름을 입력하고 생성된 API Key를 복사합니다.",
    ],
    tokenUrl: "https://linear.app/settings/api",
  },
  {
    name: "Gmail",
    icon: "📧",
    desc: "답장 작성, 스레드 요약, 받은편지함 검색을 지원합니다.",
    category: "추천",
    authType: "oauth",
    mcpPackage: "@anthropic/mcp-google",
    mcpName: "google-gmail",
    envVars: [],
    tokenInstructions: [
      "연결 시 브라우저에서 Google 로그인 화면이 열립니다.",
      "Gmail 접근 권한을 허용하면 자동으로 연결됩니다.",
    ],
    tokenUrl: "",
  },
  {
    name: "Google Calendar",
    icon: "📅",
    desc: "일정을 관리하고 미팅을 손쉽게 조율합니다.",
    category: "추천",
    authType: "oauth",
    mcpPackage: "@anthropic/mcp-google",
    mcpName: "google-calendar",
    envVars: [],
    tokenInstructions: [
      "연결 시 브라우저에서 Google 로그인 화면이 열립니다.",
      "Calendar 접근 권한을 허용하면 자동으로 연결됩니다.",
    ],
    tokenUrl: "",
  },
  {
    name: "Google Docs",
    icon: "📄",
    desc: "문서에 접근하고 편집합니다.",
    category: "전체",
    authType: "oauth",
    mcpPackage: "@anthropic/mcp-google",
    mcpName: "google-docs",
    envVars: [],
    tokenInstructions: [
      "연결 시 브라우저에서 Google 로그인 화면이 열립니다.",
      "Google Docs 접근 권한을 허용하면 자동으로 연결됩니다.",
    ],
    tokenUrl: "",
  },
  {
    name: "Canva",
    icon: "🖼️",
    desc: "검색, 생성, 자동완성, Canva 디자인을 내보냅니다.",
    category: "추천",
    authType: "token",
    mcpPackage: "@anthropic/mcp-canva",
    mcpName: "canva",
    envVars: [
      { key: "CANVA_ACCESS_TOKEN", label: "Canva Access Token", placeholder: "cnv_xxxxxxxxxxxx..." },
    ],
    tokenInstructions: [
      "canva.com/developers 에 접속합니다.",
      "새 앱을 생성합니다.",
      "API 키를 발급받아 복사합니다.",
    ],
    tokenUrl: "https://www.canva.com/developers/",
  },
  {
    name: "Microsoft Word",
    icon: "📃",
    desc: "Word 문서를 읽고 편집합니다.",
    category: "전체",
    authType: "token",
    mcpPackage: "@anthropic/mcp-microsoft",
    mcpName: "microsoft-word",
    envVars: [
      { key: "MICROSOFT_ACCESS_TOKEN", label: "Microsoft Access Token", placeholder: "eyJ0eXAi..." },
    ],
    tokenInstructions: [
      "portal.azure.com 에서 Azure AD 앱을 등록합니다.",
      "API Permissions에서 Files.ReadWrite, offline_access 를 추가합니다.",
      "토큰을 발급받아 복사합니다.",
    ],
    tokenUrl: "https://portal.azure.com/",
  },
];

export function getPluginConfig(name: string): PluginConfig | undefined {
  return PLUGIN_CONFIGS.find((p) => p.name === name);
}
