import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { SvgPiece, type Theme } from "./Piece";
import { Sticker } from "./Sticker";
import { useIsTouch } from "./useIsTouch";
import { useElementScale } from "./useElementScale";
import { useCenterOnPiece } from "./ScatteredFocus";

const PAGE_WIDTH = 671;
const PAGE_HEIGHT = 900;
const BOOK_WIDTH = PAGE_WIDTH * 2;
const SPINE_X = PAGE_WIDTH;
// Recenters the single closed-cover panel when the scene (sized for the full
// two-page spread) is showing just the right half of itself.
const CLOSED_SHIFT_X = -PAGE_WIDTH / 2;
/** How far a corner hover lifts the page before the click commits (book px). */
const CORNER_ZONE = 170;

/* The designed paper sits inset inside the 1342×900 spread canvas — the
 * remaining margin is the yellow cover border. Corner affordances must track
 * the paper rect (rounded ~37px at the outer corners), not the canvas. */
const PAPER = { x0: 18, y0: 20, x1: 1324, y1: 879 };
const PAPER_CORNER_RADIUS = 36;
/** Rest tilt of the book on the desk; straightens to 0 while the book is open. */
const REST_TILT = -4.73;

/** The three designed spreads, one file per two-page view, in reading order:
 *  intro + photo grid → work experience + education → how I see things. */
const SPREADS = [
  "/assets/aboutme/spread-1.svg",
  "/assets/aboutme/spread-2.svg",
  "/assets/aboutme/spread-3.svg",
];
const LAST_SPREAD = SPREADS.length;

/* ── Photos ──
 * Each spread export ships its photos as empty placeholder rects, so the
 * pictures are laid in over the SVG rather than baked into it: swapping one
 * is a file swap, not a re-export from Figma. Coordinates are the spread's
 * own 1342×900 canvas, copied from the placeholder rects, so the overlay
 * lands wherever the art does — including on the flap and incoming page
 * mid-turn, since every copy of a spread goes through SpreadArt. */
/** The still-flat remainder of the turning page, published per frame by the
 *  fold tween. Defaults to the whole page so a missing var is a no-op. */
const OUTGOING_CLIP = `var(--fold-outgoing-clip, polygon(0px 0px, ${PAGE_WIDTH}px 0px, ${PAGE_WIDTH}px ${PAGE_HEIGHT}px, 0px ${PAGE_HEIGHT}px))`;

const PHOTO_RADIUS = 12;
type Photo = { src: string; x: number; y: number; w: number; h: number };
const PHOTOS: Photo[][] = [
  // Spread 1 — the four-up grid on the right page.
  [
    { src: "/assets/aboutme/Images/Image_1.jpg", x: 731, y: 80, w: 251.5, h: 280 },
    { src: "/assets/aboutme/Images/Image_2.jpg", x: 1012.5, y: 80, w: 251.5, h: 354.5 },
    { src: "/assets/aboutme/Images/Image_3.jpg", x: 731, y: 390, w: 251.5, h: 429 },
    { src: "/assets/aboutme/Images/Image_4.jpg", x: 1012.5, y: 464.5, w: 251.5, h: 354.5 },
  ],
  // Spread 2 — the pair under Education, facing work experience.
  [
    { src: "/assets/aboutme/Images/Image_5.jpg", x: 738, y: 446, w: 244.5, h: 280 },
    { src: "/assets/aboutme/Images/Image_6.jpg", x: 1012.5, y: 539, w: 244.5, h: 280 },
  ],
  // Spread 3 — the full-bleed plate under "How I See Things".
  [{ src: "/assets/aboutme/Images/Image_7.jpg", x: 78, y: 177, w: 533, h: 642 }],
];

/* ── Stickers ──
 * The two black note cards the exports used to carry ("I'm open to
 * opportunities" on spread 1, "Send your thought on Email" on spread 3)
 * are deleted out of the SVGs; these sit in the holes they left. x/y is
 * the card's own visual centre in the 1342×900 canvas, and the tilt is
 * the card's — so the stickers read as hand-stuck at the same angle the
 * paper note was. Overlaid through SpreadArt, same as the photos, so they
 * ride the flap and incoming page through a turn.
 */
type StickerArt = { n: 1 | 2 | 3; cx: number; cy: number; w: number; h: number; rot: number };
const STICKERS: StickerArt[][] = [
  // Spread 1 — bottom of the intro page.
  [{ n: 1, cx: 237.95, cy: 659.05, w: 250, h: 236.3, rot: -4.61 }],
  // Spread 2 — none.
  [],
  // Spread 3 — bottom of the reading-list page.
  [{ n: 2, cx: 1123.5, cy: 678.5, w: 250, h: 204.3, rot: 5 }],
];

/**
 * One spread's artwork: the exported SVG with its photos dropped into the
 * placeholder rects. Always the full 1342×900 canvas — callers slide it with
 * `left` to choose which half shows, exactly as they did with the bare image.
 */
function SpreadArt({ spread, style }: { spread: number; style?: CSSProperties }) {
  return (
    <div
      className="absolute top-0 left-0"
      style={{ width: BOOK_WIDTH, height: PAGE_HEIGHT, ...style }}
    >
      <SvgPiece
        src={SPREADS[spread - 1]}
        alt=""
        aria-hidden="true"
        className="absolute left-0 top-0"
        style={{ width: BOOK_WIDTH, height: PAGE_HEIGHT, maxWidth: "none" }}
      />
      {PHOTOS[spread - 1].map((photo) => (
        <img
          key={photo.src}
          src={photo.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute block max-w-none select-none"
          style={{
            left: photo.x,
            top: photo.y,
            width: photo.w,
            height: photo.h,
            objectFit: "cover",
            borderRadius: PHOTO_RADIUS,
          }}
        />
      ))}
      {STICKERS[spread - 1].map((sticker) => (
        <div
          key={sticker.n}
          className="absolute"
          style={{
            left: sticker.cx - sticker.w / 2,
            top: sticker.cy - sticker.h / 2,
            width: sticker.w,
            height: sticker.h,
            transform: `rotate(${sticker.rot}deg)`,
            pointerEvents: "none",
          }}
        >
          <Sticker n={sticker.n} className="block h-full w-full max-w-none" />
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── turn.js corner-fold geometry ─────────────────────────
 * Ported from the old portfolio's InteractiveBook. A page is folded by
 * reflecting its grabbed corner across a moving crease line. For progress
 * t ∈ [0,1] we compute:
 *   • outgoingClip — clip-path keeping the part of the page that stays flat
 *   • flapClip / flapMatrix — the folded region, reflected across the crease
 *   • flapShadow — a gradient darkening the flap toward the crease */

type Pt = { x: number; y: number };
type Corner = "tl" | "tr" | "bl" | "br";

// Clip a convex polygon by the half-plane { (X - M)·N >= 0 } (Sutherland–Hodgman).
function clipHalfPlane(poly: Pt[], M: Pt, N: Pt): Pt[] {
  const inside = (p: Pt) => (p.x - M.x) * N.x + (p.y - M.y) * N.y >= 0;
  const intersect = (a: Pt, b: Pt): Pt => {
    const da = (a.x - M.x) * N.x + (a.y - M.y) * N.y;
    const db = (b.x - M.x) * N.x + (b.y - M.y) * N.y;
    const s = da / (da - db);
    return { x: a.x + s * (b.x - a.x), y: a.y + s * (b.y - a.y) };
  };
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

function toClipPath(poly: Pt[]): string {
  if (poly.length < 3) return "polygon(0 0, 0 0, 0 0)"; // empty → invisible
  return `polygon(${poly.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

function computeCornerFold(
  t: number,
  corner: Corner,
  W: number,
  H: number,
): { outgoingClip: string; flapClip: string; flapMatrix: string; flapShadow: string } {
  const rect: Pt[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];

  // Grabbed corner S travels across the spine to P (mirrored horizontally),
  // arcing perpendicular to the travel so the crease is diagonal.
  const onRight = corner === "tr" || corner === "br";
  const onBottom = corner === "bl" || corner === "br";
  const S: Pt = { x: onRight ? W : 0, y: onBottom ? H : 0 };
  const tt = Math.max(t, 0.0001);
  const lift = Math.sin(Math.PI * tt) * H * 0.33;
  const liftDir = onBottom ? -1 : 1;
  const P: Pt = {
    x: onRight ? W - tt * 2 * W : tt * 2 * W,
    y: S.y + liftDir * lift,
  };

  // Crease = perpendicular bisector of S→P. N points from the folded (S) side
  // toward the flat (P) side, so { (X-M)·N >= 0 } is the part that stays flat.
  const M: Pt = { x: (S.x + P.x) / 2, y: (S.y + P.y) / 2 };
  const N: Pt = { x: P.x - S.x, y: P.y - S.y };
  const nlen = Math.hypot(N.x, N.y);
  if (nlen < 0.5) {
    return {
      outgoingClip: toClipPath(rect),
      flapClip: "polygon(0 0, 0 0, 0 0)",
      flapMatrix: "none",
      flapShadow: "none",
    };
  }

  const outgoing = clipHalfPlane(rect, M, N);
  const footprint = clipHalfPlane(rect, M, { x: -N.x, y: -N.y });

  // Reflection of the footprint across the crease (line through M, normal n̂).
  const nx = N.x / nlen;
  const ny = N.y / nlen;
  const a = 1 - 2 * nx * nx;
  const b = -2 * nx * ny;
  const c = -2 * nx * ny;
  const d = 1 - 2 * ny * ny;
  const e = M.x - (a * M.x + c * M.y);
  const f = M.y - (b * M.x + d * M.y);

  // Shadow darkens the flap toward the crease: gradient runs along N.
  const angleDeg = (Math.atan2(N.y, N.x) * 180) / Math.PI;
  const flapShadow = `linear-gradient(${angleDeg.toFixed(1)}deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0) 60%)`;

  return {
    outgoingClip: toClipPath(outgoing),
    flapClip: toClipPath(footprint),
    flapMatrix: `matrix(${a.toFixed(5)}, ${b.toFixed(5)}, ${c.toFixed(5)}, ${d.toFixed(5)}, ${e.toFixed(2)}, ${f.toFixed(2)})`,
    flapShadow,
  };
}

type FlipState = {
  from: number;
  to: number;
  corner: Corner;
  mode: "peek" | "turn";
};

/**
 * The corner peek, per the reference: a clean dog-ear. The crease runs
 * corner-box diagonal, the page corner folds inward as a white triangle
 * with a rounded tip and a thin ink edge, and the corner region under the
 * fold reads as the plain paper behind. Canonical form is the bottom-left
 * corner; the other three are mirrors of it.
 */
function DogEar({ corner, size, active }: { corner: Corner; size: number; active: boolean }) {
  const s = size;
  const r = 16;
  const transform =
    corner === "bl"
      ? undefined
      : corner === "br"
        ? `translate(${s},0) scale(-1,1)`
        : corner === "tr"
          // 180° about the box centre sends the canonical shape's touch
          // point (box-local bottom-left) to the diagonally opposite
          // corner — top-right — which is what this branch is for.
          ? `rotate(180 ${s / 2} ${s / 2})`
          // tl: a vertical mirror sends bottom-left to top-left instead.
          : `translate(0,${s}) scale(1,-1)`;
  // The fold is part of the page, so it must never poke past the paper's
  // rounded outer corner — clip the box to the page shape at this corner.
  const clip =
    corner === "tl"
      ? `${PAPER_CORNER_RADIUS}px 0 0 0`
      : corner === "tr"
        ? `0 ${PAPER_CORNER_RADIUS}px 0 0`
        : corner === "bl"
          ? `0 0 0 ${PAPER_CORNER_RADIUS}px`
          : `0 0 ${PAPER_CORNER_RADIUS}px 0`;
  // The box scales from nothing up to its full size anchored at the true
  // page corner — the Figma reference's own hover affordance grows the
  // fold out of the corner point rather than fading in a fixed shape.
  const origin =
    corner === "tl" ? "0% 0%" : corner === "tr" ? "100% 0%" : corner === "bl" ? "0% 100%" : "100% 100%";
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        width: s,
        height: s,
        borderRadius: clip,
        transform: `scale(${active ? 1 : 0})`,
        transformOrigin: origin,
        transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        style={{ display: "block", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.14))" }}
        >
        <g transform={transform}>
          {/* The corner region under the fold — plain paper behind. */}
          <path d={`M0 0 L0 ${s} L${s} ${s} Z`} fill="#FDFEFF" />
          {/* The folded flap, tip rounded, pointing into the page. */}
          <path
            d={`M0 0 L${s} ${s} L${s} ${r} Q${s} 0 ${s - r} 0 Z`}
            fill="#FDFEFF"
            stroke="#2F2F2F"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * A spread's paper only — never its export's own baked-in yellow cover
 * margin. Every `spread-N.svg` flattens both into one image, at a fixed
 * position that's identical across spreads, which reads as a normal border
 * while the page sits still. During a turn, the flap and incoming-page
 * overlays reflect/clip that same image, and dragging the margin along with
 * a transform meant for paper sends it somewhere no real edge is — the bug
 * this crops away. The resting page underneath is never unmounted mid-turn,
 * so once the moving pieces stop carrying their own copy of the margin, its
 * one correctly-fixed copy just shows through.
 */
function PaperPage({ spread, onRight }: { spread: number; onRight: boolean }) {
  const marginOuter = PAGE_WIDTH - (PAPER.x1 - SPINE_X); // == PAPER.x0
  const marginTop = PAPER.y0;
  const marginBottom = PAGE_HEIGHT - PAPER.y1;
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        top: marginTop,
        bottom: marginBottom,
        left: onRight ? 0 : marginOuter,
        right: onRight ? marginOuter : 0,
        borderRadius: onRight
          ? `0 ${PAPER_CORNER_RADIUS}px ${PAPER_CORNER_RADIUS}px 0`
          : `${PAPER_CORNER_RADIUS}px 0 0 ${PAPER_CORNER_RADIUS}px`,
      }}
    >
      <SpreadArt
        spread={spread}
        style={{
          top: -marginTop,
          left: (onRight ? -PAGE_WIDTH : 0) - (onRight ? 0 : marginOuter),
        }}
      />
    </div>
  );
}

export function AboutBook({
  theme,
  open,
  onOpenChange,
  restTilt = REST_TILT,
  className,
  deepLinkSpread = null,
}: {
  theme: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Desk tilt while closed (ScatteredScene). Straightens to 0 while open. */
  restTilt?: number;
  className?: string;
  /** Spread to land on already open, no animation (deep link from
   *  /work-experience). Consumed once, on mount. */
  deepLinkSpread?: number | null;
}) {
  const isTouch = useIsTouch();
  const [hovered, setHovered] = useState(false);
  /** Which spread (1-based) is currently lying open. */
  const [spread, setSpread] = useState(deepLinkSpread ?? 1);
  /** Live corner fold — peek (hover), turn (commit), retract (hover out). */
  const [flip, setFlip] = useState<FlipState | null>(null);
  /**
   * True once the *opening* tween has actually finished — distinct from
   * `open`, which flips the instant the click happens. Page-turn and corner
   * hover zones wait for this: the corner zones now cover half the page
   * (see cornerHitZones), so a mouse anywhere near the still-animating
   * cover would otherwise land inside one and peek a page that visually
   * hasn't opened yet. Closing drops it immediately, no tween to wait for.
   */
  const [settled, setSettled] = useState(false);
  const centerOnPiece = useCenterOnPiece();
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** True only through the very first open — a deep link lands already
   *  open, so that first transition skips its tween and snaps straight to
   *  the end state instead of animating in from closed. */
  const instantOpenRef = useRef(deepLinkSpread != null);

  // Deep-link landing: bring the book to the middle of the viewport the
  // same way a click would, on the off chance it's reached in Scattered
  // mode. In Organised mode centerOnPiece is null (the carousel already
  // owns centring the active slide), so this is a safe no-op there.
  useLayoutEffect(() => {
    if (deepLinkSpread == null) return;
    const t = window.setTimeout(() => {
      if (centerOnPiece && buttonRef.current) void centerOnPiece(buttonRef.current);
    }, 150);
    return () => window.clearTimeout(t);
    // Runs once on mount: deepLinkSpread is read once, same as FileFolder's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sceneRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef<HTMLImageElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const foldTRef = useRef(0);
  const isFlippingRef = useRef(false);

  // 1. Keep a persistent reference to the GSAP context
  const ctx = useRef<gsap.Context | undefined>(undefined);

  const { containerRef, scale } = useElementScale(PAGE_WIDTH, PAGE_HEIGHT);

  // 2. INITIAL SETUP: Run only once on mount to establish the base structure
  useEffect(() => {
    const scene = sceneRef.current;
    const closed = closedRef.current;
    const leftPage = leftPageRef.current;
    const rightPage = rightPageRef.current;

    if (!scene || !closed || !leftPage || !rightPage) return;

    ctx.current = gsap.context(() => {
      gsap.set(scene, {
        perspective: 2000,
        x: open ? 0 : CLOSED_SHIFT_X,
        rotation: open ? 0 : restTilt,
        willChange: "transform",
      });

      // The cover's own left edge sits exactly on the spine (same box as
      // rightPage below) with the rotation pivot pinned there too, so it
      // swings open like a real hinge instead of spinning around its middle.
      gsap.set(closed, {
        left: SPINE_X,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        transformOrigin: "left center",
        rotateY: 0,
        rotation: 0,
        scale: 1,
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
      });

      // Pages unfurl with a 2D scaleX anchored at the spine rather than a 3D
      // flip — a page visibly growing out of the hinge reads as "opening"
      // far more clearly than a rotateY that has to fight backface visibility.
      gsap.set(leftPage, {
        left: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        transformOrigin: "right center",
        scaleX: 0,
        opacity: 0,
      });

      gsap.set(rightPage, {
        left: SPINE_X,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        transformOrigin: "left center",
        scaleX: 0,
        opacity: 0,
      });
    }, scene);

    // Only revert when the component actually unmounts
    return () => ctx.current?.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. ANIMATION HANDLER: Runs every time `open` toggles
  useEffect(() => {
    const scene = sceneRef.current;
    const closed = closedRef.current;
    const leftPage = leftPageRef.current;
    const rightPage = rightPageRef.current;

    if (!ctx.current || !scene || !closed || !leftPage || !rightPage) return;

    if (!open) {
      // Closing abandons any mid-turn page: the fold overlay drops and the
      // book is back on its first spread next time it opens. Nothing to
      // wait for here — the corner/turn zones go dead immediately.
      setFlip(null);
      isFlippingRef.current = false;
      foldTRef.current = 0;
      setSpread(1);
      setSettled(false);
    }

    // By adding to the existing context, we safely update tweens without wiping inline styles
    ctx.current.add(() => {
      // Kill any in-progress tweens so rapid toggling is buttery smooth
      gsap.killTweensOf([scene, closed, leftPage, rightPage]);

      // Deep-link landing: already open on mount, so there is nothing to
      // play — jump straight to the open end-state instead of animating in
      // from closed. Only ever true for this first run.
      if (open && instantOpenRef.current) {
        instantOpenRef.current = false;
        gsap.set(scene, { x: 0, rotation: 0 });
        gsap.set(closed, { rotateY: -180, opacity: 0 });
        gsap.set([leftPage, rightPage], { opacity: 1, scaleX: 1 });
        setSettled(true);
        return;
      }

      const tl = gsap.timeline();

      if (open) {
        // Recenter the scene for the full spread, and swing the cover open
        // on the spine hinge together. The cover fades out as it approaches
        // edge-on — backfaceVisibility alone would cut it off in a single
        // frame at 90deg, which reads as a pop, not a turn.
        tl.to(scene, { x: 0, rotation: 0, duration: 0.55, ease: "power2.inOut" }, 0);
        tl.to(closed, { rotateY: -180, duration: 0.7, ease: "power2.inOut" }, 0);
        tl.to(closed, { opacity: 0, duration: 0.14, ease: "power1.in" }, 0.21);
        // Pages unfurl at full opacity once the cover has passed — growing
        // out of the hinge as ghosts (opacity + scale together) reads cheap.
        tl.set([leftPage, rightPage], { opacity: 1 }, 0.42);
        tl.to([leftPage, rightPage], { scaleX: 1, duration: 0.4, ease: "power2.out" }, 0.42);
        tl.call(() => setSettled(true));
      } else {
        // The cover materialises just before it swings back past edge-on
        // (it is a near-invisible sliver at 90deg, so the fade-in is
        // imperceptible), while the pages fold into the spine underneath it.
        tl.to([leftPage, rightPage], { scaleX: 0, duration: 0.3, ease: "power2.in" }, 0);
        tl.set([leftPage, rightPage], { opacity: 0 }, 0.3);
        tl.to(closed, { rotateY: 0, duration: 0.6, ease: "power2.inOut" }, 0);
        tl.set(closed, { opacity: 1 }, 0.26);
        tl.to(scene, { x: CLOSED_SHIFT_X, rotation: restTilt, duration: 0.6, ease: "power2.inOut" }, 0);
      }
    });
  }, [open]);

  // 4. HOVER HANDLER: a small tilt/lift affordance — opening only happens on click/tap
  useEffect(() => {
    const closed = closedRef.current;
    if (!ctx.current || !closed) return;

    ctx.current.add(() => {
      if (hovered && !open) {
        gsap.to(closed, { rotation: -1.5, scale: 1.02, duration: 0.4, ease: "back.out(1.7)" });
      } else {
        gsap.to(closed, { rotation: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" });
      }
    });
  }, [hovered, open]);

  // Escape closes the book from any spread.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  /* ───────────────────────── page turning ───────────────────────── */

  const cornerTarget = (corner: Corner) => {
    const onRight = corner === "tr" || corner === "br";
    return onRight ? spread + 1 : spread - 1;
  };
  const cornerEnabled = (corner: Corner) => {
    const onRight = corner === "tr" || corner === "br";
    return onRight ? spread < LAST_SPREAD : spread > 1;
  };

  // Hover in: grow the corner's dog-ear (peek). Hover out: shrink it away —
  // the DogEar below is always mounted and purely CSS-transitions its own
  // scale, so there is no fade-out mount lifetime to coordinate here.
  const peekCorner = (corner: Corner) => {
    if (isFlippingRef.current || !cornerEnabled(corner)) return;
    setFlip({ from: spread, to: cornerTarget(corner), corner, mode: "peek" });
  };
  const unpeekCorner = (corner: Corner) => {
    setFlip((f) => (f && f.mode === "peek" && f.corner === corner ? null : f));
  };
  // Click: run the full turn (continuing from wherever the peek left off).
  const turnCorner = (corner: Corner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFlippingRef.current || !cornerEnabled(corner)) return;
    isFlippingRef.current = true;
    setFlip({ from: spread, to: cornerTarget(corner), corner, mode: "turn" });
  };

  // Drive the fold. Peek is a pure CSS scale transition on the dog-ear
  // itself (see DogEar); only the committed turn runs the crease-fold tween
  // here. CSS custom properties on the scene carry the per-frame geometry,
  // so React re-renders can never clobber the live tween.
  useEffect(() => {
    if (!flip || flip.mode !== "turn") return;
    const { to, corner } = flip;
    const container = sceneRef.current;
    if (!container) return;

    const apply = (t: number) => {
      const f = computeCornerFold(t, corner, PAGE_WIDTH, PAGE_HEIGHT);
      container.style.setProperty("--fold-outgoing-clip", f.outgoingClip);
      container.style.setProperty("--fold-flap-clip", f.flapClip);
      container.style.setProperty("--fold-flap-mat", f.flapMatrix);
      container.style.setProperty("--fold-flap-shadow-op", String(Math.sin(Math.PI * t) * 0.45));
      container.style.setProperty("--fold-flap-shadow-bg", f.flapShadow);
      foldTRef.current = t;
    };

    const obj = { t: 0 };
    const tween = gsap.to(obj, {
      t: 1,
      duration: 0.7,
      ease: "power2.inOut",
      onUpdate: () => apply(obj.t),
      onComplete: () => {
        // The spread swaps only once the sheet has landed. Its last frame
        // already draws the incoming page exactly where the resting layer
        // is about to, so the handover is invisible — swapping any earlier
        // (this used to fire at t=0.55) popped the far page in while the
        // sheet was still visibly in the air.
        foldTRef.current = 0;
        container.style.removeProperty("--fold-outgoing-clip");
        setSpread(to);
        setFlip(null);
        isFlippingRef.current = false;
      },
    });
    return () => {
      tween.kill();
    };
  }, [flip]);

  const closedHitWidth = PAGE_WIDTH;
  const closedHitLeft = SPINE_X;

  const interactionLeft = open ? 0 : closedHitLeft;
  const interactionWidth = open ? BOOK_WIDTH : closedHitWidth;

  /** The turning page's half of the target spread, clipped to the fold. */
  const flipTurningRight = flip ? flip.corner === "tr" || flip.corner === "br" : false;
  /** A committed turn is in flight — peeks leave the resting pages alone. */
  const turning = flip != null && flip.mode === "turn" && open;
  const turningLeft = flipTurningRight ? SPINE_X : 0;

  const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

  // The dog-ear's own box: fixed at CORNER_ZONE, pinned to the true paper
  // corner. Its size never changes — growth is a CSS scale transition on
  // this box (see DogEar), not a resize of it.
  const foldBox = (corner: Corner) => ({
    left: corner === "tl" || corner === "bl" ? PAPER.x0 : PAPER.x1 - CORNER_ZONE,
    top: corner === "tl" || corner === "tr" ? PAPER.y0 : PAPER.y1 - CORNER_ZONE,
  });

  // The hover/click hit-zone, per the Figma reference: a strip the full
  // CORNER_ZONE wide but running the full half-page tall, so grabbing
  // anywhere in the top half of the page peeks the top corner (and the
  // bottom half peeks the bottom corner) rather than only the tight square
  // actually sitting in the corner.
  const halfPageH = (PAPER.y1 - PAPER.y0) / 2;
  const cornerHitZones: { corner: Corner; left: number; top: number; height: number }[] = [
    { corner: "tl", left: PAPER.x0, top: PAPER.y0, height: halfPageH },
    { corner: "tr", left: PAPER.x1 - CORNER_ZONE, top: PAPER.y0, height: halfPageH },
    { corner: "bl", left: PAPER.x0, top: PAPER.y0 + halfPageH, height: halfPageH },
    { corner: "br", left: PAPER.x1 - CORNER_ZONE, top: PAPER.y0 + halfPageH, height: halfPageH },
  ];

  return (
    <div
      ref={containerRef}
      // Added `select-none` to prevent highlighting text/elements accidentally when dragging
      className={`relative flex h-full items-center justify-center select-none ${
        className ?? ""
      }`}
    >
      <div
        className="relative"
        style={{
          width: BOOK_WIDTH,
          height: PAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      >
        {/* GSAP owns this element's transform (spine hinge rotation + the
            closed/open recenter shift) — kept separate from the scale above
            so a React re-render can never clobber the live tween's inline
            transform. It also carries the fold's CSS custom properties. */}
        <div ref={sceneRef} className="relative" style={{ width: BOOK_WIDTH, height: PAGE_HEIGHT }}>
          <SvgPiece
            ref={closedRef}
            src="/assets/aboutme_book_closed.svg"
            alt="About — closed book"
            className="absolute top-0"
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              maxWidth: "none",
              left: SPINE_X,
              zIndex: 20,
              pointerEvents: "none",
            }}
          />

          {/* ── The page being uncovered ──
              The turning sheet's other neighbour: on a forward turn the far
              side of the *target* spread, sitting under the sheet the whole
              time and revealed as the resting page above is clipped away.
              Full SpreadArt, not PaperPage — the cover margin sits at the
              same fixed canvas spot in every spread, so keeping it here is
              what holds the yellow border continuous through the clip. */}
          {turning && open ? (
            <div
              className="absolute top-0 overflow-hidden"
              style={{
                left: turningLeft,
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                zIndex: 5,
                pointerEvents: "none",
              }}
            >
              <SpreadArt spread={flip.to} style={{ left: flipTurningRight ? -PAGE_WIDTH : 0 }} />
            </div>
          ) : null}

          <div
            ref={leftPageRef}
            className="absolute top-0 overflow-hidden"
            style={{
              left: 0,
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              opacity: 0,
              transformOrigin: "right center",
              zIndex: 10,
              pointerEvents: "none",
              // Only the side actually turning gets clipped; the other page
              // lies flat and stays whole.
              clipPath: turning && !flipTurningRight ? OUTGOING_CLIP : undefined,
            }}
          >
            <SpreadArt spread={spread} />
          </div>

          <div
            ref={rightPageRef}
            className="absolute top-0 overflow-hidden"
            style={{
              left: SPINE_X,
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              opacity: 0,
              transformOrigin: "left center",
              zIndex: 10,
              pointerEvents: "none",
              clipPath: turning && flipTurningRight ? OUTGOING_CLIP : undefined,
            }}
          >
            <SpreadArt spread={spread} style={{ left: -PAGE_WIDTH }} />
          </div>

          {/* ── Corner fold overlay ──
              Hover: the reference dog-ear at each corner, always mounted so
              its scale-up is a real CSS transition rather than a pop-in —
              only the peeked corner's box is actually scaled to 1.
              Turn: the incoming reveal + reflected paper flap replaces it.
              Waits for `settled`, not `open` — see its own comment. */}
          {settled
            ? CORNERS.map((corner) => (
                <div
                  key={corner}
                  className="absolute"
                  style={{ ...foldBox(corner), zIndex: 55, pointerEvents: "none" }}
                >
                  <DogEar
                    corner={corner}
                    size={CORNER_ZONE}
                    active={flip?.mode === "peek" && flip.corner === corner}
                  />
                </div>
              ))
            : null}

          {flip && open && flip.mode === "turn"
            ? (() => {
                const pageLeft = flipTurningRight ? SPINE_X : 0;
                return (
                  <>
                    {/* Flap — the turning sheet's BACK face, reflected
                        across the crease. A sheet carries two consecutive
                        pages: grab p2 and its back is p3. So the flap draws
                        the *target* spread's opposite half — turning right
                        (p2 → ) shows spread `to`'s left page (p3), turning
                        left shows spread `to`'s right page (p2). It used to
                        draw `flip.from`'s own half, i.e. the front face
                        again, which is why the page you were leaving
                        bled mirror-imaged across the one you were opening.

                        The scaleX(-1) is the second half of that: the back
                        face reads reversed when seen from the front side,
                        and the crease matrix reflects it once more. The two
                        mirrors cancel exactly as the flap touches down, so
                        it lands reading correctly right where the resting
                        page takes over. The cover margin is still excluded
                        (PaperPage) so it stays put rather than travelling
                        with the reflection. */}
                    <div
                      className="absolute top-0 overflow-hidden"
                      style={{
                        left: pageLeft,
                        width: PAGE_WIDTH,
                        height: PAGE_HEIGHT,
                        transformOrigin: "0px 0px", // matrix maps page-local coords directly
                        transform: "var(--fold-flap-mat, none)",
                        clipPath: "var(--fold-flap-clip, polygon(0 0, 0 0, 0 0))",
                        boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
                        pointerEvents: "none",
                        zIndex: 60,
                      }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ transform: "scaleX(-1)" }}
                      >
                        <PaperPage spread={flip.to} onRight={!flipTurningRight} />
                      </div>
                      <div
                        className="absolute inset-0"
                        style={{
                          opacity: "var(--fold-flap-shadow-op, 0)",
                          background: "var(--fold-flap-shadow-bg, none)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </>
                );
              })()
            : null}

          {/* ── Page-turn zones. The whole page turns the book — right half
              goes forward, left half goes back, and clicking past the last
              spread closes the book (the reference flow). Corner zones above
              keep the hover peek affordance. Waits for `settled`, same
              reason as the corner zones below. */}
          {settled ? (
            <>
              <div
                data-no-track-drag
                aria-label={spread < LAST_SPREAD ? "Turn to next page" : "Close book"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFlippingRef.current) return;
                  if (spread < LAST_SPREAD) turnCorner("br", e);
                  else onOpenChange(false);
                }}
                className="absolute top-0"
                style={{
                  left: SPINE_X,
                  width: PAGE_WIDTH,
                  height: PAGE_HEIGHT,
                  zIndex: 40,
                  pointerEvents: "auto",
                  cursor: "pointer",
                }}
              />
              <div
                data-no-track-drag
                aria-label={spread > 1 ? "Turn to previous page" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isFlippingRef.current) return;
                  if (spread > 1) turnCorner("tl", e);
                }}
                className="absolute top-0"
                style={{
                  left: 0,
                  width: PAGE_WIDTH,
                  height: PAGE_HEIGHT,
                  zIndex: 40,
                  pointerEvents: "auto",
                  cursor: spread > 1 ? "pointer" : "default",
                }}
              />
            </>
          ) : null}

          {/* Corner peek zones — hover anywhere in the corner's half of the
              page grows that corner's dog-ear; click turns from it exactly
              like the full-page zones below. Gated on `settled`: these now
              cover half the page (not a tight corner square), so without
              this a mouse anywhere near the cover mid-open-tween would
              already be inside one and peek a page that isn't visually
              open yet. */}
          {settled
            ? cornerHitZones.map(({ corner, left, top, height }) => {
                const enabled = cornerEnabled(corner);
                return (
                  <div
                    key={corner}
                    data-no-track-drag
                    onMouseEnter={() => !isTouch && peekCorner(corner)}
                    onMouseLeave={() => !isTouch && unpeekCorner(corner)}
                    onClick={(e) => turnCorner(corner, e)}
                    aria-hidden={!enabled}
                    className="absolute"
                    style={{
                      left,
                      top,
                      width: CORNER_ZONE,
                      height,
                      zIndex: 70,
                      pointerEvents: enabled ? "auto" : "none",
                      cursor: enabled ? "pointer" : "default",
                    }}
                  />
                );
              })
            : null}

          <button
            type="button"
            aria-label={open ? "Close about book" : "Open about book"}
            aria-expanded={open}
            // Disabled native dragging functionality which caused the drag option outside bounds
            draggable={false}
            // Opts this click out of OrganizedScene's swipe-track pointer capture,
            // which would otherwise steal the click before it reaches onClick below
            data-no-track-drag
            onMouseEnter={() => {
              if (!isTouch && !open) setHovered(true);
            }}
            onMouseLeave={() => {
              if (!isTouch) setHovered(false);
            }}
            ref={buttonRef}
            onClick={async () => {
              setHovered(false);
              // Pan the piece to the middle of the viewport before it opens.
              if (centerOnPiece && buttonRef.current) await centerOnPiece(buttonRef.current);
              onOpenChange(!open);
            }}
            className="absolute top-0 z-30 block cursor-pointer border-0 bg-transparent p-0"
            style={{
              left: interactionLeft,
              width: interactionWidth,
              height: PAGE_HEIGHT,
              pointerEvents: "auto",
              // Explicitly prevents dragging the element in webkit (not in React's CSSProperties typing)
              ...({ WebkitUserDrag: "none" } as CSSProperties),
            }}
          />
        </div>
      </div>
    </div>
  );
}
