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
// two-page spread) is showing just the right half of itself — same trick as
// InteractiveBook's container -288.5 shift for its closed/hover states.
const CLOSED_SHIFT_X = -PAGE_WIDTH / 2;

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
  const centerOnPiece = useCenterOnPiece();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef<HTMLImageElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);

  // 1. Keep a persistent reference to the GSAP context
  const ctx = useRef<gsap.Context | undefined>(undefined);

  const { containerRef, scale } = useElementScale(
    PAGE_WIDTH,
    PAGE_HEIGHT,
  );

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

  const closedHitWidth = PAGE_WIDTH;
  const closedHitLeft = SPINE_X;

  const interactionLeft = open ? 0 : closedHitLeft;
  const interactionWidth = open ? BOOK_WIDTH : closedHitWidth;

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
            transform. */}
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
              src="/assets/aboutme_book_open.svg"
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
              src="/assets/aboutme_book_open.svg"
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
