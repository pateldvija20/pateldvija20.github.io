/**
 * The 2D shading system (locked 6 Nov, refs/58 version 2): every part is a
 * lit panel and a shade panel, each filled with a soft gradient that runs
 * lighter at the top-left to darker at the bottom-right, with fine grain on
 * top. No accent shadows and no cast shadows.
 *
 * `lit(c)` and `shade(c)` return fills for any colour; the gradients they
 * need are collected while the shelf renders and written out by <PaintDefs />,
 * which must come after every object in the SVG.
 */

const registry = new Map<string, [string, string]>();

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Mix a colour toward light or dark by t (0..1). Never reaches pure white or black. */
export function mix(hex: string, toward: "light" | "dark", t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = toward === "light" ? [250, 248, 242] : [24, 22, 26];
  const m = (a: number, z: number) => Math.round(a + (z - a) * t);
  return `#${[m(r, target[0]), m(g, target[1]), m(b, target[2])].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function grad(id: string, from: string, to: string) {
  if (!registry.has(id)) registry.set(id, [from, to]);
  return `url(#${id})`;
}

const key = (c: string) => c.replace("#", "").toLowerCase();

/** The lit panel: a soft gradient from a touch lighter to the colour itself. */
export const lit = (c: string) => grad(`lit-${key(c)}`, mix(c, "light", 0.2), c);
/** The shade panel: from slightly darker to darker. */
export const shade = (c: string) => grad(`shade-${key(c)}`, mix(c, "dark", 0.12), mix(c, "dark", 0.3));

export function PaintDefs() {
  return (
    <defs>
      {[...registry.entries()].map(([id, [from, to]]) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      ))}
      {/* Grain: fine noise and a soft mottle multiplied into each fill, clipped to the shape. */}
      <filter id="grain" x="-4000" y="-1000" width="12000" height="3000" filterUnits="userSpaceOnUse">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="fine" />
        <feColorMatrix in="fine" type="matrix" values="0.22 0 0 0 0.78  0.22 0 0 0 0.78  0.22 0 0 0 0.78  0 0 0 0 1" result="fineGrey" />
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="9" result="mottle" />
        <feColorMatrix in="mottle" type="matrix" values="0.14 0 0 0 0.88  0.14 0 0 0 0.88  0.14 0 0 0 0.88  0 0 0 0 1" result="mottleGrey" />
        <feBlend in="SourceGraphic" in2="fineGrey" mode="multiply" result="g1" />
        <feBlend in="g1" in2="mottleGrey" mode="multiply" result="g2" />
        <feComposite in="g2" in2="SourceAlpha" operator="in" />
      </filter>
      <radialGradient id="lampGlow" cx="0.5" cy="0.15" r="0.75">
        <stop offset="0" stopColor="#F9C85B" stopOpacity="0.95" />
        <stop offset="1" stopColor="#F9C85B" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export const INK = "#2B2B2E";
