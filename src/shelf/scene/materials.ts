import * as THREE from "three";
import { brushed } from "./surfaces";

/**
 * Materials for the shelf objects (spec §4): clean matte product-render
 * surfaces, plus the lamp brief's faint rim glow, pale mint on one side and
 * soft peach on the other, picked by which way the surface faces on screen.
 */

const MINT = new THREE.Color("#BFEFDF");
const PEACH = new THREE.Color("#FFD2BE");
const RIM_STRENGTH = 0.22;

function addRim(mat: THREE.MeshStandardMaterial, strength: number) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimMint = { value: MINT };
    shader.uniforms.rimPeach = { value: PEACH };
    shader.uniforms.rimStrength = { value: strength };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 rimMint;\nuniform vec3 rimPeach;\nuniform float rimStrength;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          vec3 rimView = normalize(vViewPosition);
          float rimF = pow(1.0 - clamp(abs(dot(normal, rimView)), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += mix(rimPeach, rimMint, smoothstep(-0.3, 0.3, normal.x)) * rimF * rimStrength;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `rim-${strength}`;
}

type MatOptions = {
  roughness?: number;
  metalness?: number;
  map?: THREE.Texture | null;
  /** Surface detail (surfaces.ts): weave, brushing, glaze. */
  normalMap?: THREE.Texture | null;
  normalScale?: number;
  transparent?: boolean;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  rim?: number;
  side?: THREE.Side;
  /** How strongly the surface reflects the room. Metal and glass default higher. */
  envMapIntensity?: number;
};

/** Metal and glass reflect much more of the room than matte surfaces do. */
export function defaultReflection(o: { metalness?: number; transparent?: boolean }) {
  if ((o.metalness ?? 0) > 0.5) return 3.2;
  if (o.transparent) return 2;
  return 1;
}

const cache = new Map<string, THREE.MeshStandardMaterial>();

/** A matte standard material with the rim glow. Cached, so repeats share one. */
export function mat(color: string, o: MatOptions = {}): THREE.MeshStandardMaterial {
  const key = JSON.stringify([color, { ...o, map: o.map ? o.map.uuid : null, normalMap: o.normalMap ? o.normalMap.uuid : null }]);
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.roughness ?? 0.72,
    metalness: o.metalness ?? 0,
    map: o.map ?? null,
    normalMap: o.normalMap ?? null,
    normalScale: new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1),
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    emissive: o.emissive ?? "#000000",
    emissiveIntensity: o.emissiveIntensity ?? 1,
    side: o.side ?? THREE.FrontSide,
    envMapIntensity: o.envMapIntensity ?? defaultReflection(o),
  });
  // See-through surfaces must not hide what is behind them in the depth buffer.
  if (o.transparent) m.depthWrite = false;
  addRim(m, o.rim ?? RIM_STRENGTH);
  cache.set(key, m);
  return m;
}

/** Brushed steel: needs the scene environment to read as metal. */
export const steel = () =>
  mat("#D3D6D8", { metalness: 0.8, roughness: 0.3, rim: 0.06, normalMap: brushed(), normalScale: 0.35 });
/** Clear glass for cups and the bean hopper. */
export const glass = (tint = "#E3ECEA", opacity = 0.5) =>
  mat(tint, { roughness: 0.08, metalness: 0, transparent: true, opacity, rim: 0.35 });
/** The near-black used for eyes, buttons and dial holes. Never pure black. */
export const ink = () => mat("#2A2A2C", { roughness: 0.5 });
