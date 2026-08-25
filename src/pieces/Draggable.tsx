import { useRef, useState, type ReactNode } from "react";
import { useCenterOnPiece } from "./ScatteredFocus";

/**
 * Lets a single desk piece be picked up and moved independently of the
 * whole-stage pan (Scattered mode only).
 *
 * Two things callers must get right:
 *
 * 1. Wrap this OUTSIDE any rotation wrapper. `translate()` composes inside the
 *    parent's coordinate space, so a rotated ancestor rotates the drag vector
 *    too — on a 95°-rotated pencil, dragging left would send it downward.
 *    Put the rotation on a child of this component instead.
 *
 * 2. Pass `scale` when an ancestor scales the scene (the canvas `fit`
 *    transform does). Pointer deltas arrive in screen pixels but are applied
 *    in unscaled canvas units, so without dividing them the piece drifts
 *    behind the cursor.
 *
 * Clicking a piece (as opposed to dragging it) also pans the canvas to bring
 * it to the middle of the viewport.
 */
export function Draggable({
  enabled,
  scale = 1,
  children,
}: {
  enabled: boolean;
  scale?: number;
  children: ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const drag = useRef<{ ox: number; oy: number; px: number; py: number; moved: boolean; captured: boolean } | null>(null);
  const suppressClick = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const centerOnPiece = useCenterOnPiece();

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled) return;
    e.stopPropagation();
    drag.current = { ox: pos.x, oy: pos.y, px: e.clientX, py: e.clientY, moved: false, captured: false };
    setGrabbing(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    e.stopPropagation();
    const dx = (e.clientX - drag.current.px) / scale;
    const dy = (e.clientY - drag.current.py) / scale;
    const far = Math.abs(dx) > 4 || Math.abs(dy) > 4;
    // Capture only once the drag commits. Capturing on pointer-down makes the
    // browser retarget the following click to this wrapper, so buttons inside
    // the piece (folder sheets, the book) never hear their clicks.
    if (far && !drag.current.captured) {
      drag.current.captured = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (far) drag.current.moved = true;
    setPos({ x: drag.current.ox + dx, y: drag.current.oy + dy });
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    e.stopPropagation();
    if (drag.current.moved) suppressClick.current = true;
    drag.current = null;
    setGrabbing(false);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      // A drag just ended — swallow the click rather than treating it as one.
      e.stopPropagation();
      e.preventDefault();
      suppressClick.current = false;
      return;
    }
    // Pieces with their own controls (the folder, the book) centre themselves
    // and *await* it before opening, so ordering matters — don't double up.
    if ((e.target as HTMLElement).closest("button")) return;
    if (centerOnPiece && rootRef.current) void centerOnPiece(rootRef.current);
  };

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        cursor: enabled ? (grabbing ? "grabbing" : "grab") : undefined,
        touchAction: enabled ? "none" : undefined,
      }}
    >
      {children}
    </div>
  );
}
