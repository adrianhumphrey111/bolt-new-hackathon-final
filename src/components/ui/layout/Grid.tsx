import React from 'react';
import { cn } from '@/lib/utils';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | 'auto';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  responsive?: boolean;
}

const colStyles = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
  auto: 'grid-cols-auto',
};

const gapStyles = {
  none: 'gap-0',
  xs: 'gap-2',
  sm: 'gap-geist-quarter',
  md: 'gap-geist-half',
  lg: 'gap-geist',
};

const responsiveStyles = {
  2: 'sm:grid-cols-1 md:grid-cols-2',
  3: 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-5',
  6: 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  12: 'sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-12',
};

export function Grid({ 
  className, 
  cols = 'auto', 
  gap = 'md',
  responsive = false,
  children,
  ...props 
}: GridProps) {
  return (
    <div
      className={cn(
        'grid',
        cols === 'auto' ? 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : colStyles[cols],
        gapStyles[gap],
        responsive && cols !== 'auto' && cols !== 1 && responsiveStyles[cols],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
}

const colSpanStyles = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
  full: 'col-span-full',
};

const rowSpanStyles = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
  4: 'row-span-4',
  5: 'row-span-5',
  6: 'row-span-6',
};

export function GridItem({ 
  className, 
  colSpan,
  rowSpan,
  children,
  ...props 
}: GridItemProps) {
  return (
    <div
      className={cn(
        colSpan && colSpanStyles[colSpan],
        rowSpan && rowSpanStyles[rowSpan],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}