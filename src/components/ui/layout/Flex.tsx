import React from 'react';
import { cn } from '@/lib/utils';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  flex?: '1' | 'auto' | 'initial' | 'none';
}

const directionStyles = {
  'row': 'flex-row',
  'col': 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse',
};

const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const justifyStyles = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const wrapStyles = {
  wrap: 'flex-wrap',
  nowrap: 'flex-nowrap',
  'wrap-reverse': 'flex-wrap-reverse',
};

const gapStyles = {
  none: 'gap-0',
  xs: 'gap-2',
  sm: 'gap-geist-quarter',
  md: 'gap-geist-half',
  lg: 'gap-geist',
};

const flexStyles = {
  '1': 'flex-1',
  'auto': 'flex-auto',
  'initial': 'flex-initial',
  'none': 'flex-none',
};

export function Flex({ 
  className, 
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = 'nowrap',
  gap = 'none',
  flex,
  children,
  ...props 
}: FlexProps) {
  return (
    <div
      className={cn(
        'flex',
        directionStyles[direction],
        alignStyles[align],
        justifyStyles[justify],
        wrapStyles[wrap],
        gapStyles[gap],
        flex && flexStyles[flex],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}