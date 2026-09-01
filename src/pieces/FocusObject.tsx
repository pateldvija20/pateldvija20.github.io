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

/**
 * How much over-scroll past the end of a document counts as leaving it rather
 * than as the tail of a read. Roughly two notches of a wheel — enough that
 * coasting to the bottom of the page holds, and a deliberate push does not.
 */
const LEAVE_THRESHOLD = 220;

/** How long the object takes to square up, matched to the camera's own move. */
const STRAIGHTEN_IN = 0.72;
const STRAIGHTEN_OUT = 0.6;
const EASE = "power3.inOut";

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
   * A document rather than an object: wheels travel down it instead of
   * dismissing it, and focus is only given up once the reader has run past
   * the end of the page.
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

  /** Accumulated over-scroll past the end of a document. */
  const overRef = useRef(0);

  /** Wheel while focused: walk the camera down the page, and only let go once
   *  the reader has pushed past the end of it. */
  const onWheel = useCallback(
    (e: WheelEvent, cam: CameraState) => {
      if (!camera || !scrollable) return false;
      // The page is read from the top of the sheet to the bottom, with the
      // camera never showing more than a sliver past either end.
      const topLimit = box.top + cam.viewH / 2 - cam.viewH * 0.03;
      const bottomLimit = box.top + box.height - cam.viewH / 2 + cam.viewH * 0.03;
      const atTop = cam.y <= topLimit + 1;
      const atBottom = cam.y >= bottomLimit - 1;
      const goingDown = e.deltaY > 0;
      // Run out of document *and* keep pushing — that is the gesture that
      // means leaving, as opposed to the one that means reading.
      if ((goingDown && atBottom) || (!goingDown && atTop)) {
        overRef.current += Math.abs(e.deltaY);
        if (overRef.current > LEAVE_THRESHOLD) return false;
        return true;
      }
      overRef.current = 0;
      const next = Math.min(Math.max(cam.y + e.deltaY / cam.zoom, topLimit), bottomLimit);
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
    overRef.current = 0;
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
