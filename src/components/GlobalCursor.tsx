"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CursorIcon = "close" | "drag" | "view" | "download";

export interface HotzoneResult {
  active: true;
  pct: number; // 0–1 progress through the hotzone
  chevron: "next" | "back" | "none";
  hoverType?: "none" | "expand-invert";
  symbol?: string;
  icon?: CursorIcon;
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
  /** Higher priority wins when multiple hotzones match the same point (default 0). */
  registerHotzone: (id: string, testFn: HotzoneTestFn, priority?: number) => void;
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
}: {
  children: React.ReactNode;
}) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const hotzonesRef = useRef<Map<string, { testFn: HotzoneTestFn; priority: number }>>(new Map());
  // Derived from hotzonesRef, recomputed on register/unregister — sorted high→low
  // priority so nested/more-specific hotzones can win over broad catch-alls.
  const sortedHotzonesRef = useRef<HotzoneTestFn[]>([]);

  // Animation state — all in refs for zero React re-renders during mouse movement
  const mousePosRef = useRef({ x: 0, y: 0 });
  const targetPctRef = useRef(0);
  const currentPctRef = useRef(0);
  const activeChevronRef = useRef<"none" | "next" | "back">("none");
  const activeHoverTypeRef = useRef<"none" | "expand-invert">("none");
  const activeSymbolRef = useRef("");
  const activeIconRef = useRef<CursorIcon | "">("");
  const animFrameRef = useRef<number | null>(null);
  const isActiveRef = useRef(false); // whether ANY hotzone is currently matched

  // ── Registration ─────────────────────────────────────────────────────────

  const resortHotzones = useCallback(() => {
    sortedHotzonesRef.current = Array.from(hotzonesRef.current.values())
      .sort((a, b) => b.priority - a.priority)
      .map((entry) => entry.testFn);
  }, []);

  const registerHotzone = useCallback((id: string, testFn: HotzoneTestFn, priority: number = 0) => {
    hotzonesRef.current.set(id, { testFn, priority });
    resortHotzones();
  }, [resortHotzones]);

  const unregisterHotzone = useCallback((id: string) => {
    hotzonesRef.current.delete(id);
    resortHotzones();
  }, [resortHotzones]);

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
    el.style.backgroundColor = "#000000";
    el.style.mixBlendMode = "normal";
    if (hoverType === "expand-invert") {
      el.style.boxShadow = "none";
    } else {
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
    }

    const icon = activeIconRef.current;
    const iconStroke = "#FCFEFF";

    // Symbol Text updates — only when no icon is active for this hotzone
    const symbolSpan = el.querySelector("[data-cursor-symbol='true']") as HTMLSpanElement | null;
    if (symbolSpan) {
      if (hoverType === "expand-invert" && current > 0.5 && !icon && activeSymbolRef.current) {
        symbolSpan.style.display = "block";
        symbolSpan.textContent = activeSymbolRef.current;
        symbolSpan.style.color = "#FCFEFF";
      } else {
        symbolSpan.style.display = "none";
      }
    }

    // Icon SVG updates (close / drag / view / sun / moon)
    const iconEls = el.querySelectorAll("[data-cursor-icon]");
    iconEls.forEach((iconEl) => {
      const key = iconEl.getAttribute("data-cursor-icon");
      const show = hoverType === "expand-invert" && current > 0.5 && icon === key;
      (iconEl as SVGElement).style.display = show ? "block" : "none";
      if (show) {
        iconEl.querySelectorAll("path, line, circle").forEach((shape) => {
          shape.setAttribute("stroke", iconStroke);
        });
      }
    });

    // Chevron SVG updates
    const nextSvg = el.querySelector("[data-cursor-chevron='next']") as SVGElement | null;
    const backSvg = el.querySelector("[data-cursor-chevron='back']") as SVGElement | null;
    const chevron = activeChevronRef.current;

    // Update stroke colors
    const strokeColor = "#FCFEFF";
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

      // Test all registered hotzones, highest priority first
      let matched = false;
      for (const testFn of sortedHotzonesRef.current) {
        const result = testFn(e.clientX, e.clientY);
        if (result.active) {
          targetPctRef.current = result.pct;
          activeChevronRef.current = result.chevron;
          activeHoverTypeRef.current = result.hoverType || "none";
          activeSymbolRef.current = result.symbol || "";
          activeIconRef.current = result.icon || "";
          matched = true;
          break; // highest-priority match wins
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
      document.documentElement.classList.remove("hide-cursor");
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
          backgroundColor: "#000000",
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
            stroke="#FCFEFF"
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
            stroke="#FCFEFF"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Close (×) */}
        <svg
          data-cursor-icon="close"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "none" }}
        >
          <path d="M6 6L18 18" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 6L6 18" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Drag (4-way move) */}
        <svg
          data-cursor-icon="drag"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "none" }}
        >
          <line x1="12" y1="3" x2="12" y2="21" stroke="#FCFEFF" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="#FCFEFF" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 7L12 3L16 7" stroke="#FCFEFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 17L12 21L16 17" stroke="#FCFEFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 8L3 12L7 16" stroke="#FCFEFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 8L21 12L17 16" stroke="#FCFEFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* View / expand (diagonal double arrow) */}
        <svg
          data-cursor-icon="view"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "none" }}
        >
          <path d="M7 17L17 7" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 7H17V15" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 17H7V9" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Download (arrow into tray) */}
        <svg
          data-cursor-icon="download"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          style={{ display: "none" }}
        >
          <path d="M12 3V15" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 10L12 15L17 10" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 19H20" stroke="#FCFEFF" strokeWidth="2" strokeLinecap="round" />
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
