import { BOOK_SIZE, CAM_D, CONTENT, TALLEST, MACHINE_X, PLANT_X, POSES, VIEW, homePoses, sceneFor, view, type BookId, type Pose } from "./layout";

/**
 * The scene's moving parts, as plain numbers. The director (director.ts)
 * tweens them with GSAP, one storyboard frame after another; the 3D parts
 * read them every frame. Nothing here re-renders React.
 */

export type BookPose = {
  x: number;
  y: number;
  z: number;
  /** Turn about the vertical: 0 covers out, π/2 spine out. */
  ry: number;
  /** Tilt back (the Playground leans back as its cover flips up, frame 16). */
  rx: number;
  s: number;
  /** The front cover: 0 shut, 1 open. */
  cover: number;
  /** Closing by the back (side-bound books): the right-hand pages and back board folding over onto the left, 0 to 1. */
  fold: number;
};

/**
 * Which pages show. Side-bound books (Work, About) show a left and a right
 * page; the top-bound Playground shows one, as `right`. A page turning is
 * the leaf: its front is one page, its back the next, `t` 0 to 1 across.
 */
/** `drag`: the leaf is being dragged by hand (ToyBook); the director carries it on from where it was let go. */
export type PageState = { left: number; right: number; leaf: { on: boolean; front: number; back: number; t: number; drag?: boolean; /** Turning forward (the leaf goes from the right over to the left). */ fwd?: boolean } };

export const BOOKS: BookId[] = ["work", "about", "playground"];

export const fromPose = (p: Pose): BookPose => ({ x: p.x, y: 0, z: p.z, ry: p.ry, rx: 0, s: p.s ?? 1, cover: 0, fold: 0 });

/**
 * Scene 2's sideways offsets, one per thing on the shelf: each starts off to
 * the right and slides in to 0. The cup rides on the machine. (`books` is
 * the old shared offset ToyBook still reads; it stays 0, and each book's own
 * offset moves it instead, so its jelly feels the move.)
 */
export type Clickable = BookId | "cup";
export type Entering = "plant" | "playground" | "work" | "about" | "machine" | "hanger";
export const ENTERING: Entering[] = ["plant", "playground", "work", "about", "machine", "hanger"];

/**
 * Starts as the end of scene 2 (books spine-out and drawn, plant and
 * machine in their intro places): the director sets the scene from here.
 */
export const anim = {
  books: Object.fromEntries(BOOKS.map((id) => [id, fromPose(POSES.intro[id])])) as Record<BookId, BookPose>,
  pages: Object.fromEntries(BOOKS.map((id) => [id, { left: 0, right: 0, leaf: { on: false, front: 0, back: 0, t: 0 } }])) as Record<BookId, PageState>,
  plantX: PLANT_X.intro,
  machineX: MACHINE_X.intro,
  camX: 0,
  enter: { plant: 0, playground: 0, work: 0, about: 0, machine: 0, hanger: 0, books: 0 } as Record<Entering | "books", number>,
  /** 1: the books and cup are still line drawings (frame 2). 0: full colour 3D. This one is the most drawn of the four below. */
  drawn: 1,
  /** Each clickable thing's own state: 1 a line drawing, 0 full colour 3D (they turn 3D one after another in frames 3 and 4). */
  drawnBy: { playground: 1, work: 1, about: 1, cup: 1 } as Record<Clickable, number>,
  /**
   * The selection frame the cursor drags (frame 4): corners in CSS pixels, how much of it shows (0 to 1), and which
   * thing it is revealing in 3D. Inside it that thing shows in colour; outside, still the drawing.
   */
  reveal: { x0: 0, y0: 0, x1: 0, y1: 0, show: 0, on: null as Clickable | null },
  /** The pointer that clicks and drags in the opening: CSS pixels, how visible, how pressed (0 to 1). */
  cursor: { x: 0, y: 0, show: 0, press: 0 },
  /** The book under the pointer (worked out from the screen, like the menu bar's hover), and where on it: -1 to 1 across and down. */
  hover: { id: null as BookId | null, nx: 0, ny: 0 },
  /** The cup's lid: 1 resting on the tray beside the cup, 0 on the cup (it lifts from there, `lid`). */
  lidAside: 1,
  /** The hanging planter pulled up out of the screen (scene units up) while a book is brought forward or open. */
  hangerLift: 0,
  /** A white sheet over the shelf while a book is open, so the spread sits on white (frame 7). */
  backdrop: 0,
  /** The cup's lid lifting (0 to 1) and the coffee pouring (0 to 1). */
  lid: 0,
  pour: 0,
  /**
   * Frames 8 to 11: the open book shrinking into the case study's header.
   * `mix` blends the book from its own pose (0) to the header's (1), which is
   * measured from the page every frame, so it scrolls with the page.
   */
  follow: { book: null as BookId | null, mix: 0 },
};

/** The case-study page's header slot, in CSS pixels, as the page last measured it. */
export const heroRect = { x: 0, y: 0, w: 0, h: 0 };

/**
 * How the camera frames the storyboard on a screen this size, in scene units
 * (the rig uses it; so does the page, to draw scene 1's shelf line before
 * three.js has loaded).
 *
 * The whole storyboard frame fits: on a screen wider than the sketches
 * (1.19:1) the frame's height fills the screen and more shows at the sides;
 * on a narrower one its width fills it. The shelf top stays 88% of the way
 * down, as drawn. `shelfY` is the shelf top's distance from the screen's top,
 * in CSS pixels, snapped to the device's pixels so the line is one crisp row.
 */
export function framing(width: number, height: number, dpr = 1) {
  const aspect = width / Math.max(1, height);
  // Tall enough for the hanging plant, and wide enough that the plant, books, machine and hanger all fit, centred.
  const H = Math.max(CONTENT.minH, (2 * CONTENT.halfW) / aspect);
  // The books (0 to TALLEST high) sit in the middle of the screen, top to bottom.
  const bottom = TALLEST / 2 - H / 2;
  const top = bottom + H;
  const halfW = (H / 2) * aspect;
  const shelfY = Math.round(((top / H) * height) * dpr) / dpr;
  return { H, top, bottom, halfW, shelfY, band: height - shelfY };
}

/* ---------- Poses for each moment ---------- */

export const homePose = (id: BookId) => fromPose(homePoses()[id]);
export const spinePose = (id: BookId) => fromPose(POSES.intro[id]);

/** Frame 5 (and 15, 24): the book pulled forward, the others spine-out at its sides. */
export function focusPoses(id: BookId): Record<BookId, BookPose> {
  const l = sceneFor({ mode: "open", book: id });
  return Object.fromEntries(BOOKS.map((b) => [b, fromPose(l.books[b])])) as Record<BookId, BookPose>;
}
export function focusDecor(id: BookId) {
  const l = sceneFor({ mode: "open", book: id });
  return { plantX: l.plantX, machineX: l.machineX };
}

/** How far forward an open book stands: in front of the white sheet. */
export const OPEN_Z = 1.7;

/**
 * Frame 7: the book open, its spread filling most of the screen, a little
 * above centre to leave room for the pager. Side-bound books put their spine
 * at the middle; the Playground shows one page, centred.
 */
export function openPose(id: BookId): BookPose {
  const { w, h } = BOOK_SIZE[id];
  const W = view.right - view.left;
  const H = view.top - view.bottom;
  // Nearer the camera things look bigger; undo that so the spread fits as measured.
  const near = CAM_D / (CAM_D - OPEN_Z);
  const spreadW = id === "playground" ? w : 2 * w + 0.06;
  const s = Math.min((0.82 * W) / spreadW, (0.7 * H) / h) / near;
  // Open books always sit with the camera home (not panned to the coffee).
  const cx = 0;
  const cy = ((view.top + view.bottom) / 2 + 0.04 * H) / near;
  return {
    x: id === "playground" ? cx : cx + (w / 2) * s,
    y: cy - (h * s) / 2,
    z: OPEN_Z,
    ry: 0,
    rx: 0,
    s,
    cover: 1,
    fold: 0,
  };
}

/** Turns a screen rectangle (CSS px) into the pose that fits the book's spread into it, at the open depth. */
function fitRect(id: BookId, rx: number, ry: number, rw: number, rh: number): BookPose {
  const { w, h } = BOOK_SIZE[id];
  const near = CAM_D / (CAM_D - OPEN_Z);
  const px = view.pxPerUnit;
  const spreadW = id === "playground" ? w : 2 * w + 0.06;
  const s = Math.min(rw / px / near / spreadW, rh / px / near / h);
  // The rectangle's middle, on screen, then back to the book's depth (the camera is home: x = 0).
  const cx = (view.left + (rx + rw / 2) / px) / near;
  const cy = (view.top - (ry + rh / 2) / px) / near;
  return { x: id === "playground" ? cx : cx + (w / 2) * s, y: cy - (h * s) / 2, z: OPEN_Z, ry: 0, rx: 0, s, cover: 1, fold: 0 };
}

/** Frame 8: the spread fitted into the case study's header. */
export function heroPose(id: BookId): BookPose {
  return fitRect(id, heroRect.x, heroRect.y, heroRect.w, heroRect.h);
}

/** Frame 18: the Playground page zoomed to fill the screen, just before the grid takes over. */
export function zoomPose(id: BookId): BookPose {
  const W = (view.right - view.left) * view.pxPerUnit;
  const H = (view.top - view.bottom) * view.pxPerUnit;
  return fitRect(id, -W * 0.04, -H * 0.04, W * 1.08, H * 1.08);
}

/**
 * Where a point in the scene lands on screen, in CSS pixels (the rig keeps `view` current): the camera looks
 * straight ahead from far back at the shelf's height, so a point nearer the camera sits further from the middle.
 */
export function toScreen(x: number, y: number, z: number, camX = anim.camX) {
  const near = CAM_D / (CAM_D - z);
  const W = view.right - view.left;
  return { x: ((x - camX) * near + W / 2) * view.pxPerUnit, y: (view.top - y * near) * view.pxPerUnit };
}

/**
 * A clicked book, brought forward and waiting to be opened (frame 7 without the cover open): shut, cover to you, the
 * size the spread will be, standing where it will open (the open book's spine will be at the middle).
 */
export function waitingPose(id: BookId): BookPose {
  const o = openPose(id);
  const { w, h } = BOOK_SIZE[id];
  const near = CAM_D / (CAM_D - OPEN_Z);
  const px = view.pxPerUnit;
  // The shut book stands clear above the menu bar (not behind it): its foot a little over the bar, its top a margin from the screen's top.
  const H = (view.top - view.bottom) * px;
  const f = typeof window !== "undefined" ? framing(window.innerWidth, window.innerHeight, 1) : { band: 80 };
  const foot = H - (f.band / 2 + 26 + 22);
  const sH = (foot - 30) / (h * near * px);
  const sW = (0.7 * (view.right - view.left)) / (w * near);
  const s = Math.min(o.s, sH, sW);
  return { ...o, x: 0, y: (view.top - foot / px) / near, s, cover: 0 };
}
