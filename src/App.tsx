import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SmallScreenBlock } from "./pieces/SmallScreenBlock";
import { ControlBar, type Mode } from "./pieces/ControlBar";
import { Preloader } from "./pieces/Preloader";
import { ScatteredFocusContext } from "./pieces/ScatteredFocus";
import {
  CANVAS_H,
  CANVAS_ORIGIN_X,
  CANVAS_ORIGIN_Y,
  CANVAS_W,
  Footer,
  OrganizedScene,
  ScatteredScene,
  type Theme,
} from "./pieces";
import { PROJECTS } from "./pieces/projects";

/**
 * The preloader is an entrance, not a progress bar — it counts out a fixed
 * 1.8s rather than tracking anything real. So it plays once on arrival and
 * stays out of the way for the rest of the visit.
 *
 * `sessionStorage` rather than `localStorage`: a reload, a deep link, or a
 * bounce through the case-study routes all skip it, while someone coming back
 * tomorrow still gets the intro. Every access is guarded — a browser with site
 * data blocked throws on the property itself, and the page must still open.
 */
const SEEN_PRELOADER = "dp:preloader-seen";

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

const SCENE_W = 1729;
const DESK_H = 1117;
const FOOTER_H = 552;
/** How long the canvas takes to bring a clicked piece to centre. */
const PAN_DURATION = 0.5;

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
/* Shared: measure the viewport and scale the 1729-wide scene to fit    */
/* ------------------------------------------------------------------ */

function useFit(ref: React.RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      // Purely fluid: one scale drives the whole composition. Nothing below
      // the iPad breakpoint needs special handling — SmallScreenBlock covers
      // that range entirely.
      if (ref.current) setFit(ref.current.clientWidth / SCENE_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return fit;
}

/* ------------------------------------------------------------------ */
/* Scattered — scroll a 4327x2713 canvas through the 1729x1117 window   */
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
  const fit = useFit(viewportRef);
  const didInit = useRef(false);

  // Land on Figma's resting origin (main_canvas at left:-1299; top:-240).
  // Guarded until the measured `fit` has actually been applied to the spacer,
  // otherwise the first pass (fit still 1) would scroll against a stale extent
  // and get clamped once the real scale lands.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || didInit.current || !el.clientWidth) return;
    if (Math.abs(fit - el.clientWidth / SCENE_W) > 0.001) return;
    el.scrollLeft = -CANVAS_ORIGIN_X * fit;
    el.scrollTop = -CANVAS_ORIGIN_Y * fit;
    didInit.current = true;
  }, [fit]);

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

  // Pan the canvas so a clicked piece lands in the middle of the viewport, and
  // bring the stage back up under the footer if the page has scrolled past it.
  // Interactive pieces await this before playing their own animation.
  const centerOnPiece = useCallback((el: HTMLElement) => {
    const vp = viewportRef.current;
    if (!vp) return Promise.resolve();

    const vpBox = vp.getBoundingClientRect();
    const elBox = el.getBoundingClientRect();
    const dx = elBox.left + elBox.width / 2 - (vpBox.left + vpBox.width / 2);
    const dy = elBox.top + elBox.height / 2 - (vpBox.top + vpBox.height / 2);

    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
    const toLeft = clamp(vp.scrollLeft + dx, vp.scrollWidth - vp.clientWidth);
    const toTop = clamp(vp.scrollTop + dy, vp.scrollHeight - vp.clientHeight);

    const pageY = window.scrollY;
    const settled =
      Math.abs(toLeft - vp.scrollLeft) < 2 && Math.abs(toTop - vp.scrollTop) < 2 && pageY < 2;
    if (settled) return Promise.resolve();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      vp.scrollLeft = toLeft;
      vp.scrollTop = toTop;
      window.scrollTo(0, 0);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      gsap.killTweensOf(vp);
      gsap.to(vp, {
        scrollLeft: toLeft,
        scrollTop: toTop,
        duration: PAN_DURATION,
        ease: "power2.inOut",
        onComplete: resolve,
      });
      // The window has no tweenable scroll property, so drive it via a proxy.
      if (pageY >= 2) {
        const proxy = { y: pageY };
        gsap.to(proxy, {
          y: 0,
          duration: PAN_DURATION,
          ease: "power2.inOut",
          onUpdate: () => window.scrollTo(0, proxy.y),
        });
      }
    });
  }, []);

  return (
    <div
      ref={viewportRef}
      className="no-scrollbar relative w-full"
      style={{ height: DESK_H * fit, overflow: attached ? "auto" : "hidden" }}
    >
      {/* The canvas is sized by a transform, and transforms don't affect
          layout — so this spacer is what gives the scroller its extent, at
          the canvas's *rendered* (scaled) size. Without it you'd scroll into
          ~1000px of dead space on each axis. */}
      <div className="relative" style={{ width: CANVAS_W * fit, height: CANVAS_H * fit }}>
        {/* Clipped to Figma's main_canvas bounds. Rotated pieces keep an
            unrotated (taller) layout box — the -72deg pencil's box runs ~190px
            past the bottom — which would otherwise pad the scroll extent with
            dead space even though the piece visually fits. */}
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${fit})` }}
        >
          <ScatteredFocusContext.Provider value={centerOnPiece}>
            <ScatteredScene
              theme={theme}
              bookOpen={bookOpen}
              onBookOpenChange={onBookOpenChange}
              fileOpen={fileOpen}
              onFileOpenChange={onFileOpenChange}
              deepLinkProject={deepLinkProject}
              deepLinkSpread={deepLinkSpread}
              draggable
              scale={fit}
            />
          </ScatteredFocusContext.Provider>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organised — one piece locked to the centre, swiped through in a loop */
/* ------------------------------------------------------------------ */

function OrganizedStage({
  theme,
  bookOpen,
  onBookOpenChange,
  fileOpen,
  onFileOpenChange,
  deepLinkProject,
  deepLinkSpread,
  landOnFile = false,
}: {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
  deepLinkProject: number | null;
  deepLinkSpread: number | null;
  landOnFile?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const fit = useFit(viewportRef);

  return (
    <div ref={viewportRef} className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: SCENE_W,
          height: DESK_H,
          transform: `translate(-50%, -50%) scale(${fit})`,
          transformOrigin: "center center",
        }}
      >
        <OrganizedScene
          theme={theme}
          bookOpen={bookOpen}
          onBookOpenChange={onBookOpenChange}
          fileOpen={fileOpen}
          onFileOpenChange={onFileOpenChange}
          deepLinkProject={deepLinkProject}
          deepLinkSpread={deepLinkSpread}
          landOnFile={landOnFile}
          scale={fit}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

const DARK_QUERY = "(prefers-color-scheme: dark)";

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
  // Any recognised deep link lands in Organized mode — the desk's default
  // is scattered only for a plain visit.
  const [mode, setMode] = useState<Mode>(
    initialRoute.folder || initialAboutRoute ? "organized" : "scattered",
  );
  const [bookOpen, setBookOpen] = useState(initialAboutRoute !== null);
  const [fileOpen, setFileOpen] = useState(initialRoute.folder);
  const deepLinkIndex = initialRoute.slug
    ? PROJECTS.findIndex((p) => p.slug === initialRoute.slug)
    : -1;
  const deepLinkProject = deepLinkIndex >= 0 ? deepLinkIndex : null;
  const deepLinkSpread = initialAboutRoute?.spread ?? null;
  const [loading, setLoading] = useState(() => !preloaderSeen());
  // Flagged when it starts rather than when it finishes, so a reload part-way
  // through the count still skips it.
  useEffect(() => {
    if (loading) markPreloaderSeen();
  }, [loading]);
  const clock = useBayClock();

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

  return (
    <div className="min-h-screen w-full transition-colors duration-500" style={{ background: pageBg }}>
      {/* ⚠️ TODO: NOT PRODUCTION READY — blacks out <=1024px so no mobile/iPad
          layout is needed yet. Remove when those designs are signed off
          (flip WIP_BREAKPOINTS in src/responsive.ts). */}
      <SmallScreenBlock />
      {loading ? <Preloader theme={theme} onDone={() => setLoading(false)} /> : null}
      <ControlBar
        theme={theme}
        mode={mode}
        onMode={setMode}
        onToggleTheme={() => {
          // An explicit choice takes the OS out of the loop — otherwise the
          // system flipping at sunset would undo it mid-visit.
          themeOverridden.current = true;
          setTheme((t) => (t === "light" ? "dark" : "light"));
        }}
      />

      {/* Both stages scroll away with the page rather than staying pinned —
          the footer pushes up after them instead of overlapping. */}
      {mode === "scattered" ? <ScatteredStage {...stageProps} /> : <OrganizedStage {...stageProps} />}

      <FooterFit theme={theme} clock={clock} />
    </div>
  );
}

/* Footer scaled to fit page width, preserving its 1729-wide design */
function FooterFit({ theme, clock }: { theme: Theme; clock: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useFit(ref);
  return (
    <div ref={ref} className="relative z-10 w-full overflow-hidden" style={{ height: FOOTER_H * scale }}>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: SCENE_W, transform: `scale(${scale})` }}
      >
        <Footer theme={theme} clock={clock} className="h-[552px] w-[1729px]" />
      </div>
    </div>
  );
}
