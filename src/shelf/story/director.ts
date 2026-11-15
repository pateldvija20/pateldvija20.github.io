import gsap from "gsap";
import { anim, BOOKS, ENTERING, focusDecor, focusPoses, homePose, openPose, spinePose, zoomPose, type BookPose, type Entering } from "./anim";
import { PAGE_COUNT } from "./pages";
import { COFFEE_PAN, MACHINE_X, PLANT_X, view, type BookId } from "./layout";

/**
 * The opening plays scenes 1 and 2 and holds there (the user, 15 Nov: "let's
 * first implement scene 1 and 2"). Set this to true and it plays on into
 * scenes 3 and 4: the drawings turn 3D, the books turn covers-out, the logo
 * and menu arrive, coffee fills the cup.
 */
export const PLAY_PAST_SCENE_2 = false;

/** Scene 1: the empty page and the shelf line hold this long (s) once the scene is ready, before anything moves. */
const SCENE_1_HOLD = 0;

/**
 * Scene 2: when each thing sets off after scene 1 (s), left to right, so they
 * arrive as a procession: the plant leads, the books follow close behind
 * each other, then the machine (the cup rides on its drip tray), and the
 * hanging plant swings in last along the top.
 */
const ENTRANCE: Record<Entering, number> = { plant: 0, playground: 0.12, work: 0.24, about: 0.36, machine: 0.48, hanger: 0.6 };

/**
 * The slide (the user, 15 Nov): in fast from off the right and skidding to a
 * dead stop on its mark: the foot never overshoots. Only the top does: each
 * object's jelly (StoryScene) leans back about 15° while it moves, whips
 * about 10° past upright as the foot stops, and wobbles 2 to 3 times.
 */
const SLIDE = {
  duration: 0.85,
  // Half cruise, half braking: the foot is still moving at full tilt when it reaches its mark, so it stops dead (a skid)
  // and the jelly's top whips past upright.
  ease: (t: number) => 0.5 * (1 - (1 - t) ** 3) + 0.5 * t,
};
/** From the first object setting off to the last one's jelly having settled (s). */
const SCENE_2_LENGTH = ENTRANCE.hanger + SLIDE.duration + 0.9;

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
export type Ui = { logo: boolean; menu: boolean; open: BookId | null; contact: boolean; read: boolean; grid: boolean };

const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createDirector(onUi: (ui: Partial<Ui>) => void) {
  let current: Target | null = null;
  let tl: gsap.core.Timeline | null = null;
  let introTl: gsap.core.Timeline | null = null;
  /** Resting at the end of scene 2 (PLAY_PAST_SCENE_2 off): the first move away plays scene 3 (the drawings turn 3D) on the way. */
  let holding = false;

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
    // The plant and machine step aside a beat before the books turn out, so no cover swings across a drawing.
    t.to(anim, { plantX: PLANT_X.home, machineX: MACHINE_X.home, camX: 0, duration: duration * 0.85, ease: "power3.inOut" }, ">");
    books(t, Object.fromEntries(BOOKS.map((id) => [id, homePose(id)])) as Record<BookId, BookPose>, "<0.18", duration);
    t.call(() => onUi({ menu: true, logo: true }));
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
    const last = PAGE_COUNT[id] - 1;
    const from = anim.pages[id].right;
    for (let k = from; k < last; k++) turn(t, id, k, k + 1, 0.2);
    const top = id === "playground";
    t.to(anim, { backdrop: 0, duration: 0.45, ease: "power2.out" }, ">");
    if (top) t.to(anim.books[id], { rx: -0.35, duration: 0.35, ease: "power2.out" }, "<");
    t.to(anim.books[id], { cover: 0, duration: 0.7, ease: "power2.inOut" }, "<");
    const f = focusPoses(id)[id];
    t.to(anim.books[id], { x: f.x, y: f.y, z: f.z, s: f.s, ry: f.ry, duration: 0.7, ease: "power3.inOut" }, "<0.1");
    if (top) t.to(anim.books[id], { rx: 0, duration: 0.35, ease: "power2.inOut" }, "<0.35");
    t.call(() => {
      anim.pages[id].left = 0;
      anim.pages[id].right = 0;
    });
  };

  /** Frames 5 to 7 (15 to 17 for the Playground). */
  const open = (t: gsap.core.Timeline, id: BookId, page: number) => {
    t.call(() => {
      onUi({ menu: false, open: null, contact: false });
      anim.pages[id].left = page;
      anim.pages[id].right = page;
      anim.pages[id].leaf.on = false;
    });
    // 5: it comes forward; the other two turn spine-out and step aside; the plant and machine move out.
    books(t, focusPoses(id), ">", 0.75);
    t.to(anim, { ...focusDecor(id), duration: 0.75, ease: "power3.inOut" }, "<");
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
      Object.assign(p.leaf, { on: true, front: forward ? from : to, back: forward ? to : from, t: forward ? 0 : 1 });
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

  /** Frames 30 and 31. */
  const coffee = (t: gsap.core.Timeline) => {
    t.call(() => onUi({ menu: true, logo: true, contact: false }));
    books(t, Object.fromEntries(BOOKS.map((id) => [id, spinePose(id)])) as Record<BookId, BookPose>, ">", 1.0);
    t.to(anim, { plantX: PLANT_X.intro, machineX: MACHINE_X.intro, camX: COFFEE_PAN, duration: 1.0, ease: "power3.inOut" }, "<");
    pourCoffee(t, ">-0.1");
    t.call(() => onUi({ contact: true }), [], "<1.0");
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
    Object.assign(anim, { plantX: PLANT_X.intro, machineX: MACHINE_X.intro, camX: 0, drawn: 1, backdrop: 0, lid: 0, pour: 0 });
    onUi({ logo: false, menu: false, open: null, contact: false, read: false, grid: false });
  };

  /**
   * Scenes 3 and 4 (frames 3 and 4), from scene 2's rest: the books and cup
   * turn from drawings into 3D; the books turn to face out and spread, the
   * plant and machine make room; the logo and menu arrive; coffee fills the cup.
   */
  const scenes3and4 = (t: gsap.core.Timeline, at: number) => {
    t.to(anim, { drawn: 0, duration: 0.9, ease: "power2.inOut" }, at);
    t.to(anim, { plantX: PLANT_X.home, machineX: MACHINE_X.home, duration: 1.0, ease: "power3.inOut" }, at + 0.95);
    books(t, Object.fromEntries(BOOKS.map((id) => [id, homePose(id)])) as Record<BookId, BookPose>, at + 1.15, 1.15);
    t.call(() => onUi({ logo: true }), [], at + 1.5);
    pourCoffee(t, at + 1.8);
    t.call(() => onUi({ menu: true }), [], at + 2.1);
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
    intro() {
      const t = begin();
      introTl = t;
      restAtScene2();
      // Everything starts just past the screen's right edge, the same distance out, so they come in as a procession.
      const far = view.right - view.left + 0.4;
      ENTERING.forEach((k) => (anim.enter[k] = far));
      if (import.meta.env.DEV) (window as unknown as { __openingAt: number }).__openingAt = performance.now();
      ENTERING.forEach((k) => t.to(anim.enter, { [k]: 0, ...SLIDE }, SCENE_1_HOLD + ENTRANCE[k]));
      if (PLAY_PAST_SCENE_2) {
        scenes3and4(t, SCENE_1_HOLD + SCENE_2_LENGTH + 0.4);
        current = { mode: "home" };
      } else {
        holding = true;
        current = { mode: "home" };
      }
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

    /** Skips whatever is playing to its end. */
    finish() {
      tl?.progress(1);
    },

    go(target: Target, { instant = false } = {}) {
      const cur = current;
      if (cur && JSON.stringify(cur) === JSON.stringify(target)) return;
      const sameBook = cur?.mode === "open" && target.mode === "open" && cur.book === target.book;
      // Turning a page while the book is still opening: let it finish opening first.
      if (sameBook && tl?.isActive()) tl.progress(1);
      const t = begin();
      if (holding || anim.drawn > 0) {
        // Leaving scene 2's rest (or a first paint straight to a deep link): the drawings turn 3D on the way.
        holding = false;
        t.to(anim, { drawn: 0, duration: 0.6, ease: "power2.inOut" }, 0);
        t.call(() => onUi({ logo: true }), [], 0);
      }
      if (sameBook && cur?.mode === "open" && target.mode === "open") {
        const from = anim.pages[target.book].right;
        if (from !== target.page) turn(t, target.book, from, target.page);
        sub(t, target.book, cur.sub, target.sub);
      } else {
        if (cur?.mode === "open") close(t, cur.book, cur.sub);
        if (cur?.mode === "coffee") {
          t.call(() => onUi({ contact: false }));
          t.to(anim, { lid: 0, pour: 0, duration: 0.2 }, ">");
        }
        if (target.mode === "home") toHome(t);
        else if (target.mode === "coffee") {
          coffee(t);
        } else {
          // Coming from another book or the coffee: back to the shelf first (frames 13, 14, 32, 33).
          if (cur && cur.mode !== "home") toHome(t, 0.75);
          open(t, target.book, target.page);
          sub(t, target.book, "spread", target.sub);
        }
      }
      if (!cur) {
        // First paint on a deep link: no sequence, just be there.
        onUi({ logo: true });
        if (target.mode !== "open") onUi({ menu: true });
      }
      current = target;
      if (instant) t.progress(1);
    },
  };
}

export type Director = ReturnType<typeof createDirector>;
