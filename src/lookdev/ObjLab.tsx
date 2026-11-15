import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import InkPass from "../shelf/story/InkPass";
import { Jelly } from "../shelf/story/physics";
import Studio from "../shelf/story/Studio";
import { applyMode, BG, type Mode } from "../shelf/story/theme";
import { DRAWN } from "../shelf/story/toy";
import type { ObjectMeta, ObjectProps } from "../shelf/story/objects/types";

/**
 * /?objlab=<name> — one object from src/shelf/story/objects/, alone, for
 * matching it to its reference images. Not part of the site.
 *
 *   &mode=light|dark       page and ink colours
 *   &state=color|drawn     full colour, or frame 2's line drawing (toys)
 *   &view=front|three|side|back|top
 *   &slide=1               slides in from the right every 3 s, like scene 2, to watch the physics
 *   &zoom=1.6              closer
 *
 * window.__objReady goes true once it has drawn for a while; window.__objMeta
 * is the object's meta (its reference images).
 */

type Mod = { default: ComponentType<ObjectProps>; meta: ObjectMeta };
/**
 * Loaded one at a time, by file name (objects/<name>.tsx), so a half-written
 * file being worked on elsewhere can't break the lab for every other object.
 */
const modules = import.meta.glob<Mod>("../shelf/story/objects/*.tsx");
const fileOf = (name: string) => `../shelf/story/objects/${name}.tsx`;
const NAMES = Object.keys(modules).map((k) => k.split("/").pop()!.replace(/\.tsx$/, "")).filter((n) => !n.startsWith("_"));

const VIEWS: Record<string, [number, number]> = {
  front: [0, 4],
  three: [35, 8],
  side: [90, 4],
  back: [180, 4],
  top: [0, 55],
};

function Cam({ meta, view, zoom }: { meta: ObjectMeta; view: string; zoom: number }) {
  const { camera, size, gl } = useThree();
  useFrame(() => {
    gl.setClearColor(BG, 1);
    const cam = camera as THREE.PerspectiveCamera;
    const [az, el] = VIEWS[view] ?? VIEWS.front;
    const fov = 22;
    cam.fov = fov;
    const tan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const aspect = size.width / size.height;
    const fit = Math.max(meta.height * 1.25, (Math.max(meta.width, meta.depth) * 1.25) / aspect);
    const d = fit / (2 * tan) / zoom + meta.depth;
    const a = THREE.MathUtils.degToRad(az);
    const e = THREE.MathUtils.degToRad(el);
    const cy = meta.height / 2;
    cam.position.set(Math.sin(a) * Math.cos(e) * d, cy + Math.sin(e) * d, Math.cos(a) * Math.cos(e) * d);
    cam.near = Math.max(0.05, d - 6);
    cam.far = d + 6;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    cam.lookAt(0, cy, 0);
  });
  return null;
}

/** Scene 2's move, on a loop: in from the right with an overshoot, so Jelly and the object's own physics show. */
function Slider({ on, children }: { on: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  useFrame((s) => {
    if (!g.current) return;
    if (!on) {
      g.current.position.x = 0;
      return;
    }
    const t = (s.clock.elapsedTime - t0.current) % 3;
    // Back-out ease from x = 3 to 0 over 1.1 s, then rest.
    const u = Math.min(1, t / 1.1);
    const c = 1.7;
    const ease = 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
    g.current.position.x = 3 * (1 - ease);
  });
  return <group ref={g}>{children}</group>;
}

function Ready() {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 40) (window as unknown as { __objReady: boolean }).__objReady = true;
  });
  return null;
}

export default function ObjLab() {
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const name = q.get("objlab") ?? "";
  const mode = (q.get("mode") === "dark" ? "dark" : "light") as Mode;
  const drawn = q.get("state") === "drawn";
  const view = q.get("view") ?? "front";
  const slide = q.get("slide") === "1";
  const zoom = Number(q.get("zoom") ?? 1) || 1;
  useMemo(() => applyMode(mode), [mode]);
  DRAWN.value = drawn ? 1 : 0;
  const [mod, setMod] = useState<Mod | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = modules[fileOf(name)];
    if (!load) return;
    load().then(
      (m) => (m.default && m.meta ? setMod(m) : setError("objects/" + name + ".tsx must export meta and a default component")),
      (e: Error) => setError(String(e?.message ?? e)),
    );
  }, [name]);

  if (error) return <pre style={{ padding: 32, color: "crimson", whiteSpace: "pre-wrap" }}>{error}</pre>;
  if (modules[fileOf(name)] && !mod) return null;
  if (!mod)
    return (
      <div style={{ padding: 32, font: "14px/1.5 DM Sans, sans-serif" }}>
        <p>No object "{name}". Objects in src/shelf/story/objects/:</p>
        <ul>
          {NAMES.map((n) => (
            <li key={n}>
              <a href={`/?objlab=${n}`}>{n}</a>
            </li>
          ))}
        </ul>
      </div>
    );
  (window as unknown as { __objMeta: ObjectMeta }).__objMeta = mod.meta;
  const Obj = mod.default;
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)" }}>
      <Canvas dpr={[1, 2]} shadows={{ type: THREE.VSMShadowMap }} gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping }} camera={{ fov: 22, position: [0, 1, 8] }}>
        <Cam meta={mod.meta} view={view} zoom={zoom} />
        <Studio />
        <Slider on={slide}>
          <Jelly>
            <Obj drawn={drawn} />
          </Jelly>
        </Slider>
        <InkPass />
        <Ready />
      </Canvas>
      <p style={{ position: "fixed", left: 12, bottom: 8, margin: 0, font: "12px DM Sans, sans-serif", color: "var(--ink)", opacity: 0.6 }}>
        {name} · {mode} · {drawn ? "drawn" : "color"} · {view}
        {slide ? " · slide" : ""}
      </p>
    </div>
  );
}
