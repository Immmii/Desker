import { useState, useRef, useEffect, useCallback } from "react";
import { useProjectVM } from "../../../viewmodels/project.vm";
import type { Task, TaskStatus } from "../../../types/models";
import TaskDetailModal from "../../shared/TaskDetailModal";

// ─── Sticker Data Model ────────────────────────────────────────────────────
interface CalendarSticker {
  id: string;
  dateStr: string;  // YYYY-MM-DD
  stickerId: string; // built-in key or "custom:{dataUrl}"
}

const STICKER_STORAGE_KEY = "desker:calendar-stickers";
const CUSTOM_STICKER_STORAGE_KEY = "desker:custom-stickers";

function loadStickers(): CalendarSticker[] {
  try {
    const raw = localStorage.getItem(STICKER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStickers(stickers: CalendarSticker[]): void {
  localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(stickers));
}

function loadCustomStickers(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STICKER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomStickers(dataUrls: string[]): void {
  localStorage.setItem(CUSTOM_STICKER_STORAGE_KEY, JSON.stringify(dataUrls));
}

// ─── Built-in SVG Sticker Components ──────────────────────────────────────
function StickerCat({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="20" rx="10" ry="9" fill="#F4A460"/>
      <ellipse cx="16" cy="20" rx="8" ry="7" fill="#FFDAB9"/>
      {/* Ears */}
      <polygon points="8,14 5,7 12,12" fill="#F4A460"/>
      <polygon points="24,14 27,7 20,12" fill="#F4A460"/>
      <polygon points="9,13 7,8 12,12" fill="#FFB6C1"/>
      <polygon points="23,13 25,8 20,12" fill="#FFB6C1"/>
      {/* Eyes */}
      <ellipse cx="12.5" cy="19" rx="2" ry="2.5" fill="#3D2B1F"/>
      <ellipse cx="19.5" cy="19" rx="2" ry="2.5" fill="#3D2B1F"/>
      <circle cx="13.2" cy="18.3" r="0.7" fill="white"/>
      <circle cx="20.2" cy="18.3" r="0.7" fill="white"/>
      {/* Nose */}
      <ellipse cx="16" cy="22" rx="1.2" ry="0.9" fill="#FF9999"/>
      {/* Whiskers */}
      <line x1="5" y1="21" x2="13" y2="22" stroke="#A0826D" strokeWidth="0.8"/>
      <line x1="5" y1="23" x2="13" y2="23" stroke="#A0826D" strokeWidth="0.8"/>
      <line x1="19" y1="22" x2="27" y2="21" stroke="#A0826D" strokeWidth="0.8"/>
      <line x1="19" y1="23" x2="27" y2="23" stroke="#A0826D" strokeWidth="0.8"/>
      {/* Mouth */}
      <path d="M 14.5 23.5 Q 16 25 17.5 23.5" stroke="#A0826D" strokeWidth="0.8" fill="none"/>
    </svg>
  );
}

function StickerHeart({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 27 C16 27 4 19 4 11.5 C4 7.4 7.4 4 11.5 4 C13.6 4 15.5 5 16 6.2 C16.5 5 18.4 4 20.5 4 C24.6 4 28 7.4 28 11.5 C28 19 16 27 16 27Z" fill="#FF6B8A"/>
      <path d="M16 25 C16 25 6 18 6 11.5 C6 8.5 8.5 6 11.5 6 C13.3 6 14.9 7 16 8.5 C17.1 7 18.7 6 20.5 6 C23.5 6 26 8.5 26 11.5 C26 18 16 25 16 25Z" fill="#FF9BB5"/>
      <path d="M10 10 Q12 8 14 10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

function StickerStar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3 L19.5 12.5 L29.5 12.5 L21.5 18.5 L24.5 28 L16 22.5 L7.5 28 L10.5 18.5 L2.5 12.5 L12.5 12.5 Z" fill="#FFD700"/>
      <path d="M16 5.5 L19 13.5 L27.5 13.5 L20.5 18.5 L23 26 L16 21.5 L9 26 L11.5 18.5 L4.5 13.5 L13 13.5 Z" fill="#FFE44D"/>
      {/* Sparkles */}
      <circle cx="26" cy="6" r="1.5" fill="#FFD700"/>
      <circle cx="6" cy="8" r="1" fill="#FFE44D"/>
      <line x1="26" y1="3" x2="26" y2="9" stroke="#FFD700" strokeWidth="1" strokeLinecap="round"/>
      <line x1="23" y1="6" x2="29" y2="6" stroke="#FFD700" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function StickerFlower({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Petals */}
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FF9ED2" transform="rotate(0 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FFB8E0" transform="rotate(45 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FF9ED2" transform="rotate(90 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FFB8E0" transform="rotate(135 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FF9ED2" transform="rotate(180 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FFB8E0" transform="rotate(225 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FF9ED2" transform="rotate(270 16 16)"/>
      <ellipse cx="16" cy="8" rx="4" ry="5" fill="#FFB8E0" transform="rotate(315 16 16)"/>
      {/* Center */}
      <circle cx="16" cy="16" r="5.5" fill="#FFE44D"/>
      <circle cx="16" cy="16" r="4" fill="#FFD700"/>
      <circle cx="14.5" cy="14.5" r="1" fill="#FFF0A0" opacity="0.8"/>
    </svg>
  );
}

function StickerCoffee({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cup body */}
      <path d="M7 14 L9 28 L23 28 L25 14 Z" fill="#8B5E3C"/>
      <path d="M8 14 L10 27 L22 27 L24 14 Z" fill="#A0724A"/>
      {/* Cup rim */}
      <rect x="6" y="12" width="20" height="3" rx="1.5" fill="#6B4226"/>
      {/* Handle */}
      <path d="M25 17 Q31 17 31 22 Q31 27 25 27" stroke="#6B4226" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Coffee surface */}
      <ellipse cx="16" cy="13.5" rx="8" ry="2" fill="#5C3317"/>
      {/* Cream swirl */}
      <path d="M13 13 Q16 11 19 13 Q16 15 13 13Z" fill="#F5DEB3" opacity="0.7"/>
      {/* Steam */}
      <path d="M12 8 Q13 6 12 4" stroke="#B0B0B0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8"/>
      <path d="M16 7 Q17 5 16 3" stroke="#B0B0B0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8"/>
      <path d="M20 8 Q21 6 20 4" stroke="#B0B0B0" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8"/>
    </svg>
  );
}

function StickerBook({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book left */}
      <path d="M4 6 L16 8 L16 26 L4 24 Z" fill="#5B9BD5"/>
      <path d="M5 7 L15 9 L15 25 L5 23 Z" fill="#74AEDE"/>
      {/* Book right */}
      <path d="M28 6 L16 8 L16 26 L28 24 Z" fill="#4A90C4"/>
      <path d="M27 7 L17 9 L17 25 L27 23 Z" fill="#5BA3D3"/>
      {/* Spine */}
      <rect x="15" y="7" width="2" height="19" fill="#2C6FA0"/>
      {/* Lines on left page */}
      <line x1="7" y1="13" x2="14" y2="13.5" stroke="white" strokeWidth="1" opacity="0.5"/>
      <line x1="7" y1="16" x2="14" y2="16.5" stroke="white" strokeWidth="1" opacity="0.5"/>
      <line x1="7" y1="19" x2="14" y2="19.5" stroke="white" strokeWidth="1" opacity="0.5"/>
      {/* Lines on right page */}
      <line x1="18" y1="13.5" x2="25" y2="13" stroke="white" strokeWidth="1" opacity="0.5"/>
      <line x1="18" y1="16.5" x2="25" y2="16" stroke="white" strokeWidth="1" opacity="0.5"/>
      <line x1="18" y1="19.5" x2="25" y2="19" stroke="white" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

function StickerFire({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 29 C10 29 6 24 6 19 C6 14 10 11 10 11 C10 14 12 15 12 15 C12 12 14 8 16 4 C16 4 20 9 20 13 C20 13 22 12 22 9 C22 9 26 13 26 19 C26 24 22 29 16 29Z" fill="#FF6B1A"/>
      <path d="M16 27 C11.5 27 8 23 8 19 C8 15.5 10.5 13 10.5 13 C10.5 15 12 16 12 16 C12.5 13 14 10 16 7 C18 10 19.5 13 19.5 15 C21 14 21.5 12 21.5 12 C24 15 24 17 24 19 C24 23 20.5 27 16 27Z" fill="#FF9A3C"/>
      <path d="M16 25 C13 25 10.5 22.5 10.5 19.5 C10.5 17 12 15.5 12 15.5 C12 17 13.5 18 13.5 18 C14 16 15 14.5 16 13 C17 14.5 18 16.5 18 18.5 C18 18.5 19.5 17.5 20 15.5 C21.5 17 21.5 18.5 21.5 19.5 C21.5 22.5 19 25 16 25Z" fill="#FFD700"/>
    </svg>
  );
}

function StickerMoon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 16 C24 21.5 19.5 26 14 26 C9.5 26 5.8 23 4.5 19 C6 20 8 20.5 10 20 C15 18.8 18.8 14 19.5 9 C20 7 20 5.5 19.5 4 C22.3 6.5 24 11 24 16Z" fill="#A78BFA"/>
      <path d="M22.5 16 C22.5 20.7 19 24.5 14.5 24.5 C11 24.5 8 22.5 6.5 19.5 C7.8 20 9.5 20 11 19.5 C15.5 18 18.8 13.5 19.5 9 C19.8 7.5 19.8 6 19.5 4.5 C21.6 6.8 22.5 11.2 22.5 16Z" fill="#C4B5FD"/>
      {/* Stars */}
      <circle cx="27" cy="8" r="1.5" fill="#FFE44D"/>
      <circle cx="24" cy="4" r="1" fill="#FFE44D"/>
      <circle cx="6" cy="9" r="1" fill="#FFE44D"/>
      <line x1="27" y1="5.5" x2="27" y2="10.5" stroke="#FFE44D" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="24.5" y1="8" x2="29.5" y2="8" stroke="#FFE44D" strokeWidth="0.8" strokeLinecap="round"/>
    </svg>
  );
}

function StickerSun({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1={16 + 9 * Math.cos((angle * Math.PI) / 180)}
          y1={16 + 9 * Math.sin((angle * Math.PI) / 180)}
          x2={16 + 13 * Math.cos((angle * Math.PI) / 180)}
          y2={16 + 13 * Math.sin((angle * Math.PI) / 180)}
          stroke="#FFD700"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
      {/* Sun body */}
      <circle cx="16" cy="16" r="8" fill="#FFD700"/>
      <circle cx="16" cy="16" r="6.5" fill="#FFE44D"/>
      {/* Face */}
      <circle cx="13.5" cy="15" r="1.2" fill="#F4A400"/>
      <circle cx="18.5" cy="15" r="1.2" fill="#F4A400"/>
      <path d="M13 18.5 Q16 21 19 18.5" stroke="#F4A400" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function StickerRainbow({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rainbow arcs */}
      <path d="M4 24 C4 13 12 5 16 5 C20 5 28 13 28 24" stroke="#FF6B6B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M6 24 C6 14 12.5 7 16 7 C19.5 7 26 14 26 24" stroke="#FF9F43" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M8 24 C8 15 13 9 16 9 C19 9 24 15 24 24" stroke="#FFD700" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M10 24 C10 16 13.5 11 16 11 C18.5 11 22 16 22 24" stroke="#6BCB77" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M12 24 C12 17 14 13 16 13 C18 13 20 17 20 24" stroke="#4ECDC4" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M14 24 C14 18 15 15 16 15 C17 15 18 18 18 24" stroke="#A78BFA" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Clouds */}
      <ellipse cx="5.5" cy="24" rx="3.5" ry="3" fill="white"/>
      <ellipse cx="26.5" cy="24" rx="3.5" ry="3" fill="white"/>
      <ellipse cx="4" cy="23" rx="2.5" ry="2.5" fill="white"/>
      <ellipse cx="28" cy="23" rx="2.5" ry="2.5" fill="white"/>
    </svg>
  );
}

function StickerClover({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 4 leaf petals */}
      <circle cx="16" cy="10" r="5.5" fill="#4CAF50"/>
      <circle cx="22" cy="16" r="5.5" fill="#4CAF50"/>
      <circle cx="16" cy="22" r="5.5" fill="#4CAF50"/>
      <circle cx="10" cy="16" r="5.5" fill="#4CAF50"/>
      {/* Inner lighter circles */}
      <circle cx="16" cy="10" r="4" fill="#66BB6A"/>
      <circle cx="22" cy="16" r="4" fill="#66BB6A"/>
      <circle cx="16" cy="22" r="4" fill="#66BB6A"/>
      <circle cx="10" cy="16" r="4" fill="#66BB6A"/>
      {/* Center */}
      <circle cx="16" cy="16" r="4" fill="#388E3C"/>
      {/* Vein lines */}
      <line x1="16" y1="16" x2="16" y2="6" stroke="#2E7D32" strokeWidth="1" opacity="0.5"/>
      <line x1="16" y1="16" x2="26" y2="16" stroke="#2E7D32" strokeWidth="1" opacity="0.5"/>
      <line x1="16" y1="16" x2="16" y2="26" stroke="#2E7D32" strokeWidth="1" opacity="0.5"/>
      <line x1="16" y1="16" x2="6" y2="16" stroke="#2E7D32" strokeWidth="1" opacity="0.5"/>
      {/* Stem */}
      <path d="M16 26 Q16 30 14 31" stroke="#388E3C" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function StickerCake({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cake base */}
      <rect x="5" y="20" width="22" height="9" rx="2" fill="#FF9ED2"/>
      <rect x="5" y="20" width="22" height="9" rx="2" fill="#FFB8E0"/>
      {/* Middle layer */}
      <rect x="7" y="14" width="18" height="7" rx="1.5" fill="#A78BFA"/>
      <rect x="7" y="14" width="18" height="7" rx="1.5" fill="#C4B5FD"/>
      {/* Top layer */}
      <rect x="9" y="9" width="14" height="6" rx="1.5" fill="#FFD700"/>
      <rect x="9" y="9" width="14" height="6" rx="1.5" fill="#FFE44D"/>
      {/* Frosting drips */}
      <path d="M5 22 Q7 19 9 22 Q11 19 13 22 Q15 19 17 22 Q19 19 21 22 Q23 19 25 22 Q27 19 27 22" stroke="white" strokeWidth="2" fill="none"/>
      <path d="M7 16 Q9 13 11 16 Q13 13 15 16 Q17 13 19 16 Q21 13 23 16" stroke="white" strokeWidth="1.5" fill="none"/>
      {/* Candle */}
      <rect x="14.5" y="5" width="3" height="5" rx="1" fill="#FF6B8A"/>
      {/* Flame */}
      <path d="M16 5 C15 3.5 14 3 15 1.5 C15.5 2.5 16.5 2 17 1 C17.5 2.5 17.5 3.5 16 5Z" fill="#FFD700"/>
      <path d="M16 5 C15.2 4 15 3.5 15.5 2 C16 3 16.5 3 17 2 C17.5 3 17 4 16 5Z" fill="#FF9A3C"/>
    </svg>
  );
}

// Sticker registry
interface StickerDef {
  id: string;
  label: string;
  Component: React.FC<{ size?: number }>;
}

const BUILT_IN_STICKERS: StickerDef[] = [
  { id: "cat", label: "고양이", Component: StickerCat },
  { id: "heart", label: "하트", Component: StickerHeart },
  { id: "star", label: "별", Component: StickerStar },
  { id: "flower", label: "꽃", Component: StickerFlower },
  { id: "coffee", label: "커피", Component: StickerCoffee },
  { id: "book", label: "책", Component: StickerBook },
  { id: "fire", label: "불꽃", Component: StickerFire },
  { id: "moon", label: "달", Component: StickerMoon },
  { id: "sun", label: "해", Component: StickerSun },
  { id: "rainbow", label: "무지개", Component: StickerRainbow },
  { id: "clover", label: "클로버", Component: StickerClover },
  { id: "cake", label: "케이크", Component: StickerCake },
];

function StickerDisplay({ stickerId, size = 22 }: { stickerId: string; size?: number }) {
  if (stickerId.startsWith("custom:")) {
    const dataUrl = stickerId.slice(7);
    return <img src={dataUrl} width={size} height={size} style={{ objectFit: "contain", borderRadius: 4 }} />;
  }
  const def = BUILT_IN_STICKERS.find((s) => s.id === stickerId);
  if (!def) return null;
  return <def.Component size={size} />;
}

// ─── Sticker Picker Popover ────────────────────────────────────────────────
function StickerPicker({
  dateStr,
  anchorRect,
  placed,
  customStickers,
  onPlace,
  onRemove,
  onUpload,
  onClose,
}: {
  dateStr: string;
  anchorRect: { top: number; left: number; bottom: number; right: number };
  placed: CalendarSticker[];
  customStickers: string[];
  onPlace: (stickerId: string) => void;
  onRemove: (id: string) => void;
  onUpload: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onUpload(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const pickerWidth = 224;
  let top = anchorRect.bottom + 6;
  let left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - pickerWidth - 8));
  if (top + 340 > window.innerHeight) {
    top = Math.max(8, anchorRect.top - 340);
  }

  // dateStr is displayed directly in the header

  return (
    <div
      ref={pickerRef}
      style={{
        position: "fixed",
        zIndex: 70,
        top,
        left,
        width: pickerWidth,
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
        padding: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
          {dateStr.replace(/-/g, ".")} 스티커
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1, padding: 2,
          }}
        >
          ×
        </button>
      </div>

      {/* Already placed stickers */}
      {placed.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.03em" }}>
            붙어있는 스티커
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {placed.map((s) => (
              <div
                key={s.id}
                style={{
                  position: "relative",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <StickerDisplay stickerId={s.stickerId} size={22} />
                <button
                  onClick={() => onRemove(s.id)}
                  style={{
                    position: "absolute", top: -6, right: -6,
                    width: 16, height: 16, borderRadius: "50%",
                    background: "#ff4757", border: "none", cursor: "pointer",
                    fontSize: 10, color: "white", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontWeight: 700, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Built-in sticker grid */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.03em" }}>
          기본 스티커
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {BUILT_IN_STICKERS.map((s) => (
            <button
              key={s.id}
              title={s.label}
              onClick={() => onPlace(s.id)}
              style={{
                background: "var(--color-bg-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: 6,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.12s",
                height: 44,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-bg-hover)";
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-bg-primary)";
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <s.Component size={26} />
            </button>
          ))}
        </div>
      </div>

      {/* Custom stickers */}
      {customStickers.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.03em" }}>
            내 스티커
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {customStickers.map((dataUrl, i) => (
              <button
                key={i}
                onClick={() => onPlace(`custom:${dataUrl}`)}
                style={{
                  background: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 44,
                  transition: "all 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <img src={dataUrl} width={28} height={28} style={{ objectFit: "contain", borderRadius: 4 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1.5px dashed var(--color-border)",
          background: "transparent",
          cursor: "pointer",
          fontSize: 11,
          color: "var(--color-text-secondary)",
          fontFamily: "Pretendard, sans-serif",
          transition: "all 0.12s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.color = "var(--color-accent)";
          e.currentTarget.style.background = "var(--color-accent)/5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.color = "var(--color-text-secondary)";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <span style={{ fontSize: 14 }}>＋</span> 사진 업로드
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}

// ─── Existing helpers ──────────────────────────────────────────────────────
const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "#9090a8",
  in_progress: "#74b9ff",
  done: "#00b894",
};

const STATUS_BG: Record<TaskStatus, string> = {
  todo: "rgba(144,144,168,0.15)",
  in_progress: "rgba(116,185,255,0.15)",
  done: "rgba(0,184,148,0.15)",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "할 일",
  in_progress: "진행 중",
  done: "완료",
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarMode = "monthly" | "weekly";

const WEEK_DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function taskFallsOnDate(task: Task, dateStr: string): boolean {
  if (task.startDate && task.dueDate) {
    return dateStr >= task.startDate && dateStr <= task.dueDate;
  }
  if (task.dueDate) return task.dueDate === dateStr;
  if (task.startDate) return task.startDate === dateStr;
  return false;
}

// ─── Main CalendarView ─────────────────────────────────────────────────────
export default function CalendarView() {
  const { tasks, selectedProjectId } = useProjectVM();
  const [viewDate, setViewDate] = useState(new Date());
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("monthly");

  // Sticker state
  const [stickers, setStickers] = useState<CalendarSticker[]>(loadStickers);
  const [customStickers, setCustomStickers] = useState<string[]>(loadCustomStickers);
  const [stickerPicker, setStickerPicker] = useState<{
    dateStr: string;
    anchorRect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);

  const handlePlaceSticker = useCallback((stickerId: string) => {
    if (!stickerPicker) return;
    const newSticker: CalendarSticker = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      dateStr: stickerPicker.dateStr,
      stickerId,
    };
    const updated = [...stickers, newSticker];
    setStickers(updated);
    saveStickers(updated);
  }, [stickerPicker, stickers]);

  const handleRemoveSticker = useCallback((id: string) => {
    const updated = stickers.filter((s) => s.id !== id);
    setStickers(updated);
    saveStickers(updated);
  }, [stickers]);

  const handleUploadCustomSticker = useCallback((dataUrl: string) => {
    const updated = [...customStickers, dataUrl];
    setCustomStickers(updated);
    saveCustomStickers(updated);
    // Immediately place the uploaded sticker
    if (stickerPicker) {
      const newSticker: CalendarSticker = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dateStr: stickerPicker.dateStr,
        stickerId: `custom:${dataUrl}`,
      };
      const updatedStickers = [...stickers, newSticker];
      setStickers(updatedStickers);
      saveStickers(updatedStickers);
    }
  }, [customStickers, stickerPicker, stickers]);

  const handleCellStickerClick = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setStickerPicker({
      dateStr,
      anchorRect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
    });
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const todayStr = toDateStr(today);
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const filteredTasks = selectedProjectId
    ? tasks.filter((t) => t.projectId === selectedProjectId)
    : tasks;

  const tasksByDate = new Map<number, typeof filteredTasks>();
  for (const task of filteredTasks) {
    if (!task.dueDate) continue;
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDate.has(day)) tasksByDate.set(day, []);
      tasksByDate.get(day)!.push(task);
    }
  }

  const weekMonday = getMonday(viewDate);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    weekDays.push(d);
  }

  const tasksByWeekDate = new Map<string, Task[]>();
  for (const day of weekDays) {
    const ds = toDateStr(day);
    const dayTasks = filteredTasks.filter((t) => taskFallsOnDate(t, ds));
    if (dayTasks.length > 0) tasksByWeekDate.set(ds, dayTasks);
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const prevWeek = () => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); };
  const nextWeek = () => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); };
  const goToday = () => setViewDate(new Date());

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setDetailTaskId(task.id);
  };

  const weekStartStr = `${weekDays[0].getMonth() + 1}.${weekDays[0].getDate()}`;
  const weekEndStr = `${weekDays[6].getMonth() + 1}.${weekDays[6].getDate()}`;

  const modeToggleStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 6,
    cursor: "pointer",
    border: "none",
    fontWeight: active ? 600 : 400,
    background: active ? "var(--color-accent)" : "transparent",
    color: active ? "#fff" : "var(--color-text-secondary)",
    fontFamily: "Pretendard, sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div style={{ padding: "16px 20px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }} className="text-text-primary">
          {calendarMode === "monthly"
            ? `${year}. ${month + 1}`
            : `${year}. ${weekStartStr} ~ ${weekEndStr}`}
        </h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={calendarMode === "monthly" ? prevMonth : prevWeek}
            style={{ fontSize: 14, padding: "4px 10px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            ◀
          </button>
          <button
            onClick={goToday}
            style={{ fontSize: 13, padding: "4px 12px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            오늘
          </button>
          <button
            onClick={calendarMode === "monthly" ? nextMonth : nextWeek}
            style={{ fontSize: 14, padding: "4px 10px", borderRadius: 6 }}
            className="text-text-secondary hover:bg-bg-hover cursor-pointer"
          >
            ▶
          </button>
        </div>

        <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 8, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
          <button onClick={() => setCalendarMode("monthly")} style={modeToggleStyle(calendarMode === "monthly")}>월간</button>
          <button onClick={() => setCalendarMode("weekly")} style={modeToggleStyle(calendarMode === "weekly")}>주간</button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginLeft: "auto", fontSize: 12 }}>
          <span className="flex items-center gap-1.5 text-text-secondary">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR.todo, display: "inline-block" }} />
            할 일
          </span>
          <span className="flex items-center gap-1.5 text-pixel-blue">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR.in_progress, display: "inline-block" }} />
            진행 중
          </span>
          <span className="flex items-center gap-1.5 text-success">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR.done, display: "inline-block" }} />
            완료
          </span>
        </div>
      </div>

      {calendarMode === "monthly" ? (
        <>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "2px solid var(--color-border)", marginBottom: 2 }}>
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                style={{ fontSize: 11, fontWeight: 700, padding: "6px 8px", textAlign: "center", letterSpacing: "0.05em" }}
                className={i === 0 ? "text-danger" : i === 6 ? "text-pixel-blue" : "text-text-secondary"}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              flex: 1,
              gridAutoRows: "1fr",
            }}
          >
            {cells.map((day, i) => {
              const dayTasks = day ? tasksByDate.get(day) || [] : [];
              const colIdx = i % 7;
              const dayDateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const dayStickers = dayDateStr ? stickers.filter((s) => s.dateStr === dayDateStr) : [];
              const showStickers = dayStickers.slice(0, 3);
              const extraStickers = dayStickers.length - 3;

              return (
                <div
                  key={i}
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    borderRight: colIdx < 6 ? "1px solid var(--color-border)" : "none",
                    padding: "5px 6px 4px",
                    minHeight: 0,
                    overflow: "hidden",
                    position: "relative",
                    transition: "background 0.1s",
                    cursor: day ? "default" : "default",
                  }}
                  className={isToday(day ?? 0) ? "bg-accent/5" : ""}
                  onMouseEnter={(e) => {
                    if (day) e.currentTarget.style.background = "var(--color-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "";
                  }}
                >
                  {day && (
                    <>
                      {/* Date number row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: isToday(day) ? 700 : 400,
                            width: isToday(day) ? 22 : "auto",
                            height: isToday(day) ? 22 : "auto",
                            borderRadius: isToday(day) ? "50%" : 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isToday(day) ? "var(--color-accent)" : "transparent",
                            color: isToday(day) ? "white" : colIdx === 0 ? "var(--color-danger)" : colIdx === 6 ? "var(--color-pixel-blue)" : "var(--color-text-primary)",
                            flexShrink: 0,
                          }}
                        >
                          {day}
                        </div>

                        {/* Sticker strip + add button */}
                        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {showStickers.map((s) => (
                            <span key={s.id} style={{ lineHeight: 1, display: "inline-flex" }}>
                              <StickerDisplay stickerId={s.stickerId} size={18} />
                            </span>
                          ))}
                          {extraStickers > 0 && (
                            <span style={{ fontSize: 9, color: "var(--color-text-secondary)", fontWeight: 600, marginLeft: 1 }}>
                              +{extraStickers}
                            </span>
                          )}
                          {/* Sticker add button */}
                          <button
                            onClick={(e) => handleCellStickerClick(e, dayDateStr)}
                            title="스티커 추가"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              border: "1px dashed var(--color-border)",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: 10,
                              color: "var(--color-text-secondary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginLeft: 2,
                              opacity: 0,
                              transition: "opacity 0.12s",
                              flexShrink: 0,
                            }}
                            className="sticker-add-btn"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "1";
                              e.currentTarget.style.borderColor = "var(--color-accent)";
                              e.currentTarget.style.color = "var(--color-accent)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "0";
                              e.currentTarget.style.borderColor = "var(--color-border)";
                              e.currentTarget.style.color = "var(--color-text-secondary)";
                            }}
                          >
                            ＋
                          </button>
                        </div>
                      </div>

                      {/* Task list */}
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(e, task)}
                          style={{
                            fontSize: 10,
                            padding: "2px 5px",
                            borderRadius: 4,
                            marginBottom: 2,
                            borderLeft: `2px solid ${STATUS_COLOR[task.status]}`,
                            background: STATUS_BG[task.status],
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                            transition: "opacity 0.15s",
                          }}
                          className="text-text-primary hover:!opacity-80"
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div style={{ fontSize: 9, paddingLeft: 5, color: "var(--color-text-secondary)", opacity: 0.7 }}>
                          +{dayTasks.length - 3}개
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── Weekly View ── */
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const isTodayCol = ds === todayStr;
              const isSunday = i === 6;
              const isSaturday = i === 5;
              return (
                <div
                  key={i}
                  style={{
                    textAlign: "center",
                    padding: "8px 4px",
                    borderBottom: "2px solid",
                    borderBottomColor: isTodayCol ? "var(--color-accent)" : "var(--color-border)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSunday ? "var(--color-danger)" : isSaturday ? "var(--color-pixel-blue)" : "var(--color-text-secondary)", marginBottom: 2 }}>
                    {WEEK_DAY_LABELS[i]}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: isTodayCol ? 700 : 400, width: isTodayCol ? 32 : "auto", height: isTodayCol ? 32 : "auto", borderRadius: isTodayCol ? "50%" : 0, display: isTodayCol ? "inline-flex" : "block", alignItems: "center", justifyContent: "center", background: isTodayCol ? "var(--color-accent)" : "transparent", color: isTodayCol ? "#fff" : "var(--color-text-primary)" }}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1, overflow: "hidden" }}>
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const dayTasks = tasksByWeekDate.get(ds) || [];
              const isTodayCol = ds === todayStr;
              const dayStickers = stickers.filter((s) => s.dateStr === ds);
              return (
                <div
                  key={i}
                  style={{
                    borderRight: i < 6 ? "1px solid var(--color-border)" : "none",
                    padding: "8px 6px",
                    overflow: "auto",
                    background: isTodayCol ? "rgba(108,92,231,0.04)" : "transparent",
                  }}
                >
                  {/* Weekly stickers row */}
                  {dayStickers.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginBottom: 6 }}>
                      {dayStickers.map((s) => (
                        <span key={s.id} style={{ lineHeight: 1 }}>
                          <StickerDisplay stickerId={s.stickerId} size={20} />
                        </span>
                      ))}
                    </div>
                  )}
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => handleTaskClick(e, task)}
                      style={{
                        fontSize: 12,
                        padding: "6px 8px",
                        borderRadius: 6,
                        marginBottom: 4,
                        borderLeft: `3px solid ${STATUS_COLOR[task.status]}`,
                        background: STATUS_BG[task.status],
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                      className="text-text-primary hover:!opacity-80"
                      title={task.title}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 10, color: STATUS_COLOR[task.status], fontWeight: 500 }}>
                        {STATUS_LABEL[task.status]}
                      </div>
                    </div>
                  ))}
                  {dayTasks.length === 0 && dayStickers.length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", opacity: 0.5, textAlign: "center", paddingTop: 12 }}>
                      -
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Sticker Picker Popover */}
      {stickerPicker && (
        <StickerPicker
          dateStr={stickerPicker.dateStr}
          anchorRect={stickerPicker.anchorRect}
          placed={stickers.filter((s) => s.dateStr === stickerPicker.dateStr)}
          customStickers={customStickers}
          onPlace={handlePlaceSticker}
          onRemove={handleRemoveSticker}
          onUpload={handleUploadCustomSticker}
          onClose={() => setStickerPicker(null)}
        />
      )}

      {/* Task detail modal */}
      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
    </div>
  );
}
