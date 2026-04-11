import { useEffect, useRef } from "react";
import type { Terminal, IDecoration } from "@xterm/xterm";
import katex from "katex";
import "katex/dist/katex.min.css";

// ── LaTeX command keywords ──
const LATEX_LINE =
  /\\(?:frac|sum|int|prod|sqrt|rightarrow|leftarrow|Rightarrow|Leftarrow|times|div|cdot|cdots|dots|ldots|leq|geq|neq|approx|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|Omega|phi|psi|begin|end|text|mathrm|mathbf|mathbb|binom|lim|log|ln|sin|cos|tan|hat|bar|vec|dot|ddot|overline|underline|subset|supset|subseteq|supseteq|in|notin|cap|cup|forall|exists|neg|land|lor|implies|iff|equiv|sim|cong|perp|parallel|angle|triangle|circ|star|bullet|oplus|otimes)/;

function isMathContent(s: string): boolean {
  if (LATEX_LINE.test(s)) return true;
  if (/[_^{}]/.test(s)) return true;
  if (/[a-zA-Z]\s*\(/.test(s)) return true;
  if (/[0-9]\s*[a-zA-Z]|[a-zA-Z]\s*[0-9]/.test(s)) return true;
  if (/[+\-*/=]/.test(s) && /[a-zA-Z0-9]/.test(s)) return true;
  return false;
}

/** Heuristic for upstream callers. */
export function hasLatex(text: string): boolean {
  if (/\\begin\{\w+\}/.test(text)) return true;
  if (/\\\[/.test(text) || /^\[\s*$/m.test(text)) return true;
  if (/\\\(/.test(text)) return true;
  if (/\$\$[\s\S]+?\$\$/.test(text)) return true;
  const inlineRe = /\$([^\s$][^$]*?[^\s$]|[^\s$])\$/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(text)) !== null) {
    if (isMathContent(m[1])) return true;
  }
  if (/\([^)]*\\[a-zA-Z]+[^)]*\)/.test(text)) return true;
  if (/\[[^\]]*\\[a-zA-Z]+[^\]]*\]/.test(text)) return true;
  return false;
}


// ── Placements (absolute buffer row) ──
// - display: pure math block spanning one or more rows (e.g. $$...$$, \[...\])
// - mixedRow: a row containing inline $...$ mixed with plain text — rendered
//   as a full-width decoration replacing the row, with each segment converted
//   to HTML (plain text as escaped HTML, math via katex.renderToString).
interface Segment {
  type: "text" | "math";
  value: string;
}

type Placement =
  | {
      kind: "mixedRow";
      absRowStart: number;
      absRowEnd: number;
      segments: Segment[];
    }
  | {
      kind: "display";
      absRowStart: number;
      absRowEnd: number;
      latex: string;
    };

interface InlineMatch {
  start: number;
  end: number;
  latex: string;
}

function findInlineMatches(text: string): InlineMatch[] {
  const out: InlineMatch[] = [];

  const dollarRe = /(?<!\$)\$([^\s$][^$]*?[^\s$]|[^\s$])\$(?!\$)/g;
  let dm: RegExpExecArray | null;
  while ((dm = dollarRe.exec(text)) !== null) {
    if (isMathContent(dm[1])) {
      out.push({ start: dm.index, end: dm.index + dm[0].length, latex: dm[1].trim() });
    }
  }

  const parenRe = /\\\(([\s\S]+?)\\\)/g;
  let pm: RegExpExecArray | null;
  while ((pm = parenRe.exec(text)) !== null) {
    out.push({ start: pm.index, end: pm.index + pm[0].length, latex: pm[1].trim() });
  }

  const bareParenRe = /\(([^)]*\\[a-zA-Z]+[^)]*)\)/g;
  let bm: RegExpExecArray | null;
  while ((bm = bareParenRe.exec(text)) !== null) {
    if (LATEX_LINE.test(bm[1])) {
      out.push({ start: bm.index, end: bm.index + bm[0].length, latex: bm[1].trim() });
    }
  }

  out.sort((a, b) => a.start - b.start);
  const filtered: InlineMatch[] = [];
  let cursor = 0;
  for (const m of out) {
    if (m.start >= cursor) {
      filtered.push(m);
      cursor = m.end;
    }
  }
  return filtered;
}

// ── HTML escape for raw text segments ──
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Split a row into (text|math) segments using the inline matches ──
function buildMixedRowSegments(text: string, matches: InlineMatch[]): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.start > pos) {
      segments.push({ type: "text", value: text.slice(pos, m.start) });
    }
    segments.push({ type: "math", value: m.latex });
    pos = m.end;
  }
  if (pos < text.length) {
    segments.push({ type: "text", value: text.slice(pos) });
  }
  return segments;
}

// ── Logical line: one or more consecutive wrapped rows joined into one text ──
interface LogicalLine {
  absRowStart: number;  // buffer row of the first visible row
  absRowEnd: number;    // buffer row of the last visible row (inclusive)
  text: string;         // concatenated text across all wrapped rows
}

function buildLogicalLines(
  term: Terminal,
  scanStart: number,
  scanRows: number,
): LogicalLine[] {
  const buf = term.buffer.active;
  const out: LogicalLine[] = [];

  for (let r = 0; r < scanRows; r++) {
    const line = buf.getLine(scanStart + r);
    if (!line) continue;
    // Preserve intra-row whitespace by passing `false` — we want the exact
    // cell contents because wrapped-row content continues into the next row.
    const rowText = line.translateToString(false);
    const absRow = scanStart + r;

    if (line.isWrapped && out.length > 0) {
      const prev = out[out.length - 1];
      prev.text += rowText;
      prev.absRowEnd = absRow;
    } else {
      out.push({ absRowStart: absRow, absRowEnd: absRow, text: rowText });
    }
  }

  // Trim trailing whitespace at the end of each fully-built logical line.
  for (const ll of out) {
    ll.text = ll.text.replace(/\s+$/, "");
  }
  return out;
}

// ── Scan entire buffer (all scrollback + viewport) ──
function scanBuffer(term: Terminal): Placement[] {
  const buf = term.buffer.active;
  const totalRows = buf.length;

  // Limit scan to the last ~2000 rows to keep cost bounded on huge scrollback
  const scanStart = Math.max(0, totalRows - 2000);
  const scanRows = totalRows - scanStart;

  const logicalLines = buildLogicalLines(term, scanStart, scanRows);

  const placements: Placement[] = [];
  let i = 0;
  while (i < logicalLines.length) {
    const current = logicalLines[i];
    const { text, absRowStart, absRowEnd } = current;

    // 1) \begin{...}...\end{...} — may span multiple logical lines
    const beginMatch = text.match(/\\begin\{(\w+)\}/);
    if (beginMatch) {
      const endTag = `\\end{${beginMatch[1]}}`;
      let endIdx = i;
      for (let j = i; j < logicalLines.length; j++) {
        if (logicalLines[j].text.includes(endTag)) {
          endIdx = j;
          break;
        }
      }
      const envLines = logicalLines.slice(i, endIdx + 1).map((d) => d.text);
      const joined = envLines
        .map((line, idx) => {
          if (idx === 0 || idx === envLines.length - 1) return line;
          const t = line.trimEnd();
          if (t.endsWith("\\\\")) return t;
          if (t.endsWith("\\")) return t + "\\";
          return t + " \\\\";
        })
        .join("\n");
      placements.push({
        kind: "display",
        absRowStart,
        absRowEnd: logicalLines[endIdx].absRowEnd,
        latex: joined.trim(),
      });
      i = endIdx + 1;
      continue;
    }

    // 2) \[...\] or bare [...]  (may span multiple logical lines)
    {
      const isEscapedBracket = /\\\[/.test(text);
      const isBareBracket = !isEscapedBracket && text.trim() === "[";
      if (isEscapedBracket || isBareBracket) {
        const startIdx = i;
        let endIdx = i;
        const closing = isBareBracket ? /^\s*\]\s*$/ : /\\\]/;
        const combined = [text];
        if (isBareBracket || !text.includes("\\]")) {
          for (let j = i + 1; j < logicalLines.length; j++) {
            combined.push(logicalLines[j].text);
            if (closing.test(logicalLines[j].text)) {
              endIdx = j;
              break;
            }
          }
        }
        if (endIdx > startIdx) {
          const inner = combined.slice(1, -1).join("\n");
          const MATH_CONTENT = /[_^][\{(]|\\[a-zA-Z]|[=+].*[=+]|\{[a-zA-Z0-9]+\}/;
          if (isEscapedBracket || LATEX_LINE.test(inner) || MATH_CONTENT.test(inner)) {
            placements.push({
              kind: "display",
              absRowStart,
              absRowEnd: logicalLines[endIdx].absRowEnd,
              latex: inner.trim(),
            });
            i = endIdx + 1;
            continue;
          }
        } else if (isEscapedBracket) {
          const full = combined.join("\n");
          const br = full.match(/\\\[([\s\S]+?)\\\]/);
          if (br) {
            placements.push({
              kind: "display",
              absRowStart,
              absRowEnd: logicalLines[endIdx].absRowEnd,
              latex: br[1].trim(),
            });
            i = endIdx + 1;
            continue;
          }
        }
      }
    }

    // 3) $$...$$  — now that we have logical lines, usually on one line
    if (text.includes("$$")) {
      const startIdx = i;
      let endIdx = i;
      const combined = [text];
      const count = (text.match(/\$\$/g) || []).length;
      if (count === 1) {
        for (let j = i + 1; j < logicalLines.length; j++) {
          combined.push(logicalLines[j].text);
          if (logicalLines[j].text.includes("$$")) {
            endIdx = j;
            break;
          }
        }
      }
      const full = combined.join("\n");
      const dd = full.match(/\$\$([\s\S]+?)\$\$/);
      if (dd) {
        placements.push({
          kind: "display",
          absRowStart,
          absRowEnd: logicalLines[endIdx].absRowEnd,
          latex: dd[1].trim(),
        });
        i = endIdx + 1;
        continue;
      }
      // Fall through — maybe a lone $$ not forming a block
      void startIdx;
    }

    // 4) Inline $...$ / \(...\) mixed with text — replace the whole logical
    //    line (all its wrapped visible rows) with one decoration.
    const matches = findInlineMatches(text);
    if (matches.length > 0) {
      placements.push({
        kind: "mixedRow",
        absRowStart,
        absRowEnd,
        segments: buildMixedRowSegments(text, matches),
      });
      i++;
      continue;
    }

    // 5) Single-line bare [latex]
    {
      const bm = text.match(/^\s*\[([^\]]*\\[a-zA-Z]+[^\]]*)\]\s*$/);
      if (bm && LATEX_LINE.test(bm[1])) {
        placements.push({
          kind: "display",
          absRowStart,
          absRowEnd,
          latex: bm[1].trim(),
        });
        i++;
        continue;
      }
    }

    i++;
  }

  return placements;
}

// ── Serialize a placement into a stable key (for diffing scans) ──
function placementKey(p: Placement): string {
  if (p.kind === "mixedRow") {
    const segKey = p.segments.map((s) => `${s.type[0]}${s.value}`).join("|");
    return `m:${p.absRowStart}:${p.absRowEnd}:${segKey}`;
  }
  return `d:${p.absRowStart}:${p.absRowEnd}:${p.latex}`;
}

// ── Active decoration bookkeeping ──
interface ActiveDecoration {
  key: string;
  decoration: IDecoration;
  rendered: string;
}

// ── Build inner-wrapper HTML for a decoration element ──
// We do NOT touch `element.style.display` — xterm sets it to 'none' when the
// marker is outside the viewport, and overriding it to 'flex' causes stale
// decorations to bleed into view. All layout lives on a child wrapper div.
// Theme colors come from CSS variables so light/dark themes Just Work.
const MATH_BG = "var(--color-bg-primary, #0f0f13)";
const MATH_FG = "var(--color-text-primary, #e8e8f0)";
const MONO_FONT = "'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace";

function wrapperHtml(contentHtml: string, displayMode: boolean): string {
  const justify = displayMode ? "center" : "flex-start";
  const fontSize = displayMode ? 18 : 13;
  const lineHeight = displayMode ? 1.6 : 1.4;
  // Inner wrapper uses absolute positioning to fill the decoration element.
  // `inset:0` → covers the whole decoration area → hides xterm text behind it.
  // Display math stays centered single-line (KaTeX handles its own layout).
  // Inline mixed rows use `pre-wrap` so long wrapped lines keep flowing.
  const whiteSpace = displayMode ? "nowrap" : "pre-wrap";
  const align = displayMode ? "center" : "flex-start";
  return (
    `<div style="position:absolute;inset:0;display:flex;` +
    `align-items:${align};justify-content:${justify};` +
    `background:${MATH_BG};color:${MATH_FG};` +
    `font-family:${MONO_FONT};` +
    `font-size:${fontSize}px;line-height:${lineHeight};` +
    `overflow:hidden;white-space:${whiteSpace};` +
    `padding:0 4px;box-sizing:border-box;` +
    `pointer-events:none;">${contentHtml}</div>`
  );
}

// ── Restore backslashes that CLIs (e.g. ChatGPT) strip when printing LaTeX ──
// A lone `\` followed by a digit or minus sign inside a matrix is almost
// certainly a stripped `\\` (bmatrix row separator before the next entry).
// Restoring it lets KaTeX parse. Letters after `\` are real commands and `\|`
// is the norm delimiter — both are left alone.
function restoreLatex(s: string): string {
  return s.replace(/\\(?=[\d\-])/g, "\\\\");
}

function renderMathHtml(latex: string, displayMode: boolean): string {
  const fixed = restoreLatex(latex);
  try {
    return katex.renderToString(fixed, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return escapeHtml(`$${latex}$`);
  }
}

// ── Reconcile decorations against the latest scan ──
function reconcileDecorations(
  term: Terminal,
  active: Map<string, ActiveDecoration>,
): Map<string, ActiveDecoration> {
  const placements = scanBuffer(term);
  const next = new Map<string, ActiveDecoration>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const core: any = (term as unknown as { _core?: unknown })._core;
  const bufService = core?._bufferService;
  const bufferBuf = bufService?.buffer;
  if (!bufferBuf) return active;

  const cols = term.cols;

  for (const p of placements) {
    const key = placementKey(p);
    const existing = active.get(key);
    if (existing) {
      next.set(key, existing);
      active.delete(key);
      continue;
    }

    const displayMode = p.kind === "display";

    // Build HTML content for the decoration
    let contentHtml = "";
    if (p.kind === "display") {
      contentHtml = renderMathHtml(p.latex, true);
    } else {
      // mixedRow — per-segment: plain text as HTML, math via KaTeX
      const parts: string[] = [];
      for (const seg of p.segments) {
        if (seg.type === "text") {
          parts.push(escapeHtml(seg.value));
        } else {
          parts.push(renderMathHtml(seg.value, false));
        }
      }
      contentHtml = parts.join("");
    }
    const rendered = wrapperHtml(contentHtml, displayMode);

    // Pick the absolute row, x offset, width, height for the decoration.
    // Both kinds may span multiple wrapped rows — height is the row count.
    const absRow = p.absRowStart;
    const x = 0;
    const width = cols;
    const height = Math.max(p.absRowEnd - p.absRowStart + 1, 1);

    // Create a marker at the absolute buffer row (bypass public registerMarker
    // which only marks cursor offset).
    const marker = bufferBuf.addMarker?.(absRow);
    if (!marker) continue;

    const decoration = term.registerDecoration({
      marker,
      x,
      width,
      height,
      layer: "top",
    });

    if (!decoration) {
      try { marker.dispose(); } catch { /* noop */ }
      continue;
    }

    decoration.onRender((el) => {
      // Do NOT touch el.style.display — xterm sets it to 'none' when the
      // marker is outside the viewport; overriding it causes bleed.
      if (el.innerHTML !== rendered) {
        el.innerHTML = rendered;
      }
    });

    next.set(key, { key, decoration, rendered });
  }

  // Whatever's left in `active` is no longer present — dispose
  for (const stale of active.values()) {
    try { stale.decoration.dispose(); } catch { /* noop */ }
  }

  return next;
}

// ── React wrapper (stateless shell + imperative decorations) ──
export default function MathOverlay({
  triggerKey,
  getTerminal,
}: {
  /** Changes whenever new AI data arrives */
  triggerKey: number;
  getTerminal?: () => Terminal | undefined;
  // containerRef kept as optional for API compat (unused with decorations)
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const activeRef = useRef<Map<string, ActiveDecoration>>(new Map());
  const pendingRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;

    const schedule = () => {
      if (pendingRef.current != null) return;
      pendingRef.current = requestAnimationFrame(() => {
        pendingRef.current = null;
        if (disposed) return;
        const term = getTerminal?.();
        if (!term || !term.element) return;
        activeRef.current = reconcileDecorations(term, activeRef.current);
      });
    };

    // Poll once for the terminal to become available
    const tryAttach = () => {
      if (disposed) return;
      const term = getTerminal?.();
      if (!term || !term.element) {
        requestAnimationFrame(tryAttach);
        return;
      }
      // Attach listeners
      const d1 = term.onRender(schedule);
      const d2 = term.onScroll(schedule);
      const d3 = term.onResize(schedule);
      schedule();

      // Stash disposers on a ref so cleanup can dispose them
      cleanupRef.current = () => {
        try { d1.dispose(); } catch { /* noop */ }
        try { d2.dispose(); } catch { /* noop */ }
        try { d3.dispose(); } catch { /* noop */ }
      };
    };

    const cleanupRef: { current: null | (() => void) } = { current: null };
    tryAttach();

    return () => {
      disposed = true;
      if (pendingRef.current != null) {
        cancelAnimationFrame(pendingRef.current);
        pendingRef.current = null;
      }
      if (cleanupRef.current) cleanupRef.current();
      for (const a of activeRef.current.values()) {
        try { a.decoration.dispose(); } catch { /* noop */ }
      }
      activeRef.current.clear();
    };
  }, [getTerminal, triggerKey]);

  // No DOM — all work is done via xterm decorations.
  return null;
}
