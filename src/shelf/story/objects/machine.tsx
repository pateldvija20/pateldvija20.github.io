import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Inked, inkFill2 } from "../InkPass";
import type { ObjectMeta, ObjectProps } from "./types";

/**
 * The Breville Barista Express (decor), drawn only by the ink pass. Every part
 * is real geometry so it inks: hopper with ribs, lid and beans, chamfered head,
 * control band with its curved lower edge, buttons, grind dial, pressure gauge,
 * lights, grinder cradle, group head, portafilter, twin spouts, hot water
 * outlet, steam wand, tamper rest, slotted drip tray with float, feet.
 *
 * Origin: the middle of its foot; +Z is the front; y up.
 */

export const meta: ObjectMeta = {
  name: "machine",
  kind: "decor",
  refs: [
    "docs/storyboard/refs/machine-breville-barista-express-photo.png",
    "docs/storyboard/refs/machine-flat-breville-illustration.png",
    "docs/storyboard/refs/machine-flat-black-illustration.png",
  ],
  width: 1.15,
  height: 1.35,
  depth: 1.0,
};

type V3 = [number, number, number];

/** Where a cup's foot sits under the spouts (on the drip tray grille). */
export const CUP_SPOT: V3 = [0.138, 0.25, 0.2];
/** The two spout tips. */
export const SPOUTS: V3[] = [
  [0.108, 0.695, 0.2],
  [0.168, 0.695, 0.2],
];
/** The hot water outlet's tip. */
export const OUTLET: V3 = [0.3, 0.75, 0.3];

/* ---------- geometry helpers (cached) ---------- */

const cache = new Map<string, THREE.BufferGeometry>();
const memo = (k: string, f: () => THREE.BufferGeometry) => {
  let g = cache.get(k);
  if (!g) cache.set(k, (g = f()));
  return g;
};

/** A box with flat chamfered edges (c), centred on the origin. */
function cbox(w: number, h: number, d: number, c0 = 0.01) {
  // Edges stay crisp: a big chamfer draws as two close lines, which reads as one heavy one.
  const c = Math.min(c0, 0.0012);
  return memo(`cb${w},${h},${d},${c}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + c, -h / 2 + c);
    s.lineTo(w / 2 - c, -h / 2 + c);
    s.lineTo(w / 2 - c, h / 2 - c);
    s.lineTo(-w / 2 + c, h / 2 - c);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.001, d - 2 * c),
      bevelEnabled: true,
      bevelThickness: c,
      bevelSize: c,
      bevelSegments: 1,
    });
    g.translate(0, 0, -(d - 2 * c) / 2);
    return g;
  });
}

function lathe(key: string, pts: [number, number][], seg = 40) {
  return memo(`lt${key}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));
}

function cyl(r: number, h: number, seg = 32, r2 = r) {
  return memo(`cy${r},${h},${seg},${r2}`, () => new THREE.CylinderGeometry(r2, r, h, seg));
}

function ringShape(ro: number, ri: number, depth: number, a0 = 0, a1 = Math.PI * 2) {
  return memo(`rs${ro},${ri},${depth},${a0},${a1}`, () => {
    const full = a1 - a0 >= Math.PI * 2 - 1e-6;
    const s = new THREE.Shape();
    if (full) {
      s.absarc(0, 0, ro, 0, Math.PI * 2, false);
      const h = new THREE.Path();
      h.absarc(0, 0, ri, 0, Math.PI * 2, true);
      s.holes.push(h);
    } else {
      s.absarc(0, 0, ro, a0, a1, false);
      s.absarc(0, 0, ri, a1, a0, true);
      s.closePath();
    }
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 40 });
  });
}

/* ---------- small part components ---------- */

type PartProps = {
  g: THREE.BufferGeometry;
  p?: V3;
  r?: V3;
  s?: V3;
};
function Part({ g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }: PartProps) {
  return <mesh geometry={g} material={inkFill2} position={p} rotation={r} scale={s} />;
}

/** A cylinder between two points. */
function Rod({ a, b, r, seg = 16 }: { a: V3; b: V3; r: number; seg?: number }) {
  const { pos, q, len } = useMemo(() => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const d = B.clone().sub(A);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return { pos: A.add(B).multiplyScalar(0.5), q, len };
  }, [a, b]);
  return <mesh geometry={cyl(r, len, seg)} material={inkFill2} position={pos} quaternion={q} />;
}

/** A round push button / knob facing +Z, local origin on the panel. */
const KR = 0.043;
const KNOB_PTS: [number, number][] = [
  [0, 0],
  [KR, 0],
  [KR, 0.024],
  [0, 0.024],
];
function Knob({ p }: { p: V3 }) {
  return <Part g={lathe("knob", KNOB_PTS, 40)} p={p} r={[Math.PI / 2, 0, 0]} />;
}

function Light({ p }: { p: V3 }) {
  return (
    <group position={p} rotation={[Math.PI / 2, 0, 0]}>
      <Part g={cyl(0.014, 0.02, 20)} p={[0, 0.01, 0]} />
    </group>
  );
}

/** The head: a side profile with a rounded shoulder at the front top, extruded across. */
function headGeometry() {
  return memo("head", () => {
    const d = 0.9;
    const h = 0.3;
    const r = 0.085;
    const s = new THREE.Shape(); // z as x, y as y
    s.moveTo(-d / 2 + 0.03, 0);
    s.lineTo(d / 2 - 0.02, 0);
    s.lineTo(d / 2, 0.02);
    s.lineTo(d / 2, h - r);
    s.quadraticCurveTo(d / 2, h, d / 2 - r, h);
    s.lineTo(-d / 2 + 0.03, h);
    s.lineTo(-d / 2, h - 0.03);
    s.lineTo(-d / 2, 0.03);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.04 - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2); // shape x(z) -> world z, extrusion -> x
    return toCreasedNormals(g, 0.6);
  });
}

/** An arch-shaped hood under the head (round lower corners). */
function archGeometry(w: number, h: number, d: number) {
  return memo(`arch${w},${h},${d}`, () => {
    const r = Math.min(h * 0.9, w / 2);
    const s = new THREE.Shape();
    s.moveTo(-w / 2, h);
    s.lineTo(-w / 2, r);
    s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
    s.lineTo(w / 2 - r, 0);
    s.quadraticCurveTo(w / 2, 0, w / 2, r);
    s.lineTo(w / 2, h);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -d / 2);
    return toCreasedNormals(g, 0.6);
  });
}

/** A side column: its inner face leans toward the viewer so it never sits edge-on to the camera. */
function column() {
  return memo("column", () => {
    const s = new THREE.Shape(); // x, then -z (as y)
    s.moveTo(0.466, -0.3);
    s.lineTo(0.395, -0.3);
    s.lineTo(0.3, 0.12);
    s.lineTo(0.466, 0.12);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.65, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

/* ---------- the panel ---------- */

const PANEL_Z = 0.42;
const PANEL_D = 0.025;

function panelGeometry() {
  return memo("panel", () => {
    const s = new THREE.Shape();
    s.moveTo(-0.47, 1.085);
    s.lineTo(0.47, 1.085);
    s.lineTo(0.47, 0.855);
    s.lineTo(0.4, 0.855);
    s.bezierCurveTo(0.36, 0.855, 0.35, 0.795, 0.3, 0.795);
    s.lineTo(-0.25, 0.795);
    s.bezierCurveTo(-0.3, 0.795, -0.31, 0.855, -0.36, 0.855);
    s.lineTo(-0.47, 0.855);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: PANEL_D, bevelEnabled: false, curveSegments: 20 });
  });
}

function Gauge({ p }: { p: V3 }) {
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= 8; i++) out.push(-Math.PI * 0.75 + (i / 8) * Math.PI * 1.5);
    return out;
  }, []);
  const tickG = memo("tick", () => new THREE.BoxGeometry(0.007, 0.016, 0.014));
  return (
    <group position={p}>
      {/* bezel ring (stands well proud) and a recessed face */}
      <Part g={cyl(0.1, 0.03, 56)} p={[0, 0, 0.015]} r={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

function GrindDial({ p }: { p: V3 }) {
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= 10; i++) out.push(-Math.PI * 0.72 + (i / 10) * Math.PI * 1.44);
    return out;
  }, []);
  const tickG = memo("dtick", () => new THREE.BoxGeometry(0.005, 0.012, 0.014));
  return (
    <group position={p}>
      <Knob p={[0, 0, 0]} />
    </group>
  );
}

/* ---------- the hopper ---------- */

function beanPile() {
  return memo("beans", () => {
    const rnd = (i: number) => {
      const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const gs: THREE.BufferGeometry[] = [];
    const o = new THREE.Object3D();
    for (let i = 0; i < 64; i++) {
      const ang = rnd(i) * Math.PI * 2;
      const rad = Math.sqrt(rnd(i + 100)) * 0.17;
      const hgt = 1.215 + (1 - rad / 0.18) * 0.06 + rnd(i + 200) * 0.025;
      o.position.set(Math.cos(ang) * rad, hgt, Math.sin(ang) * rad);
      o.rotation.set(rnd(i + 300) * 3, rnd(i + 400) * 3, rnd(i + 500) * 3);
      o.updateMatrix();
      const g = new THREE.SphereGeometry(1, 8, 6).scale(0.036, 0.021, 0.026);
      g.applyMatrix4(o.matrix);
      gs.push(g.toNonIndexed());
    }
    return mergeGeometries(gs)!;
  });
}

function Hopper() {
  return (
    <group>
      {/* collar and base cup of the bowl */}
      <Part g={lathe("hbase", [[0, 1.138], [0.165, 1.138], [0.165, 1.17], [0.185, 1.175], [0.195, 1.2], [0, 1.2]], 48)} />
      <Part g={lathe("hrim", [[0.185, 1.138], [0.19, 1.138], [0.19, 1.146], [0.185, 1.146]], 48)} />
      {/* clear walls: ribs between the base cup and the lid skirt */}
      {/* only the two side edges of the clear wall: no ribs across the middle */}
      {[0, Math.PI].map((a, i) => (
        <Rod key={i} a={[Math.cos(a) * 0.196, 1.2, 0]} b={[Math.cos(a) * 0.222, 1.292, 0]} r={0.0055} seg={8} />
      ))}
      {/* lid skirt band and lid */}
      <Part g={lathe("hband", [[0.222, 1.285], [0.236, 1.292], [0.236, 1.312], [0.222, 1.312]], 48)} />
      <Part
        g={lathe(
          "hlid",
          [[0, 1.3], [0.25, 1.3], [0.255, 1.31], [0.25, 1.32], [0.22, 1.326], [0.1, 1.332], [0, 1.334]],
          48,
        )}
      />
      {/* lid knob */}
      <Part g={lathe("hknob", [[0, 1.333], [0.04, 1.333], [0.042, 1.341], [0.03, 1.349], [0, 1.35]], 24)} p={[0.03, 0, -0.06]} />
      <Part g={beanPile()} />
    </group>
  );
}

/* ---------- the machine ---------- */

export default function Machine(_props: ObjectProps) {
  const grille = useMemo(() => {
    const w = 0.9;
    const d = 0.36;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -d / 2);
    s.lineTo(w / 2, -d / 2);
    s.lineTo(w / 2, d / 2);
    s.lineTo(-w / 2, d / 2);
    s.closePath();
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const z = -d / 2 + 0.04 + (r / (rows - 1)) * (d - 0.08);
      for (const cx of [-0.215, 0.215]) {
        const h = new THREE.Path();
        const hw = 0.19;
        const hh = 0.011;
        h.moveTo(cx - hw, z - hh);
        h.lineTo(cx + hw, z - hh);
        h.lineTo(cx + hw, z + hh);
        h.lineTo(cx - hw, z + hh);
        h.closePath();
        s.holes.push(h);
      }
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
    g.rotateX(Math.PI / 2); // lay flat: shape y -> z
    g.translate(0, 0.02, 0);
    return g;
  }, []);

  const wand: { a: V3; b: V3 } = { a: [0.548, 0.62, 0.33], b: [0.575, 0.37, 0.33] };

  return (
    <Inked>
      <group>
        {/* feet */}
        {([-0.46, 0.46] as number[]).flatMap((x) =>
          ([-0.38, 0.38] as number[]).map((z) => (
            <Part key={`${x},${z}`} g={cyl(0.04, 0.035, 20, 0.034)} p={[x, 0.0175, z]} />
          )),
        )}

        {/* base housing with chamfers, and its front insert */}
        <Part g={cbox(1.08, 0.17, 0.96, 0.003)} p={[0, 0.115, -0.02]} />
        {/* drip tray: rim, slotted grille, float */}
        <Part g={cbox(1.0, 0.03, 0.48, 0.003)} p={[0, 0.215, 0.22]} />

        {/* the two side columns and back wall */}
        <Part g={column()} p={[0.0, 0.21, 0]} />
        <Part g={column()} p={[0.0, 0.21, 0]} s={[-1, 1, 1]} />
        <Part g={cbox(0.92, 0.6, 0.03, 0.006)} p={[0, 0.54, -0.12]} />

        {/* the head */}
        <Part g={headGeometry()} p={[0, 0.84, -0.03]} />
        <Part g={cbox(0.9, 0.012, 0.7, 0.004)} p={[0, 1.145, -0.03]} />
        {/* arches over the grinder and the group head */}
        <Part g={archGeometry(0.34, 0.075, 0.36)} p={[-0.19, 0.77, 0.2]} />
        <Part g={archGeometry(0.34, 0.075, 0.36)} p={[0.138, 0.77, 0.2]} />
        {/* end caps, proud of the panel */}
        <Part g={cbox(0.075, 0.26, 0.09, 0.003)} p={[-0.5, 0.96, 0.42]} />
        <Part g={cbox(0.075, 0.26, 0.09, 0.003)} p={[0.5, 0.96, 0.42]} />
        {/* the control band with its curved lower edge */}
        <Part g={panelGeometry()} p={[0, 0, PANEL_Z]} />
        {/* right side lever / lamp block */}
        <Part g={cbox(0.04, 0.08, 0.09, 0.003)} p={[0.545, 1.0, 0.36]} />

        {/* controls on the band */}
        <group position={[0, 0, PANEL_Z + PANEL_D]}>
          <Knob p={[-0.387, 0.995, 0]} />
          <GrindDial p={[-0.287, 0.995, 0]} />
          <Knob p={[-0.186, 0.995, 0]} />
          <Knob p={[0.129, 0.995, 0]} />
          <Knob p={[0.236, 0.995, 0]} />
          <Knob p={[0.341, 0.995, 0]} />
          <Gauge p={[-0.024, 0.929, 0]} />
        </group>

        {/* hopper */}
        <group position={[-0.24, 0, 0.0]}>
          <Hopper />
        </group>

        {/* grinder housing, cradle (left) */}
        <Part g={cyl(0.12, 0.08, 40)} p={[-0.19, 0.735, 0.2]} />
        <Part g={cyl(0.13, 0.016, 40)} p={[-0.19, 0.69, 0.2]} />
        <Part
          g={memo("cradle", () => {
            const s = new THREE.Shape();
            s.moveTo(-0.115, 0);
            s.lineTo(0.115, 0);
            s.lineTo(0.1, -0.1);
            s.quadraticCurveTo(0.095, -0.145, 0.07, -0.145);
            s.lineTo(-0.07, -0.145);
            s.quadraticCurveTo(-0.095, -0.145, -0.1, -0.1);
            s.closePath();
            const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
            g.translate(0, 0, -0.1);
            return g;
          })}
          p={[-0.19, 0.682, 0.2]}
        />
        {/* tamper rest on the far left */}
        <Part g={cbox(0.16, 0.04, 0.12, 0.003)} p={[-0.45, 0.775, 0.3]} />

        {/* label plaques on the two housings */}
        {/* group head and portafilter, raised so a cup fits under the spouts */}
        <group position={[0, 0.15, 0]}>
        <Part g={cyl(0.135, 0.09, 40)} p={[0.138, 0.73, 0.19]} />
        <Part g={cyl(0.145, 0.014, 40)} p={[0.138, 0.68, 0.19]} />
        <Part g={cyl(0.105, 0.045, 36, 0.11)} p={[0.138, 0.648, 0.19]} />
        <Part g={cyl(0.075, 0.03, 32, 0.06)} p={[0.138, 0.61, 0.19]} />
        <Part g={cyl(0.012, 0.045, 12)} p={[0.108, 0.575, 0.19]} />
        <Part g={cyl(0.012, 0.045, 12)} p={[0.168, 0.575, 0.19]} />
        {/* handle: toward the viewer, ending in a round cap */}
        <Part g={cbox(0.07, 0.07, 0.11, 0.003)} p={[0.138, 0.64, 0.3]} />
        <Part g={cyl(0.058, 0.3, 28, 0.052)} p={[0.138, 0.635, 0.4]} r={[Math.PI / 2, 0, 0]} />
        </group>

        {/* hot water outlet */}
        <group position={[0, 0.06, 0]}>
          <Part g={cbox(0.05, 0.08, 0.05, 0.003)} p={[0.3, 0.77, 0.3]} />
          <Part g={cyl(0.012, 0.045, 12)} p={[0.3, 0.715, 0.3]} />
          <Part g={cyl(0.017, 0.01, 12)} p={[0.3, 0.688, 0.3]} />
        </group>

        {/* steam wand: pivot, black arm, black loop knob, steel tube */}
        <Part g={cbox(0.05, 0.06, 0.05, 0.003)} p={[0.4, 0.79, 0.31]} />
        <Rod a={[0.4, 0.755, 0.31]} b={[0.4, 0.72, 0.33]} r={0.012} seg={12} />
        <Rod a={[0.4, 0.72, 0.33]} b={[0.5, 0.685, 0.33]} r={0.013} seg={14} />
        <Part g={ringShape(0.036, 0.024, 0.026)} p={[0.525, 0.7, 0.314]} />
        <Part g={cbox(0.036, 0.05, 0.026, 0.003)} p={[0.538, 0.64, 0.33]} r={[0, 0, -0.2]} />
        <Rod a={[0.548, 0.62, 0.33]} b={wand.b} r={0.0062} seg={12} />
      </group>
    </Inked>
  );
}
