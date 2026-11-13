import { useMemo } from "react";
import * as THREE from "three";
import { mat, ink } from "../materials";
import { coinLeaf, heartLeaf, lathe, potProfile, ribbed, seeded, swordLeaf } from "../shapes";
import { dots } from "../textures";

/**
 * The five planters (spec §5). Origins sit at the middle of the pot's base.
 * Leaves are thin extruded shapes, all from one seeded random per plant, so
 * each plant grows the same way on every load.
 */

const LEAF = "#5FA83C";
const LEAF_LIGHT = "#8CC63F";
const STEM = "#6E9A45";
const SOIL = "#5A4636";

function Soil({ r, y }: { r: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[r, 32]} />
      <meshStandardMaterial color={SOIL} roughness={1} />
    </mesh>
  );
}

/** Little round legs under a pot. */
function Legs({ r, count = 3, color }: { r: number; count?: number; color: string }) {
  const geo = useMemo(() => lathe([[0, 0], [0.035, 0], [0.042, 0.04], [0.032, 0.14], [0, 0.15]], 16), []);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / 2;
        return <mesh key={i} geometry={geo} material={mat(color)} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} castShadow />;
      })}
    </>
  );
}

/** Pilea: coin leaves on thin stems, fanning out and up from the soil. */
function Pilea({ y, spread, height, seed, count = 16 }: { y: number; spread: number; height: number; seed: number; count?: number }) {
  const items = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + rand() * 0.6;
      const lean = 0.35 + rand() * 0.55;
      const len = height * (0.55 + rand() * 0.5);
      const r = 0.075 + rand() * 0.05;
      const end = new THREE.Vector3(Math.cos(a) * Math.sin(lean) * len * spread, Math.cos(lean) * len, Math.sin(a) * Math.sin(lean) * len * spread);
      return { a, end, len, geo: coinLeaf(r), tint: rand() < 0.35, tip: 0.9 + rand() * 0.5 };
    });
  }, [seed, count, height, spread]);
  const stem = useMemo(() => new THREE.CylinderGeometry(0.006, 0.008, 1, 6), []);
  return (
    <group position={[0, y, 0]}>
      {items.map((it, i) => {
        const mid = it.end.clone().multiplyScalar(0.5);
        const dir = it.end.clone().normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <group key={i}>
            <mesh geometry={stem} material={mat(STEM)} position={mid} quaternion={q} scale={[1, it.end.length(), 1]} />
            <mesh
              geometry={it.geo}
              material={mat(it.tint ? LEAF_LIGHT : LEAF, { roughness: 0.55 })}
              position={it.end}
              rotation={[-it.tip, -it.a - Math.PI / 2, 0, "YXZ"]}
              castShadow
            />
          </group>
        );
      })}
    </group>
  );
}

/** 3. Pilea in a cream pot with a smiling face and little legs. */
export function SmilePilea() {
  const h = 0.42;
  const pot = useMemo(() => lathe(potProfile(h, 0.2, 0.25)), []);
  const smile = useMemo(() => new THREE.TorusGeometry(0.06, 0.008, 6, 20, Math.PI), []);
  return (
    <group>
      <Legs r={0.12} color="#E9DFC9" />
      <group position={[0, 0.12, 0]}>
        <mesh geometry={pot} material={mat("#F3EAD6", { roughness: 0.6 })} castShadow receiveShadow />
        <Soil r={0.22} y={h - 0.04} />
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.25, 0.245]} material={ink()}>
            <sphereGeometry args={[0.016, 12, 8]} />
          </mesh>
        ))}
        <mesh geometry={smile} material={ink()} position={[0, 0.19, 0.25]} rotation={[0, 0, Math.PI]} />
        <Pilea y={h - 0.04} spread={1.1} height={0.42} seed={4} />
      </group>
    </group>
  );
}

/** 15. Pilea in a yellow wavy, ribbed pot. */
export function WavyPilea() {
  const h = 0.48;
  const pot = useMemo(() => {
    const pts: [number, number][] = [[0, 0], [0.2, 0]];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([0.22 + t * 0.03 + Math.sin(t * Math.PI * 10) * 0.016, t * h]);
    }
    pts.push([0.24, h + 0.01], [0.22, h + 0.01], [0.22, h - 0.06]);
    return lathe(pts, 56);
  }, []);
  return (
    <group>
      <mesh geometry={pot} material={mat("#F2B33D", { roughness: 0.42 })} castShadow receiveShadow />
      <Soil r={0.22} y={h - 0.04} />
      <Pilea y={h - 0.04} spread={1.2} height={0.55} seed={21} count={20} />
    </group>
  );
}

/**
 * 6. Snake plant: tall pointed leaves with a yellow edge, pink polka-dot pot.
 * `sage`: the coffee corner's version, in a tall ribbed sage pot (refs/64).
 */
export function SnakePlant({ sage = false }: { sage?: boolean }) {
  const h = 0.5;
  const pot = useMemo(
    () => (sage ? ribbed(lathe(potProfile(h, 0.23, 0.25, 0.02), 144), 22, 0.05) : lathe(potProfile(h, 0.2, 0.26))),
    [sage],
  );
  const potMat = useMemo(
    () => (sage ? mat("#93A98C", { roughness: 0.6 }) : mat("#F2A7A0", { map: dots("#F2A7A0", "#FBF4EC", 10, 3, 0.07), roughness: 0.55 })),
    [sage],
  );
  const leaves = useMemo(() => {
    const rand = seeded(9);
    return Array.from({ length: 9 }, (_, i) => ({
      a: (i / 9) * Math.PI * 2 + rand() * 0.5,
      tilt: 0.06 + rand() * 0.2,
      h: 0.9 + rand() * 0.55,
      w: 0.13 + rand() * 0.05,
      twist: (rand() - 0.5) * 0.8,
    })).map((l) => ({ ...l, edge: swordLeaf(l.w + 0.025, l.h + 0.02), body: swordLeaf(l.w, l.h) }));
  }, []);
  return (
    <group>
      <mesh geometry={pot} material={potMat} castShadow receiveShadow />
      <Soil r={0.24} y={h - 0.04} />
      {leaves.map((l, i) => (
        <group key={i} position={[Math.cos(l.a) * 0.07, h - 0.05, Math.sin(l.a) * 0.07]} rotation={[Math.sin(l.a) * l.tilt, l.twist, -Math.cos(l.a) * l.tilt]}>
          {/* Yellow edge: a slightly larger leaf just behind the green one. */}
          <mesh geometry={l.edge} material={mat("#D9C24A", { roughness: 0.5 })} position={[0, -0.01, -0.006]} castShadow />
          <mesh geometry={l.body} material={mat("#3E7D3A", { roughness: 0.5 })} castShadow />
        </group>
      ))}
    </group>
  );
}

/** 11. Pothos: green polka-dot pot on three legs, vines over the shelf edge. */
export function Pothos() {
  const h = 0.42;
  const pot = useMemo(() => lathe(potProfile(h, 0.2, 0.26)), []);
  const potMat = useMemo(() => mat("#2F8F5B", { map: dots("#2F8F5B", "#F6F3EC", 9, 3, 0.08), roughness: 0.45 }), []);
  const { vines, crown } = useMemo(() => {
    const rand = seeded(13);
    // Vines start at the pot rim and fall forward over the front edge.
    const vineDefs: [number, number, number][] = [
      [0.08, 0.75, 0.55],
      [-0.1, 0.95, 0.4],
      [0.18, 0.55, 0.7],
    ];
    const vines = vineDefs.map(([dx, drop, fwd]) => {
      const pts = [
        new THREE.Vector3(dx, h, 0.12),
        new THREE.Vector3(dx * 1.4, h + 0.06, 0.32),
        new THREE.Vector3(dx * 1.6, h - 0.1, fwd),
        new THREE.Vector3(dx * 1.8, h - drop * 0.6, fwd + 0.05),
        new THREE.Vector3(dx * 2, h - drop, fwd + 0.02),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const leaves = Array.from({ length: 9 }, (_, k) => {
        const t = 0.12 + (k / 8) * 0.86;
        return { p: curve.getPoint(t), side: k % 2 ? 1 : -1, geo: heartLeaf(0.11 + rand() * 0.05), light: rand() < 0.4 };
      });
      return { geo: new THREE.TubeGeometry(curve, 40, 0.006, 5, false), leaves };
    });
    const crown = Array.from({ length: 12 }, (_, i) => ({
      a: (i / 12) * Math.PI * 2 + rand() * 0.4,
      up: 0.12 + rand() * 0.2,
      geo: heartLeaf(0.13 + rand() * 0.05),
      light: rand() < 0.4,
      tip: 0.7 + rand() * 0.6,
    }));
    return { vines, crown };
  }, []);
  return (
    <group>
      <Legs r={0.13} color="#2F8F5B" />
      <group position={[0, 0.13, 0]}>
        <mesh geometry={pot} material={potMat} castShadow receiveShadow />
        <Soil r={0.24} y={h - 0.04} />
        {crown.map((c, i) => (
          <mesh
            key={i}
            geometry={c.geo}
            material={mat(c.light ? LEAF_LIGHT : LEAF, { roughness: 0.4 })}
            position={[Math.cos(c.a) * 0.13, h + c.up * 0.4, Math.sin(c.a) * 0.13]}
            rotation={[-c.tip, -c.a - Math.PI / 2, 0, "YXZ"]}
            castShadow
          />
        ))}
        {vines.map((v, i) => (
          <group key={i}>
            <mesh geometry={v.geo} material={mat(STEM)} castShadow />
            {v.leaves.map((l, k) => (
              <mesh
                key={k}
                geometry={l.geo}
                material={mat(l.light ? LEAF_LIGHT : LEAF, { roughness: 0.4 })}
                position={l.p}
                rotation={[0.25, l.side * 0.4, Math.PI + l.side * 0.6]}
                castShadow
              />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/** 13. Succulent: a small rosette in a blue dotted pot on three legs. */
export function Succulent() {
  const h = 0.3;
  const pot = useMemo(() => lathe(potProfile(h, 0.17, 0.21)), []);
  const potMat = useMemo(() => mat("#3D6FD1", { map: dots("#3D6FD1", "#F6F3EC", 8, 2, 0.08), roughness: 0.45 }), []);
  const leaf = useMemo(() => new THREE.SphereGeometry(1, 14, 10), []);
  const petals = useMemo(() => {
    const out: { a: number; ring: number }[] = [];
    [7, 6, 5, 3].forEach((n, ring) => {
      for (let i = 0; i < n; i++) out.push({ a: (i / n) * Math.PI * 2 + ring * 0.4, ring });
    });
    return out;
  }, []);
  return (
    <group>
      <Legs r={0.11} color="#3D6FD1" />
      <group position={[0, 0.13, 0]}>
        <mesh geometry={pot} material={potMat} castShadow receiveShadow />
        <Soil r={0.19} y={h - 0.03} />
        {petals.map((p, i) => {
          const r = 0.14 - p.ring * 0.035;
          const tilt = 1.1 - p.ring * 0.3;
          return (
            <mesh
              key={i}
              geometry={leaf}
              material={mat(p.ring > 1 ? "#8ACB62" : "#6FB552", { roughness: 0.5 })}
              position={[Math.cos(p.a) * r * 0.6, h + 0.02 + p.ring * 0.045, -Math.sin(p.a) * r * 0.6]}
              rotation={[0, -p.a, -tilt]}
              scale={[0.03, 0.11 - p.ring * 0.015, 0.05]}
              castShadow
            />
          );
        })}
      </group>
    </group>
  );
}
