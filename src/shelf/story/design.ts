/**
 * The decor objects' shapes, in scene units, measured off the storyboard
 * (frames 2, 3, 31). Each has its origin at its foot (bottom middle), x
 * right, y up. flatArt.ts draws them as SVG; InkDecor.tsx builds the same
 * shapes in 3D.
 */

export type V2 = [number, number];

/* ---------- Snake plant ---------- */

/** A tapered pot with a rolled rim, white with black dots (the refs' polka pots). */
export const POT = { topR: 0.262, botR: 0.185, h: 0.52, rimR: 0.282, rimY: 0.45, foot: 0.02, dot: 0.011, dotStep: 0.085 };

/** A sword leaf: base and tip, widest width, sideways bow, depth (for 3D layering), and how many bands cross it. Back to front. */
export type Blade = { base: V2; tip: V2; w: number; bend: number; z: number; bands: number };
export const BLADES: Blade[] = [
  { base: [-0.09, 0.44], tip: [-0.14, 1.26], w: 0.11, bend: -0.015, z: -0.08, bands: 4 },
  { base: [0.08, 0.44], tip: [0.3, 1.03], w: 0.12, bend: 0.03, z: -0.05, bands: 3 },
  { base: [-0.17, 0.44], tip: [-0.225, 1.08], w: 0.13, bend: -0.025, z: -0.02, bands: 3 },
  { base: [0.14, 0.44], tip: [0.235, 0.83], w: 0.09, bend: 0.01, z: 0.02, bands: 2 },
  { base: [-0.1, 0.44], tip: [-0.17, 0.79], w: 0.085, bend: -0.01, z: 0.04, bands: 2 },
  { base: [0.0, 0.44], tip: [0.085, 1.25], w: 0.19, bend: 0.02, z: 0.08, bands: 4 },
];

/** A blade's outline as cubic Béziers (start, then [c1, c2, end] per segment), its midrib, and a point maker. */
export function bladeCurves(b: Blade) {
  const [bx, by] = b.base;
  const dx = b.tip[0] - bx;
  const dy = b.tip[1] - by;
  const L = Math.hypot(dx, dy);
  // Unit normal, pointing to the blade's right.
  const nx = dy / L;
  const ny = -dx / L;
  const p = (t: number, off: number): V2 => {
    const o = off + b.bend * Math.sin(Math.PI * t);
    return [bx + dx * t + nx * o, by + dy * t + ny * o];
  };
  const w = b.w;
  return {
    start: p(0, -0.42 * w),
    segs: [
      [p(0.35, -1.12 * w), p(0.74, -0.62 * w), p(1, 0)],
      [p(0.74, 0.62 * w), p(0.35, 1.12 * w), p(0, 0.42 * w)],
    ] as [V2, V2, V2][],
    rib: [p(0.1, 0), p(0.35, 0), p(0.6, 0), p(0.82, 0)] as [V2, V2, V2, V2],
    p,
  };
}

/** About how far the blade's edge is from its middle line at `t` (0 base to 1 tip). */
export function bladeHalfWidth(b: Blade, t: number) {
  const s = t < 0.38 ? 0.62 + t : 1 - (t - 0.38) * 1.45;
  return 0.5 * b.w * Math.max(0, s);
}

/* ---------- Coffee machine (frame 31) ---------- */

export const MACHINE = {
  depth: 0.9,
  feet: { x: 0.45, w: 0.1, h: 0.03 },
  /** Drip unit: bottom half-width, top half-width, top. */
  base: { bot: 0.575, top: 0.59, y0: 0.03, h: 0.18 },
  /** Its grille window, and the float that shows when it's full. */
  grille: { x: 0.42, y0: 0.075, y1: 0.135, slots: 13 },
  float: { x: 0.5, y: 0.105, r: 0.022 },
  /** Body: the two side walls at ±x, from the drip unit up to the band. */
  body: { x: 0.5, y0: 0.18, y1: 0.94 },
  /** Top band: top edge half-width, flared half-width near its foot, heights. */
  band: { top: 1.2, topX: 0.565, flareY: 0.975, flareX: 0.625, bottom: 0.94, innerX: 0.6, trimY: 1.165 },
  /** The cup-warmer plate on top. */
  warmer: { x: 0.5, y1: 1.235, r: 0.012 },
  controlsY: 1.08,
  dots: [-0.42, -0.315, -0.22, 0.208, 0.303, 0.42],
  dotR: 0.026,
  gauge: { x: 0, r: 0.095, face: 0.073, needle: 0.058 },
  /** Group head (left), the portafilter's basket and handle, its two spouts. */
  head: { x0: -0.39, x1: -0.16, y0: 0.8, y1: 0.94 },
  lip: { x0: -0.41, x1: -0.14, y0: 0.72, y1: 0.8, r: 0.02 },
  handle: { x: -0.67, y0: 0.7, y1: 0.752 },
  spouts: [-0.31, -0.24],
  /** Hot water outlet (right): block, the hood flaring below it, its nozzle. */
  block: { x0: 0.12, x1: 0.37, y0: 0.8, y1: 0.94 },
  hood: { topX0: 0.12, topX1: 0.37, botX0: 0.06, botX1: 0.43, y0: 0.61, y1: 0.8, r: 0.025 },
  nozzle: { x0: 0.225, x1: 0.265, y0: 0.585 },
  /** Steam wand, under the band's right flare. */
  wand: { x: 0.562, top: 0.93, tipX: 0.58, tipY: 0.6 },
};

/** The band's front outline, as a closed polygon (counter-clockwise). */
export function bandOutline(): V2[] {
  const b = MACHINE.band;
  return [
    [-b.innerX, b.bottom],
    [b.innerX, b.bottom],
    [b.flareX, b.flareY],
    [b.topX, b.top],
    [-b.topX, b.top],
    [-b.flareX, b.flareY],
  ];
}

/* ---------- Hanging plant (top right of the screen) ---------- */

/** Leaf length. */
export const LEAF = 0.075;

/** A heart-shaped leaf, base at the origin, tip straight down at (0, -L): its two halves as cubic Béziers. */
export function leafHalves(L: number) {
  const half = (d: number) =>
    [
      [
        [d * 0.33 * L, 0.14 * L],
        [d * 0.45 * L, -0.4 * L],
        [d * 0.3 * L, -0.62 * L],
      ],
      [
        [d * 0.19 * L, -0.79 * L],
        [d * 0.07 * L, -0.88 * L],
        [0, -L],
      ],
    ] as [V2, V2, V2][];
  return { left: half(-1), right: half(1) };
}

/** A leaf: where its base is, which way its tip points (radians from straight down, + = towards +x), its size. */
export type HangLeaf = { at: V2; angle: number; s: number; z: number };

function cubic(a: V2, b: V2, c: V2, d: V2, t: number): V2 {
  const u = 1 - t;
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [a[0] * k[0] + b[0] * k[1] + c[0] * k[2] + d[0] * k[3], a[1] * k[0] + b[1] * k[1] + c[1] * k[2] + d[1] * k[3]];
}

export type Vine = { from: V2; len: number; sway: number; leaves: number; seed: number; curl?: number };

/**
 * Local to the rod's left end. A short rail on two wall brackets with ball
 * ends; a trailing plant sits on its left end, spilling over it. Compact, so
 * it hangs clear of the machine on wide screens.
 */
export const HANG = {
  rod: { x0: -0.035, x1: 0.38, r: 0.011, ball: 0.019 },
  brackets: [0.06, 0.32],
  knot: { at: [0.045, 0.012] as V2, rx: 0.07, ry: 0.024 },
  vines: [
    { from: [0.0, -0.005], len: 0.13, sway: 0.02, leaves: 4, seed: 0, curl: -1 },
    { from: [0.05, -0.01], len: 0.1, sway: -0.018, leaves: 3, seed: 1 },
    { from: [0.095, -0.005], len: 0.12, sway: 0.016, leaves: 4, seed: 0, curl: 1 },
    { from: [0.27, -0.01], len: 0.06, sway: -0.01, leaves: 2, seed: 1 },
  ] as Vine[],
  /** Leaves standing up out of the top of the plant, left to right. */
  crown: [
    { at: [-0.005, 0.02], angle: -Math.PI * 0.68, s: 0.85, z: -0.02 },
    { at: [0.025, 0.03], angle: -Math.PI * 0.86, s: 0.95, z: -0.01 },
    { at: [0.055, 0.032], angle: Math.PI * 0.97, s: 1.0, z: 0 },
    { at: [0.085, 0.03], angle: Math.PI * 0.84, s: 0.9, z: 0.01 },
    { at: [0.11, 0.02], angle: Math.PI * 0.66, s: 0.8, z: 0.02 },
  ] as HangLeaf[],
};

export function vineCurve(v: Vine): [V2, V2, V2, V2] {
  const [x, y] = v.from;
  return [
    [x, y],
    [x + v.sway, y - v.len * 0.33],
    [x - v.sway * 0.8, y - v.len * 0.66],
    [x + v.sway * 0.4, y - v.len],
  ];
}

export function vineLeaves(v: Vine): HangLeaf[] {
  const c = vineCurve(v);
  return Array.from({ length: v.leaves }, (_, i) => {
    const t = 0.18 + (i / Math.max(1, v.leaves - 1)) * 0.82;
    const side = (i + v.seed) % 2 ? 1 : -1;
    const tilt = 0.55 + ((i * 13 + v.seed * 5) % 4) * 0.1;
    return {
      at: cubic(c[0], c[1], c[2], c[3], t),
      angle: side * tilt,
      s: 0.82 + ((i * 7 + v.seed * 3) % 5) * 0.06,
      z: 0.01 * side,
    };
  });
}

export function allHangLeaves(): HangLeaf[] {
  return [...HANG.vines.flatMap(vineLeaves), ...HANG.crown];
}

/** Rotates and places a local point of a leaf. */
export function placeLeafPoint(p: V2, leaf: HangLeaf): V2 {
  const c = Math.cos(leaf.angle);
  const s = Math.sin(leaf.angle);
  const x = p[0] * leaf.s;
  const y = p[1] * leaf.s;
  // Angle 0 points the tip down (-y); positive swings the tip towards +x.
  return [leaf.at[0] + x * c - y * s, leaf.at[1] + x * s + y * c];
}
