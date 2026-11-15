import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { anim } from "./anim";
import { BG, INK_PX, INK_SRGB } from "./theme";

/**
 * The ink shader: one clean hairline (INK_PX, 1px) around everything marked
 * `userData.ink = "decor"`, where a surface ends in front of something
 * further back (depth) or turns a corner (normals), the way a pen outlines a
 * shape. Decor is filled with the page colour (inkFill), so it reads as a
 * line drawing; the bright 3D objects ("color") are left as they are.
 *
 * One line, not two (the user, 15 Nov): only the nearer side of a depth step
 * draws, and a fold draws on one side only.
 *
 * Each frame:
 *   1. Render normals, coverage and depth into an offscreen target. Decor
 *      writes its view normal; bright 3D objects ("color") only mark where
 *      they are; anything else is hidden.
 *   2. Render the scene as normal.
 *   3. Lay the lines over it.
 */

/** The page-coloured fill for decor: unlit, so the drawings are flat paper with ink lines. */
export const inkFill = new THREE.MeshBasicMaterial({ color: BG, toneMapped: false });
export const inkFill2 = new THREE.MeshBasicMaterial({ color: BG, toneMapped: false, side: THREE.DoubleSide });

/**
 * Wraps decor: every mesh inside gets the page-coloured fill and is marked
 * for the ink pass. Its own materials are replaced, so build decor without
 * worrying about them (set `side: DoubleSide` on thin sheets like leaves to
 * keep them double-sided).
 */
export function Inked({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    g.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.ink === "skip") return;
      const side = Array.isArray(m.material) ? m.material[0]?.side : m.material?.side;
      m.material = side === THREE.DoubleSide ? inkFill2 : inkFill;
      m.castShadow = false;
      m.receiveShadow = false;
      m.userData.ink = "decor";
    });
  });
  return <group ref={g}>{children}</group>;
}

const normalVert = /* glsl */ `
  varying vec3 vN;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vN = normalize(normalMatrix * n);
    gl_Position = projectionMatrix * modelViewMatrix * p;
  }
`;
const normalFrag = /* glsl */ `
  uniform float uDecor;
  uniform float uReveal;
  varying vec3 vN;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    // Blue: 1 for the bright objects, 0 for decor, and a quarter for the decor that is being revealed in 3D (the cursor's frame).
    gl_FragColor = vec4(n.xy * 0.5 + 0.5, 1.0 - uDecor + uReveal * 0.25, uDecor);
  }
`;

const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
const inkFrag = /* glsl */ `
  #include <packing>
  uniform sampler2D tN;
  uniform sampler2D tD;
  uniform vec2 uTexel;
  uniform float uWidth;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform vec3 uInk;
  uniform float uFade;
  uniform vec4 uRect;
  uniform float uRectOn;
  varying vec2 vUv;

  float viewZ(vec2 uv) {
    return -perspectiveDepthToViewZ(texture2D(tD, uv).x, cameraNear, cameraFar);
  }
  vec3 nrm(vec4 t) {
    vec2 xy = t.xy * 2.0 - 1.0;
    return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))));
  }
  // How much this pixel is the near side of a step to its neighbour at o, or one side of a fold.
  float edge(vec2 o, vec4 c, float zc, vec3 nc, bool fold) {
    vec4 a = texture2D(tN, vUv + o);
    float za = viewZ(vUv + o);
    // A bright 3D object next door never makes decor draw around it.
    if (a.b > 0.5) return 0.0;
    // The neighbour is further back (or empty): this pixel is the silhouette. Only this side draws.
    float step = za - zc;
    // A face seen nearly edge-on slopes steeply in depth from pixel to pixel; that's not an edge.
    // Compare with the step on the other side: a real silhouette jumps on one side only.
    float zb = viewZ(vUv - o);
    float back = zc - zb;
    float jump = step - max(back, 0.0);
    // Empty neighbours (background) always count as a silhouette.
    if (a.a < 0.01 && a.b < 0.5) jump = step;
    float e = smoothstep(0.003, 0.008, jump);
    if (fold && a.a > 0.99 && c.a > 0.99 && abs(step) < 0.03) {
      float nd = 1.0 - dot(nrm(a), nc);
      e = max(e, smoothstep(0.17, 0.3, nd));
    }
    return e;
  }
  void main() {
    vec4 c = texture2D(tN, vUv);
    // Only decor pixels draw lines (and only onto themselves).
    if (c.a < 0.5) { gl_FragColor = vec4(0.0); return; }
    // Inside the selection frame the thing is shown in colour: no drawing lines there.
    if (uRectOn > 0.5 && c.b > 0.1 && c.b < 0.4 && vUv.x > uRect.x && vUv.x < uRect.z && vUv.y > uRect.y && vUv.y < uRect.w) { gl_FragColor = vec4(0.0); return; }
    float zc = viewZ(vUv);
    vec3 nc = nrm(c);
    vec2 t = uTexel * uWidth;
    // Silhouettes: all four neighbours. Folds: two, so each fold draws once.
    float e = edge(vec2(t.x, 0.0), c, zc, nc, true);
    e = max(e, edge(vec2(0.0, t.y), c, zc, nc, true));
    e = max(e, edge(vec2(-t.x, 0.0), c, zc, nc, false));
    e = max(e, edge(vec2(0.0, -t.y), c, zc, nc, false));
    float a = e * c.a * uFade;
    gl_FragColor = vec4(uInk * a, a);
  }
`;

/**
 * `fade` (0 to 1, read every frame) sets how strongly the lines draw; at 0
 * the pass steps aside and the scene renders as normal. `width` is the line
 * in CSS pixels.
 */
export default function InkPass({ fade, width = INK_PX }: { fade?: () => number; width?: number } = {}) {
  const { gl, scene, camera, size } = useThree();
  const dpr = useThree((s) => s.viewport.dpr);

  const mats = useMemo(() => {
    const make = (decor: number, reveal = 0) =>
      new THREE.ShaderMaterial({ vertexShader: normalVert, fragmentShader: normalFrag, uniforms: { uDecor: { value: decor }, uReveal: { value: reveal } }, side: THREE.DoubleSide });
    return { decor: make(1), color: make(0), reveal: make(1, 1) };
  }, []);

  // The line buffer is drawn bigger than the screen and shrunk back with smoothing, so a line that falls between
  // pixels (or crosses one as something moves) fades across them instead of blinking on and off.
  const ss = useMemo(() => THREE.MathUtils.clamp(Math.sqrt(9e6 / Math.max(1, size.width * dpr * size.height * dpr)), 1, 2), [size.width, size.height, dpr]);
  const target = useMemo(() => {
    const w = Math.max(1, Math.round(size.width * dpr * ss));
    const h = Math.max(1, Math.round(size.height * dpr * ss));
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    // No multisampling: a resolved MSAA buffer blends the normals and coverage along every edge (and its depth is one sample), which is what broke and doubled the lines.
    return new THREE.WebGLRenderTarget(w, h, { samples: 0, depthTexture, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  }, [size.width, size.height, dpr, ss]);
  useEffect(() => () => target.dispose(), [target]);

  // The lines themselves, at the same bigger size, then laid over the screen with linear smoothing.
  const lineRT = useMemo(() => new THREE.WebGLRenderTarget(target.width, target.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }), [target]);
  useEffect(() => () => lineRT.dispose(), [lineRT]);

  const overlay = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: inkFrag,
      uniforms: {
        tN: { value: null },
        tD: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uWidth: { value: 1 },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 100 },
        uInk: { value: new THREE.Color() },
        uFade: { value: 1 },
        uRect: { value: new THREE.Vector4() },
        uRectOn: { value: 0 },
      },
      // Premultiplied colour straight into the line buffer.
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const s = new THREE.Scene();
    s.add(quad);
    // Shows the line buffer on screen.
    const show = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: /* glsl */ `
        uniform sampler2D tL;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tL, vUv); }
      `,
      uniforms: { tL: { value: null } },
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
    });
    const quad2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), show);
    quad2.frustumCulled = false;
    const s2 = new THREE.Scene();
    s2.add(quad2);
    return { scene: s, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), material, show, showScene: s2 };
  }, []);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    // The fill follows light and dark.
    inkFill.color.copy(BG);
    inkFill2.color.copy(BG);
    const f = fade ? fade() : 1;
    if (f <= 0.001) {
      gl.setRenderTarget(null);
      gl.render(scene, cam);
      return;
    }
    // 1. Normals, coverage and depth.
    const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const tag = m.userData.ink;
      if (tag === "decor" || tag === "color") {
        swapped.push([m, m.material]);
        let use = tag === "decor" ? mats.decor : mats.color;
        if (tag === "decor" && anim.reveal.on && anim.reveal.show > 0.01) {
          const mat = Array.isArray(m.material) ? m.material[0] : m.material;
          if (mat?.userData?.tracked?.channel === anim.reveal.on) use = mats.reveal;
        }
        m.material = use;
      } else if (m.visible) {
        m.visible = false;
        hidden.push(m);
      }
    });
    const bg = scene.background;
    scene.background = null;
    const clear = gl.getClearColor(new THREE.Color());
    const alpha = gl.getClearAlpha();
    gl.setRenderTarget(target);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, cam);
    for (const [m, mat] of swapped) m.material = mat;
    for (const o of hidden) o.visible = true;
    scene.background = bg;
    gl.setClearColor(clear, alpha);

    // 2. The scene itself.
    gl.setRenderTarget(null);
    gl.render(scene, cam);

    // 3. The lines.
    const u = overlay.material.uniforms;
    u.tN.value = target.texture;
    u.tD.value = target.depthTexture;
    u.uTexel.value.set(1 / target.width, 1 / target.height);
    u.uWidth.value = width * dpr * ss;
    u.cameraNear.value = cam.near;
    u.cameraFar.value = cam.far;
    u.uInk.value.copy(INK_SRGB);
    u.uFade.value = f;
    const rv = anim.reveal;
    u.uRectOn.value = rv.on && rv.show > 0.01 ? 1 : 0;
    u.uRect.value.set(Math.min(rv.x0, rv.x1) / size.width, 1 - Math.max(rv.y0, rv.y1) / size.height, Math.max(rv.x0, rv.x1) / size.width, 1 - Math.min(rv.y0, rv.y1) / size.height);
    const auto = gl.autoClear;
    // Lines into their own buffer (transparent where there are none)...
    gl.setRenderTarget(lineRT);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.autoClear = false;
    gl.render(overlay.scene, overlay.camera);
    // ...then shrunk onto the screen.
    gl.setRenderTarget(null);
    gl.setClearColor(clear, alpha);
    overlay.show.uniforms.tL.value = lineRT.texture;
    gl.render(overlay.showScene, overlay.camera);
    gl.autoClear = auto;
  }, 1);

  return null;
}
