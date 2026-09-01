import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  PUZZLE_ART,
  PUZZLE_GRAIN,
  PUZZLE_H,
  PUZZLE_PIECES,
  PUZZLE_W,
  type PuzzlePiece,
} from "./puzzleGeometry";
import { useDeskCamera, useFocusedId } from "./ScatteredFocus";
import {
  clearState,
  PILE,
  clusterOf,
  initialState,
  loadState,
  moveCluster,
  rotateCluster,
  saveState,
  snapCandidate,
  trySnap,
  type PuzzleState,
} from "./puzzleState";

/**
 * The Archive puzzle.
 *
 * Click a piece to pick up whatever it is joined to, move the pointer, click
 * again to put it down. Pieces snap to each other by proximity — there is no
 * tray or outline to drop them onto, and nothing shows the finished picture
 * before it is finished. A snap straightens both sides, so the visitor never
 * rotates anything by hand.
 *
 * The puzzle is a bonus, never a gate: the Archive it produces is reachable
 * directly in Organised mode without touching this.
 */

/**
 * The rotate cursor, as a data URI. Inline rather than an asset because it has
 * to be a `cursor:` value — an SVG file would be one more request for a 24px
 * glyph, and this way it cannot go missing.
 */
const ROTATE_CURSOR =
  "url(\"data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
      '<g fill="none" stroke="%23fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M18 3v4.5h-4.5"/></g>' +
      '<g fill="none" stroke="%232f2f2f" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M18 3v4.5h-4.5"/></g></svg>',
  ).replace(/%23/g, "%23") +
  "\") 12 12, crosshair";

/** How far in from a piece's edges still counts as its corner, as a fraction
 *  of the bounding box. Big enough to hit, small enough that the middle of the
 *  piece is unambiguously "pick me up". */
const CORNER = 0.3;

/** The camera's name for this object. */
const FOCUS_ID = "puzzle";

const REDUCED = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PieceShape({ piece, uid }: { piece: PuzzlePiece; uid: string }) {
  const clipId = `${uid}-${piece.id}`;
  return (
    <svg
      width={piece.w}
      height={piece.h}
      viewBox={`${piece.x} ${piece.y} ${piece.w} ${piece.h}`}
      className="block"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={piece.d} transform={piece.transform} />
        </clipPath>
      </defs>
      {/* The artwork is drawn whole and clipped, so neighbouring pieces line up
          exactly the way they do in the finished picture. */}
      <g clipPath={`url(#${clipId})`}>
        <image href={PUZZLE_ART} x={0} y={0} width={PUZZLE_W} height={PUZZLE_H} preserveAspectRatio="xMidYMid slice" />
        <image
          href={PUZZLE_GRAIN}
          x={0}
          y={0}
          width={PUZZLE_W}
          height={PUZZLE_H}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.35}
        />
      </g>
    </svg>
  );
}

export function Puzzle({
  scale,
  enabled,
  z,
  focusZ,
  onSolvedOpen,
}: {
  /** Canvas `fit` scale, so pointer deltas convert to canvas units. */
  scale: number;
  enabled: boolean;
  /** Where the puzzle sits in the desk's stacking order. */
  z: number;
  /** Where it sits while the camera is leaning in on it. */
  focusZ: number;
  /** Called when the finished Archive card is clicked. */
  onSolvedOpen: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [state, setState] = useState<PuzzleState>(() => loadState() ?? initialState());
  const [held, setHeld] = useState<string | null>(null);
  const [justSnapped, setJustSnapped] = useState<string | null>(null);
  /** Piece id the pointer is currently over a corner of, if any. */
  const [overCorner, setOverCorner] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const camera = useDeskCamera();
  const focused = useFocusedId() === FOCUS_ID;

  useEffect(() => saveState(state), [state]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
    },
    [scale],
  );

  // While a cluster is held it tracks the pointer. This is click-move-click,
  // not press-drag-release, so the page can still be scrolled mid-carry.
  useEffect(() => {
    if (!held) return;
    const onMove = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      const prev = last.current ?? p;
      last.current = p;
      setState((s) => moveCluster(s, held, p.x - prev.x, p.y - prev.y));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [held, toCanvas]);

  const drop = useCallback(
    (id: string) => {
      setState((s) => {
        const { state: next, snapped } = trySnap(s, id);
        if (snapped) {
          setJustSnapped(id);
          window.setTimeout(() => setJustSnapped(null), 420);
        }
        return next;
      });
      setHeld(null);
      last.current = null;
    },
    [],
  );

  // A click anywhere puts a held cluster down, so a piece can never get stuck
  // to the pointer.
  useEffect(() => {
    if (!held) return;
    const onClick = () => drop(held);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [held, drop]);

  useEffect(() => {
    if (!held) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") drop(held);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [held, drop]);

  /** True when the pointer sits in one of the piece's four corner zones. */
  const atCorner = (e: React.MouseEvent, el: HTMLElement) => {
    const b = el.getBoundingClientRect();
    const fx = (e.clientX - b.left) / b.width;
    const fy = (e.clientY - b.top) / b.height;
    return (fx < CORNER || fx > 1 - CORNER) && (fy < CORNER || fy > 1 - CORNER);
  };

  /**
   * What the camera should frame: whatever the twelve pieces currently cover.
   *
   * Measured from the live state rather than from `PILE`, because by the time
   * anyone focuses the puzzle the pieces have usually been moved — framing
   * the box they *started* in would leave half the game off-screen.
   */
  const bounds = useCallback(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const piece of PUZZLE_PIECES) {
      const st = state.pieces[piece.id];
      if (!st) continue;
      x0 = Math.min(x0, st.ox + piece.x);
      y0 = Math.min(y0, st.oy + piece.y);
      x1 = Math.max(x1, st.ox + piece.x + piece.w);
      y1 = Math.max(y1, st.oy + piece.y + piece.h);
    }
    if (!Number.isFinite(x0)) return null;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  }, [state.pieces]);

  /**
   * Lean the camera in on the pile.
   *
   * `el` is deliberately left off the spec: this component's root spans the
   * whole canvas so that pieces can be carried anywhere across it, which
   * would make "did the click land on the puzzle?" answer yes to every click
   * on the desk. The camera falls back to hit-testing the rect instead.
   */
  const takeFocus = useCallback(() => {
    const rect = bounds();
    if (!camera || !rect) return false;
    void camera.focus({ id: FOCUS_ID, rect, fill: 0.78, maxZoom: 3 });
    return true;
  }, [bounds, camera]);

  const onPieceClick = (e: React.MouseEvent, id: string) => {
    if (!enabled || state.solved) return;
    e.stopPropagation();
    // The first click brings the puzzle over; picking pieces up comes after.
    // At the resting desk scale a piece is around fifty pixels across, so a
    // click there is a click at something rather than on it.
    if (!focused && takeFocus()) return;
    // Corner turns it, middle carries it — one click target, two verbs, told
    // apart by where in the piece the click lands.
    if (!held && atCorner(e, e.currentTarget as HTMLElement)) {
      setState((s) => rotateCluster(s, id));
      return;
    }
    if (held) {
      drop(held);
      return;
    }
    last.current = toCanvas(e.clientX, e.clientY);
    setHeld(id);
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearState();
    setHeld(null);
    last.current = null;
    setState(initialState());
  };

  const heldIds = held ? new Set(clusterOf(state, held)) : new Set<string>();
  // Recomputed each render while carrying, which is exactly when it changes.
  const willSnap = held ? snapCandidate(state, held) : false;
  const snappedIds = justSnapped ? new Set(clusterOf(state, justSnapped)) : new Set<string>();
  const touched = state.touched;

  const renderPiece = (piece: PuzzlePiece) => {
    const st = state.pieces[piece.id];
    if (!st) return null;

    const carried = heldIds.has(piece.id);
    return (
      <div
        key={piece.id}
        role={enabled && !state.solved ? "button" : undefined}
        tabIndex={-1}
        aria-hidden="true"
        onClick={(e) => onPieceClick(e, piece.id)}
        onPointerMove={(e) => {
          if (!enabled || state.solved || held) return;
          const on = atCorner(e, e.currentTarget as HTMLElement);
          setOverCorner((cur) => (on ? piece.id : cur === piece.id ? null : cur));
        }}
        onPointerLeave={() => setOverCorner((cur) => (cur === piece.id ? null : cur))}
        className="absolute"
        style={{
          left: st.ox + piece.x,
          top: st.oy + piece.y,
          width: piece.w,
          height: piece.h,
          transform: `rotate(${st.deg}deg)${carried ? " scale(1.06)" : ""}`,
          transformOrigin: "center",
          pointerEvents: enabled && !state.solved ? "auto" : "none",
          cursor: !enabled || state.solved
            ? undefined
            : carried
              ? "grabbing"
              : overCorner === piece.id
                ? ROTATE_CURSOR
                : "grab",
          zIndex: carried ? 30 : 1,
          filter: carried
            ? willSnap
              ? "drop-shadow(0 0 12px rgba(255,201,79,0.95)) drop-shadow(0 18px 24px rgba(0,0,0,0.35))"
              : "drop-shadow(0 18px 24px rgba(0,0,0,0.35))"
            : snappedIds.has(piece.id)
              ? "drop-shadow(0 0 10px rgba(255,201,79,0.9))"
              : undefined,
          transition: REDUCED()
            ? undefined
            : carried
              ? "transform 120ms ease-out"
              : "transform 260ms cubic-bezier(0.22,0.61,0.36,1), filter 300ms ease-out",
        }}
      >
        <PieceShape piece={piece} uid={uid} />
      </div>
    );
  };

  // Solved: the twelve pieces already sit on one grid, so the card is just a
  // backing behind them plus a control. Nothing is re-laid-out or swapped —
  // the picture the visitor assembled is the picture that stays.
  const solvedOrigin = state.solved ? state.pieces[PUZZLE_PIECES[0].id] : null;

  return (
    // An explicit z-index creates a stacking context, so the piece-level
    // values below are private to the puzzle.
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: focused ? focusZ : z }}
    >
      <div className="pointer-events-none absolute inset-0">
        {solvedOrigin ? (
          <button
            type="button"
            onClick={onSolvedOpen}
            aria-label="Open the Archive"
            className="absolute cursor-pointer border-0 p-0"
            style={{
              left: solvedOrigin.ox - 8,
              top: solvedOrigin.oy - 8,
              width: PUZZLE_W + 16,
              height: PUZZLE_H + 16,
              borderRadius: 8,
              background: "var(--surface)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.28)",
              pointerEvents: "auto",
            }}
          />
        ) : null}

        {PUZZLE_PIECES.map((p) => renderPiece(p))}

        {/* Reset appears only once the pile has been disturbed, so it is not
            an invitation to undo something that has not started. */}
        {touched ? (
          <button
            type="button"
            onClick={reset}
            className="absolute cursor-pointer rounded-lg border px-4 py-2 font-mono text-sm uppercase tracking-wide"
            style={{
              left: state.solved && solvedOrigin ? solvedOrigin.ox : PILE.x,
              top: state.solved && solvedOrigin ? solvedOrigin.oy + PUZZLE_H + 28 : PILE.y + PILE.h + 40,
              pointerEvents: "auto",
              background: "var(--surface)",
              color: "var(--content)",
              borderColor: "var(--edge)",
            }}
          >
            {state.solved ? "Reset puzzle" : "Reset"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
