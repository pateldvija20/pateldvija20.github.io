/**
 * The view the site opens on: lying under a tree, looking up through it at
 * the sky. Scrolling brings the visitor inside, into the room.
 *
 * Oil pastel illustration. Every leaf is its own ragged blob, a random size
 * with a random edge; branches taper from a thick trunk at the bottom; the
 * sky shows through in patches, with pastel clouds and a small plane now and
 * then. A filter roughs every edge and knocks holes in the colour where the
 * paper's tooth would show through, and a grain sits over everything.
 *
 * The tree follows the season of the visitor's calendar (northern months):
 * fall, winter, spring, summer. `?season=` overrides it for previewing.
 *
 * Built as stacked SVGs on one viewBox: sky, tree, falling things. The tree
 * layer is animated as a whole element, so its filter is rasterised once and
 * the sway is compositor-only. Don't animate anything inside it.
 */

import type { CSSProperties } from "react";

export type Season = "fall" | "winter" | "spring" | "summer";

export function seasonFor(date: Date): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}

// Square, so a 16:9 screen sees the canopy and a phone sees trunk to sky.
const S = 1200;
const VIEWBOX = `0 0 ${S} ${S}`;

type Palette = {
  sky: [string, string];
  cloud: string;
  cloudShade: string;
  limb: string;
  /** Leaf tones, shade to sunlit. Empty for a bare tree. */
  leaves: string[];
  /** Fruit or blossom dotted through the canopy. */
  accents: string[];
  density: number;
  snow?: string;
  fall: { kind: "leaf" | "snow" | "petal"; colors: string[]; count: number };
};

const PALETTES: Record<Season, Palette> = {
  fall: {
    sky: ["#7fc0e4", "#cfe8f2"],
    cloud: "#fbfaf4",
    cloudShade: "#c9dfea",
    limb: "#2a1d17",
    leaves: ["#7a1f12", "#b8361a", "#e0621f", "#f39a2a", "#f7cf45"],
    accents: [],
    density: 1,
    fall: { kind: "leaf", colors: ["#e0621f", "#f39a2a", "#b8361a", "#f7cf45"], count: 12 },
  },
  winter: {
    sky: ["#a9c3d8", "#e6edf2"],
    cloud: "#ffffff",
    cloudShade: "#d3dee8",
    limb: "#2c2622",
    leaves: [],
    accents: [],
    density: 0,
    snow: "#fbfcff",
    fall: { kind: "snow", colors: ["#ffffff", "#f1f5fa"], count: 46 },
  },
  spring: {
    sky: ["#93cdef", "#e3f3fb"],
    cloud: "#ffffff",
    cloudShade: "#d6eaf5",
    limb: "#33261e",
    leaves: ["#4f8a3a", "#78b04a", "#a6d16a", "#f4a6c6", "#fbd3e3"],
    accents: ["#ffffff", "#f7bcd4"],
    density: 0.85,
    fall: { kind: "petal", colors: ["#f7bcd4", "#fbd3e3", "#ffffff"], count: 18 },
  },
  summer: {
    sky: ["#4fa8e6", "#b5e0f7"],
    cloud: "#ffffff",
    cloudShade: "#cfe6f4",
    limb: "#2b211b",
    leaves: ["#17402a", "#24603a", "#3f8a3c", "#79b844", "#c4e26a"],
    accents: ["#f5901f", "#ffad4a"],
    density: 1.15,
    fall: { kind: "leaf", colors: ["#3f8a3c", "#79b844"], count: 4 },
  },
};

// Seeded, so the tree is the same on every load and in every render.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);

// ---- branches: grown recursively from the trunk at the bottom, outwards and up

type Seg = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; w0: number; w1: number; depth: number; angle: number };

const SEGS: Seg[] = (() => {
  const r = rng(19);
  const out: Seg[] = [];
  const grow = (x: number, y: number, angle: number, len: number, w: number, depth: number) => {
    const x1 = x + Math.cos(angle) * len;
    const y1 = y + Math.sin(angle) * len;
    // Bend each limb a little, so nothing is ruler-straight.
    const bend = (r() - 0.5) * len * 0.35;
    const cx = (x + x1) / 2 - Math.sin(angle) * bend;
    const cy = (y + y1) / 2 + Math.cos(angle) * bend;
    const w1 = Math.max(2, w * (0.56 + r() * 0.1));
    out.push({ x0: x, y0: y, x1, y1, cx, cy, w0: w, w1, depth, angle });
    if (depth >= 7) return;
    const kids = depth < 2 ? 3 : 2 + (r() < 0.25 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      // Seen from below, limbs fan out towards the edges of the frame.
      const spread = (k / (kids - 1 || 1) - 0.5) * (depth < 2 ? 1.6 : 1.1);
      const a = angle + spread + (r() - 0.5) * 0.35;
      grow(x1, y1, a, len * (0.62 + r() * 0.18), w1, depth + 1);
    }
  };
  grow(600, S + 60, -Math.PI / 2, 330, 104, 0);
  return out;
})();

/** A tapering limb: a quadratic spine with its two sides offset by the width. */
function limbPath(s: Seg) {
  const n0 = Math.atan2(s.cy - s.y0, s.cx - s.x0) + Math.PI / 2;
  const n1 = Math.atan2(s.y1 - s.cy, s.x1 - s.cx) + Math.PI / 2;
  const nc = (n0 + n1) / 2;
  const wc = (s.w0 + s.w1) / 4;
  const p = (x: number, y: number, n: number, w: number) => `${f1(x + Math.cos(n) * w)} ${f1(y + Math.sin(n) * w)}`;
  return (
    `M${p(s.x0, s.y0, n0, s.w0 / 2)}Q${p(s.cx, s.cy, nc, wc)} ${p(s.x1, s.y1, n1, s.w1 / 2)}` +
    `L${p(s.x1, s.y1, n1, -s.w1 / 2)}Q${p(s.cx, s.cy, nc, -wc)} ${p(s.x0, s.y0, n0, -s.w0 / 2)}Z` +
    // Round the joint so children grow out of it cleanly.
    `M${f1(s.x1 + s.w1 / 2)} ${f1(s.y1)}a${f1(s.w1 / 2)} ${f1(s.w1 / 2)} 0 1 0 ${f1(-s.w1)} 0a${f1(s.w1 / 2)} ${f1(s.w1 / 2)} 0 1 0 ${f1(s.w1)} 0Z`
  );
}

const LIMBS = SEGS.map(limbPath).join("");

// Snow sits along the top of anything closer to level than upright.
const SNOW = SEGS.filter((s) => Math.abs(Math.sin(s.angle)) < 0.8 && s.w0 > 6)
  .map((s) => `M${f1(s.x0)} ${f1(s.y0 - s.w0 * 0.42)}Q${f1(s.cx)} ${f1(s.cy - (s.w0 + s.w1) * 0.24)} ${f1(s.x1)} ${f1(s.y1 - s.w1 * 0.42)}`)
  .join("");
const SNOW_WIDTHS = SEGS.filter((s) => Math.abs(Math.sin(s.angle)) < 0.8 && s.w0 > 6).map((s) => s.w0 * 0.32);

// ---- leaves: ragged blobs of random size, clustered where the limbs end

type Leaf = { d: string; tone: number };

const LEAF_BUDGET = 4200;

/** A leaf with a random edge: points round a rotated ellipse, each pushed in
 *  or out, joined by curves through their midpoints. */
function blob(r: () => number, x: number, y: number, size: number) {
  const k = 6 + Math.floor(r() * 4);
  const rot = r() * Math.PI * 2;
  const squash = 0.35 + r() * 0.45;
  const pts: [number, number][] = [];
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const j = 0.65 + r() * 0.6;
    const ex = Math.cos(a) * size * j;
    const ey = Math.sin(a) * size * squash * j;
    pts.push([x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot)]);
  }
  const mid = (a: [number, number], b: [number, number]) => `${f1((a[0] + b[0]) / 2)} ${f1((a[1] + b[1]) / 2)}`;
  let d = `M${mid(pts[k - 1], pts[0])}`;
  for (let i = 0; i < k; i++) d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${mid(pts[i], pts[(i + 1) % k])}`;
  return d + "Z";
}

function leavesFor(p: Palette, seed: number) {
  if (!p.leaves.length) return { tones: [] as string[], accents: [] as string[] };
  const r = rng(seed);
  const leaves: Leaf[] = [];
  const dots: string[] = [];
  const tips = SEGS.filter((s) => s.depth >= 3);
  // A fixed budget, shared across the tips, keeps the path data small.
  const per = (LEAF_BUDGET * p.density) / tips.length;
  for (const s of tips) {
    const n = Math.max(1, Math.round(per * (s.depth >= 6 ? 1.3 : s.depth === 3 ? 2.2 : 0.7)));
    const spread = 34 + (7 - s.depth) * 18;
    for (let i = 0; i < n; i++) {
      // Along the limb and around its end.
      const t = 0.4 + r() * 0.9;
      const bx = s.x0 + (s.x1 - s.x0) * t;
      const by = s.y0 + (s.y1 - s.y0) * t;
      const rad = Math.sqrt(r()) * spread;
      const th = r() * Math.PI * 2;
      const x = bx + Math.cos(th) * rad;
      const y = by + Math.sin(th) * rad;
      // Mostly small, now and then a big one.
      const size = 5 + Math.pow(r(), 1.8) * 24;
      // Sunlit towards the top and on the outside of a clump.
      const light = 0.22 * (1 - y / S) + 0.28 * (rad / spread) + r() * 0.55;
      const tone = Math.max(0, Math.min(p.leaves.length - 1, Math.floor(light * p.leaves.length)));
      leaves.push({ d: blob(r, x, y, size), tone });
      if (p.accents.length && r() < 0.05) dots.push(`${f1(x)},${f1(y)},${f1(7 + r() * 7)}`);
    }
  }
  const tones = p.leaves.map((_, t) => leaves.filter((l) => l.tone === t).map((l) => l.d).join(""));
  return { tones, accents: dots };
}

// ---- sky

function cloud(x: number, y: number, s: number) {
  const puffs: [number, number, number][] = [
    [0, 0, 60], [70, -40, 80], [160, -20, 70], [230, 10, 54], [120, 30, 70], [40, 30, 52],
  ];
  return puffs.map(([dx, dy, r]) => [x + dx * s, y + dy * s, r * s] as const);
}

const CLOUDS = [cloud(130, 260, 1.1), cloud(780, 150, 1.3), cloud(860, 640, 0.9), cloud(120, 760, 0.8)];

// ---- falling things: each has its own lane, speed and spin

function fallers(p: Palette) {
  const r = rng(99);
  return Array.from({ length: p.fall.count }, (_, i) => {
    const x = r() * S;
    const style = {
      "--dx": `${f1((r() - 0.5) * 260)}px`,
      "--spin": `${Math.round((r() - 0.5) * 720)}deg`,
      animationDuration: `${f1((p.fall.kind === "snow" ? 9 : 11) + r() * 8)}s`,
      animationDelay: `${f1(-r() * 20)}s`,
    } as CSSProperties;
    const fill = p.fall.colors[i % p.fall.colors.length];
    const size = p.fall.kind === "snow" ? 2 + r() * 4 : p.fall.kind === "petal" ? 5 + r() * 4 : 9 + r() * 8;
    const d =
      p.fall.kind === "snow"
        ? `M${f1(x + size)} -40a${f1(size)} ${f1(size)} 0 1 0 ${f1(-size * 2)} 0a${f1(size)} ${f1(size)} 0 1 0 ${f1(size * 2)} 0Z`
        : blob(r, x, -40, size);
    return { d, fill, style };
  });
}

export default function SeasonTree({ season, className }: { season: Season; className?: string }) {
  const p = PALETTES[season];
  const { tones, accents } = leavesFor(p, 42);
  const fall = fallers(p);

  return (
    <div className={`hl-art hl-season-${season} ${className ?? ""}`} aria-hidden="true">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {/* Oil pastel: wobble the edges, then let the paper's tooth show through. */}
          <filter id="p-pastel" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="4" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="10" xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="9" result="tooth" />
            <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -10 6.9" result="mask" />
            <feComposite in="rough" in2="mask" operator="in" />
          </filter>
          <filter id="p-pastel-soft" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="2" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="18" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id={`p-sky-${season}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sky[0]} />
            <stop offset="1" stopColor={p.sky[1]} />
          </linearGradient>
        </defs>
      </svg>

      {/* Sky, clouds, and a plane crossing behind the leaves */}
      <svg className="hl-scene" viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
        <rect width={S} height={S} fill={`url(#p-sky-${season})`} />
        {CLOUDS.map((c, i) => (
          <g key={i} className={i % 2 ? "hl-drift-b" : "hl-drift-a"} filter="url(#p-pastel-soft)">
            {c.map(([x, y, r], j) => (
              <circle key={`s${j}`} cx={x + 8} cy={y + 14} r={r} fill={p.cloudShade} />
            ))}
            {c.map(([x, y, r], j) => (
              <circle key={j} cx={x} cy={y} r={r * 0.94} fill={p.cloud} />
            ))}
          </g>
        ))}
        <g className="hl-plane">
          <path d="M0 0L-180 70" stroke={p.cloud} strokeWidth="5" strokeLinecap="round" opacity="0.55" />
          <path d="M6 -2L-14 2L-10 0L-16 -10L-12 -10L-2 -3L8 -4Q12 -3 8 -1Z" fill="#ffffff" />
        </g>
      </svg>

      {/* The tree, one element so it sways on the compositor */}
      <svg className="hl-scene hl-tree" viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
        <g filter="url(#p-pastel)">
          {tones.slice(0, 2).map((d, i) => (
            <path key={`b${i}`} d={d} fill={p.leaves[i]} />
          ))}
          <path d={LIMBS} fill={p.limb} />
          {p.snow ? (
            <g fill="none" stroke={p.snow} strokeLinecap="round">
              {SNOW.split("M")
                .filter(Boolean)
                .map((d, i) => (
                  <path key={i} d={`M${d}`} strokeWidth={Math.max(2, SNOW_WIDTHS[i])} />
                ))}
            </g>
          ) : null}
          {tones.slice(2).map((d, i) => (
            <path key={`f${i}`} d={d} fill={p.leaves[i + 2]} />
          ))}
          {accents.map((a, i) => {
            const [x, y, r] = a.split(",").map(Number);
            return <circle key={i} cx={x} cy={y} r={r} fill={p.accents[i % p.accents.length]} />;
          })}
        </g>
      </svg>

      {/* Leaves, petals or snow coming down */}
      <svg className="hl-scene" viewBox={VIEWBOX} preserveAspectRatio="xMidYMid slice">
        {fall.map((f, i) => (
          <path key={i} className={`hl-faller hl-faller-${p.fall.kind}`} d={f.d} fill={f.fill} style={f.style} />
        ))}
      </svg>

      <div className="hl-grain" />
    </div>
  );
}
