import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, type PencilColor } from "./Pencil";
import { PencilBox } from "./PencilBox";
import type { Theme } from "./Piece";
import {
  DEFAULT_LAYOUT,
  PENCIL_BOX,
  PENCIL_H,
  PENCIL_W,
  slotsOf,
  type PencilLayout,
  type Placement,
} from "./pencilLayout";
import { useCenterOnPiece } from "./ScatteredFocus";

/** Pointer travel before a press counts as a drag rather than a tap — the
 *  same threshold Draggable uses, so every piece on the desk feels alike. */
const DRAG_SLOP = 4;

/**
 * The pencil box and its loose pencils, as one interactive group.
 *
 * A pencil can be pulled out of a well and dropped anywhere on the desk, and
 * a loose pencil dropped over the box drops into the nearest free well. Both
 * are the same pencil — `DEFAULT_LAYOUT` only says where each one starts — so
 * nothing is ever duplicated between the box and the desk.
 *
 * Geometry note: the box is rotated (5.19°) and scaled by its own
 * `useElementScale`, so a well's canvas position cannot be computed from
 * constants. Everything positional here goes through the *rendered* rects
 * instead (`getBoundingClientRect`), which already carry every ancestor
 * transform, and converts back to canvas units via `scale`. It is also why
 * the drop test uses `elementFromPoint` rather than a hit-rect: that respects
 * the box's rotation exactly, for free.
 */
export function PencilTray({
  theme,
  scale,
  draggable,
}: {
  theme: Theme;
  /** Canvas `fit` scale, so pointer positions convert back to canvas units. */
  scale: number;
  draggable: boolean;
}) {
  const [layout, setLayout] = useState<PencilLayout>(() => ({ ...DEFAULT_LAYOUT }));
  const rootRef = useRef<HTMLDivElement>(null);
  const centerOnPiece = useCenterOnPiece();

  /**
   * The box's own position. Loose pencils are placed from `layout` in canvas
   * space and are siblings of the box, not children, so dragging the box
   * leaves every one of them exactly where it lies — only the pencils seated
   * in its wells travel with it, which is what a box of pencils should do.
   *
   * The ref mirrors the state so a press can read the current position
   * without the move handler closing over a stale one.
   */
  const [boxPos, setBoxPos] = useState({ left: PENCIL_BOX.left, top: PENCIL_BOX.top });
  const boxPosRef = useRef(boxPos);

  /**
   * The pencil in hand. Set only once the press has travelled past DRAG_SLOP:
   * until then the pencil stays where it is, so a plain tap still has a live
   * element for the canvas to centre on.
   */
  const [held, setHeld] = useState<{
    color: PencilColor;
    /** Canvas-space centre of the pencil, not of the cursor. */
    cx: number;
    cy: number;
    deg: number;
  } | null>(null);

  /** Live bookkeeping for a box drag, separate from a pencil drag so the two
   *  can never be confused for one another. */
  const boxGrab = useRef<{
    pointerId: number;
    px: number;
    py: number;
    left0: number;
    top0: number;
    moved: boolean;
    source: HTMLElement;
    release: () => void;
  } | null>(null);

  /** Live drag bookkeeping — none of it should drive a re-render. */
  const grab = useRef<{
    color: PencilColor;
    pointerId: number;
    /** Press origin, in client px, for the slop test. */
    px: number;
    py: number;
    /** Cursor-to-centre offset, so the pencil doesn't jump under the cursor. */
    dx: number;
    dy: number;
    cx: number;
    cy: number;
    deg: number;
    lifted: boolean;
    /** The element pressed, for the tap-to-centre path. */
    source: HTMLElement;
    release: () => void;
  } | null>(null);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r || !scale) return { x: 0, y: 0 };
      return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
    },
    [scale],
  );

  // A drag in flight must not outlive the component.
  useEffect(
    () => () => {
      grab.current?.release();
      boxGrab.current?.release();
    },
    [],
  );

  /**
   * Pick the whole box up. Hung off the box's own footprint, and never
   * reached when the press lands on a seated pencil — `pickUp` stops
   * propagation, so pulling a pencil out of a well can't drag the box too.
   */
  const pickUpBox = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable || boxGrab.current || grab.current) return;
      e.preventDefault();
      const source = e.currentTarget as HTMLElement;

      const onMove = (ev: PointerEvent) => {
        const g = boxGrab.current;
        if (!g || ev.pointerId !== g.pointerId) return;
        const travelled =
          Math.abs(ev.clientX - g.px) > DRAG_SLOP || Math.abs(ev.clientY - g.py) > DRAG_SLOP;
        if (!travelled && !g.moved) return;
        g.moved = true;
        // Pointer deltas arrive in screen px but the box is placed in canvas
        // units, so the canvas `fit` has to come back out of them.
        const next = {
          left: g.left0 + (ev.clientX - g.px) / scale,
          top: g.top0 + (ev.clientY - g.py) / scale,
        };
        boxPosRef.current = next;
        setBoxPos(next);
      };

      const onUp = (ev: PointerEvent) => {
        const g = boxGrab.current;
        if (!g || ev.pointerId !== g.pointerId) return;
        g.release();
        boxGrab.current = null;
        // Never moved: a tap, so centre it like any other desk piece.
        if (!g.moved && centerOnPiece) void centerOnPiece(g.source);
      };

      const release = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      boxGrab.current = {
        pointerId: e.pointerId,
        px: e.clientX,
        py: e.clientY,
        left0: boxPosRef.current.left,
        top0: boxPosRef.current.top,
        moved: false,
        source,
        release,
      };
    },
    [draggable, scale, centerOnPiece],
  );

  const pickUp = useCallback(
    (color: PencilColor, e: React.PointerEvent) => {
      if (!draggable || grab.current) return;
      e.stopPropagation();
      e.preventDefault();

      const from = layout[color];
      const source = e.currentTarget as HTMLElement;
      const p = clientToCanvas(e.clientX, e.clientY);

      // Where the pencil is right now. A seated one has to be measured: its
      // well carries the box's rotation and scale.
      let cx: number, cy: number, deg: number;
      if (from.where === "desk") {
        cx = from.left + PENCIL_W / 2;
        cy = from.top + PENCIL_H / 2;
        deg = from.deg;
      } else {
        const b = source.getBoundingClientRect();
        const c = clientToCanvas(b.left + b.width / 2, b.top + b.height / 2);
        cx = c.x;
        cy = c.y;
        // Wells stand upright inside the box, so a pencil leaves one carrying
        // the box's own tilt — it comes out at the angle it was sitting at.
        deg = PENCIL_BOX.deg;
      }

      const onMove = (ev: PointerEvent) => {
        const g = grab.current;
        if (!g || ev.pointerId !== g.pointerId) return;
        const far =
          Math.abs(ev.clientX - g.px) > DRAG_SLOP || Math.abs(ev.clientY - g.py) > DRAG_SLOP;
        if (!far && !g.lifted) return;
        g.lifted = true;
        const q = clientToCanvas(ev.clientX, ev.clientY);
        g.cx = q.x + g.dx;
        g.cy = q.y + g.dy;
        setHeld({ color: g.color, cx: g.cx, cy: g.cy, deg: g.deg });
      };

      const onUp = (ev: PointerEvent) => {
        const g = grab.current;
        if (!g || ev.pointerId !== g.pointerId) return;
        g.release();
        grab.current = null;
        setHeld(null);

        // Never moved: treat it as a tap and bring the pencil to the middle of
        // the viewport, the way every other desk piece behaves.
        if (!g.lifted) {
          if (centerOnPiece) void centerOnPiece(g.source);
          return;
        }

        // The drag layer is pointer-transparent, so this reads what sits under
        // the cursor *beneath* the held pencil.
        const box = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-pencil-box]");
        const slot = box ? nearestFreeSlot(box, ev.clientX, ev.clientY) : null;

        setLayout((prev) => ({
          ...prev,
          [g.color]:
            slot !== null
              ? { where: "box", slot }
              : { where: "desk", left: g.cx - PENCIL_W / 2, top: g.cy - PENCIL_H / 2, deg: g.deg },
        }));
      };

      const release = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      // Listeners go on the window, not the pencil: the pencil is torn out of
      // its old parent the moment it lifts, which would drop pointer capture.
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      grab.current = {
        color,
        pointerId: e.pointerId,
        px: e.clientX,
        py: e.clientY,
        dx: cx - p.x,
        dy: cy - p.y,
        cx,
        cy,
        deg,
        lifted: false,
        source,
        release,
      };
    },
    [draggable, layout, clientToCanvas, centerOnPiece],
  );

  const seated = slotsOf(layout);
  // Whatever is in hand is drawn only in the drag layer.
  const slots = seated.map((c) => (c && c === held?.color ? null : c));
  const loose = (Object.keys(layout) as PencilColor[])
    .filter((c) => layout[c].where === "desk" && c !== held?.color)
    .sort();

  const grabStyle = draggable ? { cursor: "grab" as const, touchAction: "none" as const } : undefined;

  return (
    <div ref={rootRef} className="absolute inset-0">
      {/* The box sits under the loose pencils, so one dropped against its edge
          stays visible rather than sliding beneath the lid. */}
      <div
        className="absolute z-[1]"
        style={{ left: boxPos.left, top: boxPos.top, transform: `rotate(${PENCIL_BOX.deg}deg)` }}
      >
        <PencilBox
          theme={theme}
          slots={slots}
          onPencilPointerDown={draggable ? pickUp : undefined}
          onBoxPointerDown={draggable ? pickUpBox : undefined}
        />
      </div>

      {loose.map((color) => {
        const p = layout[color] as Extract<Placement, { where: "desk"; }>;
        return (
          <div
            key={color}
            className="absolute z-[2]"
            style={{
              left: p.left,
              top: p.top,
              width: PENCIL_W,
              height: PENCIL_H,
              transform: `rotate(${p.deg}deg)`,
            }}
          >
            <Pencil
              color={color}
              theme={theme}
              className="h-full w-full"
              style={grabStyle}
              onPointerDown={draggable ? (e) => pickUp(color, e) : undefined}
            />
          </div>
        );
      })}

      {/* Drag layer: one pencil following the cursor in plain canvas
          coordinates — above everything, and transparent to hit-testing so the
          drop can see the box underneath it. */}
      {held && (
        <div
          className="absolute z-[20]"
          style={{
            left: held.cx - PENCIL_W / 2,
            top: held.cy - PENCIL_H / 2,
            width: PENCIL_W,
            height: PENCIL_H,
            transform: `rotate(${held.deg}deg) scale(1.05)`,
            pointerEvents: "none",
            filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.28))",
          }}
        >
          {/* SvgPiece hard-codes `pointer-events-auto` on the <img>, which
              would override the wrapper above and make the held pencil answer
              its own hit test — the drop would then always read "desk", never
              the box underneath. The inline style is what actually wins. */}
          <Pencil
            color={held.color}
            theme={theme}
            className="h-full w-full"
            style={{ pointerEvents: "none" }}
          />
        </div>
      )}
    </div>
  );
}

/** The empty well nearest the cursor, or null if the box has no room left. */
function nearestFreeSlot(box: Element, clientX: number, clientY: number): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const el of box.querySelectorAll<HTMLElement>("[data-pencil-slot][data-pencil-empty]")) {
    const b = el.getBoundingClientRect();
    const dx = clientX - (b.left + b.width / 2);
    const dy = clientY - (b.top + b.height / 2);
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = Number(el.dataset.pencilSlot);
    }
  }
  return best;
}
