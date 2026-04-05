'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-rainbow-border text-white',
  secondary: 'btn-rainbow-border text-white hover:brightness-110',
  success: 'bg-gradient-to-r from-[#06ffa5] to-[#00d4ff] text-[#0a0a0a] hover:brightness-110',
  danger: 'bg-gradient-to-r from-[#ff006e] to-[#ff4444] text-white hover:brightness-110',
  warning: 'bg-gradient-to-r from-[#ffd60a] to-[#ff8c42] text-[#0a0a0a] hover:brightness-110',
  outline: 'border border-gray-500 text-white',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 font-medium",
          "transition-all duration-200 active:scale-95 hover:scale-95 cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';
