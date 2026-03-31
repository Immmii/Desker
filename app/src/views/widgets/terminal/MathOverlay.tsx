import { useEffect, useRef, useState, useCallback } from "react";
import type { Terminal } from "@xterm/xterm";
import katex from "katex";
import "katex/dist/katex.min.css";

// ── Detect LaTeX in a single line ──
const LATEX_LINE =
  /\\(?:frac|sum|int|prod|sqrt|rightarrow|leftarrow|Rightarrow|Leftarrow|times|div|cdot|leq|geq|neq|approx|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|phi|psi|begin|end|text|mathrm|mathbf|binom|lim|log|ln|sin|cos|tan|hat|bar|vec|dot|ddot|overline|underline)/;

/** Check if text has LaTeX worth rendering */
export function hasLatex(text: string): boolean {
  if (/\\begin\{\w+\}/.test(text)) return true;
  if (/\$\$.+?\$\$/s.test(text)) return true;
  if (/\$[^\s$][^$]*?[^\s$]\$/.test(text) && LATEX_LINE.test(text)) return true;
  return false;
}

// ── Region in the terminal buffer containing LaTeX ──
interface MathRegion {
  startRow: number; // viewport-relative
  endRow: number;
  latex: string;    // extracted LaTeX source
}

/**
 * Scan the visible xterm buffer for LaTeX blocks.
 * Returns regions with their viewport-relative row positions.
 */
function scanBufferForMath(terminal: Terminal): MathRegion[] {
  const buf = terminal.buffer.active;
  const baseRow = buf.viewportY;
  const rows = terminal.rows;

  // Collect all visible lines
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const line = buf.getLine(baseRow + r);
    lines.push(line ? line.translateToString(true).trimEnd() : "");
  }

  const regions: MathRegion[] = [];

  // Find \begin{...}...\end{...} blocks
  let i = 0;
  while (i < lines.length) {
    const beginMatch = lines[i].match(/\\begin\{(\w+)\}/);
    if (beginMatch) {
      const envName = beginMatch[1];
      const endPattern = `\\end{${envName}}`;
      let endRow = i;
      // Find matching \end
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes(endPattern)) {
          endRow = j;
          break;
        }
      }
      // Collect the full LaTeX block, joining inner lines with \\ for KaTeX line breaks
      const envLines = lines.slice(i, endRow + 1);
      const joined = envLines.map((line, idx) => {
        // First line (\begin{...}) and last line (\end{...}) stay as-is
        if (idx === 0 || idx === envLines.length - 1) return line;
        // Inner content lines: ensure they end with \\ for KaTeX row separator
        const trimLine = line.trimEnd();
        if (trimLine.endsWith("\\\\")) return trimLine;
        if (trimLine.endsWith("\\")) return trimLine + "\\"; // single \ → \\
        return trimLine + " \\\\"; // no separator → add \\
      }).join("\n");
      regions.push({ startRow: i, endRow, latex: joined.trim() });
      i = endRow + 1;
      continue;
    }

    // Inline $...$ with LaTeX commands on a single line
    if (/\$[^\s$][^$]*?[^\s$]\$/.test(lines[i]) && LATEX_LINE.test(lines[i])) {
      // Extract just the $...$ part
      const inlineMatch = lines[i].match(/\$([^\s$][^$]*?[^\s$])\$/);
      if (inlineMatch) {
        regions.push({ startRow: i, endRow: i, latex: inlineMatch[1] });
      }
      i++;
      continue;
    }

    // Display $$...$$ (may span lines)
    if (lines[i].includes("$$")) {
      const startRow = i;
      let endRow = i;
      const combined = [lines[i]];
      // If only one $$ on this line, look for closing $$
      const ddCount = (lines[i].match(/\$\$/g) || []).length;
      if (ddCount === 1) {
        for (let j = i + 1; j < lines.length; j++) {
          combined.push(lines[j]);
          if (lines[j].includes("$$")) {
            endRow = j;
            break;
          }
        }
      }
      const full = combined.join("\n");
      const ddMatch = full.match(/\$\$([\s\S]+?)\$\$/);
      if (ddMatch) {
        regions.push({ startRow, endRow, latex: ddMatch[1].trim() });
        i = endRow + 1;
        continue;
      }
    }

    i++;
  }

  return regions;
}

// ── Single KaTeX rendered overlay ──
function RenderedBlock({
  region,
  cellHeight,
}: {
  region: MathRegion;
  cellHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isDisplay = region.latex.includes("\\begin") || region.endRow > region.startRow;

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(region.latex, ref.current, {
        displayMode: isDisplay,
        throwOnError: false,
        strict: false,
      });
    } catch {
      // If render fails, hide the overlay so raw text shows through
      if (ref.current) ref.current.style.display = "none";
    }
  }, [region.latex, isDisplay]);

  const top = region.startRow * cellHeight;
  const height = (region.endRow - region.startRow + 1) * cellHeight;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: isDisplay ? "center" : "flex-start",
        paddingLeft: isDisplay ? 0 : 16,
        background: "var(--color-bg-primary, #0f0f13)",
        color: "var(--color-text-primary, #e8e8f0)",
        fontSize: isDisplay ? 18 : 15,
        lineHeight: 1.6,
        overflow: "hidden",
        zIndex: 5,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Main overlay component ──
export default function MathOverlay({
  triggerKey,
  getTerminal,
  containerRef,
}: {
  /** Changes whenever new AI data arrives, triggering a re-scan */
  triggerKey: number;
  getTerminal?: () => Terminal | undefined;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [regions, setRegions] = useState<MathRegion[]>([]);
  const [cellHeight, setCellHeight] = useState(0);

  const scan = useCallback(() => {
    const term = getTerminal?.();
    const el = containerRef?.current;
    if (!term || !el) {
      setRegions([]);
      return;
    }
    setCellHeight(el.clientHeight / term.rows);
    const found = scanBufferForMath(term);
    setRegions(found);
  }, [getTerminal, containerRef]);

  // Re-scan when trigger changes (new AI output)
  useEffect(() => {
    scan();
  }, [triggerKey, scan]);

  // Re-scan on terminal scroll
  useEffect(() => {
    const term = getTerminal?.();
    if (!term) return;
    const d = term.onScroll(() => scan());
    return () => d.dispose();
  }, [getTerminal, scan]);

  if (regions.length === 0 || cellHeight === 0) return null;

  return (
    <>
      {regions.map((region, i) => (
        <RenderedBlock key={`${i}-${region.startRow}`} region={region} cellHeight={cellHeight} />
      ))}
    </>
  );
}
