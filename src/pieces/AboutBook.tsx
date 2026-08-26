import gsap from "gsap";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SvgPiece, type Theme } from "./Piece";
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

/** The three designed spreads, one file per two-page view. */
const SPREADS = [
  "/assets/aboutme/aboutme_book-1.svg",
  "/assets/aboutme/aboutme_book-2.svg",
  "/assets/aboutme/aboutme_book-3.svg",
];
const LAST_SPREAD = SPREADS.length;

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
  mode: "peek" | "turn" | "retract";
};

export function AboutBook({
  theme,
  open,
  onOpenChange,
  className,
}: {
  theme: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  const isTouch = useIsTouch();
  const [hovered, setHovered] = useState(false);
  /** Which spread (1-based) is currently lying open. */
  const [spread, setSpread] = useState(1);
  /** Live corner fold — peek (hover), turn (commit), retract (hover out). */
  const [flip, setFlip] = useState<FlipState | null>(null);
  const centerOnPiece = useCenterOnPiece();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef<HTMLImageElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const foldTRef = useRef(0);
  const isFlippingRef = useRef(false);
  const PEEK_T = 0.12;

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
      // book is back on its first spread next time it opens.
      setFlip(null);
      isFlippingRef.current = false;
      foldTRef.current = 0;
      setSpread(1);
    }

    // By adding to the existing context, we safely update tweens without wiping inline styles
    ctx.current.add(() => {
      // Kill any in-progress tweens so rapid toggling is buttery smooth
      gsap.killTweensOf([scene, closed, leftPage, rightPage]);

      const tl = gsap.timeline();

      if (open) {
        // Recenter the scene for the full spread, and swing the cover open
        // on the spine hinge together. The cover fades out as it approaches
        // edge-on — backfaceVisibility alone would cut it off in a single
        // frame at 90deg, which reads as a pop, not a turn.
        tl.to(scene, { x: 0, duration: 0.55, ease: "power2.inOut" }, 0);
        tl.to(closed, { rotateY: -180, duration: 0.7, ease: "power2.inOut" }, 0);
        tl.to(closed, { opacity: 0, duration: 0.14, ease: "power1.in" }, 0.21);
        // Pages unfurl at full opacity once the cover has passed — growing
        // out of the hinge as ghosts (opacity + scale together) reads cheap.
        tl.set([leftPage, rightPage], { opacity: 1 }, 0.42);
        tl.to([leftPage, rightPage], { scaleX: 1, duration: 0.4, ease: "power2.out" }, 0.42);
      } else {
        // The cover materialises just before it swings back past edge-on
        // (it is a near-invisible sliver at 90deg, so the fade-in is
        // imperceptible), while the pages fold into the spine underneath it.
        tl.to([leftPage, rightPage], { scaleX: 0, duration: 0.3, ease: "power2.in" }, 0);
        tl.set([leftPage, rightPage], { opacity: 0 }, 0.3);
        tl.to(closed, { rotateY: 0, duration: 0.6, ease: "power2.inOut" }, 0);
        tl.set(closed, { opacity: 1 }, 0.26);
        tl.to(scene, { x: CLOSED_SHIFT_X, duration: 0.6, ease: "power2.inOut" }, 0);
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

  /* ───────────────────────── page turning ───────────────────────── */

  const cornerTarget = (corner: Corner) => {
    const onRight = corner === "tr" || corner === "br";
    return onRight ? spread + 1 : spread - 1;
  };
  const cornerEnabled = (corner: Corner) => {
    const onRight = corner === "tr" || corner === "br";
    return onRight ? spread < LAST_SPREAD : spread > 1;
  };

  // Hover in: lift the corner a little (peek). Hover out: retract it.
  const peekCorner = (corner: Corner) => {
    if (isFlippingRef.current || !cornerEnabled(corner)) return;
    setFlip({ from: spread, to: cornerTarget(corner), corner, mode: "peek" });
  };
  const unpeekCorner = (corner: Corner) => {
    setFlip((f) =>
      f && f.mode === "peek" && f.corner === corner ? { ...f, mode: "retract" } : f,
    );
  };
  // Click: run the full turn (continuing from wherever the peek left off).
  const turnCorner = (corner: Corner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFlippingRef.current || !cornerEnabled(corner)) return;
    isFlippingRef.current = true;
    setFlip({ from: spread, to: cornerTarget(corner), corner, mode: "turn" });
  };

  // Drive the fold once the overlay layers exist in the DOM. CSS custom
  // properties on the scene carry the per-frame geometry, so React
  // re-renders can never clobber the live tween.
  useEffect(() => {
    if (!flip) return;
    const { to, corner, mode } = flip;
    const container = sceneRef.current;
    if (!container) return;

    const apply = (t: number) => {
      const f = computeCornerFold(t, corner, PAGE_WIDTH, PAGE_HEIGHT);
      container.style.setProperty("--fold-flap-clip", f.flapClip);
      container.style.setProperty("--fold-flap-mat", f.flapMatrix);
      container.style.setProperty("--fold-flap-shadow-op", String(Math.sin(Math.PI * t) * 0.45));
      container.style.setProperty("--fold-flap-shadow-bg", f.flapShadow);
      foldTRef.current = t;
    };
    apply(foldTRef.current);

    const obj = { t: foldTRef.current };
    let tween: gsap.core.Tween;
    if (mode === "peek") {
      tween = gsap.to(obj, { t: PEEK_T, duration: 0.22, ease: "power2.out", onUpdate: () => apply(obj.t) });
    } else if (mode === "retract") {
      tween = gsap.to(obj, {
        t: 0,
        duration: 0.18,
        ease: "power2.in",
        onUpdate: () => apply(obj.t),
        onComplete: () => {
          foldTRef.current = 0;
          setFlip(null);
        },
      });
    } else {
      let swapped = false;
      tween = gsap.to(obj, {
        t: 1,
        duration: 0.7,
        ease: "power2.inOut",
        onUpdate: () => {
          apply(obj.t);
          // Swap the live spread once the flap has swept past the crease.
          if (!swapped && obj.t >= 0.55) {
            swapped = true;
            setSpread(to);
          }
        },
        onComplete: () => {
          foldTRef.current = 0;
          setFlip(null);
          isFlippingRef.current = false;
        },
      });
    }
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

  const cornerZones: { corner: Corner; left: number; top: number }[] = [
    { corner: "tl", left: 0, top: 0 },
    { corner: "tr", left: SPINE_X, top: 0 },
    { corner: "bl", left: 0, top: PAGE_HEIGHT - CORNER_ZONE },
    { corner: "br", left: SPINE_X, top: PAGE_HEIGHT - CORNER_ZONE },
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
            }}
          >
            <SvgPiece
              src={SPREADS[spread - 1]}
              alt=""
              aria-hidden="true"
              className="absolute left-0 top-0"
              style={{ width: BOOK_WIDTH, height: PAGE_HEIGHT, maxWidth: "none" }}
            />
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
            }}
          >
            <SvgPiece
              src={SPREADS[spread - 1]}
              alt=""
              aria-hidden="true"
              className="absolute top-0"
              style={{
                width: BOOK_WIDTH,
                height: PAGE_HEIGHT,
                maxWidth: "none",
                left: -PAGE_WIDTH,
              }}
            />
          </div>

          {/* ── Corner fold overlay (incoming reveal + reflected paper flap) ── */}
          {flip && open
            ? (() => {
                const pageLeft = flipTurningRight ? SPINE_X : 0;
                return (
                  <>
                    {/* Incoming page — the target spread's turning half,
                        revealed inside the shrinking folded footprint. */}
                    <div
                      className="absolute top-0 overflow-hidden"
                      style={{
                        left: pageLeft,
                        width: PAGE_WIDTH,
                        height: PAGE_HEIGHT,
                        clipPath: "var(--fold-flap-clip, polygon(0 0, 0 0, 0 0))",
                        pointerEvents: "none",
                        zIndex: 55,
                      }}
                    >
                      <SvgPiece
                        src={SPREADS[flip.to - 1]}
                        alt=""
                        aria-hidden="true"
                        className="absolute top-0"
                        style={{
                          width: BOOK_WIDTH,
                          height: PAGE_HEIGHT,
                          maxWidth: "none",
                          left: flipTurningRight ? -PAGE_WIDTH : 0,
                        }}
                      />
                    </div>

                    {/* Flap — paper back of the turning page, reflected
                        across the crease. Plain paper: a real page's back. */}
                    <div
                      className="absolute top-0 overflow-hidden"
                      style={{
                        left: pageLeft,
                        width: PAGE_WIDTH,
                        height: PAGE_HEIGHT,
                        backgroundColor: "#FDFEFF",
                        border: "1px solid rgba(0,0,0,0.08)",
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

          {/* ── Corner flip zones. Hover peels the corner (peek); click
              turns the page. Only the enabled corners take the pointer. */}
          {open
            ? cornerZones.map(({ corner, left, top }) => {
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
                      height: CORNER_ZONE,
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
