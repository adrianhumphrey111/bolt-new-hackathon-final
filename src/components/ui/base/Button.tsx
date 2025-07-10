import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/Spinner';
import { Spacing } from '@/components/Spacing';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  loading?: boolean;
  secondary?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ onClick, disabled, children, loading, secondary, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "border-foreground border rounded-geist bg-foreground text-background px-geist-half font-geist h-10 font-medium transition-all duration-150 ease-in-out inline-flex items-center appearance-none text-sm hover:bg-background hover:text-foreground hover:border-focused-border-color disabled:bg-button-disabled-color disabled:text-disabled-text-color disabled:border-unfocused-border-color disabled:cursor-not-allowed",
          secondary
            ? "bg-background text-foreground border-unfocused-border-color"
            : undefined,
          className
        )}
        onClick={onClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <>
            <Spinner size={20} />
            <Spacing />
          </>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';