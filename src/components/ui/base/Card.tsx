import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const variantStyles = {
  default: 'bg-background border border-unfocused-border-color',
  outlined: 'bg-transparent border border-unfocused-border-color',
  ghost: 'bg-foreground/5',
};

const paddingStyles = {
  none: '',
  sm: 'p-geist-quarter',
  md: 'p-geist-half',
  lg: 'p-geist',
};

export function Card({ 
  className, 
  variant = 'default', 
  padding = 'md',
  interactive = false,
  children,
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-geist',
        variantStyles[variant],
        paddingStyles[padding],
        interactive && 'cursor-pointer transition-all hover:border-focused-border-color hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-geist-quarter', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-subtitle', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('', className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-geist-half flex items-center', className)}
      {...props}
    />
  );
}