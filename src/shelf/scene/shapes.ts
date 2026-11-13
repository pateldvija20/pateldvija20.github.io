import * as THREE from "three";

/** Spin a side profile [radius, height][] around Y: pots, cups, the lamp body. */
export function lathe(profile: [number, number][], segments = 48): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)),
    segments,
  );
}

/** A smooth pot profile: base, belly, rim lip. Height h, base radius r0, top radius r1. */
export function potProfile(h: number, r0: number, r1: number, lip = 0.03): [number, number][] {
  const pts: [number, number][] = [[0, 0], [r0 - 0.03, 0], [r0, 0.03]];
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * t + Math.sin(t * Math.PI) * 0.03;
    pts.push([r, h * t]);
  }
  pts.push([r1 + lip * 0.3, h + lip * 0.4], [r1 - lip, h + lip * 0.5], [r1 - lip, h - 0.06]);
  return pts;
}

/** A flat leaf outline, extruded paper-thin with soft edges. */
function leafGeometry(shape: THREE.Shape, thickness = 0.012): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 10,
  });
  g.translate(0, 0, -thickness / 2);
  return g;
}

/** Pilea's round "coin" leaf, stem attached at the origin, leaf along +Y. */
export function coinLeaf(r: number) {
  const s = new THREE.Shape();
  s.absarc(0, r, r, 0, Math.PI * 2, false);
  return leafGeometry(s, 0.01);
}

/** Pothos' heart-shaped leaf, tip along +Y. */
export function heartLeaf(size: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-size * 0.7, size * 0.05, -size * 0.65, size * 0.75, 0, size * 1.1);
  s.bezierCurveTo(size * 0.65, size * 0.75, size * 0.7, size * 0.05, 0, 0);
  return leafGeometry(s, 0.01);
}

/** Snake plant's tall pointed leaf, base at the origin, tip along +Y. */
export function swordLeaf(width: number, height: number) {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.35, 0);
  s.bezierCurveTo(-width * 0.6, height * 0.35, -width * 0.45, height * 0.75, 0, height);
  s.bezierCurveTo(width * 0.45, height * 0.75, width * 0.6, height * 0.35, width * 0.35, 0);
  s.lineTo(-width * 0.35, 0);
  return leafGeometry(s, 0.018);
}

/** Small seeded random, so plants grow the same way every load. */
export function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Flute a lathe shape: push each vertex in or out by its angle, so the surface
 * gets n rounded vertical ribs with sharp valleys between them (ribbed glass,
 * a ribbed pot). Use plenty of lathe segments (n × 6 or more).
 */
export function ribbed(geo: THREE.BufferGeometry, n: number, depth: number) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - depth + depth * Math.abs(Math.cos((n * a) / 2));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
