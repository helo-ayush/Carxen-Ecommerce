import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-[#dcdbd5] bg-white px-3.5 py-2 text-sm text-[#0e0e10] placeholder:text-[#8d8d93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6262]/30 focus-visible:border-[#ff6262] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
