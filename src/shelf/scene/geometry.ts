import * as THREE from "three";

/**
 * A box with rounded corners in plan and bevelled (rounded) edges top and
 * bottom: the "clean product render" edge that catches the light.
 *
 * Built as a rounded rectangle (width x depth) extruded upward, so the
 * result is centred on the origin with its height along Y.
 */
export function roundedBox(
  width: number,
  height: number,
  depth: number,
  cornerRadius: number,
  bevel: number,
  curveSegments = 8,
): THREE.BufferGeometry {
  const r = Math.min(cornerRadius, width / 2 - bevel, depth / 2 - bevel);
  const w = width / 2 - bevel;
  const d = depth / 2 - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(height - bevel * 2, 0.0001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments,
  });
  // Extrusion runs along +Z; stand it up so height is Y, then centre it.
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  geo.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2);
  // Keep ExtrudeGeometry's own normals: recomputing them on this non-indexed
  // geometry would facet the bevels.
  return geo;
}
