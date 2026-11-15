import type { ReactNode } from "react";
import type * as THREE from "three";

/**
 * The contract every object file in this folder keeps (15 Nov), so seven
 * agents can build seven objects side by side and the object lab
 * (/?objlab=<name>) and the scene can use any of them.
 *
 * Each file exports:
 *   - `meta`: ObjectMeta
 *   - default: the object as a React Three Fiber component taking ObjectProps
 *
 * Object space: scene units, origin at the middle of its foot (where it
 * stands on the shelf), y up, its front facing +Z. Sizes follow the
 * storyboard (story/layout.ts, story/design.ts) unless the brief says
 * otherwise.
 *
 * Decor (kind "decor") is drawn by the ink pass: wrap it in <Inked> (from
 * InkPass.tsx), which gives every mesh the page-coloured fill and marks it
 * for one clean outline. Model real shape: the lines come from silhouettes
 * and folds, so detail must exist as geometry.
 *
 * Toys (kind "toy": the books and the cup) are full-colour 3D. Build their
 * materials with toy() / whiten() from toy.ts, and tag every mesh
 * userData.ink = drawn ? "decor" : "color", so frame 2 (`drawn`: still a
 * line drawing) works: the material fades to the page colour and the ink
 * pass outlines it.
 */

export type ObjectMeta = {
  /** The lab's name for it: /?objlab=<name>. */
  name: string;
  kind: "decor" | "toy";
  /** The reference images it must match, as repo paths (docs/storyboard/refs/…). */
  refs: string[];
  /** Its size in scene units, for the lab's framing. */
  width: number;
  height: number;
  depth: number;
};

export type ObjectProps = {
  /** Frame 2: a line drawing, before it turns 3D (toys only; decor always is). */
  drawn?: boolean;
};

/**
 * What a book needs to give the book rig (ToyBook.tsx, which does the
 * opening, the page turns and the sequences) so it can wear this book's
 * look. Book files export `skin()` returning this, as well as their own
 * closed-book component for the lab.
 */
export type BookSkin = {
  /** Board (cover) thickness, and the corner radius seen front-on. */
  board: number;
  corner: number;
  /** Outside of the front cover (the cover art). */
  coverFront: THREE.Material;
  /** Inside of the front cover (seen when it opens). */
  coverInside: THREE.Material;
  /** The boards' edges. */
  coverEdge: THREE.Material;
  backCover: THREE.Material;
  /** Side-bound books: the spine's outside. */
  spine?: THREE.Material;
  /** The page block: its cut edges, and its faces. */
  pageEdge: THREE.Material;
  pageFace: THREE.Material;
  /** Anything else it has (the Playground's wire coil), in book space: origin at the base middle, cover facing +Z. */
  extras?: (props: ObjectProps) => ReactNode;
};
