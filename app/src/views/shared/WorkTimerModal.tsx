import { useState, useEffect, useRef, useCallback } from "react";

// ── Dot-art Bongo Cat frames (16x16 pixel art) ──
// Idle: cat sitting at desk, paws down
const CAT_IDLE = [
  "................",
  "....##....##....",
  "...#..#..#..#...",
  "..#....##....#..",
  "..#..@@..@@..#..",
  "..#....##....#..",
  "...#..wvw..#....",
  "....########....",
  "....#......#....",
  "...#..####..#...",
  "...#..#..#..#...",
  "..#...#..#...#..",
  "..#..##..##..#..",
  "..####....####..",
  "................",
  "................",
];

// Working frame 1: left paw up
const CAT_WORK1 = [
  "................",
  "....##....##....",
  "...#..#..#..#...",
  "..#....##....#..",
  "..#..@@..@@..#..",
  "..#....##....#..",
  "...#..wvw..#....",
  "....########....",
  "....#......#....",
  "...#........#...",
  "..#..#..####.#..",
  "..#.#...#..#.#..",
  "..##....#..#.#..",
  "..#.....####.#..",
  "..#..........#..",
  "..############..",
];

// Working frame 2: right paw up
const CAT_WORK2 = [
  "................",
  "....##....##....",
  "...#..#..#..#...",
  "..#....##....#..",
  "..#..@@..@@..#..",
  "..#....##....#..",
  "...#..wvw..#....",
  "....########....",
  "....#......#....",
  "...#........#...",
  "..#.####..#..#..",
  "..#.#..#...#.#..",
  "..#.#..#....##..",
  "..#.####.....#..",
  "..#..........#..",
  "..############..",
];

const PIXEL = 6;
const GRID = 16;

const COLOR_MAP: Record<string, string> = {
  "#": "var(--color-text-primary)",
  "@": "var(--color-accent)",
  w: "#ffffff",
  v: "#ff9eaf",
};

function drawCat(
  ctx: CanvasRenderingContext2D,
  frame: string[],
  offsetX: number,
  offsetY: number,
  px: number,
) {
  for (let y = 0; y < frame.length; y++) {
    for (let x = 0; x < frame[y].length; x++) {
      const ch = frame[y][x];
      const color = COLOR_MAP[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x * px, offsetY + y * px, px, px);
      }
    }
  }
}

interface WorkTimerModalProps {
  taskId: string;
  taskTitle: string;
  projectName?: string;
  onClose: () => void;
  onStatusChange?: (status: "in_progress" | "done") => void;
}

export default function WorkTimerModal({
  taskTitle,
  onClose,
  onStatusChange,
}: WorkTimerModalProps) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [catFrame, setCatFrame] = useState(0); // 0=idle, 1=work1, 2=work2
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const animRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Format time
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const timeStr = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // Timer logic
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Cat animation
  useEffect(() => {
    if (running) {
      animRef.current = setInterval(() => {
        setCatFrame((f) => (f === 1 ? 2 : 1));
      }, 400);
    } else {
      clearInterval(animRef.current);
      setCatFrame(0);
    }
    return () => clearInterval(animRef.current);
  }, [running]);

  // Draw cat
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const frames = [CAT_IDLE, CAT_WORK1, CAT_WORK2];
    const frame = frames[catFrame] ?? CAT_IDLE;

    const catW = GRID * PIXEL;
    const catH = frame.length * PIXEL;
    const ox = (w - catW) / 2;
    const oy = (h - catH) / 2;

    drawCat(ctx, frame, ox, oy, PIXEL);

    // Desk
    ctx.fillStyle = "var(--color-border)";
    ctx.fillRect(ox - 12, oy + catH - PIXEL * 2, catW + 24, PIXEL);
  }, [catFrame]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleStart = () => {
    setRunning(true);
    onStatusChange?.("in_progress");
  };

  const handlePause = () => {
    setRunning(false);
  };

  const handleStop = () => {
    setRunning(false);
    onStatusChange?.("done");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: 320, padding: 24, borderRadius: 16,
          background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        }}
      >
        {/* Task title */}
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
          {taskTitle}
        </div>

        {/* Cat canvas */}
        <canvas
          ref={canvasRef}
          width={GRID * PIXEL + 40}
          height={GRID * PIXEL + 20}
          style={{ imageRendering: "pixelated" }}
        />

        {/* Timer display */}
        <div style={{
          fontSize: 40, fontWeight: 700, fontVariantNumeric: "tabular-nums",
          color: running ? "var(--color-accent)" : "var(--color-text-primary)",
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          transition: "color 0.2s",
          letterSpacing: 2,
        }}>
          {timeStr}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!running ? (
            <button
              onClick={handleStart}
              style={{
                width: 48, height: 48, borderRadius: "50%", border: "none",
                background: "var(--color-accent)", color: "#fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              className="hover:opacity-90"
            >
              {/* Play icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handlePause}
              style={{
                width: 48, height: 48, borderRadius: "50%", border: "none",
                background: "var(--color-warning, #ffeaa7)", color: "#2d3436",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              className="hover:opacity-90"
            >
              {/* Pause icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          )}

          {/* Stop / Done */}
          {seconds > 0 && (
            <button
              onClick={handleStop}
              style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                color: "var(--color-text-secondary)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              className="hover:border-accent/50"
            >
              {/* Stop / check icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
          )}
        </div>

        {/* Reset */}
        {seconds > 0 && !running && (
          <button
            onClick={() => setSeconds(0)}
            style={{
              fontSize: 12, color: "var(--color-text-secondary)", background: "none",
              border: "none", cursor: "pointer", opacity: 0.6,
            }}
            className="hover:opacity-100"
          >
            초기화
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            fontSize: 12, color: "var(--color-text-secondary)", background: "none",
            border: "none", cursor: "pointer", opacity: 0.5,
            marginTop: 4,
          }}
          className="hover:opacity-100"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
