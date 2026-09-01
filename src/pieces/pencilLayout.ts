import type { PencilColor } from "./Pencil";

/**
 * Every well in the box, left to right. A pencil's `slot` is an index into
 * this — the colour listed here is only the *default* occupant, since any
 * pencil can be dropped into any free well once they start moving around.
 */
export const ALL_SLOTS: readonly PencilColor[] = [
  "yellow", "orange", "red", "pink", "purple", "blue",
  "darkblue", "cyan", "green", "darkgreen", "black", "grey",
];

/** A pencil is either seated in one of the box's wells, or lying on the desk
 *  at an explicit canvas position. Nothing in between — a pencil mid-drag is
 *  tracked separately, so this stays the resting truth. */
export type Placement =
  | { where: "box"; slot: number; }
  | { where: "desk"; left: number; top: number; deg: number; };

export type PencilLayout = Record<PencilColor, Placement>;

/**
 * Rendered size of a loose pencil in canvas units — the same 42.219 x 822.446
 * the seated ones are drawn at inside the box (`PencilBox`), and the size
 * `pencil` 458:45209 solves to in the Scattered frame.
 *
 * It used to be 32.95 x 641.9, on the belief that the box was rendering ~22%
 * small and the loose pencils had to match it. The box is in fact at its full
 * 910x911, so the two sizes disagreed and a pencil visibly shrank the moment
 * it left its well. Matching them closes that.
 */
export const PENCIL_W = 42.219;
export const PENCIL_H = 822.446;

/** The box's own placement on the Scattered canvas (Figma 458:45210, whose
 *  527.875x528.013 box centres at 3903.0, 2562.6 in canvas units). Its
 *  rotation is what a pencil inherits on the way out of a well — kept at the
 *  frame's 5.2, which a near-square box's bounding box is too ill-conditioned
 *  to re-solve for. */
export const PENCIL_BOX = { left: 3448.0, top: 2107.0, deg: 5.2 };

/**
 * Where each pencil sits when the Scattered desk first renders: four loose on
 * the desk, the other eight seated in their own well. Dragging works on a
 * copy, never on this table, so it doubles as the reset pose.
 *
 * All four are now the frame's own placements rather than an approximation of
 * them. Each angle is solved from that pencil's bounding box in 458:45201
 * against the known 42.219 x 822.446 body, and each left/top is the box
 * centre minus half the pencil. The earlier note here — that Figma's spacing
 * left the loose four reading as unrelated to the box — was true of the old
 * frame, where the pencils were drawn a fifth too small; at their real size
 * they read as belonging to it.
 */
export const DEFAULT_LAYOUT: PencilLayout = {
  // Lying across the desk below and left of the box.
  black: { where: "desk", left: 2774.8, top: 2538.8, deg: -72.02 },
  // Standing upright against the box's left edge.
  darkgreen: { where: "desk", left: 3272.2, top: 1988.9, deg: 0 },
  // Laid flat across the box's top edge.
  darkblue: { where: "desk", left: 3800.2, top: 1669.0, deg: -85.11 },
  // Leaning just off vertical, in front of the box.
  yellow: { where: "desk", left: 3277.0, top: 2034.4, deg: 9.85 },
  // Seated, each in the well that matches its own colour slot.
  orange: { where: "box", slot: 1 },
  red: { where: "box", slot: 2 },
  pink: { where: "box", slot: 3 },
  purple: { where: "box", slot: 4 },
  blue: { where: "box", slot: 5 },
  cyan: { where: "box", slot: 7 },
  green: { where: "box", slot: 8 },
  grey: { where: "box", slot: 11 },
};

/** Which colour (if any) is sitting in each well, for a given layout. */
export function slotsOf(layout: PencilLayout): (PencilColor | null)[] {
  const seated: (PencilColor | null)[] = ALL_SLOTS.map(() => null);
  for (const color of Object.keys(layout) as PencilColor[]) {
    const p = layout[color];
    if (p.where === "box" && p.slot >= 0 && p.slot < seated.length) seated[p.slot] = color;
  }
  return seated;
}
