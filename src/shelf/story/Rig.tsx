import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { anim, framing } from "./anim";
import { CAM_D, EYE, view } from "./layout";

/**
 * Front-on, like the drawings: the camera sits level with the shelf top and
 * looks straight ahead from far back, so verticals stay vertical and the
 * shelf top is one line. The lens is shifted (not tilted) to frame the view.
 *
 * Framing (anim.ts framing()): the whole storyboard frame fits the screen. A
 * screen wider than the sketches shows the frame's full height, with more
 * page at the sides; the shelf top sits 88% of the way down, as drawn.
 *
 * `camX` pans sideways (the coffee view), eased; or `follow` hands it a
 * value to track exactly (the director animates the pan). The rig publishes
 * the shelf band's height (--band) and the shelf top (--shelf-y) as CSS
 * variables, for the menu bar, the theme switch and scene 1's line.
 */
export default function Rig({ camX = 0, follow }: { camX?: number; follow?: () => number }) {
  const { camera, size } = useThree();
  const dpr = useThree((s) => s.viewport.dpr);
  const placed = useRef(false);
  const x = useRef(camX);
  const published = useRef("");
  // The pointer, -1 to 1 across the window: the camera leans a little toward it (a gentle parallax: nearer things slide more than far ones).
  const ptr = useRef({ x: 0, y: 0, on: false });
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      ptr.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      ptr.current.on = true;
    };
    const leave = () => (ptr.current.on = false);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const f = framing(size.width, size.height, dpr);
    if (!placed.current) {
      cam.near = CAM_D - 6;
      cam.far = CAM_D + 6;
      x.current = camX;
      placed.current = true;
    }
    // Either follow a value the director animates, or ease toward camX.
    if (follow) x.current = follow();
    else x.current += (camX - x.current) * (1 - Math.exp(-dt * 3));
    // The coffee view zooms in about the middle of the frame (the zoom narrows the window; the page's own chrome keeps the
    // unzoomed framing's band and shelf line).
    const z = Math.max(1, anim.camZoom);
    const cy = (f.top + f.bottom) / 2;
    const H = f.H / z;
    const halfW = f.halfW / z;
    view.pxPerUnit = size.height / H;
    view.left = x.current - halfW;
    view.right = x.current + halfW;
    view.top = cy + H / 2;
    view.bottom = cy - H / 2;
    view.baseTop = f.top;
    document.documentElement.style.setProperty("--zoom", z.toFixed(3));
    const key = `${f.band}|${f.shelfY}`;
    if (key !== published.current) {
      published.current = key;
      const root = document.documentElement.style;
      root.setProperty("--band", `${f.band}px`);
      root.setProperty("--shelf-y", `${f.shelfY}px`);
    }
    // Lean: the camera slides toward the pointer; the lens shifts back so the shelf's own plane stays put and only depth moves.
    const par = anim.par;
    const want = par.on && ptr.current.on ? 1 : 0;
    const k2 = 1 - Math.exp(-dt * 3.5);
    par.ox += ((ptr.current.x * 1.1 * want) - par.ox) * k2;
    // Leaning down is free; leaning up is kept tiny, or the shelf's top face would show and draw a second line behind the first.
    const up = -ptr.current.y * 0.6 * want;
    par.oy += ((up > 0 ? up * 0.08 : up) - par.oy) * k2;
    cam.position.set(x.current + par.ox, EYE + par.oy, CAM_D);
    cam.rotation.set(0, 0, 0);
    cam.updateMatrixWorld();
    const k = cam.near / CAM_D;
    cam.projectionMatrix.makePerspective((-halfW - par.ox) * k, (halfW - par.ox) * k, (view.top - EYE - par.oy) * k, (view.bottom - EYE - par.oy) * k, cam.near, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  });
  return null;
}
