import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { inkFill } from "../InkPass";
import { toy } from "../toy";
import type { BookSkin, ObjectMeta, ObjectProps } from "./types";

/**
 * The Playground book: a kraft spiral sketchbook (refs/playground-kraft-
 * spiral-sketchbook.webp, "the spiral experiment book should be cardboard").
 * A plain kraft cardboard cover, a thick block of white sketch paper, a grey
 * chipboard back, bound along the top with black double-loop wire-o: a pair
 * of wire rings through each punched slot, round the top edge and back in
 * through the back board.
 *
 * Origin at the middle of its foot, cover facing +Z, bound along the top.
 * Seen spine-on (frames 2 and 3) the rings line up into one circle: the dome.
 *
 * Drawn (frame 2): the same model, page-white, outlined by the ink pass. The
 * wire is swapped for a hairline-thin copy, so each ring inks as one line
 * (the full-thickness wire, end-on, would ink as two lines per ring and blot
 * into a black band).
 */

/** The book: cover size, thickness with the pages, and its layers front to back. */
export const PG = {
  w: 1.5,
  h: 1.264,
  t: 0.15,
  /** Kraft cover board, grey back board. */
  board: 0.02,
  back: 0.028,
  /** Between the pages and the cover (the cover hangs from the coil). */
  gap: 0.006,
  /** Cover and board corners, front-on: nearly square, like the photo. */
  corner: 0.012,
  /** How far the page block sits in from the boards at the sides and foot. */
  inset: 0.008,
};

/** z of each layer's faces (closed, in colour). */
const Z = {
  backRear: -PG.t / 2,
  backFront: -PG.t / 2 + PG.back,
  blockFront: PG.t / 2 - PG.board - PG.gap,
  coverBack: PG.t / 2 - PG.board,
  coverFront: PG.t / 2,
};

/**
 * The wire-o: pairs of rings, one pair through each slot. The axis runs
 * across the top at (y, z); the rig hinges the cover about it.
 */
export const COIL = {
  pairs: 30,
  /** First and last slot centres in from the side edges. */
  margin: 0.05,
  /** Ring radius (about the axis), wire radius, and the drawn hairline's radius. */
  r: 0.065,
  wire: 0.0022,
  thin: 0.0012,
  /** Half the distance between a pair's two rings. */
  spread: 0.006,
  y: PG.h - 0.01,
  z: 0,
};
const PITCH = (PG.w - COIL.margin * 2) / (COIL.pairs - 1);
const slotX = (k: number) => -PG.w / 2 + COIL.margin + k * PITCH;

/** The punched slots (in cover, pages and back board): size, centre height, corner. */
export const SLOT = { w: 0.02, h: 0.02, y: PG.h - 0.055, r: 0.01 };

export const meta: ObjectMeta = {
  name: "playground",
  kind: "toy",
  refs: ["docs/storyboard/refs/playground-kraft-spiral-sketchbook.webp"],
  width: PG.w,
  height: COIL.y + COIL.r + COIL.wire,
  depth: COIL.r * 2,
};

/* ---------- Textures ---------- */

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Texels per scene unit on the cover maps. */
const TPU = 1365;

/**
 * Kraft board: warm brown, faint mottling, short fibres light and dark, a
 * scatter of dark flecks and fine grain. Mapped across the whole cover
 * (uv = x, y about the cover's centre, as faceMap does), with the slots
 * painted dark where they're punched, so a plain slab still reads right.
 */
function kraftCanvas(scale: number, seed: number) {
  const W = Math.round(PG.w * TPU * scale);
  const H = Math.round(PG.h * TPU * scale);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = rng(seed);
  g.fillStyle = "#A27248";
  g.fillRect(0, 0, W, H);
  // Mottling: big soft patches, a shade lighter or darker.
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = r() * H;
    const rad = (0.08 + r() * 0.3) * W;
    const light = r() > 0.5;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, light ? "rgba(200,144,96,0.10)" : "rgba(140,92,52,0.10)");
    grd.addColorStop(1, "rgba(170,116,70,0)");
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Fibres: short, slightly bent strokes in every direction.
  const fibres = Math.round(22000 * scale * scale);
  g.lineCap = "round";
  for (let i = 0; i < fibres; i++) {
    const x = r() * W;
    const y = r() * H;
    const len = (3 + r() * 14) * scale;
    const a = r() * Math.PI * 2;
    const bend = (r() - 0.5) * 0.8;
    const light = r() > 0.45;
    g.strokeStyle = light ? `rgba(236,190,144,${0.16 + r() * 0.3})` : `rgba(110,68,36,${0.14 + r() * 0.28})`;
    g.lineWidth = (0.5 + r() * 0.9) * scale;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + bend) * len * 0.5, y + Math.sin(a + bend) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  // Flecks: dark bits of bark, a few light ones.
  for (let i = 0; i < 1400 * scale * scale; i++) {
    const dark = r() > 0.25;
    g.fillStyle = dark ? `rgba(70,42,22,${0.3 + r() * 0.45})` : `rgba(240,205,165,${0.35 + r() * 0.3})`;
    g.beginPath();
    g.ellipse(r() * W, r() * H, (0.5 + r() * 1.6) * scale, (0.4 + r() * 1.0) * scale, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // Grain.
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 18;
    d[i] += n;
    d[i + 1] += n * 0.85;
    d[i + 2] += n * 0.7;
  }
  g.putImageData(img, 0, 0);
  // The slots, dark, for a cover drawn without holes (the real holes cut them out).
  g.fillStyle = "#2A211B";
  for (let k = 0; k < COIL.pairs; k++) {
    const cx = (slotX(k) + PG.w / 2) * TPU * scale;
    const cy = (PG.h - SLOT.y) * TPU * scale;
    const sw = (SLOT.w - 0.004) * TPU * scale;
    const sh = (SLOT.h - 0.004) * TPU * scale;
    g.beginPath();
    g.roundRect(cx - sw / 2, cy - sh / 2, sw, sh, SLOT.r * TPU * scale);
    g.fill();
  }
  return c;
}

/** A quiet "Playground", debossed into the kraft, bottom right. */
function deboss(c: HTMLCanvasElement, scale: number) {
  const g = c.getContext("2d")!;
  const px = 0.036 * TPU * scale;
  g.font = `500 ${px}px "DM Sans", ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = "right";
  g.textBaseline = "alphabetic";
  const x = c.width - 0.085 * TPU * scale;
  const y = c.height - 0.085 * TPU * scale;
  const o = 1.6 * scale;
  // Lit from the upper left: the pressed-in letters' lower right walls catch the light, the upper left ones are in shade.
  g.fillStyle = "rgba(236,190,145,0.75)";
  g.fillText("Playground", x + o, y + o);
  g.fillStyle = "rgba(60,34,16,0.8)";
  g.fillText("Playground", x - o * 0.7, y - o * 0.7);
  g.fillStyle = "rgba(104,64,34,0.95)";
  g.fillText("Playground", x, y);
}

/** Grey chipboard: tiled. */
function chipCanvas() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const r = rng(77);
  g.fillStyle = "#77706B";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = r() * S;
    const y = r() * S;
    const light = r() > 0.5;
    g.fillStyle = light ? `rgba(160,152,146,${0.15 + r() * 0.25})` : `rgba(50,45,42,${0.12 + r() * 0.25})`;
    const s = 0.6 + r() * 2.2;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) g.fillRect(x + dx, y + dy, s, s * (0.4 + r()));
  }
  const img = g.getImageData(0, 0, S, S);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Fibre height for the kraft's bump: tiled. */
function fibreBumpCanvas() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const r = rng(5);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, S, S);
  g.lineCap = "round";
  for (let i = 0; i < 2200; i++) {
    const x = r() * S;
    const y = r() * S;
    const len = 4 + r() * 16;
    const a = r() * Math.PI * 2;
    g.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${0.15 + r() * 0.25})` : `rgba(0,0,0,${0.15 + r() * 0.25})`;
    g.lineWidth = 0.6 + r() * 1.2;
    for (const dx of [-S, 0, S])
      for (const dy of [-S, 0, S]) {
        g.beginPath();
        g.moveTo(x + dx, y + dy);
        g.lineTo(x + dx + Math.cos(a) * len, y + dy + Math.sin(a) * len);
        g.stroke();
      }
  }
  return c;
}

const faceMap = (t: THREE.Texture) => {
  // uv = (x, y) in scene units about the cover's centre (ExtrudeGeometry's caps).
  t.repeat.set(1 / PG.w, 1 / PG.h);
  t.offset.set(0.5, 0.5);
  return t;
};

/* ---------- Materials ---------- */

/**
 * Paper seen edge-on: one fine line per sheet, the sheets a touch uneven.
 * Procedural on the mesh's own z (sheets stack front to back), so it works on
 * any page-block geometry whose local z runs front to back.
 */
function pageEdgeMaterial() {
  const m = toy("#F4F1EB", { roughness: 0.95, clearcoat: 0, sheen: 0 });
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (s, r) => {
    base.call(m, s, r);
    s.vertexShader = s.vertexShader
      .replace("void main() {", "varying float vSheetZ;\nvoid main() {")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSheetZ = position.z;");
    s.fragmentShader = s.fragmentShader.replace("void main() {", "varying float vSheetZ;\nvoid main() {").replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      {
        float s = vSheetZ / 0.0052;
        float fw = fwidth(s);
        float f = fract(s);
        float d = min(f, 1.0 - f);
        float line = (1.0 - smoothstep(0.0, max(fw * 1.2, 0.09), d)) * (1.0 - smoothstep(0.35, 0.7, fw));
        float h = fract(sin(floor(s) * 91.7) * 43758.5453);
        float zb = vSheetZ + 0.058;
        float sh = 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.014, zb)) - 0.55 * (1.0 - smoothstep(0.0, 0.0025, zb));
        diffuseColor.rgb *= sh * (1.0 - 0.2 * line) * (0.965 + 0.05 * h);
      }`,
    );
  };
  m.customProgramCacheKey = () => "whiten-pageedge";
  return m;
}

type Kit = ReturnType<typeof buildKit>;
let kitCache: Kit | null = null;
/** Everything the book is made of, built once and shared (the lab, the scene and skin() all use it). */
function kit() {
  return (kitCache ??= buildKit());
}

function buildKit() {
  const front = new THREE.CanvasTexture(kraftCanvas(1.5, 11));
  const inside = new THREE.CanvasTexture(kraftCanvas(0.75, 23));
  for (const t of [front, inside]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    faceMap(t);
  }
  // The label waits for its font.
  const label = () => {
    deboss(front.image as HTMLCanvasElement, 1.5);
    front.needsUpdate = true;
  };
  const font = '500 40px "DM Sans"';
  if (document.fonts.check(font)) label();
  else document.fonts.load(font).then(label, label);

  const bump = new THREE.CanvasTexture(fibreBumpCanvas());
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(5, 5);
  const chip = new THREE.CanvasTexture(chipCanvas());
  chip.colorSpace = THREE.SRGBColorSpace;
  chip.wrapS = chip.wrapT = THREE.RepeatWrapping;
  chip.repeat.set(2.5, 2.5);
  chip.anisotropy = 4;

  const kraft = { roughness: 0.88, clearcoat: 0, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color("#FFE0C0"), bumpMap: bump, bumpScale: 1.1 };
  const mats = {
    coverFront: toy("#FFFFFF", { map: front, ...kraft }),
    coverInside: toy("#FFFFFF", { map: inside, ...kraft }),
    coverEdge: toy("#9A6A40", { roughness: 0.9, clearcoat: 0, sheen: 0.2 }),
    backCover: toy("#FFFFFF", { map: chip, roughness: 0.92, clearcoat: 0, sheen: 0.15 }),
    backEdge: toy("#6C6561", { roughness: 0.92, clearcoat: 0, sheen: 0.1 }),
    pageFace: toy("#F6F4EF", { roughness: 0.95, clearcoat: 0, sheen: 0 }),
    pageEdge: pageEdgeMaterial(),
    hole: toy("#1C1815", { roughness: 1, clearcoat: 0, sheen: 0 }),
    wire: toy("#6B6B72", { roughness: 0.4, metalness: 0.7, clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0 }),
  };

  const blockW = PG.w - PG.inset * 2;
  const blockH = PG.h - PG.inset;
  const blockT = Z.blockFront - Z.backFront;
  return {
    mats,
    coverGeo: board(PG.board, true),
    backGeo: board(PG.back, false),
    blockW,
    blockH,
    blockT,
    blockGeo: new THREE.BoxGeometry(blockW, blockH, blockT),
    // Drawn: no front face, so the slots look down into the block and ink as clean outlines.
    blockOpenGeo: openFront(new THREE.BoxGeometry(blockW, blockH, blockT)),
    holesGeo: holes(blockT),
    wire: wire(COIL.wire, 6, 0.008),
    wireThin: wire(COIL.thin, 4, 0, true),
    wireCap: cap(),
  };
}

/* ---------- Geometry ---------- */

function roundRect(p: THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

const slotPaths = () =>
  Array.from({ length: COIL.pairs }, (_, k) => roundRect(new THREE.Path(), slotX(k) - SLOT.w / 2, SLOT.y - PG.h / 2 - SLOT.h / 2, SLOT.w, SLOT.h, SLOT.r));

/**
 * A board, `depth` thick, centred, with the slots punched through. Material
 * groups: 0 the front face, 1 the edges (and the slots' walls), 2 the back face.
 */
function board(depth: number, splitFaces: boolean) {
  const s = roundRect(new THREE.Shape(), -PG.w / 2, -PG.h / 2, PG.w, PG.h, PG.corner) as THREE.Shape;
  s.holes = slotPaths();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 3 });
  g.translate(0, 0, -depth / 2);
  if (splitFaces) {
    // ExtrudeGeometry puts both faces in group 0 (back face first): give the back face its own group.
    const [faces, sides] = g.groups;
    const half = faces.count / 2;
    const nz = g.attributes.normal.getZ(faces.start);
    g.clearGroups();
    g.addGroup(0, half, nz < 0 ? 2 : 0);
    g.addGroup(half, half, nz < 0 ? 0 : 2);
    g.addGroup(sides.start, sides.count, 1);
  }
  return g;
}

/** A box with its +Z face taken out. */
function openFront(g: THREE.BoxGeometry) {
  const index = Array.from(g.index!.array);
  // BoxGeometry's faces: +X, -X, +Y, -Y, +Z, -Z, six indices each.
  const keep = [...index.slice(0, 24), ...index.slice(30)];
  g.setIndex(keep);
  g.clearGroups();
  g.addGroup(0, 24, 0);
  g.addGroup(24, 6, 1);
  return g;
}

/** The slots seen in the page block's front and back faces: dark, a hair proud of the paper. */
function holes(blockT: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [1, -1]) {
    for (let k = 0; k < COIL.pairs; k++) {
      const s = roundRect(new THREE.Shape(), slotX(k) - SLOT.w / 2, SLOT.y - SLOT.h / 2, SLOT.w, SLOT.h, SLOT.r) as THREE.Shape;
      const g = new THREE.ShapeGeometry(s, 3);
      if (side < 0) g.rotateY(Math.PI);
      g.translate(0, 0, side * (blockT / 2 + 0.0006));
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

/** One ring of the coil, in the YZ plane: from where it leaves the page block at the front, over the top, to where it enters it at the back. */
class Ring extends THREE.Curve<THREE.Vector3> {
  constructor(
    private x: number,
    private a0: number,
    private a1: number,
  ) {
    super();
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    // Angle from the bottom of the ring, round through the front (+Z) and the top.
    const a = this.a0 + (this.a1 - this.a0) * u;
    return target.set(this.x, COIL.y - COIL.r * Math.cos(a), COIL.z + COIL.r * Math.sin(a));
  }
}

/** All the rings, merged: `radius` the wire's, `deep` how far past the page block's faces they run on (hidden). */
function wire(radius: number, radial: number, deep: number, single = false) {
  const a0 = Math.asin(Math.min(1, (Z.blockFront - deep - COIL.z) / COIL.r));
  const a1 = Math.PI * 2 - Math.asin(Math.min(1, (COIL.z - Z.backFront - deep) / COIL.r));
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < COIL.pairs; k++)
    for (const side of single ? [0] : [-1, 1]) parts.push(new THREE.TubeGeometry(new Ring(slotX(k) + side * COIL.spread, a0, a1), 56, radius, radial, false));
  return mergeGeometries(parts)!;
}

/**
 * The line drawing's coil (the storyboard draws the Playground's top, seen spine-on, as one clean arch):
 * only the end ring nearest the viewer, as a tube thick enough to outline as two arcs, so the other 29 rings
 * don't pile up behind it as hatching.
 */
function cap() {
  const a0 = Math.asin(Math.min(1, (Z.blockFront - COIL.z) / COIL.r));
  const a1 = Math.PI * 2 - Math.asin(Math.min(1, (COIL.z - Z.backFront) / COIL.r));
  return new THREE.TubeGeometry(new Ring(slotX(0), a0, a1), 64, 0.0065, 10, false);
}

/* ---------- The book ---------- */

/** The coil, in book space (origin at the foot's middle, cover facing +Z). */
export function Coil({ drawn = false, spine = true }: ObjectProps) {
  const k = kit();
  // The single end ring is the drawing of the coil seen spine-on; seen cover-on (the home pose) the real loops are what show.
  return <mesh geometry={drawn && spine ? k.wireCap : k.wire} material={k.mats.wire} castShadow receiveShadow userData={{ ink: drawn ? "decor" : "color" }} />;
}

/** The cover's hang: in colour it swings a touch off the pages from the coil; drawn, it lies flat on them. */
const HANG = -0.011;

/**
 * The line drawing (frame 2): the book as a spiral notebook seen from its side edge. One outline; a line where the
 * pages end under the coil; two inside lines for the covers' thickness (the end face is a frame of cover strips and
 * a top band standing a little proud of the page block, so the ink pass draws each boundary once); and one arch for
 * the coil. All filled with the page colour, so nothing but those lines shows.
 */
const PROUD = 0.04;
const BAND = 0.03;
// Flat plates facing the viewer (no sides to show as slanted slivers): the whole end face, the two cover strips and
// the top band standing proud of it, and half a disc for the coil.
const FACE = new THREE.PlaneGeometry(PG.t, PG.h);
const FRONT_STRIP = new THREE.PlaneGeometry(PG.board, PG.h);
const BACK_STRIP = new THREE.PlaneGeometry(PG.back, PG.h);
const TOP_BAND = new THREE.PlaneGeometry(PG.t - PG.board - PG.back, BAND);
const HALF_DISC = new THREE.CircleGeometry(COIL.r, 48, 0, Math.PI);
function Drawing() {
  const x = -PG.w / 2;
  const tag = { ink: "decor" };
  const r: [number, number, number] = [0, -Math.PI / 2, 0];
  return (
    <group>
      <mesh geometry={FACE} material={inkFill} position={[x, PG.h / 2, 0]} rotation={r} userData={tag} />
      <mesh geometry={FRONT_STRIP} material={inkFill} position={[x - PROUD, PG.h / 2, PG.t / 2 - PG.board / 2]} rotation={r} userData={tag} />
      <mesh geometry={BACK_STRIP} material={inkFill} position={[x - PROUD, PG.h / 2, -PG.t / 2 + PG.back / 2]} rotation={r} userData={tag} />
      <mesh geometry={TOP_BAND} material={inkFill} position={[x - PROUD, PG.h - BAND / 2, (PG.back - PG.board) / 2]} rotation={r} userData={tag} />
      <mesh geometry={HALF_DISC} material={inkFill} position={[x - PROUD - 0.0008, COIL.y, 0]} rotation={r} userData={tag} />
    </group>
  );
}

export default function Playground({ drawn = false, spine = true }: ObjectProps) {
  const k = kit();
  if (drawn && spine) return <Drawing />;
  const m = k.mats;
  const tag = { ink: drawn ? "decor" : "color" };
  const coverMats = useMemo(() => [m.coverFront, m.coverEdge, m.coverInside], [m]);
  const backMats = useMemo(() => [m.backCover, m.backEdge, m.backCover], [m]);
  // BoxGeometry faces: +X, -X, +Y, -Y, +Z, -Z.
  const blockMats = useMemo(() => [m.pageEdge, m.pageEdge, m.pageEdge, m.pageEdge, m.pageFace, m.pageFace], [m]);
  const openMats = useMemo(() => [m.pageEdge, m.pageFace], [m]);
  const coverZ = drawn ? Z.coverBack - PG.gap + PG.board / 2 : Z.coverBack + PG.board / 2;
  const blockZ = (Z.blockFront + Z.backFront) / 2;
  return (
    <group>
      {/* Grey back board. */}
      <mesh geometry={k.backGeo} material={backMats} position={[0, PG.h / 2, Z.backRear + PG.back / 2]} castShadow receiveShadow userData={tag} />
      {/* The paper, and the slots punched through it. */}
      <mesh
        geometry={drawn ? k.blockOpenGeo : k.blockGeo}
        material={drawn ? openMats : blockMats}
        position={[0, PG.inset + k.blockH / 2, blockZ]}
        castShadow
        receiveShadow
        userData={tag}
      />
      {!drawn && <mesh geometry={k.holesGeo} material={m.hole} position={[0, 0, blockZ]} userData={tag} />}
      {/* Kraft cover, hanging from the coil. */}
      <group position={[0, COIL.y, COIL.z]} rotation-x={drawn ? 0 : HANG}>
        <mesh geometry={k.coverGeo} material={coverMats} position={[0, PG.h / 2 - COIL.y, coverZ - COIL.z]} castShadow receiveShadow userData={tag} />
      </group>
      <Coil drawn={drawn} spine={spine} />
    </group>
  );
}

/**
 * The look for the book rig (ToyBook): the boards' maps follow faceMap's
 * convention (uv = x, y in scene units about the cover's centre, as
 * ExtrudeGeometry gives its faces). pageEdge draws its sheet lines on the
 * block's local z, so any block geometry works. The coil is `extras`; the
 * cover should hinge about COIL's axis (y = COIL.y, z = COIL.z).
 */
export function skin(): BookSkin {
  const { mats } = kit();
  return {
    board: PG.board,
    corner: PG.corner,
    coverFront: mats.coverFront,
    coverInside: mats.coverInside,
    coverEdge: mats.coverEdge,
    backCover: mats.backCover,
    pageEdge: mats.pageEdge,
    pageFace: mats.pageFace,
    extras: (props) => <Coil {...props} />,
  };
}

/** The cover with its slots punched (material groups: 0 outside, 1 edges, 2 inside), for a rig that wants the real holes. */
export const coverGeometry = () => kit().coverGeo;
