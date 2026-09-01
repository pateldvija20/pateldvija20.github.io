import { PUZZLE_CELL, PUZZLE_PIECES, type PuzzlePiece } from "./puzzleGeometry";

/**
 * Archive puzzle state.
 *
 * The key idea: a piece's position is stored as where the *whole artwork's*
 * origin would sit on the canvas for that piece — not where the piece itself
 * is. Two pieces are correctly placed relative to each other exactly when
 * their origins coincide, so "are these assembled?" is one distance test
 * instead of per-edge geometry, and a solved cluster is simply every piece
 * sharing one origin.
 *
 * Rotation is about each piece's own bounding-box centre, which leaves the
 * origin unmoved — so a rotated piece can still be tested the same way.
 */

export type PieceState = {
  /** Canvas position of artwork coordinate (0,0) for this piece. */
  ox: number;
  oy: number;
  deg: number;
  /** Pieces sharing a cluster id are assembled together and all sit at deg 0. */
  cluster: number;
};

export type PuzzleState = {
  pieces: Record<string, PieceState>;
  solved: boolean;
  /** True once the visitor has actually moved something. Gates the Reset
   *  control, which should not offer to undo a puzzle nobody has started.
   *  (`buried` cannot stand in for this — ten pieces are unburied from the
   *  start.) */
  touched: boolean;
};

/**
 * How close two origins must be to count as assembled.
 *
 * Three quarters of a cell. Half a cell (48) was correct on paper and unusable
 * in practice: with click-move-click there is no fine-positioning phase, so the
 * visitor has one shot at landing inside the window. The brief asks for
 * proximity and explicitly not pixel-perfect placement.
 */
export const SNAP_TOLERANCE = 72;

/**
 * Where each of the twelve pieces is spilled, in canvas units.
 *
 * These are the frame's own placements — the `A6 - n` instances in Figma
 * 458:45201, converted from frame units at 3580/1911. The pile used to be a
 * seeded random scatter inside a box, which meant the desk opened on a
 * different arrangement every visit and none of them was the drawn one.
 *
 * Two things the frame cannot give:
 *
 * The *pairing* is arbitrary. `A6 - 2` … `A6 - 13` carry no column or row in
 * their names and the shapes are matched to within a few units of each other,
 * so which fragment of the picture lands in which slot is this array's order
 * rather than the file's. That is not a loss: the pile is a jumble, and the
 * design says where twelve pieces lie, not which is which.
 *
 * The *angles* are still generated. The frame sets each piece at its own
 * arbitrary rotation, but a piece is squared up here in 90° steps, so one
 * that started at 23° could never be straightened. The quarter turns below
 * keep every piece on a lattice the visitor can actually solve.
 *
 * The *spread* is the frame's, drawn in at 0.85 about its own centre. The
 * frame lays the pile out on bare desk; here it sits on the golden-ratio mat,
 * and at full spread the pieces ran to within about thirteen units of the
 * mat's edge — close enough to read as overflowing it rather than lying on
 * it. Scaling the arrangement rather than nudging twelve pairs by hand keeps
 * the relative composition exactly as drawn. `ScatteredScene` centres the mat
 * on what this produces, so the two move together.
 */
const SLOTS: readonly (readonly [number, number])[] = [
  [1627.6, 2740.2],
  [1578.9, 2984.7],
  [1675.3, 2832.9],
  [1915.9, 2993.5],
  [1782.7, 3002.8],
  [1793.5, 2919.6],
  [1636.2, 3002.2],
  [1935.3, 2948.5],
  [1862.6, 2897.5],
  [1825.8, 2823.6],
  [1899.6, 3002.9],
  [1693.2, 2789.0],
] as const;

/** The box those slots cover, for anything that needs to point at the pile
 *  without walking every piece. */
export const PILE = {
  x: Math.min(...SLOTS.map((v) => v[0])),
  y: Math.min(...SLOTS.map((v) => v[1])),
  w: Math.max(...SLOTS.map((v) => v[0])) - Math.min(...SLOTS.map((v) => v[0])),
  h: Math.max(...SLOTS.map((v) => v[1])) - Math.min(...SLOTS.map((v) => v[1])),
};


const STORAGE_KEY = "dp:puzzle";

/** Mulberry32 — a small seeded PRNG, so a shuffle can be reproduced from a
 *  seed rather than being different on every render pass. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh, unsolved arrangement: the twelve pieces as the frame spills them. */
export function initialState(seed = Date.now()): PuzzleState {
  const rand = rng(seed);
  const pieces: Record<string, PieceState> = {};
  let cluster = 0;

  PUZZLE_PIECES.forEach((p, i) => {
    const [x, y] = SLOTS[i % SLOTS.length];
    // `ox/oy` is the *artwork* origin, not the piece's own corner, so a piece
    // lands on its slot only once its offset within the picture is taken back
    // out. Two pieces are assembled when their origins coincide, which is why
    // the state is kept this way round.
    pieces[p.id] = {
      ox: x - p.x,
      oy: y - p.y,
      deg: Math.floor(rand() * 4) * 90,
      cluster: cluster++,
    };
  });

  return { pieces, solved: false, touched: false };
}

/* ------------------------------------------------------------------ */
/* Assembly                                                             */
/* ------------------------------------------------------------------ */

const adjacent = (a: PuzzlePiece, b: PuzzlePiece) =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

const byId = new Map(PUZZLE_PIECES.map((p) => [p.id, p]));

/** Every piece id in the same cluster as `id`. */
export const clusterOf = (state: PuzzleState, id: string) =>
  Object.keys(state.pieces).filter((k) => state.pieces[k].cluster === state.pieces[id].cluster);

/**
 * Try to join the cluster holding `id` onto any neighbouring piece it has been
 * dropped close to. Returns the new state, and whether anything snapped.
 *
 * Both sides are normalised to 0°: a snap is also the moment a piece stops
 * being loose, and the brief asks for pieces to align themselves rather than
 * requiring the visitor to rotate anything.
 */
export function trySnap(state: PuzzleState, id: string): { state: PuzzleState; snapped: boolean } {
  const held = clusterOf(state, id);
  const heldSet = new Set(held);
  const heldOrigin = state.pieces[id];

  // Position alone is not enough: a piece has to be the right way up before it
  // will join. Snapping used to straighten both sides on contact, which meant
  // the twelve opening rotations were decoration — you could solve the whole
  // picture without ever turning anything. Requiring the orientation makes the
  // turn a real move, and is why `R` and the right button had to become
  // reachable mid-drag first.
  if (!squared(heldOrigin.deg)) return { state, snapped: false };

  for (const hId of held) {
    const h = byId.get(hId)!;
    for (const [tId, t] of Object.entries(state.pieces)) {
      if (heldSet.has(tId)) continue;
      const tp = byId.get(tId)!;
      if (!adjacent(h, tp)) continue;
      if (!squared(t.deg)) continue;

      const dx = t.ox - heldOrigin.ox;
      const dy = t.oy - heldOrigin.oy;
      if (Math.hypot(dx, dy) > SNAP_TOLERANCE) continue;

      // Adopt the target's origin exactly and merge the clusters. Angles are
      // left alone: both sides are already square by the guards above, and
      // rewriting an accumulated 360 back to 0 would spin the piece a full
      // turn backwards at the moment it joined.
      const target = state.pieces[tId];
      const merged: Record<string, PieceState> = { ...state.pieces };
      const targetCluster = target.cluster;
      for (const k of Object.keys(merged)) {
        if (heldSet.has(k) || merged[k].cluster === targetCluster) {
          merged[k] = { ...merged[k], ox: target.ox, oy: target.oy, cluster: targetCluster };
        }
      }
      const solved = new Set(Object.values(merged).map((p) => p.cluster)).size === 1;
      return { state: { pieces: merged, solved, touched: true }, snapped: true };
    }
  }

  return { state, snapped: false };
}

/**
 * Move every piece in `id`'s cluster by a delta.
 *
 * Carrying no longer straightens: rotation is the visitor's to control now, so
 * silently squaring a piece up on lift would undo the turn they just made. A
 * successful snap still aligns both sides, which is where the brief asks for
 * it.
 */
export function moveCluster(state: PuzzleState, id: string, dx: number, dy: number): PuzzleState {
  const ids = new Set(clusterOf(state, id));
  const pieces = { ...state.pieces };
  for (const k of ids) {
    pieces[k] = { ...pieces[k], ox: pieces[k].ox + dx, oy: pieces[k].oy + dy };
  }
  return { ...state, pieces, touched: true };
}

/** Turn `id`'s cluster a quarter turn clockwise, about the piece grabbed. */
/**
 * Is this piece square to the picture? Orientation is stored as a running
 * total rather than wrapped (see `rotateCluster`), so the test is modular.
 */
export const squared = (deg: number) => (((deg % 360) + 360) % 360) === 0;

/**
 * Turn a cluster a quarter turn clockwise.
 *
 * The angle accumulates — 0, 90, 180, 270, 360, 450 — instead of wrapping at
 * 360. Wrapping is what made a piece appear to turn three times and then spin
 * backwards to where it started: CSS interpolates `rotate(270deg)` to
 * `rotate(0deg)` the short way round, so the fourth quarter turn played as a
 * three-quarter reversal. Letting the number grow means every turn is a
 * forward 90 degrees, and nothing else cares about the absolute value because
 * orientation is compared with `squared`.
 */
export function rotateCluster(state: PuzzleState, id: string): PuzzleState {
  const ids = clusterOf(state, id);
  const pieces = { ...state.pieces };
  for (const k of ids) pieces[k] = { ...pieces[k], deg: pieces[k].deg + 90 };
  return { ...state, pieces, touched: true };
}

/**
 * Whether dropping `id`'s cluster right now would snap. Drives the hint that
 * tells the visitor a join is available *before* they commit to the drop —
 * without it, a near miss and a wild miss look identical.
 */
export function snapCandidate(state: PuzzleState, id: string): boolean {
  const held = new Set(clusterOf(state, id));
  const origin = state.pieces[id];
  // A crooked piece never reads as ready to join, however close it is — the
  // hint has to agree with `trySnap` or it teaches the wrong thing.
  if (!squared(origin.deg)) return false;
  for (const hId of held) {
    const h = byId.get(hId)!;
    for (const [tId, t] of Object.entries(state.pieces)) {
      if (held.has(tId)) continue;
      if (!adjacent(h, byId.get(tId)!)) continue;
      if (!squared(t.deg)) continue;
      if (Math.hypot(t.ox - origin.ox, t.oy - origin.oy) <= SNAP_TOLERANCE) return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Persistence                                                          */
/* ------------------------------------------------------------------ */

/**
 * Progress survives a reload, so a half-built puzzle is not punished by a
 * refresh. `localStorage` rather than the preloader's `sessionStorage`:
 * a puzzle is worth keeping across visits, an intro animation is not. Every
 * access is guarded the same way — a browser with site data blocked throws on
 * the property itself, and the desk must still open.
 */
export function loadState(): PuzzleState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PuzzleState;
    // Reject anything that does not describe the current 12-piece puzzle, so a
    // stale save from an earlier layout cannot half-restore.
    if (!parsed?.pieces || Object.keys(parsed.pieces).length !== PUZZLE_PIECES.length) return null;
    if (PUZZLE_PIECES.some((p) => !parsed.pieces[p.id])) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: PuzzleState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the puzzle still works, it just will not persist.
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
