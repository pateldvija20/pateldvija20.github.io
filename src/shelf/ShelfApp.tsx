import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyLegacyRedirect, CASES, navigate, routePath, useRoute, type Route } from "./routes";
import type { BookId } from "./story/layout";
import { ABOUT_SPREADS, PLAYGROUND_PAGES } from "./story/content";
import { anim, framing } from "./story/anim";
import { createDirector, type Target, type Ui } from "./story/director";
import { BookControls, CaseStudyPage, ContactLinks, MenuBar, OpeningOverlay, PlaygroundGrid, ThemeToggle } from "./story/StoryUI";
import "./shelf.css";
import "./story/story.css";

/**
 * The storyboard shelf (docs/storyboard-plan.md). The address says where to
 * be; the director (story/director.ts) plays the storyboard's frames, in
 * order, to get there; the interface follows the director's cues.
 *
 * The long sideways shelf and the coffee corner (ShelfScene.tsx, scene/) are
 * parked: still in the code, no longer shown.
 */

/** The 3D scene is its own chunk, so the loading line paints before three.js arrives. */
const StoryScene = lazy(() => import("./story/StoryScene"));

/** Scene 1 (the empty page and the shelf line) holds at least this long (ms), or until the 3D is ready if that's longer. */
const SCENE_1_MIN_MS = 500;

/** The load sequence (frames 1 to 4) plays once per visit, landing on home. */
const INTRO_KEY = "shelf:intro";

applyLegacyRedirect();

function targetOf(route: Route): Target {
  switch (route.kind) {
    case "home":
      return { mode: "home" };
    case "contact":
      return { mode: "coffee" };
    case "work":
      return { mode: "open", book: "work", page: CASES.indexOf(route.case), sub: route.read ? "read" : "spread" };
    case "playground":
      return route.page === "all"
        ? { mode: "open", book: "playground", page: anim.pages.playground.right, sub: "grid" }
        : { mode: "open", book: "playground", page: route.page, sub: "spread" };
    case "about":
      return { mode: "open", book: "about", page: route.page, sub: "spread" };
  }
}

/** The page after or before this one in an open book; past the last page, the book closes. */
function turned(route: Route, dir: -1 | 1): Route | null {
  if (route.kind === "work" && !route.read) {
    const i = CASES.indexOf(route.case) + dir;
    if (i >= CASES.length) return { kind: "home" };
    return i >= 0 ? { kind: "work", case: CASES[i], read: false } : null;
  }
  if (route.kind === "playground" && route.page !== "all") {
    const i = route.page + dir;
    if (i >= PLAYGROUND_PAGES.length) return { kind: "home" };
    return i >= 0 ? { kind: "playground", page: i } : null;
  }
  if (route.kind === "about") {
    const i = route.page + dir;
    if (i >= ABOUT_SPREADS.length) return { kind: "home" };
    return i >= 0 ? { kind: "about", page: i } : null;
  }
  return null;
}

/** True while `on` is, and for `ms` after, so a page can fade out before it goes. */
function useLinger(on: boolean, ms: number) {
  const [held, setHeld] = useState(on);
  useEffect(() => {
    if (on) {
      setHeld(true);
      return;
    }
    const t = window.setTimeout(() => setHeld(false), ms);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return on || held;
}

/** Whether the opening plays: "full" on the first load in this tab, "subtle" (a gentle wobble) on later ones, "no" for reduced motion. */
function introDue(): "full" | "subtle" | "no" {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "no";
    if (sessionStorage.getItem(INTRO_KEY)) return "subtle";
    sessionStorage.setItem(INTRO_KEY, "1");
    return "full";
  } catch {
    return "full";
  }
}

/** Escape steps back a level; the arrow keys turn an open book's pages. */
function useKeys(route: Route) {
  const r = useRef(route);
  r.current = route;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const rt = r.current;
      if (e.key === "Escape") {
        if (rt.kind === "work" && rt.read) navigate({ ...rt, read: false });
        else if (rt.kind === "playground" && rt.page === "all") navigate({ kind: "playground", page: anim.pages.playground.right });
        else if (rt.kind !== "home") navigate({ kind: "home" });
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = turned(rt, e.key === "ArrowRight" ? 1 : -1);
      if (next) navigate(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function ShelfApp() {
  const route = useRoute();
  const [ui, setUi] = useState<Ui>({ logo: false, menu: false, open: null, contact: false, read: false, grid: false });
  const director = useMemo(() => createDirector((u) => setUi((p) => ({ ...p, ...u }))), []);
  /** A book that's been clicked and stands forward, waiting to be opened by a second click. */
  const [focus, setFocus] = useState<BookId | null>(null);
  const focusRef = useRef<BookId | null>(null);
  focusRef.current = focus;
  const [ready, setReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [minHeld, setMinHeld] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMinHeld(true), SCENE_1_MIN_MS);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (sceneReady && minHeld) setReady(true);
  }, [sceneReady, minHeld]);
  // Scene 1's shelf line, painted by the page before three.js arrives, exactly where the 3D shelf will draw it.
  useLayoutEffect(() => {
    const place = () => {
      const f = framing(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
      const root = document.documentElement.style;
      root.setProperty("--shelf-y", `${f.shelfY}px`);
      root.setProperty("--band", `${f.band}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);
  const started = useRef(false);
  const [intro, setIntro] = useState(false);
  useKeys(route);

  const key = routePath(route);
  useEffect(() => {
    document.documentElement.dataset.route = key;
    setFocus(null);
    document.body.style.cursor = "";
    if (!ready) return;
    const target = targetOf(route);
    if (!started.current) {
      started.current = true;
      if (target.mode === "home") {
        const due = introDue();
        if (due !== "no") {
          director.intro(due === "subtle");
          setIntro(true);
        } else director.rest();
      } else director.go(target, { instant: true });
      return;
    }
    director.go(target);
    // route is read through key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, director]);

  // Any click or key during the load sequence skips to its end.
  useEffect(() => {
    if (!intro) return;
    if (ui.menu || ui.open) {
      setIntro(false);
      return;
    }
    const skip = () => director.finish();
    // Held at scene 2, the opening never shows the menu: stop listening once it has played.
    const done = window.setTimeout(() => setIntro(false), 4000);
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.clearTimeout(done);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [intro, ui.menu, director]);

  const readOn = route.kind === "work" && route.read;
  const gridOn = route.kind === "playground" && route.page === "all";
  const reading = readOn || gridOn;
  // The case study and grid stay mounted while they fade out; the case study keeps its last case.
  const lastRead = useRef<(typeof CASES)[number]>(CASES[0]);
  if (readOn) lastRead.current = route.case;
  const readMounted = useLinger(readOn || ui.read, 500);
  const gridMounted = useLinger(gridOn || ui.grid, 500);
  const openBook: BookId | null = route.kind === "work" || route.kind === "playground" || route.kind === "about" ? route.kind : null;

  return (
    <main className="shelf-root" data-ready={ready || undefined}>
      <div className="shelf-line" aria-hidden="true" />
      <p className="shelf-sr" role="status">
        {ready ? "" : "Loading"}
      </p>
      <Suspense fallback={null}>
        <StoryScene
          onReady={() => setSceneReady(true)}
          onPickBook={(id) => {
            // Home: the first click brings the book forward; the second opens it.
            if (route.kind === "home" && focus !== id) {
              setFocus(id);
              director.focus(id);
              return;
            }
            if (id === "work") navigate({ kind: "work", case: CASES[0], read: false });
            else navigate({ kind: id, page: 0 });
          }}
          onMiss={() => {
            if (!focusRef.current || route.kind !== "home") return;
            setFocus(null);
            director.go({ mode: "home" });
          }}
          onPickCup={() => navigate({ kind: "contact" })}
          onTurn={(book, dir) => {
            if (book !== openBook) return;
            const next = turned(route, dir);
            if (next) navigate(next);
          }}
        />
      </Suspense>
      <BookControls route={route} shown={ui.open !== null && ui.open === openBook && !reading} />
      <ContactLinks shown={ui.contact && route.kind === "contact"} />
      {readMounted && <CaseStudyPage c={lastRead.current} shown={readOn && ui.read} />}
      {gridMounted && <PlaygroundGrid shown={gridOn && ui.grid} />}
      <MenuBar
        focus={focus}
        onPick={(id) => {
          // On the shelf, a book's name brings it forward and waits, like clicking the book; naming the one already waiting opens it.
          if (route.kind !== "home" || id === "contact" || focus === id) return false;
          setFocus(id);
          director.focus(id);
          return true;
        }}
        onHome={() => {
          // With a book brought forward and waiting, there's no route to leave: put it back on the shelf.
          if (focusRef.current) {
            setFocus(null);
            director.go({ mode: "home" });
          } else navigate({ kind: "home" });
        }} route={route} hidden={!ui.menu || (openBook !== null && openBook !== "about")} />
      <OpeningOverlay />
      <ThemeToggle />
    </main>
  );
}
