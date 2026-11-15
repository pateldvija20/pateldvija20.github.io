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
/** The selection frame, in drawing-buffer pixels (x0, y0 bottom-left, x1, y1 top-right): inside it, a thing being revealed shows in colour. */
export const REVEAL_RECT = { value: new THREE.Vector4() };

/** Per-material fade, so each book and the cup can turn 3D on its own; `channel` is which one it belongs to (set by the scene). */
export type Tracked = { drawn: { value: number }; rectOn: { value: number }; channel?: string };
export const tracked = new Set<Tracked>();

export function whiten<M extends THREE.Material>(m: M): M {
  const t: Tracked = { drawn: { value: DRAWN.value }, rectOn: { value: 0 } };
  tracked.add(t);
  m.userData.tracked = t;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDrawn = t.drawn;
    shader.uniforms.uRectOn = t.rectOn;
    shader.uniforms.uRect = REVEAL_RECT;
    shader.uniforms.uDrawnTo = DRAWN_TO;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uDrawn;\nuniform float uRectOn;\nuniform vec4 uRect;\nuniform vec3 uDrawnTo;\nvoid main() {")
      .replace(
        "#include <colorspace_fragment>",
        `#include <colorspace_fragment>
float fade = uDrawn;
if (uRectOn > 0.5 && gl_FragCoord.x > uRect.x && gl_FragCoord.x < uRect.z && gl_FragCoord.y > uRect.y && gl_FragCoord.y < uRect.w) fade = 0.0;
gl_FragColor.rgb = mix(gl_FragColor.rgb, uDrawnTo, fade);`,
      );
  };
  m.customProgramCacheKey = () => "whiten2";
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
