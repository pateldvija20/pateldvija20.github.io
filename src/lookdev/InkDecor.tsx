import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ScreenAnchor, Slide } from "../shelf/story/FlatDecor";
import { BLADES, HANG, LEAF, MACHINE, POT, allHangLeaves, bandOutline, bladeCurves, leafHalves, vineCurve, type Blade, type V2 } from "../shelf/story/design";
import { MACHINE_X, MACHINE_Z, PLANT_X, PLANT_Z, SHELF, type Frame } from "../shelf/story/layout";

/**
 * Look B: the decor built in 3D from the same shapes as the flat drawings
 * (design.ts) and drawn by the ink pass (InkPass.tsx): white, unlit, with
 * black lines where a surface turns a corner or ends.
 */

const WHITE = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
const WHITE_2 = new THREE.MeshBasicMaterial({ color: "#FFFFFF", side: THREE.DoubleSide });

/** Turns everything inside white and marks it as decor for the ink pass. */
function Inked({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    g.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const side = Array.isArray(m.material) ? m.material[0]?.side : m.material?.side;
      m.material = side === THREE.DoubleSide ? WHITE_2 : WHITE;
      m.castShadow = false;
      m.receiveShadow = false;
      m.userData.ink = "decor";
    });
  });
  return <group ref={g}>{children}</group>;
}

const v2 = ([x, y]: V2) => new THREE.Vector2(x, y);

/** A flat outline (Vector2s) extruded from z0 to z1, front edges eased so they draw. */
function extrude(pts: V2[] | THREE.Shape, z0: number, z1: number, bevel = 0.006) {
  const shape = pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map(v2));
  const depth = Math.max(z1 - z0 - bevel * 2, 0.001);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: 0, bevelSegments: 1, curveSegments: 12 });
  g.translate(0, 0, z0 + bevel);
  return g;
}

function rect(x0: number, y0: number, x1: number, y1: number): V2[] {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

function roundedShape(x0: number, y0: number, x1: number, y1: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

function Machine() {
  const geos = useMemo(() => {
    const M = MACHINE;
    const D = M.depth / 2;
    const b = M.base;
    const wall = 0.012;
    return [
      extrude([[-b.bot, 0], [b.bot, 0], [b.top, b.h], [-b.top, b.h]], -D, D),
      // Back of the bay, and the two thin side walls that read as the body's lines.
      extrude(rect(-M.body.x, M.body.y0, M.body.x, M.body.y1), -D, -D + 0.2),
      extrude(rect(-M.body.x, M.body.y0, -M.body.x + wall, M.body.y1), -D, D - 0.02),
      extrude(rect(M.body.x - wall, M.body.y0, M.body.x, M.body.y1), -D, D - 0.02),
      extrude(bandOutline(), -D, D),
      extrude(rect(M.head.x0, M.head.y0, M.head.x1, M.head.y1), -0.05, 0.3),
      extrude(roundedShape(M.lip.x0, M.lip.y0, M.lip.x1, M.lip.y1, M.lip.r), -0.05, 0.32),
      extrude(rect(M.block.x0, M.block.y0, M.block.x1, M.block.y1), -0.05, 0.3),
      extrude(
        [
          [M.hood.botX0, M.hood.y0],
          [M.hood.botX1, M.hood.y0],
          [M.hood.topX1, M.hood.y1],
          [M.hood.topX0, M.hood.y1],
        ],
        -0.05,
        0.3,
      ),
    ];
  }, []);
  const front = MACHINE.depth / 2;
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} />
      ))}
      {MACHINE.dots.map((x) => (
        <mesh key={x} position={[x, MACHINE.controlsY, front + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[MACHINE.dotR, MACHINE.dotR, 0.04, 32]} />
        </mesh>
      ))}
      <mesh position={[MACHINE.gauge.x, MACHINE.controlsY, front + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[MACHINE.gauge.r, MACHINE.gauge.r, 0.04, 64]} />
      </mesh>
    </group>
  );
}

/** Two halves of a flat outline either side of its midrib (local +y), folded back so the midrib draws as a crease. */
function foldedHalves(left: V2[], right: V2[], fold: number) {
  return [left, right].map((pts, i) => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(v2)), 1);
    g.rotateY((i === 0 ? 1 : -1) * fold);
    return g;
  });
}

function sampleCubics(start: V2, segs: [V2, V2, V2][], steps = 14): V2[] {
  const out: V2[] = [start];
  let a = start;
  for (const [b, c, d] of segs) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      out.push([
        u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
        u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
      ]);
    }
    a = d;
  }
  return out;
}

/** A sword leaf rebuilt along its own axis (base at origin, tip up +y), folded down the middle. */
function bladeGeometry(b: Blade) {
  const dx = b.tip[0] - b.base[0];
  const dy = b.tip[1] - b.base[1];
  const L = Math.hypot(dx, dy);
  const straight: Blade = { ...b, base: [0, 0], tip: [0, L], bend: 0 };
  const c = bladeCurves(straight);
  const all = sampleCubics(c.start, c.segs);
  // The first segment runs base-left to the tip; the second, tip back to base-right.
  const mid = Math.floor(all.length / 2);
  const left: V2[] = [[0, 0], ...all.slice(0, mid + 1)];
  const right: V2[] = [[0, L], ...all.slice(mid + 1), [0, 0]];
  return { halves: foldedHalves(left, right, 0.45), angle: -Math.atan2(dx, dy) };
}

function SnakePlant() {
  const parts = useMemo(() => {
    const pot = new THREE.LatheGeometry([v2([0.0001, 0]), v2([POT.botR, 0]), v2([POT.topR, POT.h]), v2([0.0001, POT.h])], 64);
    return { pot, blades: BLADES.map((b) => ({ b, ...bladeGeometry(b) })) };
  }, []);
  return (
    <group>
      <mesh geometry={parts.pot} />
      {parts.blades.map(({ b, halves, angle }, i) => (
        <group key={i} position={[b.base[0], b.base[1], b.z]} rotation={[0, 0, angle]}>
          <mesh geometry={halves[0]} />
          <mesh geometry={halves[1]} />
        </group>
      ))}
    </group>
  );
}

function HangingPlant() {
  const parts = useMemo(() => {
    const { left, right } = leafHalves(LEAF);
    const leftPts = sampleCubics([0, 0], left);
    const rightPts = sampleCubics([0, 0], right).reverse();
    const leaf = foldedHalves(leftPts, rightPts, 0.35);
    const vines = HANG.vines.map((v) => {
      const c = vineCurve(v).map(([x, y], i) => new THREE.Vector3(x, y, 0.01 * i));
      return new THREE.TubeGeometry(new THREE.CubicBezierCurve3(c[0], c[1], c[2], c[3]), 40, 0.004, 8);
    });
    return { leaf, vines, leaves: allHangLeaves() };
  }, []);
  const k = HANG.knot;
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[(HANG.rod.x1 - 0.04) / 2, 0, 0]}>
        <cylinderGeometry args={[HANG.rod.r, HANG.rod.r, HANG.rod.x1 + 0.04, 24]} />
      </mesh>
      <mesh position={[HANG.rod.x1 + 0.01, 0, -0.04]}>
        <boxGeometry args={[0.03, 0.1, 0.1]} />
      </mesh>
      <mesh position={[k.at[0], k.at[1], 0]} scale={[k.rx, k.ry, k.ry]}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      {parts.vines.map((g, i) => (
        <mesh key={i} geometry={g} />
      ))}
      {parts.leaves.map((l, i) => (
        <group key={i} position={[l.at[0], l.at[1], 0.03 + l.z]} rotation={[0, 0, l.angle]} scale={l.s}>
          <mesh geometry={parts.leaf[0]} />
          <mesh geometry={parts.leaf[1]} />
        </group>
      ))}
    </group>
  );
}

export function InkShelf() {
  return (
    <mesh position={[0, -SHELF.thick / 2, 0]}>
      <boxGeometry args={[SHELF.width, SHELF.thick, SHELF.depth]} />
    </mesh>
  );
}

export default function InkDecor({ frame, cup }: { frame: Frame; cup: ReactNode }) {
  return (
    <>
      <Inked>
        <InkShelf />
        <Slide x={PLANT_X[frame]} z={PLANT_Z}>
          <SnakePlant />
        </Slide>
        <ScreenAnchor>
          <HangingPlant />
        </ScreenAnchor>
      </Inked>
      {/* The machine slides with the cup inside it; only the machine is inked. */}
      <Slide x={MACHINE_X[frame]} z={MACHINE_Z}>
        <Inked>
          <Machine />
        </Inked>
        {cup}
      </Slide>
    </>
  );
}
