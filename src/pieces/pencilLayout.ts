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

/** The box's own placement on the Scattered canvas (Figma `main_canvas`
 *  69:8583). Its rotation is what a pencil inherits on the way out of a well. */
export const PENCIL_BOX = { left: 3287, top: 1477, deg: 5.19 };

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
 * The box's *visual* footprint is x 3387–4097, y 1577–2288: its 910x911
 * layout box is shrunk 0.7804 about its own centre by `useElementScale`. Each
 * pencil below sits just outside one edge of that, clear of the others —
 * a pencil is 32.95 x 641.9 and rotates about its own centre, so the spans
 * below account for both.
 */
export const DEFAULT_LAYOUT: PencilLayout = {
  // Standing to the left of the box, the taller one nearer.
  yellow: { where: "desk", left: 3163.5, top: 1529.05, deg: 9.85 },
  darkgreen: { where: "desk", left: 3313.5, top: 1589.05, deg: 0 },
  // Laid flat just above the box's top edge.
  darkblue: { where: "desk", left: 3613.5, top: 1179.05, deg: -94.89 },
  // Angled across the desk just below the box.
  black: { where: "desk", left: 3283.5, top: 2109.05, deg: -72.02 },
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
