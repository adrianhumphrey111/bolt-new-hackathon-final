import React from 'react';
import NextLink from 'next/link';
import { cn } from '@/lib/utils';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  external?: boolean;
  underline?: 'always' | 'hover' | 'none';
}

const underlineStyles = {
  always: 'underline',
  hover: 'hover:underline',
  none: 'no-underline',
};

export function Link({ 
  className, 
  href, 
  external = false, 
  underline = 'hover',
  children,
  ...props 
}: LinkProps) {
  const linkClassName = cn(
    'text-foreground transition-colors hover:text-focused-border-color',
    underlineStyles[underline],
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <NextLink href={href} className={linkClassName} {...props}>
      {children}
    </NextLink>
  );
}