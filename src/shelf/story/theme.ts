import { useEffect, useState } from "react";
import * as THREE from "three";

/**
 * Light and dark (the user, 15 Nov): the page is #F9FCFF in light mode and
 * #010407 in dark; the outline drawings' ink is the other one. It follows the
 * visitor's system setting, with a toggle that's remembered.
 *
 * The 3D side reads the shared colours BG and INK (linear, as three.js
 * holds them); they change in place when the mode does.
 */

export type Mode = "light" | "dark";

export const PALETTE = {
  light: { bg: "#F9FCFF", ink: "#010407" },
  dark: { bg: "#010407", ink: "#F9FCFF" },
} as const;

/** The ink outlines' weight, in CSS pixels (the user: a 1px hairline). */
export const INK_PX = 1;

export const BG = new THREE.Color(PALETTE.light.bg);
export const INK = new THREE.Color(PALETTE.light.ink);
/** The same colours as sRGB values, for shaders that write straight to the screen. */
export const BG_SRGB = new THREE.Color();
export const INK_SRGB = new THREE.Color();

export const theme = { mode: "light" as Mode };

const KEY = "shelf:theme";
const listeners = new Set<(m: Mode) => void>();

export function applyMode(m: Mode, remember = false) {
  theme.mode = m;
  BG.set(PALETTE[m].bg);
  INK.set(PALETTE[m].ink);
  BG_SRGB.copy(BG).convertLinearToSRGB();
  INK_SRGB.copy(INK).convertLinearToSRGB();
  if (typeof document !== "undefined") {
    const r = document.documentElement;
    r.dataset.theme = m;
    r.style.setProperty("--bg", PALETTE[m].bg);
    r.style.setProperty("--ink", PALETTE[m].ink);
    r.style.colorScheme = m;
  }
  if (remember)
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* private mode: just don't remember */
    }
  listeners.forEach((f) => f(m));
}

export function toggleMode() {
  applyMode(theme.mode === "dark" ? "light" : "dark", true);
}

export function onMode(f: (m: Mode) => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

/** The current mode, for React. */
export function useMode(): Mode {
  const [m, setM] = useState(theme.mode);
  useEffect(() => onMode(setM), []);
  return m;
}

if (typeof window !== "undefined") {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    saved = null;
  }
  applyMode(saved === "light" || saved === "dark" ? saved : query.matches ? "dark" : "light");
  // Follow the system until the visitor picks a mode themselves.
  query.addEventListener("change", (e) => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* fall through */
    }
    applyMode(e.matches ? "dark" : "light");
  });
}

/* ---------- Legacy (the brushed dark pass, 14 Nov): still imported by flatArt.ts and pages.ts until they're replaced. ---------- */

export const THEME = {
  bg: "#0E0E0E",
  fill: "#151515",
  chalk: "#EEEAE2",
  muted: "#9C978E",
  soft: "#1C1C1C",
} as const;
