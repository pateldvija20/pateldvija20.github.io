import { useEffect, useState } from "react";
import { MOBILE_BP, SCATTER_MIN_W } from "../responsive";

export type Breakpoint = "mobile" | "tablet" | "desktop";

const read = (): Breakpoint => {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w >= SCATTER_MIN_W) return "desktop";
  if (w > MOBILE_BP) return "tablet";
  return "mobile";
};

/**
 * Which of the three authored widths the viewport is at.
 *
 * Most of the Organised page is laid out with plain CSS breakpoints. This is
 * for the few places where the *structure* changes rather than the spacing —
 * the nav flipping from a full-height sidebar to a top bar — where stacking
 * three conflicting `h-`/`flex-` utilities on one element makes the outcome
 * depend on variant ordering rather than on the design.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(read);
  useEffect(() => {
    const check = () => setBp(read());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}
