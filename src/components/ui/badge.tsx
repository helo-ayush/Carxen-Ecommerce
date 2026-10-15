import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'subtleRed' | 'pill' | 'gold' | 'success' | 'coral' | 'coralLight' | 'filterPill';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-[#0e0e10] text-white border-transparent',
    secondary: 'bg-[#ebeae4] text-[#1b1b1e] border-[#dcdbd5]',
    destructive: 'bg-[#e2231a] text-white border-transparent',
    outline: 'border-[#dcdbd5] text-[#1b1b1e] bg-white/80 backdrop-blur-sm',
    subtleRed: 'bg-[rgba(226,35,26,0.08)] text-[#e2231a] border-[rgba(226,35,26,0.22)]',
    gold: 'bg-[#fff8e1] text-[#9a6700] border-[#ffe082]',
    success: 'bg-[#e8f5e9] text-[#1b5e20] border-[#a5d6a7]',
    pill: 'rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase',
    coral: 'bg-[#ff6565] text-white border-transparent shadow-xs',
    coralLight: 'bg-[#fff0f0] text-[#ff5252] border-[#ffc9c9]',
    filterPill: 'bg-[#f4f3ef] text-[#555] border-[#e2e1dc] hover:bg-[#eae9e3] hover:text-[#111]',
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
