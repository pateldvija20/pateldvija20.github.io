import * as THREE from "three";

/**
 * Surface detail as normal maps (Dvija, 11 Nov: "more detailed"). A normal map
 * is an image that tells the light which way each tiny patch of a surface
 * faces, so a flat shape catches light like woven cloth or brushed metal
 * without any extra geometry. Each map is drawn once on a canvas from a
 * height pattern, and tiles seamlessly.
 */

type Height = (x: number, y: number) => number;

function normalMap(size: number, height: Height, strength: number, repeat: [number, number]) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = height(x, y);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];

  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

/** A seeded random, so the textures look the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let linenTex: THREE.Texture | null = null;
/**
 * Book cloth: a plain over-under linen weave with uneven threads (slubs).
 * Book geometry UVs are in scene units, so `repeat` sets threads per unit.
 */
export function linen() {
  if (linenTex) return linenTex;
  const S = 256;
  const P = 8; // pixels per thread
  const r = rng(7);
  const slubX = Array.from({ length: S / P }, () => 0.75 + r() * 0.5);
  const slubY = Array.from({ length: S / P }, () => 0.75 + r() * 0.5);
  const grain = Array.from({ length: S * S }, () => r());
  linenTex = normalMap(
    S,
    (x, y) => {
      const cx = Math.floor(x / P);
      const cy = Math.floor(y / P);
      const over = (cx + cy) % 2 === 0;
      const warp = Math.sin(((x % P) / P) * Math.PI) * slubX[cx];
      const weft = Math.sin(((y % P) / P) * Math.PI) * slubY[cy];
      return (over ? warp : weft) * 1.0 + grain[y * S + x] * 0.12;
    },
    1.6,
    [6, 6],
  );
  return linenTex;
}

let pagesTex: THREE.Texture | null = null;
/** Page edges seen from the top: fine lines, one per leaf, slightly uneven. */
export function pageLines() {
  if (pagesTex) return pagesTex;
  const S = 256;
  const r = rng(11);
  const jitter = Array.from({ length: S }, () => r());
  pagesTex = normalMap(S, (x) => Math.sin((x / 3) * Math.PI) * 0.6 + jitter[x] * 0.4, 1.2, [1, 1]);
  return pagesTex;
}

let brushedTex: THREE.Texture | null = null;
/** Brushed steel: long fine streaks running one way (along u). */
export function brushed() {
  if (brushedTex) return brushedTex;
  const S = 512;
  const r = rng(3);
  // Each row gets its own streak value, smoothed a little so streaks have width.
  const raw = Array.from({ length: S }, () => r());
  const rows = raw.map((_, i) => (raw[i] * 2 + raw[(i + 1) % S] + raw[(i + S - 1) % S]) / 4);
  const fleck = Array.from({ length: S * S }, () => r());
  brushedTex = normalMap(S, (x, y) => rows[y] + fleck[y * S + x] * 0.05, 0.9, [2, 2]);
  return brushedTex;
}

let glazeTex: THREE.Texture | null = null;
/** Glazed ceramic: a very soft, low ripple, so pots catch light unevenly. */
export function glaze() {
  if (glazeTex) return glazeTex;
  const S = 256;
  const r = rng(5);
  const waves = Array.from({ length: 6 }, () => ({ fx: 1 + Math.floor(r() * 4), fy: 1 + Math.floor(r() * 4), p: r() * 6.28 }));
  glazeTex = normalMap(
    S,
    (x, y) =>
      waves.reduce((s, w) => s + Math.sin(((x * w.fx + y * w.fy) / S) * Math.PI * 2 + w.p), 0) * 0.5,
    4,
    [1, 1],
  );
  return glazeTex;
}

let brushedAcross: THREE.Texture | null = null;
/** The brushed streaks turned a quarter, for model faces whose UVs run the other way. */
export function brushedTurned() {
  if (brushedAcross) return brushedAcross;
  brushedAcross = brushed().clone();
  brushedAcross.center.set(0.5, 0.5);
  brushedAcross.rotation = Math.PI / 2;
  brushedAcross.needsUpdate = true;
  return brushedAcross;
}

let spunTex: THREE.Texture | null = null;
/**
 * Spun metal, as on the Breville's button faces (refs/67): fine concentric
 * rings, so the light catches as a wedge that turns with the view.
 */
export function spunMetal() {
  if (spunTex) return spunTex;
  // Fine and faint: hundreds of hairline rings, not a few grooves.
  const S = 512;
  const r = rng(17);
  const rings = Array.from({ length: S * 2 }, () => r());
  spunTex = normalMap(
    S,
    (x, y) => {
      const d = Math.hypot(x - S / 2, y - S / 2) * 2;
      const i = Math.floor(d);
      return (rings[i] ?? 0) * 0.6 + (rings[i + 1] ?? 0) * 0.4;
    },
    0.5,
    [1, 1],
  );
  spunTex.wrapS = spunTex.wrapT = THREE.ClampToEdgeWrapping;
  return spunTex;
}
