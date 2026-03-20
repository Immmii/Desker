import { useRef, useCallback } from "react";
import {
  useReferenceVM,
  type ReferenceTab,
  type ReferenceFile,
  type CodeChange,
} from "../../../viewmodels/reference.vm";

// ── Language → display label ──
const LANG_LABELS: Record<string, { label: string; color: string }> = {
  java: { label: "Java", color: "#e17055" },
  ts: { label: "TypeScript", color: "#74b9ff" },
  tsx: { label: "TSX", color: "#74b9ff" },
  js: { label: "JavaScript", color: "#fdcb6e" },
  json: { label: "JSON", color: "#55efc4" },
  md: { label: "Markdown", color: "#9090a8" },
  yaml: { label: "YAML", color: "#fd79a8" },
  yml: { label: "YAML", color: "#fd79a8" },
  sql: { label: "SQL", color: "#a29bfe" },
  sh: { label: "Shell", color: "#00b894" },
  py: { label: "Python", color: "#fdcb6e" },
  xml: { label: "XML", color: "#e17055" },
  css: { label: "CSS", color: "#74b9ff" },
  html: { label: "HTML", color: "#e17055" },
  gradle: { label: "Gradle", color: "#00b894" },
};

function getLangInfo(lang: string) {
  return LANG_LABELS[lang] ?? { label: lang.toUpperCase(), color: "#9090a8" };
}

// ── Tab Button ──
function TabButton({
  tab,
  label,
  count,
  active,
  onClick,
}: {
  tab: ReferenceTab;
  label: string;
  count: number;
  active: boolean;
  onClick: (tab: ReferenceTab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
        active
          ? "bg-accent/15 text-accent"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
            active ? "bg-accent/25 text-accent" : "bg-bg-tertiary text-text-secondary"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── File Card ──
function FileCard({
  file,
  onRemove,
}: {
  file: ReferenceFile;
  onRemove: (id: string) => void;
}) {
  const langInfo = getLangInfo(file.language);
  const lines = file.content.split("\n");
  const preview = lines.slice(0, 12);

  return (
    <div className="mx-3 mb-2 rounded-xl border border-border bg-bg-secondary/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${langInfo.color}20`, color: langInfo.color }}
          >
            {langInfo.label}
          </span>
          <span className="text-[13px] font-medium text-text-primary truncate">
            {file.name}
          </span>
        </div>
        <button
          onClick={() => onRemove(file.id)}
          className="text-text-secondary/40 hover:text-danger text-[11px] cursor-pointer shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-bg-hover"
        >
          ✕
        </button>
      </div>

      {/* File path */}
      <div className="px-3 py-1 border-b border-border/30">
        <span className="text-[11px] text-text-secondary/60 font-mono truncate block">
          {file.path}
        </span>
      </div>

      {/* Code preview */}
      <div className="overflow-x-auto">
        <pre className="text-[12px] leading-[1.6] font-mono p-3">
          {preview.map((line, i) => (
            <div key={i} className="flex">
              <span className="text-text-secondary/30 select-none w-8 text-right pr-3 shrink-0">
                {i + 1}
              </span>
              <code className="text-text-primary/90">{line || " "}</code>
            </div>
          ))}
          {lines.length > 12 && (
            <div className="text-text-secondary/40 text-center pt-1">
              ... {lines.length - 12}줄 더
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}

// ── Change Card ──
function ChangeCard({
  change,
  onRemove,
}: {
  change: CodeChange;
  onRemove: (id: string) => void;
}) {
  const typeConfig = {
    added: { label: "추가", color: "#00b894", icon: "+" },
    modified: { label: "수정", color: "#fdcb6e", icon: "~" },
    deleted: { label: "삭제", color: "#e17055", icon: "-" },
  }[change.type];

  const diffLines = change.diff.split("\n");

  return (
    <div className="mx-3 mb-2 rounded-xl border border-border bg-bg-secondary/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${typeConfig.color}20`, color: typeConfig.color }}
          >
            {typeConfig.icon} {typeConfig.label}
          </span>
          <span className="text-[13px] font-medium text-text-primary truncate">
            {change.fileName}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-text-secondary/50">
            {new Date(change.timestamp).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => onRemove(change.id)}
            className="text-text-secondary/40 hover:text-danger text-[11px] cursor-pointer w-5 h-5 flex items-center justify-center rounded hover:bg-bg-hover"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Diff preview */}
      <div className="overflow-x-auto">
        <pre className="text-[12px] leading-[1.6] font-mono p-3">
          {diffLines.slice(0, 20).map((line, i) => {
            let lineClass = "text-text-primary/70";
            let bgClass = "";
            if (line.startsWith("+")) {
              lineClass = "text-success";
              bgClass = "bg-success/5";
            } else if (line.startsWith("-")) {
              lineClass = "text-danger";
              bgClass = "bg-danger/5";
            } else if (line.startsWith("@@")) {
              lineClass = "text-accent/70";
            }
            return (
              <div key={i} className={`${bgClass} px-1 -mx-1 rounded-sm`}>
                <code className={lineClass}>{line || " "}</code>
              </div>
            );
          })}
          {diffLines.length > 20 && (
            <div className="text-text-secondary/40 text-center pt-1">
              ... {diffLines.length - 20}줄 더
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}

// ── Empty states ──
function EmptyFiles() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary/50 gap-3 px-6">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
      <p className="text-[13px] text-center leading-relaxed">
        참고 파일이 없습니다<br />
        <span className="text-[12px]">AI가 참조하는 파일이 여기에 표시됩니다</span>
      </p>
    </div>
  );
}

function EmptyChanges() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary/50 gap-3 px-6">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <p className="text-[13px] text-center leading-relaxed">
        변경 내역이 없습니다<br />
        <span className="text-[12px]">코드 수정 사항이 여기에 표시됩니다</span>
      </p>
    </div>
  );
}

// ── Resize Handle ──
function ResizeHandle({ onResizeStart }: { onResizeStart: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onResizeStart}
      className="absolute top-0 left-[-3px] w-[6px] h-full cursor-col-resize z-10 group"
    >
      <div className="w-[2px] h-full mx-auto group-hover:bg-accent/40 transition-colors" />
    </div>
  );
}

// ── Main Panel ──
export default function ReferencePanel() {
  const {
    panelOpen,
    panelWidth,
    activeTab,
    files,
    changes,
    togglePanel,
    setPanelWidth,
    setActiveTab,
    removeFile,
    clearFiles,
    removeChange,
    clearChanges,
  } = useReferenceVM();

  const isResizing = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = panelWidth;

      const onMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        // Panel is on the right, so dragging left = wider
        const newWidth = startWidth - (ev.clientX - startX);
        setPanelWidth(newWidth);
      };

      const onUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelWidth, setPanelWidth]
  );

  if (!panelOpen) return null;

  const currentItems = activeTab === "files" ? files : changes;
  const canClear = currentItems.length > 0;

  return (
    <div
      style={{ width: panelWidth, minWidth: 280, maxWidth: 600, position: "relative" }}
      className="border-l border-border bg-bg-primary flex flex-col h-full shrink-0"
    >
      <ResizeHandle onResizeStart={handleResizeStart} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 min-h-[48px]">
        <div className="flex items-center gap-1 min-w-0">
          <TabButton
            tab="files"
            label="참고 파일"
            count={files.length}
            active={activeTab === "files"}
            onClick={setActiveTab}
          />
          <TabButton
            tab="changes"
            label="변경 내역"
            count={changes.length}
            active={activeTab === "changes"}
            onClick={setActiveTab}
          />
        </div>
        <div className="flex items-center gap-1">
          {canClear && (
            <button
              onClick={activeTab === "files" ? clearFiles : clearChanges}
              className="text-[11px] text-text-secondary/50 hover:text-text-primary px-2 py-1 rounded-md hover:bg-bg-hover cursor-pointer transition-colors"
            >
              전체 삭제
            </button>
          )}
          <button
            onClick={togglePanel}
            className="text-text-secondary/50 hover:text-text-primary w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover cursor-pointer transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="2" width="14" height="12" rx="2" />
              <line x1="10" y1="2" x2="10" y2="14" />
              <polyline points="7,6 5,8 7,10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {activeTab === "files" && (
          files.length === 0 ? (
            <EmptyFiles />
          ) : (
            files.map((f) => (
              <FileCard key={f.id} file={f} onRemove={removeFile} />
            ))
          )
        )}
        {activeTab === "changes" && (
          changes.length === 0 ? (
            <EmptyChanges />
          ) : (
            changes.map((c) => (
              <ChangeCard key={c.id} change={c} onRemove={removeChange} />
            ))
          )
        )}
      </div>
    </div>
  );
}

// ── Toggle Button (외부에서 사용) ──
export function ReferencePanelToggle() {
  const { panelOpen, togglePanel, files, changes } = useReferenceVM();
  const totalCount = files.length + changes.length;

  return (
    <button
      onClick={togglePanel}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
        panelOpen
          ? "bg-accent/15 text-accent font-semibold"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
      }`}
      title={panelOpen ? "참고 패널 닫기" : "참고 패널 열기"}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="2" width="14" height="12" rx="2" />
        <line x1="10" y1="2" x2="10" y2="14" />
      </svg>
      <span>참고</span>
      {totalCount > 0 && (
        <span className="text-[11px] bg-accent/25 text-accent px-1.5 py-0.5 rounded-full font-semibold">
          {totalCount}
        </span>
      )}
    </button>
  );
}
