import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isRound?: boolean;
}

const variantStyles = {
  primary: 'bg-foreground text-background hover:bg-background hover:text-foreground hover:border-focused-border-color',
  secondary: 'bg-background text-foreground border-unfocused-border-color hover:border-focused-border-color',
  ghost: 'bg-transparent hover:bg-foreground/10 border-transparent',
  danger: 'bg-transparent text-geist-error hover:bg-geist-error hover:text-white border-transparent',
};

const sizeStyles = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', isRound = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center border font-medium transition-all duration-150 ease-in-out',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isRound ? 'rounded-full' : 'rounded-geist',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

IconButton.displayName = 'IconButton';