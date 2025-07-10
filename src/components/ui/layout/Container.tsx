import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  center?: boolean;
}

const sizeStyles = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export function Container({ 
  className, 
  size = 'lg', 
  center = true,
  children,
  ...props 
}: ContainerProps) {
  return (
    <div
      className={cn(
        'w-full px-geist',
        sizeStyles[size],
        center && 'mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}