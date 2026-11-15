import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Inked } from "../InkPass";
import { Spring, useMotion } from "../physics";
import type { ObjectMeta, ObjectProps } from "./types";

/**
 * The hanging plant at the top right of the screen (storyboard frames 2 to 4):
 * the bottom of a round hanging pot, cut off by the top edge of the screen,
 * with money plant (pothos) vines trailing down from it. Seen from just
 * below. Decor: drawn only by the ink pass.
 *
 * Origin: the point it hangs from, the top centre of the pot (the rim's
 * centre). Everything hangs below it (−y); only the rim's lip and the hanger
 * cords rise above it, out of frame in the scene.
 *
 * Physics: the whole planter swings like a pendulum about its origin when it
 * moves; each vine is a chain of three springs that lags the pot (the long
 * ones most), and every leaf flutters on its stalk. A gentle idle sway.
 */

export const meta: ObjectMeta = {
  name: "hanger",
  kind: "decor",
  refs: ["docs/storyboard/frames-01-06.webp"],
  width: 0.9,
  height: 1.0,
  depth: 0.6,
};

/** The lab frames objects standing on y = 0; this one hangs below it, so lift it there. */
const IN_LAB = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("objlab");

type V3 = [number, number, number];

/* ---------- The pot ---------- */

/**
 * A round pot: a flat base rounding up into a full belly, its widest just
 * above the origin, and a rolled lip at the top. Below the origin is the
 * part the storyboard shows (the bottom of the pot, about 0.13 deep); the
 * top half, the lip and the cords are above it, out of frame.
 */
const POT_BOTTOM = -0.46;
const LIP = 0.125;
const SOIL = 0.07;
const RIM = 0.272;
const BAND_Y = -0.2;

/** Where the scene pins it: the pot's lip, at the top edge of the screen. */
export const PIN: [number, number, number] = [0, LIP, 0];

function potProfile() {
  const p: THREE.Vector2[] = [new THREE.Vector2(0, POT_BOTTOM), new THREE.Vector2(0.07, POT_BOTTOM)];
  const v = (x: number, y: number) => new THREE.Vector2(x, y);
  // A deep bowl: a gently curved base rounding up into the belly, widest a little under the lip.
  const c1 = new THREE.CubicBezierCurve(v(0.07, POT_BOTTOM), v(0.2, POT_BOTTOM), v(0.3, -0.3), v(0.29, -0.05));
  const c2 = new THREE.CubicBezierCurve(v(0.29, -0.05), v(0.282, 0.04), v(0.276, 0.09), v(RIM, LIP - 0.012));
  for (let i = 1; i <= 24; i++) p.push(c1.getPoint(i / 24));
  for (let i = 1; i <= 12; i++) p.push(c2.getPoint(i / 12));
  return p;
}

function radiusAt(prof: THREE.Vector2[], y: number) {
  for (let i = 1; i < prof.length; i++)
    if (prof[i].y >= y && prof[i - 1].y < y) return prof[i - 1].x + ((prof[i].x - prof[i - 1].x) * (y - prof[i - 1].y)) / (prof[i].y - prof[i - 1].y);
  return RIM;
}

function potGeometry() {
  const p = potProfile();
  // A rolled lip, and down inside to the soil.
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 1.1;
    p.push(new THREE.Vector2(RIM + Math.cos(a) * 0.011, LIP + Math.sin(a) * 0.011 * 1.1));
  }
  p.push(new THREE.Vector2(RIM - 0.014, LIP - 0.012));
  p.push(new THREE.Vector2(RIM - 0.02, SOIL));
  p.push(new THREE.Vector2(0.12, SOIL - 0.001));
  p.push(new THREE.Vector2(0, SOIL - 0.002));
  const g = new THREE.LatheGeometry(p, 80);
  const creased = toCreasedNormals(g, 0.5);
  g.dispose();
  return creased;
}

/** A raised band round the belly: two clean rings, and it shows the pot's curve. */
function bandGeometry() {
  const r = radiusAt(potProfile(), BAND_Y);
  const g = new THREE.TorusGeometry(r - 0.001, 0.007, 8, 80);
  g.rotateX(Math.PI / 2);
  g.translate(0, BAND_Y, 0);
  return g;
}

/** Three cords from the lip, meeting far above, out of frame. */
function cordGeometry() {
  const top = new THREE.Vector3(0, 2.6, 0);
  const parts = [0.5, 0.5 + 2 / 3, 0.5 + 4 / 3].map((k) => {
    const a = Math.PI * k;
    const from = new THREE.Vector3(Math.cos(a) * RIM, LIP + 0.01, -Math.sin(a) * RIM);
    return new THREE.TubeGeometry(new THREE.LineCurve3(from, top), 4, 0.0011, 6, false);
  });
  const g = mergeGeometries(parts)!;
  parts.forEach((x) => x.dispose());
  return g;
}

/* ---------- A pothos leaf ---------- */

type V2 = [number, number];

function cubic(a: V2, b: V2, c: V2, d: V2, n: number, out: V2[]) {
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const k0 = u * u * u;
    const k1 = 3 * u * u * t;
    const k2 = 3 * u * t * t;
    const k3 = t * t * t;
    out.push([a[0] * k0 + b[0] * k1 + c[0] * k2 + d[0] * k3, a[1] * k0 + b[1] * k1 + c[1] * k2 + d[1] * k3]);
  }
}

/**
 * The right half of a heart-shaped leaf with a pointed tip, base (where the
 * stalk joins, in the notch) at the origin, tip at (0, −1).
 */
function halfOutline(w: number, lobe: number): V2[] {
  const k = w / 0.4;
  const s = (p: V2): V2 => [p[0] * k, p[1]];
  const o: V2[] = [[0, 0]];
  cubic(s([0, 0]), s([0.1, 0.12 * lobe]), s([0.4, 0.1 * lobe]), s([0.4, -0.24]), 10, o);
  cubic(s([0.4, -0.24]), s([0.4, -0.46]), s([0.23, -0.68]), s([0.1, -0.83]), 10, o);
  cubic(s([0.1, -0.83]), s([0.05, -0.885]), s([0.015, -0.95]), [0, -1], 6, o);
  return o;
}

/**
 * One half of the blade as a surface: strips from the midrib out to the edge.
 * The halves are raised a little either side of the midrib (a shallow V), so
 * the ink pass draws the midrib as a fold.
 */
function bladeHalf(side: 1 | -1, w: number, lobe: number, fold: number, curl: number) {
  const o = halfOutline(w, lobe);
  const rows = 5;
  const pos: number[] = [];
  const idx: number[] = [];
  const z = (x: number, y: number) => {
    const ax = Math.abs(x);
    // V either side of the midrib, edges easing back, tip curling away, lobes tipping back.
    return fold * ax - 0.5 * ax * ax - curl * y * y - (y > 0 ? 0.4 * y : 0);
  };
  for (const [ox, oy] of o) {
    const my = Math.min(0, oy);
    for (let r = 0; r <= rows; r++) {
      const u = r / rows;
      const x = ox * u;
      const y = my + (oy - my) * u;
      pos.push(x * side, y, z(x, y));
    }
  }
  const W = rows + 1;
  for (let i = 0; i < o.length - 1; i++)
    for (let r = 0; r < rows; r++) {
      const a = i * W + r;
      const b = (i + 1) * W + r;
      if (side > 0) idx.push(a, a + 1, b, a + 1, b + 1, b);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A leaf on its stalk, in the leaf's own space at length 1: the stalk leaves
 * the node (the origin) outwards (+x) and a little forwards, and the blade
 * hangs from its end, tip down, face +z.
 */
function leafGeometry(w: number, lobe: number, fold: number, curl: number) {
  const base = new THREE.Vector3(0.22, 0.03, 0.08);
  const stalk = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.12, 0.07, 0.03), base),
    6,
    0.012,
    5,
    false,
  );
  stalk.deleteAttribute("uv");
  const halves = [bladeHalf(1, w, lobe, fold, curl), bladeHalf(-1, w, lobe, fold, curl)];
  const m = new THREE.Matrix4().makeRotationX(-0.12).setPosition(base);
  halves.forEach((h) => h.applyMatrix4(m));
  const g = mergeGeometries([stalk.toNonIndexed(), ...halves.map((h) => h.toNonIndexed())])!;
  stalk.dispose();
  halves.forEach((h) => h.dispose());
  return g;
}

/* ---------- The vines ---------- */

/** One leaf: where on its vine (0 to 1 along it), which side, its length, and how it's turned. */
type LeafSpec = { t: number; side: 1 | -1; L: number; yaw: number; pitch: number; roll: number; v: number };
type VineSpec = {
  /** Where it goes over the rim (azimuth, radians: 0 = +x, π/2 = +z), and how far out it hangs. */
  az: number;
  out: number;
  /** Below the rim: the points it hangs through. */
  hang: V3[];
  leaves: [number, 1 | -1, number, number, number, number?][];
  /** How lively: higher for long, light vines. */
  give: number;
};

const deg = Math.PI / 180;

/**
 * Laid out from the storyboard sketch (frames 2 to 4): a long cascade down the
 * left, a second beside it, a short one flicking out to the left, two trailing
 * down the front, a small tuft over the right, and a few at the back so it's
 * full from the side. [azimuth, out, bottom, leaves, drift sideways, wobble, give]
 */
const PLAN: [number, number, number, number, number, number, number][] = [
  [176, 0.31, -0.92, 8, -0.01, 0.012, 1],
  [150, 0.335, -0.68, 6, -0.008, 0.01, 0.9],
  [202, 0.3, -0.56, 4, -0.02, 0.01, 0.6],
  [118, 0.305, -0.72, 6, 0.006, 0.012, 0.85],
  [64, 0.305, -0.88, 7, -0.004, 0.013, 1],
  [24, 0.31, -0.55, 4, 0.01, 0.01, 0.6],
  [342, 0.3, -0.5, 3, 0.01, 0.008, 0.5],
  [228, 0.3, -0.6, 4, 0, 0.01, 0.7],
  [270, 0.3, -0.7, 5, 0, 0.012, 0.8],
];

function makeSpec(row: (typeof PLAN)[number], vi: number): VineSpec {
  const [azd, out, bottom, n, drift, wob, give] = row;
  const az = azd * deg;
  const rc = Math.cos(az);
  const rs = Math.sin(az);
  const hang: V3[] = [];
  const steps = Math.max(3, Math.round((-0.12 - bottom) / 0.11));
  for (let i = 0; i <= steps; i++) {
    const y = -0.12 + ((bottom + 0.12) * i) / steps;
    const r = out + wob * Math.sin(i * 1.4 + vi);
    const tg = drift * i * 1.5;
    hang.push([rc * r - rs * tg, y, rs * r + rc * tg]);
  }
  const leaves: VineSpec["leaves"] = [];
  for (let i = 0; i < n; i++) {
    const t = 0.52 + (0.45 * i) / Math.max(1, n - 1);
    const side: 1 | -1 = i % 2 ? -1 : 1;
    const L = 0.118 - 0.05 * (i / Math.max(1, n - 1)) - 0.006 * ((i + vi) % 2);
    // Leaves turn a little from the front, alternately, so they fan rather than stack.
    const yaw = side * (0.25 + 0.3 * ((i * 3 + vi) % 3) / 2);
    leaves.push([t, side, L, yaw, 0.35 + 0.25 * ((i + vi) % 3), 0.1]);
  }
  return { az, out, hang, leaves, give };
}

const VINES: VineSpec[] = PLAN.map(makeSpec);

/** Points along a vine, at rest: from the soil, up and over the rim with a little clearance, then down through `hang`. */
function vineRest(v: VineSpec, n: number) {
  const c = Math.cos(v.az);
  const s = Math.sin(v.az);
  const at = (r: number, y: number) => new THREE.Vector3(c * r, y, s * r);
  const pts = [at(0.15, SOIL), at(0.23, LIP + 0.03), at(RIM + 0.012, LIP + 0.035), at(v.out, LIP - 0.025), at(v.out + 0.004, LIP - 0.09), ...v.hang.map((p) => new THREE.Vector3(...p))];
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const rest = curve.getSpacedPoints(n - 1);
  // Where it's clear of the pot's lip and free to swing.
  const len = curve.getLength();
  let free = 0;
  for (let i = 0; i < rest.length; i++)
    if (rest[i].y < -0.14) {
      free = (i / (n - 1)) * len;
      break;
    }
  return { rest, len, free };
}

const LEAF_GEOS = [leafGeometry(0.38, 1, 0.5, 0.15), leafGeometry(0.35, 0.8, 0.55, 0.22), leafGeometry(0.41, 1.1, 0.46, 0.1)];
const POT = potGeometry();
const CORDS = cordGeometry();
const BAND = bandGeometry();
const MAT = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

const N = 56; // points along each vine
const RAD = 6; // sides of a vine's tube

type Vine = {
  spec: VineSpec;
  restD: Float32Array; // rest segment vectors
  segU: Float32Array; // each segment's place along the free part, 0 to 1
  radius: Float32Array;
  q: Float32Array; // current points
  psi: Float32Array; // each segment's bend
  springs: Spring[];
  geo: THREE.BufferGeometry;
  phase: number;
};

type Leaf = {
  vine: number;
  seg: number;
  f: number;
  spec: LeafSpec;
  spring: Spring;
  px: number;
  vx: number;
  ax: number;
  phase: number;
  started: boolean;
};

function buildRig() {
  const vines: Vine[] = [];
  const leaves: Leaf[] = [];
  VINES.forEach((spec, vi) => {
    const { rest, len, free } = vineRest(spec, N);
    const restD = new Float32Array((N - 1) * 3);
    const segU = new Float32Array(N - 1);
    for (let k = 0; k < N - 1; k++) {
      restD[k * 3] = rest[k + 1].x - rest[k].x;
      restD[k * 3 + 1] = rest[k + 1].y - rest[k].y;
      restD[k * 3 + 2] = rest[k + 1].z - rest[k].z;
      const s = ((k + 0.5) / (N - 1)) * len;
      segU[k] = THREE.MathUtils.clamp((s - free) / Math.max(1e-3, len - free), 0, 1);
    }
    const radius = new Float32Array(N);
    for (let k = 0; k < N; k++) radius[k] = THREE.MathUtils.lerp(0.0013, 0.0008, k / (N - 1));
    const q = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) {
      q[k * 3] = rest[k].x;
      q[k * 3 + 1] = rest[k].y;
      q[k * 3 + 2] = rest[k].z;
    }
    const geo = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(new Float32Array(N * RAD * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const normal = new THREE.BufferAttribute(new Float32Array(N * RAD * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", position);
    geo.setAttribute("normal", normal);
    const idx: number[] = [];
    for (let k = 0; k < N - 1; k++)
      for (let j = 0; j < RAD; j++) {
        const a = k * RAD + j;
        const b = k * RAD + ((j + 1) % RAD);
        const c = a + RAD;
        const d = b + RAD;
        idx.push(a, b, c, b, d, c);
      }
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -0.3, 0), 1.2);
    // The long, lively vines swing slower and further.
    const g = spec.give;
    const springs = [new Spring(34 - 12 * g, 2.6), new Spring(30 - 13 * g, 2.3), new Spring(28 - 14 * g, 2.0)];
    vines.push({ spec, restD, segU, radius, q, psi: new Float32Array(N - 1), springs, geo, phase: vi * 1.7 });

    for (const [t, side, L, yaw, roll, pitch] of spec.leaves) {
      const pos = (0.22 + 0.78 * t) * (N - 1);
      const seg = Math.min(N - 2, Math.floor(pos));
      leaves.push({
        vine: vi,
        seg,
        f: pos - seg,
        spec: { t, side, L, yaw, roll, pitch: pitch ?? 0, v: (leaves.length * 7) % 3 },
        spring: new Spring(70 - 260 * L, 3.2),
        px: 0,
        vx: 0,
        ax: 0,
        phase: leaves.length * 2.39,
        started: false,
      });
    }
  });
  return { vines, leaves, pend: new Spring(16, 1.4) };
}

type Rig = ReturnType<typeof buildRig>;

/** Rebuilds a vine's tube round its current points. */
function updateTube(v: Vine) {
  const q = v.q;
  const pos = v.geo.attributes.position.array as Float32Array;
  const nor = v.geo.attributes.normal.array as Float32Array;
  // Parallel-transported frame along the vine.
  let nx = 0,
    ny = 0,
    nz = 1;
  for (let k = 0; k < N; k++) {
    const a = Math.max(0, k - 1);
    const b = Math.min(N - 1, k + 1);
    let tx = q[b * 3] - q[a * 3];
    let ty = q[b * 3 + 1] - q[a * 3 + 1];
    let tz = q[b * 3 + 2] - q[a * 3 + 2];
    const tl = Math.hypot(tx, ty, tz) || 1;
    tx /= tl;
    ty /= tl;
    tz /= tl;
    const d = nx * tx + ny * ty + nz * tz;
    nx -= tx * d;
    ny -= ty * d;
    nz -= tz * d;
    let nl = Math.hypot(nx, ny, nz);
    if (nl < 1e-4) {
      nx = 1;
      ny = 0;
      nz = 0;
      const d2 = tx;
      nx -= tx * d2;
      ny -= ty * d2;
      nz -= tz * d2;
      nl = Math.hypot(nx, ny, nz) || 1;
    }
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;
    const r = v.radius[k];
    for (let j = 0; j < RAD; j++) {
      const ang = (j / RAD) * Math.PI * 2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const ox = nx * c + bx * s;
      const oy = ny * c + by * s;
      const oz = nz * c + bz * s;
      const i = (k * RAD + j) * 3;
      pos[i] = q[k * 3] + ox * r;
      pos[i + 1] = q[k * 3 + 1] + oy * r;
      pos[i + 2] = q[k * 3 + 2] + oz * r;
      nor[i] = ox;
      nor[i + 1] = oy;
      nor[i + 2] = oz;
    }
  }
  v.geo.attributes.position.needsUpdate = true;
  v.geo.attributes.normal.needsUpdate = true;
}

const clamp = THREE.MathUtils.clamp;

function step(rig: Rig, swing: THREE.Group, leafGroups: (THREE.Group | null)[], ax: number, t: number, dt: number) {
  // The pot: a pendulum from the origin. Accelerating one way, it swings the other.
  const a = clamp(ax, -80, 80);
  const idle = 0.02 * Math.sin(t * 0.85) + 0.009 * Math.sin(t * 1.63 + 1.3);
  const theta = rig.pend.step(clamp(-a * 0.011, -0.4, 0.4) + idle, dt);
  swing.rotation.set(0.012 * Math.sin(t * 0.61 + 0.4), 0, theta);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);

  for (const v of rig.vines) {
    // Three springs down the vine: each wants to hang plumb but is dragged by the one above.
    let prev = theta;
    const rel = [0, 0, 0, 0];
    for (let j = 0; j < 3; j++) {
      const sway = (0.025 + 0.02 * j) * v.spec.give * Math.sin(t * (1.1 - 0.15 * j) + v.phase + j * 0.9);
      const target = 0.55 * prev - a * 0.004 * (1 + j) * v.spec.give + sway;
      const phi = v.springs[j].step(clamp(target, -0.9, 0.9), dt);
      rel[j + 1] = phi - theta;
      prev = phi;
    }
    // Bend each segment by the springs' angles, smoothly along the vine; a slight sway to and fro too.
    const q = v.q;
    const tw = 0.05 * v.spec.give * Math.sin(t * 0.7 + v.phase * 1.3);
    for (let k = 0; k < N - 1; k++) {
      const u = v.segU[k] * 3;
      const i = Math.min(2, Math.floor(u));
      const f = u - i;
      const ease = Math.min(1, v.segU[k] * 6);
      const psi = (rel[i] + (rel[i + 1] - rel[i]) * f) * ease;
      v.psi[k] = psi;
      const chi = tw * v.segU[k];
      const dx = v.restD[k * 3];
      const dy = v.restD[k * 3 + 1];
      const dz = v.restD[k * 3 + 2];
      const c = Math.cos(psi);
      const s = Math.sin(psi);
      const rx = dx * c - dy * s;
      const ry = dx * s + dy * c;
      const cc = Math.cos(chi);
      const sc = Math.sin(chi);
      q[(k + 1) * 3] = q[k * 3] + rx;
      q[(k + 1) * 3 + 1] = q[k * 3 + 1] + ry * cc - dz * sc;
      q[(k + 1) * 3 + 2] = q[k * 3 + 2] + ry * sc + dz * cc;
    }
    updateTube(v);
  }

  rig.leaves.forEach((l, i) => {
    const g = leafGroups[i];
    if (!g) return;
    const v = rig.vines[l.vine];
    const q = v.q;
    const k = l.seg;
    const x = q[k * 3] + (q[k * 3 + 3] - q[k * 3]) * l.f;
    const y = q[k * 3 + 1] + (q[k * 3 + 4] - q[k * 3 + 1]) * l.f;
    const z = q[k * 3 + 2] + (q[k * 3 + 5] - q[k * 3 + 2]) * l.f;
    // How the leaf's node is moving sideways, on top of the pot's own movement.
    const xr = x * ct - y * st;
    if (!l.started) {
      l.px = xr;
      l.started = true;
    }
    const k2 = 1 - Math.exp(-dt * 20);
    const vx = (xr - l.px) / dt;
    l.ax += ((vx - l.vx) / dt - l.ax) * k2;
    l.vx += (vx - l.vx) * k2;
    l.px = xr;
    const acc = a + clamp(l.ax, -60, 60);
    const s = l.spec;
    const flutter = l.spring.step(clamp(-acc * 0.006, -0.6, 0.6) + 0.05 * Math.sin(t * 1.4 + l.phase), dt);
    g.position.set(x, y, z);
    g.rotation.set(s.pitch, s.yaw, s.side * s.roll + v.psi[k] + flutter, "ZYX");
    g.scale.set(s.side * s.L, s.L, s.L);
  });
}

export default function Hanger(_props: ObjectProps) {
  const root = useRef<THREE.Group>(null);
  const swing = useRef<THREE.Group>(null);
  const leafGroups = useRef<(THREE.Group | null)[]>([]);
  const motion = useMotion(root);
  const rig = useMemo(buildRig, []);
  useEffect(() => () => rig.vines.forEach((v) => v.geo.dispose()), [rig]);

  useFrame((state, dt) => {
    if (!swing.current || dt <= 0) return;
    step(rig, swing.current, leafGroups.current, motion.ax, state.clock.elapsedTime, Math.min(dt, 1 / 20));
  });

  return (
    <group position={[0, IN_LAB ? 0.9 : 0, 0]}>
      <group ref={root}>
        <group ref={swing}>
          <Inked>
            <mesh geometry={POT} material={MAT} />
            <mesh geometry={BAND} material={MAT} />
            <mesh geometry={CORDS} material={MAT} />
            {rig.vines.map((v, i) => (
              <mesh key={i} geometry={v.geo} material={MAT} />
            ))}
            {rig.leaves.map((l, i) => (
              <group
                key={i}
                ref={(g) => {
                  leafGroups.current[i] = g;
                }}
              >
                <mesh geometry={LEAF_GEOS[l.spec.v]} material={MAT} />
              </group>
            ))}
          </Inked>
        </group>
      </group>
    </group>
  );
}
