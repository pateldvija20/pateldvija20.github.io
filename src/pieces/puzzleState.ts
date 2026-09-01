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

/** Where the loose pile sits on the canvas (Figma 458:45201). */
const PILE = { x: 4163, y: 1670, w: 560, h: 430 };


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

/** A fresh, unsolved arrangement: ten scattered across the pile, two buried. */
export function initialState(seed = Date.now()): PuzzleState {
  const rand = rng(seed);
  const pieces: Record<string, PieceState> = {};
  let cluster = 0;

  for (const p of PUZZLE_PIECES) {
    // Every piece starts in the one pile — a spilled box, all twelve together.
    // `ox/oy` is the artwork origin, so the piece's own cell offset is
    // subtracted to land the piece itself inside the pile.
    //
    // Angles are quarter turns, not arbitrary: the visitor rotates in 90°
    // steps from a piece's corner, so a piece must start on that same lattice
    // or it could never be squared up by hand.
    pieces[p.id] = {
      ox: PILE.x + rand() * PILE.w - p.col * PUZZLE_CELL,
      oy: PILE.y + rand() * PILE.h - p.row * PUZZLE_CELL,
      deg: Math.floor(rand() * 4) * 90,
      cluster: cluster++,
    };
  }

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

  for (const hId of held) {
    const h = byId.get(hId)!;
    for (const [tId, t] of Object.entries(state.pieces)) {
      if (heldSet.has(tId)) continue;
      const tp = byId.get(tId)!;
      if (!adjacent(h, tp)) continue;

      const dx = t.ox - heldOrigin.ox;
      const dy = t.oy - heldOrigin.oy;
      if (Math.hypot(dx, dy) > SNAP_TOLERANCE) continue;

      // Adopt the target's origin exactly, and flatten both clusters onto it.
      const target = state.pieces[tId];
      const merged: Record<string, PieceState> = { ...state.pieces };
      const targetCluster = target.cluster;
      for (const k of Object.keys(merged)) {
        if (heldSet.has(k) || merged[k].cluster === targetCluster) {
          merged[k] = { ...merged[k], ox: target.ox, oy: target.oy, deg: 0, cluster: targetCluster };
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
export function rotateCluster(state: PuzzleState, id: string): PuzzleState {
  const ids = clusterOf(state, id);
  const pieces = { ...state.pieces };
  for (const k of ids) pieces[k] = { ...pieces[k], deg: (pieces[k].deg + 90) % 360 };
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
  for (const hId of held) {
    const h = byId.get(hId)!;
    for (const [tId, t] of Object.entries(state.pieces)) {
      if (held.has(tId)) continue;
      if (!adjacent(h, byId.get(tId)!)) continue;
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
