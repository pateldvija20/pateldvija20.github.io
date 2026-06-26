"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HotzoneResult {
  active: true;
  pct: number; // 0–1 progress through the hotzone
  chevron: "next" | "back";
}

export interface HotzoneInactive {
  active: false;
}

export type HotzoneTestResult = HotzoneResult | HotzoneInactive;

/**
 * A hotzone test function. Given the current viewport mouse coordinates
 * (clientX, clientY), it returns whether the cursor is in a hotzone
 * and, if so, the progress percentage and chevron direction.
 */
export type HotzoneTestFn = (clientX: number, clientY: number) => HotzoneTestResult;

// ── Context ────────────────────────────────────────────────────────────────────

interface GlobalCursorContextValue {
  registerHotzone: (id: string, testFn: HotzoneTestFn) => void;
  unregisterHotzone: (id: string) => void;
}

const GlobalCursorContext = createContext<GlobalCursorContextValue>({
  registerHotzone: () => {},
  unregisterHotzone: () => {},
});

export const useGlobalCursor = () => useContext(GlobalCursorContext);

// ── Provider + Cursor Element ──────────────────────────────────────────────────

export function GlobalCursorProvider({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const hotzonesRef = useRef<Map<string, HotzoneTestFn>>(new Map());

  // Animation state — all in refs for zero React re-renders during mouse movement
  const mousePosRef = useRef({ x: 0, y: 0 });
  const targetPctRef = useRef(0);
  const currentPctRef = useRef(0);
  const activeChevronRef = useRef<"none" | "next" | "back">("none");
  const activeHoverTypeRef = useRef<"none" | "expand-invert">("none");
  const activeSymbolRef = useRef("");
  const animFrameRef = useRef<number | null>(null);
  const isActiveRef = useRef(false); // whether ANY hotzone is currently matched

  // Track isDark in a ref so the animation loop can read it without re-renders
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // ── Registration ─────────────────────────────────────────────────────────

  const registerHotzone = useCallback((id: string, testFn: HotzoneTestFn) => {
    hotzonesRef.current.set(id, testFn);
  }, []);

  const unregisterHotzone = useCallback((id: string) => {
    hotzonesRef.current.delete(id);
  }, []);

  // ── Animation loop ───────────────────────────────────────────────────────

  const updateCursor = useCallback(() => {
    const el = cursorRef.current;
    if (!el) return;

    const target = targetPctRef.current;
    let current = currentPctRef.current;

    // Faster ease when shrinking back (0.25), smoother when growing (0.12)
    const ease = target === 0 ? 0.25 : 0.12;
    current += (target - current) * ease;

    if (Math.abs(current - target) < 0.001) {
      current = target;
    }
    currentPctRef.current = current;

    const dark = isDarkRef.current;

    // Show/hide the animated cursor and toggle the global hide-cursor class
    if (current > 0 || target > 0) {
      el.style.display = "flex";
      document.documentElement.classList.add("hide-cursor");
    } else {
      el.style.display = "none";
      document.documentElement.classList.remove("hide-cursor");
    }

    // Position at viewport mouse coordinates
    el.style.left = `${mousePosRef.current.x}px`;
    el.style.top = `${mousePosRef.current.y}px`;

    const hoverType = activeHoverTypeRef.current;

    // Size interpolation: 12px (dot) → 54px (full)
    const baseSize = 12;
    const maxSize = 54;
    let size = baseSize * (2 * current * current + 1.5 * current + 1);
    if (hoverType === "expand-invert") {
      size = baseSize + (maxSize - baseSize) * current;
    }
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    // Dynamic colors (black and white only, mix-blend-mode: normal)
    el.style.backgroundColor = dark ? "#FCFEFF" : "#000000";
    el.style.mixBlendMode = "normal";
    if (hoverType === "expand-invert") {
      el.style.boxShadow = "none";
    } else {
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    }

    // Symbol Text updates
    const symbolSpan = el.querySelector("[data-cursor-symbol='true']") as HTMLSpanElement | null;
    if (symbolSpan) {
      if (hoverType === "expand-invert" && current > 0.5) {
        symbolSpan.style.display = "block";
        symbolSpan.textContent = activeSymbolRef.current;
        symbolSpan.style.color = dark ? "#000000" : "#FCFEFF";
      } else {
        symbolSpan.style.display = "none";
      }
    }

    // Chevron SVG updates
    const nextSvg = el.querySelector("[data-cursor-chevron='next']") as SVGElement | null;
    const backSvg = el.querySelector("[data-cursor-chevron='back']") as SVGElement | null;
    const chevron = activeChevronRef.current;

    // Update stroke colors
    const strokeColor = dark ? "#000000" : "#FCFEFF";
    if (nextSvg) {
      const path = nextSvg.querySelector("path");
      if (path) path.setAttribute("stroke", strokeColor);
    }
    if (backSvg) {
      const path = backSvg.querySelector("path");
      if (path) path.setAttribute("stroke", strokeColor);
    }

    if (nextSvg) {
      if (chevron === "next" && current > 0) {
        nextSvg.style.display = "block";
        const opacity = current >= 0.2 ? (current - 0.2) / 0.8 : 0;
        nextSvg.style.opacity = String(opacity);
        nextSvg.style.transform = `scale(${current * current})`;
      } else {
        nextSvg.style.display = "none";
      }
    }

    if (backSvg) {
      if (chevron === "back" && current > 0) {
        backSvg.style.display = "block";
        const opacity = current >= 0.2 ? (current - 0.2) / 0.8 : 0;
        backSvg.style.opacity = String(opacity);
        backSvg.style.transform = `scale(${current * current})`;
      } else {
        backSvg.style.display = "none";
      }
    }

    // Continue the loop if we haven't converged
    if (current !== target) {
      animFrameRef.current = requestAnimationFrame(updateCursor);
    } else {
      animFrameRef.current = null;
    }
  }, []);

  const ensureAnimationRunning = useCallback(() => {
    if (animFrameRef.current === null) {
      animFrameRef.current = requestAnimationFrame(updateCursor);
    }
  }, [updateCursor]);

  // ── Global mousemove listener ────────────────────────────────────────────

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      // Test all registered hotzones
      let matched = false;
      for (const testFn of hotzonesRef.current.values()) {
        const result = testFn(e.clientX, e.clientY);
        if (result.active) {
          targetPctRef.current = result.pct;
          activeChevronRef.current = result.chevron;
          activeHoverTypeRef.current = (result as any).hoverType || "none";
          activeSymbolRef.current = (result as any).symbol || "";
          matched = true;
          break; // first match wins
        }
      }

      if (!matched) {
        targetPctRef.current = 0;
        // Keep activeChevronRef as-is so the shrink animation
        // still shows the correct chevron while fading out
      }

      if (matched !== isActiveRef.current) {
        isActiveRef.current = matched;
      }

      ensureAnimationRunning();
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [ensureAnimationRunning]);

  const contextValue = React.useMemo(
    () => ({ registerHotzone, unregisterHotzone }),
    [registerHotzone, unregisterHotzone]
  );

  return (
    <GlobalCursorContext.Provider value={contextValue}>
      {children}

      {/* ── The global animated cursor element ── */}
      <div
        ref={cursorRef}
        style={{
          position: "fixed",
          display: "none",
          left: 0,
          top: 0,
          backgroundColor: isDark ? "#FCFEFF" : "#000000",
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 999999,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          willChange: "left, top, width, height",
        }}
      >
        {/* Next Arrow */}
        <svg
          data-cursor-chevron="next"
          width="11.32"
          height="19.94"
          viewBox="0 0 5.66 9.97"
          fill="none"
          style={{ display: "none", transformOrigin: "center center" }}
        >
          <path
            d="M1 1L5 5L1 9"
            stroke={isDark ? "#000000" : "#FCFEFF"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Back Arrow */}
        <svg
          data-cursor-chevron="back"
          width="11.32"
          height="19.94"
          viewBox="0 0 5.66 9.97"
          fill="none"
          style={{ display: "none", transformOrigin: "center center" }}
        >
          <path
            d="M4.66 1L0.66 5L4.66 9"
            stroke={isDark ? "#000000" : "#FCFEFF"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Symbol Text */}
        <span
          data-cursor-symbol="true"
          style={{
            display: "none",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 400,
            fontSize: "36px",
            lineHeight: "1.2",
            userSelect: "none",
          }}
        />
      </div>
    </GlobalCursorContext.Provider>
  );
}
