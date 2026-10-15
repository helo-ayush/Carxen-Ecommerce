import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'luxuryRed' | 'softRed' | 'coral' | 'coralOutline';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'iconSm';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    const variantStyles: Record<string, string> = {
      default: 'bg-[#0e0e10] text-white hover:bg-[#222227] shadow-sm',
      destructive: 'bg-[#e2231a] text-white hover:bg-[#c91d15] shadow-sm',
      outline: 'border border-[#dcdbd5] bg-white text-[#18181b] hover:bg-[#f5f5f3] hover:border-[#b5b4ad]',
      secondary: 'bg-[#f0efe9] text-[#18181b] hover:bg-[#e4e3dc]',
      ghost: 'text-[#18181b] hover:bg-[#f0efe9]',
      link: 'text-[#e2231a] underline-offset-4 hover:underline p-0 h-auto',
      luxuryRed: 'bg-[#e2231a] text-white hover:bg-[#c91d15] shadow-[0_2px_10px_rgba(226,35,26,0.25)] hover:shadow-[0_4px_18px_rgba(226,35,26,0.4)]',
      softRed: 'bg-[rgba(226,35,26,0.08)] text-[#e2231a] border border-[rgba(226,35,26,0.22)] hover:bg-[#e2231a] hover:text-white',
      coral: 'bg-[#ff6565] text-white hover:bg-[#f25252] shadow-[0_2px_8px_rgba(255,101,101,0.25)]',
      coralOutline: 'border border-[#ff8e8e] bg-white text-[#ff5a5a] hover:bg-[#fff5f5] hover:border-[#ff6565]',
    };

    const sizeStyles: Record<string, string> = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10 p-0',
      iconSm: 'h-8 w-8 p-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2231a]/40',
          variantStyles[variant] || variantStyles.default,
          sizeStyles[size] || sizeStyles.default,
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
