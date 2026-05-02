import type { ReactNode } from 'react';

const pillTones = {
  amber: 'bg-warn/15 text-warning ring-warn/30',
  sky: 'bg-info/15 text-primary ring-info/30',
  rose: 'bg-danger/15 text-error ring-danger/30',
  slate: 'bg-neutral/15 text-fg-muted ring-neutral/30',
} as const;

export type PillTone = keyof typeof pillTones;

export function Pill({
  tone,
  Icon,
  children,
}: {
  tone: PillTone;
  Icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  children: ReactNode;
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ' +
        pillTones[tone]
      }
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}
