import { useEffect, useState } from "react";
import { useDotArtVM, type DotArtCategory, type DotArt } from "../../viewmodels/dotart.vm";

const CATEGORIES: (DotArtCategory | "전체")[] = ["전체", "가구", "데코", "캐릭터", "배경", "내 작품"];

function DotArtPreview({ art, size = 64 }: { art: DotArt; size?: number }) {
  const cellSize = size / art.gridSize;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: `repeat(${art.gridSize}, 1fr)`,
        imageRendering: "pixelated" as const,
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid var(--color-border)",
        background: "#1a1a24",
        flexShrink: 0,
      }}
    >
      {art.pixels.flat().map((color, i) => (
        <div
          key={i}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: color || "transparent",
          }}
        />
      ))}
    </div>
  );
}

interface DotArtStoreProps {
  onApply?: (art: DotArt) => void;
}

export default function DotArtStore({ onApply }: DotArtStoreProps) {
  const { dotArts, loading, loadAll, removeDotArt } = useDotArtVM();
  const [activeTab, setActiveTab] = useState<DotArtCategory | "전체">("전체");

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered =
    activeTab === "전체"
      ? dotArts
      : dotArts.filter((a) => a.category === activeTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              fontSize: 13,
              padding: "6px 14px",
              borderRadius: 8,
              fontWeight: activeTab === cat ? 600 : 400,
              cursor: "pointer",
              border: "none",
              transition: "all 0.15s",
              background:
                activeTab === cat
                  ? "var(--color-text-primary)"
                  : "var(--color-bg-secondary)",
              color:
                activeTab === cat
                  ? "var(--color-bg-primary)"
                  : "var(--color-text-secondary)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: 14,
          }}
        >
          로딩 중...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: 14,
          }}
        >
          도트아트가 없습니다.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((art) => (
            <DotArtCard
              key={art.id}
              art={art}
              onApply={onApply}
              onRemove={!art.isPreset ? () => removeDotArt(art.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DotArtCard({
  art,
  onApply,
  onRemove,
}: {
  art: DotArt;
  onApply?: (art: DotArt) => void;
  onRemove?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        background: hover ? "var(--color-bg-hover)" : "var(--color-bg-secondary)",
        transition: "background 0.15s",
        position: "relative",
      }}
    >
      <DotArtPreview art={art} size={80} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text-primary)",
          textAlign: "center",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {art.name}
      </span>
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-secondary)",
        }}
      >
        {art.gridSize}×{art.gridSize} · {art.isPreset ? "프리셋" : art.category}
      </span>

      {/* Hover actions */}
      {hover && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "flex",
            gap: 4,
          }}
        >
          {onApply && (
            <button
              onClick={() => onApply(art)}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                border: "none",
                background: "var(--color-accent)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              적용
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--color-danger)",
                background: "transparent",
                color: "var(--color-danger)",
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
