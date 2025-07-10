import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, fullWidth = false, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-subtitle">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'h-10 w-full rounded-geist border border-unfocused-border-color bg-background px-3 py-2 text-sm text-foreground transition-colors',
              'placeholder:text-subtitle',
              'focus:border-focused-border-color focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-geist-error focus:border-geist-error',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-subtitle">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-geist-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-subtitle">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';