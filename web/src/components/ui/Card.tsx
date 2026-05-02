import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={
        'rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm ' + className
      }
      {...rest}
    />
  );
}

export function CardHeader({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={'border-b border-slate-800 px-4 py-3 ' + className} {...rest} />;
}

export function CardBody({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={'px-4 py-3 ' + className} {...rest} />;
}
