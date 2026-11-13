import { useMemo } from "react";
import * as THREE from "three";
import { roundedBox } from "../geometry";
import { glass, ink, mat, steel } from "../materials";
import { lathe } from "../shapes";
import { clockFace, dialFace, gaugeFace, slots } from "../textures";

/**
 * The props (spec §5). Origins sit at the middle of the base, front facing +Z.
 */

/**
 * 1. The lamp: Dvija's bucket-hat character, neutral pose (lamp-brief/).
 * Proportions follow the brief's summary in its own units (4 = total
 * height), scaled down to shelf size. Off-white body, teal bucket hat as the
 * lampshade, dot eyes under the brim, no mouth, a small blue jacket, and a
 * warm glow under the brim.
 */
export function Lamp() {
  const k = 1.12 / 4;
  const g = useMemo(() => {
    const body = lathe(
      [
        [0, 0.12], [0.6, 0.12], [0.7, 0.3], [0.71, 0.9], [0.66, 1.3], [0.58, 1.7],
        [0.47, 2.1], [0.36, 2.4], [0.28, 2.58], [0.12, 2.67], [0, 2.69],
      ],
      40,
    );
    // The jacket hangs open at the front, so the white body shows down the middle.
    const jacket = new THREE.LatheGeometry(
      ([[0.74, 0.95], [0.75, 1.3], [0.67, 1.72], [0.55, 2.1], [0.43, 2.38], [0.36, 2.45]] as const).map(
        ([r, y]) => new THREE.Vector2(r, y),
      ),
      40,
      0.75,
      Math.PI * 2 - 1.5,
    );
    const crown = lathe(
      [[0.8, 3.0], [0.8, 3.08], [0.76, 3.4], [0.7, 3.75], [0.6, 3.92], [0.35, 3.99], [0, 4.0]],
      40,
    );
    const brim = lathe([[1.09, 2.72], [1.1, 2.75], [0.82, 3.03], [0.79, 3.02], [1.05, 2.71]], 48);
    const band = new THREE.TorusGeometry(0.805, 0.03, 8, 48);
    const arm = new THREE.CapsuleGeometry(0.19, 1.15, 6, 14);
    const foot = new THREE.SphereGeometry(0.34, 20, 14);
    return { body, jacket, crown, brim, band, arm, foot };
  }, []);
  const white = mat("#F4F1EC", { roughness: 0.62 });
  const hat = mat("#2A9D9A", { roughness: 0.82 });
  const blue = mat("#3B73D6", { roughness: 0.8 });
  return (
    <group scale={[k, k, k * 0.8]}>
      <mesh geometry={g.body} material={white} castShadow receiveShadow />
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} geometry={g.foot} material={white} position={[x, 0.17, 0.12]} scale={[1, 0.55, 1.35]} castShadow />
      ))}
      <mesh geometry={g.jacket} material={mat("#3B73D6", { roughness: 0.8, side: THREE.DoubleSide })} castShadow />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={g.arm} material={blue} position={[side * 0.86, 1.62, 0]} rotation={[0, 0, side * 0.14]} castShadow />
      ))}
      <mesh geometry={g.brim} material={hat} castShadow />
      <mesh geometry={g.crown} material={hat} castShadow />
      <mesh geometry={g.band} material={mat("#23837F", { roughness: 0.8 })} position={[0, 3.05, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} material={ink()} position={[x, 2.5, 0.36]}>
          <sphereGeometry args={[0.07, 14, 10]} />
        </mesh>
      ))}
      {/* The warm glow under the brim: the lamp's light. */}
      <mesh position={[0, 2.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.78, 32]} />
        <meshBasicMaterial color="#FFE7B8" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.5, 0.4]} color="#FFD9A0" intensity={0.5} distance={2.4} decay={1.5} />
    </group>
  );
}

/** 7. The clock: butter yellow, on two feet, cream face, dark yellow-brown numerals. */
export function Clock() {
  const R = 0.46;
  const g = useMemo(() => {
    const rim = new THREE.CylinderGeometry(R, R, 0.2, 56, 1);
    const bezel = new THREE.TorusGeometry(R - 0.02, 0.035, 12, 56);
    const foot = new THREE.SphereGeometry(0.06, 14, 10);
    return { rim, bezel, foot };
  }, []);
  const face = useMemo(() => clockFace("#F7EFD8", "#7A5A17"), []);
  const yellow = mat("#F2D06B", { roughness: 0.5 });
  return (
    <group position={[0, R + 0.08, 0.05]}>
      <mesh geometry={g.rim} material={yellow} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow />
      <mesh geometry={g.bezel} material={yellow} position={[0, 0, 0.1]} castShadow />
      <mesh position={[0, 0, 0.101]}>
        <circleGeometry args={[R - 0.05, 56]} />
        <meshStandardMaterial map={face} roughness={0.7} />
      </mesh>
      {[-0.27, 0.27].map((x) => (
        <mesh key={x} geometry={g.foot} material={yellow} position={[x, -R + 0.0, 0]} scale={[1, 0.8, 1.4]} castShadow />
      ))}
    </group>
  );
}

/**
 * 12. Dvija's espresso machine, the tallest object: brushed steel, a bean
 * hopper and two glass cups on top, a pressure gauge, three buttons, the group
 * head and portafilter, a slotted drip tray. No brand mark.
 */
export function CoffeeMachine() {
  const g = useMemo(() => {
    const body = roundedBox(1.28, 0.9, 0.95, 0.09, 0.05);
    const column = roundedBox(1.28, 0.5, 0.42, 0.09, 0.05);
    const tray = roundedBox(1.18, 0.1, 0.62, 0.05, 0.02);
    const hopper = lathe([[0, 0], [0.1, 0], [0.2, 0.08], [0.22, 0.42], [0.2, 0.44], [0, 0.44]], 40);
    const lid = lathe([[0, 0], [0.235, 0], [0.24, 0.05], [0.18, 0.08], [0, 0.085]], 40);
    const cup = lathe([[0, 0], [0.1, 0], [0.12, 0.02], [0.13, 0.2], [0.12, 0.2], [0.11, 0.03], [0, 0.03]], 32);
    const handle = new THREE.TorusGeometry(0.06, 0.012, 8, 20, Math.PI * 1.2);
    const beans = Array.from({ length: 26 }, (_, i) => {
      const a = i * 2.4;
      const r = 0.05 + (i % 5) * 0.03;
      return new THREE.Vector3(Math.cos(a) * r, 0.06 + Math.floor(i / 5) * 0.06, Math.sin(a) * r);
    });
    const bean = new THREE.SphereGeometry(0.035, 10, 8);
    const group = new THREE.CylinderGeometry(0.15, 0.13, 0.12, 32);
    const portafilter = new THREE.CylinderGeometry(0.13, 0.12, 0.08, 32);
    const pfHandle = new THREE.CapsuleGeometry(0.035, 0.32, 4, 10);
    const gauge = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 40);
    const button = new THREE.SphereGeometry(0.06, 16, 12);
    const wand = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.45, 0.47, 0.3),
        new THREE.Vector3(0.48, 0.4, 0.42),
        new THREE.Vector3(0.48, 0.25, 0.46),
        new THREE.Vector3(0.46, 0.16, 0.46),
      ]),
      20,
      0.022,
      8,
      false,
    );
    return { body, column, tray, hopper, lid, cup, handle, beans, bean, group, portafilter, pfHandle, gauge, button, wand };
  }, []);
  const gauge = useMemo(() => gaugeFace(), []);
  const tray = useMemo(() => slots(), []);
  const metal = steel();
  const dark = mat("#2E2F31", { roughness: 0.45, metalness: 0.2 });
  const base = 0.12;
  return (
    <group>
      {/* Feet and drip tray. */}
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.03, 0.3]} material={dark}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
        </mesh>
      ))}
      <mesh geometry={g.tray} material={metal} position={[0, base - 0.04, 0.2]} castShadow receiveShadow />
      <mesh position={[0, base + 0.012, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.0, 0.45]} />
        <meshStandardMaterial map={tray} metalness={0.6} roughness={0.4} />
      </mesh>
      {/* The body: the upper housing, over a back column, with the brew area open below. */}
      <mesh geometry={g.body} material={metal} position={[0, base + 0.9, -0.08]} castShadow receiveShadow />
      <mesh geometry={g.column} material={metal} position={[0, base + 0.25, -0.34]} castShadow receiveShadow />
      {/* Pressure gauge and the three buttons on the front. */}
      <group position={[-0.32, base + 1.02, 0.4]}>
        <mesh geometry={g.gauge} material={metal} rotation={[Math.PI / 2, 0, 0]} />
        <mesh position={[0, 0, 0.026]}>
          <circleGeometry args={[0.13, 40]} />
          <meshStandardMaterial map={gauge} roughness={0.3} />
        </mesh>
      </group>
      {[0.02, 0.2, 0.38].map((x) => (
        <mesh key={x} geometry={g.button} material={dark} position={[x, base + 1.02, 0.4]} scale={[1, 1, 0.5]} />
      ))}
      {/* Group head and portafilter. */}
      <mesh geometry={g.group} material={metal} position={[-0.05, base + 0.4, 0.15]} castShadow />
      <mesh geometry={g.portafilter} material={dark} position={[-0.05, base + 0.3, 0.15]} castShadow />
      <mesh geometry={g.pfHandle} material={dark} position={[-0.05, base + 0.3, 0.38]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={g.wand} material={metal} position={[0, base, -0.08]} castShadow />
      {/* On top: the smoky bean hopper and two glass cups. */}
      <group position={[-0.28, base + 1.35, -0.1]}>
        <mesh geometry={g.hopper} material={glass("#B9B2A8", 0.45)} castShadow />
        {g.beans.map((p, i) => (
          <mesh key={i} geometry={g.bean} material={mat("#6B3F24", { roughness: 0.5 })} position={p} scale={[1, 0.7, 1.3]} />
        ))}
        <mesh geometry={g.lid} material={mat("#3A3F55", { roughness: 0.5 })} position={[0, 0.44, 0]} castShadow />
      </group>
      {[0.12, 0.38].map((x) => (
        <group key={x} position={[x, base + 1.35, -0.05]}>
          <mesh geometry={g.cup} material={glass()} castShadow />
          <mesh geometry={g.handle} material={glass()} position={[0.13, 0.11, 0]} rotation={[0, 0, -Math.PI * 0.6]} />
        </group>
      ))}
    </group>
  );
}

/** 14. The red rotary phone: contact (spec §8). Brass dial, coiled cord. */
export function Phone() {
  const g = useMemo(() => {
    // The base: a rounded, slightly tapered body.
    const base = lathe([[0, 0], [0.4, 0], [0.43, 0.03], [0.42, 0.12], [0.36, 0.32], [0.26, 0.42], [0, 0.44]], 40);
    base.scale(1.05, 1, 0.85);
    const handle = new THREE.CapsuleGeometry(0.07, 0.62, 6, 14);
    const cup = lathe([[0, 0], [0.11, 0], [0.14, 0.06], [0.12, 0.1], [0, 0.1]], 28);
    const cradle = new THREE.BoxGeometry(0.18, 0.08, 0.14);
    const dialRing = new THREE.CylinderGeometry(0.2, 0.2, 0.04, 40);
    const cord = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        Array.from({ length: 60 }, (_, i) => {
          const t = i / 59;
          const a = t * Math.PI * 2 * 9;
          return new THREE.Vector3(-0.42 - t * 0.12 + Math.cos(a) * 0.035, 0.1 + Math.sin(t * Math.PI) * 0.18, 0.05 + Math.sin(a) * 0.035 + t * 0.1);
        }),
      ),
      200,
      0.009,
      6,
      false,
    );
    return { base, handle, cup, cradle, dialRing, cord };
  }, []);
  const dial = useMemo(() => dialFace(), []);
  const red = mat("#E06F63", { roughness: 0.38 });
  const brass = mat("#B9974B", { metalness: 0.75, roughness: 0.32, rim: 0.1 });
  return (
    <group>
      <mesh geometry={g.base} material={red} castShadow receiveShadow />
      {/* The dial on the sloped front. */}
      <group position={[0, 0.26, 0.3]} rotation={[-0.85, 0, 0]}>
        <mesh geometry={g.dialRing} material={brass} rotation={[Math.PI / 2, 0, 0]} castShadow />
        <mesh position={[0, 0, 0.021]}>
          <circleGeometry args={[0.19, 40]} />
          <meshStandardMaterial map={dial} metalness={0.5} roughness={0.35} />
        </mesh>
      </group>
      {/* Cradle prongs and the handset resting on them. */}
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} geometry={g.cradle} material={red} position={[x, 0.45, -0.04]} castShadow />
      ))}
      <group position={[0, 0.58, -0.04]}>
        <mesh geometry={g.handle} material={red} rotation={[0, 0, Math.PI / 2]} castShadow />
        {[-1, 1].map((side) => (
          <mesh key={side} geometry={g.cup} material={red} position={[side * 0.36, -0.08, 0]} castShadow />
        ))}
      </group>
      <mesh geometry={g.cord} material={red} castShadow />
    </group>
  );
}
