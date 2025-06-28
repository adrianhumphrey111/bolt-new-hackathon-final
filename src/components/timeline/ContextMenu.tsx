"use client";

import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }>;
}

export function ContextMenu({ x, y, isOpen, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position if menu would go off screen
    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position if menu would go off screen
    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [isOpen, x, y]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-1 min-w-48 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`
            w-full px-3 py-2 text-left text-sm flex items-center space-x-2 transition-colors
            ${item.disabled 
              ? 'text-gray-500 cursor-not-allowed' 
              : item.danger 
                ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }
          `}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
        >
          {item.icon && (
            <span className="flex-shrink-0 w-4 h-4">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}