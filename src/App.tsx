import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SmallScreenBlock } from "./pieces/SmallScreenBlock";
import { ControlBar, type Mode } from "./pieces/ControlBar";
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

const SCENE_W = 1729;
const DESK_H = 1117;
const FOOTER_H = 552;
/** How long the canvas takes to bring a clicked piece to centre. */
const PAN_DURATION = 0.5;

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
}: {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
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
}: {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
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
          scale={fit}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

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
  const [theme, setTheme] = useState<Theme>("light");
  const [mode, setMode] = useState<Mode>("scattered");
  const [bookOpen, setBookOpen] = useState(false);
  const [fileOpen, setFileOpen] = useState(false);
  const clock = useBayClock();

  // Both layouts start from rest — hover takes over from there.
  useEffect(() => {
    setBookOpen(false);
    setFileOpen(false);
  }, [mode]);

  const pageBg = theme === "light" ? "#fdfeff" : "#2f2f2f";
  const stageProps = {
    theme,
    bookOpen,
    onBookOpenChange: setBookOpen,
    fileOpen,
    onFileOpenChange: setFileOpen,
  };

  return (
    <div className="min-h-screen w-full transition-colors duration-500" style={{ background: pageBg }}>
      {/* ⚠️ TODO: NOT PRODUCTION READY — blacks out <=1024px so no mobile/iPad
          layout is needed yet. Remove when those designs are signed off
          (flip WIP_BREAKPOINTS in src/responsive.ts). */}
      <SmallScreenBlock />
      <ControlBar
        theme={theme}
        mode={mode}
        onMode={setMode}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
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
