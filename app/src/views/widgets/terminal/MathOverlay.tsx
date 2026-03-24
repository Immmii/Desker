import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export interface MathBlock {
  id: number;
  raw: string;
  latex: string;
  displayMode: boolean;
  timestamp: number;
}

// ── Detect math patterns in terminal output ──
const LATEX_COMMANDS =
  /\\(?:frac|sum|int|prod|sqrt|rightarrow|leftarrow|Rightarrow|Leftarrow|times|div|cdot|leq|geq|neq|approx|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|phi|psi|begin|end|text|mathrm|mathbf|binom|lim|log|ln|sin|cos|tan|hat|bar|vec|dot|ddot|overline|underline)/;

const DISPLAY_MATH_RE = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH_RE = /\$([^\s$][^$]*?[^\s$])\$/g;

/**
 * Extract math expressions from a chunk of terminal text.
 * Returns MathBlock[] if any found.
 */
export function extractMath(text: string, idCounter: { current: number }): MathBlock[] {
  const blocks: MathBlock[] = [];
  const now = Date.now();

  // Strip ANSI escape codes for detection
  const clean = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

  // Display math $$...$$
  for (const m of clean.matchAll(DISPLAY_MATH_RE)) {
    blocks.push({
      id: idCounter.current++,
      raw: m[0],
      latex: m[1].trim(),
      displayMode: true,
      timestamp: now,
    });
  }

  // Inline math $...$  (only if contains LaTeX commands to avoid shell $ false positives)
  for (const m of clean.matchAll(INLINE_MATH_RE)) {
    if (LATEX_COMMANDS.test(m[1])) {
      blocks.push({
        id: idCounter.current++,
        raw: m[0],
        latex: m[1].trim(),
        displayMode: false,
        timestamp: now,
      });
    }
  }

  // Lines with LaTeX commands but no $ delimiters — treat whole line as math
  if (blocks.length === 0) {
    const lines = clean.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && LATEX_COMMANDS.test(trimmed)) {
        // Check it has enough math-like content (at least 2 LaTeX tokens or arrow pattern)
        const matchCount = (trimmed.match(/\\/g) || []).length;
        if (matchCount >= 1) {
          blocks.push({
            id: idCounter.current++,
            raw: trimmed,
            latex: trimmed,
            displayMode: false,
            timestamp: now,
          });
        }
      }
    }
  }

  return blocks;
}

// ── KaTeX rendered block ──
function KaTeXBlock({ block }: { block: MathBlock }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(block.latex, ref.current, {
        displayMode: block.displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch {
      ref.current.textContent = block.raw;
    }
  }, [block.latex, block.displayMode, block.raw]);

  return (
    <div
      ref={ref}
      style={{
        padding: block.displayMode ? "8px 12px" : "4px 10px",
        fontSize: block.displayMode ? 18 : 15,
        lineHeight: 1.6,
      }}
    />
  );
}

// ── Overlay component ──
export default function MathOverlay({
  blocks,
  onDismiss,
}: {
  blocks: MathBlock[];
  onDismiss: () => void;
}) {
  if (blocks.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
        right: 8,
        zIndex: 20,
        maxWidth: "70%",
        maxHeight: "40%",
        overflow: "auto",
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--color-border)",
          fontSize: 11,
          color: "var(--color-text-secondary)",
          fontWeight: 600,
          letterSpacing: 0.5,
        }}
      >
        <span>MATH</span>
        <span
          onClick={onDismiss}
          style={{ cursor: "pointer", opacity: 0.5, fontSize: 13 }}
          className="hover:opacity-100"
        >
          ✕
        </span>
      </div>

      {/* Math blocks */}
      <div style={{ padding: "4px 8px" }}>
        {blocks.map((block) => (
          <KaTeXBlock key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
