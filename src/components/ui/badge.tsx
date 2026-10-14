import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'subtleRed' | 'pill';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-[#0e0e10] text-white border-transparent',
    secondary: 'bg-[#ebeae4] text-[#1b1b1e] border-transparent',
    destructive: 'bg-[#e2231a] text-white border-transparent',
    outline: 'border-[#dcdbd5] text-[#1b1b1e] bg-transparent',
    subtleRed: 'bg-[rgba(226,35,26,0.08)] text-[#e2231a] border-[rgba(226,35,26,0.22)]',
    pill: 'rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    />
  );
}
