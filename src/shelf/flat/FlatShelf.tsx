import { useEffect, useRef, type ReactNode } from "react";
import { PaintDefs } from "./paint";
import {
  About,
  CaseStudies,
  Clock,
  CoffeeMachine,
  Experiments,
  Grinder,
  HerbPot,
  Lamp,
  MugCubby,
  Notebooks,
  OakCounter,
  Phone,
  Pothos,
  Resume,
  SmilePilea,
  SnakePlant,
  StringOfPearls,
  Succulent,
  WavyPilea,
} from "./objects";

/**
 * The whole shelf in 2D (Dvija, 6 Nov): every object in the coffee-trio style
 * with version-2 shading. Shown at /?style=2d while the 2D build replaces the
 * 3D one. Drag, swipe, trackpad or mouse wheel moves along it.
 */

const BASE = 470;
const GAP = 34;
const STATION_GAP = 150;

type Item = { w: number; draw: (x: number) => ReactNode };

const MAIN: Item[] = [
  { w: 160, draw: (x) => <Lamp x={x} /> },
  { w: 300, draw: (x) => <CaseStudies x={x} /> },
  { w: 190, draw: (x) => <SmilePilea x={x} /> },
  { w: 175, draw: (x) => <Experiments x={x} /> },
  { w: 70, draw: (x) => <About x={x} /> },
  { w: 150, draw: (x) => <SnakePlant x={x} /> },
  { w: 160, draw: (x) => <Clock x={x} /> },
  { w: 175, draw: (x) => <Resume x={x} /> },
  { w: 230, draw: (x) => <Notebooks x={x} /> },
  { w: 150, draw: (x) => <Pothos x={x} /> },
  { w: 240, draw: (x) => <Phone x={x} /> },
  { w: 190, draw: (x) => <WavyPilea x={x} /> },
];

const START = 80;
const placed = (() => {
  let x = START;
  return MAIN.map((it) => {
    const cx = x + it.w / 2;
    x += it.w + GAP;
    return { ...it, cx };
  });
})();
const MAIN_END = placed[placed.length - 1].cx + MAIN[MAIN.length - 1].w / 2 + 30;
const STATION_X = MAIN_END + STATION_GAP;
const STATION_W = 720;
const TOTAL_W = STATION_X + STATION_W + 80;

export default function FlatShelf() {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      el.scrollLeft -= e.clientX - lastX;
      lastX = e.clientX;
    };
    const up = () => {
      dragging = false;
    };
    // A vertical wheel or trackpad scroll moves the shelf sideways.
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  return (
    <div className="flat-scroller" ref={scroller}>
      <svg className="flat-shelf" viewBox={`0 -40 ${TOTAL_W} 600`} role="img" aria-label="The bookshelf: Dvija's work and things, from the lamp to the coffee station">
        {/* The main shelf's surface: one thin line, as in the reference */}
        <line x1={START - 40} y1={BASE} x2={MAIN_END} y2={BASE} stroke="#6A86B0" strokeWidth={2} />
        <g transform={`translate(0 ${BASE})`}>
          {placed.map((it, i) => (
            <g key={i}>{it.draw(it.cx)}</g>
          ))}
          {/* The coffee station, after a gap */}
          <OakCounter x={STATION_X} w={STATION_W} />
          <Succulent x={STATION_X + 70} />
          <CoffeeMachine x={STATION_X + 260} />
          <Grinder x={STATION_X + 470} />
          <HerbPot x={STATION_X + 610} />
          <MugCubby x={STATION_X + 545} y={-250} />
          <StringOfPearls x={STATION_X + 640} y={-440} />
        </g>
        {/* Gradients are collected while the objects render, so this comes last. */}
        <PaintDefs />
      </svg>
    </div>
  );
}
