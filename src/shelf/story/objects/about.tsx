import { useMemo } from "react";
import * as THREE from "three";
import { toy, whiten } from "../toy";
import type { BookSkin, ObjectMeta, ObjectProps } from "./types";

/**
 * The About book: a booq-style softcover notebook (the reference:
 * docs/storyboard/refs/about-lilac-orange-notebooks.webp). A matte lilac card
 * cover printed with thin black lines (a frame inset from the edges, split
 * into a 2 × 2 grid) and tiny black type: "dvija" bottom left, and
 * "about | résumé" set on its side up the right-hand frame line. The card is
 * orange on the inside. It wraps a stitched block of white pages round a
 * soft spine, with two staples on the fold.
 *
 * Object space: origin at the middle of its foot, cover facing +Z, spine at -X.
 */

export const meta: ObjectMeta = {
  name: "about",
  kind: "toy",
  refs: ["docs/storyboard/refs/about-lilac-orange-notebooks.webp"],
  width: 0.6,
  height: 0.95,
  depth: 0.072,
};

/* ---------- Measurements (scene units) ---------- */

const W = 0.6;
const H = 0.95;
/** Thickness at the spine's fold, and at the fore-edge: a stitched booklet is a slight wedge. */
const T = 0.072;
const TF = 0.066;
/** The card cover. */
const CARD = 0.0025;
/** The fold's half-width across: a soft, slightly flattened round. */
const RX = 0.024;
/** Where the fold's round meets the flat of the covers. */
const XS = -W / 2 + RX;
/** Staples on the spine: their middles' heights, and their length. */
const STAPLES = [0.27 * H, 0.73 * H];
const STAPLE_L = 0.056;
const STAPLE_R = 0.0016;

/* ---------- Colours (sRGB) ---------- */

const LILAC = "#B5A8DB";
const ORANGE = "#F2531B";
const EDGE = "#FF4A0F";
const PAPER = "#F6EFE0";
const PRINT = "#0E0D16";
const STEEL = "#D3D6DC";

/* ---------- The printed cover ---------- */

/** Frame inset from the cover's edges, and the printed lines' weight (as on an A5 booq: ~9 mm, ~0.35 mm). */
const FRAME_INSET = 0.036;
const LINE = 0.0011;
const TEX_W = 1536;
const TEX_H = Math.round((TEX_W * H) / W);
const PX = TEX_W / W;
const FONT = '"DM Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
/** Type size: the cap height is about 2% of the cover's width, as booq's. */
const TYPE = 0.0185;

/** Paper grain: fine light and dark flecks plus a few soft fibres, kept very faint. */
function grain(g: CanvasRenderingContext2D, w: number, h: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 11;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n * 1.05;
  }
  g.putImageData(img, 0, 0);
  g.lineWidth = 1;
  for (let i = 0; i < 2600; i++) {
    g.strokeStyle = rnd() > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(70,50,130,0.05)";
    const x = rnd() * w;
    const y = rnd() * h;
    const a = rnd() * Math.PI;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    g.stroke();
  }
}

function drawCover(g: CanvasRenderingContext2D) {
  g.clearRect(0, 0, TEX_W, TEX_H);
  g.fillStyle = LILAC;
  g.fillRect(0, 0, TEX_W, TEX_H);
  grain(g, TEX_W, TEX_H);
  const m = FRAME_INSET * PX;
  const x0 = m;
  const y0 = m;
  const x1 = TEX_W - m;
  const y1 = TEX_H - m;
  g.strokeStyle = PRINT;
  g.lineWidth = LINE * PX;
  g.lineCap = "square";
  g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.beginPath();
  g.moveTo((x0 + x1) / 2, y0);
  g.lineTo((x0 + x1) / 2, y1);
  g.moveTo(x0, (y0 + y1) / 2);
  g.lineTo(x1, (y0 + y1) / 2);
  g.stroke();
  // Tiny type, in the frame's bottom corners.
  const fs = TYPE * PX;
  const gap = fs * 0.62;
  g.fillStyle = PRINT;
  g.font = `500 ${fs}px ${FONT}`;
  g.textBaseline = "alphabetic";
  g.fillText("dvija", x0 + gap * 0.75, y1 - gap);
  // On its side, reading up the right-hand line, the letters' tops toward the spine.
  g.save();
  g.translate(x1 - gap * 0.55, y1 - gap * 1.1);
  g.rotate(-Math.PI / 2);
  g.fillText("about  |  résumé", 0, 0);
  g.restore();
}

/** Redraws the cover's type once DM Sans (loaded by index.css) is ready. */
function whenFont(redraw: () => void) {
  if (typeof document === "undefined" || !document.fonts) return;
  const spec = `500 ${Math.round(TYPE * PX)}px "DM Sans"`;
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

/* ---------- Materials ---------- */

/** Matte card: no gloss, a soft sheen at grazing angles. */
function card(color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return toy(color, { roughness: 0.8, clearcoat: 0, sheen: 0.7, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ECE4FF'), ...extra });
}

/**
 * The page block's cut edges: white paper with the leaves showing as fine
 * lines. The lines are layers along the book's Z (its thickness), so this
 * works on any page block in book space, faces and fore-edge alike; they
 * fade out where they'd be finer than a pixel.
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
        // Most leaves barely part; every so often a deeper seam.
        float dark = 0.05 + 0.07 * h + step(0.86, h) * 0.12;
        diffuseColor.rgb *= 1.0 - line * dark * (1.0 - smoothstep(0.35, 0.7, fw));
      }`,
    );
  };
  m.customProgramCacheKey = () => "about-leaves";
  return m;
}

function makeMaterials() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const g = canvas.getContext("2d")!;
  drawCover(g);
  const art = new THREE.CanvasTexture(canvas);
  art.colorSpace = THREE.SRGBColorSpace;
  art.anisotropy = 16;
  whenFont(() => {
    drawCover(g);
    art.needsUpdate = true;
  });
  const lilac = card(LILAC);
  const sc = document.createElement("canvas");
  sc.width = 128;
  sc.height = 1536;
  const sg = sc.getContext("2d")!;
  const drawSpine = () => {
    sg.fillStyle = LILAC;
    sg.fillRect(0, 0, 128, 1536);
    grain(sg, 128, 1536);
    sg.save();
    sg.translate(64, 768);
    sg.scale(-1, 1);
    sg.rotate(-Math.PI / 2);
    sg.fillStyle = PRINT;
    sg.font = `500 40px ${FONT}`;
    sg.textAlign = "center";
    sg.textBaseline = "middle";
    sg.fillText("about", 0, 0);
    sg.restore();
  };
  drawSpine();
  const spineTex = new THREE.CanvasTexture(sc);
  spineTex.colorSpace = THREE.SRGBColorSpace;
  spineTex.anisotropy = 16;
  whenFont(() => {
    drawSpine();
    spineTex.needsUpdate = true;
  });
  return {
    front: card("#FFFFFF", { map: art }),
    back: lilac,
    spine: card("#FFFFFF", { map: spineTex }),
    inside: card(ORANGE),
    edge: card(EDGE),
    pageEdge: leaves(),
    pageFace: toy(PAPER, { roughness: 0.9, clearcoat: 0, sheen: 0 }),
    steel: whiten(new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.85, roughness: 0.32 })),
  };
}

let shared: ReturnType<typeof makeMaterials> | null = null;
const materials = () => (shared ??= makeMaterials());

/* ---------- Geometry ---------- */

type P = { x: number; z: number; nx: number; nz: number };

/** The front cover's outer face, z at x: thickest at the fold, easing down to the fore-edge. */
function coverZ(x: number) {
  const s = THREE.MathUtils.clamp((x - XS) / (W / 2 - XS), 0, 1);
  const e = s * s * (3 - 2 * s);
  return TF / 2 + ((T - TF) / 2) * (1 - e);
}

/**
 * The book's cross-section (seen from above), as one path from the front
 * cover's fore-edge round the spine to the back cover's fore-edge, pushed
 * in by `inset` along its normals and ending at x = `xEnd`. Symmetric front
 * to back: point j mirrors point n-1-j.
 */
function profile(inset: number, xEnd: number, panel = 18, fold = 24): { pts: P[]; nPanel: number } {
  const front: P[] = [];
  for (let i = 0; i <= panel; i++) {
    // Denser toward the fold, where the cover curves.
    const s = 1 - Math.pow(i / panel, 1.4);
    const x = XS + (xEnd - XS) * s;
    const dz = (coverZ(x + 1e-4) - coverZ(x - 1e-4)) / 2e-4;
    const len = Math.hypot(dz, 1);
    const nx = -dz / len;
    const nz = 1 / len;
    front.push({ x: i === 0 ? xEnd : x - nx * inset, z: coverZ(x) - nz * inset, nx, nz });
  }
  front[0].x = xEnd;
  const arc: P[] = [];
  const RZ = T / 2;
  for (let j = 1; j < fold; j++) {
    const a = Math.PI / 2 + (Math.PI * j) / fold;
    const nx0 = Math.cos(a) / RX;
    const nz0 = Math.sin(a) / RZ;
    const len = Math.hypot(nx0, nz0);
    const nx = nx0 / len;
    const nz = nz0 / len;
    arc.push({ x: XS + RX * Math.cos(a) - nx * inset, z: RZ * Math.sin(a) - nz * inset, nx, nz });
  }
  const back = front.map((p) => ({ x: p.x, z: -p.z, nx: p.nx, nz: -p.nz })).reverse();
  return { pts: [...front, ...arc, ...back], nPanel: front.length };
}

/** Builds an indexed BufferGeometry face by face, in material groups. */
class Build {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  groups: [number, number, number][] = [];
  start = 0;
  v(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number) {
    this.pos.push(x, y, z);
    this.nrm.push(nx, ny, nz);
    this.uv.push(u, w);
    return this.pos.length / 3 - 1;
  }
  /** A triangle, wound to face along its vertices' normals. */
  tri(a: number, b: number, c: number) {
    if (a === b || b === c || a === c) return;
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
    const n = this.nrm;
    const sx = n[a * 3] + n[b * 3] + n[c * 3];
    const sy = n[a * 3 + 1] + n[b * 3 + 1] + n[c * 3 + 1];
    const sz = n[a * 3 + 2] + n[b * 3 + 2] + n[c * 3 + 2];
    if (fx * sx + fy * sy + fz * sz >= 0) this.idx.push(a, b, c);
    else this.idx.push(a, c, b);
  }
  quad(a: number, b: number, c: number, d: number) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  /** Ends the faces added since the last call as one group, drawn with material `m`. */
  group(m: number) {
    const n = this.idx.length - this.start;
    if (n > 0) this.groups.push([this.start, n, m]);
    this.start = this.idx.length;
  }
  /** A strip swept up through y0..y1 along profile points [i0, i1], each point's normal flipped if `inward`. */
  sweep(pts: P[], i0: number, i1: number, y0: number, y1: number, u: (i: number) => number, inward = false) {
    const s = inward ? -1 : 1;
    let prev: [number, number] | null = null;
    for (let i = i0; i <= i1; i++) {
      const p = pts[i];
      const a = this.v(p.x, y0, p.z, p.nx * s, 0, p.nz * s, u(i), y0 / H);
      const b = this.v(p.x, y1, p.z, p.nx * s, 0, p.nz * s, u(i), y1 / H);
      if (prev) this.quad(prev[0], a, b, prev[1]);
      prev = [a, b];
    }
  }
  geometry() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setIndex(this.idx);
    for (const [s, n, m] of this.groups) geo.addGroup(s, n, m);
    geo.computeBoundingSphere();
    return geo;
  }
}

/** Cover materials, in order. */
const C = { front: 0, spine: 1, back: 2, inside: 3, edge: 4 };

/** The cover: one card folded round the spine. Outside (front, spine, back), inside, and its cut edges. */
function coverGeometry() {
  const out = profile(0, W / 2);
  const inn = profile(CARD, W / 2);
  const { pts: o, nPanel } = out;
  const { pts: n } = inn;
  const last = o.length - 1;
  const b = new Build();
  const across = (i: number) => (o[i].x + W / 2) / W;
  b.sweep(o, 0, nPanel - 1, 0, H, across);
  b.group(C.front);
  b.sweep(o, nPanel - 1, last - nPanel + 1, 0, H, (i) => (i - nPanel + 1) / (last - 2 * nPanel + 2));
  b.group(C.spine);
  b.sweep(o, last - nPanel + 1, last, 0, H, (i) => 1 - across(i));
  b.group(C.back);
  b.sweep(n, 0, last, 0, H, (i) => (n[i].x + W / 2) / W, true);
  b.group(C.inside);
  // Head and foot: the card's thickness, all the way round.
  for (const [y, ny] of [
    [H, 1],
    [0, -1],
  ] as const) {
    for (let i = 0; i < last; i++) {
      const a = b.v(o[i].x, y, o[i].z, 0, ny, 0, 0, 0);
      const c = b.v(o[i + 1].x, y, o[i + 1].z, 0, ny, 0, 0, 0);
      const d = b.v(n[i + 1].x, y, n[i + 1].z, 0, ny, 0, 0, 0);
      const e = b.v(n[i].x, y, n[i].z, 0, ny, 0, 0, 0);
      b.quad(a, c, d, e);
    }
  }
  // The fore-edges of the front and back covers.
  for (const i of [0, last]) {
    const q = [
      b.v(o[i].x, 0, o[i].z, 1, 0, 0, 0, 0),
      b.v(n[i].x, 0, n[i].z, 1, 0, 0, 0, 0),
      b.v(n[i].x, H, n[i].z, 1, 0, 0, 0, 0),
      b.v(o[i].x, H, o[i].z, 1, 0, 0, 0, 0),
    ];
    b.quad(q[0], q[1], q[2], q[3]);
  }
  b.group(C.edge);
  return b.geometry();
}

/**
 * The page block: folded sheets nested inside the cover, trimmed flush with
 * it. Only its cut edges (head, foot, fore-edge) show; its faces are the
 * cover's inside, so there's no seam between them for the ink to find.
 */
function blockGeometry() {
  const { pts: p } = profile(CARD, W / 2);
  const last = p.length - 1;
  const y0 = 0;
  const y1 = H;
  const b = new Build();
  // Head and foot: each point paired with its mirror across the middle.
  for (const [y, ny] of [
    [y1, 1],
    [y0, -1],
  ] as const) {
    const vs = p.map((q) => b.v(q.x, y, q.z, 0, ny, 0, (q.x + W / 2) / W, 0.5 + q.z / T));
    for (let j = 0; j < last / 2; j++) {
      const k = last - j;
      if (j + 1 >= k - 1) b.tri(vs[j], vs[j + 1], vs[k]);
      else b.quad(vs[j], vs[j + 1], vs[k - 1], vs[k]);
    }
  }
  // Fore-edge.
  const f = [
    b.v(p[0].x, y0, p[0].z, 1, 0, 0, 0, 0),
    b.v(p[last].x, y0, p[last].z, 1, 0, 0, 1, 0),
    b.v(p[last].x, y1, p[last].z, 1, 0, 0, 1, 1),
    b.v(p[0].x, y1, p[0].z, 1, 0, 0, 0, 1),
  ];
  b.quad(f[0], f[1], f[2], f[3]);
  b.group(0);
  return b.geometry();
}

let geos: { cover: THREE.BufferGeometry; block: THREE.BufferGeometry; staple: THREE.BufferGeometry } | null = null;
const geometries = () =>
  (geos ??= {
    cover: coverGeometry(),
    block: blockGeometry(),
    staple: new THREE.CapsuleGeometry(STAPLE_R, STAPLE_L - STAPLE_R * 2, 3, 8),
  });

/* ---------- The book ---------- */

/** Saddle-stitch staples: their crowns lie along the fold. Book space. */
function Staples({ drawn = false }: ObjectProps) {
  const g = geometries();
  const m = materials();
  // Too small to draw: in the line drawing they fade with the spine and keep out of the ink.
  const ink = { ink: drawn ? "skip" : "color" };
  return (
    <>
      {STAPLES.map((y) => (
        <mesh key={y} geometry={g.staple} material={m.steel} position={[-W / 2 + STAPLE_R * 0.35, y, 0]} castShadow userData={ink} />
      ))}
    </>
  );
}

/**
 * For the book rig (ToyBook.tsx). `coverFront`'s print is mapped 0 to 1
 * across the front cover's face as seen from the front: u from the spine's
 * outer edge (0) to the fore-edge (1), v from the foot (0) to the head (1).
 * The other materials are plain. `pageEdge` draws its leaves as layers
 * along book-space Z, so it needs no particular UVs.
 */
export function skin(): BookSkin {
  const m = materials();
  return {
    board: CARD,
    corner: 0.003,
    coverFront: m.front,
    coverInside: m.inside,
    coverEdge: m.edge,
    backCover: m.back,
    spine: m.spine,
    pageEdge: m.pageEdge,
    pageFace: m.pageFace,
    extras: (props) => <Staples {...props} />,
  };
}

export default function About({ drawn = false }: ObjectProps) {
  const g = geometries();
  const m = materials();
  const coverMats = useMemo(() => [m.front, m.spine, m.back, m.inside, m.edge], [m]);
  const ink = { ink: drawn ? "decor" : "color" };
  const spin = typeof location !== "undefined" ? Number(new URLSearchParams(location.search).get("spin") ?? 0) : 0;
  return (
    <group rotation={[0, THREE.MathUtils.degToRad(spin), 0]}>
      <mesh geometry={g.cover} material={coverMats} castShadow receiveShadow userData={ink} />
      <mesh geometry={g.block} material={m.pageEdge} castShadow receiveShadow userData={ink} />
      <Staples drawn={drawn} />
    </group>
  );
}
