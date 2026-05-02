import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={'size-4 animate-spin text-primary ' + className}
    />
  );
}
