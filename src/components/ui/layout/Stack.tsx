import React from 'react';
import { cn } from '@/lib/utils';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  divider?: React.ReactNode;
}

const spacingStyles = {
  none: 'space-y-0',
  xs: 'space-y-2',
  sm: 'space-y-geist-quarter',
  md: 'space-y-geist-half',
  lg: 'space-y-geist',
  xl: 'space-y-8',
};

const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export function Stack({ 
  className, 
  spacing = 'md',
  align = 'stretch',
  divider,
  children,
  ...props 
}: StackProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div
      className={cn(
        'flex flex-col',
        !divider && spacingStyles[spacing],
        alignStyles[align],
        className
      )}
      {...props}
    >
      {divider
        ? childrenArray.map((child, index) => (
            <React.Fragment key={index}>
              {child}
              {index < childrenArray.length - 1 && (
                <div className={cn('w-full', spacingStyles[spacing].replace('space-y-', 'my-'))}>
                  {divider}
                </div>
              )}
            </React.Fragment>
          ))
        : children}
    </div>
  );
}

export interface HStackProps extends Omit<StackProps, 'spacing'> {
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const horizontalSpacingStyles = {
  none: 'space-x-0',
  xs: 'space-x-2',
  sm: 'space-x-geist-quarter',
  md: 'space-x-geist-half',
  lg: 'space-x-geist',
  xl: 'space-x-8',
};

const horizontalAlignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

export function HStack({ 
  className, 
  spacing = 'md',
  align = 'center',
  divider,
  children,
  ...props 
}: HStackProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div
      className={cn(
        'flex flex-row',
        !divider && horizontalSpacingStyles[spacing],
        horizontalAlignStyles[align],
        className
      )}
      {...props}
    >
      {divider
        ? childrenArray.map((child, index) => (
            <React.Fragment key={index}>
              {child}
              {index < childrenArray.length - 1 && (
                <div className={cn('h-full', horizontalSpacingStyles[spacing].replace('space-x-', 'mx-'))}>
                  {divider}
                </div>
              )}
            </React.Fragment>
          ))
        : children}
    </div>
  );
}