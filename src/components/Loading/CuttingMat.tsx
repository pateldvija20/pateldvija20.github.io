"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

// ─── Vertex shader ────────────────────────────────────────────────────────────
// The plane geometry is rotated into the XZ plane before upload so that:
//   position.x  = horizontal (unroll axis, maps to uv.x 0→1)
//   position.y  = height above mat (0 when flat, rises when rolled)
//   position.z  = mat length (unchanged throughout)
//
// uUnroll 0 = fully rolled cylinder, 1 = fully flat plane.
// Vertices where uv.x > uUnroll are still on a semicircular cylinder;
// the rest have settled flat at y = 0.
const VERT = /* glsl */ `
  uniform float uUnroll;
  uniform float uPlaneWidth;
  const float PI = 3.14159265358979323846;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float nx       = uv.x;
    float t        = clamp(uUnroll, 0.0001, 0.9999);
    float isRolled = step(t, nx);                   // 1.0 if vertex still on cylinder

    // 0→1 fraction within the rolled portion
    float localFrac = clamp((nx - t) / (1.0 - t), 0.0, 1.0);

    // Cylinder radius so its semicircle circumference = remaining rolled width
    float rolledWidth = (1.0 - t) * uPlaneWidth;
    float r           = rolledWidth / PI;
    float xEdge       = (t - 0.5) * uPlaneWidth;   // world-x of the flat frontier
    float theta       = localFrac * PI;             // sweeps 0→PI (semicircle)

    // Cylinder surface: x compresses inward, y lifts upward
    float cX = xEdge + r * sin(theta);
    float cY = r * (1.0 - cos(theta));

    pos.x = mix(pos.x, cX, isRolled);
    pos.y = mix(0.0,   cY, isRolled);
    // pos.z (mat length) is untouched

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// ─── Fragment shader ──────────────────────────────────────────────────────────
const FRAG = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  /** Fires every GSAP tick with 0–100 */
  onProgress: (pct: number) => void;
  /** Fires once uUnroll reaches 1.0 (mat fully flat) */
  onAnimationComplete: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CuttingMat({ onProgress, onAnimationComplete }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const completedRef = useRef(false);

  // Stable refs so the single-run effect always calls the latest callbacks
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    // Guard: if a previous Strict Mode cycle already ran to completion, bail.
    if (completedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); // false → don't overwrite our CSS dimensions

    // ── Orthographic camera — top-down bird's-eye ──────────────────────────
    // Camera sits at Y=10 looking straight down at the origin.
    // camera.up = (0,0,-1) maps world-X → screen-X and world-Z → screen-Y.
    const aspect = w / h;
    const frustH = 2.0; // frustum spans −1..1 on the vertical axis
    const camera = new THREE.OrthographicCamera(
      -(frustH * aspect) / 2,
       (frustH * aspect) / 2,
       frustH / 2,
      -(frustH / 2),
      0.1,
      50,
    );
    camera.position.set(0, 10, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Geometry ──────────────────────────────────────────────────────────
    // PlaneGeometry starts in the XY plane; rotateX(−π/2) tilts it into XZ.
    // After rotation: position.x = width axis (unroll direction), position.y = 0,
    // position.z = length axis. uv.x still tracks the width direction. ✓
    const planeW = frustH * aspect * 0.82;
    const planeH = frustH * 0.78;
    const geo    = new THREE.PlaneGeometry(planeW, planeH, 120, 4);
    geo.rotateX(-Math.PI / 2);

    // ── Texture ────────────────────────────────────────────────────────────
    const tex = new THREE.TextureLoader().load("/cutting-mat.svg");
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    // ── Shader material ────────────────────────────────────────────────────
    const uniforms = {
      uTexture:    { value: tex },
      uUnroll:     { value: 0.0 },
      uPlaneWidth: { value: planeW },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
    });

    scene.add(new THREE.Mesh(geo, mat));

    // ── Render loop ────────────────────────────────────────────────────────
    let rafId: number;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      renderer.render(scene, camera);
    };
    tick();

    // ── GSAP unroll timeline ───────────────────────────────────────────────
    // Drives uUnroll from 0 → 1 over 3 s, then signals completion.
    const tl = gsap.timeline();
    tl
      .to(uniforms.uUnroll, {
        value:    1,
        duration: 3,
        ease:     "power2.inOut",
        onUpdate() {
          onProgressRef.current(Math.round(uniforms.uUnroll.value * 100));
        },
      })
      .call(() => {
        completedRef.current = true;
        onCompleteRef.current();
      });

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      tl.kill();
      cancelAnimationFrame(rafId);
      geo.dispose();
      mat.dispose();
      tex.dispose();
      renderer.dispose();
    };
  }, []); // intentionally empty — scene lives for the component's full lifetime

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset:    0,
        width:    "100%",
        height:   "100%",
        display:  "block",
        transform: "rotate(-2deg)",
        filter:   "drop-shadow(0 8px 32px rgba(0,0,0,0.12))",
      }}
    />
  );
}
