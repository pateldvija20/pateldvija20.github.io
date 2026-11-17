import gsap from "gsap";
import { anim, BOOKS, ENTERING, focusDecor, focusPoses, homePose, openPose, waitingPose, spinePose, toScreen, zoomPose, type BookPose, type Clickable, type Entering } from "./anim";
import { PAGE_COUNT } from "./pages";
import { WOBBLE_CALM, wobble } from "./physics";
import { BOOK_SIZE, COFFEE_PAN, CUP, MACHINE_X, MACHINE_Z, PLANT_X, homePoses, view, type BookId } from "./layout";

/**
 * The opening plays scenes 1 and 2 and holds there (the user, 15 Nov: "let's
 * first implement scene 1 and 2"). Set this to true and it plays on into
 * scenes 3 and 4: the drawings turn 3D, the books turn covers-out, the logo
 * and menu arrive, coffee fills the cup.
 */
export const PLAY_PAST_SCENE_2 = true;

/** How far the hanging planter is pulled up (scene units) to be out of the screen while a book is forward. */
const HANGER_UP = 2.2;

/** Scene 1: the empty page and the shelf line hold this long (s) once the scene is ready, before anything moves. */
const SCENE_1_HOLD = 0;

/**
 * Scene 2: when each thing sets off after scene 1 (s), left to right, so they
 * arrive as a procession: the plant leads, the books follow close behind
 * each other, then the machine (the cup rides on its drip tray), and the
 * hanging plant swings in last along the top.
 */
const ENTRANCE: Record<Entering, number> = { plant: 0, playground: 0.08, work: 0.16, about: 0.24, machine: 0.32, hanger: 0.4 };

/**
 * The slide (the user, 15 Nov): in fast from off the right and skidding to a
 * dead stop on its mark: the foot never overshoots. Only the top does: each
 * object's jelly (StoryScene) leans back about 15° while it moves, whips
 * about 10° past upright as the foot stops, and wobbles 2 to 3 times.
 */
const SLIDE = {
  duration: 0.6,
  // Half cruise, half braking: the foot is still moving at full tilt when it reaches its mark, so it stops dead (a skid)
  // and the jelly's top whips past upright.
  ease: (t: number) => 0.3 * (1 - (1 - t) ** 3) + 0.7 * t,
};
/** From the first object setting off to the last one's jelly having settled (s). */
const SCENE_2_LENGTH = ENTRANCE.hanger + SLIDE.duration + 1.4;

/**
 * Plays the storyboard's sequences (docs/storyboard-plan.md), one numbered
 * frame after the next, by tweening the numbers in anim.ts:
 *
 *   opening        1 → 2 (→ 3 → 4) shelf line; drawings slide in and wobble upright; (they turn 3D; books turn out, coffee pours)
 *   open a book    5 → 6 → 7       it comes forward, the others step aside; it opens; its spread fills the screen
 *   (Playground)   15 → 16 → 17    it comes forward, tilts back as its cover flips up over the coil
 *   turn a page    7 → 7           a leaf turns over the spine (or up over the coil)
 *   read it        7 → 8 … 11      the spread shrinks into the case study's header and scrolls with it; back out again
 *   see everything 17 → 18 → 19    the Playground page zooms to fill the screen, then the grid takes over; 20 zooms back
 *   close it       12 → 13 → 14    the rest of the pages riffle past, it shuts, faces you, goes back in its place
 *   coffee         30 → 31         books turn spine-out, the camera pans, lid up, pour, lid down, links
 *
 * A new target interrupts whatever is playing: tweens start from wherever
 * things are, so nothing jumps.
 */

/** Inside an open book: the spread itself, the case study it expands into (Work), or the grid (Playground). */
export type Sub = "spread" | "read" | "grid";
export type Target = { mode: "home" } | { mode: "open"; book: BookId; page: number; sub: Sub } | { mode: "coffee" };
export type Ui = { logo: boolean; menu: boolean; open: BookId | null; contact: boolean; read: boolean; grid: boolean; thanks?: boolean };

const CLICKABLE: Clickable[] = ["playground", "work", "about", "cup"];

const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createDirector(onUi: (ui: Partial<Ui>) => void) {
  let current: Target | null = null;
  let tl: gsap.core.Timeline | null = null;
  let introTl: gsap.core.Timeline | null = null;
  /** Resting at the end of scene 2 (PLAY_PAST_SCENE_2 off): the first move away plays scene 3 (the drawings turn 3D) on the way. */
  let holding = false;
  /** A book that's been clicked and stands forward, waiting to be opened (frame 5): a second click opens it. */
  let focusing: BookId | null = null;

  /** Moves every book to its pose in `poses` together. */
  const books = (t: gsap.core.Timeline, poses: Record<BookId, BookPose>, at: gsap.Position, duration: number, ease = "power3.inOut") => {
    BOOKS.forEach((id) => {
      const { cover: _c, ...p } = poses[id];
      t.to(anim.books[id], { ...p, duration, ease }, at);
    });
  };

  /** A page turn in progress gets finished at once, so the next move starts clean. */
  const settlePages = () => {
    for (const id of BOOKS) {
      const p = anim.pages[id];
      // A leaf being dragged, or just let go, is the next turn's to finish.
      if (!p.leaf.on || p.leaf.drag) continue;
      const forward = p.leaf.t > 0.5;
      const to = forward ? p.leaf.back : p.leaf.front;
      p.left = to;
      p.right = id === "playground" ? (forward ? p.right : to) : to;
      p.leaf.on = false;
    }
  };

  /** Frames 14, 23, 29, 33: everything back in its place, covers out. */
  const toHome = (t: gsap.core.Timeline, duration = 0.9) => {
    // Anything a cut-short move left open or folded shuts again on the way.
    BOOKS.forEach((id) => t.to(anim.books[id], { cover: 0, fold: 0, rx: 0, duration: duration * 0.7, ease: "power2.inOut" }, ">"));
    t.to(anim.follow, { mix: 0, duration: duration * 0.5, ease: "power2.inOut" }, "<");
    // The plant and machine step aside a beat before the books turn out, so no cover swings across a drawing.
    t.to(anim, { plantX: PLANT_X.home, machineX: MACHINE_X.home, camX: 0, camZoom: 1, hangerLift: 0, backdrop: 0, duration: duration * 0.85, ease: "power3.inOut" }, ">");
    books(t, Object.fromEntries(BOOKS.map((id) => [id, homePose(id)])) as Record<BookId, BookPose>, "<0.18", duration);
    t.call(() => onUi({ menu: true }));
  };

  /**
   * Frames 12 and 13: out of the case study or grid if it's in one, the rest
   * of the pages riffle past to the end, the book shuts and stands facing you;
   * then (toHome) it goes back.
   */
  const close = (t: gsap.core.Timeline, id: BookId, sub: Sub) => {
    t.call(() => onUi({ open: null, read: false, grid: false }));
    if (sub === "read") t.to(anim.follow, { mix: 0, duration: 0.55, ease: "power3.inOut" }, ">");
    if (sub === "grid") t.to(anim.books[id], { ...strip(openPose(id)), duration: 0.5, ease: "power3.inOut" }, ">");
    // Closing from wherever the book is open (no riffling to the end first): the cover swings shut over the current spread.
    const top = id === "playground";
    const f = focusPoses(id)[id];
    if (top) {
      t.to(anim, { backdrop: 0, duration: 0.45, ease: "power2.out" }, ">");
      t.to(anim.books[id], { rx: -0.35, duration: 0.35, ease: "power2.out" }, "<");
      t.to(anim.books[id], { cover: 0, duration: 0.7, ease: "power2.inOut" }, "<");
      t.to(anim.books[id], { x: f.x, y: f.y, z: f.z, s: f.s, ry: f.ry, duration: 0.7, ease: "power3.inOut" }, "<0.1");
      t.to(anim.books[id], { rx: 0, duration: 0.35, ease: "power2.inOut" }, "<0.35");
    } else {
      // Closed from the back, like any book (16 Nov): the back board and the right-hand pages come over, toward you, from the
      // right onto the left side, on the clear page. The shut book then flips over to its front cover and goes home.
      const bk = anim.books[id];
      const { w } = BOOK_SIZE[id];
      t.call(() => (wobble.k = 0));
      t.to(bk, { fold: 1, duration: 0.75, ease: "power2.inOut" }, ">");
      t.to(anim, { backdrop: 0, duration: 0.5, ease: "power2.inOut" }, ">0.05");
      t.to(bk, { x: f.x + w * f.s, y: f.y, z: f.z, s: f.s, duration: 0.6, ease: "power3.inOut" }, "<");
      // The shut book is now the plain closed model (showing its back, as the folded stack did), so the flip can't show any open-book
      // face (the old rig flashed the right-hand page, with its button, as it turned).
      t.call(() => {
        bk.fold = 0;
        bk.cover = 0;
        bk.x = f.x;
        bk.z = f.z;
        bk.ry = f.ry + Math.PI;
      });
      t.to(bk, { ry: f.ry + Math.PI * 2, duration: 0.55, ease: "power2.inOut" }, ">0.02");
      t.call(() => {
        bk.fold = 0;
        bk.cover = 0;
        bk.ry = f.ry;
        bk.x = f.x;
        bk.z = f.z;
        wobble.k = WOBBLE_CALM;
      });
    }
    t.call(() => {
      anim.pages[id].left = 0;
      anim.pages[id].right = 0;
    });
  };

  /** Frames 5 to 7 (15 to 17 for the Playground). */
  const open = (t: gsap.core.Timeline, id: BookId, page: number, fromFocus = false) => {
    t.call(() => {
      // About keeps the home bar (it has no pages to show circles for); the others get their own bar.
      onUi({ menu: id === "about", open: null, contact: false });
      anim.pages[id].left = page;
      anim.pages[id].right = page;
      anim.pages[id].leaf.on = false;
    });
    // 5: it comes forward; the other two turn spine-out and step aside; the plant and machine move out
    // (all of that has already happened if the book was clicked first and is waiting: see focus()).
    if (!fromFocus) {
      books(t, focusPoses(id), ">", 0.75);
      t.to(anim, { ...focusDecor(id), hangerLift: HANGER_UP, duration: 0.75, ease: "power3.inOut" }, "<");
    }
    const o = openPose(id);
    const { cover: _c, ...pose } = o;
    if (id === "playground") {
      // 16: it tilts back as the cover flips up and over the coil; 17: it straightens, page facing you.
      t.to(anim.books[id], { rx: -0.4, duration: 0.45, ease: "power2.inOut" }, ">-0.05");
      t.to(anim.books[id], { cover: 1, duration: 0.95, ease: "power2.inOut" }, "<0.15");
      t.to(anim.books[id], { ...pose, duration: 0.85, ease: "power3.inOut" }, "<0.5");
      t.to(anim, { backdrop: 1, duration: 0.5, ease: "power2.inOut" }, "<0.2");
    } else {
      // 6: it opens; 7: the spread grows to fill the screen.
      t.to(anim.books[id], { cover: 1, duration: 0.85, ease: "power2.inOut" }, ">-0.05");
      t.to(anim.books[id], { ...pose, duration: 0.9, ease: "power3.inOut" }, "<0.2");
      t.to(anim, { backdrop: 1, duration: 0.5, ease: "power2.inOut" }, "<0.25");
    }
    t.call(() => onUi({ open: id }));
  };

  /** Within an open book: one leaf turns, forwards or back. Quick turns are the riffle. */
  const turn = (t: gsap.core.Timeline, id: BookId, from: number, to: number, duration = 0.7) => {
    const p = anim.pages[id];
    const forward = to > from;
    // Let go of after a drag: carry on from where the hand left it.
    const dragged = p.leaf.on && p.leaf.drag && (forward ? p.leaf.front === from && p.leaf.back === to : p.leaf.front === to && p.leaf.back === from);
    if (dragged) {
      t.to(p.leaf, { t: forward ? 1 : 0, duration: 0.45 * (forward ? 1 - p.leaf.t : p.leaf.t) + 0.1, ease: "power2.out" });
      t.call(() => {
        p.left = to;
        p.right = to;
        p.leaf.on = false;
        p.leaf.drag = false;
      });
      return;
    }
    t.call(() => {
      if (forward) p.right = to;
      else if (id !== "playground") p.left = to;
      // In place: the tween below holds this same object.
      Object.assign(p.leaf, { on: true, front: forward ? from : to, back: forward ? to : from, t: forward ? 0 : 1, fwd: forward });
    });
    // fromTo, so it starts from the side set just above, not from wherever the leaf last was.
    t.fromTo(p.leaf, { t: forward ? 0 : 1 }, { t: forward ? 1 : 0, duration, ease: duration < 0.4 ? "power1.inOut" : "power2.inOut", immediateRender: false });
    t.call(() => {
      p.left = to;
      p.right = to;
      p.leaf.on = false;
    });
  };

  /** Within an open book: into or out of the case study (8 and 11) or the grid (18 to 20). */
  const sub = (t: gsap.core.Timeline, id: BookId, from: Sub, to: Sub) => {
    if (from === to) return;
    if (from === "read") {
      // 10 and 11: the page goes, the book grows back out of the header into the full spread.
      t.call(() => onUi({ read: false }));
      t.to(anim.follow, { mix: 0, duration: 0.85, ease: "power3.inOut" }, ">");
    }
    if (from === "grid") {
      // 20: the grid goes and the page zooms back out.
      t.call(() => onUi({ grid: false }));
      t.to(anim.books[id], { ...strip(openPose(id)), duration: 0.75, ease: "power3.inOut" }, ">0.1");
    }
    if (to === "spread") {
      t.call(() => onUi({ open: id }));
      return;
    }
    t.call(() => onUi({ open: null }));
    if (to === "read") {
      // 8: the spread shrinks up into the case study's header while the page arrives around it.
      t.call(() => {
        anim.follow.book = id;
      });
      t.to(anim.follow, { mix: 1, duration: 0.9, ease: "power3.inOut" }, ">");
      // The page arrives once the book is mostly in place, so its text doesn't run under the shrinking spread.
      t.call(() => onUi({ read: true }), [], "<0.6");
    } else {
      // 18: the page zooms to fill the screen; 19: the grid takes its place.
      t.to(anim.books[id], { ...strip(zoomPose(id)), duration: 0.8, ease: "power3.inOut" }, ">");
      t.call(() => onUi({ grid: true }), [], ">-0.15");
    }
  };

  /**
   * Frames 30 and 31, as reworked (16 Nov): the cup is clicked and the scene slides so the machine is centred and zoomed in;
   * everything else stays put. The lid stays off beside the cup; nothing pours until the message is sent (celebrate).
   */
  const coffee = (t: gsap.core.Timeline) => {
    t.call(() => onUi({ menu: true, contact: false, thanks: false }));
    // Only the camera moves (16 Nov): it slides across and zooms in on the machine, centred; everything else stays where it
    // is, so the plant, the books and the planter are cut off by the frame.
    // (Reached from anywhere else, e.g. a deep link, everything first settles at its home place.)
    books(t, Object.fromEntries(BOOKS.map((id) => [id, homePose(id)])) as Record<BookId, BookPose>, ">", 0.4);
    t.to(anim, { plantX: PLANT_X.home, machineX: MACHINE_X.home, hangerLift: 0, backdrop: 0, duration: 0.4, ease: "power2.inOut" }, "<");
    BOOKS.forEach((id) => t.to(anim.books[id], { cover: 0, fold: 0, rx: 0, duration: 0.4, ease: "power2.inOut" }, "<"));
    t.to(anim, { camX: MACHINE_X.home, camZoom: 1.7, duration: 1.1, ease: "power3.inOut" }, "<");
    t.call(() => onUi({ contact: true }), [], ">-0.15");
  };

  /** The lid lifts, coffee pours from the group head, the lid drops back on (frames 4 and 31). */
  const pourCoffee = (t: gsap.core.Timeline, at: gsap.Position) => {
    t.to(anim, { lid: 1, duration: 0.35, ease: "power2.out" }, at);
    t.to(anim, { pour: 1, duration: 0.25, ease: "power1.in" }, ">");
    t.to(anim, { pour: 0, duration: 0.3, ease: "power1.out" }, ">0.7");
    t.to(anim, { lid: 0, duration: 0.45, ease: "bounce.out" }, ">-0.05");
  };

  /** A pose without its cover, for tweening a book's place and size only. */
  const strip = (p: BookPose) => {
    const { cover: _c, ...rest } = p;
    return rest;
  };

  function begin() {
    // Interrupting the load sequence lands it first, so nothing is left half drawn.
    if (tl && tl === introTl && tl.isActive()) tl.progress(1);
    settlePages();
    tl?.kill();
    tl = gsap.timeline();
    if (reduced) tl.timeScale(20);
    return tl;
  }

  /** Scene 2's state at rest: everything on the shelf, spine-out, drawn; no interface yet. */
  const restAtScene2 = () => {
    ENTERING.forEach((k) => (anim.enter[k] = 0));
    anim.enter.books = 0;
    BOOKS.forEach((id) => Object.assign(anim.books[id], spinePose(id)));
    Object.assign(anim, { plantX: PLANT_X.intro, machineX: MACHINE_X.intro, camX: 0, camZoom: 1, drawn: 1, backdrop: 0, lid: 0, lidAside: 1, pour: 0, fill: 0, tip: 0, spillRun: 0, cupFocus: 0, ink: 0, inkName: "", hangerLift: 0 });
    CLICKABLE.forEach((c) => (anim.drawnBy[c] = 1));
    Object.assign(anim.reveal, { show: 0, on: null });
    Object.assign(anim.cursor, { show: 0, press: 0 });
    onUi({ logo: false, menu: false, open: null, contact: false, read: false, grid: false });
  };

  /**
   * Scenes 3 and 4 (frames 3 and 4), from scene 2's rest (the user, 16 Nov): the books flip to face you; a cursor
   * comes in and clicks the Experiment and Work books, which turn 3D; it drags a frame round the About book, and the
   * book shows in 3D inside it; then a frame round the cup (its lid set down beside it), which shows in 3D. That's
   * the end of the loading: the menu bar arrives. No logo for now.
   */
  const scenes3and4 = (t: gsap.core.Timeline, at: number) => {
    const homes = homePoses();
    const px = (id: BookId, fx: number, fy: number, dz = 0) => {
      const { w, h, t: th } = BOOK_SIZE[id];
      const p = homes[id];
      return toScreen(p.x + fx * w, fy * h, p.z + th / 2 + dz);
    };
    // Quicker and overlapped (16 Nov): each move sets off while the last click's colour is still coming in,
    // and the clicks and drags are brisk.
    const move = (to: { x: number; y: number }, dur: number, pos: gsap.Position = ">") => t.to(anim.cursor, { x: to.x, y: to.y, duration: dur, ease: "power2.inOut" }, pos);
    const press = (pos: gsap.Position = ">") => {
      t.to(anim.cursor, { press: 1, duration: 0.05, ease: "power1.out" }, pos);
      t.to(anim.cursor, { press: 0, duration: 0.1, ease: "power1.out" }, ">0.02");
    };
    const toColor = (ch: Clickable, dur = 0.35) => t.to(anim.drawnBy, { [ch]: 0, duration: dur, ease: "power2.out" }, "<0.04");

    // The cursor slides in from the right while the books flip to face you and the plant and machine step aside.
    const enterFrom = toScreen(view.right - 0.25, 0.7, 0.3);
    t.set(anim.cursor, { x: enterFrom.x, y: enterFrom.y }, at);
    t.to(anim.cursor, { show: 1, duration: 0.15 }, at);
    t.to(anim, { plantX: PLANT_X.home, machineX: MACHINE_X.home, duration: 0.65, ease: "power3.inOut" }, at + 0.02);
    books(t, Object.fromEntries(BOOKS.map((id) => [id, homePose(id)])) as Record<BookId, BookPose>, at + 0.08, 0.75);

    // Click the Experiment book, then Work: each turns 3D. The cursor is already on its way as the books land.
    move(px("playground", 0.05, 0.93, 0.0), 0.4, at + 0.5);
    press();
    toColor("playground");
    move(px("work", 0.0, 0.8), 0.3, "<0.1");
    press();
    toColor("work");

    // Drag a frame round the About book, from its top right to its bottom left.
    const a0 = px("about", 0.5, 1.0, 0.0);
    const a1 = px("about", -0.5, 0.0, 0.0);
    const m = 14;
    move({ x: a0.x + m, y: a0.y - m }, 0.3, "<0.1");
    t.call(() => {
      Object.assign(anim.reveal, { x0: a0.x + m, y0: a0.y - m, x1: a0.x + m, y1: a0.y - m, on: "about", show: 1 });
    });
    t.to(anim.cursor, { press: 1, duration: 0.05 }, ">");
    t.to(anim.cursor, { x: a1.x - m, y: a1.y + m, duration: 0.55, ease: "power2.inOut" }, ">");
    t.to(anim.reveal, { x1: a1.x - m, y1: a1.y + m, duration: 0.55, ease: "power2.inOut" }, "<");
    t.to(anim.cursor, { press: 0, duration: 0.08 }, ">");
    t.set(anim.drawnBy, { about: 0 }, ">");
    t.to(anim.reveal, { show: 0, duration: 0.22 }, ">0.05");

    // Then a frame round the cup, from its top left to its bottom right (the lid beside it comes along).
    const machineX = MACHINE_X.home;
    const cx = machineX - 0.138;
    const cz = MACHINE_Z + CUP.z;
    // Clear air all round the cup (and the lid beside it): the frame's edges and corner squares never touch the glass.
    const c0 = toScreen(cx - 0.3, CUP.y + 0.52, cz);
    const c1 = toScreen(cx + 0.64, CUP.y - 0.1, cz);
    move({ x: c0.x, y: c0.y }, 0.34, "<0.05");
    t.call(() => {
      Object.assign(anim.reveal, { x0: c0.x, y0: c0.y, x1: c0.x, y1: c0.y, on: "cup", show: 1 });
    });
    t.to(anim.cursor, { press: 1, duration: 0.05 }, ">");
    t.to(anim.cursor, { x: c1.x, y: c1.y, duration: 0.6, ease: "power2.inOut" }, ">");
    t.to(anim.reveal, { x1: c1.x, y1: c1.y, duration: 0.6, ease: "power2.inOut" }, "<");
    t.to(anim.cursor, { press: 0, duration: 0.08 }, ">");
    t.set(anim.drawnBy, { cup: 0 }, ">");
    t.to(anim.reveal, { show: 0, duration: 0.22 }, ">0.05");
    t.call(() => {
      anim.reveal.on = null;
    });

    // The cursor leaves as the menu bar arrives, and the opening is over.
    t.to(anim.cursor, { show: 0, x: c1.x + 90, y: c1.y + 60, duration: 0.3, ease: "power2.in" }, ">0.02");
    t.call(() => {
      onUi({ menu: true, logo: false });
      anim.par.on = true;
    }, [], "<0.05");
  };

  return {
    /**
     * The opening, on a first visit to home. Scene 1: the empty page and the
     * shelf line (the page has drawn it while the scene loaded). Scene 2: the
     * objects, still line drawings, slide in from the right one after
     * another, overshoot, and wobble upright (their jelly does the bending).
     * Then it holds there, or plays on into scenes 3 and 4 if
     * PLAY_PAST_SCENE_2 is on.
     */
    intro(subtle = false) {
      const t = begin();
      // A later load in the same tab: the same slide, a gentle wobble.
      wobble.k = subtle ? 0.3 : 1;
      t.call(() => (wobble.k = WOBBLE_CALM), [], SCENE_1_HOLD + SCENE_2_LENGTH);
      introTl = t;
      restAtScene2();
      // The camera holds still while the opening plays (its cursor and frames are placed on the unleaned view).
      anim.par.on = false;
      // Everything starts just past the screen's right edge, the same distance out, so they come in as a procession.
      const far = view.right - view.left + 0.4;
      ENTERING.forEach((k) => (anim.enter[k] = far));
      if (import.meta.env.DEV) (window as unknown as { __openingAt: number }).__openingAt = performance.now();
      ENTERING.forEach((k) => t.to(anim.enter, { [k]: 0, ...SLIDE }, SCENE_1_HOLD + ENTRANCE[k]));
      if (PLAY_PAST_SCENE_2) {
        // Starts as the last things are landing, while their wobble is still dying down.
        scenes3and4(t, SCENE_1_HOLD + ENTRANCE.hanger + SLIDE.duration + 0.1);
        current = { mode: "home" };
      } else {
        holding = true;
        current = { mode: "home" };
      }
    },

    /**
     * Later loads in a tab (16 Nov): no opening. Everything is already home and in colour, and slides in from the right one after
     * another, as the objects do when a book goes back to its place.
     */
    slideIn() {
      const t = begin();
      ENTERING.forEach((k) => (anim.enter[k] = 0));
      anim.enter.books = 0;
      BOOKS.forEach((id) => Object.assign(anim.books[id], homePose(id)));
      Object.assign(anim, { plantX: PLANT_X.home, machineX: MACHINE_X.home, camX: 0, camZoom: 1, drawn: 0, backdrop: 0, lid: 0, lidAside: 1, pour: 0, fill: 0, tip: 0, spillRun: 0, cupFocus: 0, ink: 0, inkName: "", hangerLift: 0 });
      CLICKABLE.forEach((c) => (anim.drawnBy[c] = 0));
      Object.assign(anim.reveal, { show: 0, on: null });
      Object.assign(anim.cursor, { show: 0, press: 0 });
      const far = view.right - view.left + 0.4;
      ENTERING.forEach((k) => (anim.enter[k] = far));
      wobble.k = WOBBLE_CALM;
      ENTERING.forEach((k) => t.to(anim.enter, { [k]: 0, ...SLIDE }, ENTRANCE[k]));
      t.call(() => onUi({ menu: true }), [], ENTRANCE.hanger + SLIDE.duration * 0.6);
      current = { mode: "home" };
    },

    /** Straight to the end of the opening, no motion: later visits, and reduced motion. */
    rest() {
      const t = begin();
      restAtScene2();
      if (PLAY_PAST_SCENE_2) {
        scenes3and4(t, 0);
        t.progress(1);
      } else holding = true;
      current = { mode: "home" };
    },

    /**
     * A book is clicked (frame 5): it hops up over the books in front of it, comes forward to the middle and waits
     * to be opened (a second click). Meanwhile the other two turn spine-out and step aside, the plant and machine
     * move out, and the hanging planter is pulled up.
     */
    focus(id: BookId) {
      if (focusing === id) return;
      const t = begin();
      onUi({ contact: false, open: null });
      if (focusing && focusing !== id) toHome(t, 0.6);
      focusing = id;
      current = { mode: "home" };
      const f = focusPoses(id);
      const homes = homePoses();
      // Up to just clear of the tallest book standing in front of it (or a small hop if none does).
      const front = BOOKS.filter((b) => b !== id && homes[b].z > homes[id].z).map((b) => BOOK_SIZE[b].h);
      // Never so high that the book's top leaves the screen (audit F7): its top stays a little under the screen's top edge.
      const room = Math.max(0.1, view.top - 0.08 - BOOK_SIZE[id].h * Math.max(anim.books[id].s, f[id].s));
      const rise = Math.min(front.length ? Math.max(...front) + 0.06 : 0.14, room);
      const mine = f[id];
      const { cover: _c, ...fp } = mine;
      const big = waitingPose(id);
      const { cover: _w, ...bp } = big;
      const edge = (view.right - view.left) / 2;

      // 1. The book lifts straight up, travels forward and across while high (so it never cuts through the books in
      //    front of it), and lands at the front.
      t.to(anim.books[id], { y: rise, duration: 0.3, ease: "power2.out" }, ">");
      t.to(anim.books[id], { x: fp.x, z: fp.z, ry: fp.ry, rx: 0, s: fp.s, duration: 0.5, ease: "power2.inOut" }, ">-0.02");
      t.to(anim.books[id], { y: fp.y, duration: 0.28, ease: "power2.in" }, ">-0.08");
      // 2. The other two swivel spine-out and step out to the book's sides, where you can see them turn.
      const others = BOOKS.filter((b) => b !== id);
      others.forEach((b, i) => t.to(anim.books[b], { ry: Math.PI / 2, x: f[b].x, z: f[b].z, duration: 0.45, ease: "power2.inOut" }, i ? "<" : ">-0.1"));
      // 3. They slide out past the screen's edges, with the plant, the machine and the planter, as the book grows to
      //    its waiting size (shut, cover to you, the spread's size).
      others.forEach((b, i) => {
        const side = f[b].x < 0 ? -1 : 1;
        t.to(anim.books[b], { x: side * (edge + 0.5), duration: 0.6, ease: "power3.in" }, i ? "<" : ">0.02");
      });
      t.to(anim, { plantX: -(edge + 1.2), machineX: edge + 1.4, hangerLift: HANGER_UP, duration: 0.65, ease: "power3.in" }, "<");
      t.to(anim.books[id], { x: bp.x, y: bp.y, z: bp.z, s: bp.s, ry: bp.ry, duration: 0.7, ease: "power3.inOut" }, "<0.05");
      // 4. Last, the shelf line and what's left behind fade away to the plain page.
      t.to(anim, { backdrop: 1, duration: 0.4, ease: "power2.inOut" }, ">-0.25");
    },

    /**
     * The message has been sent (16 Nov): the coffee pours and fills the cup; the cup comes to the middle of the screen and
     * grows over the scene; the guest's first name is written on the orange sleeve in marker, the ink flowing on as if
     * being written (no marker shown); then the thank-you appears.
     */
    celebrate(name: string) {
      if (current?.mode !== "coffee") return;
      const t = begin();
      current = { mode: "coffee" };
      onUi({ contact: false, thanks: false });
      const who = name.trim().split(/\s+/)[0].slice(0, 14);
      t.to(anim, { tip: 0, duration: 0.01 }, ">");
      // The cup goes back to the machine first (if it's at the middle), is filled there, and comes forward again.
      if (anim.cupFocus > 0.01) t.to(anim, { cupFocus: 0, duration: 0.8, ease: "power3.inOut" }, ">");
      if (anim.fill < 0.99) {
        t.call(() => {
          anim.ink = 0;
          anim.inkName = "";
        });
        t.to(anim, { pour: 1, duration: 0.4, ease: "power1.in" }, ">0.1");
        t.to(anim, { fill: 1, duration: 2.0, ease: "power1.inOut" }, "<0.25");
        t.to(anim, { pour: 0, duration: 0.5, ease: "power1.out" }, ">-0.4");
      }
      // The cup comes to the middle and grows.
      t.to(anim, { cupFocus: 1, duration: 1.0, ease: "power3.inOut" }, ">0.15");
      // The name, written as pen strokes (the handwriting face is loaded first): slow at the start, quicker as it goes.
      t.call(() => {
        void document.fonts?.load('700 64px "Caveat"');
        anim.inkName = who;
      }, [], ">0.1");
      t.to(anim, { ink: 1, duration: 0.9 + who.length * 0.55, ease: (x: number) => 0.3 * x + 0.7 * x * x }, ">");
      t.call(() => onUi({ thanks: true }), [], ">0.2");
    },

    /** The cup is clicked in the coffee view: it comes to the middle and grows, to ask the guest's name. */
    chat() {
      if (current?.mode !== "coffee") return;
      const t = begin();
      current = { mode: "coffee" };
      onUi({ contact: false, thanks: false });
      t.to(anim, { cupFocus: 1, duration: 1.0, ease: "power3.inOut" }, ">");
    },

    /** Sending failed: the cup fills a little, is knocked over on the tray and the coffee spills. */
    spill() {
      if (current?.mode !== "coffee") return;
      const t = begin();
      current = { mode: "coffee" };
      onUi({ contact: false, thanks: false });
      t.to(anim, { cupFocus: 0, duration: 0.5, ease: "power2.inOut" }, ">");
      t.to(anim, { fill: 0.8, duration: 0.5, ease: "power1.out" }, "<");
      t.to(anim, { tip: 1, duration: 0.7, ease: "back.in(1.2)" }, ">0.1");
      // The coffee keeps coming: over the tray's edge and down the machine.
      t.to(anim, { spillRun: 1, duration: 2.6, ease: "power1.inOut" }, ">-0.2");
    },

    /** Try again: the cup is stood up and the spill is gone. */
    unspill() {
      if (current?.mode !== "coffee") return;
      const t = begin();
      current = { mode: "coffee" };
      t.to(anim, { tip: 0, spillRun: 0, duration: 0.6, ease: "power2.inOut" }, ">");
      t.to(anim, { fill: 0, duration: 0.2 }, "<0.3");
      t.call(() => onUi({ contact: true }), [], ">-0.1");
    },

    /** Back from the enlarged cup to the machine (the coffee stays poured and the name stays written). */
    uncelebrate() {
      if (current?.mode !== "coffee") return;
      const t = begin();
      current = { mode: "coffee" };
      onUi({ thanks: false });
      t.to(anim, { cupFocus: 0, duration: 0.9, ease: "power3.inOut" }, ">");
      t.call(() => onUi({ contact: true }), [], ">-0.2");
    },

    /** Runs `cb` when whatever is playing has finished (at once if nothing is). */
    afterMove(cb: () => void) {
      if (tl && tl.totalDuration() > 0 && tl.progress() < 1) tl.call(cb, [], ">");
      else cb();
    },

    /** Skips whatever is playing to its end. */
    finish() {
      tl?.progress(1);
    },

    go(target: Target, { instant = false } = {}) {
      const cur = current;
      if (cur && JSON.stringify(cur) === JSON.stringify(target) && !focusing) return;
      const sameBook = cur?.mode === "open" && target.mode === "open" && cur.book === target.book;
      // Turning a page while the book is still opening: let it finish opening first.
      if (sameBook && tl?.isActive()) tl.progress(1);
      const t = begin();
      const waiting = focusing;
      focusing = null;
      if (holding || anim.drawn > 0) {
        // Leaving scene 2's rest (or a first paint straight to a deep link): the drawings turn 3D on the way.
        holding = false;
        t.to(anim.drawnBy, { playground: 0, work: 0, about: 0, cup: 0, duration: 0.6, ease: "power2.inOut" }, 0);
        t.call(() => {
          Object.assign(anim.reveal, { show: 0, on: null });
          anim.cursor.show = 0;
        }, [], 0);
      }
      if (sameBook && cur?.mode === "open" && target.mode === "open") {
        // Out of the case study onto a spread: the book grows back out of the page first, then (for another case) flips to its spread.
        if (cur.sub === "read" && target.sub !== "read") sub(t, target.book, cur.sub, target.sub);
        const from = anim.pages[target.book].right;
        const pg = anim.pages[target.book];
        // A page the hand has dragged past the middle and let go: carry it on over from where it was let go. (The drag
        // has already set the page numbers, so there is nothing for turn() to compare.)
        if (pg.leaf.on && pg.leaf.drag && (pg.leaf.back === target.page || pg.leaf.front === target.page)) {
          const fwd = pg.leaf.back === target.page;
          t.to(pg.leaf, { t: fwd ? 1 : 0, duration: 0.45 * (fwd ? 1 - pg.leaf.t : pg.leaf.t) + 0.12, ease: "power2.out" });
          t.call(() => {
            pg.left = target.page;
            pg.right = target.page;
            pg.leaf.on = false;
            pg.leaf.drag = false;
          });
        } else if (from !== target.page) turn(t, target.book, from, target.page);
        if (!(cur.sub === "read" && target.sub !== "read")) sub(t, target.book, cur.sub, target.sub);
      } else {
        // A move that has to put one thing away before showing the next plays the putting-away part faster: it is only the
        // way out, so the visitor isn't made to sit through two full sequences back to back.
        const chained = target.mode === "open" && ((cur && cur.mode !== "home") || (waiting && waiting !== target.book));
        const homeFromBook = target.mode === "home" && cur?.mode === "open";
        const pre = chained || homeFromBook ? gsap.timeline() : t;
        if (cur?.mode === "open") close(pre, cur.book, cur.sub);
        if (cur?.mode === "coffee") {
          pre.call(() => onUi({ contact: false, thanks: false }));
          pre.to(anim, { pour: 0, cupFocus: 0, tip: 0, spillRun: 0, duration: 0.3, ease: "power2.inOut" }, ">");
          pre.call(() => {
            anim.fill = 0;
            anim.ink = 0;
            anim.inkName = "";
          });
        }
        if (target.mode === "home") {
          toHome(pre);
          if (pre !== t) {
            pre.timeScale(1.4);
            t.add(pre, ">");
          }
        } else if (target.mode === "coffee") {
          coffee(t);
        } else {
          // Coming from another book or the coffee: back to the shelf first (frames 13, 14, 32, 33).
          if (chained) {
            toHome(pre, 0.75);
            pre.timeScale(1.8);
            t.add(pre, ">");
          }
          open(t, target.book, target.page, waiting === target.book);
          sub(t, target.book, "spread", target.sub);
        }
      }
      if (!cur) {
        // First paint on a deep link: no sequence, just be there.
        if (target.mode !== "open") onUi({ menu: true });
      }
      current = target;
      if (import.meta.env.DEV) (window as unknown as { __lastMove?: unknown }).__lastMove = { from: JSON.stringify(cur), to: JSON.stringify(target), seconds: +t.totalDuration().toFixed(2) };
      if (instant) t.progress(1);
    },
  };
}

export type Director = ReturnType<typeof createDirector>;
