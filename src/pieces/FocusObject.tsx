import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Draggable } from "./Draggable";
import {
  useDeskCamera,
  useFocusedId,
  type CameraState,
  type CanvasRect,
} from "./ScatteredFocus";

/**
 * A desk object the camera can lean in on.
 *
 * This is the shared half of the focus system: placement, the resting tilt and
 * the return to it, the lift out of the desk's stacking order, the click that
 * starts the move, and — for objects that are documents — travelling down the
 * page instead of being dismissed by the first wheel. What "focused" *means*
 * for a given object (a folder fanning open, a book turning to its first
 * spread) stays with that object; only the camera work is here.
 *
 * Everything an object can vary is a prop, so adding a fifth focusable piece
 * is a placement plus four numbers rather than a fifth animation.
 */

/** How long the object takes to square up, matched to the camera's own move. */
const STRAIGHTEN_IN = 0.72;
const STRAIGHTEN_OUT = 0.6;
const EASE = "power3.inOut";

/** Clearance kept below the last line of a scrollable document, so the
 *  floating controls never sit on top of it. Roughly the control row plus its
 *  own margin. */
const SCROLL_TAIL_PX = 116;

const clampTo = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function FocusObject({
  id,
  left,
  top,
  width,
  height,
  tilt = 0,
  straighten = true,
  z,
  focusZ,
  fill,
  fit = "contain",
  maxZoom,
  scrollable = false,
  draggable = false,
  scale = 1,
  rect,
  onFocusChange,
  className,
  children,
}: {
  id: string;
  /** Resting placement, in canvas units. */
  left: number;
  top: number;
  /** The object's own unrotated size — also what the camera frames against. */
  width: number;
  height: number;
  /** Resting rotation. Positive is clockwise, matching CSS. */
  tilt?: number;
  /**
   * Whether this wrapper animates the tilt away on focus. False for pieces
   * that already straighten themselves as part of opening (the book and the
   * folder both do) — two things driving one rotation is how you get a piece
   * that ends up at some angle neither of them intended.
   */
  straighten?: boolean;
  z: number;
  /** Where the object sits while focused. Above the scrim, and above the rest
   *  of the desk, which is the whole point of being focused. */
  focusZ: number;
  fill?: number;
  fit?: "contain" | "width";
  maxZoom?: number;
  /**
   * A document rather than an object: wheels travel down it rather than
   * dismissing it, and running out of page does not end the read.
   */
  scrollable?: boolean;
  draggable?: boolean;
  /** Live scene scale, for drag deltas. */
  scale?: number;
  /** Frame against this instead of the layout box, for pieces whose visible
   *  extent is not their placement box. */
  rect?: CanvasRect;
  onFocusChange?: (focused: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const camera = useDeskCamera();
  const focusedId = useFocusedId();
  const focused = focusedId === id;

  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  /**
   * The lift has to outlast the release, or the object drops behind its
   * neighbours the instant focus is dropped and spends the whole way back
   * underneath them.
   */
  const [lifted, setLifted] = useState(false);
  const dropTimer = useRef<number | undefined>(undefined);

  const box: CanvasRect = rect ?? { left, top, width, height };

  /**
   * Wheel while focused: walk the camera down the page.
   *
   * A document is never dismissed by scrolling it. Reaching the end of the
   * page is the most ordinary thing a reader does, and treating it as "I'm
   * done here" threw them off the sheet exactly when they had finished
   * reading it — worse on a trackpad, where the momentum after a flick
   * carries well past the end on its own. The page simply stops at both
   * ends; leaving is a click off it, Escape, or the back control.
   */
  const onWheel = useCallback(
    (e: WheelEvent, cam: CameraState) => {
      if (!camera || !scrollable) return false;
      // The page is read from the top of the sheet to the bottom, with the
      // camera never showing more than a sliver past either end.
      const topLimit = box.top + cam.viewH / 2 - cam.viewH * 0.03;
      // Tail room at the foot of the page, in canvas units. The controls
      // float over the bottom of the window, so a document whose scroll
      // stopped exactly at its last line left that line underneath them —
      // readable only by putting the sheet down. Expressed in screen pixels
      // and converted, because what has to be cleared is a fixed-size toolbar
      // rather than a fraction of the page.
      const tail = SCROLL_TAIL_PX / camera.getScale();
      const bottomLimit = box.top + box.height - cam.viewH / 2 + cam.viewH * 0.03 + tail;
      // `deltaY` is screen pixels; `cam.y` is canvas units. The divisor is the
      // full painted scale, `fit x zoom` — dividing by the zoom alone left the
      // page travelling at `fit` of the speed of the gesture (about a
      // quarter of it on a 1280 window), so a flick that should have crossed
      // the sheet barely moved it.
      const next = clampTo(cam.y + e.deltaY / camera.getScale(), topLimit, bottomLimit);
      camera.pan(0, next - cam.y);
      return true;
    },
    [box.height, box.top, camera, scrollable],
  );

  /**
   * The resting tilt is written once, imperatively, and GSAP owns the
   * property from then on.
   *
   * Rendering `transform: rotate(...)` from React instead looks equivalent
   * and is not: `setLifted` re-renders this component in the same tick the
   * focus tween starts, and that render would write the resting angle back
   * over whatever frame the tween had reached. The result is a piece that
   * sometimes squares up and sometimes stays crooked, depending on how the
   * re-render and the ticker interleave.
   */
  useLayoutEffect(() => {
    const el = tiltRef.current;
    if (el && straighten) gsap.set(el, { rotation: tilt });
    // Deliberately mount-only: after this, focus and release own the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const take = useCallback(() => {
    if (!camera || focused) return;
    void camera.focus({
      id,
      rect: box,
      el: rootRef.current,
      fill,
      fit,
      maxZoom,
      onWheel: scrollable ? onWheel : undefined,
    });
  }, [box, camera, fill, fit, focused, id, maxZoom, onWheel, scrollable]);

  /** Whether the last run of the effect below saw this object focused, so
   *  `onFocusChange` reports transitions rather than firing a spurious
   *  "released" on mount — which would shut a folder a deep link had just
   *  asked to be open. */
  const wasFocused = useRef<boolean | null>(null);

  // Square up on focus, settle back to the resting tilt on release.
  useEffect(() => {
    if (wasFocused.current !== null && wasFocused.current !== focused) {
      onFocusChange?.(focused);
    }
    wasFocused.current = focused;
    const el = tiltRef.current;
    window.clearTimeout(dropTimer.current);
    if (focused) {
      setLifted(true);
      if (el && straighten) {
        if (reduced()) gsap.set(el, { rotation: 0 });
        else gsap.to(el, { rotation: 0, duration: STRAIGHTEN_IN, ease: EASE });
      }
      return;
    }
    if (el && straighten) {
      if (reduced()) gsap.set(el, { rotation: tilt });
      else gsap.to(el, { rotation: tilt, duration: STRAIGHTEN_OUT, ease: EASE });
    }
    dropTimer.current = window.setTimeout(
      () => setLifted(false),
      reduced() ? 0 : STRAIGHTEN_OUT * 1000,
    );
    return () => window.clearTimeout(dropTimer.current);
    // `onFocusChange` is deliberately not a dependency: callers pass inline
    // closures, and re-running this on every render would restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, straighten, tilt]);

  return (
    <div
      ref={rootRef}
      className={`absolute ${className ?? ""}`}
      style={{ left, top, zIndex: lifted ? focusZ : z }}
    >
      <Draggable enabled={draggable} scale={scale} onTap={camera ? take : undefined}>
        {/* No `transform` here — see the layout effect above. */}
        <div ref={tiltRef} style={{ width, height }}>
          {children}
        </div>
      </Draggable>
    </div>
  );
}
