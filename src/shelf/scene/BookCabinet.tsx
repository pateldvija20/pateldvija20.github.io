import { useMemo } from "react";
import * as THREE from "three";
import { SHELF, STATION } from "./Room";

/**
 * The bookshelf's cabinet (Dvija, 12 Nov, refs/66): it replaces the steel wall
 * shelf and its lavender clamps. A low lacquered sideboard in pale butter
 * yellow, with softly rounded outer corners, two handle-less doors on the left
 * and three drawers on the right, on a recessed plinth.
 *
 * Its top is the bookshelf top (SHELF.top) and it stands on the same floor as
 * the walnut coffee cabinet, so the two read as a pair. It runs the bookshelf's
 * full length. The books and objects stand on it, towards the wall.
 */

const YELLOW = "#ECDF94";
/** The reveal behind the fronts: the same lacquer, in shadow. */
const REVEAL = "#7E7440";
const PLINTH = "#D8CA82";

const W = SHELF.length;
const HEIGHT = -STATION.floor;
const PLINTH_H = 0.24;
const BODY = HEIGHT - PLINTH_H;
const D = 1.9;
/** Front-view corner radius of the carcass (about 3 cm). */
const R = 0.16;
/** The carcass border visible around the fronts. */
const FRAME = 0.09;
const GAP = 0.05;
const BEVEL = 0.03;

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** A front panel: flat, with its edges just eased. */
function Front({ x, y, w, h, z, mat }: { x: number; y: number; w: number; h: number; z: number; mat: THREE.Material }) {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRect(w, h, 0.02), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 4 });
    return g;
  }, [w, h]);
  return <mesh geometry={geo} material={mat} position={[x, y, z]} castShadow receiveShadow />;
}

export default function BookCabinet() {
  const mats = useMemo(() => {
    const lacquer = (color: string, roughness: number) =>
      new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4 });
    return { body: lacquer(YELLOW, 0.5), front: lacquer(YELLOW, 0.45), reveal: lacquer(REVEAL, 0.7), plinth: lacquer(PLINTH, 0.6) };
  }, []);
  const carcass = useMemo(
    () =>
      new THREE.ExtrudeGeometry(roundedRect(W - BEVEL * 2, BODY - BEVEL * 2, R), {
        depth: D - BEVEL * 2,
        bevelEnabled: true,
        bevelThickness: BEVEL,
        bevelSize: BEVEL,
        bevelSegments: 4,
        curveSegments: 12,
      }),
    [],
  );

  // The fronts fill the carcass face inside its border, in the photo's
  // proportions: two doors (30% and 31%) and a column of three drawers (39%).
  const innerW = W - FRAME * 2;
  const innerH = BODY - FRAME * 2;
  const faceZ = D;
  const cols = [0.3, 0.31, 0.39].map((f) => f * innerW);
  const left = -W / 2 + FRAME;
  const colX = (i: number) => left + cols.slice(0, i).reduce((a, b) => a + b, 0) + cols[i] / 2;
  const top = -FRAME;
  const fronts: { x: number; y: number; w: number; h: number }[] = [
    { x: colX(0), y: top - innerH / 2, w: cols[0] - GAP, h: innerH - GAP },
    { x: colX(1), y: top - innerH / 2, w: cols[1] - GAP, h: innerH - GAP },
    // Drawers sit a touch low in their openings, so a deeper shadow line shows above each (refs/66).
    ...[0, 1, 2].map((k) => ({ x: colX(2), y: top - (innerH / 3) * (k + 0.5) - GAP * 0.2, w: cols[2] - GAP, h: innerH / 3 - GAP * 1.4 })),
  ];

  return (
    <group name="book-cabinet" position={[0, SHELF.top, 0.02]}>
      <mesh geometry={carcass} material={mats.body} position={[0, -BODY / 2, BEVEL]} castShadow receiveShadow />
      {/* The shadowed reveal the fronts sit in, so the gaps between them read. */}
      <mesh position={[0, top - innerH / 2, faceZ + 0.002]} material={mats.reveal}>
        <planeGeometry args={[innerW, innerH]} />
      </mesh>
      {fronts.map((f, i) => (
        <Front key={i} x={f.x} y={f.y} w={f.w} h={f.h} z={faceZ - 0.012} mat={mats.front} />
      ))}
      {/* Recessed plinth. */}
      <mesh position={[0, -BODY - PLINTH_H / 2, D / 2]} material={mats.plinth} castShadow receiveShadow>
        <boxGeometry args={[W - 0.5, PLINTH_H, D - 0.35]} />
      </mesh>
    </group>
  );
}
