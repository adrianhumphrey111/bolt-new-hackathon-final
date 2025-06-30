"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DragContextType {
  isTransitionDragging: boolean;
  setIsTransitionDragging: (dragging: boolean) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export function DragProvider({ children }: { children: ReactNode }) {
  const [isTransitionDragging, setIsTransitionDragging] = useState(false);

  return (
    <DragContext.Provider value={{ isTransitionDragging, setIsTransitionDragging }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDrag() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
}