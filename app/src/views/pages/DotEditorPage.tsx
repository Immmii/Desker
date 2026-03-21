import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  IconPencil, IconEraser, IconFill, IconEyedropper,
  IconExport, IconImport, IconTrash, IconPlus, IconGrid,
} from "../shared/EditorIcons";
import { useDotArtVM, type DotArtCategory } from "../../viewmodels/dotart.vm";
import DotArtStore from "../shared/DotArtStore";

type Tool = "pencil" | "eraser" | "fill" | "eyedropper";
type PageTab = "editor" | "store";

const DEFAULT_PALETTE = [
  "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
  "#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#8800ff",
  "#6c5ce7", "#00b894", "#fdcb6e", "#e17055", "#74b9ff",
  "#fd79a8", "#55efc4", "#ffeaa7", "#2d3436", "#636e72",
];

const GRID_SIZES = [8, 16, 32, 64];
const CATEGORIES: DotArtCategory[] = ["가구", "데코", "캐릭터", "배경", "내 작품"];

const TOOLS: { id: Tool; icon: React.FC<{ size?: number; className?: string }>; label: string }[] = [
  { id: "pencil", icon: IconPencil, label: "연필" },
  { id: "eraser", icon: IconEraser, label: "지우개" },
  { id: "fill", icon: IconFill, label: "채우기" },
  { id: "eyedropper", icon: IconEyedropper, label: "스포이드" },
];

export default function DotEditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gridSize, setGridSize] = useState(16);
  const [currentColor, setCurrentColor] = useState("#6c5ce7");
  const [tool, setTool] = useState<Tool>("pencil");
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#ff0000");
  const [pixels, setPixels] = useState<(string | null)[][]>(() =>
    Array.from({ length: 16 }, () => Array(16).fill(null))
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [pageTab, setPageTab] = useState<PageTab>("editor");

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveCategory, setSaveCategory] = useState<DotArtCategory>("내 작품");

  const canvasSize = 480;
  const cellSize = canvasSize / gridSize;

  const changeGridSize = (size: number) => {
    setGridSize(size);
    setPixels(Array.from({ length: size }, () => Array(size).fill(null)));
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#1a1a24";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (pixels[y]?.[x]) {
          ctx.fillStyle = pixels[y][x]!;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else {
          const isLight = (x + y) % 2 === 0;
          ctx.fillStyle = isLight ? "#242434" : "#1e1e2e";
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvasSize, i * cellSize);
      ctx.stroke();
    }
  }, [pixels, gridSize, cellSize]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const getCellPos = (e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * gridSize);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * gridSize);
    return [Math.max(0, Math.min(gridSize - 1, x)), Math.max(0, Math.min(gridSize - 1, y))];
  };

  const applyTool = (x: number, y: number) => {
    setPixels((prev) => {
      const next = prev.map((row) => [...row]);
      if (tool === "pencil") {
        next[y][x] = currentColor;
      } else if (tool === "eraser") {
        next[y][x] = null;
      } else if (tool === "eyedropper") {
        if (prev[y][x]) setCurrentColor(prev[y][x]!);
      } else if (tool === "fill") {
        const target = prev[y][x];
        if (target === currentColor) return prev;
        const flood = (fy: number, fx: number) => {
          if (fy < 0 || fy >= gridSize || fx < 0 || fx >= gridSize) return;
          if (next[fy][fx] !== target) return;
          next[fy][fx] = currentColor;
          flood(fy - 1, fx);
          flood(fy + 1, fx);
          flood(fy, fx - 1);
          flood(fy, fx + 1);
        };
        flood(y, x);
      }
      return next;
    });
  };

  const handleExportPNG = () => {
    const scale = gridSize <= 16 ? 16 : 8; // each pixel = 16px for small grids, 8px for larger
    const outputSize = gridSize * scale;
    const c = document.createElement("canvas");
    c.width = outputSize;
    c.height = outputSize;
    const ctx = c.getContext("2d")!;
    // Fill background transparent
    ctx.clearRect(0, 0, outputSize, outputSize);
    for (let y = 0; y < gridSize; y++)
      for (let x = 0; x < gridSize; x++)
        if (pixels[y][x]) {
          ctx.fillStyle = pixels[y][x]!;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dot-art-${gridSize}x${gridSize}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const handleExportJSON = () => {
    const name = `dot-art-${gridSize}x${gridSize}`;
    const data = JSON.stringify({ name, gridSize, pixels }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setPixels(Array.from({ length: gridSize }, () => Array(gridSize).fill(null)));
  };

  const handleImportJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (
          typeof data.gridSize === "number" &&
          Array.isArray(data.pixels) &&
          data.pixels.length === data.gridSize &&
          data.pixels.every((row: unknown) => Array.isArray(row) && (row as unknown[]).length === data.gridSize)
        ) {
          setGridSize(data.gridSize);
          setPixels(data.pixels);
        } else {
          alert("유효하지 않은 JSON 구조입니다. { name, gridSize, pixels } 형식이어야 합니다.");
        }
      } catch { alert("유효하지 않은 JSON 파일입니다."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportPNG = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const targetSize = GRID_SIZES.reduce((prev, cur) =>
          Math.abs(cur - size) < Math.abs(prev - size) ? cur : prev
        );
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = targetSize; tmpCanvas.height = targetSize;
        const ctx = tmpCanvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const newPixels: (string | null)[][] = [];
        for (let y = 0; y < targetSize; y++) {
          const row: (string | null)[] = [];
          for (let x = 0; x < targetSize; x++) {
            const i = (y * targetSize + x) * 4;
            const [r, g, b, a] = [imageData.data[i], imageData.data[i+1], imageData.data[i+2], imageData.data[i+3]];
            row.push(a < 10 ? null : `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`);
          }
          newPixels.push(row);
        }
        setGridSize(targetSize); setPixels(newPixels);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addCustomColor = () => {
    if (!palette.includes(customColor)) {
      setPalette((p) => [...p, customColor]);
    }
    setCurrentColor(customColor);
    setTool("pencil");
    setShowColorPicker(false);
  };

  const addDotArt = useDotArtVM((s) => s.addDotArt);
  const [appliedToast, setAppliedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 2000);
  };

  const handleSaveToStore = () => {
    setSaveName(`dot-art-${gridSize}x${gridSize}`);
    setSaveCategory("내 작품");
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!saveName.trim()) return;
    await addDotArt(saveName.trim(), gridSize, pixels, saveCategory);
    setShowSaveModal(false);
    showToast("도트 스토어에 저장되었습니다!");
  };

  const handleApplyFromStore = (art: { gridSize: number; pixels: (string | null)[][] }) => {
    setGridSize(art.gridSize);
    setPixels(art.pixels);
    setPageTab("editor");
    showToast("에디터에 불러왔습니다!");
  };

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pngInputRef = useRef<HTMLInputElement>(null);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 6, fontSize: 13, cursor: "pointer",
    border: active ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
    background: active ? "rgba(108,92,231,0.15)" : "var(--color-bg-secondary)",
    color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
    fontFamily: "Pretendard, sans-serif", fontWeight: active ? 600 : 400,
    display: "flex", alignItems: "center", gap: 4,
  });

  const smallBtnStyle: React.CSSProperties = {
    padding: "5px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
    border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)",
    color: "var(--color-text-secondary)", fontFamily: "Pretendard, sans-serif",
    display: "flex", alignItems: "center", gap: 4,
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 14, padding: "8px 18px", borderRadius: 8, fontWeight: active ? 600 : 400,
    cursor: "pointer", border: "none", transition: "all 0.15s",
    background: active ? "var(--color-text-primary)" : "transparent",
    color: active ? "var(--color-bg-primary)" : "var(--color-text-secondary)",
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Page Tabs ── */}
      <div
        style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}
      >
        <button onClick={() => setPageTab("editor")} style={tabBtnStyle(pageTab === "editor")}>
          에디터
        </button>
        <button onClick={() => setPageTab("store")} style={tabBtnStyle(pageTab === "store")}>
          스토어
        </button>
      </div>

      {pageTab === "store" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <DotArtStore onApply={handleApplyFromStore} />
        </div>
      ) : (
        <>
          {/* ── Top Toolbar ── */}
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            {/* Tools */}
            <div style={{ display: "flex", gap: 4 }}>
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTool(t.id)} style={btnStyle(tool === t.id)}>
                    <Icon size={16} /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: "var(--color-border)" }} />

            {/* Grid size */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <IconGrid size={14} /> 캔버스
              </span>
              {GRID_SIZES.map((size) => (
                <button key={size} onClick={() => changeGridSize(size)} style={btnStyle(gridSize === size)}>
                  {size}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: "var(--color-border)" }} />

            {/* Palette */}
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: currentColor, border: "2px solid #fff",
                  boxShadow: "0 0 0 1px var(--color-border)",
                  flexShrink: 0,
                }}
              />
              {palette.map((color) => (
                <button
                  key={color}
                  onClick={() => { setCurrentColor(color); setTool("pencil"); }}
                  style={{
                    width: 22, height: 22, borderRadius: 4, background: color, cursor: "pointer",
                    border: currentColor === color ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)",
                    flexShrink: 0,
                  }}
                />
              ))}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowColorPicker((p) => !p)}
                  style={{
                    width: 22, height: 22, borderRadius: 4, cursor: "pointer",
                    border: "1px dashed var(--color-border)", background: "transparent",
                    color: "var(--color-text-secondary)", fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <IconPlus size={14} />
                </button>
                {showColorPicker && (
                  <div
                    style={{
                      position: "absolute", top: 30, left: 0, zIndex: 50,
                      padding: 12, borderRadius: 10,
                      background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      display: "flex", flexDirection: "column", gap: 8, width: 200,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="color" value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        style={{ width: 36, height: 36, border: "none", cursor: "pointer", borderRadius: 4 }}
                      />
                      <input
                        type="text" value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        style={{
                          flex: 1, padding: "6px 10px", borderRadius: 6, fontSize: 13, outline: "none",
                          border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                          color: "var(--color-text-primary)", fontFamily: "monospace",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => setShowColorPicker(false)} style={smallBtnStyle}>취소</button>
                      <button
                        onClick={addCustomColor}
                        style={{ ...smallBtnStyle, background: "var(--color-accent)", color: "#fff", border: "none", fontWeight: 600 }}
                      >
                        추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: "var(--color-border)" }} />

            {/* Actions */}
            <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
              <input ref={pngInputRef} type="file" accept=".png" onChange={handleImportPNG} style={{ display: "none" }} />
              <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportJSON} style={{ display: "none" }} />
              <button onClick={handleExportPNG} style={smallBtnStyle}><IconExport size={14} /> PNG</button>
              <button onClick={handleExportJSON} style={smallBtnStyle}><IconExport size={14} /> JSON</button>
              <button onClick={() => pngInputRef.current?.click()} style={smallBtnStyle}><IconImport size={14} /> PNG</button>
              <button onClick={() => jsonInputRef.current?.click()} style={smallBtnStyle}><IconImport size={14} /> JSON</button>
              <button onClick={handleClear} style={{ ...smallBtnStyle, color: "var(--color-danger)", borderColor: "var(--color-danger)" }}><IconTrash size={14} /></button>

              <div style={{ width: 1, height: 24, background: "var(--color-border)" }} />

              <button
                onClick={handleSaveToStore}
                style={{ ...smallBtnStyle, background: "var(--color-accent)", color: "#fff", border: "none", fontWeight: 600 }}
              >
                스토어에 저장
              </button>
            </div>
          </div>

          {/* Toast */}
          {appliedToast && (
            <div
              style={{
                position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: "var(--color-bg-secondary)", color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                fontFamily: "Pretendard, sans-serif", zIndex: 100,
              }}
            >
              {toastMessage}
            </div>
          )}

          {/* Save Modal */}
          {showSaveModal && (
            <div
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onClick={() => setShowSaveModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 380, padding: 28, borderRadius: 16,
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                  display: "flex", flexDirection: "column", gap: 18,
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                  도트 스토어에 저장
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>이름</label>
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, fontSize: 14, outline: "none",
                      border: "1px solid var(--color-border)", background: "var(--color-bg-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>카테고리</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSaveCategory(cat)}
                        style={{
                          fontSize: 13, padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                          border: saveCategory === cat ? "1px solid var(--color-accent)" : "1px solid var(--color-border)",
                          background: saveCategory === cat ? "rgba(108,92,231,0.15)" : "var(--color-bg-primary)",
                          color: saveCategory === cat ? "var(--color-accent)" : "var(--color-text-secondary)",
                          fontWeight: saveCategory === cat ? 600 : 400,
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      width: 80, height: 80, borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      overflow: "hidden", imageRendering: "pixelated" as const,
                      background: "#1a1a24",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                        width: "100%", height: "100%",
                      }}
                    >
                      {pixels.flat().map((color, i) => (
                        <div key={i} style={{ backgroundColor: color || "transparent" }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    style={smallBtnStyle}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    style={{
                      ...smallBtnStyle,
                      background: "var(--color-accent)", color: "#fff",
                      border: "none", fontWeight: 600, padding: "8px 20px",
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Canvas Area ── */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ position: "relative" }}>
              <canvas
                ref={canvasRef}
                width={canvasSize}
                height={canvasSize}
                style={{ width: canvasSize, height: canvasSize, borderRadius: 8, border: "1px solid var(--color-border)", cursor: "crosshair", imageRendering: "pixelated" }}
                onMouseDown={(e) => { setIsDrawing(true); const [x, y] = getCellPos(e); applyTool(x, y); }}
                onMouseMove={(e) => { if (!isDrawing) return; const [x, y] = getCellPos(e); applyTool(x, y); }}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
              />

              {/* Mini preview */}
              <div
                style={{
                  position: "absolute", bottom: -50, left: "50%", transform: "translateX(-50%)",
                  display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 6, border: "1px solid var(--color-border)",
                    overflow: "hidden", imageRendering: "pixelated" as const,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                      width: "100%", height: "100%",
                    }}
                  >
                    {pixels.flat().map((color, i) => (
                      <div key={i} style={{ backgroundColor: color || "transparent" }} />
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {gridSize}×{gridSize}px
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
