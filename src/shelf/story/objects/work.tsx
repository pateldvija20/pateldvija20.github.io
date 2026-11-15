import { useMemo } from "react";
import * as THREE from "three";
import { toy } from "../toy";
import type { BookSkin, ObjectMeta, ObjectProps } from "./types";

/**
 * The Work book: a cloth hardcover. Colour from the Portraits book (a
 * yellow-green matcha cloth, docs/storyboard/refs/work-portraits-chartreuse-cloth.png),
 * type from OIKOS (huge thin geometric letters stacked to fill the cover, in
 * a bright blue foil: work-oikos-olive-cloth.webp, work-oikos-spines-and-cover.png).
 * W O on the first row and R K on the second; the spine has WORK running down
 * it, then "Case studies" and "Dvija Patel" small, as on the OIKOS spines.
 *
 * Built like a real hardcover: a cloth case (two boards and a flat spine with
 * rounded edges, a joint groove either side of the spine) overhanging a cream
 * page block by ~3 mm, whose fine page lines show at head, foot and fore-edge.
 * The cloth has a woven colour map and normal map; the foil is stamped in
 * (a normal-map bevel, smoother and a little metallic).
 *
 * Object space: origin at the middle of its foot, cover facing +Z, spine at -X.
 */

export const meta: ObjectMeta = {
  name: "work",
  kind: "toy",
  refs: [
    "docs/storyboard/refs/work-portraits-chartreuse-cloth.png",
    "docs/storyboard/refs/work-oikos-olive-cloth.webp",
    "docs/storyboard/refs/work-oikos-spines-and-cover.png",
  ],
  width: 0.92,
  height: 1.14,
  depth: 0.19,
};

/* ---------- Measurements (scene units; 1 unit is about 25 cm) ---------- */

const W = 0.92;
const H = 1.14;
const T = 0.19;
/** Board thickness (with its cloth), and the cloth spine's thickness. */
const B = 0.014;
const TS = 0.012;
/** The boards overhang the page block by about 3 mm all round. */
const OVER = 0.012;
/** Rounding of the boards' edges, and of the spine's two edges. */
const RE = 0.004;
const RS = 0.02;
/** Edge rounding at the head and foot. */
const RB = 0.003;
/** Joint groove: centre's distance from the spine, width, depth. */
const GX = 0.056;
const GW = 0.024;
const GD = 0.008;

/* ---------- Colours (sRGB) ---------- */

const CLOTH: [number, number, number] = [148, 138, 26];
const FOIL: [number, number, number] = [56, 156, 248];
const ENDPAPER = "#EFE9D6";
const PAPER = "#F6F1E3";

/* ---------- Textures ---------- */

/** Pixels per scene unit, for every cloth texture, so the weave is one scale everywhere. */
const PXU = 1113;
const TW = 1024;
const TH = Math.round((TW * H) / W);
const SW = Math.round(T * PXU);
const PITCH = 5;
const FONT = '"DM Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';

function rnd(a: number, b: number) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Irregular thread boundaries along one axis: each thread 3 to 8 px wide, so nothing repeats on a grid. */
function threads(n: number, seed: number) {
  const idx = new Int32Array(n);
  const frac = new Float32Array(n);
  let x = 0;
  let t = 0;
  while (x < n) {
    const w = 3 + Math.floor(rnd(t, seed) * 6);
    for (let i = 0; i < w && x + i < n; i++) {
      idx[x + i] = t;
      frac[x + i] = (i + 0.5) / w;
    }
    x += w;
    t++;
  }
  return { idx, frac };
}

/** Value noise along a thread: slubs, where the yarn thickens and thins. */
function slub(t: number, p: number, seed: number) {
  const q = p / 19;
  const i = Math.floor(q);
  const f = q - i;
  const s = f * f * (3 - 2 * f);
  return rnd(t * 31 + i, seed) * (1 - s) + rnd(t * 31 + i + 1, seed) * s;
}

/** A linen-like height field (0 to 1): uneven warp and weft yarns, randomly over and under, with slubs and fibre noise. */
function weaveField(w: number, h: number) {
  const f = new Float32Array(w * h);
  const cols = threads(w, 11);
  const rows = threads(h, 23);
  for (let y = 0; y < h; y++) {
    const cy = rows.idx[y];
    const fy = rows.frac[y];
    for (let x = 0; x < w; x++) {
      const cx = cols.idx[x];
      const fx = cols.frac[x];
      const over = rnd(cx * 7 + 3, cy * 5 + 1) > 0.5 ? 1 : 0;
      const bx = Math.pow(Math.sin(Math.PI * fx), 0.7);
      const by = Math.pow(Math.sin(Math.PI * fy), 0.7);
      const sw = 0.55 + 0.45 * slub(cx, y, 5);
      const sf = 0.55 + 0.45 * slub(cy, x, 6);
      let v = over ? bx * sw * (0.7 + 0.3 * by) : by * sf * (0.7 + 0.3 * bx);
      v += (rnd(x, y) - 0.5) * 0.12;
      f[y * w + x] = Math.min(1, Math.max(0, v));
    }
  }
  return f;
}

let weaveCache: Float32Array | null = null;
const weave = () => (weaveCache ??= weaveField(TW, TH));

function blur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / k;
      s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / k;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/* ---------- The type ---------- */

/**
 * One OIKOS-style letter: thin even strokes, geometric, flush with the cell's
 * top and bottom. Units are scene units; (x, y) is the cell's top-left, y down.
 */
function drawLetter(g: CanvasRenderingContext2D, ch: string, x: number, y: number, w: number, h: number, s: number) {
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.strokeStyle = "#fff";
  g.fillStyle = "#fff";
  g.lineWidth = s;
  g.lineJoin = "miter";
  g.miterLimit = 12;
  g.lineCap = "butt";
  const i = s / 2;
  if (ch === "W") {
    g.beginPath();
    g.moveTo(x + i * 0.5, y - s);
    g.lineTo(x + w * 0.25, y + h - s * 0.2);
    g.lineTo(x + w * 0.5, y + s * 0.3);
    g.lineTo(x + w * 0.75, y + h - s * 0.2);
    g.lineTo(x + w - i * 0.5, y - s);
    g.stroke();
  } else if (ch === "O") {
    g.beginPath();
    g.ellipse(x + w / 2, y + h / 2, (w - s) / 2, (h - s) / 2, 0, 0, Math.PI * 2);
    g.stroke();
  } else if (ch === "R") {
    g.fillRect(x, y, s, h);
    const bh = h * 0.56;
    const rb = (bh - s) / 2;
    g.beginPath();
    g.moveTo(x + i, y + i);
    g.lineTo(x + w - i - rb, y + i);
    g.arc(x + w - i - rb, y + i + rb, rb, -Math.PI / 2, Math.PI / 2);
    g.lineTo(x + i, y + bh - i);
    g.stroke();
    g.beginPath();
    g.moveTo(x + w * 0.4, y + bh - s * 0.3);
    g.lineTo(x + w - i * 0.3, y + h + s);
    g.stroke();
  } else if (ch === "K") {
    g.fillRect(x, y, s, h);
    g.beginPath();
    g.moveTo(x + w - i * 0.2, y - s * 0.4);
    g.lineTo(x + s * 0.7, y + h * 0.58);
    g.stroke();
    g.beginPath();
    g.moveTo(x + w * 0.27, y + h * 0.4);
    g.lineTo(x + w - i * 0.2, y + h + s * 0.4);
    g.stroke();
  }
  g.restore();
}

/** The cover's four letters, W O over R K, filling it the way OIKOS fills its. */
function frontLetters(g: CanvasRenderingContext2D) {
  const left = 0.1;
  const right = 0.07;
  const top = 0.075;
  const bottom = 0.075;
  const gx = 0.045;
  const gy = 0.07;
  const avail = W - left - right - gx;
  const ch = (H - top - bottom - gy) / 2;
  const S = 0.038;
  // Staggered widths, as OIKOS's letters differ: W wide over R narrow, O narrow over K wide.
  const wide = avail * 0.57;
  const narrow = avail - wide;
  const r2 = top + ch + gy;
  drawLetter(g, "W", left, top, wide, ch, S);
  drawLetter(g, "O", left + wide + gx, top, narrow, ch, S);
  drawLetter(g, "R", left, r2, narrow, ch, S);
  drawLetter(g, "K", left + narrow + gx, r2, wide, ch, S);
}

/** The spine, in its own canvas (SW wide, TH tall): WORK down it, then the two small lines. Local frame turned so the type reads downward. */
function spineType(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(SW, 0);
  g.rotate(Math.PI / 2);
  g.scale(PXU, PXU);
  // Local x runs down the spine from the head; local y across it from the front-cover side.
  const lh = 0.134;
  const lw = 0.092;
  const gap = 0.03;
  const y0 = (T - lh) / 2;
  const x0 = 0.09;
  const S = 0.022;
  "WORK".split("").forEach((c, k) => drawLetter(g, c, x0 + k * (lw + gap), y0, lw, lh, S));
  g.fillStyle = "#fff";
  g.textBaseline = "middle";
  g.font = `700 0.034px ${FONT}`;
  g.fillText("Case studies", x0 + 4 * lw + 3 * gap + 0.1, T / 2);
  g.textAlign = "right";
  g.fillText("Dvija Patel", H - 0.09, T / 2);
  g.restore();
}

/** Redraws the spine's small type once DM Sans (loaded by index.css) is ready. */
function whenFont(redraw: () => void) {
  if (typeof document === "undefined" || !document.fonts) return;
  const spec = `700 40px "DM Sans"`;
  let done = false;
  const check = () => {
    if (done || !document.fonts.check(spec)) return;
    done = true;
    redraw();
    document.fonts.removeEventListener("loadingdone", check);
  };
  document.fonts.addEventListener("loadingdone", check);
  document.fonts.load(spec).then(check, () => {});
}

/* ---------- Painting cloth ---------- */

type Layers = { color: HTMLCanvasElement; normal: HTMLCanvasElement; orm: HTMLCanvasElement };

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Paints cloth (and optionally foil stamped into it) onto three canvases:
 * colour, normal map and an occlusion-roughness-metalness map. `rect` is the
 * crop of the weave field, `mask` the foil's coverage (0 to 1) or null.
 */
function paintCloth(layers: Layers, w: number, h: number, mask: Float32Array | null) {
  const wv = weave();
  const crop = (x: number, y: number) => wv[y * TW + x];
  const soft = mask ? blur(mask, w, h, 1) : null;
  const soft2 = mask ? blur(mask, w, h, 3) : null;
  const height = new Float32Array(w * h);
  const col = layers.color.getContext("2d")!.createImageData(w, h);
  const orm = layers.orm.getContext("2d")!.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const wh = crop(x, y);
      const m = mask ? mask[k] : 0;
      const b = soft ? soft[k] : 0;
      const b2 = soft2 ? soft2[k] : 0;
      const vary = 1 + (rnd(Math.floor(x / PITCH), 7) - 0.5) * 0.025 + (rnd(Math.floor(y / PITCH), 9) - 0.5) * 0.025;
      const shade = (0.92 + 0.1 * wh) * vary;
      // Foil: smooth, bright, a hint of the weave through it.
      const fs = 0.98 + 0.03 * wh;
      for (let c = 0; c < 3; c++) {
        col.data[k * 4 + c] = Math.min(255, CLOTH[c] * shade * (1 - m) + FOIL[c] * fs * m);
      }
      col.data[k * 4 + 3] = 255;
      // Stamped in: a pressed-down dish with a soft wall.
      height[k] = wh * (1 - b) - 2.2 * b - 1.2 * b2;
      orm.data[k * 4] = 255;
      orm.data[k * 4 + 1] = Math.round(255 * (0.88 * (1 - b) + 0.3 * b));
      orm.data[k * 4 + 2] = Math.round(255 * 0.6 * b);
      orm.data[k * 4 + 3] = 255;
    }
  }
  layers.color.getContext("2d")!.putImageData(col, 0, 0);
  layers.orm.getContext("2d")!.putImageData(orm, 0, 0);
  const nrm = layers.normal.getContext("2d")!.createImageData(w, h);
  const K = 1.3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xl = height[y * w + Math.max(0, x - 1)];
      const xr = height[y * w + Math.min(w - 1, x + 1)];
      const yu = height[Math.max(0, y - 1) * w + x];
      const yd = height[Math.min(h - 1, y + 1) * w + x];
      let nx = -(xr - xl) * 0.5 * K;
      let ny = (yd - yu) * 0.5 * K;
      const l = Math.hypot(nx, ny, 1);
      nx /= l;
      ny /= l;
      const k = (y * w + x) * 4;
      nrm.data[k] = Math.round((nx * 0.5 + 0.5) * 255);
      nrm.data[k + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nrm.data[k + 2] = Math.round((1 / l) * 0.5 * 255 + 127.5);
      nrm.data[k + 3] = 255;
    }
  }
  layers.normal.getContext("2d")!.putImageData(nrm, 0, 0);
}

function maskOf(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = canvas(w, h);
  const g = c.getContext("2d")!;
  draw(g);
  const d = g.getImageData(0, 0, w, h).data;
  const m = new Float32Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
  return m;
}

function tex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 16;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function makeMaterials() {
  const front: Layers = { color: canvas(TW, TH), normal: canvas(TW, TH), orm: canvas(TW, TH) };
  const frontMask = maskOf(TW, TH, (g) => {
    g.scale(PXU, PXU);
    frontLetters(g);
  });
  paintCloth(front, TW, TH, frontMask);

  const back: Layers = { color: canvas(TW, TH), normal: canvas(TW, TH), orm: canvas(8, 8) };
  paintCloth(back, TW, TH, null);

  const spine: Layers = { color: canvas(SW, TH), normal: canvas(SW, TH), orm: canvas(SW, TH) };
  const paintSpine = () => {
    paintCloth(
      spine,
      SW,
      TH,
      maskOf(SW, TH, (g) => spineType(g)),
    );
  };
  paintSpine();

  const frontTex = { map: tex(front.color, true), normal: tex(front.normal, false), orm: tex(front.orm, false) };
  const spineTex = { map: tex(spine.color, true), normal: tex(spine.normal, false), orm: tex(spine.orm, false) };
  const backTex = { map: tex(back.color, true), normal: tex(back.normal, false) };
  whenFont(() => {
    paintSpine();
    spineTex.map.needsUpdate = true;
    spineTex.normal.needsUpdate = true;
    spineTex.orm.needsUpdate = true;
  });

  const cloth = (extra: THREE.MeshPhysicalMaterialParameters) =>
    toy("#FFFFFF", {
      roughness: 1,
      metalness: 0,
      clearcoat: 0,
      sheen: 0.45,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color("#D9D07A"),
      normalScale: new THREE.Vector2(0.22, 0.22),
      ...extra,
    });
  const stamped = (t: typeof frontTex) =>
    cloth({ map: t.map, normalMap: t.normal, roughnessMap: t.orm, metalnessMap: t.orm, metalness: 1 });

  return {
    front: stamped(frontTex),
    spine: stamped(spineTex),
    back: cloth({ map: backTex.map, normalMap: backTex.normal, roughness: 0.88 }),
    edge: toy(`rgb(${CLOTH.map((c) => Math.round(c * 0.9)).join(",")})`, { roughness: 0.9, clearcoat: 0, sheen: 0.3, sheenRoughness: 0.8 }),
    inside: toy(ENDPAPER, { roughness: 0.92, clearcoat: 0, sheen: 0 }),
    pageEdge: leaves(),
    pageFace: toy(PAPER, { roughness: 0.9, clearcoat: 0, sheen: 0 }),
  };
}

/**
 * The page block's cut edges: cream paper with the leaves showing as fine
 * lines. The lines are layers along the book's Z (its thickness), so this
 * works on any page block in book space; they fade out where they'd be finer
 * than a pixel.
 */
function leaves() {
  const m = toy(PAPER, { roughness: 0.92, clearcoat: 0, sheen: 0 });
  const before = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    before.call(m, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLeaf;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLeaf = position.z;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vLeaf;").replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      {
        float l = vLeaf / 0.0011;
        float id = floor(l);
        float d = min(fract(l), 1.0 - fract(l));
        float fw = fwidth(l);
        float line = 1.0 - smoothstep(0.1, 0.1 + fw * 1.2, d);
        float h = fract(sin(id * 91.3458) * 47453.5453);
        float dark = 0.06 + 0.08 * h + step(0.86, h) * 0.14;
        diffuseColor.rgb *= 1.0 - line * dark * (1.0 - smoothstep(0.35, 0.7, fw));
      }`,
    );
  };
  m.customProgramCacheKey = () => "work-leaves";
  return m;
}

let shared: ReturnType<typeof makeMaterials> | null = null;
const materials = () => (shared ??= makeMaterials());

/* ---------- Geometry ---------- */

type Seg = { x: number; z: number; m: number };
const MAT = { front: 0, spine: 1, back: 2, inside: 3, edge: 4 };

/** The case's cross-section (seen from above), as a closed loop, counter-clockwise in (x, z); each point carries the material of the segment that leaves it. */
function crossSection(): Seg[] {
  const hx = W / 2;
  const ht = T / 2;
  const pts: Seg[] = [];
  const add = (x: number, z: number, m: number) => pts.push({ x, z, m });
  const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n: number, m: number, skipFirst = false) => {
    for (let i = skipFirst ? 1 : 0; i <= n; i++) {
      const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
      add(cx + r * Math.cos(a), cz + r * Math.sin(a), m);
    }
  };
  // Front, outer, from the fore-edge towards the spine, over the joint groove.
  add(hx - RE, ht, MAT.front);
  const GN = 8;
  const gx = -hx + GX;
  for (let k = GN; k >= -GN; k--) {
    const t = k / GN;
    add(gx + (t * GW) / 2, ht - GD * 0.5 * (1 + Math.cos(Math.PI * t)), MAT.front);
  }
  // The spine's two rounded edges and its flat.
  arc(-hx + RS, ht - RS, RS, 90, 180, 8, MAT.spine);
  add(-hx, -ht + RS, MAT.spine);
  arc(-hx + RS, -ht + RS, RS, 180, 270, 8, MAT.spine);
  // Back, outer; the joint groove here too.
  for (let k = -GN; k <= GN; k++) {
    const t = k / GN;
    add(gx + (t * GW) / 2, -ht + GD * 0.5 * (1 + Math.cos(Math.PI * t)), MAT.back);
  }
  // Back board's fore-edge.
  arc(hx - RE, -ht + RE, RE, 270, 360, 4, MAT.edge);
  arc(hx - RE, -ht + B - RE, RE, 0, 90, 4, MAT.edge);
  // Inside: back, round the spine, front.
  add(-hx + TS + 0.002, -ht + B, MAT.inside);
  add(-hx + TS, -ht + B + 0.002, MAT.inside);
  add(-hx + TS, ht - B - 0.002, MAT.inside);
  add(-hx + TS + 0.002, ht - B, MAT.inside);
  // Front board's fore-edge, back to the start.
  arc(hx - RE, ht - B + RE, RE, 270, 360, 4, MAT.edge);
  arc(hx - RE, ht - RE, RE, 0, 90, 4, MAT.edge, true);
  pts.pop();
  return pts;
}

class Build {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  groups: [number, number, number][] = [];
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number) {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.uv.push(u, w);
    return this.pos.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) {
    const p = this.pos;
    const ux = p[b * 3] - p[a * 3];
    const uy = p[b * 3 + 1] - p[a * 3 + 1];
    const uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3];
    const vy = p[c * 3 + 1] - p[a * 3 + 1];
    const vz = p[c * 3 + 2] - p[a * 3 + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    if (fx * fx + fy * fy + fz * fz < 1e-16) return;
    const n = this.nrm;
    const d = fx * (n[a * 3] + n[b * 3] + n[c * 3]) + fy * (n[a * 3 + 1] + n[b * 3 + 1] + n[c * 3 + 1]) + fz * (n[a * 3 + 2] + n[b * 3 + 2] + n[c * 3 + 2]);
    if (d >= 0) this.idx.push(a, b, c);
    else this.idx.push(a, c, b);
  }
}

/** The case: boards and spine as one cloth sheet, swept up the book with rounded head and foot. */
function caseGeometry() {
  const cs = crossSection();
  const n = cs.length;
  // Outward normals of each segment (the loop runs counter-clockwise).
  const sn = cs.map((p, i) => {
    const q = cs[(i + 1) % n];
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: dz / l, z: -dx / l };
  });
  const vn = cs.map((_, i) => {
    const a = sn[(i + n - 1) % n];
    const b = sn[i];
    const l = Math.hypot(a.x + b.x, a.z + b.z) || 1;
    return { x: (a.x + b.x) / l, z: (a.z + b.z) / l };
  });
  // Rings up the book: bottom rounding, top rounding.
  const rings: { y: number; inset: number; f: number; ny: number }[] = [];
  const R = 4;
  for (let j = 0; j <= R; j++) {
    const a = (Math.PI / 2) * (1 - j / R);
    rings.push({ y: RB - RB * Math.sin(a), inset: RB * (1 - Math.cos(a)), f: Math.cos(a), ny: -Math.sin(a) });
  }
  for (let j = 0; j <= R; j++) {
    const a = (Math.PI / 2) * (j / R);
    rings.push({ y: H - RB + RB * Math.sin(a), inset: RB * (1 - Math.cos(a)), f: Math.cos(a), ny: Math.sin(a) });
  }
  const b = new Build();
  const uvOf = (p: Seg, y: number, m: number): [number, number] => {
    if (m === MAT.spine) return [(p.z + T / 2) / T, y / H];
    if (m === MAT.back) return [(W / 2 - p.x) / W, y / H];
    return [(p.x + W / 2) / W, y / H];
  };
  const perMat: number[][] = [[], [], [], [], []];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const m = cs[i].m;
    const start = b.idx.length;
    for (let r = 0; r + 1 < rings.length; r++) {
      const quad: number[] = [];
      for (const [p, k, ring] of [
        [cs[i], i, rings[r]],
        [cs[j], j, rings[r]],
        [cs[j], j, rings[r + 1]],
        [cs[i], i, rings[r + 1]],
      ] as const) {
        const nv = vn[k];
        const x = p.x - nv.x * ring.inset;
        const z = p.z - nv.z * ring.inset;
        const [u, w] = uvOf(p, ring.y, m);
        quad.push(b.v(x, ring.y, z, nv.x * ring.f, ring.ny, nv.z * ring.f, u, w));
      }
      b.tri(quad[0], quad[1], quad[2]);
      b.tri(quad[0], quad[2], quad[3]);
    }
    for (let q = start; q < b.idx.length; q++) perMat[m].push(b.idx[q]);
  }
  // Head and foot: the cut of the case, inset by the rounding.
  const outline = cs.map((p, i) => new THREE.Vector2(p.x - vn[i].x * RB, p.z - vn[i].z * RB));
  const tris = THREE.ShapeUtils.triangulateShape(outline, []);
  for (const [y, ny] of [
    [H, 1],
    [0, -1],
  ] as const) {
    const base = outline.map((o) => b.v(o.x, y, o.y, 0, ny, 0, 0, 0));
    const s = b.idx.length;
    for (const t of tris) b.tri(base[t[0]], base[t[1]], base[t[2]]);
    for (let q = s; q < b.idx.length; q++) perMat[MAT.edge].push(b.idx[q]);
  }
  b.idx = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(b.nrm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
  const all: number[] = [];
  for (let m = 0; m < 5; m++) {
    if (perMat[m].length) geo.addGroup(all.length, perMat[m].length, m);
    all.push(...perMat[m]);
  }
  geo.setIndex(all);
  geo.computeBoundingSphere();
  return geo;
}

/** The page block, inside the case: overhung by the boards on three sides, its spine in the case's. */
function blockGeometry() {
  const x0 = -W / 2 + TS;
  const x1 = W / 2 - OVER;
  const geo = new THREE.BoxGeometry(x1 - x0, H - 2 * OVER, T - 2 * B);
  geo.translate((x0 + x1) / 2, H / 2, 0);
  return geo;
}

let geos: { cover: THREE.BufferGeometry; block: THREE.BufferGeometry } | null = null;
const geometries = () => (geos ??= { cover: caseGeometry(), block: blockGeometry() });

/* ---------- The book ---------- */

/**
 * For the book rig (ToyBook.tsx). `coverFront`'s print is mapped 0 to 1
 * across the front cover's face as seen from the front: u from the spine's
 * outer edge (0) to the fore-edge (1), v from the foot (0) to the head (1).
 */
export function skin(): BookSkin {
  const m = materials();
  return {
    board: B,
    corner: 0.004,
    coverFront: m.front,
    coverInside: m.inside,
    coverEdge: m.edge,
    backCover: m.back,
    spine: m.spine,
    pageEdge: m.pageEdge,
    pageFace: m.pageFace,
  };
}

export default function Work({ drawn = false }: ObjectProps) {
  const g = geometries();
  const m = materials();
  const coverMats = useMemo(() => [m.front, m.spine, m.back, m.inside, m.edge], [m]);
  const ink = { ink: drawn ? "decor" : "color" };
  const spin = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("spin") ?? 0) : 0;
  return (
    <group rotation={[0, THREE.MathUtils.degToRad(spin), 0]}>
      <mesh geometry={g.cover} material={coverMats} castShadow receiveShadow userData={ink} />
      <mesh geometry={g.block} material={m.pageEdge} castShadow receiveShadow userData={ink} />
    </group>
  );
}
