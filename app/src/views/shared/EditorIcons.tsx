interface IconProps {
  size?: number;
  className?: string;
}

export function IconPencil({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11.5 2.5l4 4L5.5 16.5H1.5v-4L11.5 2.5z" />
      <path d="M9.5 4.5l4 4" />
    </svg>
  );
}

export function IconEraser({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15.5 9.5l-5-5-7 7 3 3h4l5-5z" />
      <path d="M3.5 11.5l5 5" />
      <line x1="8.5" y1="16.5" x2="16.5" y2="16.5" />
    </svg>
  );
}

export function IconFill({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2.5 12.5l7-7 3 3-7 7h-3v-3z" />
      <path d="M8 4l2-2" />
      <path d="M14 10c0 0 2.5 2 2.5 3.5a2.5 2.5 0 01-5 0C11.5 12 14 10 14 10z" />
    </svg>
  );
}

export function IconEyedropper({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 1.5a2 2 0 012 2l-2 2-4-4 2-2a2 2 0 012 0v2z" />
      <path d="M10.5 5.5l-7 7v3h3l7-7" />
      <path d="M2.5 16.5l1-4" />
    </svg>
  );
}

export function IconExport({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12.5v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
      <polyline points="6,7 9,4 12,7" />
      <line x1="9" y1="4" x2="9" y2="13" />
    </svg>
  );
}

export function IconImport({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12.5v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
      <polyline points="6,8 9,11 12,8" />
      <line x1="9" y1="11" x2="9" y2="2" />
    </svg>
  );
}

export function IconTrash({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 5h12" />
      <path d="M4.5 5v10a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V5" />
      <path d="M7 5V3.5a1 1 0 011-1h2a1 1 0 011 1V5" />
    </svg>
  );
}

export function IconPlus({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <line x1="9" y1="3" x2="9" y2="15" />
      <line x1="3" y1="9" x2="15" y2="9" />
    </svg>
  );
}

export function IconGrid({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="14" height="14" rx="1.5" />
      <line x1="2" y1="9" x2="16" y2="9" />
      <line x1="9" y1="2" x2="9" y2="16" />
    </svg>
  );
}
