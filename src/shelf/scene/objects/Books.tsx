import { useMemo } from "react";
import * as THREE from "three";
import { roundedBox } from "../geometry";
import { mat } from "../materials";
import { spineTexture } from "../textures";
import { linen, pageLines } from "../surfaces";

/**
 * The books and paper objects (spec §5). Every object's origin is the middle
 * of its base, sitting on the shelf top, front facing +Z.
 */

/** Book cloth: matte, with a linen weave you can see where the light grazes it. */
const CLOTH = { roughness: 0.86, normalMap: linen(), normalScale: 0.55 };

/** A hardback standing spine-out, with its title up the spine. */
function SpineBook({
  x,
  color,
  title,
  thickness,
  height,
  depth,
}: {
  x: number;
  color: string;
  title: string;
  thickness: number;
  height: number;
  depth: number;
}) {
  const geo = useMemo(() => roundedBox(thickness, height, depth, 0.02, 0.012), [thickness, height, depth]);
  const spine = useMemo(() => (title ? spineTexture(color, title) : null), [color, title]);
  return (
    <group position={[x, height / 2, 0]}>
      <mesh geometry={geo} material={mat(color, CLOTH)} castShadow receiveShadow />
      {/* Page edges, peeking at the top: a slightly lighter, coloured block. */}
      <mesh position={[0, height / 2 - 0.004, -0.02]}>
        <boxGeometry args={[thickness - 0.03, 0.01, depth - 0.08]} />
        <meshStandardMaterial
          color={new THREE.Color(color).lerp(new THREE.Color("#F6F3EC"), 0.6)}
          roughness={0.9}
          normalMap={pageLines()}
          normalScale={new THREE.Vector2(0.8, 0.8)}
        />
      </mesh>
      {spine ? (
        <mesh position={[0, 0, depth / 2 + 0.0015]}>
          <planeGeometry args={[thickness - 0.026, height - 0.03]} />
          <meshStandardMaterial map={spine} roughness={0.86} normalMap={linen()} normalScale={new THREE.Vector2(0.55, 0.55)} />
        </mesh>
      ) : null}
    </group>
  );
}

/** 2. The four case studies in an open box holder (B16, B17). */
export function CaseStudies() {
  const books = [
    { color: "#93C49A", title: "Bind Desk" },
    { color: "#F29A78", title: "Billy and Buddy" },
    { color: "#F4C3CE", title: "Greenera" },
    { color: "#8DB8E3", title: "The Family Table" },
  ];
  const T = 0.215;
  const H = 1.34;
  const D = 0.9;
  const wall = 0.045;
  const inner = books.length * T + 0.02;
  const boxW = inner + wall * 2;
  const box = mat("#E9DFC9", { roughness: 0.8 });
  const side = useMemo(() => roundedBox(wall, 1.0, D + 0.06, 0.015, 0.012), [D]);
  const base = useMemo(() => roundedBox(boxW, wall, D + 0.06, 0.015, 0.012), [boxW, D]);
  const back = useMemo(() => roundedBox(boxW, 1.0, wall, 0.015, 0.012), [boxW]);
  return (
    <group>
      <mesh geometry={base} material={box} position={[0, wall / 2, 0]} castShadow receiveShadow />
      <mesh geometry={side} material={box} position={[-boxW / 2 + wall / 2, 0.5, 0]} castShadow receiveShadow />
      <mesh geometry={side} material={box} position={[boxW / 2 - wall / 2, 0.5, 0]} castShadow receiveShadow />
      <mesh geometry={back} material={box} position={[0, 0.5, -D / 2 - 0.01]} castShadow receiveShadow />
      <group position={[0, wall, 0.03]}>
        {books.map((b, i) => (
          <SpineBook
            key={b.title}
            x={-inner / 2 + T / 2 + 0.01 + i * T}
            color={b.color}
            title={b.title}
            thickness={T - 0.008}
            height={H}
            depth={D - 0.04}
          />
        ))}
      </group>
    </group>
  );
}

/** 4. Experiments: a short spiral notebook, face out, metal coil on the left. */
export function Experiments() {
  // Taller than the case-study books (1.39 with their box), as Dvija asked.
  const W = 1.1;
  const H = 1.62;
  const cover = useMemo(() => roundedBox(W, H, 0.12, 0.04, 0.015), []);
  const ring = useMemo(() => new THREE.TorusGeometry(0.05, 0.009, 8, 20), []);
  const metal = mat("#C4C7C9", { metalness: 0.9, roughness: 0.3, rim: 0.1 });
  const rings = 20;
  return (
    <group position={[0, 0, 0.05]} rotation={[-0.06, 0, 0]}>
      <mesh geometry={cover} material={mat("#6E9E7E", CLOTH)} position={[0, H / 2, 0]} castShadow receiveShadow />
      {Array.from({ length: rings }, (_, i) => (
        <mesh
          key={i}
          geometry={ring}
          material={metal}
          position={[-W / 2 + 0.01, 0.08 + (i / (rings - 1)) * (H - 0.16), 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        />
      ))}
    </group>
  );
}

/** 5. About: one slim hardback standing spine-out beside the spiral. */
export function About() {
  return (
    <group>
      <SpineBook x={0} color="#C8432E" title="About" thickness={0.2} height={1.16} depth={0.8} />
    </group>
  );
}

/** 8. Résumé: a grey card pocket folder, thumb notch, the sheet and a lime tab. */
export function Resume() {
  const geos = useMemo(() => {
    const W = 0.92;
    const panel = (h: number, notch: boolean) => {
      const s = new THREE.Shape();
      const r = 0.06;
      s.moveTo(-W / 2 + r, 0);
      s.lineTo(W / 2 - r, 0);
      s.quadraticCurveTo(W / 2, 0, W / 2, r);
      s.lineTo(W / 2, h - r);
      s.quadraticCurveTo(W / 2, h, W / 2 - r, h);
      if (notch) {
        s.lineTo(0.17, h);
        s.absarc(0, h, 0.17, 0, Math.PI, true);
      }
      s.lineTo(-W / 2 + r, h);
      s.quadraticCurveTo(-W / 2, h, -W / 2, h - r);
      s.lineTo(-W / 2, r);
      s.quadraticCurveTo(-W / 2, 0, -W / 2 + r, 0);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.012,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 2,
        curveSegments: 16,
      });
      return g;
    };
    return { back: panel(1.28, false), front: panel(0.98, true) };
  }, []);
  return (
    <group position={[0, 0, 0.05]} rotation={[-0.07, 0, 0]}>
      <mesh geometry={geos.back} material={mat("#B9BFC3", { roughness: 0.75 })} position={[0, 0, -0.05]} castShadow receiveShadow />
      {/* The résumé sheet inside, and the lime tab peeking out above it. */}
      <mesh position={[0, 0.62, -0.02]} castShadow>
        <boxGeometry args={[0.8, 1.18, 0.006]} />
        <meshStandardMaterial color="#EEECE5" roughness={0.9} />
      </mesh>
      <mesh position={[0.27, 1.25, -0.015]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.008]} />
        <meshStandardMaterial color="#E2EE9A" roughness={0.7} />
      </mesh>
      <mesh geometry={geos.front} material={mat("#C6CCCF", { roughness: 0.72 })} position={[0, 0, 0.0]} castShadow receiveShadow />
    </group>
  );
}

/** 9 and 10. Illustrations (black notebook) with Random design thoughts (blue) leaning in front. */
export function Notebooks() {
  // Illustrations: a square sketchbook. Random design thoughts: an A6 pocket notebook.
  const black = useMemo(() => roundedBox(1.08, 1.08, 0.13, 0.05, 0.015), []);
  const blue = useMemo(() => roundedBox(0.5, 0.72, 0.06, 0.035, 0.01), []);
  return (
    <group>
      <mesh geometry={black} material={mat("#2B2B2E", { roughness: 0.6 })} position={[-0.12, 0.54, -0.08]} rotation={[-0.05, 0, 0]} castShadow receiveShadow />
      {/* An elastic band down the black notebook, as on a real sketchbook. */}
      <mesh position={[0.3, 0.54, -0.005]} rotation={[-0.05, 0, 0]}>
        <boxGeometry args={[0.03, 1.08, 0.005]} />
        <meshStandardMaterial color="#1E1E20" roughness={0.5} />
      </mesh>
      <mesh geometry={blue} material={mat("#2C4BD6", CLOTH)} position={[0.36, 0.36, 0.14]} rotation={[-0.1, -0.08, 0]} castShadow receiveShadow />
    </group>
  );
}
