import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AboutBook } from "./AboutBook";
import { Coaster } from "./Coaster";
import { CoffeeCup } from "./CoffeeCup";
import { ComponentCard, type CardCopy } from "./ComponentCard";
import { CuttingMat } from "./CuttingMat";
import { CvV1 } from "./CvV1";
import { DeskMat } from "./DeskMat";
import { FileFolder } from "./FileFolder";
import { GoldenRatioMat } from "./GoldenRatioMat";
import { Pencil } from "./Pencil";
import { PencilBox } from "./PencilBox";
import type { Theme } from "./Piece";
import { Sticker } from "./Sticker";

/* The Organised composition (Figma 190:9379).
 *
 * The desk itself (mat, cutting mat, coaster) is fixed background. The pieces
 * live on `Frame 1`: a horizontal track, one piece per slide, each slide
 * padded 200px either side with a 10px gap. Swiping moves the track so the
 * active slide's centre sits on the window's centre, which leaves the two
 * neighbours peeking in from the edges. The track wraps, so swiping never
 * runs out of pieces.
 *
 * The intro card and the coffee cup are not on the track. They open the mode
 * centred, and the first swipe — either direction — slides them into the
 * top-left corner, where the card stays as the label for whatever is centred. */

export const ORGANIZED_W = 1729;
export const ORGANIZED_H = 1117;

/** `Frame 1` — the track sits below the top bar and above the desk edge. */
const TRACK_TOP = 122;
const TRACK_H = 995;
/** Figma's auto-layout on the track: `px-[200px]` per slide, `gap-[10px]`. */
const SLIDE_PAD = 200;
const SLIDE_GAP = 10;

/**
 * `useElementScale` derives a piece's scale from its container height minus a
 * fixed 100px margin top and bottom. To land a piece at an exact rendered
 * height the container has to be that much taller.
 */
const SCALE_MARGIN = 200;
const boxed = (renderedHeight: number) => renderedHeight + SCALE_MARGIN;

type SlideProps = {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
  /** Project to mount already expanded (deep link); only the file slide uses it. */
  deepLinkProject?: number | null;
  /** Spread to open the about book to (deep link); only the book slide uses it. */
  deepLinkSpread?: number | null;
};

type Slide = {
  key: string;
  /** Content width; the slide's own width is this plus the 200px padding. */
  width: number;
  /** Card copy shown in the corner while this slide is centred. */
  copy: CardCopy;
  render: (p: SlideProps) => ReactNode;
};

/** Centres a piece inside its Figma bounding box and applies its rotation. */
function Rotated({
  width,
  height,
  deg,
  children,
}: {
  width: number;
  height: number;
  deg: number;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-center" style={{ width, height }}>
      <div className="shrink-0" style={{ transform: `rotate(${deg}deg)` }}>
        {children}
      </div>
    </div>
  );
}

/* ⚠️ PLACEHOLDER COPY — the Figma card carries "Section 1 / Component Name /
   Component Descriptions" as dummy text. Replace the strings below with the
   real section names and blurbs; nothing else needs to change. */
const SLIDES: Slide[] = [
  {
    key: "stickers",
    width: 776.948,
    copy: {
      eyebrow: "Section 1",
      name: "Playground",
      description: "Loose experiments, side projects and things made for the fun of making them.",
    },
    render: ({ theme }) => (
      <div className="relative" style={{ width: 776.948, height: 507.678 }}>
        <div className="absolute left-0 top-0 scale-y-[-1]">
          <GoldenRatioMat theme={theme} className="h-[507.678px] w-[776.948px]" />
        </div>
        <div className="absolute left-[110.55px] top-[113.53px]">
          <Sticker n={1} className="h-[169.592px] w-[179.413px]" />
        </div>
        <div className="absolute left-[319.55px] top-[270.53px]">
          <Sticker n={2} className="h-[184.736px] w-[226.12px]" />
        </div>
        <div className="absolute left-[475.55px] top-[52.53px]">
          <Sticker n={3} className="h-[169.017px] w-[191.169px]" />
        </div>
      </div>
    ),
  },
  {
    key: "file",
    width: 1070,
    copy: {
      eyebrow: "Section 3",
      name: "Case Studies",
      description: "Selected product work, from the messy middle through to what shipped.",
    },
    render: ({ theme, fileOpen, onFileOpenChange, deepLinkProject }) => (
      <div className="flex items-center justify-center" style={{ width: 1070, height: boxed(739.28) }}>
        <FileFolder
          theme={theme}
          open={fileOpen}
          onOpenChange={onFileOpenChange}
          deepLinkProject={deepLinkProject}
        />
      </div>
    ),
  },
  {
    key: "book",
    width: 1200,
    copy: {
      eyebrow: "Section 4",
      name: "About Me",
      description: "How I got here, how I like to work, and what I am chasing next.",
    },
    render: ({ theme, bookOpen, onBookOpenChange, deepLinkSpread }) => (
      <div className="flex items-center justify-center" style={{ width: 1200, height: boxed(717.823) }}>
        <AboutBook
          theme={theme}
          open={bookOpen}
          onOpenChange={onBookOpenChange}
          deepLinkSpread={deepLinkSpread}
          restTilt={0}
        />
      </div>
    ),
  },
  {
    key: "cv",
    width: 712.095,
    copy: {
      eyebrow: "Section 5",
      name: "Résumé",
      description: "Roles, dates and the short version — one page, kept current.",
    },
    render: () => (
      <Rotated width={712.095} height={876.878} deg={-6.03}>
        {/* CvV1 draws at 75% of its box, so the percentage box is sized up to
            land the sheet at Figma's 629.933x815.208 — and clipped to that by
            the wrapper, which is what the rotation centres on. */}
        <div className="relative" style={{ width: 629.933, height: 815.208 }}>
          <div className="absolute left-0 top-0" style={{ width: 839.911, height: 1086.944 }}>
            <CvV1 />
          </div>
        </div>
      </Rotated>
    ),
  },
];

/** Shown before the first swipe, while the card is still the introduction. */
const INTRO_COPY: CardCopy = {
  eyebrow: "Hello, I Am Dvija,",
  name: "Product Desiger",
  description: "An intentional process of creating experiences that are invisible to the end user.",
};

const N = SLIDES.length;
const SLIDE_W = SLIDES.map((s) => s.width + SLIDE_PAD * 2);
/** Running left edge of slide i within one lap of the track. */
const PREFIX = SLIDE_W.reduce<number[]>(
  (acc, w) => [...acc, acc[acc.length - 1] + w + SLIDE_GAP],
  [0],
);
const LAP = PREFIX[N];

const mod = (n: number, m: number) => ((n % m) + m) % m;
/** Left edge of the (unbounded) virtual slide index `k`. */
const leftOf = (k: number) => Math.floor(k / N) * LAP + PREFIX[mod(k, N)];
const centreOf = (k: number) => leftOf(k) + SLIDE_W[mod(k, N)] / 2;

/* ------------------------------------------------------------------ */
/* The card and cup: centred at rest, top-left corner once swiped      */
/* ------------------------------------------------------------------ */

/** Card at Figma's rendered size — 502.476x307.867, rotated -7.86deg. */
const CARD_RENDER_W = 502.476;
const CARD_BOX = { w: 539.856, h: 373.687 };
/** Resting (corner) position, Figma 190:9395. */
const CARD_CORNER = { x: -27, y: -140 };
/** Cup in the corner: unrotated and a touch larger, Figma 190:9396. */
const CUP_CORNER = { x: 495.949, y: -52, w: 290.516, h: 293.633 };

/* Where the pair sits before the first swipe: the old intro slide's geometry,
   a 687.478x581.975 group centred in the window and in the track. */
const INTRO_GROUP = { w: 687.478, h: 581.975 };
const INTRO_LEFT = ORGANIZED_W / 2 - INTRO_GROUP.w / 2;
const INTRO_TOP = TRACK_TOP + (TRACK_H - INTRO_GROUP.h) / 2;
/* The pair occupies a slot of its own on the track, sitting just before slide
   0. Pre-swipe the track centres that slot and everything behind it is pushed
   back by its width; both undo themselves on the first swipe. */
const INTRO_SLOT = INTRO_GROUP.w + SLIDE_PAD * 2 + SLIDE_GAP;
const INTRO_OFFSET = ORGANIZED_W / 2 + (INTRO_SLOT - SLIDE_GAP) / 2;

/** Card: bbox at (0, 208.29) in the group. Cup: bbox at (329, 0), rotated -20. */
const CARD_INTRO = { x: INTRO_LEFT, y: INTRO_TOP + 208.29 };
const CUP_INTRO = { x: INTRO_LEFT + 329, y: INTRO_TOP, w: 358.478, h: 360.425 };

const CARD_SHIFT = { x: CARD_INTRO.x - CARD_CORNER.x, y: CARD_INTRO.y - CARD_CORNER.y };
const CUP_SHIFT = {
  x: CUP_INTRO.x + CUP_INTRO.w / 2 - (CUP_CORNER.x + CUP_CORNER.w / 2),
  y: CUP_INTRO.y + CUP_INTRO.h / 2 - (CUP_CORNER.y + CUP_CORNER.h / 2),
};
/** The cup is drawn at the corner size, so shrink it back for the intro pose. */
const CUP_INTRO_SCALE = 278.817 / CUP_CORNER.w;

const GLIDE = "transform 720ms cubic-bezier(0.22, 0.61, 0.36, 1)";

/** How far a piece must be dragged before the track commits to the next slide. */
const SWIPE_THRESHOLD = 90;
/**
 * Slides kept mounted either side of the active one — capped so the window can
 * never be wider than the track itself. With the pencil box off the track there
 * are only four slides, and a window of 2 renders five, which mounted one slide
 * (and so one FileFolder) twice: two instances sharing `fileOpen`, both reacting
 * to the same state.
 */
const WINDOW = Math.min(2, Math.floor((SLIDES.length - 1) / 2));

/**
 * The pencil box is not on the swipe track — Figma parks it on the desk itself
 * (`Group 3`, 265:10510, inside macscreen_div 159:3991). Positions below are
 * each piece's *unrotated* top-left in the 1729x1117 scene, derived from the
 * Figma bounding boxes and rotations so CSS `rotate()` about the centre lands
 * them where the design has them.
 */
const DESK_PENCILS = {
  box: { left: 1068.4, top: 933.4, w: 726, h: 726.2, deg: -20.02 },
  loose: [
    { color: "cyan", left: 1955.0, top: 831.0, deg: -23.64 },
    // Moved off the mat stand to the clear desk on the left; laid near
    // horizontal because that strip is only ~200 units tall and a 656-long
    // pencil at the old -27.52 would have run off the desk's bottom edge.
    { color: "purple", left: 313, top: 619, deg: -75 },
    { color: "yellow", left: 932.0, top: 818.0, deg: 0 },
  ] as const,
};
/** Figma draws the loose pencils at 33.7 x 656. */
const DESK_PENCIL_W = 33.7;
const DESK_PENCIL_H = 656;

/** The folder opens by arriving at the centre here, not by being clicked. */
const FILE_SLIDE = SLIDES.findIndex((s) => s.key === "file");
/** Where a /work-experience deep link lands the carousel. */
const BOOK_SLIDE = SLIDES.findIndex((s) => s.key === "book");

export function OrganizedScene({
  theme,
  bookOpen,
  onBookOpenChange,
  fileOpen,
  onFileOpenChange,
  scale,
  deepLinkProject = null,
  deepLinkSpread = null,
  landOnFile = false,
}: SlideProps & {
  /** Stage `fit` scale, so pointer deltas convert back to scene units. */
  scale: number;
  /** Land centred on the folder slide, open (/projects and deep links). */
  landOnFile?: boolean;
}) {
  // A deep link or /projects lands directly on the file slide, folder open;
  // /work-experience lands directly on the book slide instead — either way,
  // no intro card, no first swipe needed.
  const startOnFile = deepLinkProject != null || landOnFile;
  const startOnBook = deepLinkSpread != null;
  const [active, setActive] = useState(
    startOnFile ? FILE_SLIDE : startOnBook ? BOOK_SLIDE : 0,
  );
  /** False until the first gesture, while the card still reads as the intro. */
  const [swiped, setSwiped] = useState(startOnFile || startOnBook);

  // Swiping *is* the trigger in this mode: the folder opens when it lands in
  // the active position and closes again as soon as it is swiped past, so only
  // the folder the viewer is actually looking at is ever open.
  const isFileActive = swiped && mod(active, N) === FILE_SLIDE;
  useEffect(() => {
    onFileOpenChange(isFileActive);
  }, [isFileActive, onFileOpenChange]);
  const [drag, setDrag] = useState(0);
  const dragging = useRef<{ x: number; moved: boolean } | null>(null);
  const wheelLock = useRef(0);
  // Mirrors `swiped` so `step` can branch on it without nesting one setState
  // inside another updater — those run twice under StrictMode and would count
  // the gesture twice.
  const swipedRef = useRef(startOnFile || startOnBook);

  // The first gesture spends itself on clearing the intro: the card leaves for
  // the corner and the track slides its own slot's worth, which brings slide 0
  // (or the last slide, going backwards) to the centre without a double jump.
  const step = useCallback((dir: number) => {
    if (!swipedRef.current) {
      swipedRef.current = true;
      setSwiped(true);
      if (dir < 0) setActive((a) => a - 1);
      return;
    }
    setActive((a) => a + dir);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // setPointerCapture retargets the ensuing pointerup/click to the track
    // itself, which would swallow a plain tap on a click-to-open piece (e.g.
    // AboutBook's cover) before it ever reaches the piece's own handler.
    if ((e.target as HTMLElement).closest?.("[data-no-track-drag]")) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = { x: e.clientX, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = (e.clientX - dragging.current.x) / scale;
    if (Math.abs(dx) > 4) dragging.current.moved = true;
    setDrag(dx);
  };
  const endDrag = () => {
    if (!dragging.current) return;
    const dx = drag;
    dragging.current = null;
    setDrag(0);
    if (dx <= -SWIPE_THRESHOLD) step(1);
    else if (dx >= SWIPE_THRESHOLD) step(-1);
  };

  // Trackpad/shift-wheel horizontal scrolling, rate-limited to one slide per
  // gesture so a single flick doesn't fly through the whole loop.
  useEffect(() => {
    const el = document.getElementById("organized-track");
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheelLock.current < 450 || Math.abs(dx) < 12) return;
      wheelLock.current = now;
      step(dx > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const slideProps: SlideProps = {
    theme,
    bookOpen,
    onBookOpenChange,
    fileOpen,
    onFileOpenChange,
    deepLinkProject,
    deepLinkSpread,
  };

  // While the intro is up the track is parked on the card's own slot, so the
  // card owns the centre and slide 0 waits just off the right edge.
  const offset = (swiped ? ORGANIZED_W / 2 - centreOf(active) : INTRO_OFFSET) + drag;
  const window_: number[] = [];
  for (let k = active - WINDOW; k <= active + WINDOW; k++) window_.push(k);

  return (
    <div className="relative overflow-hidden" style={{ width: ORGANIZED_W, height: ORGANIZED_H }}>
      {/* Fixed desk under the track. */}
      <div className="absolute left-[-324px] top-[-192px] rotate-[6.92deg]">
        <CuttingMat theme={theme} className="h-[1009.72px] w-[1545.26px]" />
      </div>

      {/* Pencil box and its loose pencils, parked on the desk rather than
          riding the track (see DESK_PENCILS). */}
      {DESK_PENCILS.loose.map((p) => (
        <div
          key={p.color}
          className="absolute"
          style={{
            left: p.left,
            top: p.top,
            width: DESK_PENCIL_W,
            height: DESK_PENCIL_H,
            transform: `rotate(${p.deg}deg)`,
          }}
        >
          <Pencil color={p.color} theme={theme} className="h-full w-full" />
        </div>
      ))}
      <div
        className="absolute"
        style={{
          left: DESK_PENCILS.box.left,
          top: DESK_PENCILS.box.top,
          width: DESK_PENCILS.box.w,
          height: DESK_PENCILS.box.h,
          transform: `rotate(${DESK_PENCILS.box.deg}deg)`,
        }}
      >
        {/* PencilBox scales itself off its container's height, so the box has
            to be given the padded height (see `boxed`) while the positioned
            wrapper keeps the design's real footprint. */}
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ width: DESK_PENCILS.box.w, height: boxed(DESK_PENCILS.box.h) }}
        >
          <PencilBox theme={theme} omit={DESK_PENCILS.loose.map((p) => p.color)} />
        </div>
      </div>

      {/* Card and cup sit between the cutting mat and the desk, as Figma
          layers them — the track passes over the top of both. */}
      <div
        className="absolute"
        style={{
          left: CARD_CORNER.x,
          top: CARD_CORNER.y,
          width: CARD_BOX.w,
          height: CARD_BOX.h,
          transform: swiped ? undefined : `translate(${CARD_SHIFT.x}px, ${CARD_SHIFT.y}px)`,
          transition: GLIDE,
        }}
      >
        <Rotated width={CARD_BOX.w} height={CARD_BOX.h} deg={-7.86}>
          <ComponentCard
            copy={swiped ? SLIDES[mod(active, N)].copy : INTRO_COPY}
            theme={theme}
            intro={!swiped}
            width={CARD_RENDER_W}
          />
        </Rotated>
      </div>
      <div
        className="absolute"
        style={{
          left: CUP_CORNER.x,
          top: CUP_CORNER.y,
          width: CUP_CORNER.w,
          height: CUP_CORNER.h,
          transform: swiped
            ? undefined
            : `translate(${CUP_SHIFT.x}px, ${CUP_SHIFT.y}px) rotate(-20deg) scale(${CUP_INTRO_SCALE})`,
          transition: GLIDE,
        }}
      >
        <CoffeeCup theme={theme} className="h-full w-full" />
      </div>

      {/* The desk surface is the backdrop: it sits behind every other piece,
          the cutting mat included. */}
      <div className="absolute left-[-739px] top-[507px] z-[-1] rotate-[-5.25deg]">
        <DeskMat theme={theme} className="h-[1093px] w-[3044px]" />
      </div>
      <div className="absolute left-[1397px] top-[-121.08px] rotate-[-67.73deg]">
        <Coaster theme={theme} className="h-[359px] w-[361px]" />
      </div>

      <div
        id="organized-track"
        className="absolute left-0 select-none"
        style={{ top: TRACK_TOP, width: ORGANIZED_W, height: TRACK_H, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            transform: `translateX(${offset}px)`,
            transition: dragging.current ? "none" : "transform 620ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          }}
        >
          {window_.map((k) => {
            const slide = SLIDES[mod(k, N)];
            return (
              <div
                key={k}
                className="absolute top-0 flex items-center justify-center"
                style={{
                  left: leftOf(k),
                  width: SLIDE_W[mod(k, N)],
                  height: TRACK_H,
                  paddingLeft: SLIDE_PAD,
                  paddingRight: SLIDE_PAD,
                  // Slides behind the intro slot are held back by its width
                  // until the first swipe closes the gap.
                  transform: !swiped && k < 0 ? `translateX(${-INTRO_SLOT}px)` : undefined,
                  transition: GLIDE,
                }}
              >
                {slide.render(slideProps)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
