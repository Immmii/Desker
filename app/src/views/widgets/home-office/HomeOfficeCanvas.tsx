import { useCallback, useEffect, useRef, useState } from "react";
import { useAppVM } from "../../../viewmodels/app.vm";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { getAgentPreset } from "../../../viewmodels/session.vm";
import { useDotArtVM } from "../../../viewmodels/dotart.vm";

// ── Endesga 32 inspired warm cozy palette ──
const C = {
  // Walls & structure
  wallDark: "#733e39",
  wallMid: "#b86f50",
  wallLight: "#e4a672",
  wallTrim: "#3e2731",
  // Floor
  floorA: "#ead4aa",
  floorB: "#e4a672",
  floorLine: "#c28569",
  // Furniture wood
  woodDark: "#733e39",
  woodMid: "#b86f50",
  woodLight: "#d77643",
  woodHighlight: "#e4a672",
  // Desk / tech
  deskTop: "#5a6988",
  deskBody: "#3a4466",
  screenGlow: "#2ce8f5",
  screenDark: "#124e89",
  screenBg: "#193c3e",
  // Accent
  accent: "#0099db",
  accentLight: "#2ce8f5",
  green: "#63c74d",
  greenDark: "#3e8948",
  red: "#e43b44",
  yellow: "#fee761",
  orange: "#f77622",
  pink: "#f6757a",
  // Neutrals
  white: "#ffffff",
  light: "#c0cbdc",
  mid: "#8b9bb4",
  dark: "#262b44",
  black: "#181425",
  skin: "#e8b796",
  skinShadow: "#c28569",
  hair: "#3e2731",
  shirt: "#0099db",
  shirtShadow: "#124e89",
  // Window
  skyLight: "#73eff7",
  skyMid: "#41a6f6",
};

interface RoomObj {
  id: string;
  label: string;
  x: number;
  y: number;
  draw: (ctx: CanvasRenderingContext2D, hover: boolean) => void;
}

// ── Pixel-perfect rectangle helper ──
function pxRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ── Draw functions for each object ──

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Frame
  pxRect(ctx, x, y, 28, 36, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 26, 34, C.woodMid);
  // Shelves
  pxRect(ctx, x + 1, y + 12, 26, 2, C.woodDark);
  pxRect(ctx, x + 1, y + 24, 26, 2, C.woodDark);
  // Books row 1
  pxRect(ctx, x + 3, y + 3, 3, 8, C.red);
  pxRect(ctx, x + 7, y + 4, 3, 7, C.accent);
  pxRect(ctx, x + 11, y + 2, 4, 9, C.green);
  pxRect(ctx, x + 16, y + 3, 3, 8, C.yellow);
  pxRect(ctx, x + 20, y + 5, 4, 6, C.orange);
  // Books row 2
  pxRect(ctx, x + 3, y + 15, 4, 8, C.pink);
  pxRect(ctx, x + 8, y + 14, 3, 9, C.screenDark);
  pxRect(ctx, x + 12, y + 16, 4, 7, C.wallMid);
  pxRect(ctx, x + 18, y + 15, 3, 8, C.accentLight);
  // Items row 3
  pxRect(ctx, x + 4, y + 27, 5, 6, C.woodLight); // small box
  pxRect(ctx, x + 14, y + 28, 6, 5, C.greenDark); // plant pot
  pxRect(ctx, x + 16, y + 25, 2, 3, C.green); // leaf
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Desk surface
  pxRect(ctx, x, y, 56, 4, C.woodLight);
  pxRect(ctx, x, y + 1, 56, 2, C.woodHighlight);
  // Front panel
  pxRect(ctx, x + 2, y + 4, 52, 20, C.woodMid);
  pxRect(ctx, x + 2, y + 4, 52, 1, C.woodDark);
  // Drawer
  pxRect(ctx, x + 6, y + 8, 18, 12, C.woodDark);
  pxRect(ctx, x + 7, y + 9, 16, 10, C.woodMid);
  pxRect(ctx, x + 13, y + 13, 4, 2, C.woodHighlight); // handle
  // Legs
  pxRect(ctx, x + 4, y + 24, 3, 8, C.woodDark);
  pxRect(ctx, x + 49, y + 24, 3, 8, C.woodDark);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Stand
  pxRect(ctx, x + 10, y + 20, 6, 3, C.deskBody);
  pxRect(ctx, x + 8, y + 22, 10, 2, C.deskBody);
  // Screen frame
  pxRect(ctx, x, y, 26, 20, C.deskBody);
  pxRect(ctx, x + 1, y + 1, 24, 17, C.screenBg);
  // Screen content (code lines)
  pxRect(ctx, x + 3, y + 3, 10, 1, C.green);
  pxRect(ctx, x + 3, y + 5, 14, 1, C.accentLight);
  pxRect(ctx, x + 3, y + 7, 8, 1, C.yellow);
  pxRect(ctx, x + 3, y + 9, 12, 1, C.light);
  pxRect(ctx, x + 3, y + 11, 6, 1, C.green);
  pxRect(ctx, x + 3, y + 13, 16, 1, C.accentLight);
  pxRect(ctx, x + 3, y + 15, 9, 1, C.pink);
  // Power LED
  pxRect(ctx, x + 12, y + 18, 2, 1, C.green);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Pot
  pxRect(ctx, x + 2, y + 10, 10, 8, C.orange);
  pxRect(ctx, x + 3, y + 11, 8, 6, C.woodLight);
  pxRect(ctx, x + 1, y + 9, 12, 2, C.orange);
  // Soil
  pxRect(ctx, x + 3, y + 11, 8, 2, C.woodDark);
  // Leaves
  pxRect(ctx, x + 5, y + 5, 4, 5, C.green);
  pxRect(ctx, x + 3, y + 3, 3, 4, C.greenDark);
  pxRect(ctx, x + 8, y + 2, 3, 5, C.green);
  pxRect(ctx, x + 6, y + 1, 2, 3, C.greenDark);
  pxRect(ctx, x + 1, y + 6, 2, 3, C.green);
  pxRect(ctx, x + 10, y + 4, 2, 3, C.greenDark);
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, isOn = true) {
  // Base
  pxRect(ctx, x + 2, y + 20, 8, 2, C.deskBody);
  // Pole
  pxRect(ctx, x + 5, y + 6, 2, 14, C.deskBody);
  // Shade
  pxRect(ctx, x, y, 12, 7, isOn ? C.yellow : C.mid);
  pxRect(ctx, x + 1, y + 1, 10, 5, isOn ? C.orange : C.deskBody);
  // Glow
  pxRect(ctx, x + 2, y + 2, 8, 3, isOn ? C.yellow : C.mid);
}

function drawCabinet(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Body
  pxRect(ctx, x, y, 20, 34, C.woodMid);
  pxRect(ctx, x + 1, y + 1, 18, 32, C.woodLight);
  // Drawers
  for (let i = 0; i < 3; i++) {
    const dy = y + 2 + i * 10;
    pxRect(ctx, x + 2, dy, 16, 9, C.woodMid);
    pxRect(ctx, x + 3, dy + 1, 14, 7, C.woodHighlight);
    pxRect(ctx, x + 8, dy + 3, 4, 2, C.woodDark); // handle
  }
  // Label tags
  pxRect(ctx, x + 13, dy3Offset(y, 0), 3, 4, C.accent);
  pxRect(ctx, x + 13, dy3Offset(y, 1), 3, 4, C.green);
  pxRect(ctx, x + 13, dy3Offset(y, 2), 3, 4, C.yellow);
}

function dy3Offset(y: number, i: number) {
  return y + 4 + i * 10;
}

function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Frame border
  pxRect(ctx, x, y, 18, 14, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 16, 12, C.woodMid);
  // Picture content (sunset)
  pxRect(ctx, x + 2, y + 2, 14, 10, C.skyMid);
  pxRect(ctx, x + 2, y + 7, 14, 5, C.greenDark);
  pxRect(ctx, x + 2, y + 6, 14, 2, C.green);
  // Sun
  pxRect(ctx, x + 11, y + 3, 3, 3, C.yellow);
}

function drawCoffee(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Mug body
  pxRect(ctx, x + 1, y + 3, 8, 8, C.white);
  pxRect(ctx, x + 2, y + 4, 6, 6, C.light);
  // Handle
  pxRect(ctx, x + 9, y + 5, 3, 4, C.white);
  pxRect(ctx, x + 10, y + 6, 1, 2, C.deskBody);
  // Coffee
  pxRect(ctx, x + 2, y + 5, 6, 4, C.woodDark);
  pxRect(ctx, x + 3, y + 5, 4, 1, C.woodMid);
  // Steam
  pxRect(ctx, x + 3, y + 1, 1, 2, C.light);
  pxRect(ctx, x + 6, y, 1, 2, C.light);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Back
  pxRect(ctx, x + 2, y, 14, 3, C.deskBody);
  pxRect(ctx, x + 3, y + 3, 12, 8, C.deskBody);
  pxRect(ctx, x + 4, y + 4, 10, 6, C.deskTop);
  // Seat
  pxRect(ctx, x, y + 11, 18, 4, C.deskBody);
  pxRect(ctx, x + 1, y + 12, 16, 2, C.deskTop);
  // Legs/wheels
  pxRect(ctx, x + 7, y + 15, 4, 6, C.dark);
  pxRect(ctx, x + 3, y + 20, 3, 2, C.dark);
  pxRect(ctx, x + 12, y + 20, 3, 2, C.dark);
}

function drawJournal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Cover
  pxRect(ctx, x, y, 14, 18, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 12, 16, C.accent);
  pxRect(ctx, x + 2, y + 2, 10, 14, C.screenDark);
  // Spine
  pxRect(ctx, x, y, 2, 18, C.woodDark);
  // Title lines
  pxRect(ctx, x + 4, y + 4, 6, 1, C.light);
  pxRect(ctx, x + 4, y + 6, 4, 1, C.light);
  // Bookmark ribbon
  pxRect(ctx, x + 9, y + 16, 2, 3, C.red);
  pxRect(ctx, x + 8, y + 18, 1, 1, C.red);
  pxRect(ctx, x + 11, y + 18, 1, 1, C.red);
}

function drawAgent(ctx: CanvasRenderingContext2D, x: number, y: number, state: string, animFrame: number, shirtColor?: string, label?: string) {
  const s = 2;
  // Hair
  ctx.fillStyle = C.hair;
  for (const [px, py] of [[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1]]) {
    ctx.fillRect(x + px * s, y + py * s, s, s);
  }
  // Face
  ctx.fillStyle = C.skin;
  for (const [px, py] of [[1,2],[2,2],[3,2],[4,2],[1,3],[2,3],[3,3],[4,3]]) {
    ctx.fillRect(x + px * s, y + py * s, s, s);
  }
  // Eyes
  ctx.fillStyle = C.black;
  ctx.fillRect(x + 2 * s, y + 2 * s, s, s);
  ctx.fillRect(x + 4 * s, y + 2 * s, s, s);
  // Smile
  ctx.fillStyle = C.skinShadow;
  ctx.fillRect(x + 3 * s, y + 3 * s, s, s);
  // Shirt
  ctx.fillStyle = shirtColor ?? C.shirt;
  for (const [px, py] of [[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[1,5],[2,5],[3,5],[4,5]]) {
    ctx.fillRect(x + px * s, y + py * s, s, s);
  }
  // Arms - shift down by 1px when working on alternate frames (typing)
  const armShift = state === "working" && animFrame === 1 ? 1 : 0;
  ctx.fillStyle = shirtColor ? `${shirtColor}cc` : C.shirtShadow;
  for (const [px, py] of [[1,6],[2,6],[3,6],[4,6]]) {
    ctx.fillRect(x + px * s, y + py * s + armShift, s, s);
  }

  // Status bubble
  const bx = x + 7 * s;
  const by = y - 2;
  pxRect(ctx, bx, by, 12, 8, C.white);
  pxRect(ctx, bx + 1, by + 1, 10, 6, C.white);
  // Bubble tail
  pxRect(ctx, bx, by + 7, 2, 2, C.white);

  if (state === "working") {
    // Typing dots - animate by shifting which dots are visible
    pxRect(ctx, bx + 2, by + 3, 2, 2, C.green);
    pxRect(ctx, bx + 5, by + 3, 2, 2, animFrame === 0 ? C.green : C.greenDark);
    pxRect(ctx, bx + 8, by + 3, 2, 2, animFrame === 0 ? C.greenDark : C.green);
  } else if (state === "error") {
    // Blink the error dot
    if (animFrame === 0) {
      pxRect(ctx, bx + 4, by + 2, 4, 4, C.red);
    }
  } else {
    // Idle - alternate between zzz and empty
    if (animFrame === 0) {
      pxRect(ctx, bx + 3, by + 2, 6, 1, C.mid);
      pxRect(ctx, bx + 5, by + 4, 4, 1, C.mid);
    }
  }

  // Role label below character
  if (label) {
    ctx.font = "bold 6px monospace";
    ctx.fillStyle = shirtColor ?? C.accent;
    ctx.textAlign = "center";
    ctx.fillText(label, x + 3 * s, y + 9 * s);
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Frame
  pxRect(ctx, x, y, 36, 28, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 34, 26, C.woodMid);
  // Glass panes
  pxRect(ctx, x + 2, y + 2, 15, 24, C.skyLight);
  pxRect(ctx, x + 19, y + 2, 15, 24, C.skyLight);
  // Sky gradient
  pxRect(ctx, x + 2, y + 2, 15, 8, C.skyMid);
  pxRect(ctx, x + 19, y + 2, 15, 8, C.skyMid);
  // Clouds
  pxRect(ctx, x + 5, y + 5, 6, 2, C.white);
  pxRect(ctx, x + 23, y + 7, 5, 2, C.white);
  // Cross bar
  pxRect(ctx, x + 17, y + 2, 2, 24, C.woodMid);
  pxRect(ctx, x + 2, y + 13, 32, 2, C.woodMid);
  // Curtain hints
  pxRect(ctx, x - 2, y, 3, 28, C.pink);
  pxRect(ctx, x - 2, y, 2, 28, C.wallLight);
  pxRect(ctx, x + 35, y, 3, 28, C.pink);
  pxRect(ctx, x + 36, y, 2, 28, C.wallLight);
}

function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number) {
  pxRect(ctx, x, y, 50, 24, C.deskTop);
  pxRect(ctx, x + 1, y + 1, 48, 22, C.accent);
  pxRect(ctx, x + 2, y + 2, 46, 20, C.deskTop);
  // Pattern
  pxRect(ctx, x + 4, y + 4, 42, 1, C.accentLight);
  pxRect(ctx, x + 4, y + 19, 42, 1, C.accentLight);
  pxRect(ctx, x + 4, y + 4, 1, 16, C.accentLight);
  pxRect(ctx, x + 45, y + 4, 1, 16, C.accentLight);
  // Diamond center
  for (let i = 0; i < 5; i++) {
    pxRect(ctx, x + 21 + i, y + 11 - i, 1, 1 + i * 2, C.accent);
    pxRect(ctx, x + 29 - i, y + 11 - i, 1, 1 + i * 2, C.accent);
  }
}

// ── Room objects with positions ──
const BASE_OBJECTS: Omit<RoomObj, "draw">[] = [
  { id: "bookshelf", label: "책장", x: 12, y: 8 },
  { id: "frame", label: "액자", x: 80, y: 10 },
  { id: "window", label: "창문", x: 130, y: 5 },
  { id: "plant", label: "화분", x: 58, y: 18 },
  { id: "lamp", label: "램프", x: 105, y: 12 },
  { id: "desk", label: "책상", x: 100, y: 58 },
  { id: "monitor", label: "모니터", x: 112, y: 34 },
  { id: "coffee", label: "커피", x: 145, y: 56 },
  { id: "chair", label: "의자", x: 117, y: 80 },
  { id: "cabinet", label: "파일함", x: 210, y: 40 },
  { id: "rug", label: "러그", x: 60, y: 100 },
  { id: "journal", label: "일기장", x: 100, y: 55 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DRAW_MAP: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, ...args: any[]) => void> = {
  bookshelf: drawBookshelf,
  frame: drawFrame,
  window: drawWindow,
  plant: drawPlant,
  lamp: drawLamp,
  desk: drawDesk,
  monitor: drawMonitor,
  coffee: drawCoffee,
  chair: drawChair,
  cabinet: drawCabinet,
  rug: drawRug,
  journal: drawJournal,
};

const OBJ_SIZES: Record<string, [number, number]> = {
  bookshelf: [28, 36],
  frame: [18, 14],
  window: [40, 28],
  plant: [14, 18],
  lamp: [12, 22],
  desk: [56, 32],
  monitor: [26, 24],
  coffee: [12, 11],
  chair: [18, 22],
  cabinet: [20, 34],
  rug: [50, 24],
  journal: [14, 19],
};

// ── Object Catalog Data ──
interface CatalogItem {
  id: string;
  label: string;
  category: "가구" | "데코" | "기기";
}

const CATALOG: CatalogItem[] = [
  { id: "desk", label: "책상", category: "가구" },
  { id: "chair", label: "의자", category: "가구" },
  { id: "cabinet", label: "파일함", category: "가구" },
  { id: "bookshelf", label: "책장", category: "가구" },
  { id: "rug", label: "러그", category: "가구" },
  { id: "plant", label: "화분", category: "데코" },
  { id: "frame", label: "액자", category: "데코" },
  { id: "lamp", label: "램프", category: "데코" },
  { id: "coffee", label: "커피", category: "데코" },
  { id: "journal", label: "일기장", category: "데코" },
  { id: "monitor", label: "모니터", category: "기기" },
];

const CATEGORIES = ["가구", "데코", "기기"] as const;

// ── Desktop file type for cabinet ──
interface DesktopFile {
  name: string;
  is_dir: boolean;
  size: number;
}

function getFileIcon(file: DesktopFile): string {
  if (file.is_dir) return "📁";
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    pdf: "📕", doc: "📄", docx: "📄", txt: "📝", md: "📝",
    xls: "📊", xlsx: "📊", csv: "📊",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", svg: "🖼️", webp: "🖼️",
    zip: "📦", tar: "📦", gz: "📦", rar: "📦",
    mp3: "🎵", wav: "🎵", mp4: "🎬", mov: "🎬",
    js: "📜", ts: "📜", py: "🐍", rs: "🦀",
    html: "🌐", css: "🎨", json: "📋",
  };
  return icons[ext] || "📄";
}

// ── Draggable & Resizable Finder-style Cabinet Window ──
function CabinetWindow({ files, loading, onClose }: {
  files: DesktopFile[];
  loading: boolean;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ x: 200, y: 80 });
  const [size, setSize] = useState({ w: 580, h: 460 });
  const [selected, setSelected] = useState<string | null>(null);
  const dragging = useRef(false);
  const resizing = useRef<string | null>(null);
  const startRef = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });

  // ── 타이틀바 드래그 ──
  const onTitleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y, w: 0, h: 0 };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: startRef.current.x + (ev.clientX - startRef.current.mx),
        y: startRef.current.y + (ev.clientY - startRef.current.my),
      });
    };
    const onUp = () => { dragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── 리사이즈 ──
  const onResizeMouseDown = (e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = edge;
    startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const dx = ev.clientX - startRef.current.mx;
      const dy = ev.clientY - startRef.current.my;
      const edge = resizing.current;
      let newW = startRef.current.w;
      let newH = startRef.current.h;
      let newX = startRef.current.x;
      let newY = startRef.current.y;
      if (edge.includes("r")) newW = Math.max(400, startRef.current.w + dx);
      if (edge.includes("l")) { newW = Math.max(400, startRef.current.w - dx); newX = startRef.current.x + (startRef.current.w - newW); }
      if (edge.includes("b")) newH = Math.max(300, startRef.current.h + dy);
      if (edge.includes("t")) { newH = Math.max(300, startRef.current.h - dy); newY = startRef.current.y + (startRef.current.h - newH); }
      setSize({ w: newW, h: newH });
      setPos({ x: newX, y: newY });
    };
    const onUp = () => { resizing.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const formatSize = (s: number) => s < 1024 ? `${s} B` : s < 1048576 ? `${(s / 1024).toFixed(0)} KB` : `${(s / 1048576).toFixed(1)} MB`;

  const handleOpen = (file: DesktopFile) => {
    window.deskerAPI.fs.openFile(file.name);
  };

  // 리사이즈 핸들 스타일
  const edge = (cursor: string, style: React.CSSProperties): React.CSSProperties => ({
    position: "absolute", zIndex: 101, ...style, cursor,
  });

  return (
    <div
      style={{
        position: "fixed", top: pos.y, left: pos.x, zIndex: 100,
        width: size.w, height: size.h,
        borderRadius: 10, overflow: "hidden",
        background: "var(--color-bg-primary)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35), 0 0 0 0.5px rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* 리사이즈 핸들 (8방향) */}
      <div onMouseDown={(e) => onResizeMouseDown(e, "r")} style={edge("ew-resize", { top: 0, right: -3, width: 6, height: "100%" })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "l")} style={edge("ew-resize", { top: 0, left: -3, width: 6, height: "100%" })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "b")} style={edge("ns-resize", { bottom: -3, left: 0, width: "100%", height: 6 })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "t")} style={edge("ns-resize", { top: -3, left: 0, width: "100%", height: 6 })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "rb")} style={edge("nwse-resize", { bottom: -3, right: -3, width: 12, height: 12 })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "lb")} style={edge("nesw-resize", { bottom: -3, left: -3, width: 12, height: 12 })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "rt")} style={edge("nesw-resize", { top: -3, right: -3, width: 12, height: 12 })} />
      <div onMouseDown={(e) => onResizeMouseDown(e, "lt")} style={edge("nwse-resize", { top: -3, left: -3, width: 12, height: 12 })} />

      {/* ── 타이틀바 ── */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          height: 38, display: "flex", alignItems: "center", gap: 8,
          padding: "0 14px", cursor: "default", userSelect: "none",
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)", flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 6, marginRight: 4 }}>
          <button onClick={onClose} style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }} className="text-text-primary">Desktop</span>
        </div>
        <div style={{ width: 52 }} />
      </div>

      {/* ── 경로 바 ── */}
      <div style={{
        height: 32, display: "flex", alignItems: "center", gap: 6,
        padding: "0 14px", background: "var(--color-bg-secondary)",
        borderBottom: "1px solid var(--color-border)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 12 }} className="text-text-secondary">🏠</span>
        <span style={{ fontSize: 11 }} className="text-text-secondary/40">›</span>
        <span style={{ fontSize: 12 }} className="text-text-secondary">Users</span>
        <span style={{ fontSize: 11 }} className="text-text-secondary/40">›</span>
        <span style={{ fontSize: 12, fontWeight: 500 }} className="text-text-primary">Desktop</span>
        <span style={{ fontSize: 11, marginLeft: "auto" }} className="text-text-secondary/50">
          {!loading && `${files.length}개 항목`}
        </span>
      </div>

      {/* ── 파일 그리드 ── */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: 16 }}
        onClick={() => setSelected(null)}
      >
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", fontSize: 13 }} className="text-text-secondary">불러오는 중...</div>
        ) : files.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", fontSize: 13 }} className="text-text-secondary">파일이 없습니다</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6 }}>
            {files.map((file, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setSelected(file.name); }}
                onDoubleClick={() => handleOpen(file)}
                style={{
                  padding: "12px 8px 10px", borderRadius: 8,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  cursor: "default",
                  background: selected === file.name ? "rgba(108,92,231,0.15)" : "transparent",
                  border: selected === file.name ? "1px solid var(--color-accent)" : "1px solid transparent",
                }}
                className="hover:bg-accent/8 transition-colors"
              >
                <span style={{ fontSize: 36, lineHeight: 1 }}>{getFileIcon(file)}</span>
                <span
                  style={{ fontSize: 11, textAlign: "center", lineHeight: 1.3, wordBreak: "break-all", maxWidth: "100%" }}
                  className={selected === file.name ? "text-accent font-medium" : "text-text-primary"}
                >
                  {file.name.length > 18 ? file.name.slice(0, 15) + "..." : file.name}
                </span>
                <span style={{ fontSize: 10 }} className="text-text-secondary/50">
                  {file.is_dir ? "폴더" : formatSize(file.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 하단 상태바 ── */}
      <div style={{
        height: 28, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", background: "var(--color-bg-secondary)",
        borderTop: "1px solid var(--color-border)", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11 }} className="text-text-secondary/50">~/Desktop</span>
        {selected && (
          <span style={{ fontSize: 11 }} className="text-text-secondary/70">{selected}</span>
        )}
      </div>
    </div>
  );
}

// ── Catalog Drawer Miniature Preview ──
function CatalogPreview({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawFn = DRAW_MAP[id];
    const [w, h] = OBJ_SIZES[id] || [20, 20];
    if (!drawFn) return;

    const scale = Math.min(36 / w, 36 / h, 2);
    ctx.save();
    ctx.translate((40 - w * scale) / 2, (40 - h * scale) / 2);
    ctx.scale(scale, scale);
    drawFn(ctx, 0, 0);
    ctx.restore();
  }, [id]);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={40}
      className="flex-shrink-0"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export default function HomeOfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredObj, setHoveredObj] = useState<string | null>(null);
  const [dragObj, setDragObj] = useState<string | null>(null);
  const [objects, setObjects] = useState(BASE_OBJECTS);
  const dragOffset = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  // Click vs drag detection
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  // Lamp on/off state
  const [lampOn, setLampOn] = useState(true);

  // Toast state
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cabinet popup state
  const [showCabinet, setShowCabinet] = useState(false);
  const [desktopFiles, setDesktopFiles] = useState<DesktopFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Catalog drawer state
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<typeof CATEGORIES[number]>("가구");

  // Animation frame toggle (0/1 every 500ms)
  const [animFrame, setAnimFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setAnimFrame((f) => (f === 0 ? 1 : 0)), 500);
    return () => clearInterval(timer);
  }, []);

  // Sessions for multi-agent rendering
  const sessions = useSessionVM((s) => s.sessions);
  const activeSessionId = useSessionVM((s) => s.activeSessionId);
  const setActiveSession = useSessionVM((s) => s.setActiveSession);
  const agentState: string = sessions.some((s) => s.state === "working")
    ? "working"
    : sessions.some((s) => s.state === "error")
      ? "error"
      : "idle";

  // Dot art store
  const dotArts = useDotArtVM((s) => s.dotArts);

  // Stores
  const setCurrentPage = useAppVM((s) => s.setCurrentPage);
  const selectProject = useProjectVM((s) => s.selectProject);
  const projects = useProjectVM((s) => s.projects);

  // Show toast helper
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // ── Object click handler ──
  const handleObjectClick = useCallback(
    (objId: string) => {
      switch (objId) {
        case "monitor":
          setCurrentPage("terminal");
          break;
        case "cabinet":
          setShowCabinet((prev) => {
            const next = !prev;
            if (next) {
              setFilesLoading(true);
              window.deskerAPI.fs.listDesktopFiles()
                .then((files) => setDesktopFiles(files))
                .catch((err) => {
                  console.error("Failed to list desktop files:", err);
                  setDesktopFiles([]);
                })
                .finally(() => setFilesLoading(false));
            }
            return next;
          });
          break;
        case "journal": {
          const journalProject = projects.find((p) => p.type === "journal");
          if (journalProject) selectProject(journalProject.id);
          setCurrentPage("tasks");
          break;
        }
        case "lamp":
          setLampOn((prev) => !prev);
          break;
        case "coffee":
          showToast("커피 한 잔 ☕");
          break;
        // desk, bookshelf, plant, frame, rug, chair, window → no action
        default:
          break;
      }
    },
    [setCurrentPage, selectProject, projects, showToast]
  );

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, cw: number, ch: number) => {
      // Background
      ctx.fillStyle = C.black;
      ctx.fillRect(0, 0, cw, ch);

      const roomW = 250;
      const roomH = 140;
      const pad = 16;
      const scale = Math.min((cw - pad * 2) / roomW, (ch - pad * 2) / roomH, 3);
      scaleRef.current = scale;

      const ox = (cw - roomW * scale) / 2;
      const oy = (ch - roomH * scale) / 2;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      // ── Wall ──
      const wallH = 48;
      pxRect(ctx, 0, 0, roomW, wallH, C.wallMid);
      pxRect(ctx, 0, 0, roomW, 3, C.wallLight);
      pxRect(ctx, 0, wallH - 2, roomW, 2, C.wallDark);
      // Wall texture (subtle horizontal lines)
      for (let wy = 6; wy < wallH - 4; wy += 8) {
        pxRect(ctx, 0, wy, roomW, 1, C.wallLight + "18");
      }

      // ── Floor ──
      for (let fy = 0; fy < roomH - wallH; fy += 8) {
        for (let fx = 0; fx < roomW; fx += 8) {
          const isA = ((fx / 8 + fy / 8) % 2) === 0;
          pxRect(ctx, fx, wallH + fy, 8, 8, isA ? C.floorA : C.floorB);
        }
      }
      // Floor edge shadow
      pxRect(ctx, 0, wallH, roomW, 2, C.floorLine);

      // ── Room border ──
      ctx.strokeStyle = C.wallTrim;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, roomW - 1, roomH - 1);

      // ── Lamp glow effect when on ──
      if (lampOn) {
        const lampObj = objects.find((o) => o.id === "lamp");
        if (lampObj) {
          ctx.save();
          const gx = lampObj.x + 6;
          const gy = lampObj.y + 4;
          const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, 30);
          grad.addColorStop(0, "rgba(254, 231, 97, 0.15)");
          grad.addColorStop(1, "rgba(254, 231, 97, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(gx - 30, gy - 10, 60, 40);
          ctx.restore();
        }
      }

      // ── Draw objects (sorted by y for depth) ──
      const sorted = [...objects].sort((a, b) => a.y - b.y);

      for (const obj of sorted) {
        const drawFn = DRAW_MAP[obj.id];
        if (!drawFn) continue;

        const isHover = hoveredObj === obj.id;
        const isDrag = dragObj === obj.id;

        if (isHover || isDrag) {
          const [w, h] = OBJ_SIZES[obj.id] || [20, 20];
          ctx.save();
          ctx.shadowColor = C.accentLight;
          ctx.shadowBlur = 4;
          ctx.fillStyle = isDrag ? "rgba(0,153,219,0.15)" : "rgba(0,153,219,0.08)";
          ctx.fillRect(obj.x - 1, obj.y - 1, w + 2, h + 2);
          ctx.restore();
        }

        // Special handling for lamp (pass on/off state)
        if (obj.id === "lamp") {
          drawLamp(ctx, obj.x, obj.y, lampOn);
        } else {
          drawFn(ctx, obj.x, obj.y);
        }

        if (isHover) {
          const [w] = OBJ_SIZES[obj.id] || [20, 20];
          ctx.font = "bold 7px monospace";
          ctx.fillStyle = C.white;
          ctx.textAlign = "center";
          ctx.fillText(obj.label, obj.x + w / 2, obj.y - 4);
        }
      }

      // ── Agents (multi-agent) ──
      const agentSessions = sessions.filter((s) => s.state === "working" || s.state === "idle");
      if (agentSessions.length === 0) {
        // No sessions: draw idle default agent
        drawAgent(ctx, 126, 70, "idle", animFrame);
      } else {
        // Position agents in a row, max 6
        const maxAgents = Math.min(agentSessions.length, 6);
        const startX = 100;
        const spacing = 28;
        for (let i = 0; i < maxAgents; i++) {
          const s = agentSessions[i];
          const preset = s.agentRole ? getAgentPreset(s.agentRole) : null;
          const ax = startX + i * spacing;
          const ay = 70;
          drawAgent(
            ctx, ax, ay,
            s.state,
            animFrame,
            preset?.color,
            preset ? preset.icon : undefined,
          );
        }
      }

      // ── Custom Dot Art objects ──
      if (dotArts.length > 0) {
        const art = dotArts[dotArts.length - 1]; // show latest
        const artScale = 1; // 1px per pixel
        const artX = 50;
        const artY = 52;
        // Small frame around the art
        const artW = art.gridSize * artScale;
        const artH = art.gridSize * artScale;
        pxRect(ctx, artX - 1, artY - 1, artW + 2, artH + 2, C.woodDark);
        // Render pixel-by-pixel
        for (let py = 0; py < art.gridSize; py++) {
          for (let px = 0; px < art.gridSize; px++) {
            const color = art.pixels[py]?.[px];
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(artX + px * artScale, artY + py * artScale, artScale, artScale);
            }
          }
        }
      }

      ctx.restore();
    },
    [objects, hoveredObj, dragObj, lampOn, agentState, animFrame, dotArts]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.scale(dpr, dpr);
      drawScene(ctx, width, height);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawScene]);

  const toRoom = (mx: number, my: number): [number, number] => {
    const container = containerRef.current!;
    const { width, height } = container.getBoundingClientRect();
    const scale = scaleRef.current;
    const roomW = 250;
    const roomH = 140;
    const ox = (width - roomW * scale) / 2;
    const oy = (height - roomH * scale) / 2;
    return [(mx - ox) / scale, (my - oy) / scale];
  };

  const hitTest = (rx: number, ry: number) => {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];
      const [w, h] = OBJ_SIZES[o.id] || [20, 20];
      if (rx >= o.x && rx <= o.x + w && ry >= o.y && ry <= o.y + h) return o;
    }
    return null;
  };

  const onMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const [rx, ry] = toRoom(e.clientX - rect.left, e.clientY - rect.top);
    if (dragObj) {
      setObjects((prev) =>
        prev.map((o) =>
          o.id === dragObj ? { ...o, x: rx - dragOffset.current.x, y: ry - dragOffset.current.y } : o
        )
      );
    } else {
      setHoveredObj(hitTest(rx, ry)?.id ?? null);
    }
  };

  const onDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const [rx, ry] = toRoom(e.clientX - rect.left, e.clientY - rect.top);
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    const obj = hitTest(rx, ry);
    if (obj) {
      dragOffset.current = { x: rx - obj.x, y: ry - obj.y };
      setDragObj(obj.id);
    }
  };

  const onUp = (e: React.MouseEvent) => {
    const downPos = mouseDownPos.current;
    const currentDragObj = dragObj;
    setDragObj(null);
    mouseDownPos.current = null;

    // Click vs drag: if mouse moved less than 5px, it's a click
    if (downPos && currentDragObj) {
      const dx = e.clientX - downPos.x;
      const dy = e.clientY - downPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        handleObjectClick(currentDragObj);
      }
    }

    // Check if clicked on an agent character → navigate to terminal
    if (downPos) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const agentSess = sessions.filter((ss) => ss.state === "working" || ss.state === "idle");
        const maxA = Math.min(agentSess.length, 6);
        for (let i = 0; i < maxA; i++) {
          const ax = 100 + i * 28;
          const ay = 70;
          if (cx >= ax && cx <= ax + 18 && cy >= ay && cy <= ay + 24) {
            setActiveSession(agentSess[i].id);
            setCurrentPage("terminal");
            return;
          }
        }
      }
    }
  };

  // Add object from catalog
  const addFromCatalog = (item: CatalogItem) => {
    // Place at a default position in the room center area
    const newObj: Omit<RoomObj, "draw"> = {
      id: item.id,
      label: item.label,
      x: 100 + Math.random() * 40 - 20,
      y: 60 + Math.random() * 30 - 15,
    };
    setObjects((prev) => [...prev, newObj]);
  };

  const filteredCatalog = CATALOG.filter((c) => c.category === catalogCategory);

  return (
    <div ref={containerRef} className="w-full h-full relative p-4">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: dragObj ? "grabbing" : hoveredObj ? "grab" : "default", imageRendering: "pixelated" }}
        onMouseMove={onMove}
        onMouseDown={onDown}
        onMouseUp={onUp}
        onMouseLeave={() => { setHoveredObj(null); setDragObj(null); mouseDownPos.current = null; }}
      />


      {/* Catalog button (top-left) */}
      <button
        onClick={() => setShowCatalog((prev) => !prev)}
        style={{
          width: 32, height: 32, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        className={`absolute top-2 left-3
          backdrop-blur-sm transition-all cursor-pointer select-none
          ${showCatalog
            ? "bg-accent/20 border border-accent/50"
            : "bg-surface-secondary/70 hover:bg-surface-secondary border border-border/40 hover:border-border/70"
          }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showCatalog ? "var(--color-accent)" : "var(--color-text-secondary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {/* Grid/layout icon representing furniture arrangement */}
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="4" rx="1" />
          <rect x="14" y="11" width="7" height="10" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>

      {/* Bottom-right agent status */}
      <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-[10px] select-none pointer-events-none">
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${
          agentState === "working" ? "bg-success" : agentState === "error" ? "bg-danger" : "bg-text-secondary/40"
        }`} />
        <span className="text-text-secondary/60">
          Agent — {agentState === "working" ? "Working" : agentState === "error" ? "Error" : "Idle"}
        </span>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="absolute left-1/2 bottom-10 -translate-x-1/2
            px-4 py-2 rounded-lg text-sm font-medium
            bg-surface-secondary/90 text-text-primary border border-border/50
            backdrop-blur-sm shadow-lg
            animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {toast}
        </div>
      )}

      {/* ── Cabinet File List Popup ── */}
      {showCabinet && (
        <CabinetWindow
          files={desktopFiles}
          loading={filesLoading}
          onClose={() => setShowCabinet(false)}
        />
      )}

      {/* ── Object Catalog Drawer ── */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, height: "100%", width: 220,
          display: "flex", flexDirection: "column",
          background: "var(--color-bg-secondary)",
          borderRight: "1px solid var(--color-border)",
          boxShadow: showCatalog ? "4px 0 20px rgba(0,0,0,0.15)" : "none",
          transform: showCatalog ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease-in-out",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderBottom: "1px solid var(--color-border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="4" rx="1" />
              <rect x="14" y="11" width="7" height="10" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }} className="text-text-primary">가구 배치</span>
          </div>
          <button
            onClick={() => setShowCatalog(false)}
            style={{
              width: 24, height: 24, borderRadius: 6, border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "var(--color-text-secondary)",
            }}
            className="hover:bg-bg-hover"
          >
            ✕
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 4, padding: "8px 10px" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCatalogCategory(cat)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 12,
                border: catalogCategory === cat ? "1px solid var(--color-accent)" : "1px solid transparent",
                background: catalogCategory === cat ? "var(--color-accent-alpha, rgba(116,185,255,0.1))" : "transparent",
                color: catalogCategory === cat ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontWeight: catalogCategory === cat ? 600 : 400,
                cursor: "pointer", fontFamily: "Pretendard, sans-serif",
                transition: "all 0.15s",
              }}
              className={catalogCategory === cat ? "" : "hover:bg-bg-hover"}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
          {filteredCatalog.map((item) => (
            <button
              key={item.id}
              onClick={() => addFromCatalog(item)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "8px 8px", borderRadius: 8, marginBottom: 2,
                border: "1px solid transparent", background: "transparent",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
              className="hover:bg-bg-hover hover:border-border/30"
            >
              <div style={{
                width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                background: "var(--color-bg-tertiary)", display: "flex",
                alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}>
                <CatalogPreview id={item.id} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }} className="text-text-primary">{item.label}</span>
                <span style={{ fontSize: 10 }} className="text-text-secondary/50">{item.category}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "8px 14px", borderTop: "1px solid var(--color-border)",
          fontSize: 10,
        }} className="text-text-secondary/40">
          클릭하여 추가 · 드래그하여 이동
        </div>
      </div>
    </div>
  );
}
