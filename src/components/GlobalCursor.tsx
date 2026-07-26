"use client";

import React, { createContext, useContext } from "react";

export type CursorIcon = "close" | "drag" | "view" | "download";

export interface HotzoneResult {
  active: true;
  pct: number;
  chevron: "next" | "back" | "none";
  hoverType?: "none" | "expand-invert";
  symbol?: string;
  icon?: CursorIcon;
}

export interface HotzoneInactive {
  active: false;
}

export type HotzoneTestResult = HotzoneResult | HotzoneInactive;
export type HotzoneTestFn = (clientX: number, clientY: number) => HotzoneTestResult;

interface GlobalCursorContextValue {
  registerHotzone: (id: string, testFn: HotzoneTestFn, priority?: number) => void;
  unregisterHotzone: (id: string) => void;
}

const noop = () => {};

const GlobalCursorContext = createContext<GlobalCursorContextValue>({
  registerHotzone: noop,
  unregisterHotzone: noop,
});

export const useGlobalCursor = () => useContext(GlobalCursorContext);

/**
 * Clean pass-through Provider.
 * Disables custom cursor DOM overlays, trailing elements, and mousemove loops,
 * restoring default browser cursors across the entire app.
 */
export function GlobalCursorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GlobalCursorContext.Provider
      value={{
        registerHotzone: noop,
        unregisterHotzone: noop,
      }}
    >
      {children}
    </GlobalCursorContext.Provider>
  );
}
