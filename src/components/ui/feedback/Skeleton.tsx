import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

const variantStyles = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-geist',
};

const animationStyles = {
  pulse: 'animate-pulse',
  wave: 'skeleton-wave',
  none: '',
};

export function Skeleton({ 
  className, 
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  style,
  ...props 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-foreground/10',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: width || (variant === 'text' ? '100%' : undefined),
        height: height || (variant === 'text' ? '1em' : undefined),
        ...style,
      }}
      {...props}
    />
  );
}

export interface SkeletonTextProps extends Omit<SkeletonProps, 'variant'> {
  lines?: number;
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingStyles = {
  sm: 'space-y-2',
  md: 'space-y-3',
  lg: 'space-y-4',
};

export function SkeletonText({ 
  lines = 3,
  spacing = 'md',
  className,
  ...props 
}: SkeletonTextProps) {
  return (
    <div className={cn(spacingStyles[spacing], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '80%' : '100%'}
          {...props}
        />
      ))}
    </div>
  );
}