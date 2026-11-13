import { useMemo } from "react";
import * as THREE from "three";
import { WALL } from "../palette";
import { roundedBox } from "./geometry";
import { WALL_SIZE } from "./wallLight";
import { brushed } from "./surfaces";

/** Shelf dimensions, in scene units (about 1 unit = 20 cm). */
export const SHELF = {
  length: 12.2,
  depth: 0.75,
  /** Thicker than the old glass, like the steel slab in refs/59. */
  thickness: 0.12,
  /** Height of the shelf's top surface: objects stand on this. */
  top: -0.9,
} as const;

/**
 * The coffee corner (CoffeeCorner.tsx, Dvija 12 Nov): a walnut sideboard after
 * a gap at the right end of the bookshelf, its top level with the shelf top.
 * `length` is the sideboard's width. `floor` is where its legs stand, below
 * the shelf top.
 */
export const STATION = {
  gap: 1.4,
  length: 6.0,
  floor: -4.1,
  get start() {
    return SHELF.length / 2 + this.gap;
  },
  get centre() {
    return this.start + this.length / 2;
  },
  get end() {
    return this.start + this.length;
  },
} as const;

/** Bright brushed steel, as in refs/59. */
const STEEL = "#DDE0E2";
/** The lavender thread (colour table, 10 Nov). */
const LAVENDER = "#B9A7E0";

/**
 * The wall: pure white (Dvija, 10 Nov). A lit plane always shades a little
 * grey, so the wall is drawn unlit at exact white, and a see-through
 * shadow-catcher just in front of it picks up every object's shadow.
 * The painted window patch (makeWallLight) is off: nothing can be lighter
 * than pure white.
 */
export function Wall() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[WALL_SIZE.w, WALL_SIZE.h]} />
        <meshBasicMaterial color={WALL} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]} receiveShadow>
        <planeGeometry args={[WALL_SIZE.w, WALL_SIZE.h]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
    </group>
  );
}

/**
 * The brushed-steel ledge with rounded ends, held by two lavender clamps
 * (style reference refs/59, Dvija, 10 Nov; replaces the frosted glass).
 * Each clamp is a U that hooks over the front edge: a lip on top, a plate
 * down the front, and an arm back under the ledge.
 */
export function Shelf() {
  const ledge = useMemo(
    () => roundedBox(SHELF.length, SHELF.thickness, SHELF.depth, 0.32, 0.03),
    [],
  );
  const plate = useMemo(() => roundedBox(0.2, SHELF.thickness + 0.26, 0.045, 0.02, 0.015), []);
  const lip = useMemo(() => roundedBox(0.2, 0.025, 0.09, 0.02, 0.01), []);
  const arm = useMemo(() => roundedBox(0.2, 0.04, SHELF.depth * 0.8, 0.02, 0.015), []);
  const steelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: STEEL,
        // Part metal, part matte, so the top catches the window light and stays
        // light grey instead of mirroring the dim room (tuned 11 Nov).
        metalness: 0.35,
        roughness: 0.3,
        envMapIntensity: 2,
        normalMap: brushed(),
        normalScale: new THREE.Vector2(0.3, 0.3),
      }),
    [],
  );
  const clampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: LAVENDER, roughness: 0.55 }), []);

  const y = SHELF.top - SHELF.thickness / 2;
  const z = SHELF.depth / 2 + 0.02;
  const front = z + SHELF.depth / 2;
  const cx = SHELF.length / 2 - 0.9;
  const below = SHELF.top - SHELF.thickness - 0.02;

  return (
    <group>
      <mesh geometry={ledge} material={steelMat} position={[0, y, z]} castShadow receiveShadow />
      {[-cx, cx].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={plate} material={clampMat} position={[0, SHELF.top - (SHELF.thickness + 0.26) / 2 + 0.02, front + 0.022]} castShadow receiveShadow />
          <mesh geometry={lip} material={clampMat} position={[0, SHELF.top + 0.012, front - 0.03]} castShadow />
          <mesh geometry={arm} material={clampMat} position={[0, below, z + 0.06]} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

