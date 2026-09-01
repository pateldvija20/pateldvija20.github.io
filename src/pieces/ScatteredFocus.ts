import { createContext, useCallback, useContext, useRef } from "react";

/**
 * The desk camera.
 *
 * Scattered is one continuous scene, not a stack of pages, so "opening" a
 * piece is a camera move rather than a navigation: the viewport leans in over
 * the object, the object squares up to it, and everything else stays where it
 * was. This is the contract between the pieces (which know their own geometry
 * and what focusing means for them) and the stage (which owns the camera).
 *
 * Only Scattered provides it. In Organised the equivalent content has real
 * sections and real URLs, so the context is absent and pieces fall back to
 * opening in place.
 */

/** A rectangle in canvas units — the coordinate space every piece is placed in. */
export type CanvasRect = { left: number; top: number; width: number; height: number };

export type FocusSpec = {
  /**
   * Identifies the focused object. Focusing an id that is already focused is a
   * no-op, so a second click on an open folder does not re-run the move.
   */
  id: string;
  /** The object's own box, in canvas units, *unrotated* — a tilted piece's
   *  on-screen bounding box is bigger than the piece and would zoom short. */
  rect: CanvasRect;
  /**
   * The object's root element, used only to tell a click on it from a click
   * off it. Geometry comes from `rect`, never from this: by the time an
   * outside click arrives the element may be mid-tween, and its measured box
   * would be whatever frame the animation happens to be on.
   */
  el?: HTMLElement | null;
  /**
   * How much of the viewport the object should fill once focused, 0..1.
   * The zoom is derived from this rather than given directly, so an object
   * lands at a readable size at every window width instead of at whatever a
   * hard-coded multiplier happens to produce.
   */
  fill?: number;
  /**
   * `contain` fits both axes — the whole object is visible at once.
   * `width` fits the width only and lets the object run past the bottom of
   * the viewport to be scrolled through, which is what a document wants.
   */
  fit?: "contain" | "width";
  maxZoom?: number;
  /**
   * A wheel gesture while this object is focused. Return true to keep focus
   * (the object handled the scroll itself), false to let it go.
   *
   * This is what separates reading from leaving: the Resume consumes wheels
   * to travel down the page and only gives focus up once it has run out of
   * document, while a folder treats the first real wheel as "I'm done".
   */
  onWheel?: (e: WheelEvent, camera: CameraState) => boolean;
  /** Called when focus is dropped, for whatever reason. */
  onRelease?: () => void;
};

/** What the camera is doing right now, in canvas units. */
export type CameraState = {
  /** Canvas point at the centre of the viewport. */
  x: number;
  y: number;
  /** Multiplier over the window-fit scale. 1 is the resting desk. */
  zoom: number;
  /** Viewport size in canvas units at the current zoom. */
  viewW: number;
  viewH: number;
};

export type DeskCamera = {
  /** Lean in on an object. Resolves once the move has settled. */
  focus: (spec: FocusSpec) => Promise<void>;
  /** Let go. Passing an id releases only if that object still holds focus, so
   *  a piece cleaning up after itself cannot steal the release from whatever
   *  focused next. */
  release: (id?: string) => void;
  /** Pan the camera without changing zoom — how a focused document scrolls. */
  pan: (dx: number, dy: number) => CameraState;
  /** Set the zoom about the current centre, for the Resume's +/- controls. */
  setZoom: (zoom: number) => void;
  read: () => CameraState;
  /**
   * The scale the canvas is *currently* painted at — `fit x zoom`, live.
   *
   * Every piece that turns a pointer position into canvas units needs this,
   * and needs it to be true at the instant of the gesture. The settled zoom
   * that reaches pieces as a `scale` prop is only written when a tween
   * finishes, so for the whole 0.72s of a focus move it is stale: pointer
   * deltas convert against the wrong divisor and the piece drifts away from
   * the cursor, and hit tests made in canvas space miss their targets.
   *
   * A ref read rather than a prop precisely because it must not re-render
   * forty pieces to stay honest.
   */
  getScale: () => number;
  /** Centre a piece at the resting zoom. The pre-camera behaviour, kept
   *  because most desk pieces only ever wanted this much. */
  centerOn: (el: HTMLElement) => Promise<void>;
};

export const ScatteredFocusContext = createContext<DeskCamera | null>(null);

export function useDeskCamera(): DeskCamera | null {
  return useContext(ScatteredFocusContext);
}

/**
 * Which object currently holds focus, as a separate context so that a piece
 * re-rendering on every camera frame is not the price of knowing.
 */
export const FocusedIdContext = createContext<string | null>(null);

export function useFocusedId(): string | null {
  return useContext(FocusedIdContext);
}

/**
 * The live canvas scale, for pieces doing pointer maths.
 *
 * Takes the piece's own `scale` prop as the fallback so this works unchanged
 * in Organised mode and in tests, where there is no camera to ask. Returns a
 * getter rather than a number: the whole point is to read it at gesture time,
 * not at render time.
 */
export function useLiveScale(fallback: number): () => number {
  const camera = useDeskCamera();
  const ref = useRef(fallback);
  ref.current = fallback;
  return useCallback(() => (camera ? camera.getScale() : ref.current), [camera]);
}

/** Legacy shape: bring a piece to the middle without zooming. */
export type CenterOnPiece = (el: HTMLElement) => Promise<void>;

export function useCenterOnPiece(): CenterOnPiece | null {
  const camera = useDeskCamera();
  return camera ? camera.centerOn : null;
}
