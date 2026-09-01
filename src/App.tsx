import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ControlBar, type Mode } from "./pieces/ControlBar";
import { OrganizedPage } from "./organized/OrganizedPage";
import type { SectionId } from "./organized/content";
import { canScatter, MOBILE_BP, prefersScatter } from "./responsive";
import { Preloader } from "./pieces/Preloader";
import {
  FocusedIdContext,
  ScatteredFocusContext,
  type CameraState,
  type DeskCamera,
  type FocusSpec,
} from "./pieces/ScatteredFocus";
import { ResumeControls } from "./pieces/ResumeControls";
import {
  CANVAS_H,
  CANVAS_ORIGIN_X,
  CANVAS_ORIGIN_Y,
  CANVAS_W,
  Footer,
  FooterMobile,
  ScatteredScene,
  type Theme,
} from "./pieces";
import { PROJECTS } from "./pieces/projects";

/**
 * The preloader is an entrance, not a progress bar — it counts out a fixed
 * duration rather than tracking anything real. It plays the full 1.8s intro
 * once on arrival, then replays a shorter 0.9s beat every time the viewer
 * flips between scattered and organized mode.
 *
 * `sessionStorage` rather than `localStorage`: a reload, a deep link, or a
 * bounce through the case-study routes all skip the entrance, while someone
 * coming back tomorrow still gets it. Every access is guarded — a browser
 * with site data blocked throws on the property itself, and the page must
 * still open.
 */
const SEEN_PRELOADER = "dp:preloader-seen";

/**
 * The last mode the visitor chose, so a reload puts them back where they were
 * rather than resetting them to Organised.
 *
 * `sessionStorage`, matching the preloader flag: it survives a refresh and a
 * bounce through the case-study routes, while a genuinely new visit falls
 * back to the width rule in `App`. Organised stays the only linkable mode.
 */
const LAST_MODE = "dp:mode";

const rememberedMode = (): Mode | null => {
  try {
    const v = sessionStorage.getItem(LAST_MODE);
    return v === "scattered" || v === "organized" ? v : null;
  } catch {
    return null;
  }
};

const rememberMode = (m: Mode) => {
  try {
    sessionStorage.setItem(LAST_MODE, m);
  } catch {
    // Storage unavailable: the mode simply will not survive a reload.
  }
};

const preloaderSeen = () => {
  try {
    return sessionStorage.getItem(SEEN_PRELOADER) === "1";
  } catch {
    // Storage unavailable: treat it as a first visit and show the preloader.
    return false;
  }
};

const markPreloaderSeen = () => {
  try {
    sessionStorage.setItem(SEEN_PRELOADER, "1");
  } catch {
    // Nothing to do — worst case it plays again next reload.
  }
};

/**
 * The window the Scattered canvas is scaled against — Figma's `macscreen`
 * frame (491:2154), a 1512x982 MacBook Pro 14, expressed in canvas units via
 * the same 3580/1911 factor `ScatteredScene` uses. `fit` is
 * `viewportWidth / SCENE_W`, so at 1512 the desk renders at exactly the size
 * the frame draws it.
 */
const SCENE_W = 1512 * (3580 / 1911);
const DESK_H = 982 * (3580 / 1911);
/** The footer is a separate composition on its own 1729-wide artboard, and
 *  scales against that rather than against the desk's window. */
const FOOTER_W = 1729;
const FOOTER_H = 552;
/** How long the canvas takes to bring a clicked piece to centre. */
const PAN_DURATION = 0.5;
/**
 * Leaning in on an object, and leaning back out.
 *
 * Longer than a plain pan and eased at both ends: the camera has somewhere
 * specific to arrive at, and a zoom that snaps reads as a cut rather than as
 * a move. Releasing is a touch quicker — you look away faster than you look.
 */
const FOCUS_DURATION = 0.72;
const RELEASE_DURATION = 0.6;
const FOCUS_EASE = "power3.inOut";
/** How much of the viewport a focused object fills, unless it asks otherwise. */
const DEFAULT_FILL = 0.82;
/** The camera never goes further in than this, whatever an object asks for —
 *  past it the desk stops reading as a desk and the art starts to soften. */
const MAX_ZOOM = 3.6;

/**
 * Where the desk rests, in canvas units: the frame's own origin plus half a
 * viewport, which is the point the resting window is centred on. Expressed as
 * a camera position rather than as a scroll offset so a resize re-frames the
 * composition instead of stranding it.
 */
const REST_X = -CANVAS_ORIGIN_X + SCENE_W / 2;
const REST_Y = -CANVAS_ORIGIN_Y + DESK_H / 2;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Routing: /projects opens the folder, /projects/<slug> opens a case   */
/* ------------------------------------------------------------------ */

/** Read the current path. Anything unrecognised is just home. */
function parseProjectRoute(): { folder: boolean; slug: string | null } {
  if (typeof window === "undefined") return { folder: false, slug: null };
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] !== "projects") return { folder: false, slug: null };
  if (parts.length === 1) return { folder: true, slug: null };
  const slug = parts[1];
  if (!PROJECTS.some((p) => p.slug === slug)) return { folder: true, slug: null };
  return { folder: true, slug };
}

/* ------------------------------------------------------------------ */
/* Routing: /work-experience lands on the about book, opened already   */
/* to its Work Experience + Education spread.                          */
/* ------------------------------------------------------------------ */

/** Path segment → 1-based spread index into AboutBook's own SPREADS array. */
const ABOUT_ROUTES: Record<string, number> = {
  "work-experience": 2,
};

function parseAboutRoute(): { spread: number } | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return null;
  const spread = ABOUT_ROUTES[parts[0]];
  return spread ? { spread } : null;
}

/* ------------------------------------------------------------------ */
/* Shared: measure the viewport and scale a fixed-width composition to fit */
/* ------------------------------------------------------------------ */

function useFit(ref: React.RefObject<HTMLDivElement | null>, designW: number) {
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      // Purely fluid: one scale drives the whole composition. Nothing below
      // the iPad breakpoint needs special handling — SmallScreenBlock covers
      // that range entirely.
      if (ref.current) setFit(ref.current.clientWidth / designW);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, designW]);
  return fit;
}

/** The browser window's own height, tracked so the desk can refuse to be
 *  taller than it. */
function useWindowHeight() {
  const [h, setH] = useState(() => (typeof window === "undefined" ? 0 : window.innerHeight));
  useEffect(() => {
    const measure = () => setH(window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return h;
}

/* ------------------------------------------------------------------ */
/* Scattered — pan the desk canvas through the frame's own window       */
/* ------------------------------------------------------------------ */

function ScatteredStage({
  theme,
  bookOpen,
  onBookOpenChange,
  fileOpen,
  onFileOpenChange,
  deepLinkProject,
  deepLinkSpread,
}: {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
  deepLinkProject: number | null;
  deepLinkSpread: number | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fit = useFit(viewportRef, SCENE_W);
  const fitRef = useRef(fit);
  fitRef.current = fit;
  const windowH = useWindowHeight();
  /**
   * How tall the desk actually is.
   *
   * `fit` comes from the width alone, which is what keeps the desk at the
   * scale the frame draws it — but it means the height that scale asks for is,
   * on any laptop-shaped window, more than there is. At 1600x900 the stage came
   * out 1039px tall in a 900px window: 139px of desk below the fold, and a
   * focused object centred in the stage rather than in the window, hanging off
   * the bottom of the screen. That is the resume and the journal being cut off.
   *
   * Clamping the stage rather than the scale is the right half to give up. The
   * desk is a window onto a canvas already larger than any viewport, so showing
   * a shorter slice costs nothing and the camera can pan. Fitting the *scale*
   * to the height instead would shrink the whole composition away from the size
   * it is drawn at, on exactly the windows people actually use.
   *
   * Everything downstream corrects itself, because the camera measures the
   * viewport rather than assuming it: `focus` derives its zoom from
   * `clientHeight`, so a shorter stage simply frames a little tighter.
   */
  const stageH = Math.min(DESK_H * fit, windowH || DESK_H * fit);

  /**
   * The camera: the canvas point under the middle of the viewport, and how far
   * in it has leaned. Held in a ref and written straight to the DOM rather
   * than kept in state — a focus move is ~45 frames, and re-rendering forty
   * desk pieces on each of them is what would make the zoom stutter.
   */
  const cam = useRef({ x: REST_X, y: REST_Y, zoom: 1 });
  /**
   * The settled zoom, mirrored into state so pieces can convert pointer
   * deltas into canvas units. Only updated at rest: nothing is being dragged
   * during a camera move, and a value that changed every frame would put the
   * whole scene back into the render path this ref exists to keep it out of.
   */
  const [sceneZoom, setSceneZoom] = useState(1);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusRef = useRef<FocusSpec | null>(null);
  /** Where the camera was before the first focus in a chain, to come back to. */
  const restRef = useRef<{ x: number; y: number } | null>(null);
  /** True while a camera move is in flight, so the scroll events that move
   *  generates are not read back as the visitor panning. */
  const movingRef = useRef(false);

  /** Push the camera onto the DOM. The spacer is what gives the scroller its
   *  extent, so it has to be resized before the scroll position is set. */
  const applyCamera = useCallback(() => {
    const vp = viewportRef.current;
    const spacer = spacerRef.current;
    const canvas = canvasRef.current;
    if (!vp || !spacer || !canvas) return;
    const s = fitRef.current * cam.current.zoom;
    spacer.style.width = `${CANVAS_W * s}px`;
    spacer.style.height = `${CANVAS_H * s}px`;
    canvas.style.transform = `scale(${s})`;
    vp.scrollLeft = clamp(cam.current.x * s - vp.clientWidth / 2, 0, CANVAS_W * s - vp.clientWidth);
    vp.scrollTop = clamp(cam.current.y * s - vp.clientHeight / 2, 0, CANVAS_H * s - vp.clientHeight);
  }, []);

  const read = useCallback((): CameraState => {
    const vp = viewportRef.current;
    const s = fitRef.current * cam.current.zoom;
    return {
      x: cam.current.x,
      y: cam.current.y,
      zoom: cam.current.zoom,
      viewW: vp ? vp.clientWidth / s : SCENE_W,
      viewH: vp ? vp.clientHeight / s : DESK_H,
    };
  }, []);

  /** Keep the camera honest about a pan the visitor drove themselves. */
  const syncFromScroll = useCallback(() => {
    if (focusRef.current || movingRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const s = fitRef.current * cam.current.zoom;
    cam.current.x = (vp.scrollLeft + vp.clientWidth / 2) / s;
    cam.current.y = (vp.scrollTop + vp.clientHeight / 2) / s;
  }, []);

  // The camera is applied here rather than through React-rendered styles, so
  // a resize (which does re-render) re-frames from the same source of truth
  // the tweens write to.
  useLayoutEffect(() => {
    applyCamera();
  }, [applyCamera, fit]);

  const tweenCamera = useCallback(
    (to: { x: number; y: number; zoom: number }, duration = FOCUS_DURATION) =>
      new Promise<void>((resolve) => {
        gsap.killTweensOf(cam.current);
        const pageY = typeof window === "undefined" ? 0 : window.scrollY;
        if (reducedMotion()) {
          Object.assign(cam.current, to);
          applyCamera();
          if (pageY) window.scrollTo(0, 0);
          setSceneZoom(to.zoom);
          resolve();
          return;
        }
        movingRef.current = true;
        gsap.to(cam.current, {
          ...to,
          duration,
          ease: FOCUS_EASE,
          onUpdate: applyCamera,
          onComplete: () => {
            movingRef.current = false;
            setSceneZoom(cam.current.zoom);
            resolve();
          },
        });
        // The stage is only the whole viewport while the page is at the top;
        // below that the footer has risen over it, so bring the page back up
        // alongside the move rather than focusing behind the footer.
        if (pageY >= 2) {
          const proxy = { y: pageY };
          gsap.to(proxy, {
            y: 0,
            duration,
            ease: FOCUS_EASE,
            onUpdate: () => window.scrollTo(0, proxy.y),
          });
        }
      }),
    [applyCamera],
  );

  const release = useCallback(
    (id?: string) => {
      const spec = focusRef.current;
      if (!spec || (id !== undefined && spec.id !== id)) return;
      focusRef.current = null;
      setFocusedId(null);
      spec.onRelease?.();
      const back = restRef.current ?? { x: REST_X, y: REST_Y };
      restRef.current = null;
      void tweenCamera({ ...back, zoom: 1 }, RELEASE_DURATION);
    },
    [tweenCamera],
  );

  const focus = useCallback(
    (spec: FocusSpec) => {
      const vp = viewportRef.current;
      if (!vp) return Promise.resolve();
      if (focusRef.current?.id === spec.id) return Promise.resolve();
      // A chain of focuses (folder, then the book behind it) shares one way
      // back — the desk the visitor started from, not the last object.
      if (!focusRef.current) restRef.current = { ...cam.current };
      else focusRef.current.onRelease?.();
      focusRef.current = spec;
      setFocusedId(spec.id);

      const fill = spec.fill ?? DEFAULT_FILL;
      const viewW = vp.clientWidth / fitRef.current;
      const viewH = vp.clientHeight / fitRef.current;
      // Zoom is derived from how much of the viewport the object should fill,
      // not given as a multiplier: the same object then lands at the same
      // apparent size on a 1030 laptop and a 2560 display.
      const zx = (viewW * fill) / spec.rect.width;
      const zy = (viewH * fill) / spec.rect.height;
      const zoom = clamp(
        spec.fit === "width" ? zx : Math.min(zx, zy),
        1,
        Math.min(spec.maxZoom ?? MAX_ZOOM, MAX_ZOOM),
      );

      const x = spec.rect.left + spec.rect.width / 2;
      // A document is read from its top down, so `width` fit parks the sheet's
      // head just under the top edge instead of centring a page you cannot see
      // the start of.
      const y =
        spec.fit === "width"
          ? spec.rect.top + viewH / (2 * zoom) - (viewH / zoom) * 0.03
          : spec.rect.top + spec.rect.height / 2;
      return tweenCamera({ x, y, zoom });
    },
    [tweenCamera],
  );

  const pan = useCallback(
    (dx: number, dy: number) => {
      const vp = viewportRef.current;
      const s = fitRef.current * cam.current.zoom;
      if (vp) {
        const halfW = vp.clientWidth / (2 * s);
        const halfH = vp.clientHeight / (2 * s);
        cam.current.x = clamp(cam.current.x + dx, halfW, CANVAS_W - halfW);
        cam.current.y = clamp(cam.current.y + dy, halfH, CANVAS_H - halfH);
      }
      applyCamera();
      return read();
    },
    [applyCamera, read],
  );

  const setZoom = useCallback(
    (zoom: number) => {
      void tweenCamera(
        { x: cam.current.x, y: cam.current.y, zoom: clamp(zoom, 1, MAX_ZOOM) },
        0.32,
      );
    },
    [tweenCamera],
  );

  // Pan the canvas so a clicked piece lands in the middle of the viewport, and
  // bring the stage back up under the footer if the page has scrolled past it.
  // Interactive pieces await this before playing their own animation.
  const centerOn = useCallback(
    (el: HTMLElement) => {
      const vp = viewportRef.current;
      if (!vp) return Promise.resolve();
      // While an object is focused the camera belongs to it. Pieces that ask
      // to be centred as part of opening (the book, the folder, a pencil) are
      // asking a resting-desk question, and answering it mid-focus would drag
      // the camera off whatever it just leaned in on.
      if (focusRef.current) return Promise.resolve();
      const s = fitRef.current * cam.current.zoom;
      const vpBox = vp.getBoundingClientRect();
      const elBox = el.getBoundingClientRect();
      const dx = (elBox.left + elBox.width / 2 - (vpBox.left + vpBox.width / 2)) / s;
      const dy = (elBox.top + elBox.height / 2 - (vpBox.top + vpBox.height / 2)) / s;
      const settled = Math.abs(dx) * s < 2 && Math.abs(dy) * s < 2 && window.scrollY < 2;
      if (settled) return Promise.resolve();
      return tweenCamera(
        { x: cam.current.x + dx, y: cam.current.y + dy, zoom: cam.current.zoom },
        PAN_DURATION,
      );
    },
    [tweenCamera],
  );

  /** The scale the canvas is painted at right now. Read straight off the refs
   *  the ticker writes, so it is correct mid-tween — which is the whole
   *  reason pieces ask for it instead of using the `scale` prop. */
  const getScale = useCallback(() => fitRef.current * cam.current.zoom, []);

  const camera = useMemo<DeskCamera>(
    () => ({ focus, release, pan, setZoom, read, getScale, centerOn }),
    [focus, release, pan, setZoom, read, getScale, centerOn],
  );

  /**
   * Leaving focus.
   *
   * A wheel is offered to the focused object first — that is what lets the
   * Resume travel down its own page while a folder treats the same gesture as
   * "I'm done here". A pointer down anywhere outside the object always lets
   * go, except inside the case-study overlay (which lives above the desk in
   * its own layer) and inside anything marked as the focused object's own
   * chrome.
   */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      const spec = focusRef.current;
      if (!spec) return;
      e.preventDefault();
      // A trackpad pinch arrives as a wheel with `ctrlKey` set. The zoom of a
      // focused object belongs to its own controls — a pinch that quietly
      // re-framed the sheet would fight the +/- buttons for the same state,
      // and the two would disagree about where the camera is. Swallowed
      // rather than ignored, so the browser does not page-zoom instead.
      if (e.ctrlKey) return;
      if (spec.onWheel?.(e, read())) return;
      release(spec.id);
    };
    /** Did the pointer land inside the focused object's own box? Used for
     *  objects that have no single element to test against — the puzzle's
     *  root spans the whole canvas so its pieces can be carried across it,
     *  which would answer "yes" to every click on the desk. */
    const inFocusRect = (e: PointerEvent, spec: FocusSpec) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const b = canvas.getBoundingClientRect();
      const s = fitRef.current * cam.current.zoom;
      const x = (e.clientX - b.left) / s;
      const y = (e.clientY - b.top) / s;
      // Generous, because a puzzle piece can be carried a little way past the
      // pile the camera framed and grabbing it again should not count as
      // walking away.
      const padX = spec.rect.width * 0.18;
      const padY = spec.rect.height * 0.18;
      return (
        x >= spec.rect.left - padX &&
        x <= spec.rect.left + spec.rect.width + padX &&
        y >= spec.rect.top - padY &&
        y <= spec.rect.top + spec.rect.height + padY
      );
    };
    const onDown = (e: PointerEvent) => {
      const spec = focusRef.current;
      if (!spec) return;
      // Not every pointer target is an element — a press that lands on the
      // document itself has no `closest` to ask, and treating it as one threw
      // out of the listener before the release could run.
      const t = e.target instanceof Element ? e.target : null;
      if (t) {
        // The case study is a fixed overlay above the desk, and the resume's
        // controls sit with the mode buttons — both belong to the focused
        // object even though neither is inside it.
        if (t.closest("[data-project-overlay]") || t.closest("[data-focus-chrome]")) return;
        if (spec.el ? spec.el.contains(t) : inFocusRect(e, spec)) return;
      } else if (inFocusRect(e, spec)) {
        return;
      }
      release(spec.id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") release();
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      vp.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [read, release]);

  // The canvas's own pan (this div's internal scroll) only makes sense while
  // the desk has the viewport to itself. As soon as the page scrolls at all
  // the footer starts rising over it, so pan is switched off on both axes —
  // otherwise one wheel gesture fights between panning the canvas and
  // scrolling the page. Scrolling back to the top hands panning back.
  //
  // The test has to be the page's scroll position, not this element's box:
  // the stage is `sticky top-0`, so its rect stays pinned at the top of the
  // viewport however far the page has scrolled, and a rect-based check reads
  // as "still covering" forever.
  const [attached, setAttached] = useState(true);
  useEffect(() => {
    const check = () => setAttached(window.scrollY < 1);
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <>
      <div
        ref={viewportRef}
        onScroll={syncFromScroll}
        className="no-scrollbar relative w-full"
        style={{ height: stageH, overflow: attached ? "auto" : "hidden" }}
      >
        {/* The canvas is sized by a transform, and transforms don't affect
            layout — so this spacer is what gives the scroller its extent, at
            the canvas's *rendered* (scaled) size. Without it you'd scroll into
            ~1000px of dead space on each axis. Its size and the scale below
            are written by `applyCamera`, not rendered, because both change on
            every frame of a zoom. */}
        <div ref={spacerRef} className="relative">
          {/* Clipped to Figma's main_canvas bounds. Rotated pieces keep an
              unrotated (taller) layout box — the -72deg pencil's box runs ~190px
              past the bottom — which would otherwise pad the scroll extent with
              dead space even though the piece visually fits. */}
          <div
            ref={canvasRef}
            className="absolute left-0 top-0 origin-top-left overflow-hidden"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
            <ScatteredFocusContext.Provider value={camera}>
              <FocusedIdContext.Provider value={focusedId}>
                <ScatteredScene
                  theme={theme}
                  bookOpen={bookOpen}
                  onBookOpenChange={onBookOpenChange}
                  fileOpen={fileOpen}
                  onFileOpenChange={onFileOpenChange}
                  deepLinkProject={deepLinkProject}
                  deepLinkSpread={deepLinkSpread}
                  draggable
                  scale={fit * sceneZoom}
                />
              </FocusedIdContext.Provider>
            </ScatteredFocusContext.Provider>
          </div>
        </div>
      </div>

      {/* Sits with the mode and brightness controls rather than on the sheet:
          the Resume is a physical page on the desk, and hanging a toolbar off
          it would make it a viewer window instead. */}
      {focusedId === "resume" ? (
        <ResumeControls
          theme={theme}
          onZoomIn={() => setZoom(cam.current.zoom * 1.25)}
          onZoomOut={() => setZoom(cam.current.zoom / 1.25)}
          onClose={() => release("resume")}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Whether the viewport is wide enough for Scattered mode. Tracked as state
 * rather than read on demand so both the toggle and the render branch react to
 * a resize mid-session.
 */
function useScatterAllowed() {
  const [allowed, setAllowed] = useState(
    () => typeof window === "undefined" || canScatter(window.innerWidth),
  );
  useEffect(() => {
    const check = () => setAllowed(canScatter(window.innerWidth));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return allowed;
}

/** The OS preference right now. Guarded because `matchMedia` is missing in
 *  non-browser environments and in some older test runners; light is the
 *  same fallback the media query itself resolves to. */
function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function useBayClock() {
  const [clock, setClock] = useState("Bay Area, 12:17PM");
  useEffect(() => {
    const tick = () => {
      const t = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setClock(`Bay Area, ${t.replace(" ", "")}`);
    };
    tick();
    const iv = setInterval(tick, 15000);
    return () => clearInterval(iv);
  }, []);
  return clock;
}

export default function App() {
  // The desk opens in whichever theme the OS is set to, and keeps following
  // it — until the viewer works the toggle, at which point their choice wins
  // for the rest of the session. Switching layouts never touches it.
  const [theme, setTheme] = useState<Theme>(systemTheme);
  const themeOverridden = useRef(false);
  // The URL decides the starting state: /projects lands on the open folder,
  // /projects/<slug> lands inside that case study, /work-experience lands
  // on the about book already open to that spread.
  const initialRoute = useRef(parseProjectRoute()).current;
  const initialAboutRoute = useRef(parseAboutRoute()).current;
  // Which mode a visit opens in, in priority order:
  //
  //   1. A deep link always resolves to Organised — that is the only mode with
  //      real URLs, so a shared link has to land where it points.
  //   2. Whatever they chose last, if they chose. A remembered mode outranks
  //      the width rule below: someone who switched to Organised and reloaded
  //      meant it, and having the desk reassert itself would read as the
  //      toggle not working.
  //   3. On a wide enough window, the desk. Below that, Organised.
  //
  // Organised remains the only directly linkable mode; this changes which door
  // a fresh visit comes through, not what a URL can address.
  const deepLinked = initialRoute.folder || initialRoute.slug !== null || initialAboutRoute !== null;
  const [mode, setMode] = useState<Mode>(() => {
    if (deepLinked) return "organized";
    const remembered = rememberedMode();
    if (remembered) return remembered;
    if (typeof window === "undefined") return "organized";
    return prefersScatter(window.innerWidth) ? "scattered" : "organized";
  });

  useEffect(() => {
    rememberMode(mode);
  }, [mode]);
  /** Where a deep link lands on the Organised page. */
  const initialSection: SectionId | null = initialRoute.slug
    ? "work"
    : initialRoute.folder
      ? "work"
      : initialAboutRoute
        ? "resume"
        : null;
  const [bookOpen, setBookOpen] = useState(initialAboutRoute !== null);
  const [fileOpen, setFileOpen] = useState(initialRoute.folder);
  const deepLinkIndex = initialRoute.slug
    ? PROJECTS.findIndex((p) => p.slug === initialRoute.slug)
    : -1;
  const deepLinkProject = deepLinkIndex >= 0 ? deepLinkIndex : null;
  const deepLinkSpread = initialAboutRoute?.spread ?? null;
  const [loading, setLoading] = useState(() => !preloaderSeen());
  // Shorter replay on a scattered/organized switch than the first-visit
  // entrance — it's a beat of feedback, not a full intro.
  const [loadingDuration, setLoadingDuration] = useState(1800);
  // Flagged when it starts rather than when it finishes, so a reload part-way
  // through the count still skips it.
  useEffect(() => {
    if (loading) markPreloaderSeen();
  }, [loading]);
  const clock = useBayClock();

  // Mirror the theme onto the document element. `theme` stays the single
  // source of truth and still reaches every Scattered piece as a prop; this
  // only gives CSS the same fact, so the Organised page can flip its
  // surface tokens without threading a prop through every section.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Folder open/close mirrors into the path (replaceState — the case study
  // owns the pushed history entries). Back/Forward re-derive the folder.
  const handleFileOpenChange = useCallback((next: boolean) => {
    setFileOpen(next);
    const path = window.location.pathname;
    if (next && path === "/") history.replaceState(null, "", "/projects");
    if (!next && path === "/projects") history.replaceState(null, "", "/");
  }, []);
  useEffect(() => {
    const onPop = () => setFileOpen(parseProjectRoute().folder);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Closing the book off a /work-experience landing drops the URL back
  // home — otherwise the address bar keeps claiming a spread that's no
  // longer open. Opening the book from elsewhere has no route of its own
  // to push (which spread you land on isn't a link), so that direction is
  // left alone, same as the folder's own pattern above.
  const handleBookOpenChange = useCallback((next: boolean) => {
    setBookOpen(next);
    if (!next && parseAboutRoute()) {
      history.replaceState(null, "", "/");
    }
  }, []);

  // Follow the OS while it's still the one deciding. Reading the query again
  // on mount matters too: the preference can change between module eval and
  // the first paint, and Safari < 14 only has the deprecated listener API.
  useEffect(() => {
    if (themeOverridden.current) return;
    const mq = window.matchMedia(DARK_QUERY);
    setTheme(mq.matches ? "dark" : "light");
    const onChange = (e: MediaQueryListEvent) => {
      if (themeOverridden.current) return;
      setTheme(e.matches ? "dark" : "light");
    };
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // Both layouts start from rest — hover takes over from there. Skipped on
  // mount: the URL may have just opened the folder or book (/projects,
  // /work-experience), and that state must survive until the viewer
  // actually switches layouts.
  //
  // Tracking "have we skipped the first run yet" with a plain boolean flag
  // looks right but isn't: Strict Mode double-invokes effects on mount in
  // dev, so the flag gets consumed by that harmless extra pass and the
  // *second* (still-initial) invocation wrongly takes the reset branch,
  // instantly closing whatever a deep link had just opened. Comparing
  // against the previous `mode` value instead is immune to that — Strict
  // Mode's extra pass re-runs with the same `mode`, so it's a no-op, while
  // a genuine later switch always differs from what's stored.
  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    setBookOpen(false);
    setFileOpen(false);
    setLoadingDuration(900);
    setLoading(true);
  }, [mode]);

  const pageBg = theme === "light" ? "#fdfeff" : "#2f2f2f";
  const stageProps = {
    theme,
    bookOpen,
    onBookOpenChange: handleBookOpenChange,
    fileOpen,
    onFileOpenChange: handleFileOpenChange,
    deepLinkProject,
    deepLinkSpread,
    landOnFile: initialRoute.folder,
  };

  // Scattered is a desktop-only mode. Someone who narrows the window while
  // it is open is moved to Organised rather than left on a canvas the layout
  // no longer supports — and the toggle disappears with it.
  const scatterAllowed = useScatterAllowed();
  useEffect(() => {
    if (!scatterAllowed && mode === "scattered") setMode("organized");
  }, [scatterAllowed, mode]);
  const showScattered = mode === "scattered" && scatterAllowed;

  // Scroll-snap belongs to Organised only — Scattered pans a canvas rather
  // than scrolling through sections, and snapping would fight the pan.
  useEffect(() => {
    const root = document.documentElement;
    if (showScattered) delete root.dataset.organised;
    else root.dataset.organised = "true";
    return () => {
      delete root.dataset.organised;
    };
  }, [showScattered]);


  return (
    <div className="min-h-screen w-full transition-colors duration-500" style={{ background: pageBg }}>
      {loading ? (
        <Preloader theme={theme} duration={loadingDuration} onDone={() => setLoading(false)} />
      ) : null}
      <ControlBar
        theme={theme}
        mode={mode}
        onMode={setMode}
        showLayoutToggle={scatterAllowed}
        onToggleTheme={() => {
          // An explicit choice takes the OS out of the loop — otherwise the
          // system flipping at sunset would undo it mid-visit.
          themeOverridden.current = true;
          setTheme((t) => (t === "light" ? "dark" : "light"));
        }}
      />

      {/* Both modes scroll away with the page rather than staying pinned —
          the footer pushes up after them instead of overlapping. */}
      {showScattered ? (
        <ScatteredStage {...stageProps} />
      ) : (
        <OrganizedPage
          theme={theme}
          initialSection={initialSection}
          initialSlug={initialRoute.slug}
        />
      )}

      <FooterFit theme={theme} clock={clock} />
    </div>
  );
}

/* Footer scaled to fit page width, preserving its 1729-wide design.
 *
 * Below the phone breakpoint it swaps to `FooterMobile` instead of scaling:
 * at 440px the scaled desk footer would render its CONNECT card at 25%, which
 * is unreadable, and Figma's own phone footer is a different composition
 * rather than a smaller one. */
function FooterFit({ theme, clock }: { theme: Theme; clock: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useFit(ref, FOOTER_W);
  const [phone, setPhone] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BP,
  );
  useEffect(() => {
    const check = () => setPhone(window.innerWidth <= MOBILE_BP);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (phone) {
    return (
      <div className="relative z-10 w-full">
        <FooterMobile theme={theme} clock={clock} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative z-10 w-full overflow-hidden" style={{ height: FOOTER_H * scale }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: FOOTER_W, transform: `scale(${scale})` }}
      >
        <Footer theme={theme} clock={clock} className="h-[552px] w-[1729px]" />
      </div>
    </div>
  );
}
