import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SvgPiece, type Theme } from "./Piece";
import { useIsTouch } from "./useIsTouch";
import { useElementScale } from "./useElementScale";
import { useCenterOnPiece } from "./ScatteredFocus";
import { PROJECTS } from "./projects";
import { CaseStudy } from "./CaseStudy";

/**
 * The case-studies folder.
 *
 * Geometry comes straight off two Figma exports — `DefualtFileFolder.svg`
 * (at rest, tilted, sheets peeking out of the top) and `OnHoverFileFolder.svg`
 * (open, the six sheets fanned in the pocket). Both are reproduced literally
 * rather than remapped: an earlier build rescaled the open composition into a
 * differently-proportioned set of art, which is what pushed the sheets out of
 * the pocket and squashed the peek.
 *
 * Figma authored the states as variants wired with prototype interactions
 * rather than keyframes, so `get_motion_context` returns nothing — the
 * triggers have to be read off the nodes' `reactions`:
 *
 *   14804 --ON_HOVER--> 14784            closed folder lifts
 *   14784 --ON_CLICK--> 14785            opens; six project sheets at rest
 *
 *   14785, per sheet:
 *     sheet --MOUSE_ENTER--> 14786…14787   that one sheet rises out of the stack
 *     sheet --MOUSE_LEAVE--> 14785         and drops back
 *     sheet --ON_CLICK-----> 14792…14797   the page separates from the folder
 *
 * Every transition is SMART_ANIMATE, 0.3s, EASE_OUT. Where Figma's click chain
 * ends (the page resting large over the folder) this pulls the card out to
 * rest on top of the folder (245:9301 in 249:9857); the case study loads into
 * it only once it has fully settled there. Closing runs the same path in
 * reverse — the card glides back and drops into its slot in the stack.
 */

/**
 * One coordinate space for everything: the open export's own artboard. Both
 * states are expressed in it, so nothing here has to be rescaled between them.
 */
const STAGE_W = 1403;
const STAGE_H = 945;

/** The box the piece is laid out and scaled against — unchanged. The stage is
 *  fitted to its width (1403 -> 1340) and centred in it. */
const BASE_WIDTH = 1340;
const BASE_HEIGHT = 926;
const FIT = BASE_WIDTH / STAGE_W;
const FIT_Y = (BASE_HEIGHT - STAGE_H * FIT) / 2;

/**
 * The closed art is the same folder body as the open back panel — 1294.6 wide
 * in both exports, which is what makes it the anchor the two states are
 * aligned on. It ships un-rotated in the stage box, so the rest tilt is CSS
 * and can animate to square; this is the point it turns about.
 */
const REST_TILT = -5.0023;
const PIVOT_X = 701.52;
const PIVOT_Y = 461.53;
/** 14804 -> 14784: hovering the shut folder lifts it, in stage units. */
const CLOSED_HOVER_LIFT = -58.7;

/** Figma's own transitions are SMART_ANIMATE, 0.3s, EASE_OUT — that timing is
 *  kept for the per-sheet lift. Opening and expanding are deliberately slower
 *  and more cinematic; hover states are quicker and more responsive. */
const STEP = 0.3;
const EASE = "power1.out";
const HOVER_DUR = 0.25;
const OPEN_DUR = 0.55;
const HOVER_EASE = "power2.out";
const OPEN_EASE = "power3.out";

/**
 * The whole open/shut transition is driven by one scalar rather than a
 * timeline, because two inputs compete for it — hover and an explicit click.
 * Tweening a single value means a change of intent mid-flight retargets from
 * wherever it currently is instead of restarting, and the reverse follows the
 * same path back. 0 = shut, 1 = open.
 *
 * There is deliberately no third, half-open resting state: the two exports are
 * named `Defualt` and `OnHover`, so hovering lands on the fanned stack exactly
 * as authored. Stopping partway left the folder square but the sheets still
 * tilted and their tabs overlapping — a pose neither export contains.
 */

/** Map overall openness onto one property's own slice of the transition. */
const seg = (t: number, a: number, b: number) => Math.min(Math.max((t - a) / (b - a), 0), 1);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * Where the sheets sit while the folder is shut. They are not hidden — they
 * stack behind the cover and peek past its top-left edge, which is the sneak
 * peek of the projects inside. Straight off the closed export's own matrices,
 * translated into stage space; each carries its own rotation, which is why
 * reading their bounding boxes instead lands them wrong.
 *
 * These rotate about their top-left corner, matching how Figma's `matrix(…)`
 * composes — `transformOrigin: "0 0"` on the elements below.
 */
const CLOSED_SHEET_W = 1203.75;
const CLOSED_SHEET_H = 834.79;
const CLOSED_SHEETS = [
  { left: 65.797, top: 98.861, deg: -5.027 },
  { left: 65.797, top: 98.861, deg: -5.027 },
  { left: 55.836, top: 99.736, deg: -5.027 },
  { left: 77.363, top: 77.461, deg: -5.944 },
  { left: 138.641, top: 56.771, deg: -1.571 },
  { left: 32.052, top: 130.007, deg: -10.385 },
].map((r) => ({ ...r, width: CLOSED_SHEET_W, height: CLOSED_SHEET_H }));

/**
 * The six sheets fanned in the open pocket, read off the export's rects. Each
 * rect is drawn inset by half its 3.44761 stroke, so the outer box is the
 * rect's width plus one full stroke; the staircase is 5px left and 10px wider
 * per step, 70px apart.
 */
const SHEET_BORDER = 3.44761;
/**
 * A sheet's full card height at its column's width — the closed export's
 * own aspect ratio. Stacked sheets keep this full height and run down into
 * the pocket, where the front flap's curved edge carves them off exactly as
 * in the Figma file. (The export's visible rects stop at the pocket line;
 * clipping the stack there instead is what made the front card read as a
 * cut-out rectangle floating above the flap.) Only the strip above the flap
 * is ever visible.
 */
const liftHeight = (w: number) => (CLOSED_SHEET_H * w) / CLOSED_SHEET_W;
const SHEETS = [
  { left: 99.998, top: 48, width: 1200.3 + SHEET_BORDER },
  { left: 94.998, top: 118, width: 1210.3 + SHEET_BORDER },
  { left: 89.998, top: 188, width: 1220.3 + SHEET_BORDER },
  { left: 84.998, top: 258, width: 1230.3 + SHEET_BORDER },
  { left: 79.998, top: 328, width: 1240.3 + SHEET_BORDER },
  { left: 74.998, top: 388, width: 1250.3 + SHEET_BORDER },
].map((r) => ({ ...r, height: liftHeight(r.width) }));

/**
 * Hovering a sheet raises it out of the stack (14786…14787). Only the strip
 * above the pocket flap — y 0..455 — is ever visible, so the lift has to move
 * the sheet *up*: growing it downward from a pinned bottom edge, as this used
 * to, changes nothing you can see.
 *
 * So a lifted sheet keeps its column and grows to its full card height, with
 * its top pulled to a common line just above the stack. The widest sheet then
 * measures 869 tall — which is where Figma's own 868.3 lift height comes from,
 * and what confirms the reading.
 */
const LIFT_TOP = 20;
const LIFTED = SHEETS.map((s) => ({
  left: s.left,
  width: s.width,
  top: LIFT_TOP,
  height: s.height,
}));

/** Sheet chrome, measured off the open export: 3.44761 stroke, 14.6064 outer
 *  radius, and a 49.13-tall tab badge in the top-left with only its
 *  bottom-right corner rounded (r 9.91) and 17.238px type centred in it. */
const SHEET_RADIUS = 14.6064;
const BADGE_H = 49.13;
const BADGE_FONT = 17.238;
const BADGE_PAD_X = 10.35;
const BADGE_RADIUS = 9.91;
/**
 * What the pointer can actually grab. The stage box is bigger than the folder
 * — 54 units of margin either side of the shut cover, and the whole strip the
 * sheets fan through — so hit-testing the stage meant the folder opened from
 * empty desk beside it, over the pencils. These are the art's own bounds
 * instead: the body rect when shut, and the union of the back panel and the
 * (wider) front flap when open.
 */
const HIT_CLOSED = { left: 54.25, top: 0.85, width: 1294.55, height: 921.35 };
const HIT_OPEN = { left: 1.91, top: 0.85, width: 1399.32, height: 942.71 };

/**
 * Where the open folder's front flap starts. The sheets run down behind the
 * flap, which masks them with its own curved edge — but the flap is an
 * `<img>` that lets clicks through, so without a guard the whole front of
 * the folder answered as whichever sheet happened to lie beneath it. An
 * invisible shield below this line takes the pointer instead: it blocks the
 * sheets in the pocket (and hands a click to the folder, closing it, as the
 * clipped layer used to) while the flap's art does the visual carving.
 */
const ART_FLAP_TOP = 454.87;

/** Where the pulled-out card comes to rest, sitting on top of the folder —
 *  straight off the final state's frame (245:9301 in 249:9857), in stage
 *  units. Every project pulls out to this same pose. */
const PULL = { left: 75, top: 76, width: 1254.72, height: 868.31 };

export function FileFolder({
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
  /**
   * Set when the folder is clicked shut while the pointer is still on it, so
   * that hover doesn't immediately re-open it and leave the close button
   * looking dead. Cleared on the way out, so hover works again next time.
   */
  const [dismissed, setDismissed] = useState(false);
  /** Open to the eye — and so to the pointer — whether by hover or by click. */
  /** Index of the project whose card is out of the folder, if any. Set the
   *  moment a pull starts so the card element is mounted for the animation;
   *  `pulledRef` mirrors it for stable callbacks and guards. */
  const [pulled, setPulled] = useState<number | null>(null);
  const pulledRef = useRef<number | null>(null);
  /** The case study mounts only once the card is fully out and at rest. */
  const [cardLoaded, setCardLoaded] = useState(false);
  const pullCardRef = useRef<HTMLDivElement>(null);
  const pullTlRef = useRef<gsap.core.Timeline | null>(null);
  const centerOnPiece = useCenterOnPiece();
  const shown = open || (hovered && !dismissed);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const closedRef = useRef<HTMLImageElement>(null);
  const coverFrontRef = useRef<HTMLImageElement>(null);
  const backRef = useRef<HTMLImageElement>(null);
  const flapRef = useRef<HTMLImageElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const sheetLayerRef = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { containerRef, scale } = useElementScale(BASE_WIDTH, BASE_HEIGHT);

  /** Openness, driven as one interruptible value (see above). */
  const openness = useRef({ t: 0 });

  const paint = useCallback(
    (t: number) => {
      const closed = closedRef.current;
      const coverFront = coverFrontRef.current;
      const back = backRef.current;
      const flap = flapRef.current;
      if (!closed || !coverFront || !back || !flap || !hitRef.current) return;

      // The cover tilts square early (hovering alone should square it up),
      // then lifts and fades as the folder commits to opening. Both halves of
      // the closed cover move as one piece, about the folder body's centre.
      gsap.set([closed, coverFront], {
        transformOrigin: `${PIVOT_X}px ${PIVOT_Y}px`,
        rotate: lerp(REST_TILT, 0, seg(t, 0, 0.35)),
        y: lerp(0, CLOSED_HOVER_LIFT, seg(t, 0, 0.55)),
        opacity: 1 - seg(t, 0.05, 0.32),
      });
      // The hit area rides with the cover, so what you can click is always
      // what you can see.
      const h = seg(t, 0, 0.35);
      gsap.set(hitRef.current, {
        transformOrigin: "center center",
        rotate: lerp(REST_TILT, 0, h),
        y: lerp(0, CLOSED_HOVER_LIFT, seg(t, 0, 0.55)),
        left: lerp(HIT_CLOSED.left, HIT_OPEN.left, h),
        top: lerp(HIT_CLOSED.top, HIT_OPEN.top, h),
        width: lerp(HIT_CLOSED.width, HIT_OPEN.width, h),
        height: lerp(HIT_CLOSED.height, HIT_OPEN.height, h),
      });
      // The cover hands over to the open folder art quickly and over the same
      // short window, so the two are never both half-transparent — a long
      // cross-fade lets the sheets show straight through the folder.
      gsap.set([back, flap], { opacity: seg(t, 0.05, 0.32) });

      sheetRefs.current.forEach((el, i) => {
        if (!el) return;
        // A lifted sheet owns its own geometry; nothing else here applies to it.
        if (liftedRef.current === i) return;
        const c = CLOSED_SHEETS[i];
        const o = SHEETS[i];
        // The sheets are never faded in — they are already peeking out behind
        // the shut folder, and simply travel from that peek into the stack.
        const u = seg(t, 0.2 + i * 0.015, 0.9);
        gsap.set(el, {
          // Figma composes each closed sheet as matrix(rotation, translation),
          // i.e. it turns about its own top-left, not its centre.
          transformOrigin: "0 0",
          // Each sheet is tilted its own amount when shut and squares up as
          // the folder opens.
          rotate: lerp(c.deg, 0, u),
          left: lerp(c.left, o.left, u),
          top: lerp(c.top, o.top, u),
          width: lerp(c.width, o.width, u),
          height: lerp(c.height, o.height, u),
          opacity: 1,
          zIndex: i,
        });
      });
    },
    [],
  );

  // Rest layout, before any sequence runs.
  useLayoutEffect(() => {
    paint(0);
  }, [paint]);

  // One tween toward whatever the current intent is: explicit open wins over
  // hover preview, which wins over shut. Retargets in place when it changes.
  useEffect(() => {
    const target = shown ? 1 : 0;
    const o = openness.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      o.t = target;
      paint(target);
      return;
    }
    gsap.killTweensOf(o);
    gsap.to(o, {
      t: target,
      duration: target === 1 || o.t === 1 ? OPEN_DUR : HOVER_DUR,
      ease: target === 1 || o.t === 1 ? OPEN_EASE : HOVER_EASE,
      overwrite: true,
      onUpdate: () => paint(o.t),
    });
  }, [shown, paint]);

  // Per-sheet hover (14785 -> 14786…14787 and back). MOUSE_ENTER raises just
  // the hovered sheet out of the stack to its full card height; MOUSE_LEAVE
  // drops it back. Only one sheet moves at a time.
  //
  // Both poses are square. Say so explicitly: a sheet grabbed while the folder
  // is still opening is still carrying its shut tilt, and `paint` stops
  // touching it the moment it is lifted — so without this it stays tilted for
  // as long as you hover it.
  const [liftedSheet, setLiftedSheet] = useState<number | null>(null);
  const liftedRef = useRef<number | null>(null);
  useEffect(() => {
    const sheets = sheetRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (sheets.length !== PROJECTS.length) return;

    // While a card is pulled, its sheet belongs to the pull timeline — hover
    // may not move it (or drop it back into the stack mid-pull).
    if (pulledRef.current !== null) {
      liftedRef.current = null;
      return;
    }
    const active = shown && pulled === null ? liftedSheet : null;
    const was = liftedRef.current;
    if (active === was) return;
    liftedRef.current = active;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = (i: number, box: typeof SHEETS[number]) => {
      const pose = { ...box, rotate: 0, transformOrigin: "0 0" };
      gsap.killTweensOf(sheets[i]);
      if (reduce) gsap.set(sheets[i], pose);
      else
        gsap.to(sheets[i], {
          ...pose,
          duration: STEP,
          ease: EASE,
          overwrite: true,
        });
    };
    if (was !== null && was !== active) {
      move(was, SHEETS[was]);
    }
    if (active !== null) {
      // The sheet rises where it sits in the stack — it does NOT come forward
      // over the sheets stacked in front of it. Only a click (the pull) may
      // promote a sheet above the stack.
      move(active, LIFTED[active]);
    }
  }, [liftedSheet, shown, pulled]);

  // Closing the folder returns any pulled card with it.
  useEffect(() => {
    if (open) return;
    pullTlRef.current?.kill();
    if (pulledRef.current !== null) {
      const sheet = sheetRefs.current[pulledRef.current];
      if (sheet)
        gsap.set(sheet, { visibility: "visible", zIndex: pulledRef.current });
    }
    pulledRef.current = null;
    setCardLoaded(false);
    setPulled(null);
  }, [open]);

  // Pulling a card out of the folder (14785 -> 14792…14797). The sheet first
  // rises to its lift pose — usually it is already there, hovered — then the
  // pose hands off, invisibly and at identical geometry, to a card that lives
  // above the flap. The card glides to rest on top of the folder, and only
  // then does the case study mount into it.
  useLayoutEffect(() => {
    if (pulled === null) return;
    const i = pulled;
    const sheet = sheetRefs.current[i];
    const card = pullCardRef.current;
    if (!sheet || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const liftPose = { ...LIFTED[i], rotate: 0, transformOrigin: "0 0" };
    gsap.killTweensOf(sheet);
    gsap.set(sheet, { zIndex: PROJECTS.length });
    if (reduce) {
      gsap.set(sheet, { visibility: "hidden" });
      gsap.set(card, {
        ...PULL,
        rotate: 0,
        transformOrigin: "0 0",
        visibility: "visible",
      });
      setCardLoaded(true);
      return;
    }
    const tl = gsap.timeline({ onComplete: () => setCardLoaded(true) });
    pullTlRef.current = tl;
    tl.to(sheet, { ...liftPose, duration: STEP, ease: EASE, overwrite: true });
    tl.set(sheet, { visibility: "hidden", zIndex: i });
    tl.set(card, { ...liftPose, visibility: "visible" });
    tl.to(card, { ...PULL, duration: 0.5, ease: "power3.inOut" });
    return () => {
      tl.kill();
    };
  }, [pulled]);

  // Returning the card: the case study unmounts at once, the card glides back
  // to its lift pose, hands off invisibly to the sheet again, and the sheet
  // drops into its slot in the stack — the pull run in reverse.
  const closeCard = useCallback(() => {
    const i = pulledRef.current;
    if (i === null) return;
    setCardLoaded(false);
    const sheet = sheetRefs.current[i];
    const card = pullCardRef.current;
    const finish = () => {
      gsap.set(sheet, { zIndex: i });
      pulledRef.current = null;
      setPulled(null);
    };
    if (!sheet || !card) {
      finish();
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    const liftPose = { ...LIFTED[i], rotate: 0, transformOrigin: "0 0" };
    const stacked = { ...SHEETS[i], rotate: 0, transformOrigin: "0 0" };
    if (reduce) {
      gsap.set(card, { visibility: "hidden" });
      gsap.set(sheet, { visibility: "visible", ...stacked });
      finish();
      return;
    }
    const tl = gsap.timeline({ onComplete: finish });
    pullTlRef.current = tl;
    tl.to(card, { ...liftPose, duration: 0.45, ease: "power3.inOut" });
    tl.set(card, { visibility: "hidden" });
    tl.set(sheet, { visibility: "visible" });
    tl.to(sheet, { ...stacked, duration: STEP, ease: EASE, overwrite: true });
  }, []);

  // Escape returns the pulled card.
  useEffect(() => {
    if (pulled === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCard();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pulled, closeCard]);

  const pullOut = (i: number) => {
    if (pulledRef.current !== null) return;
    pulledRef.current = i;
    setLiftedSheet(null);
    setPulled(i);
  };

  // Sheets invert with the theme, matching the folder art's own fill/stroke.
  const face = theme === "light" ? "#fdfeff" : "#2f2f2f";
  const ink = theme === "light" ? "#2f2f2f" : "#fdfeff";
  const sheetStyle: React.CSSProperties = {
    position: "absolute",
    background: face,
    border: `${SHEET_BORDER}px solid ${ink}`,
    borderRadius: SHEET_RADIUS,
    boxSizing: "border-box",
    overflow: "hidden",
    padding: 0,
    cursor: "pointer",
  };

  /** Every layer below is laid out in stage coordinates, so they all share
   *  this box — no per-layer offsets to keep in step. */
  const layer: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: STAGE_W,
    height: STAGE_H,
    pointerEvents: "none",
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full items-center justify-center ${className ?? ""}`}
    >
      <div
        className="relative"
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
        }}
        onMouseEnter={() => !isTouch && setHovered(true)}
        onMouseLeave={() => !isTouch && setHovered(false)}
      >
        {/* The open export's artboard, fitted to the layout box above and
            centred in it. Both states are authored in this space.

            Entering is tracked here rather than on the hit area or the sheets
            individually: splitting the handlers between them made moving from
            one to the other read as a leave, which flickered the folder shut.
            The stage takes no pointer events of its own — only the folder and
            the sheets do — so it hears about exactly those two. */}
        <div
          className="absolute left-0"
          style={{
            top: FIT_Y,
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${FIT})`,
            transformOrigin: "0 0",
            pointerEvents: "none",
          }}
          onMouseEnter={() => !isTouch && setHovered(true)}
        >
          {/* The folder hit area and the sheet hit areas are siblings, not
              nested — a button inside a button is invalid, and it also meant
              clicking a sheet closed the folder instead of acting on it. */}

          {/* Open folder's back panel — the pocket everything sits inside. */}
          <SvgPiece
            ref={backRef}
            src={`/assets/file_back_${theme}.svg`}
            alt=""
            style={{ ...layer, zIndex: 0 }}
          />
          {/* The shut folder's back half, under the sheets. */}
          <SvgPiece
            ref={closedRef}
            src={`/assets/file_cover_back_${theme}.svg`}
            alt=""
            style={{ ...layer, zIndex: 1 }}
          />

          {/* Folder hit area — the art's own bounds, painted in step with the
              cover, and under the sheets so a sheet wins where they overlap. */}
          <button
            type="button"
            ref={(el) => {
              buttonRef.current = el;
              hitRef.current = el;
            }}
            onClick={async () => {
              // Bring the piece to the middle of the viewport first (Scattered
              // only) so the sequence never plays half off-screen.
              if (centerOnPiece && buttonRef.current)
                await centerOnPiece(buttonRef.current);
              onOpenChange(!open);
            }}
            // Opts this click out of OrganizedScene's swipe-track pointer
            // capture, which would otherwise steal it before it reaches onClick.
            data-no-track-drag
            aria-label={open ? "Close file" : "Open file"}
            aria-expanded={open}
            className="absolute block cursor-pointer border-0 bg-transparent p-0"
            style={{ ...HIT_CLOSED, position: "absolute", zIndex: 5, pointerEvents: "auto" }}
          />

          {/* The six project sheets, between the folder's back and its flap.
              The layer clips at the stage box only — the full-height sheets
              run past the pocket line and the flap's curved edge carves
              them, as in the Figma file. */}
          <div
            ref={sheetLayerRef}
            style={{ ...layer, zIndex: 6, overflow: "hidden" }}
          >
            {PROJECTS.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                ref={(el) => {
                  sheetRefs.current[i] = el;
                }}
                onMouseEnter={() => !isTouch && setLiftedSheet(i)}
                onMouseLeave={() =>
                  !isTouch && setLiftedSheet((cur) => (cur === i ? null : cur))
                }
                onFocus={() => setLiftedSheet(i)}
                onBlur={() => setLiftedSheet((cur) => (cur === i ? null : cur))}
                onClick={() => pullOut(i)}
                data-no-track-drag
                aria-label={`Open ${p.name} case study`}
                className="block border-0"
                style={{
                  ...sheetStyle,
                  pointerEvents: shown && pulled === null ? "auto" : "none",
                }}
                tabIndex={shown && pulled === null ? 0 : -1}
              >
                <img
                  src={p.thumb}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                />
                {/* Tab pill, flush into the sheet's top-left corner. */}
                <span
                  className="absolute left-0 top-0 flex items-center whitespace-nowrap capitalize leading-none"
                  style={{
                    background: "#2f2f2f",
                    color: "#fdfeff",
                    height: BADGE_H,
                    paddingInline: BADGE_PAD_X,
                    fontSize: BADGE_FONT,
                    borderBottomRightRadius: BADGE_RADIUS,
                  }}
                >
                  {p.name}
                </span>
              </button>
            ))}

            {/* Tab strips. A raised sheet covers every other sheet's exposed
                strip, so once one is up the pointer can't reach another tab
                and the raised sheet never collapses. These invisible strips
                sit above the stack and keep each tab hoverable while a sheet
                is lifted; the lifted sheet's own strip stands down so its
                card still takes the pointer directly. */}
            {PROJECTS.map((p, i) => (
              <div
                key={`${p.slug}-strip`}
                aria-hidden
                data-no-track-drag
                onMouseEnter={() => !isTouch && setLiftedSheet(i)}
                onMouseLeave={() =>
                  !isTouch && setLiftedSheet((cur) => (cur === i ? null : cur))
                }
                onClick={() => pullOut(i)}
                style={{
                  position: "absolute",
                  left: SHEETS[i].left,
                  top: SHEETS[i].top,
                  width: SHEETS[i].width,
                  height:
                    (i < SHEETS.length - 1 ? SHEETS[i + 1].top : ART_FLAP_TOP) -
                    SHEETS[i].top,
                  zIndex: PROJECTS.length + 1,
                  pointerEvents:
                    shown && pulled === null && liftedSheet !== i
                      ? "auto"
                      : "none",
                  cursor: "pointer",
                }}
              />
            ))}

            {/* Pocket shield. The sheets now run down behind the flap, and
                the flap img lets clicks through — so this invisible guard
                takes the pointer below the flap line: it keeps the covered
                sheets unhittable there and hands a click to the folder,
                closing it, as the old clipped layer did. */}
            <div
              aria-hidden
              onClick={() => onOpenChange(false)}
              style={{
                position: "absolute",
                left: 0,
                top: ART_FLAP_TOP,
                width: STAGE_W,
                height: STAGE_H - ART_FLAP_TOP,
                zIndex: PROJECTS.length + 2,
                pointerEvents: shown && pulled === null ? "auto" : "none",
              }}
            />
          </div>

          {/* Open folder's front flap — over the sheets. */}
          <SvgPiece
            ref={flapRef}
            src={`/assets/file_front_${theme}.svg`}
            alt="Case studies — open folder"
            style={{ ...layer, zIndex: 7 }}
          />

          {/* The shut folder's front half, over the sheets so they read as
              tucked inside it. Visual only — clicks fall through to the folder
              hit area beneath. */}
          <SvgPiece
            ref={coverFrontRef}
            src={`/assets/file_cover_front_${theme}.svg`}
            alt="Case studies — closed folder"
            style={{ ...layer, zIndex: 10 }}
          />

          {/* The pulled-out project card, above the flap so it can come to
              rest on top of the folder. It stays hidden until the pull hands
              off to it at the lift pose, and the case study mounts into it
              only once it has fully settled at PULL. */}
          {pulled !== null ? (
            <div
              ref={pullCardRef}
              role="dialog"
              aria-label={`${PROJECTS[pulled].name} case study`}
              className="absolute"
              style={{
                left: 0,
                top: 0,
                zIndex: 20,
                visibility: "hidden",
                background: face,
                border: `${SHEET_BORDER}px solid ${ink}`,
                borderRadius: SHEET_RADIUS,
                boxSizing: "border-box",
                overflow: "hidden",
                pointerEvents: "auto",
              }}
            >
              {cardLoaded ? (
                <div
                  className="h-full w-full overflow-y-auto"
                  data-no-track-drag
                >
                  <CaseStudy project={PROJECTS[pulled]} theme={theme} />
                </div>
              ) : (
                <img
                  src={PROJECTS[pulled].thumb}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                />
              )}
              {/* Back button, tucked into the card's top-left corner
                  (Component 10, 56x56 at 4,4). */}
              <button
                type="button"
                onClick={closeCard}
                data-no-track-drag
                aria-label={`Close ${PROJECTS[pulled].name} case study`}
                className="absolute left-[4px] top-[4px] z-10 flex size-[56px] cursor-pointer items-center justify-center border-0 p-0"
                style={{
                  background: "#2f2f2f",
                  color: "#fdfeff",
                  borderRadius: 11,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M19 12H5m0 0 7-7m-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
