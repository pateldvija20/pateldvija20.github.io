import type { V2 } from "./design";

/**
 * The plants, after the user's reference (14 Nov: a lush heart-leaf plant,
 * leaves twisting every way, pale streaks along the veins), in black and
 * greys for the dark site, outlined in pencil. Scene units, origin at the
 * pot's foot; flatArt.ts draws them.
 */

/** Greys, darkest to lightest: leaves pick from these so neighbours separate. */
export const GREYS = ["#1C1C1C", "#252525", "#2E2E2E", "#383838", "#424242"];
export const STREAK = "#77736C";

/**
 * A heart leaf: base (where the stem meets it), which way the tip points
 * (radians, 0 = straight down, + towards +x, π = up), length, a grey (index
 * into GREYS), how much one half is turned to the light (the fold), how many
 * pale streaks, and a slight lean of the outline (asym).
 */
export type Leaf = { at: V2; angle: number; L: number; tone: number; fold: number; streaks: number; asym?: number };

/** The leaf's two halves, base at the origin, tip at (0, -L), as cubic Béziers from the base. */
export function heartHalves(L: number, asym = 0) {
  const half = (d: number) => {
    const w = d < 0 ? 1 - asym : 1 + asym;
    return [
      [
        [d * 0.3 * L * w, 0.13 * L],
        [d * 0.56 * L * w, -0.14 * L],
        [d * 0.44 * L * w, -0.46 * L],
      ],
      [
        [d * 0.34 * L * w, -0.72 * L],
        [d * 0.1 * L * w, -0.9 * L],
        [0, -L],
      ],
    ] as [V2, V2, V2][];
  };
  return { left: half(-1), right: half(1) };
}

export function placeOn(p: V2, leaf: Leaf): V2 {
  const c = Math.cos(leaf.angle);
  const s = Math.sin(leaf.angle);
  return [leaf.at[0] + p[0] * c - p[1] * s, leaf.at[1] + p[0] * s + p[1] * c];
}

/* ---------- The potted plant ---------- */

/** A tapered pot on a saucer, glazed: a grey body, a lighter rim. */
export const POT2 = { rimY0: 0.42, rimY1: 0.5, rimR: 0.27, topR: 0.25, botR: 0.19, footY: 0.045, saucerR: 0.26 };

/** Stems from the soil to the leaves, as quadratic curves: from, bend, to. */
export type Stem = { from: V2; via: V2; to: V2 };

const soil: V2 = [0, 0.47];

/**
 * Back to front. The crown rises and leans left; two vines spill over the
 * rim, the longer one trailing down the left of the pot. It keeps to the
 * right of x = 0.34, so it doesn't crowd the books beside it.
 */
export const CROWN: Leaf[] = [
  { at: [-0.06, 1.02], angle: Math.PI * 0.94, L: 0.22, tone: 1, fold: 0.6, streaks: 4 },
  { at: [0.1, 1.06], angle: -Math.PI * 0.9, L: 0.21, tone: 3, fold: 0.3, streaks: 3, asym: 0.1 },
  { at: [-0.24, 0.92], angle: -Math.PI * 0.74, L: 0.2, tone: 2, fold: 0.7, streaks: 4 },
  { at: [0.2, 0.9], angle: Math.PI * 0.7, L: 0.17, tone: 0, fold: 0.5, streaks: 2 },
  { at: [-0.38, 0.74], angle: -Math.PI * 0.6, L: 0.18, tone: 3, fold: 0.4, streaks: 3, asym: -0.1 },
  { at: [-0.02, 0.84], angle: Math.PI * 1.04, L: 0.19, tone: 4, fold: 0.5, streaks: 4 },
  { at: [0.24, 0.72], angle: Math.PI * 0.42, L: 0.15, tone: 2, fold: 0.6, streaks: 2 },
  { at: [-0.18, 0.72], angle: -Math.PI * 0.28, L: 0.16, tone: 1, fold: 0.4, streaks: 3 },
  { at: [0.08, 0.7], angle: Math.PI * 0.2, L: 0.17, tone: 3, fold: 0.7, streaks: 3 },
  { at: [-0.32, 0.6], angle: -Math.PI * 0.12, L: 0.14, tone: 4, fold: 0.3, streaks: 2 },
];

/** Leaves in front of the pot: one lolling over the rim, and the trailing vines'. */
export const FRONT: Leaf[] = [
  { at: [-0.06, 0.52], angle: -Math.PI * 0.2, L: 0.14, tone: 2, fold: 0.6, streaks: 3 },
  { at: [0.13, 0.5], angle: Math.PI * 0.24, L: 0.13, tone: 0, fold: 0.5, streaks: 2 },
  { at: [-0.31, 0.4], angle: -Math.PI * 0.08, L: 0.13, tone: 3, fold: 0.4, streaks: 3 },
  { at: [-0.4, 0.22], angle: Math.PI * 0.06, L: 0.12, tone: 1, fold: 0.6, streaks: 2 },
  { at: [-0.44, 0.06], angle: -Math.PI * 0.1, L: 0.1, tone: 4, fold: 0.3, streaks: 2 },
  { at: [0.29, 0.34], angle: Math.PI * 0.1, L: 0.12, tone: 2, fold: 0.5, streaks: 2 },
];

export const STEMS: Stem[] = [
  ...CROWN.map((l) => ({ from: soil, via: [l.at[0] * 0.35, (soil[1] + l.at[1]) / 2 + 0.04] as V2, to: l.at })),
  { from: soil, via: [-0.05, 0.56], to: FRONT[0].at },
  { from: soil, via: [0.08, 0.56], to: FRONT[1].at },
  // The long vine: over the rim on the left and down the pot's side.
  { from: soil, via: [-0.3, 0.6], to: [-0.31, 0.4] },
  { from: [-0.31, 0.4], via: [-0.38, 0.33], to: [-0.4, 0.22] },
  { from: [-0.4, 0.22], via: [-0.44, 0.14], to: [-0.44, 0.06] },
  // A short one on the right.
  { from: soil, via: [0.26, 0.56], to: [0.29, 0.34] },
];
