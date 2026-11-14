import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Bind Desk's hero: the product in an app window on the project's backdrop,
 * centred with an even margin all round, playing one short walk through the core loop:
 * the week's list, open the mismatched policy, mark the difference.
 *
 * Drawn in code over 2x captures of the prototype (`/assets/projects/bind-desk/
 * hero/`) rather than recorded, so every move is an eased scroll or push with a
 * hold after it instead of a screen recording's cursor wander. Everything below
 * is laid out in the captures' own CSS px (1150 wide) and the stage is scaled to
 * the window, so the timeline reads in the same units as the screens.
 *
 * Like LoopMedia it only plays while on screen, and with reduced motion it
 * holds on the first frame.
 */

const DIR = "/assets/projects/bind-desk/hero";
/** The captures' width in CSS px. */
const W = 1150;
const BAR = 76;
const DURATION = 12000;
/** A slow-in, slow-out ease for every scroll and push. */
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Scroll offsets and click targets, from the prototype's own layout. */
const HOME_SCROLL = 150;
const HARBOR_SCROLL = 440;
/** The app's sidebar, which stays put while the list scrolls under it. */
const SIDEBAR = 208;
/** Push distance as one page leaves for the next. */
const PUSH = 200;
const ROW = { x: 330, y: 366 };
const ROW_BOX = { left: 241, top: 341, width: 876, height: 111 };
const MARK = { x: 885, y: 754 };

type Frame = Keyframe & { offset: number };
/** Keyframes with the shared ease between every step. */
const steps = (frames: Frame[]): Keyframe[] => frames.map((f) => ({ easing: EASE, ...f }));

const TIMELINE: Record<string, Keyframe[]> = {
  home: steps([
    { offset: 0, transform: "translate(0, 0)", opacity: 1 },
    { offset: 0.08, transform: "translate(0, 0)", opacity: 1 },
    { offset: 0.2, transform: `translate(0, -${HOME_SCROLL}px)`, opacity: 1 },
    { offset: 0.29, transform: `translate(0, -${HOME_SCROLL}px)`, opacity: 1 },
    { offset: 0.35, transform: `translate(-${PUSH}px, -${HOME_SCROLL}px)`, opacity: 0 },
    { offset: 0.88, transform: "translate(0, 0)", opacity: 0 },
    { offset: 0.94, transform: "translate(0, 0)", opacity: 1 },
    { offset: 1, transform: "translate(0, 0)", opacity: 1 },
  ]),
  sidebar: steps([
    { offset: 0, transform: "translate(0, 0)", opacity: 1 },
    { offset: 0.29, transform: "translate(0, 0)", opacity: 1 },
    { offset: 0.35, transform: `translate(-${PUSH}px, 0)`, opacity: 0 },
    { offset: 0.88, transform: "translate(0, 0)", opacity: 0 },
    { offset: 0.94, transform: "translate(0, 0)", opacity: 1 },
    { offset: 1, transform: "translate(0, 0)", opacity: 1 },
  ]),
  harbor: steps([
    { offset: 0, transform: "translate(8%, 0)", opacity: 0 },
    { offset: 0.29, transform: "translate(8%, 0)", opacity: 0 },
    { offset: 0.35, transform: "translate(0, 0)", opacity: 1 },
    { offset: 0.38, transform: "translate(0, 0)", opacity: 1 },
    { offset: 0.5, transform: `translate(0, -${HARBOR_SCROLL}px)`, opacity: 1 },
    { offset: 0.88, transform: `translate(0, -${HARBOR_SCROLL}px)`, opacity: 1 },
    { offset: 0.94, transform: `translate(0, -${HARBOR_SCROLL}px)`, opacity: 0 },
    { offset: 1, transform: "translate(8%, 0)", opacity: 0 },
  ]),
  marked: steps([
    { offset: 0, opacity: 0 },
    { offset: 0.585, opacity: 0 },
    { offset: 0.61, opacity: 1 },
    { offset: 1, opacity: 1 },
  ]),
  press: steps([
    { offset: 0, opacity: 0 },
    { offset: 0.255, opacity: 0 },
    { offset: 0.27, opacity: 1 },
    { offset: 0.31, opacity: 1 },
    { offset: 0.34, opacity: 0 },
    { offset: 1, opacity: 0 },
  ]),
  cursor: steps([
    { offset: 0, transform: "translate(760px, 560px)", opacity: 0 },
    { offset: 0.12, transform: "translate(760px, 560px)", opacity: 0 },
    { offset: 0.16, transform: "translate(700px, 500px)", opacity: 1 },
    { offset: 0.25, transform: `translate(${ROW.x}px, ${ROW.y - HOME_SCROLL}px)`, opacity: 1 },
    { offset: 0.26, transform: `translate(${ROW.x}px, ${ROW.y - HOME_SCROLL}px) scale(0.86)`, opacity: 1 },
    { offset: 0.28, transform: `translate(${ROW.x}px, ${ROW.y - HOME_SCROLL}px)`, opacity: 1 },
    { offset: 0.4, transform: "translate(520px, 420px)", opacity: 1 },
    { offset: 0.56, transform: `translate(${MARK.x}px, ${MARK.y - HARBOR_SCROLL}px)`, opacity: 1 },
    { offset: 0.57, transform: `translate(${MARK.x}px, ${MARK.y - HARBOR_SCROLL}px) scale(0.86)`, opacity: 1 },
    { offset: 0.59, transform: `translate(${MARK.x}px, ${MARK.y - HARBOR_SCROLL}px)`, opacity: 1 },
    { offset: 0.78, transform: `translate(${MARK.x}px, ${MARK.y - HARBOR_SCROLL}px)`, opacity: 1 },
    { offset: 0.84, transform: `translate(${MARK.x + 60}px, ${MARK.y - HARBOR_SCROLL + 140}px)`, opacity: 0 },
    { offset: 1, transform: "translate(760px, 560px)", opacity: 0 },
  ]),
  urlHome: steps([
    { offset: 0, opacity: 1 },
    { offset: 0.3, opacity: 1 },
    { offset: 0.32, opacity: 0 },
    { offset: 0.89, opacity: 0 },
    { offset: 0.91, opacity: 1 },
    { offset: 1, opacity: 1 },
  ]),
  urlHarbor: steps([
    { offset: 0, opacity: 0 },
    { offset: 0.3, opacity: 0 },
    { offset: 0.32, opacity: 1 },
    { offset: 0.89, opacity: 1 },
    { offset: 0.91, opacity: 0 },
    { offset: 1, opacity: 0 },
  ]),
};

export function WindowLoop({ className = "" }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [reduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // The stage is laid out at the captures' width; scale it to the window.
  useLayoutEffect(() => {
    const win = winRef.current;
    if (!win) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(win);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const box = boxRef.current;
    if (!stage || !box || reduce) return;
    const animations = Object.entries(TIMELINE).flatMap(([name, frames]) =>
      [...stage.querySelectorAll<HTMLElement>(`[data-loop="${name}"]`)].map((el) =>
        el.animate(frames, { duration: DURATION, iterations: Infinity, fill: "both" }),
      ),
    );
    const io = new IntersectionObserver(
      ([e]) => animations.forEach((a) => (e.isIntersecting ? a.play() : a.pause())),
      { threshold: 0.2 },
    );
    io.observe(box);
    return () => {
      io.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, [reduce]);

  return (
    <div
      ref={boxRef}
      className={`relative h-full w-full select-none overflow-hidden ${className}`}
      style={{ containerType: "size" }}
      aria-hidden
    >
      {/* Sized by the box, not the art: an even margin above and below, and as
          wide as a wide box allows without the window outgrowing its height. */}
      <div
        ref={winRef}
        className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
        style={{
          top: "11cqh",
          bottom: "11cqh",
          width: "min(80cqw, 140cqh)",
          borderRadius: 12 * scale,
          boxShadow: "0 1px 0 rgba(24, 25, 26, 0.06), 0 18px 48px -16px rgba(83, 62, 20, 0.28)",
          outline: "1px solid rgba(24, 25, 26, 0.08)",
          background: "#fbfaf7",
        }}
      >
        <div
          ref={stageRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: W, height: scale ? `${100 / scale}%` : "100%", transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
        >
          <WindowBar />
          <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: BAR }}>
            <div data-loop="home" className="absolute left-0 top-0" style={{ width: W }}>
              <img src={`${DIR}/home.jpg`} alt="" draggable={false} style={{ width: W, display: "block" }} />
              {/* The row's pressed state as the cursor lands on it. */}
              <div
                data-loop="press"
                className="absolute"
                style={{ ...ROW_BOX, background: "rgba(24, 25, 26, 0.05)", opacity: 0 }}
              />
            </div>
            {/* The same capture's sidebar strip, held still over the list. */}
            <div
              data-loop="sidebar"
              className="absolute bottom-0 left-0 top-0"
              style={{
                width: SIDEBAR,
                backgroundImage: `url(${DIR}/home.jpg)`,
                backgroundSize: `${W}px auto`,
                backgroundRepeat: "no-repeat",
                backgroundColor: "#fbfaf7",
              }}
            />
            <div data-loop="harbor" className="absolute left-0 top-0" style={{ width: W, opacity: 0 }}>
              <img src={`${DIR}/harbor.jpg`} alt="" draggable={false} style={{ width: W, display: "block" }} />
              <img
                data-loop="marked"
                src={`${DIR}/harbor-marked.jpg`}
                alt=""
                draggable={false}
                className="absolute left-0 top-0"
                style={{ width: W, opacity: 0 }}
              />
            </div>
            <Cursor />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The prototype's own browser frame, redrawn: two tabs over an address bar. */
function WindowBar() {
  return (
    <div className="absolute inset-x-0 top-0" style={{ height: BAR, background: "#efede8", borderBottom: "1px solid #e2dfd8" }}>
      <div className="flex items-end" style={{ height: 38, paddingLeft: 16, gap: 8 }}>
        <div className="flex items-center self-center" style={{ gap: 8, marginRight: 14 }}>
          {["#ec6a5e", "#f4bf4f", "#61c554"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
          ))}
        </div>
        <Tab active>Bind Desk</Tab>
        <Tab>Inbox · Webmail</Tab>
      </div>
      <div className="flex items-center" style={{ height: 38, padding: "0 14px", gap: 14, background: "#fbfaf7" }}>
        <span style={{ color: "#8b877e", fontSize: 15, letterSpacing: 6 }}>‹ ›</span>
        <div
          className="relative flex-1"
          style={{ height: 26, borderRadius: 13, background: "#efede8", fontSize: 13, color: "#6f6b63", fontFamily: "system-ui, sans-serif" }}
        >
          <span data-loop="urlHome" className="absolute" style={{ left: 14, top: 5 }}>bindesk.app/example/home</span>
          <span data-loop="urlHarbor" className="absolute" style={{ left: 14, top: 5, opacity: 0 }}>
            bindesk.app/example/applications/harbor
          </span>
        </div>
      </div>
    </div>
  );
}

function Tab({ active = false, children }: { active?: boolean; children: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        height: 30,
        width: 200,
        padding: "0 12px",
        gap: 8,
        borderRadius: "8px 8px 0 0",
        background: active ? "#fbfaf7" : "transparent",
        color: active ? "#18191a" : "#6f6b63",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 3, background: active ? "#18191a" : "#c9c5bc" }} />
      {children}
    </div>
  );
}

/** A plain arrow pointer; its tip is the element's top-left corner. */
function Cursor() {
  return (
    <svg
      data-loop="cursor"
      className="absolute left-0 top-0"
      width="26"
      height="30"
      viewBox="0 0 26 30"
      style={{ opacity: 0, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))", transformOrigin: "0 0" }}
    >
      <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#18191a" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
