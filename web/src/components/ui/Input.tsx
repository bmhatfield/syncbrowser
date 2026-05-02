import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={
        'w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm ' +
        'text-fg placeholder:text-fg-faint focus:border-primary focus:outline-none ' +
        'focus:ring-1 focus:ring-primary ' +
        className
      }
      {...rest}
    />
  );
}
