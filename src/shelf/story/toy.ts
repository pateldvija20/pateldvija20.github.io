import * as THREE from "three";
import { BG_SRGB } from "./theme";

/**
 * The bright 3D objects' look: soft, chunky "toy" renders (the references:
 * clay-like, rounded, satin, studio-lit). Satin materials with a little
 * clearcoat and sheen, so they pick up soft highlights from the studio
 * environment instead of reading flat.
 *
 * Every toy material can fade to the page colour (DRAWN, 0 to 1): with the
 * ink pass drawing their outlines, that's the storyboard's frame 2, the
 * objects still line drawings before they turn 3D.
 */

export const DRAWN = { value: 0 };
/** The page colour the drawings fade to (sRGB, as written to the screen); follows light and dark. */
export const DRAWN_TO = { value: BG_SRGB };

export function whiten<M extends THREE.Material>(m: M): M {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDrawn = DRAWN;
    shader.uniforms.uDrawnTo = DRAWN_TO;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uDrawn;\nuniform vec3 uDrawnTo;\nvoid main() {")
      .replace("#include <colorspace_fragment>", "#include <colorspace_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, uDrawnTo, uDrawn);");
  };
  m.customProgramCacheKey = () => "whiten";
  return m;
}

export function toy(color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return whiten(
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      sheen: 0.5,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color("#FFFFFF"),
      ...extra,
    }),
  );
}

/** Printed pages: flat, unlit, exactly their texture's colours, readable when the spread fills the screen. */
export function printed(side: THREE.Side = THREE.FrontSide) {
  return whiten(new THREE.MeshBasicMaterial({ color: "#FFFFFF", toneMapped: false, side }));
}
