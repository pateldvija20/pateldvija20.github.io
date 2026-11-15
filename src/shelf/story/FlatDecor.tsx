import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { coffeeMachine, hangingPlant, snakePlant, FILL, INK, type Art } from "./flatArt";
import { HANG_AT, HANGER, MACHINE_Z, PLANT_Z, SHELF, STROKE, view } from "./layout";

/**
 * The flat outline illustrations, stood in the 3D scene as cards, so they
 * keep their place as things move. Unlit and shadowless: paper cut-outs.
 */

/** Raster pixels per SVG unit (1000 per scene unit): sharp at 2x density. */
export const PX = 2;

export async function rasterize(svg: string): Promise<THREE.Texture> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useSvgTexture(svg: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    rasterize(svg).then((t) => live && setTex(t));
    return () => {
      live = false;
    };
  }, [svg]);
  return tex;
}

/** An Art card, its foot at the group's origin. */
export function Card({ art, z = 0, order = 1 }: { art: Art; z?: number; order?: number }) {
  const tex = useSvgTexture(art.svg);
  if (!tex) return null;
  const w = art.max[0] - art.min[0];
  const h = art.max[1] - art.min[1];
  return (
    <mesh position={[(art.min[0] + art.max[0]) / 2, (art.min[1] + art.max[1]) / 2, z]} renderOrder={order} userData={{ ink: "skip" }}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Eases a group's x to where this frame wants it (the plant and machine stepping aside). */
export function Slide({ x, z, children }: { x: number; z: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const placed = useRef(false);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const k = placed.current ? 1 - Math.exp(-dt * 3.2) : 1;
    placed.current = true;
    o.position.x += (x - o.position.x) * k;
  });
  return (
    <group ref={g} position-z={z}>
      {children}
    </group>
  );
}

/** Holds its children at the screen's top-right, where the storyboard always draws the hanging plant. */
export function ScreenAnchor({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    g.current?.position.set(view.left + HANG_AT.x * (view.right - view.left), view.top - HANG_AT.fromTop * (view.top - view.bottom), HANGER.z);
  });
  return <group ref={g}>{children}</group>;
}

// Not tone-mapped: the shelf stays pure white and pure ink whatever the 3D objects' tone mapping does.
const lineMat = new THREE.MeshBasicMaterial({ color: INK, toneMapped: false });
const paper = new THREE.MeshBasicMaterial({ color: FILL, toneMapped: false });

/** The shelf as a drawing: its front face, outlined top and bottom. */
export function FlatShelf() {
  const { width, depth, thick } = SHELF;
  const front = depth / 2;
  return (
    <group>
      <mesh material={paper} position={[0, -thick / 2, 0]} userData={{ ink: "skip" }}>
        <boxGeometry args={[width, thick, depth]} />
      </mesh>
      {[-STROKE / 2, -thick + STROKE / 2].map((y) => (
        <mesh key={y} material={lineMat} position={[0, y, front + 0.001]} userData={{ ink: "skip" }}>
          <planeGeometry args={[width, STROKE]} />
        </mesh>
      ))}
    </group>
  );
}

export const ART = { machine: coffeeMachine(PX), plant: snakePlant(PX), hanger: hangingPlant(PX) };

/**
 * The decor as flat drawings. `cup` (and anything else that rides on the
 * machine, like the contact links' anchor) goes inside the machine's group,
 * so it slides with it.
 */
export default function FlatDecor({ plantX, machineX, cup }: { plantX: number; machineX: number; cup: ReactNode }) {
  return (
    <group>
      <FlatShelf />
      <Slide x={plantX} z={PLANT_Z}>
        <Card art={ART.plant} />
      </Slide>
      <Slide x={machineX} z={MACHINE_Z}>
        <Card art={ART.machine} />
        {cup}
      </Slide>
      <ScreenAnchor>
        <Card art={ART.hanger} />
      </ScreenAnchor>
    </group>
  );
}
