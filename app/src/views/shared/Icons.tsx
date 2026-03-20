// Clean line icons for sidebar (24x24, stroke-based)

interface IconProps {
  size?: number;
  className?: string;
}

export function IconHome({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V19a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5" />
    </svg>
  );
}

export function IconEditor({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Grid/pixel canvas */}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      {/* Pencil indicator */}
      <circle cx="19" cy="19" r="2.5" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
  );
}

export function IconTasks({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Checklist */}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8l2 2 4-4" />
      <line x1="7" y1="14" x2="17" y2="14" />
      <line x1="7" y1="18" x2="13" y2="18" />
    </svg>
  );
}

export function IconTerminal({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      {/* Prompt */}
      <polyline points="7,10 10,13 7,16" />
      <line x1="13" y1="16" x2="17" y2="16" />
    </svg>
  );
}

export function IconPlugins({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Plug shape */}
      <path d="M9 3v4" />
      <path d="M15 3v4" />
      <path d="M6 7h12a1 1 0 011 1v3a6 6 0 01-6 6h0a6 6 0 01-6-6V8a1 1 0 011-1z" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function IconSettings({ size = 24, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
    </svg>
  );
}
