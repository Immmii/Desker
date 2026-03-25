import { useCallback, useEffect, useRef, useState } from "react";
import { useAppVM } from "../../../viewmodels/app.vm";
import { useProjectVM } from "../../../viewmodels/project.vm";
import { useSessionVM } from "../../../viewmodels/session.vm";
import { getAgentPreset } from "../../../viewmodels/session.vm";
import { useDotArtVM } from "../../../viewmodels/dotart.vm";

// ── Enhanced Warm Cozy Palette (OpenClaw-inspired) ──
const C = {
  // Walls & structure
  wallDark: "#6b3a35",
  wallMid: "#a86b52",
  wallLight: "#dea070",
  wallTrim: "#3e2731",
  wallPaper: "#c48b68",
  wallPattern: "#b87e5c",
  molding: "#d4a87c",
  moldingDark: "#8b5e3c",
  baseboard: "#5a3c2e",
  // Floor (warm wood)
  floorA: "#c49a6c",
  floorB: "#b8905f",
  floorC: "#d4a878",
  floorLine: "#9a7650",
  floorHighlight: "#debb8e",
  floorKnot: "#8a6840",
  // Furniture wood
  woodDark: "#6b3a2a",
  woodMid: "#a86848",
  woodLight: "#c87e50",
  woodHighlight: "#dea070",
  woodGrain: "#955a3a",
  // Desk / tech
  deskTop: "#5a6988",
  deskBody: "#3a4466",
  deskEdge: "#2e3550",
  screenGlow: "#2ce8f5",
  screenDark: "#124e89",
  screenBg: "#0f2e3a",
  screenLine: "#1a5c4a",
  keyboard: "#4a5570",
  keyboardKey: "#5a6588",
  // Accent
  accent: "#0099db",
  accentLight: "#2ce8f5",
  green: "#63c74d",
  greenDark: "#3e8948",
  greenLight: "#a8e06c",
  red: "#e43b44",
  redDark: "#b82e3a",
  yellow: "#fee761",
  yellowWarm: "#f5d442",
  orange: "#f77622",
  orangeLight: "#feae34",
  pink: "#f6757a",
  pinkSoft: "#f4a0a8",
  purple: "#8b6db8",
  // Neutrals
  white: "#ffffff",
  offWhite: "#f0e8dc",
  cream: "#ede0cc",
  light: "#c0cbdc",
  mid: "#8b9bb4",
  dark: "#262b44",
  darker: "#1a1e32",
  black: "#181425",
  // Character
  skin: "#f0c8a0",
  skinShadow: "#d4a478",
  skinHighlight: "#f8dcc0",
  hair: "#3e2731",
  hairLight: "#5c3a42",
  shirt: "#0099db",
  shirtShadow: "#124e89",
  pants: "#3a4466",
  // Window
  skyTop: "#3a8ad4",
  skyMid: "#5cb8f0",
  skyLight: "#8cd8ff",
  skyBottom: "#b0e8ff",
  cloud: "#e8f4ff",
  cloudShadow: "#c8dce8",
  sunbeam: "rgba(255, 240, 180, 0.06)",
  // Ambient
  dustColor: "rgba(255, 235, 200, 0.4)",
  shadowColor: "rgba(30, 20, 15, 0.12)",
  warmGlow: "rgba(255, 220, 160, 0.08)",
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

// ── Shadow helper for furniture depth ──
function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#000";
  // Elliptical shadow beneath object
  for (let i = 0; i < 3; i++) {
    pxRect(ctx, x + i, y + h - 1 + i, w - i * 2, 2, "#000");
  }
  ctx.restore();
}

// ── Draw functions for each object ──

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawShadow(ctx, x + 2, y, 24, 38);
  // Frame
  pxRect(ctx, x, y, 28, 36, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 26, 34, C.woodMid);
  // Back panel
  pxRect(ctx, x + 2, y + 2, 24, 32, C.woodLight);
  // Top molding
  pxRect(ctx, x - 1, y - 1, 30, 2, C.woodDark);
  pxRect(ctx, x, y, 28, 1, C.woodHighlight);
  // Shelves with depth
  for (const sy of [12, 24]) {
    pxRect(ctx, x + 1, y + sy, 26, 2, C.woodDark);
    pxRect(ctx, x + 1, y + sy, 26, 1, C.woodMid);
  }
  // Books row 1 (varied heights, some tilted)
  pxRect(ctx, x + 3, y + 3, 3, 8, C.red);
  pxRect(ctx, x + 3, y + 3, 3, 1, C.redDark);
  pxRect(ctx, x + 7, y + 4, 3, 7, C.accent);
  pxRect(ctx, x + 7, y + 4, 3, 1, C.screenDark);
  pxRect(ctx, x + 11, y + 2, 4, 9, C.green);
  pxRect(ctx, x + 11, y + 2, 4, 1, C.greenDark);
  pxRect(ctx, x + 16, y + 3, 3, 8, C.yellow);
  pxRect(ctx, x + 16, y + 3, 3, 1, C.yellowWarm);
  pxRect(ctx, x + 20, y + 5, 4, 6, C.orange);
  pxRect(ctx, x + 20, y + 5, 4, 1, C.orangeLight);
  // Books row 2
  pxRect(ctx, x + 3, y + 15, 4, 8, C.pink);
  pxRect(ctx, x + 8, y + 14, 3, 9, C.purple);
  pxRect(ctx, x + 12, y + 16, 5, 7, C.wallMid);
  pxRect(ctx, x + 18, y + 15, 3, 8, C.accentLight);
  pxRect(ctx, x + 22, y + 16, 3, 7, C.pinkSoft);
  // Items row 3
  pxRect(ctx, x + 4, y + 27, 5, 6, C.woodLight); // box
  pxRect(ctx, x + 4, y + 27, 5, 1, C.woodHighlight);
  // Tiny cactus
  pxRect(ctx, x + 15, y + 29, 4, 4, C.orange); // pot
  pxRect(ctx, x + 16, y + 27, 2, 3, C.green);
  pxRect(ctx, x + 15, y + 26, 1, 2, C.greenDark);
  pxRect(ctx, x + 18, y + 27, 1, 1, C.greenDark);
  // Globe
  pxRect(ctx, x + 21, y + 28, 4, 4, C.skyMid);
  pxRect(ctx, x + 22, y + 29, 2, 2, C.greenDark);
  pxRect(ctx, x + 22, y + 32, 2, 1, C.woodDark);
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawShadow(ctx, x + 2, y, 52, 34);
  // Desk surface with edge highlight
  pxRect(ctx, x, y, 56, 4, C.woodLight);
  pxRect(ctx, x, y, 56, 1, C.woodHighlight);
  pxRect(ctx, x, y + 3, 56, 1, C.woodGrain);
  // Front panel with wood grain
  pxRect(ctx, x + 2, y + 4, 52, 20, C.woodMid);
  pxRect(ctx, x + 2, y + 4, 52, 1, C.woodDark);
  // Subtle grain lines
  for (let gx = x + 6; gx < x + 50; gx += 7) {
    pxRect(ctx, gx, y + 6, 1, 16, C.woodGrain + "30");
  }
  // Left drawer
  pxRect(ctx, x + 5, y + 7, 20, 14, C.woodDark);
  pxRect(ctx, x + 6, y + 8, 18, 12, C.woodMid);
  pxRect(ctx, x + 6, y + 8, 18, 1, C.woodHighlight + "60");
  pxRect(ctx, x + 13, y + 13, 4, 2, C.woodHighlight); // handle
  pxRect(ctx, x + 13, y + 13, 4, 1, C.woodLight);
  // Right open section
  pxRect(ctx, x + 30, y + 7, 20, 14, C.woodDark + "40");
  // Legs
  pxRect(ctx, x + 4, y + 24, 3, 8, C.woodDark);
  pxRect(ctx, x + 4, y + 24, 1, 8, C.woodMid);
  pxRect(ctx, x + 49, y + 24, 3, 8, C.woodDark);
  pxRect(ctx, x + 49, y + 24, 1, 8, C.woodMid);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Stand
  pxRect(ctx, x + 10, y + 19, 6, 4, C.deskBody);
  pxRect(ctx, x + 10, y + 19, 6, 1, C.deskTop);
  pxRect(ctx, x + 7, y + 22, 12, 2, C.deskBody);
  pxRect(ctx, x + 7, y + 22, 12, 1, C.deskTop);
  // Screen frame (slightly rounded look)
  pxRect(ctx, x, y, 26, 19, C.deskEdge);
  pxRect(ctx, x + 1, y, 24, 19, C.deskBody);
  // Screen with gradient feel
  pxRect(ctx, x + 2, y + 1, 22, 16, C.screenBg);
  // Screen content (code lines with better colors)
  pxRect(ctx, x + 4, y + 3, 8, 1, C.green);
  pxRect(ctx, x + 13, y + 3, 4, 1, C.mid);
  pxRect(ctx, x + 4, y + 5, 14, 1, C.accentLight);
  pxRect(ctx, x + 4, y + 7, 6, 1, C.yellow);
  pxRect(ctx, x + 11, y + 7, 8, 1, C.light);
  pxRect(ctx, x + 4, y + 9, 12, 1, C.pinkSoft);
  pxRect(ctx, x + 4, y + 11, 5, 1, C.green);
  pxRect(ctx, x + 10, y + 11, 10, 1, C.mid);
  pxRect(ctx, x + 4, y + 13, 16, 1, C.accentLight);
  pxRect(ctx, x + 4, y + 15, 9, 1, C.orange);
  // Screen glow reflection
  ctx.save();
  ctx.globalAlpha = 0.03;
  pxRect(ctx, x + 2, y + 1, 22, 8, C.white);
  ctx.restore();
  // Power LED
  pxRect(ctx, x + 12, y + 17, 2, 1, C.green);
  // Keyboard
  pxRect(ctx, x + 3, y + 24, 20, 3, C.keyboard);
  pxRect(ctx, x + 3, y + 24, 20, 1, C.keyboardKey);
  // Key rows
  for (let kx = 0; kx < 8; kx++) {
    pxRect(ctx, x + 4 + kx * 2 + (kx > 3 ? 1 : 0), y + 25, 1, 1, C.keyboardKey);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawShadow(ctx, x + 1, y, 12, 19);
  // Pot with slight gradient
  pxRect(ctx, x + 1, y + 9, 12, 2, C.orange);
  pxRect(ctx, x + 2, y + 10, 10, 8, C.orange);
  pxRect(ctx, x + 3, y + 11, 8, 6, C.woodLight);
  pxRect(ctx, x + 3, y + 11, 8, 1, C.woodHighlight);
  // Soil
  pxRect(ctx, x + 3, y + 11, 8, 2, C.woodDark);
  pxRect(ctx, x + 4, y + 11, 2, 1, C.woodMid);
  // Stem
  pxRect(ctx, x + 6, y + 6, 2, 6, C.greenDark);
  // Leaves (lush, varied)
  pxRect(ctx, x + 4, y + 4, 6, 4, C.green);
  pxRect(ctx, x + 3, y + 3, 4, 3, C.greenDark);
  pxRect(ctx, x + 8, y + 2, 3, 4, C.green);
  pxRect(ctx, x + 5, y + 1, 3, 2, C.greenLight);
  pxRect(ctx, x + 1, y + 5, 3, 3, C.green);
  pxRect(ctx, x + 10, y + 4, 3, 3, C.greenDark);
  // Leaf highlights
  pxRect(ctx, x + 5, y + 2, 1, 1, C.greenLight);
  pxRect(ctx, x + 9, y + 3, 1, 1, C.greenLight);
  // Tiny flower
  pxRect(ctx, x + 3, y + 2, 1, 1, C.pinkSoft);
  pxRect(ctx, x + 10, y + 2, 1, 1, C.yellow);
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, isOn = true) {
  drawShadow(ctx, x + 1, y, 10, 23);
  // Base (rounded)
  pxRect(ctx, x + 2, y + 19, 8, 3, C.deskBody);
  pxRect(ctx, x + 3, y + 19, 6, 1, C.deskTop);
  // Pole
  pxRect(ctx, x + 5, y + 6, 2, 14, C.deskBody);
  pxRect(ctx, x + 5, y + 6, 1, 14, C.deskTop);
  // Shade (wider, more detailed)
  pxRect(ctx, x - 1, y, 14, 7, isOn ? C.yellow : C.mid);
  pxRect(ctx, x, y + 1, 12, 5, isOn ? C.orange : C.deskBody);
  pxRect(ctx, x + 1, y + 2, 10, 3, isOn ? C.yellow : C.mid);
  // Shade rim
  pxRect(ctx, x - 1, y + 6, 14, 1, isOn ? C.orangeLight : C.deskBody);
  // Inner glow when on
  if (isOn) {
    pxRect(ctx, x + 3, y + 3, 6, 1, C.white);
    // Light cone below shade
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let ly = 1; ly <= 6; ly++) {
      pxRect(ctx, x + 2 - ly, y + 7 + ly * 2, 8 + ly * 2, 2, C.yellow);
    }
    ctx.restore();
  }
}

function drawCabinet(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawShadow(ctx, x + 1, y, 18, 36);
  // Body with side shadow
  pxRect(ctx, x, y, 20, 34, C.woodMid);
  pxRect(ctx, x + 1, y + 1, 18, 32, C.woodLight);
  pxRect(ctx, x + 18, y + 1, 1, 32, C.woodMid); // right edge shadow
  // Top
  pxRect(ctx, x - 1, y - 1, 22, 2, C.woodDark);
  pxRect(ctx, x, y, 20, 1, C.woodHighlight);
  // Drawers with better detail
  for (let i = 0; i < 3; i++) {
    const dy = y + 2 + i * 10;
    pxRect(ctx, x + 2, dy, 16, 9, C.woodMid);
    pxRect(ctx, x + 3, dy + 1, 14, 7, C.woodHighlight);
    pxRect(ctx, x + 3, dy + 1, 14, 1, C.offWhite + "40"); // top edge highlight
    pxRect(ctx, x + 8, dy + 3, 4, 2, C.woodDark); // handle
    pxRect(ctx, x + 8, dy + 3, 4, 1, C.woodMid);
  }
  // Label tags (colored tabs)
  pxRect(ctx, x + 14, dy3Offset(y, 0), 3, 4, C.accent);
  pxRect(ctx, x + 14, dy3Offset(y, 0), 3, 1, C.accentLight);
  pxRect(ctx, x + 14, dy3Offset(y, 1), 3, 4, C.green);
  pxRect(ctx, x + 14, dy3Offset(y, 1), 3, 1, C.greenLight);
  pxRect(ctx, x + 14, dy3Offset(y, 2), 3, 4, C.yellow);
  pxRect(ctx, x + 14, dy3Offset(y, 2), 3, 1, C.offWhite);
}

function dy3Offset(y: number, i: number) {
  return y + 4 + i * 10;
}

function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Shadow on wall
  ctx.save();
  ctx.globalAlpha = 0.06;
  pxRect(ctx, x + 2, y + 2, 18, 14, "#000");
  ctx.restore();
  // Frame border (ornate)
  pxRect(ctx, x, y, 18, 14, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 16, 12, C.woodMid);
  pxRect(ctx, x + 1, y + 1, 16, 1, C.woodHighlight);
  // Picture content (sunset scene)
  pxRect(ctx, x + 2, y + 2, 14, 10, C.skyMid);
  pxRect(ctx, x + 2, y + 2, 14, 3, C.skyTop);
  pxRect(ctx, x + 2, y + 8, 14, 4, C.greenDark);
  pxRect(ctx, x + 2, y + 7, 14, 2, C.green);
  // Mountains
  pxRect(ctx, x + 4, y + 5, 3, 3, C.greenDark);
  pxRect(ctx, x + 5, y + 4, 1, 1, C.greenDark);
  pxRect(ctx, x + 10, y + 6, 4, 2, C.greenDark);
  pxRect(ctx, x + 11, y + 5, 2, 1, C.greenDark);
  // Sun with glow
  pxRect(ctx, x + 13, y + 3, 2, 2, C.yellow);
  pxRect(ctx, x + 12, y + 3, 1, 1, C.orangeLight);
  pxRect(ctx, x + 14, y + 4, 1, 1, C.orangeLight);
}

function drawCoffee(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Mug body (ceramic feel)
  pxRect(ctx, x + 1, y + 3, 8, 8, C.offWhite);
  pxRect(ctx, x + 2, y + 4, 6, 6, C.cream);
  // Handle
  pxRect(ctx, x + 9, y + 5, 3, 5, C.offWhite);
  pxRect(ctx, x + 10, y + 6, 2, 3, C.cream);
  pxRect(ctx, x + 11, y + 7, 1, 1, C.offWhite);
  // Coffee liquid
  pxRect(ctx, x + 2, y + 5, 6, 4, C.woodDark);
  pxRect(ctx, x + 3, y + 5, 4, 1, C.woodMid);
  // Mug highlight
  pxRect(ctx, x + 1, y + 3, 1, 3, C.white);
  // Steam (2 wisps)
  ctx.save();
  ctx.globalAlpha = 0.5;
  pxRect(ctx, x + 3, y + 1, 1, 2, C.light);
  pxRect(ctx, x + 4, y, 1, 1, C.light);
  pxRect(ctx, x + 6, y, 1, 2, C.light);
  pxRect(ctx, x + 7, y + 1, 1, 1, C.light);
  ctx.restore();
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawShadow(ctx, x + 3, y, 12, 23);
  // Back (ergonomic shape)
  pxRect(ctx, x + 2, y, 14, 3, C.deskBody);
  pxRect(ctx, x + 3, y + 3, 12, 8, C.deskBody);
  pxRect(ctx, x + 4, y + 4, 10, 6, C.deskTop);
  // Back highlight
  pxRect(ctx, x + 4, y + 4, 10, 1, C.mid);
  // Seat
  pxRect(ctx, x, y + 11, 18, 4, C.deskBody);
  pxRect(ctx, x + 1, y + 12, 16, 2, C.deskTop);
  pxRect(ctx, x + 1, y + 11, 16, 1, C.mid); // seat edge highlight
  // Cylinder
  pxRect(ctx, x + 7, y + 15, 4, 4, C.dark);
  pxRect(ctx, x + 7, y + 15, 2, 4, C.deskBody);
  // Star base & wheels
  pxRect(ctx, x + 4, y + 19, 10, 1, C.dark);
  pxRect(ctx, x + 3, y + 20, 3, 2, C.dark);
  pxRect(ctx, x + 3, y + 21, 1, 1, C.deskBody);
  pxRect(ctx, x + 12, y + 20, 3, 2, C.dark);
  pxRect(ctx, x + 14, y + 21, 1, 1, C.deskBody);
}

function drawJournal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawShadow(ctx, x + 1, y, 12, 20);
  // Cover (leather-like)
  pxRect(ctx, x, y, 14, 18, C.woodDark);
  pxRect(ctx, x + 1, y + 1, 12, 16, C.accent);
  pxRect(ctx, x + 2, y + 2, 10, 14, C.screenDark);
  // Leather texture
  pxRect(ctx, x + 1, y + 1, 12, 1, C.accentLight + "40");
  // Spine (stitched)
  pxRect(ctx, x, y, 2, 18, C.woodDark);
  pxRect(ctx, x, y + 2, 1, 1, C.woodMid);
  pxRect(ctx, x, y + 5, 1, 1, C.woodMid);
  pxRect(ctx, x, y + 8, 1, 1, C.woodMid);
  pxRect(ctx, x, y + 11, 1, 1, C.woodMid);
  pxRect(ctx, x, y + 14, 1, 1, C.woodMid);
  // Title lines
  pxRect(ctx, x + 4, y + 4, 6, 1, C.light);
  pxRect(ctx, x + 4, y + 6, 4, 1, C.light);
  // Small star decoration
  pxRect(ctx, x + 6, y + 10, 2, 2, C.yellow);
  pxRect(ctx, x + 5, y + 11, 1, 1, C.yellow);
  pxRect(ctx, x + 8, y + 11, 1, 1, C.yellow);
  // Bookmark ribbon
  pxRect(ctx, x + 9, y + 16, 2, 3, C.red);
  pxRect(ctx, x + 8, y + 18, 1, 1, C.red);
  pxRect(ctx, x + 11, y + 18, 1, 1, C.red);
}

function drawAgent(ctx: CanvasRenderingContext2D, x: number, y: number, state: string, animFrame: number, shirtColor?: string, label?: string) {
  const s = 2;

  // Tiny shadow below character
  ctx.save();
  ctx.globalAlpha = 0.08;
  pxRect(ctx, x + s, y + 7 * s + 2, 4 * s, s, "#000");
  ctx.restore();

  // Hair (more styled - spiky top)
  ctx.fillStyle = C.hair;
  for (const [px, py] of [[1,0],[2,0],[3,0],[4,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1]]) {
    ctx.fillRect(x + px * s, y + py * s, s, s);
  }
  // Hair highlights
  ctx.fillStyle = C.hairLight;
  ctx.fillRect(x + 2 * s, y, s, s);
  ctx.fillRect(x + 4 * s, y, s, s);

  // Face
  ctx.fillStyle = C.skin;
  for (const [px, py] of [[1,2],[2,2],[3,2],[4,2],[1,3],[2,3],[3,3],[4,3]]) {
    ctx.fillRect(x + px * s, y + py * s, s, s);
  }
  // Face highlight (left cheek)
  ctx.fillStyle = C.skinHighlight;
  ctx.fillRect(x + 1 * s, y + 2 * s, s, s);

  // Eyes (with blink on some frames when idle)
  const blink = state === "idle" && animFrame === 1;
  ctx.fillStyle = C.black;
  if (!blink) {
    ctx.fillRect(x + 2 * s, y + 2 * s, s, s);
    ctx.fillRect(x + 4 * s, y + 2 * s, s, s);
    // Eye shine
    ctx.fillStyle = C.white;
    ctx.fillRect(x + 2 * s, y + 2 * s, 1, 1);
    ctx.fillRect(x + 4 * s, y + 2 * s, 1, 1);
  } else {
    // Closed eyes (line)
    ctx.fillRect(x + 2 * s, y + 2 * s + 1, s, 1);
    ctx.fillRect(x + 4 * s, y + 2 * s + 1, s, 1);
  }

  // Blush cheeks
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = C.pinkSoft;
  ctx.fillRect(x + 1 * s, y + 3 * s, s, s);
  ctx.fillRect(x + 4 * s, y + 3 * s, s, s);
  ctx.restore();

  // Mouth
  ctx.fillStyle = C.skinShadow;
  if (state === "working") {
    // Open mouth (happy working)
    ctx.fillRect(x + 3 * s, y + 3 * s, s, s);
  } else if (state === "error") {
    // Frown
    pxRect(ctx, x + 2 * s + 1, y + 3 * s + 1, s + 1, 1, C.skinShadow);
  } else {
    // Gentle smile
    ctx.fillRect(x + 3 * s, y + 3 * s, s, 1);
  }

  // Shirt (with collar detail)
  const sc = shirtColor ?? C.shirt;
  ctx.fillStyle = sc;
  for (const [px, py] of [[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[1,5],[2,5],[3,5],[4,5]]) {
    ctx.fillRect(x + px * s, y + py * s, s, s);
  }
  // Collar
  ctx.fillStyle = C.white;
  ctx.fillRect(x + 2 * s + 1, y + 4 * s, 2, s);

  // Arms - shift down by 1px when working on alternate frames (typing)
  const armShift = state === "working" && animFrame === 1 ? 1 : 0;
  ctx.fillStyle = shirtColor ? `${shirtColor}cc` : C.shirtShadow;
  for (const [px, py] of [[1,6],[2,6],[3,6],[4,6]]) {
    ctx.fillRect(x + px * s, y + py * s + armShift, s, s);
  }
  // Hands (skin colored)
  ctx.fillStyle = C.skin;
  ctx.fillRect(x + 1 * s, y + 6 * s + armShift + s - 1, s, 1);
  ctx.fillRect(x + 4 * s, y + 6 * s + armShift + s - 1, s, 1);

  // Status bubble (rounded with shadow)
  const bx = x + 7 * s;
  const by = y - 4;
  // Bubble shadow
  ctx.save();
  ctx.globalAlpha = 0.06;
  pxRect(ctx, bx + 1, by + 1, 14, 10, "#000");
  ctx.restore();
  // Bubble body
  pxRect(ctx, bx + 1, by, 12, 9, C.white);
  pxRect(ctx, bx, by + 1, 14, 7, C.white);
  // Bubble tail
  pxRect(ctx, bx, by + 8, 3, 2, C.white);
  pxRect(ctx, bx, by + 10, 1, 1, C.white);

  if (state === "working") {
    // Typing dots with bounce effect
    const bounce0 = animFrame === 0 ? -1 : 0;
    const bounce1 = animFrame === 0 ? 0 : -1;
    pxRect(ctx, bx + 3, by + 3 + bounce0, 2, 2, C.green);
    pxRect(ctx, bx + 6, by + 3 + bounce1, 2, 2, C.green);
    pxRect(ctx, bx + 9, by + 3 + bounce0, 2, 2, C.greenDark);
  } else if (state === "error") {
    // Error icon
    if (animFrame === 0) {
      pxRect(ctx, bx + 5, by + 2, 4, 5, C.red);
      pxRect(ctx, bx + 6, by + 3, 2, 2, C.white);
    }
  } else {
    // Idle - zzz with float
    if (animFrame === 0) {
      ctx.fillStyle = C.mid;
      ctx.font = "bold 5px monospace";
      ctx.fillText("z", bx + 4, by + 5);
      ctx.fillText("z", bx + 7, by + 4);
      ctx.font = "bold 4px monospace";
      ctx.fillText("z", bx + 9, by + 3);
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
  // Shadow on wall
  ctx.save();
  ctx.globalAlpha = 0.05;
  pxRect(ctx, x + 2, y + 2, 38, 30, "#000");
  ctx.restore();

  // Outer frame (thick, ornate)
  pxRect(ctx, x - 1, y - 1, 38, 30, C.woodDark);
  pxRect(ctx, x, y, 36, 28, C.woodMid);
  // Inner frame
  pxRect(ctx, x + 1, y + 1, 34, 26, C.woodDark);

  // Glass panes with sky gradient
  // Left pane
  pxRect(ctx, x + 2, y + 2, 15, 24, C.skyBottom);
  pxRect(ctx, x + 2, y + 2, 15, 12, C.skyLight);
  pxRect(ctx, x + 2, y + 2, 15, 6, C.skyMid);
  pxRect(ctx, x + 2, y + 2, 15, 2, C.skyTop);
  // Right pane
  pxRect(ctx, x + 19, y + 2, 15, 24, C.skyBottom);
  pxRect(ctx, x + 19, y + 2, 15, 12, C.skyLight);
  pxRect(ctx, x + 19, y + 2, 15, 6, C.skyMid);
  pxRect(ctx, x + 19, y + 2, 15, 2, C.skyTop);

  // Clouds (fluffy, multi-layered)
  pxRect(ctx, x + 4, y + 5, 8, 2, C.cloud);
  pxRect(ctx, x + 5, y + 4, 5, 1, C.cloud);
  pxRect(ctx, x + 3, y + 6, 2, 1, C.cloudShadow);
  pxRect(ctx, x + 22, y + 7, 6, 2, C.cloud);
  pxRect(ctx, x + 23, y + 6, 4, 1, C.cloud);
  pxRect(ctx, x + 21, y + 8, 2, 1, C.cloudShadow);

  // Distant trees/hills at bottom of window
  pxRect(ctx, x + 2, y + 20, 15, 6, C.greenDark);
  pxRect(ctx, x + 19, y + 20, 15, 6, C.greenDark);
  pxRect(ctx, x + 4, y + 18, 4, 3, C.green);
  pxRect(ctx, x + 10, y + 19, 3, 2, C.green);
  pxRect(ctx, x + 22, y + 18, 5, 3, C.green);
  pxRect(ctx, x + 29, y + 19, 3, 2, C.green);

  // Cross bar (window divider)
  pxRect(ctx, x + 17, y + 2, 2, 24, C.woodMid);
  pxRect(ctx, x + 17, y + 2, 1, 24, C.woodHighlight);
  pxRect(ctx, x + 2, y + 13, 32, 2, C.woodMid);
  pxRect(ctx, x + 2, y + 13, 32, 1, C.woodHighlight);

  // Curtains (soft drape)
  // Left curtain
  pxRect(ctx, x - 4, y - 2, 5, 32, C.pinkSoft);
  pxRect(ctx, x - 3, y - 2, 3, 32, C.pink);
  pxRect(ctx, x - 4, y - 2, 1, 32, C.pinkSoft + "80");
  // Curtain folds
  pxRect(ctx, x - 2, y + 4, 1, 24, C.pinkSoft + "60");
  pxRect(ctx, x - 3, y + 8, 1, 18, C.pink + "80");
  // Right curtain
  pxRect(ctx, x + 35, y - 2, 5, 32, C.pinkSoft);
  pxRect(ctx, x + 36, y - 2, 3, 32, C.pink);
  pxRect(ctx, x + 39, y - 2, 1, 32, C.pinkSoft + "80");
  pxRect(ctx, x + 37, y + 4, 1, 24, C.pinkSoft + "60");
  // Curtain rod
  pxRect(ctx, x - 6, y - 3, 48, 2, C.woodDark);
  pxRect(ctx, x - 6, y - 3, 48, 1, C.woodMid);
  // Rod finials
  pxRect(ctx, x - 7, y - 4, 2, 4, C.woodDark);
  pxRect(ctx, x + 41, y - 4, 2, 4, C.woodDark);

  // Windowsill
  pxRect(ctx, x - 2, y + 27, 40, 3, C.woodMid);
  pxRect(ctx, x - 2, y + 27, 40, 1, C.woodHighlight);
}

function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Rug shadow
  ctx.save();
  ctx.globalAlpha = 0.05;
  pxRect(ctx, x + 1, y + 1, 50, 24, "#000");
  ctx.restore();

  // Rug layers
  pxRect(ctx, x, y, 50, 24, C.deskTop);
  pxRect(ctx, x + 1, y + 1, 48, 22, C.accent);
  pxRect(ctx, x + 2, y + 2, 46, 20, C.deskTop);
  // Border pattern (double line)
  pxRect(ctx, x + 3, y + 3, 44, 1, C.accentLight);
  pxRect(ctx, x + 3, y + 20, 44, 1, C.accentLight);
  pxRect(ctx, x + 3, y + 3, 1, 18, C.accentLight);
  pxRect(ctx, x + 46, y + 3, 1, 18, C.accentLight);
  // Inner border
  pxRect(ctx, x + 5, y + 5, 40, 1, C.accent + "60");
  pxRect(ctx, x + 5, y + 18, 40, 1, C.accent + "60");
  // Diamond center pattern
  for (let i = 0; i < 5; i++) {
    pxRect(ctx, x + 21 + i, y + 11 - i, 1, 1 + i * 2, C.accent);
    pxRect(ctx, x + 29 - i, y + 11 - i, 1, 1 + i * 2, C.accent);
  }
  // Corner motifs
  pxRect(ctx, x + 7, y + 7, 3, 3, C.accent + "80");
  pxRect(ctx, x + 40, y + 7, 3, 3, C.accent + "80");
  pxRect(ctx, x + 7, y + 14, 3, 3, C.accent + "80");
  pxRect(ctx, x + 40, y + 14, 3, 3, C.accent + "80");
  // Fringe
  for (let fx = 0; fx < 12; fx++) {
    pxRect(ctx, x + 2 + fx * 4, y + 23, 1, 2, C.deskTop);
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
  window: [44, 32],
  plant: [14, 18],
  lamp: [14, 22],
  desk: [56, 32],
  monitor: [26, 28],
  coffee: [12, 11],
  chair: [18, 22],
  cabinet: [20, 34],
  rug: [50, 26],
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

// ── Dust particle system ──
interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

function createDustMotes(count: number): DustMote[] {
  const motes: DustMote[] = [];
  for (let i = 0; i < count; i++) {
    motes.push({
      x: Math.random() * 250,
      y: Math.random() * 140,
      vx: (Math.random() - 0.5) * 0.15,
      vy: Math.random() * 0.1 + 0.02,
      size: Math.random() * 1.2 + 0.4,
      alpha: Math.random() * 0.3 + 0.1,
    });
  }
  return motes;
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

  // Dust particle system
  const dustRef = useRef<DustMote[]>(createDustMotes(18));
  const dustTickRef = useRef(0);

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

      // ── Wall with wallpaper pattern ──
      const wallH = 48;
      // Base wall color
      pxRect(ctx, 0, 0, roomW, wallH, C.wallMid);

      // Wallpaper subtle stripe pattern
      for (let wx = 0; wx < roomW; wx += 6) {
        pxRect(ctx, wx, 0, 2, wallH, C.wallPaper + "18");
      }
      // Wallpaper diamond pattern
      for (let wy = 6; wy < wallH - 8; wy += 12) {
        for (let wx = 4; wx < roomW - 4; wx += 12) {
          const offset = ((wy / 12) % 2) * 6;
          ctx.save();
          ctx.globalAlpha = 0.04;
          pxRect(ctx, wx + offset, wy, 2, 2, C.wallLight);
          pxRect(ctx, wx + offset + 1, wy - 1, 1, 1, C.wallLight);
          pxRect(ctx, wx + offset + 1, wy + 2, 1, 1, C.wallLight);
          ctx.restore();
        }
      }

      // Crown molding (top)
      pxRect(ctx, 0, 0, roomW, 1, C.molding);
      pxRect(ctx, 0, 1, roomW, 1, C.moldingDark);
      pxRect(ctx, 0, 2, roomW, 1, C.molding);
      // Molding shadow
      pxRect(ctx, 0, 3, roomW, 1, C.wallMid + "80");

      // Wainscoting (lower wall panel)
      const wainscotTop = wallH - 14;
      pxRect(ctx, 0, wainscotTop, roomW, 14, C.wallDark);
      pxRect(ctx, 0, wainscotTop, roomW, 1, C.moldingDark);
      pxRect(ctx, 0, wainscotTop + 1, roomW, 1, C.molding + "60");
      // Wainscot panels
      for (let wx = 4; wx < roomW - 4; wx += 20) {
        pxRect(ctx, wx, wainscotTop + 3, 16, 9, C.wallMid + "40");
        pxRect(ctx, wx, wainscotTop + 3, 16, 1, C.molding + "30");
        pxRect(ctx, wx, wainscotTop + 11, 16, 1, C.wallTrim + "20");
      }

      // Baseboard
      pxRect(ctx, 0, wallH - 2, roomW, 2, C.baseboard);
      pxRect(ctx, 0, wallH - 2, roomW, 1, C.moldingDark);

      // ── Floor (wood planks) ──
      const floorColors = [C.floorA, C.floorB, C.floorC, C.floorB, C.floorA];
      for (let fy = 0; fy < roomH - wallH; fy += 6) {
        const colorIdx = (fy / 6) % floorColors.length;
        const plankColor = floorColors[colorIdx];
        const offset = ((fy / 6) % 2) * 30; // Stagger planks

        for (let fx = -30 + offset; fx < roomW + 30; fx += 50) {
          pxRect(ctx, Math.max(0, fx), wallH + fy, Math.min(50, roomW - Math.max(0, fx)), 6, plankColor);
          // Plank gap (darker line)
          pxRect(ctx, Math.max(0, fx), wallH + fy + 5, Math.min(50, roomW - Math.max(0, fx)), 1, C.floorLine + "60");
          // Vertical plank seam
          if (fx > 0 && fx < roomW) {
            pxRect(ctx, fx, wallH + fy, 1, 6, C.floorLine + "40");
          }
        }
        // Subtle wood grain
        if (fy % 12 === 0) {
          for (let gx = 10 + (fy % 24); gx < roomW; gx += 35) {
            ctx.save();
            ctx.globalAlpha = 0.04;
            pxRect(ctx, gx, wallH + fy + 1, 8, 1, C.floorKnot);
            pxRect(ctx, gx + 2, wallH + fy + 2, 4, 1, C.floorKnot);
            ctx.restore();
          }
        }
      }

      // Floor edge highlight (where wall meets floor)
      pxRect(ctx, 0, wallH, roomW, 1, C.floorHighlight + "40");

      // ── Room border ──
      ctx.strokeStyle = C.wallTrim;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, roomW - 1, roomH - 1);

      // ── Sunbeam from window ──
      const winObj = objects.find((o) => o.id === "window");
      if (winObj) {
        ctx.save();
        // Diagonal light beam from window
        const wx = winObj.x + 18;
        const wy = winObj.y + 28;
        ctx.globalAlpha = 1;
        // Light trapezoid on floor
        ctx.fillStyle = C.sunbeam;
        ctx.beginPath();
        ctx.moveTo(wx - 10, wy);
        ctx.lineTo(wx + 46, wy);
        ctx.lineTo(wx + 70, roomH);
        ctx.lineTo(wx - 30, roomH);
        ctx.closePath();
        ctx.fill();
        // Second layer for intensity
        ctx.fillStyle = C.warmGlow;
        ctx.beginPath();
        ctx.moveTo(wx - 5, wy);
        ctx.lineTo(wx + 40, wy);
        ctx.lineTo(wx + 56, roomH);
        ctx.lineTo(wx - 18, roomH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // ── Lamp glow effect when on ──
      if (lampOn) {
        const lampObj = objects.find((o) => o.id === "lamp");
        if (lampObj) {
          ctx.save();
          const gx = lampObj.x + 6;
          const gy = lampObj.y + 4;
          // Larger, warmer glow
          const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, 35);
          grad.addColorStop(0, "rgba(254, 231, 97, 0.18)");
          grad.addColorStop(0.4, "rgba(254, 200, 80, 0.08)");
          grad.addColorStop(1, "rgba(254, 231, 97, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(gx - 35, gy - 12, 70, 50);
          ctx.restore();
        }
      }

      // ── Agent workstation slots ──
      const agentSessions = sessions.filter((s) => s.state === "working" || s.state === "idle");
      const DESK_RELATED = new Set(["desk", "chair", "monitor", "coffee", "journal"]);
      const hasAgents = agentSessions.length > 0;

      // Workstation positions (desk origin) — max 6
      const SLOTS = [
        { dx: 88, dy: 52 },
        { dx: 4,  dy: 56 },
        { dx: 178, dy: 56 },
        { dx: 4,  dy: 96 },
        { dx: 88, dy: 96 },
        { dx: 178, dy: 96 },
      ];

      // ── Draw objects (sorted by y for depth) ──
      const sorted = [...objects].sort((a, b) => a.y - b.y);

      for (const obj of sorted) {
        // Hide default desk furniture when agents occupy the room
        if (hasAgents && DESK_RELATED.has(obj.id)) continue;

        const drawFn = DRAW_MAP[obj.id];
        if (!drawFn) continue;

        const isHover = hoveredObj === obj.id;
        const isDrag = dragObj === obj.id;

        if (isHover || isDrag) {
          const [w, h] = OBJ_SIZES[obj.id] || [20, 20];
          ctx.save();
          ctx.shadowColor = C.accentLight;
          ctx.shadowBlur = 6;
          ctx.fillStyle = isDrag ? "rgba(0,153,219,0.18)" : "rgba(0,153,219,0.08)";
          ctx.fillRect(obj.x - 2, obj.y - 2, w + 4, h + 4);
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
          // Label background
          const labelText = obj.label;
          ctx.font = "bold 7px monospace";
          const tw = ctx.measureText(labelText).width;
          pxRect(ctx, obj.x + w / 2 - tw / 2 - 2, obj.y - 10, tw + 4, 8, C.dark + "cc");
          ctx.fillStyle = C.white;
          ctx.textAlign = "center";
          ctx.fillText(labelText, obj.x + w / 2, obj.y - 4);
        }
      }

      // ── Agent Workstations ──
      if (!hasAgents) {
        // No sessions: draw idle default agent at existing desk
        drawAgent(ctx, 126, 70, "idle", animFrame);
      } else {
        const maxAgents = Math.min(agentSessions.length, 6);

        // Group agents by taskId to find context-sharing pairs
        const taskGroups = new Map<string, number[]>();
        for (let i = 0; i < maxAgents; i++) {
          const tid = agentSessions[i].taskId;
          if (!taskGroups.has(tid)) taskGroups.set(tid, []);
          taskGroups.get(tid)!.push(i);
        }

        // Draw each workstation: desk → chair → agent (back to front)
        for (let i = 0; i < maxAgents; i++) {
          const slot = SLOTS[i];
          const s = agentSessions[i];
          const preset = s.agentRole ? getAgentPreset(s.agentRole) : null;

          // 1) Desk
          drawDesk(ctx, slot.dx, slot.dy);
          // Mini monitor on desk
          drawMonitor(ctx, slot.dx + 15, slot.dy - 20);

          // 2) Chair (drawn before agent, agent overlaps it)
          drawChair(ctx, slot.dx + 19, slot.dy + 24);

          // 3) Agent sitting at desk
          drawAgent(
            ctx,
            slot.dx + 22,
            slot.dy + 12,
            s.state,
            animFrame,
            preset?.color,
            preset ? preset.icon : undefined,
          );
        }

        // ── Context sharing connections ──
        for (const [, indices] of taskGroups) {
          if (indices.length < 2) continue;
          ctx.save();
          ctx.strokeStyle = C.accent;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.globalAlpha = 0.5;
          for (let j = 0; j < indices.length - 1; j++) {
            const a = SLOTS[indices[j]];
            const b = SLOTS[indices[j + 1]];
            const ax = a.dx + 28, ay = a.dy + 20;
            const bx = b.dx + 28, by = b.dy + 20;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
            // Shared context icon at midpoint
            const mx = (ax + bx) / 2, my = (ay + by) / 2;
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.8;
            pxRect(ctx, mx - 3, my - 3, 6, 6, C.accent);
            pxRect(ctx, mx - 2, my - 2, 4, 4, C.white);
            pxRect(ctx, mx - 1, my - 1, 2, 2, C.accent);
            ctx.setLineDash([2, 2]);
            ctx.globalAlpha = 0.5;
          }
          ctx.restore();
        }
      }

      // ── Custom Dot Art objects ──
      if (dotArts.length > 0) {
        const art = dotArts[dotArts.length - 1]; // show latest
        const artScale = 1;
        const artX = 50;
        const artY = 52;
        const artW = art.gridSize * artScale;
        const artH = art.gridSize * artScale;
        // Frame with shadow
        ctx.save();
        ctx.globalAlpha = 0.06;
        pxRect(ctx, artX, artY, artW + 2, artH + 2, "#000");
        ctx.restore();
        pxRect(ctx, artX - 1, artY - 1, artW + 2, artH + 2, C.woodDark);
        pxRect(ctx, artX - 1, artY - 1, artW + 2, 1, C.woodMid);
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

      // ── Floating dust particles ──
      dustTickRef.current++;
      const motes = dustRef.current;
      ctx.save();
      for (const mote of motes) {
        // Update position
        mote.x += mote.vx;
        mote.y += mote.vy;
        // Wrap around
        if (mote.y > roomH) { mote.y = -2; mote.x = Math.random() * roomW; }
        if (mote.x < 0) mote.x = roomW;
        if (mote.x > roomW) mote.x = 0;

        // Only show dust in sunbeam area (brighter) or faintly elsewhere
        const inSunbeam = winObj && mote.x > winObj.x - 10 && mote.x < winObj.x + 70 && mote.y > winObj.y;
        ctx.globalAlpha = inSunbeam ? mote.alpha * 1.5 : mote.alpha * 0.3;
        ctx.fillStyle = inSunbeam ? C.dustColor : C.light;
        ctx.fillRect(Math.round(mote.x), Math.round(mote.y), mote.size, mote.size);
      }
      ctx.restore();

      // ── Warm ambient vignette ──
      ctx.save();
      const vigGrad = ctx.createRadialGradient(roomW / 2, roomH / 2, roomW * 0.3, roomW / 2, roomH / 2, roomW * 0.7);
      vigGrad.addColorStop(0, "rgba(0,0,0,0)");
      vigGrad.addColorStop(1, "rgba(20,15,10,0.08)");
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, roomW, roomH);
      ctx.restore();

      ctx.restore();
    },
    [objects, hoveredObj, dragObj, lampOn, agentState, animFrame, dotArts, sessions]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;
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
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
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

    // Check if clicked on an agent workstation → navigate to terminal
    if (downPos) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const [rx, ry] = toRoom(e.clientX - rect.left, e.clientY - rect.top);
        const agentSess = sessions.filter((ss) => ss.state === "working" || ss.state === "idle");
        const SLOTS = [
          { dx: 88, dy: 52 }, { dx: 4, dy: 56 }, { dx: 178, dy: 56 },
          { dx: 4, dy: 96 }, { dx: 88, dy: 96 }, { dx: 178, dy: 96 },
        ];
        const maxA = Math.min(agentSess.length, 6);
        for (let i = 0; i < maxA; i++) {
          if (rx >= SLOTS[i].dx && rx <= SLOTS[i].dx + 56 && ry >= SLOTS[i].dy - 20 && ry <= SLOTS[i].dy + 46) {
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
