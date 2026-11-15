import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Inked } from "../InkPass";
import { Spring, useMotion } from "../physics";
import type { ObjectMeta, ObjectProps } from "./types";

/**
 * The potted plant on the left of the shelf: a Peperomia obtusifolia, after
 * the user's line drawing (refs/plant-peperomia-line-art.webp) and the same
 * plant painted (refs/plant-peperomia-painted.webp). Decor, so it's modelled
 * in 3D and drawn only by the ink pass: round, cupped leaves folded along the
 * midrib (the fold draws the midrib), on stems that rise from the soil and
 * fan out, in a straight-sided pot with a rounded base and a rolled lip.
 *
 * Physics (the user: "when there's inertia it looks real"): every stem is a
 * spring that bends as the plant moves, its leaf riding the tip and lagging
 * on a spring of its own, so they trail, overshoot and settle, the tall
 * stems most. A barely-there idle sway keeps it alive. The scene's <Jelly>
 * bends the whole object; this is the motion on top.
 */

export const meta: ObjectMeta = {
  name: "plant",
  kind: "decor",
  refs: ["docs/storyboard/refs/plant-peperomia-line-art.webp", "docs/storyboard/refs/plant-peperomia-painted.webp"],
  width: 0.95,
  height: 1.27,
  depth: 0.6,
};

type V3 = [number, number, number];

/* ---------- The pot ---------- */

const POT = { h: 0.43, rTop: 0.218, rBot: 0.202, corner: 0.085, lip: 0.014, soil: 0.36 };

function potGeometry() {
  const p: THREE.Vector2[] = [];
  const { h, rTop, rBot, corner, lip } = POT;
  p.push(new THREE.Vector2(0.0001, 0));
  // The rounded base.
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2);
    p.push(new THREE.Vector2(rBot - corner + Math.cos(a) * corner, corner + Math.sin(a) * corner));
  }
  // Straight sides, a hair wider at the top, up to a rolled lip.
  const sideTop = h - lip;
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    p.push(new THREE.Vector2(rBot + (rTop - rBot) * t, corner + (sideTop - corner) * t));
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    p.push(new THREE.Vector2(rTop - lip + Math.cos(a) * lip, sideTop + Math.sin(a) * lip));
  }
  // Down the inside to below the soil.
  p.push(new THREE.Vector2(rTop - 2 * lip - 0.002, POT.soil - 0.03));
  p.push(new THREE.Vector2(0.0001, POT.soil - 0.03));
  return new THREE.LatheGeometry(p, 72);
}

function soilGeometry() {
  const r = POT.rTop - 2 * POT.lip - 0.0015;
  const p: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    // A slight mound.
    p.push(new THREE.Vector2(r * (1 - t) + 0.0001, POT.soil + 0.006 * Math.sin((t * Math.PI) / 2)));
  }
  return new THREE.LatheGeometry(p, 48);
}

/* ---------- Leaves ---------- */

type LeafShape = { size?: number; w: number; fold: number; cup: number; curl: number; bend: number; asym: number; tip: number; lobe: number };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * One leaf, base at the origin, tip at (0, 1), upper face towards +z. Two
 * halves that meet at the midrib without sharing normals, so the midrib is a
 * crease the ink pass draws; the crease eases flat towards the tip, so the
 * line fades out before it, as in the drawing. The halves cup up a little.
 */
function leafGeometry(s: LeafShape) {
  const nU = 22;
  const nV = 9;
  const pos: number[] = [];
  const idx: number[] = [];
  const g = 0.07; // how wide the fold is
  for (const side of [-1, 1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nU; i++) {
      const u = i / nU;
      // Widest just above the middle; round at the base, a hint of a point at the tip.
      const sn = Math.max(0, Math.sin(Math.PI * Math.pow(u, 1.08)));
      const hw = s.w * (1 + side * s.asym) * Math.pow(sn, 0.5 + s.tip * u * u);
      const slope = Math.tan(s.fold) * (1 - smooth(0.45, 0.85, u)) * smooth(0.0, 0.08, u);
      // The midrib curves a touch sideways.
      const mx = s.bend * u * u;
      for (let j = 0; j <= nV; j++) {
        const v = Math.pow(j / nV, 1.5);
        const ax = v * hw;
        const z = slope * g * (1 - Math.exp(-ax / g)) + s.cup * ax * ax + s.curl * Math.max(0, u - 0.25) ** 2;
        // The base's two lobes reach back past the stem a little (a heart).
        pos.push(mx + side * ax, u - s.lobe * v * v * Math.pow(1 - u, 3), z);
      }
    }
    for (let i = 0; i < nU; i++)
      for (let j = 0; j < nV; j++) {
        const a = base + i * (nV + 1) + j;
        const b = a + 1;
        const d = a + nV + 1;
        const c = d + 1;
        if (side > 0) idx.push(a, b, d, b, c, d);
        else idx.push(a, d, b, b, d, c);
      }
  }
  // A real thickness: a second skin below, stitched to the first round the edge.
  const n0 = pos.length / 3;
  const th = 0.012 / (s.size || 0.3);
  for (let k = 0; k < n0; k++) pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2] - th);
  const tri = idx.length;
  for (let k = 0; k < tri; k += 3) idx.push(idx[k] + n0, idx[k + 2] + n0, idx[k + 1] + n0);
  const per = (nU + 1) * (nV + 1);
  const edge: [number, number][] = [];
  for (let sd = 0; sd < 2; sd++) {
    const o = sd * per;
    for (let i = 0; i < nU; i++) edge.push([o + i * (nV + 1) + nV, o + (i + 1) * (nV + 1) + nV]);
    for (let j = 0; j < nV; j++) {
      edge.push([o + j, o + j + 1]);
      edge.push([o + nU * (nV + 1) + j, o + nU * (nV + 1) + j + 1]);
    }
  }
  for (const [a, b] of edge) idx.push(a, b, b + n0, a, b + n0, a + n0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

type LeafSpec = {
  /**
   * Where the blade starts (the top of its stem) and where its tip is: x and y
   * as pixels on the line drawing (1254 px square), z (depth, + towards the
   * viewer) in scene units. Leaves on another's stem give no base.
   */
  b?: V3;
  t: V3;
  /** Roughly which way its upper face looks. */
  face: V3;
  /** Half-width over length. */
  w?: number;
  /** A new leaf: small and cupped closed. */
  young?: boolean;
  /** Grows from leaf n's stem, this far up it, instead of from the soil. */
  on?: [number, number];
  cup?: number;
  curl?: number;
  bend?: number;
  asym?: number;
  lobe?: number;
  /** Size multiplier. */
  s?: number;
};

/** The drawing's scale: its plant is 1010 px from the pot's foot to the top leaf; the pot is centred on x = 619. */
const PX = 1.25 / 1010;
const art = ([x, y, z]: V3) => new THREE.Vector3((x - 619) * PX, (1145 - y) * PX + 0.02, z);

/** Roughly back to front, as the drawing has them. */
const LEAVES: LeafSpec[] = [
  // 0: the tall stem on the left, topped by a round leaf, with new growth below it (1).
  { b: [392, 250, -0.1], t: [376, 128, -0.08], face: [0, 0.1, 1], w: 0.52, cup: 0.45, s: 1.25 },
  { on: [0, 0.86], t: [446, 250, -0.06], face: [0.5, 0.5, 1], young: true },
  // 2: left middle.
  { b: [476, 535, 0.04], t: [285, 590, 0.12], face: [-0.1, 0.7, 0.8], w: 0.5, s: 1.2 },
  // 3, 4: the two big ones in front.
  { b: [510, 590, 0.19], t: [430, 745, 0.3], face: [-0.05, 0.55, 1], w: 0.56, lobe: 0.08, s: 1.3 },
  { b: [700, 600, 0.19], t: [790, 748, 0.28], face: [0.1, 0.5, 1], w: 0.55, lobe: 0.08, asym: 0.12, s: 1.3 },
  // 5: the big one on the right.
  { b: [865, 548, -0.02], t: [1015, 720, 0.08], face: [0.55, 0.35, 1], w: 0.52, lobe: 0.06, s: 1.25 },
  // 6: upper right.
  { b: [800, 345, -0.08], t: [945, 420, -0.02], face: [0.3, 0.5, 1], w: 0.5, s: 1.25 },
  // 7: at the top, pointing up.
  { b: [705, 356, -0.04], t: [810, 170, -0.08], face: [-0.2, 0.15, 1], w: 0.48, s: 1.2 },
  // 8: the big one in the middle, facing out.
  { b: [668, 440, 0.08], t: [455, 490, 0.16], face: [0, 0.45, 1], w: 0.52, s: 1.3 },
  // 10: lower left, hanging out over the rim.
  { b: [380, 620, 0.02], t: [225, 765, 0.1], face: [-0.45, 0.3, 1], w: 0.5, s: 1.2 },
  // 11: top right at the back.
  { b: [840, 300, -0.2], t: [985, 290, -0.16], face: [0.2, 0.6, 1], w: 0.5, s: 1.2 },
  // 9: round the back, for the turned views.
  { b: [560, 455, -0.2], t: [520, 320, -0.34], face: [0, 0.4, -1], w: 0.5, s: 1.2 },
];

/* ---------- Stems ---------- */

/** The bend along a stem under a load at its tip (a cantilever): 0 at the soil, 1 at the tip. */
const bendW = (t: number) => (t * t * (3 - t)) / 2;
const bendDW = (t: number) => (6 * t - 3 * t * t) / 2;

const STEM_SEG = 22;
const STEM_SIDES = 6;

type Built = {
  stems: { curve: THREE.CubicBezierCurve3; r: number; reach: number; first: number; count: number }[];
  stemGeo: THREE.BufferGeometry;
  rest: Float32Array;
  weight: Float32Array;
  leaves: {
    geo: THREE.BufferGeometry;
    scale: number;
    stem: number;
    t: number;
    base: THREE.Vector3;
    quat: THREE.Quaternion;
    dir: THREE.Vector3;
    tan: THREE.Vector3;
  }[];
};

let rand = 7;
const rnd = () => {
  rand = (rand * 16807) % 2147483647;
  return (rand - 1) / 2147483646;
};

function frameOf(base: THREE.Vector3, tip: THREE.Vector3, face: V3) {
  const dir = tip.clone().sub(base);
  const len = dir.length();
  dir.divideScalar(len);
  const f = new THREE.Vector3(...face).normalize();
  const n = f.addScaledVector(dir, -f.dot(dir)).normalize();
  const x = new THREE.Vector3().crossVectors(dir, n).normalize();
  const quat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, dir, n));
  return { dir, n, quat, len };
}

function build(): Built {
  rand = 7;
  const up = new THREE.Vector3(0, 1, 0);
  const stems: Built["stems"] = [];
  const stemOf: number[] = [];

  // A stem from the soil to every leaf that doesn't grow off another's.
  LEAVES.forEach((l, i) => {
    if (l.on || !l.b) return;
    const b = art(l.b);
    const { dir, n, len: leafLen } = frameOf(b, art(l.t), l.face);
    let rx = b.x * 0.24 + (rnd() - 0.5) * 0.04;
    let rz = b.z * 0.4 - 0.01 + (rnd() - 0.5) * 0.04;
    const rr = Math.hypot(rx, rz);
    if (rr > 0.14) {
      rx *= 0.14 / rr;
      rz *= 0.14 / rr;
    }
    const root = new THREE.Vector3(rx, POT.soil - 0.025, rz);
    // It arrives rising and leaning the way the leaf points.
    const tin = new THREE.Vector3(dir.x * 0.7, 0.9 + Math.max(dir.y, 0) * 0.5, dir.z * 0.4).normalize();
    const end = b.clone().addScaledVector(n, -0.004);
    const len = end.distanceTo(root);
    const p1 = root.clone().addScaledVector(up, len * 0.42).add(new THREE.Vector3((end.x - root.x) * 0.08, 0, (end.z - root.z) * 0.08));
    const p2 = end.clone().addScaledVector(tin, -len * 0.32);
    const curve = new THREE.CubicBezierCurve3(root, p1, p2, end);
    stemOf[i] = stems.length;
    stems.push({ curve, r: (0.0075 + leafLen * 0.006) * (l.young ? 0.85 : 1), reach: (end.y - POT.soil) / 0.7, first: 0, count: 0 });
  });

  // The stems as one mesh: rings along each curve, a cap at the top.
  const pos: number[] = [];
  const nrm: number[] = [];
  const wt: number[] = [];
  const idx: number[] = [];
  const pt = new THREE.Vector3();
  for (const s of stems) {
    s.first = pos.length / 3;
    const frames = s.curve.computeFrenetFrames(STEM_SEG, false);
    for (let i = 0; i <= STEM_SEG; i++) {
      const t = i / STEM_SEG;
      s.curve.getPoint(t, pt);
      const r = s.r * (1 - 0.25 * t);
      for (let j = 0; j < STEM_SIDES; j++) {
        const a = (j / STEM_SIDES) * Math.PI * 2;
        const nx = Math.cos(a) * frames.normals[i].x + Math.sin(a) * frames.binormals[i].x;
        const ny = Math.cos(a) * frames.normals[i].y + Math.sin(a) * frames.binormals[i].y;
        const nz = Math.cos(a) * frames.normals[i].z + Math.sin(a) * frames.binormals[i].z;
        pos.push(pt.x + nx * r, pt.y + ny * r, pt.z + nz * r);
        nrm.push(nx, ny, nz);
        wt.push(bendW(t));
      }
    }
    const ring = (i: number) => s.first + i * STEM_SIDES;
    for (let i = 0; i < STEM_SEG; i++)
      for (let j = 0; j < STEM_SIDES; j++) {
        const a = ring(i) + j;
        const b = ring(i) + ((j + 1) % STEM_SIDES);
        const c = ring(i + 1) + ((j + 1) % STEM_SIDES);
        const d = ring(i + 1) + j;
        idx.push(a, b, d, b, c, d);
      }
    // Cap.
    const tEnd = frames.tangents[STEM_SEG];
    s.curve.getPoint(1, pt);
    const cap = pos.length / 3;
    const rEnd = s.r * 0.75;
    pos.push(pt.x + tEnd.x * rEnd * 0.6, pt.y + tEnd.y * rEnd * 0.6, pt.z + tEnd.z * rEnd * 0.6);
    nrm.push(tEnd.x, tEnd.y, tEnd.z);
    wt.push(1);
    for (let j = 0; j < STEM_SIDES; j++) idx.push(ring(STEM_SEG) + j, ring(STEM_SEG) + ((j + 1) % STEM_SIDES), cap);
    s.count = pos.length / 3 - s.first;
  }
  const stemGeo = new THREE.BufferGeometry();
  const rest = new Float32Array(pos);
  stemGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  stemGeo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  stemGeo.setIndex(idx);

  const leaves: Built["leaves"] = LEAVES.map((l, i) => {
    const young = !!l.young;
    let stem: number;
    let t: number;
    let base: THREE.Vector3;
    if (l.on) {
      stem = stemOf[l.on[0]];
      t = l.on[1];
      base = stems[stem].curve.getPoint(t);
    } else {
      stem = stemOf[i];
      t = 1;
      base = art(l.b!);
    }
    const f = frameOf(base, art(l.t), l.face);
    const shape: LeafShape = {
      w: l.w ?? (young ? 0.4 : 0.45),
      fold: THREE.MathUtils.degToRad(young ? 34 : Math.abs(l.face[1]) > Math.abs(l.face[2]) ? 10 : 24),
      cup: l.cup ?? (young ? 1.1 : 0.32),
      curl: l.curl ?? (rnd() - 0.5) * 0.2,
      bend: l.bend ?? (rnd() - 0.5) * 0.12,
      asym: l.asym ?? (rnd() - 0.5) * 0.12,
      lobe: l.lobe ?? 0.03,
      tip: 0.3,
      size: f.len * (young ? 1.1 : 1.15) * (l.s ?? 1),
    };
    const c = stems[stem].curve;
    const e = 0.002;
    const t0 = Math.max(0, t - e);
    const t1 = Math.min(1, t + e);
    const tan = c.getPoint(t1).sub(c.getPoint(t0)).divideScalar(t1 - t0);
    return { geo: leafGeometry(shape), scale: f.len * (young ? 1.1 : 1.15) * (l.s ?? 1), stem, t, base, quat: f.quat, dir: f.dir, tan };
  });

  return { stems, stemGeo, rest, weight: new Float32Array(wt), leaves };
}

/* ---------- The plant ---------- */

const LEAF_MAT = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const POT_MAT = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

export default function Plant(_: ObjectProps) {
  const built = useMemo(build, []);
  const pot = useMemo(() => ({ pot: potGeometry(), soil: soilGeometry() }), []);
  const foot = useRef<THREE.Group>(null);
  const motion = useMotion(foot);
  const leafRefs = useRef<(THREE.Group | null)[]>([]);

  // A spring per stem (its tip's sideways and front-back give) and per leaf (its own lag on the stem).
  const sim = useMemo(() => {
    rand = 99;
    return {
      stems: built.stems.map(() => {
        const k = 38 + rnd() * 26;
        const c = 3.2 + rnd() * 1.6;
        return { x: new Spring(k, c), z: new Spring(k, c), phase: rnd() * 6.28, freq: 0.7 + rnd() * 0.5, twist: (rnd() - 0.5) * 0.8, gain: 0.85 + rnd() * 0.3 };
      }),
      leaves: built.leaves.map(() => {
        const k = 30 + rnd() * 30;
        const c = 2.6 + rnd() * 1.6;
        return { x: new Spring(k, c), y: new Spring(k, c), z: new Spring(k, c), phase: rnd() * 6.28, freq: 0.9 + rnd() * 0.7 };
      }),
      dx: new Float32Array(built.stems.length),
      dz: new Float32Array(built.stems.length),
      v: new THREE.Vector3(),
      t1: new THREE.Vector3(),
      t0: new THREE.Vector3(),
      d: new THREE.Vector3(),
      lag: new THREE.Vector3(),
      axis: new THREE.Vector3(),
      qb: new THREE.Quaternion(),
      ql: new THREE.Quaternion(),
    };
  }, [built]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    if (dt <= 0) return;
    const time = state.clock.elapsedTime;
    // The plant's own movement (a teleport, like the lab's loop restarting, is ignored).
    const vx = THREE.MathUtils.clamp(motion.vx, -14, 14);
    const ax = THREE.MathUtils.clamp(motion.ax, -140, 140);
    const ay = THREE.MathUtils.clamp(motion.ay, -140, 140);
    // The push the leaves feel: dragged behind as it moves, flung on as it brakes.
    const fx = -vx * 0.0095 - ax * 0.0006;
    const fy = -ay * 0.0006;

    const { stems, rest, weight, leaves } = built;
    stems.forEach((s, i) => {
      const p = sim.stems[i];
      const reach = s.reach * p.gain;
      const idle = 0.0035 * reach;
      const tx = THREE.MathUtils.clamp(fx * reach, -0.14, 0.14) + idle * Math.sin(time * p.freq + p.phase);
      const tz = THREE.MathUtils.clamp(fx * reach * p.twist, -0.06, 0.06) + idle * 0.7 * Math.sin(time * p.freq * 1.3 + p.phase * 2);
      sim.dx[i] = p.x.step(tx, dt);
      sim.dz[i] = p.z.step(tz, dt);
    });

    // Bend the stems.
    const attr = built.stemGeo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    stems.forEach((s, i) => {
      const dx = sim.dx[i];
      const dz = sim.dz[i];
      for (let v = s.first; v < s.first + s.count; v++) {
        const w = weight[v];
        arr[v * 3] = rest[v * 3] + dx * w;
        arr[v * 3 + 1] = rest[v * 3 + 1];
        arr[v * 3 + 2] = rest[v * 3 + 2] + dz * w;
      }
    });
    attr.needsUpdate = true;

    // Each leaf rides its stem, turned with the stem's bend, and lags on its own spring.
    leaves.forEach((l, i) => {
      const g = leafRefs.current[i];
      if (!g) return;
      const dx = sim.dx[l.stem];
      const dz = sim.dz[l.stem];
      const w = bendW(l.t);
      g.position.set(l.base.x + dx * w, l.base.y, l.base.z + dz * w);
      const dw = bendDW(l.t);
      sim.t0.copy(l.tan).normalize();
      sim.t1.set(l.tan.x + dx * dw, l.tan.y, l.tan.z + dz * dw).normalize();
      sim.qb.setFromUnitVectors(sim.t0, sim.t1);
      const p = sim.leaves[i];
      const idle = 0.012;
      sim.lag.set(
        p.x.step(fx * 2.2 + idle * Math.sin(time * p.freq + p.phase), dt),
        p.y.step(fy * 2.2 + idle * 0.6 * Math.sin(time * p.freq * 1.21 + p.phase * 1.7), dt),
        p.z.step(idle * 0.5 * Math.sin(time * p.freq * 0.83 + p.phase * 2.3), dt),
      );
      // The push turns the leaf about its base: a torque, midrib × push.
      sim.d.copy(l.dir).applyQuaternion(sim.qb);
      sim.axis.crossVectors(sim.d, sim.lag);
      const ang = Math.min(0.5, sim.axis.length() * 4);
      if (ang > 1e-5) sim.ql.setFromAxisAngle(sim.axis.normalize(), ang);
      else sim.ql.identity();
      g.quaternion.copy(sim.ql).multiply(sim.qb).multiply(l.quat);
    });
  });

  return (
    <Inked>
      <group ref={foot}>
        <mesh geometry={pot.pot} material={POT_MAT} />
        <mesh geometry={pot.soil} material={POT_MAT} />
        <mesh geometry={built.stemGeo} material={POT_MAT} frustumCulled={false} />
        {built.leaves.map((l, i) => (
          <group
            key={i}
            ref={(g) => {
              leafRefs.current[i] = g;
            }}
            position={l.base}
            quaternion={l.quat}
          >
            <mesh geometry={l.geo} material={LEAF_MAT} scale={l.scale} />
          </group>
        ))}
      </group>
    </Inked>
  );
}
