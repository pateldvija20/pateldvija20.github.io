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
 * Rendered size of a pencil in canvas units. Pencils in the box draw at
 * 42.219 x 822.446 and are shrunk by 0.7804 by the box's own
 * `useElementScale`, which lands on exactly this — so a pencil keeps its size
 * whether it is seated in a well or lying loose on the desk, and a drag
 * between the two never changes scale.
 */
export const PENCIL_W = 32.95;
export const PENCIL_H = 641.9;

/** The box's own placement on the Scattered canvas (Figma 458:45201). Its
 *  rotation is what a pencil inherits on the way out of a well.
 *
 *  ⚠️ Position and angle are updated to the new frame; the box's *scale* is
 *  not. Figma draws it at its full 910x911 and the loose pencils at
 *  42.2 x 822, where this renders both ~22% smaller via PencilBox's
 *  `useElementScale`. Correcting that means changing PENCIL_W/H and the box's
 *  own sizing together, which would move every well and the drag-between-well
 *  hit testing with it — a separate change, not a placement tweak. */
export const PENCIL_BOX = { left: 2498.8, top: 1851.1, deg: 5.2 };

/**
 * Where each pencil sits when the Scattered desk first renders: four loose on
 * the desk, the other eight seated in their own well. Dragging works on a
 * copy, never on this table, so it doubles as the reset pose.
 *
 * The loose four keep their Figma angles (`main_canvas` 69:8583) but are
 * pulled in tight around the box rather than scattered across the far side of
 * the desk — at Figma's spacing they read as unrelated to it, and the drag
 * affordance only makes sense if a pencil and its well are near each other.
 *
 * Angles are Figma's own (458:45201), solved from each pencil's bounding box.
 * Positions are pulled in around the box rather than taken literally from the
 * frame: at this render scale (see PENCIL_BOX) Figma's spacing would leave the
 * loose four reading as unrelated to the box they drag in and out of.
 */
export const DEFAULT_LAYOUT: PencilLayout = {
  // Standing to the left of the box, the taller one nearer.
  yellow: { where: "desk", left: 2375.3, top: 1903.1, deg: 10.43 },
  darkgreen: { where: "desk", left: 2525.3, top: 1963.1, deg: 0.6 },
  // Laid flat just above the box's top edge.
  darkblue: { where: "desk", left: 2825.3, top: 1553.1, deg: -84.53 },
  // Angled across the desk just below the box.
  black: { where: "desk", left: 2495.3, top: 2483.1, deg: -71.53 },
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
