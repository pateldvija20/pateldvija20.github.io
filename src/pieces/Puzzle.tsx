import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  PUZZLE_ART,
  PUZZLE_GRAIN,
  PUZZLE_H,
  PUZZLE_PIECES,
  PUZZLE_W,
  type PuzzlePiece,
} from "./puzzleGeometry";
import { useDeskCamera, useFocusedId, useLiveScale } from "./ScatteredFocus";
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
 * Press a piece to take hold of whatever it is joined to, drag, and let go to
 * set it down. `R` or the right button turns the piece under the pointer, held
 * or not, so a piece can be squared up in the middle of being carried.
 *
 * Pieces join by proximity *and* orientation: two neighbours that are close
 * enough will not snap until both are square to the picture, so the opening
 * rotations are a real obstacle rather than decoration. There is no tray or
 * outline to drop onto, and nothing shows the finished picture before it is
 * finished — the only signal that a join is available is the glow a carried
 * piece takes on when it is both in place and the right way up.
 *
 * The puzzle is a bonus, never a gate: the Archive it produces is reachable
 * directly in Organised mode without touching this.
 */

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
  /** Piece the pointer is resting on. What `R` and the right button act on
   *  when nothing is being carried. */
  const [hover, setHover] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const camera = useDeskCamera();
  const liveScale = useLiveScale(scale);
  const focused = useFocusedId() === FOCUS_ID;

  useEffect(() => saveState(state), [state]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      const s = liveScale();
      return { x: (clientX - r.left) / s, y: (clientY - r.top) / s };
    },
    [liveScale],
  );

  const drop = useCallback((id: string) => {
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
  }, []);

  /**
   * Carrying a cluster: press, drag, release.
   *
   * This used to be click, move, click — pick a piece up with one click and
   * set it down with another. It reads fine written down and is wrong in the
   * hand: nothing else on the desk behaves that way, a piece stays stuck to
   * the cursor if the second click goes astray, and the whole time the piece
   * is following the pointer the visitor is holding no button, which is the
   * one signal that says "you are carrying something".
   *
   * The listeners are on `window` rather than on the piece so a fast drag
   * cannot outrun its own element, and pointer capture keeps the gesture
   * whole if the pointer crosses another piece on the way.
   */
  useEffect(() => {
    if (!held) return;
    const onMove = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      const prev = last.current ?? p;
      last.current = p;
      setState((s) => moveCluster(s, held, p.x - prev.x, p.y - prev.y));
    };
    const onUp = () => drop(held);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") drop(held);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [held, toCanvas, drop]);

  /**
   * Turning a piece, without having to put it down first.
   *
   * The old rotate was a click inside an invisible corner zone, which had two
   * problems: nothing on screen said the zone was there, and it only worked
   * on a piece that was *not* being carried — so squaring a piece up meant
   * dropping it, turning it, and picking it up again, three gestures for one
   * intention. Now the piece under the pointer turns, whether it is being
   * carried or merely hovered, and it turns from the keyboard or from the
   * right button.
   */
  const turnTarget = held ?? hover;
  const turn = useCallback(() => {
    if (!enabled || state.solved || !turnTarget) return;
    setState((s) => rotateCluster(s, turnTarget));
  }, [enabled, state.solved, turnTarget]);

  useEffect(() => {
    if (!turnTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        turn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turnTarget, turn]);

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

  const onPieceDown = (e: React.PointerEvent, id: string) => {
    if (!enabled || state.solved || held) return;
    e.stopPropagation();
    // The first press brings the puzzle over; carrying pieces comes after. At
    // the resting desk scale a piece is around fifty pixels across, so a press
    // there is a press *at* something rather than on it.
    if (!focused && takeFocus()) return;
    // Only the primary button carries. The right button turns the piece, and
    // is handled by `onContextMenu` below.
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
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

  /** Where the rotate hint sits: centred under the piece it applies to. */
  const turnHint = (() => {
    if (!enabled || state.solved || !turnTarget) return null;
    const piece = PUZZLE_PIECES.find((p) => p.id === turnTarget);
    const st = piece ? state.pieces[piece.id] : null;
    if (!piece || !st) return null;
    return { x: st.ox + piece.x + piece.w / 2, y: st.oy + piece.y + piece.h + 14 };
  })();

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
        onPointerDown={(e) => onPieceDown(e, piece.id)}
        onPointerEnter={() => {
          if (!enabled || state.solved || held) return;
          setHover(piece.id);
        }}
        onPointerLeave={() => setHover((cur) => (cur === piece.id ? null : cur))}
        onContextMenu={(e) => {
          if (!enabled || state.solved) return;
          // Right-click turns the piece. Suppressing the menu is the point:
          // there is nothing on it worth more than a rotation here.
          e.preventDefault();
          e.stopPropagation();
          setState((s) => rotateCluster(s, piece.id));
        }}
        className="absolute"
        style={{
          left: st.ox + piece.x,
          top: st.oy + piece.y,
          width: piece.w,
          height: piece.h,
          transform: `rotate(${st.deg}deg)${carried ? " scale(1.06)" : ""}`,
          transformOrigin: "center",
          pointerEvents: enabled && !state.solved ? "auto" : "none",
          cursor: !enabled || state.solved ? undefined : carried ? "grabbing" : "grab",
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

        {/* The rotate affordance.
            Rotation used to live in an invisible zone at each piece's corner,
            which meant the one control the puzzle cannot be solved without was
            the one nothing on screen mentioned. It rides just under whichever
            piece the pointer is on, so it appears exactly when it applies and
            never while the visitor is doing something else. */}
        {turnHint ? (
          <div
            className="pointer-events-none absolute flex items-center gap-[7px] whitespace-nowrap"
            style={{
              left: turnHint.x,
              top: turnHint.y,
              transform: "translate(-50%, 0)",
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(24,25,26,0.9)",
              color: "#fdfeff",
              fontSize: 21,
              lineHeight: 1,
              fontWeight: 500,
              zIndex: 40,
              opacity: held ? 1 : 0.86,
            }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66M18 3v4.5h-4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            R or right-click to turn
          </div>
        ) : null}

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
