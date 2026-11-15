import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SHELF, STATION } from "./Room";
import { framing } from "./framing";

/**
 * Moving along the shelf (spec §4): drag, swipe, trackpad, or the vertical
 * mouse wheel slides the camera sideways. Because the camera really moves in
 * 3D, depth parallax comes for free: the wall drifts slower than the objects.
 *
 * Framing follows Dvija's size references at MacBook 14-inch size
 * (refs/45 to 47): about four or five objects fill the screen, and the shelf
 * sits near the bottom with the tall books reaching up past the middle. The
 * camera distance is worked out from the window's shape, so that holds on
 * any wide screen.
 *
 * The opening glide, reduced-motion handling and keyboard focus come with
 * the rest of step 4.
 */

/** How much shelf, in scene units, fills the width of a wide screen. */
const VISIBLE_WIDTH = 5.4;
/** Where the shelf top sits, as a fraction of the screen height from the top. */
const SHELF_AT = 0.86;
/** The camera never backs further off than this (narrow and portrait screens). */
const MAX_DISTANCE = 12;
/** A little shelf end stays in view at either end of the travel. */
const END_MARGIN = 0.25;

/**
 * The coffee corner (Dvija, 12 Nov) is true scale, floor to wall shelves, so
 * the camera steps back as you scroll into it, until the whole corner fits.
 * Its span, relative to the sideboard's centre and the shelf top:
 */
// Cropped (Dvija, 12 Nov, "show this much, not the full"): from the drawer row
// just under the sideboard top up to the snake plant, edge to edge of the
// sideboard. The rest of the cabinet and the floor stay below the frame.
const CORNER = { left: -3.0, right: 3.0, top: 6.05, bottom: -1.0 };

export default function CameraRig() {
  const { camera, gl } = useThree();
  const target = useRef<number | null>(null);
  const x = useRef(0);
  const view = useRef({ distance: 6, halfWidth: VISIBLE_WIDTH / 2, shelfHalfWidth: VISIBLE_WIDTH / 2 });

  // Travel runs from the bookshelf's left end to the middle of the coffee corner.
  const cornerX = STATION.centre + (CORNER.left + CORNER.right) / 2;
  const minX = () => -SHELF.length / 2 + view.current.shelfHalfWidth - END_MARGIN;
  const maxX = () => Math.max(minX(), cornerX);
  const clamp = (v: number) => Math.max(minX(), Math.min(maxX(), v));

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    const unitsPerPx = () => (view.current.halfWidth * 2) / el.clientWidth;

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging || target.current === null) return;
      target.current = clamp(target.current - (e.clientX - lastX) * unitsPerPx());
      lastX = e.clientX;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (target.current === null) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      target.current = clamp(target.current + d * unitsPerPx() * 0.8);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
    // clamp reads refs only, so it never goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // Shelf framing: about four or five objects across, the shelf near the bottom.
    const shelfDistance = Math.min(VISIBLE_WIDTH / (2 * tanHalf * cam.aspect), MAX_DISTANCE);
    const shelfHalfHeight = shelfDistance * tanHalf;
    const shelfY = SHELF.top + (SHELF_AT - 0.5) * 2 * shelfHalfHeight;
    // Corner framing: the drawer row up to the top shelf's plants, a thin margin.
    const bottomY = SHELF.top + CORNER.bottom;
    const topY = SHELF.top + CORNER.top;
    const cornerH = (topY - bottomY) * 1.04;
    const cornerW = CORNER.right - CORNER.left;
    const cornerDistance = Math.max(cornerH / 2 / tanHalf, cornerW / (2 * tanHalf * cam.aspect));
    const cornerY = (bottomY + topY) / 2;
    // One framing for the whole site (13 Nov): the corner's wider view, so the
    // camera never steps back or pushes in as you scroll. The shelf framing
    // above is unused but kept, to bring the old step-back back if wanted.
    const distance = cornerDistance;
    const halfWidth = distance * tanHalf * cam.aspect;
    // The travel limits use this framing, so set it before clamping.
    view.current.shelfHalfWidth = halfWidth;

    // First frame: start at the left end, on the case studies.
    if (target.current === null) {
      target.current = minX();
      x.current = target.current;
    }
    target.current = clamp(target.current);
    // Ease toward the target, so a flick glides to a stop.
    x.current += (target.current - x.current) * (1 - Math.exp(-dt * 7));

    // Always the corner's framing: the light uses its wide-view setting too.
    const t = 1;
    const centreY = cornerY;
    view.current = { distance, halfWidth, shelfHalfWidth: halfWidth };
    framing.t = t;
    framing.x = x.current;

    cam.position.set(x.current, centreY + 0.6, distance);
    cam.lookAt(x.current, centreY, 0);
  });

  return null;
}
