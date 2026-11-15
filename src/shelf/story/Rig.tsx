import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { framing } from "./anim";
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
    view.pxPerUnit = size.height / f.H;
    view.left = x.current - f.halfW;
    view.right = x.current + f.halfW;
    view.top = f.top;
    view.bottom = f.bottom;
    const key = `${f.band}|${f.shelfY}`;
    if (key !== published.current) {
      published.current = key;
      const root = document.documentElement.style;
      root.setProperty("--band", `${f.band}px`);
      root.setProperty("--shelf-y", `${f.shelfY}px`);
    }
    cam.position.set(x.current, EYE, CAM_D);
    cam.rotation.set(0, 0, 0);
    cam.updateMatrixWorld();
    const k = cam.near / CAM_D;
    cam.projectionMatrix.makePerspective(-f.halfW * k, f.halfW * k, (f.top - EYE) * k, (f.bottom - EYE) * k, cam.near, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  });
  return null;
}
