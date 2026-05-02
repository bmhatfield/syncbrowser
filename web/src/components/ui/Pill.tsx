import type { ReactNode } from 'react';

const pillTones = {
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  slate: 'bg-slate-700/40 text-slate-300 ring-slate-600/40',
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
