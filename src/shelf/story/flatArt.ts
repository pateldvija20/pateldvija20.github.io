import { STROKE } from "./layout";
import { HANG, MACHINE, allHangLeaves, bandOutline, vineCurve, type HangLeaf, type V2 } from "./design";
import { CROWN, FRONT, GREYS, POT2, STEMS, STREAK, heartHalves, placeOn, type Leaf } from "./plants";
import { THEME } from "./theme";

/**
 * The decor as drawings for the dark site (14 Nov): shapes filled in black
 * and greys, outlined in a chalk-white pencil line. SVG in scene units; one
 * line weight everywhere (STROKE). A filter over each whole drawing gives the
 * line its pencil grain and a slight hand wobble.
 */

/** SVG units per scene unit. */
export const U = 500;
/** One line weight with the shelf and the 3D outlines (the user asked for the same weight everywhere). */
export const LINE = STROKE * U;
/** The pencil line. */
export const INK = THEME.chalk;
/** Inside the shapes, unless a shape says otherwise. */
export const FILL = THEME.fill;

/** An SVG, and the box it covers in the object's own scene units (origin at its foot). */
export type Art = { svg: string; min: V2; max: V2 };

const n = (v: number) => v.toFixed(1);
export const P = ([x, y]: V2) => `${n(x * U)} ${n(-y * U)}`;

/**
 * Pencil: a slight wobble (displacement by fine noise), then grain that dims
 * the light line in specks (out = 0.55·src + 0.45·src·noise). Dark fills
 * barely change; the chalk line goes grainy, like graphite on dark paper.
 */
const PENCIL = `<filter id="pencil" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="4" result="wob"/>
  <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="w"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="1" seed="9" result="g"/>
  <feColorMatrix in="g" type="matrix" values="2.2 0 0 0 -0.55  2.2 0 0 0 -0.55  2.2 0 0 0 -0.55  0 0 0 0 1" result="grain"/>
  <feComposite in="w" in2="grain" operator="arithmetic" k1="0.4" k2="0.6" k3="0" k4="0"/>
</filter>`;

export function wrap(min: V2, max: V2, body: string, px: number, pad = 0.03, pencil = true): Art {
  const x0 = min[0] - pad;
  const y0 = min[1] - pad;
  const x1 = max[0] + pad;
  const y1 = max[1] + pad;
  const vb = [x0 * U, -y1 * U, (x1 - x0) * U, (y1 - y0) * U];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n).join(" ")}" width="${Math.round(vb[2] * px)}" height="${Math.round(vb[3] * px)}"><defs>${pencil ? PENCIL : ""}</defs><g ${pencil ? 'filter="url(#pencil)"' : ""} fill="${FILL}" stroke="${INK}" stroke-width="${n(LINE)}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  return { svg, min: [x0, y0], max: [x1, y1] };
}

export const poly = (pts: V2[]) => `M${pts.map(P).join(" L")} Z`;
const line = (a: V2, b: V2) => `<path d="M${P(a)} L${P(b)}" fill="none"/>`;
const path = (d: string, attrs = "") => `<path d="${d}" ${attrs}/>`;

/** A rectangle with rounded corners, in scene units. */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: number) {
  const q = (c: V2, e: V2) => `Q${P(c)} ${P(e)}`;
  return `M${P([x0 + r, y0])} L${P([x1 - r, y0])} ${q([x1, y0], [x1, y0 + r])} L${P([x1, y1 - r])} ${q([x1, y1], [x1 - r, y1])} L${P([x0 + r, y1])} ${q([x0, y1], [x0, y1 - r])} L${P([x0, y0 + r])} ${q([x0, y0], [x0 + r, y0])} Z`;
}

export const circle = ([x, y]: V2, r: number, attrs = "") => `<circle cx="${n(x * U)}" cy="${n(-y * U)}" r="${n(r * U)}" ${attrs}/>`;
const dot = (c: V2, r: number) => circle(c, r, `fill="${INK}" stroke="none"`);

/* ---------- Leaves ---------- */

let clipId = 0;

/**
 * A heart leaf: its grey, one half turned lighter to the light (the fold),
 * pale streaks curving out from the midrib (clipped to the leaf), the
 * midrib, then the outline.
 */
function heartLeaf(leaf: Leaf) {
  const { left, right } = heartHalves(leaf.L, leaf.asym ?? 0);
  const at = (p: V2) => P(placeOn(p, leaf));
  const back: [V2, V2, V2][] = [
    [right[1][1], right[1][0], right[0][2]],
    [right[0][1], right[0][0], [0, 0]],
  ];
  const outline = `M${at([0, 0])} ${[...left, ...back].map((s) => `C${s.map(at).join(" ")}`).join(" ")} Z`;
  const halfLeft = `M${at([0, 0])} ${left.map((s) => `C${s.map(at).join(" ")}`).join(" ")} Z`;
  const tone = GREYS[leaf.tone];
  const lit = GREYS[Math.min(GREYS.length - 1, leaf.tone + 2)];
  const id = `lc${clipId++}`;
  const L = leaf.L;
  const streaks = Array.from({ length: leaf.streaks }, (_, k) => {
    const t = 0.16 + (k / Math.max(1, leaf.streaks)) * 0.62;
    const side = k % 2 ? 1 : -1;
    const a: V2 = [0, -L * t];
    const c: V2 = [side * 0.22 * L, -L * (t + 0.05)];
    const e: V2 = [side * 0.36 * L * (1 - t * 0.6), -L * (t + 0.2)];
    return `<path d="M${at(a)} Q${at(c)} ${at(e)}" fill="none" stroke="${STREAK}" stroke-width="${n(0.016 * U * (L / 0.18))}" stroke-opacity="0.55"/>`;
  }).join("");
  return (
    `<clipPath id="${id}"><path d="${outline}"/></clipPath>` +
    path(outline, `fill="${tone}" stroke="none"`) +
    path(halfLeft, `fill="${lit}" fill-opacity="${(0.55 * leaf.fold).toFixed(2)}" stroke="none"`) +
    `<g clip-path="url(#${id})">${streaks}</g>` +
    path(`M${at([0, -0.04 * L])} Q${at([0.03 * L, -0.45 * L])} ${at([0, -0.86 * L])}`, 'fill="none"') +
    path(outline, 'fill="none"')
  );
}

/* ---------- The potted plant (the reference's heart-leaf plant) ---------- */

export function pottedPlant(px: number): Art {
  clipId = 0;
  const stems = STEMS.map((s) => path(`M${P(s.from)} Q${P(s.via)} ${P(s.to)}`, 'fill="none"')).join("");
  const P2 = POT2;
  const saucer = path(rrect(-P2.saucerR, 0, P2.saucerR, P2.footY, 0.02), `fill="${GREYS[0]}"`);
  const body = path(poly([[-P2.topR, P2.rimY0], [P2.topR, P2.rimY0], [P2.botR, P2.footY], [-P2.botR, P2.footY]]), `fill="${GREYS[1]}"`);
  // The glaze catching the light down the pot's right side.
  const glaze = path(
    `M${P([0.1, P2.rimY0 - 0.04])} Q${P([0.17, 0.24])} ${P([0.12, 0.1])} L${P([0.155, 0.1])} Q${P([0.205, 0.24])} ${P([0.165, P2.rimY0 - 0.04])} Z`,
    `fill="${GREYS[4]}" fill-opacity="0.55" stroke="none"`,
  );
  const rim = path(rrect(-P2.rimR, P2.rimY0, P2.rimR, P2.rimY1, 0.016), `fill="${GREYS[3]}"`);
  const soilLine = path(`M${P([-0.2, P2.rimY1 - 0.005])} Q${P([0, P2.rimY1 + 0.03])} ${P([0.2, P2.rimY1 - 0.005])}`, 'fill="none"');
  const body2 = stems + CROWN.map(heartLeaf).join("") + saucer + body + glaze + rim + soilLine + FRONT.map(heartLeaf).join("");
  return wrap([-0.56, 0], [0.4, 1.3], body2, px);
}

/** The old name, for the look-dev page. */
export const snakePlant = pottedPlant;

/* ---------- Coffee machine ---------- */

export function coffeeMachine(px: number): Art {
  const M = MACHINE;
  const f = M.feet;
  const g0 = `fill="${GREYS[0]}"`;
  const g1 = `fill="${GREYS[1]}"`;
  const g2 = `fill="${GREYS[2]}"`;
  const g3 = `fill="${GREYS[3]}"`;
  const feet = path(rrect(-f.x - f.w / 2, 0, -f.x + f.w / 2, f.h + 0.01, 0.01), g0) + path(rrect(f.x - f.w / 2, 0, f.x + f.w / 2, f.h + 0.01, 0.01), g0);
  const body = path(poly([[-M.body.x, M.body.y0], [M.body.x, M.body.y0], [M.body.x, M.body.y1], [-M.body.x, M.body.y1]]), `fill="${THEME.fill}"`);
  const b = M.base;
  const base = path(poly([[-b.bot, b.y0], [b.bot, b.y0], [b.top, b.h], [-b.top, b.h]]), g1);
  const gr = M.grille;
  const slots = Array.from({ length: gr.slots }, (_, i) => {
    const x = -gr.x + 0.06 + (i * (gr.x * 2 - 0.12)) / (gr.slots - 1);
    return line([x, gr.y0 + 0.016], [x, gr.y1 - 0.016]);
  }).join("");
  const grille = path(rrect(-gr.x, gr.y0, gr.x, gr.y1, 0.022), g0) + slots;
  const fl = M.float;
  const float = circle([fl.x, fl.y], fl.r, g0) + dot([fl.x, fl.y], 0.007);
  const w = M.warmer;
  const warmer = path(rrect(-w.x, M.band.top - 0.005, w.x, w.y1, w.r), g2);
  const band = path(poly(bandOutline()), g2);
  const trimX = M.band.topX + ((M.band.flareX - M.band.topX) * (M.band.top - M.band.trimY)) / (M.band.top - M.band.flareY) - 0.012;
  const trim = line([-trimX, M.band.trimY], [trimX, M.band.trimY]);
  const buttons = M.dots.map((x) => circle([x, M.controlsY], M.dotR, g0) + dot([x, M.controlsY], 0.008)).join("");
  const G = M.gauge;
  const gc: V2 = [G.x, M.controlsY];
  const ticks = Array.from({ length: 7 }, (_, i) => {
    const a = ((150 - i * 20) * Math.PI) / 180;
    return line([gc[0] + Math.cos(a) * (G.face - 0.016), gc[1] + Math.sin(a) * (G.face - 0.016)], [gc[0] + Math.cos(a) * G.face, gc[1] + Math.sin(a) * G.face]);
  }).join("");
  const na = (65 * Math.PI) / 180;
  const gauge = circle(gc, G.r, g0) + circle(gc, G.face, 'fill="none"') + ticks + line(gc, [gc[0] + Math.cos(na) * G.needle, gc[1] + Math.sin(na) * G.needle]) + dot(gc, 0.012);
  const h = M.head;
  const housing = path(`M${P([h.x0, h.y1])} L${P([h.x0, h.y0 + 0.015])} Q${P([h.x0, h.y0])} ${P([h.x0 + 0.015, h.y0])} L${P([h.x1 - 0.015, h.y0])} Q${P([h.x1, h.y0])} ${P([h.x1, h.y0 + 0.015])} L${P([h.x1, h.y1])} Z`, g3);
  const l = M.lip;
  const H = M.handle;
  const handle = path(`M${P([l.x0 + 0.005, H.y1 + 0.028])} L${P([H.x + 0.04, H.y1])} Q${P([H.x, H.y1 - 0.004])} ${P([H.x + 0.002, (H.y0 + H.y1) / 2])} Q${P([H.x + 0.004, H.y0])} ${P([H.x + 0.045, H.y0 + 0.004])} L${P([l.x0 + 0.005, H.y0 + 0.042])} Z`, g1);
  const basket = path(rrect(l.x0, l.y0, l.x1, l.y1, l.r), g2);
  const spouts = M.spouts.map((x) => path(rrect(x - 0.014, l.y0 - 0.032, x + 0.014, l.y0 + 0.004, 0.006), g2)).join("");
  const k = M.block;
  const d = M.hood;
  const nz = M.nozzle;
  const outlet =
    path(poly([[k.x0, k.y0], [k.x1, k.y0], [k.x1, k.y1], [k.x0, k.y1]]), g3) +
    path(rrect(nz.x0, nz.y0, nz.x1, d.y0 + 0.01, 0.008), g2) +
    path(poly([[d.botX0, d.y0], [d.botX1, d.y0], [d.topX1, d.y1], [d.topX0, d.y1]]), g2);
  const wd = M.wand;
  const wand =
    path(`M${P([wd.x - 0.014, wd.top])} L${P([wd.tipX - 0.014, wd.tipY + 0.022])} Q${P([wd.tipX, wd.tipY - 0.006])} ${P([wd.tipX + 0.014, wd.tipY + 0.022])} L${P([wd.x + 0.014, wd.top])} Z`, g2) +
    line([wd.tipX - 0.016, wd.tipY + 0.06], [wd.tipX + 0.012, wd.tipY + 0.06]) +
    circle([wd.x, wd.top], 0.018, g3);
  return wrap(
    [-0.7, 0],
    [M.band.flareX, w.y1],
    feet + body + base + grille + float + warmer + band + trim + buttons + gauge + housing + handle + basket + spouts + outlet + wand,
    px,
  );
}

/* ---------- Hanging plant ---------- */

/** The hanging plant's leaves, as heart leaves in the same greys. */
function hangLeaf(l: HangLeaf, i: number): Leaf {
  return { at: l.at, angle: l.angle, L: 0.085 * l.s, tone: (i * 3) % GREYS.length, fold: 0.3 + ((i * 7) % 5) * 0.12, streaks: 2 };
}

export function hangingPlant(px: number): Art {
  clipId = 1000;
  const R = HANG.rod;
  const brackets = HANG.brackets.map((x) => path(rrect(x - 0.01, -0.004, x + 0.01, 0.06, 0.005), `fill="${GREYS[2]}"`) + path(rrect(x - 0.022, 0.056, x + 0.022, 0.074, 0.006), `fill="${GREYS[2]}"`)).join("");
  const vines = HANG.vines
    .map((v) => {
      const c = vineCurve(v);
      let d = `M${P(c[0])} C${P(c[1])} ${P(c[2])} ${P(c[3])}`;
      if (v.curl) {
        const e = c[3];
        const s = v.curl;
        d += ` Q${P([e[0] + 0.02 * s, e[1] - 0.022])} ${P([e[0] + 0.03 * s, e[1] - 0.008])} Q${P([e[0] + 0.034 * s, e[1] + 0.006])} ${P([e[0] + 0.02 * s, e[1] + 0.004])}`;
      }
      return path(d, 'fill="none"');
    })
    .join("");
  const rod = path(rrect(R.x0, -R.r, R.x1, R.r, R.r), `fill="${GREYS[3]}"`) + circle([R.x0, 0], R.ball, `fill="${GREYS[3]}"`) + circle([R.x1, 0], R.ball, `fill="${GREYS[3]}"`);
  const kn = HANG.knot;
  const knot = `<ellipse cx="${n(kn.at[0] * U)}" cy="${n(-kn.at[1] * U)}" rx="${n(kn.rx * U)}" ry="${n(kn.ry * U)}" fill="${GREYS[1]}"/>`;
  const all = allHangLeaves();
  const vineLeaves = all.slice(0, -HANG.crown.length).map((l, i) => heartLeaf(hangLeaf(l, i))).join("");
  const crown = HANG.crown.map((l, i) => heartLeaf(hangLeaf(l, i + 20))).join("");
  return wrap([-0.12, -0.26], [0.42, 0.13], brackets + vines + rod + vineLeaves + knot + crown, px);
}

/** The old leaf drawing, kept for the look-dev page. */
export function leafPath(leaf: HangLeaf) {
  return heartLeaf(hangLeaf(leaf, 0));
}
