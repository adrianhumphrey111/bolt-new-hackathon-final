import React from 'react';
import { cn } from '@/lib/utils';

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'flex';
  axis?: 'horizontal' | 'vertical' | 'both';
}

const sizeStyles = {
  xs: { width: '8px', height: '8px' },
  sm: { width: '12px', height: '12px' },
  md: { width: '24px', height: '24px' },
  lg: { width: '48px', height: '48px' },
  xl: { width: '96px', height: '96px' },
  flex: { flex: 1 },
};

export function Spacer({ 
  className, 
  size = 'md',
  axis = 'vertical',
  ...props 
}: SpacerProps) {
  const style = size === 'flex' 
    ? { flex: 1 }
    : {
        width: axis === 'vertical' ? undefined : sizeStyles[size].width,
        height: axis === 'horizontal' ? undefined : sizeStyles[size].height,
      };

  return (
    <div
      className={cn(className)}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}