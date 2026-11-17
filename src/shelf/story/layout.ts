/**
 * The storyboard shelf (docs/storyboard-plan.md): where everything stands, in
 * each of the scene's states.
 *
 * Measured off the sketches (frames 2, 3, 4, 31). The storyboard frame is 2
 * scene units tall; the shelf top (y = 0) sits 88% of the way down it, so the
 * frame runs from y = -0.24 to y = 1.76 and the shelf's front fills the
 * bottom 12%. Frames 2 to 4 are drawn at one scale: the books turn and spread
 * out, and the plant and machine slide aside to make room. The camera stays.
 */

export type Look = "flat" | "ink" | "allflat";
/** Storyboard frame 3 (books spine-out) or frame 4 (home: covers out). */
export type Frame = "intro" | "home";
export type BookId = "about" | "work" | "playground";

/** What the screen shows, at the objects' depth: the frame's height, matched to the screen's. */
export const VIEW = { top: 1.76, bottom: -0.24, aspect: 1.19 };
/** Camera height: level with the shelf top, so the shelf reads as one line, front-on. */
export const EYE = 0;
/** A long way back with a long lens: nearly no perspective, as in the drawings. */
export const CAM_D = 16;

/** Every line in every look, in scene units (about 4px on a 900px-tall screen). */
export const STROKE = 0.009;

export const SHELF = { width: 12, depth: 1.8, thick: 0.2 };

/** Things that slide aside when the books turn (frame 3 to frame 4), by their foot's x. */
export const PLANT_X: Record<Frame, number> = { intro: -1.029, home: -1.452 };
export const MACHINE_X: Record<Frame, number> = { intro: 1.073, home: 1.548 };

/**
 * The spine-out row (16 Nov): the three books stand shoulder to shoulder,
 * touching, thickness by thickness. The plant stands a hand's width clear
 * on its left, the machine just clear on its right, and the lot is centred
 * on x = 0 (the camera's home).
 */
export const SPINE_T: Record<BookId, number> = { playground: 0.15, work: 0.19, about: 0.072 };
/** The scene's width, edge to edge including the hanging plant's right edge and a small margin: the camera fits this. */
export const CONTENT = { halfW: 2.2, minH: 2.4 };
export const PLANT_Z = 0.1;
/** The machine's middle, front to back. Its drawing stands here; the 3D one is 0.9 deep around it. */
export const MACHINE_Z = -0.35;
/** The hanging plant's rod, left end. It's on the wall, so it never moves. */
export const HANGER = { x: 0.78, y: 1.65, z: -0.3 };
/** The cup, relative to the machine's foot: on the drip platform, under the group head, in front. */
export const CUP = { x: -0.286, y: 0.18, z: 0.2 };

/** Each book's cover corner radius, seen front-on (the pages' art is cut to match). */
export const BOOK_CORNER: Record<BookId, number> = { work: 0.004, about: 0.003, playground: 0.012 };

export const BOOK_SIZE: Record<BookId, { w: number; h: number; t: number }> = {
  work: { w: 0.92, h: 1.14, t: 0.19 },
  about: { w: 0.6, h: 0.81, t: 0.072 },
  playground: { w: 1.5, h: 1.264, t: 0.15 },
};

/** Where a book stands: x, depth, turn about its spine, and an optional scale (pulled-forward books grow). */
export type Pose = { x: number; z: number; ry: number; s?: number };

/**
 * Frame 3: spines out, side by side, left to right: the tall Playground
 * with its coil showing as the dome, then Work, then About (the user's
 * order, 14 Nov; the sketches had Work, About, Playground). Frame 4: covers
 * out, Playground at the back, Work in front of it, About in front of both.
 *
 * `turn` is the 3D looks' slight three-quarter turn at home, so the books
 * read as solid; the all-flat look stands them square, as drawn.
 */
export const POSES: Record<Frame, Record<BookId, Pose>> = {
  intro: {
    playground: { x: -0.131, z: 0, ry: Math.PI / 2 },
    work: { x: 0.039, z: 0, ry: Math.PI / 2 },
    about: { x: 0.17, z: 0, ry: Math.PI / 2 },
  },
  home: {
    playground: { x: 0.0, z: -0.5, ry: 0 },
    work: { x: -0.16, z: -0.05, ry: 0 },
    about: { x: 0.19, z: 0.35, ry: 0 },
  },
};
export const HOME_TURN: Record<BookId, number> = { playground: 0, work: 0.2, about: -0.16 };

/** The top of the tallest thing on the shelf: the Playground's coil. */
export const TALLEST = 1.32;
/** On screens wider than the sketches: the least room kept for the shelf's front (the menu bar) and above the coil. */
export const MIN_BAND = 0.09;
export const MIN_HEADROOM = 0.04;

/**
 * Kept up to date by the camera rig: screen pixels (CSS) per scene unit at
 * the objects' depth, and the scene's edges on screen.
 */
export const view = { pxPerUnit: 450, left: -1.6, right: 1.6, top: 1.76, bottom: -0.24, /** The unzoomed frame's top (the hanging planter is pinned to it, so a camera zoom doesn't carry it along). */ baseTop: 1.76 };

/**
 * The hanging plant is drawn in the same place in every storyboard frame,
 * even after the camera pans (frame 31): it hangs from the screen's top-right,
 * not from a spot on the wall. Its rod's left end, as shares of the screen.
 */
export const HANG_AT = { x: 0.8, fromTop: 0.05 };

/* ---------- The scene's states ---------- */

/**
 * The resting states the shelf moves between (plan: "The scene's states").
 * Open and focused share a layout: the open spread is an overlay drawn over
 * the focused book.
 */
export type SceneState = { mode: "intro" } | { mode: "home" } | { mode: "open"; book: BookId } | { mode: "coffee" };

export type SceneLayout = { books: Record<BookId, Pose>; plantX: number; machineX: number; camX: number };

/** Home's poses, with the 3D books' slight three-quarter turn. */
export function homePoses(turn = true): Record<BookId, Pose> {
  const out = { ...POSES.home };
  if (turn) for (const id of Object.keys(out) as BookId[]) out[id] = { ...out[id], ry: out[id].ry + HOME_TURN[id] };
  return out;
}

/**
 * A book pulled forward (frames 5, 15, 24): centred, nearer and bigger, the
 * other two turned spine-out and stepped aside, the plant and machine pushed
 * further out. Which book stands on which side, from the sketches.
 */
const FOCUS_SCALE: Record<BookId, number> = { work: 1.2, about: 1.35, playground: 1.0 };
const FOCUS_SIDES: Record<BookId, [BookId, BookId]> = {
  work: ["playground", "about"],
  playground: ["work", "about"],
  about: ["playground", "work"],
};

/** How far the camera pans right for the coffee view (frame 31): the machine fills the right half. */
export const COFFEE_PAN = 0.45;

export function sceneFor(state: SceneState): SceneLayout {
  switch (state.mode) {
    case "intro":
      return { books: POSES.intro, plantX: PLANT_X.intro, machineX: MACHINE_X.intro, camX: 0 };
    case "coffee":
      return { books: POSES.intro, plantX: PLANT_X.intro, machineX: MACHINE_X.intro, camX: COFFEE_PAN };
    case "open": {
      const [left, right] = FOCUS_SIDES[state.book];
      const spine = Math.PI / 2;
      const books = {
        [state.book]: { x: 0, z: 0.6, ry: 0, s: FOCUS_SCALE[state.book] },
        // In front of the plant and the machine (their leaves and parts reach to z = 0.55), so as these two step aside and the
        // plant and machine slide out past them nothing passes through anything.
        [left]: { x: -0.95, z: 0.85, ry: spine },
        [right]: { x: 0.78, z: 0.85, ry: spine },
      } as Record<BookId, Pose>;
      return { books, plantX: -1.55, machineX: 1.8, camX: 0 };
    }
    default:
      return { books: homePoses(), plantX: PLANT_X.home, machineX: MACHINE_X.home, camX: 0 };
  }
}
