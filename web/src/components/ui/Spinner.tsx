export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400 ' +
        className
      }
    />
  );
}
