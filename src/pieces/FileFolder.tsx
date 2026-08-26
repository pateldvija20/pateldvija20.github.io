import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SvgPiece, type Theme } from "./Piece";
import { useIsTouch } from "./useIsTouch";
import { useElementScale } from "./useElementScale";
import { useCenterOnPiece } from "./ScatteredFocus";
import { PROJECTS, cardImage, type Project } from "./projects";
import { CaseStudy } from "./CaseStudy";
import { HACKSVIT_SECTIONS } from "./hacksvit";
import { GREENERA_SECTIONS } from "./greenera";
import { THE_FAMILY_TABLE_SECTIONS } from "./theFamilyTable";

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
/** Growing to, and shrinking back from, the viewport page. */
const EXPAND_DUR = 0.55;
/**
 * Opening decelerates into place — it starts moving at once and settles, which
 * is what makes it feel like it was already on its way. Closing eases at both
 * ends instead: it has somewhere specific to land, so it gathers itself before
 * it goes and softens as it arrives. `power2` rather than `power3` on both —
 * the same shapes, just less abrupt at the fast end.
 */
const EXPAND_EASE = "power2.out";
const SHRINK_EASE = "power2.inOut";
/** Swapping the page between its thumbnail and the case study. Kept shorter
 *  than the box move so the picture has settled before the page stops. */
const CROSSFADE = 0.3;
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
const seg = (t: number, a: number, b: number) =>
  Math.min(Math.max((t - a) / (b - a), 0), 1);
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
 * A stacked sheet is 461.12 tall and its rounded bottom tucks just behind the
 * pocket flap, which starts at y=454 — so only a ~55px lip of each sheet ever
 * sits below the flap line. Every number below is read off the variants in
 * `Main Container` (251:9961) rather than derived.
 */
const SHEET_H = 461.1196958160217;
const SHEETS = [
  { left: 99.998, top: 48, width: 1200.3 + SHEET_BORDER },
  { left: 94.998, top: 118, width: 1210.3 + SHEET_BORDER },
  { left: 89.998, top: 188, width: 1220.3 + SHEET_BORDER },
  { left: 84.998, top: 258, width: 1230.3 + SHEET_BORDER },
  { left: 79.998, top: 328, width: 1240.3 + SHEET_BORDER },
  { left: 74.998, top: 388, width: 1250.3 + SHEET_BORDER },
].map((r) => ({ ...r, height: SHEET_H }));

/**
 * A raised sheet is always this tall, whatever its column's width — it is the
 * same figure the pulled card uses, which is what makes the hover pose and the
 * pull pose one continuous move rather than two sizes.
 */
const LIFT_H = 868.305653353018;

/**
 * Hovering a sheet raises it out of the stack (14786…14787). Each variant's
 * frame grows upward by exactly how far its sheet rises above the folder, so
 * the tops read straight off those frame heights (962.4, 1028.4, 1088.4,
 * 1158.4, 1228.4, 1278.4 against the 944.4 at rest) as negative stage y.
 *
 * The travel is NOT uniform and the sheet does not keep its box: it grows from
 * 461.12 to 868.31 as it rises. An earlier build moved every sheet the same
 * distance at a fixed height, which is why the fan never opened evenly.
 */
const HOVERED = SHEETS.map((s, i) => ({
  left: s.left,
  width: s.width,
  top: [-334, -284, -214, -144, -84, -18][i],
  height: LIFT_H,
}));

/**
 * Clicking a sheet pulls its card clear of the folder (14792…14797) and then
 * lets it settle back down on top of the folder (14798…14803). Both poses keep
 * the sheet's own column and width — only the top moves — so the card tracks
 * the sheet it came from instead of jumping to a shared slot.
 *
 * The raise is an *anticipation* move, not a pose anything rests in: the card
 * lifts until its bottom edge is fully clear of the top edge of the card
 * stacked above it, comes to the front, and only then drops down and expands —
 * a file pulled up out of a drawer before being laid flat. Every card travels
 * the same distance so the gesture reads identically wherever you click, which
 * makes it one figure rather than six: the 70 the stack steps by, plus the
 * card's raised height, plus the clearance.
 *
 * The bottom card steps by 60 rather than 70, so it simply clears by 15
 * instead of 5 — the gap is relative, the travel is not.
 */
const PULL_STEP = 70;
const PULL_CLEAR = 5;
const PULL_TRAVEL = PULL_STEP + LIFT_H + PULL_CLEAR;
const PULL_FRONT = SHEETS.map((s) => ({
  left: s.left,
  width: s.width,
  top: s.top - PULL_TRAVEL,
  height: LIFT_H,
}));
const PULL_REST = SHEETS.map((s) => ({
  left: s.left,
  width: s.width,
  top: 76,
  height: LIFT_H,
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

/** The inset the expanded page rests at, from every viewport edge. Figma has
 *  this at 40 (224:801); 12 is a deliberate departure. Viewport pixels, not
 *  stage units — this last step leaves the folder's coordinate space, so the
 *  margin stays a true 12px at any window size instead of scaling with the
 *  desk. */
const EXPAND_INSET = 12;

/**
 * The expanded page's back control. It sits flush in the page's own top-left
 * corner rather than inset, so only its bottom-right corner is rounded — the
 * page's `overflow: hidden` and border radius carve the other three to match
 * the corner it fills. Hovering widens it to reveal the label.
 */
const BACK_SIZE = 36;
const BACK_RADIUS = 12;
const BACK_LABEL = "Back To Home";

export function FileFolder({
  theme,
  open,
  onOpenChange,
  className,
  deepLinkProject = null,
}: {
  theme: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  /** Index of the project to mount already expanded (deep link from
   *  /projects/<slug>). Consumed once, on mount. */
  deepLinkProject?: number | null;
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
  /** Index of the project filling the viewport, once the card has handed off
   *  to the page. Lives outside the folder's transformed stage entirely. */
  const [expanded, setExpanded] = useState<number | null>(null);
  /**
   * True from the moment a project card is clicked until that card is back in
   * the stack — across the pull, the expanded page, and the collapse home.
   *
   * The folder must read OPEN for that entire span, and nothing else can say
   * so: `open` is false whenever the folder was raised by hover rather than a
   * click, and `hovered` is false because the pointer spends the whole time
   * over the expanded page, which is portalled to <body> and therefore
   * outside this component. It is set synchronously on click, before the
   * centring await, so the folder never blinks shut in the gap.
   *
   * This replaces an earlier `tucked` flag that did the opposite — it forced
   * the folder *shut* behind the expanded page — which is what left the card
   * animating home into a closed folder.
   */
  const [cardOut, setCardOut] = useState(false);
  /** The case study mounts only once the card is fully out and at rest. */
  const pullCardRef = useRef<HTMLDivElement>(null);
  const pullTlRef = useRef<gsap.core.Timeline | null>(null);
  const centerOnPiece = useCenterOnPiece();
  const shown = cardOut || open || (hovered && !dismissed);

  /** Unpublished project: clicking its sheet says so instead of pulling. */
  const [wipNotice, setWipNotice] = useState<string | null>(null);
  const wipTimer = useRef<number | undefined>(undefined);
  const showWipNotice = useCallback((name: string) => {
    setWipNotice(name);
    window.clearTimeout(wipTimer.current);
    wipTimer.current = window.setTimeout(() => setWipNotice(null), 2400);
  }, []);

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

  // Deep link / /projects landing: the folder is wanted open and centred.
  // A deep link additionally pre-pulls its project's card so the case study
  // is simply there when the page first renders (the pull effect below takes
  // its instant path from here).
  const instantPullRef = useRef(false);
  useLayoutEffect(() => {
    if (deepLinkProject == null && !open) return;
    if (deepLinkProject != null) {
      const wip = PROJECTS[deepLinkProject].wip;
      if (!wip) {
        instantPullRef.current = true;
        openness.current.t = 1;
        paint(1);
        pulledRef.current = deepLinkProject;
        setCardOut(true);
        setPulled(deepLinkProject);
      } else {
        // Unpublished: land on the open folder and say so. The URL hands
        // itself back to the folder since there is no page to own it.
        openness.current.t = 1;
        paint(1);
        if (window.location.pathname !== "/projects") {
          history.replaceState(null, "", "/projects");
        }
        showWipNotice(PROJECTS[deepLinkProject].name);
      }
    }
    // Deferred past the stage's own mount: the scattered canvas scrolls to
    // its Figma resting origin in a layout effect that runs after this one
    // (child-first), and centring measured against the pre-origin scroll
    // would land the folder in the wrong place.
    const t = window.setTimeout(() => {
      if (centerOnPiece && buttonRef.current) {
        void centerOnPiece(buttonRef.current);
      }
    }, 150);
    return () => window.clearTimeout(t);
    // Runs once on mount: the landing state is read from the URL exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // The sheet rises in its own slot: its z-index stays below the sheets
      // stacked in front of it, so it never covers them — only a click (the
      // pull) promotes a sheet above the stack.
      move(active, HOVERED[active]);
    }
  }, [liftedSheet, shown, pulled]);

  // Closing the folder returns any pulled card with it — but only when the
  // folder closes on its own. During a pull the folder is *told* to close (the
  // card is taking over the viewport), and that must not tear the card down.
  useEffect(() => {
    if (open || pulledRef.current !== null) return;
    pullTlRef.current?.kill();
    setExpanded(null);
    setCardOut(false);
    setPulled(null);
  }, [open]);

  /**
   * Pulling a card out of the folder, in the order the variants lay it out:
   *
   *   14785 -> 14786…14791   the sheet rises out of the stack (already there,
   *                          hovered) and grows to its full 868 height
   *   14786 -> 14792…14797   it clears the folder entirely, top at -468
   *   14797 -> 14798…14803   it settles back down onto the folder, top at 76
   *   -> 224:801             it expands to the viewport at a 40px inset
   *
   * The sheet hands off to the card invisibly at identical geometry, so the
   * two never both show. The folder is asked to close as the card settles, so
   * by the time the page fills the viewport the folder behind it is back at
   * rest — and the case study only mounts once the page has finished expanding.
   */
  useLayoutEffect(() => {
    if (pulled === null) return;
    const i = pulled;
    const sheet = sheetRefs.current[i];
    const card = pullCardRef.current;
    if (!sheet || !card) return;
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      instantPullRef.current;
    const clearPose = { ...PULL_FRONT[i], rotate: 0, transformOrigin: "0 0" };
    gsap.killTweensOf(sheet);
    if (reduce) {
      gsap.set(sheet, { visibility: "hidden" });
      gsap.set(card, { ...PULL_REST[i], rotate: 0, transformOrigin: "0 0", visibility: "visible" });
      setExpanded(i);
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => {
        // Hand the card over to the viewport-level page, which grows out of
        // exactly the box the card now occupies.
        setExpanded(i);
      },
    });
    pullTlRef.current = tl;
    // 1. Up — on the SHEET, at its own z-index, so it rises out from *behind*
    //    the cards stacked over it. Promoting it to the front here (as this
    //    used to) skipped the whole point of the anticipation: the card
    //    appeared on top and then merely translated.
    tl.to(sheet, {
      ...clearPose,
      duration: 0.45,
      ease: "power3.out",
      overwrite: true,
    });
    // 2. To the front — the handoff itself. The sheet vanishes and the z20
    //    card takes over at identical geometry, so "coming forward" costs no
    //    time and cannot be seen as a swap.
    tl.set(sheet, { visibility: "hidden" });
    // `fromTo` rather than `.set()` + `.to(…, overwrite: true)`: that overwrite
    // kills every other tween on the target, including a `.set()` queued
    // earlier in this same timeline, so the starting pose silently never
    // applied. Folding the start values into the tween sidesteps it entirely.
    tl.fromTo(
      card,
      { ...clearPose, visibility: "visible" },
      {
        ...PULL_REST[i],
        // 3. Down onto the folder, which stays open beneath it.
        duration: 0.45,
        ease: "power3.inOut",
        // Without this, GSAP applies the `from` pose the instant the tween is
        // built (t=0), not when its turn in the timeline arrives (t=0.45) —
        // so the card appeared, visible, while the sheet was still mid-rise.
        // Both were on screen at once for ~365ms: the duplicate.
        immediateRender: false,
      },
    );
    return () => {
      tl.kill();
    };
  }, [pulled]);

  /**
   * Returning the card: the page shrinks back into the card's box (owned by
   * `ExpandedPage`, which also handles Escape), the folder re-opens, the card
   * rises clear of it again and then drops into its slot in the stack — the
   * pull run backwards. This runs only once the collapse has finished, so the
   * card is never animating in the folder while a full-size page is still on
   * top of it.
   */
  const onShrunk = useCallback(() => {
    // Unmounting the page is this callback's job, not the click handler's —
    // see `shrink` in ExpandedPage.
    setExpanded(null);
    // Hand the address bar back to the folder. replaceState, so Back from the
    // case study returns to wherever the visit was before it opened.
    if (window.location.pathname.startsWith("/projects")) {
      history.replaceState(null, "", "/projects");
    }
    const i = pulledRef.current;
    if (i === null) {
      setCardOut(false);
      return;
    }
    const sheet = sheetRefs.current[i];
    const card = pullCardRef.current;
    const finish = () => {
      if (sheet) gsap.set(sheet, { zIndex: i });
      pulledRef.current = null;
      setPulled(null);
      // The pointer may well have been sitting still over the folder this
      // whole time, in which case no enter event ever fires and `hovered`
      // would stay stale-false — so ask the DOM where the pointer actually is
      // rather than waiting to be told. `:hover` is true regardless of
      // whether an event happened to be dispatched.
      const onFolder = [hitRef.current, ...sheetRefs.current].some(
        (el) => el?.matches(":hover"),
      );
      setHovered(onFolder);
      setCardOut(false);
    };
    if (!sheet || !card) {
      finish();
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clearPose = { ...PULL_FRONT[i], rotate: 0, transformOrigin: "0 0" };
    const stacked = { ...SHEETS[i], rotate: 0, transformOrigin: "0 0" };
    if (reduce) {
      gsap.set(card, { visibility: "hidden" });
      gsap.set(sheet, { visibility: "visible", ...stacked });
      finish();
      return;
    }
    const tl = gsap.timeline({ onComplete: finish });
    pullTlRef.current = tl;
    // The pull, backwards: up off the folder…
    tl.to(card, { ...clearPose, duration: 0.45, ease: "power3.inOut" }, 0.1);
    // …z-index back to default — the card hands off to the sheet, which lives
    // in the stack — and then down into its slot. `fromTo` keeps the starting
    // pose inside the tween so `overwrite` can't strip it (see the pull).
    tl.set(card, { visibility: "hidden" });
    tl.fromTo(
      sheet,
      { ...clearPose, visibility: "visible" },
      {
        ...stacked,
        duration: 0.45,
        ease: "power3.inOut",
        overwrite: true,
        // Mirrors the pull: without this the sheet reappeared at t=0 instead
        // of waiting for the card to actually finish clearing the folder.
        immediateRender: false,
      },
    );
  }, []);

  const pullOut = async (i: number) => {
    if (pulledRef.current !== null) return;
    // Unpublished case study: lift nothing, just say so.
    if (PROJECTS[i].wip) {
      showWipNotice(PROJECTS[i].name);
      return;
    }
    // Claimed synchronously, before the await, so a second click during the
    // pan is ignored rather than starting a second pull.
    pulledRef.current = i;
    setCardOut(true);
    setLiftedSheet(null);
    // Bring the folder to the middle of the viewport *first*, then pull. The
    // page expands out of the card's own box, so a folder sitting off in a
    // corner of the desk would otherwise have its card fly in from the edge —
    // centring first means the pull and the expansion both play from the
    // middle. Scattered only; Organised already holds the focused piece
    // centred and supplies no context, so this resolves immediately there.
    if (centerOnPiece && buttonRef.current) {
      try {
        await centerOnPiece(buttonRef.current);
      } catch {
        // A pan that never settles must not strand the folder mid-pull.
      }
    }
    setPulled(i);
  };

  // While a project fills the viewport the desk behind it must not scroll —
  // the page carries its own scroller. Also set a data attribute so CSS can
  // disable pointer-events on the background.
  useEffect(() => {
    if (expanded === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.projectOpen = "true";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.projectOpen;
    };
  }, [expanded]);

  // The expanded page owns /projects/<slug> in the address bar. On a deep
  // link the URL is already right, so this only fires for clicks.
  useEffect(() => {
    if (expanded === null) return;
    const target = `/projects/${PROJECTS[expanded].slug}`;
    if (window.location.pathname !== target) {
      history.pushState(null, "", target);
    }
  }, [expanded]);

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
              //
              // Centring and toggling are different intents, so tell them
              // apart by whether the piece actually travelled: a click that
              // *fetched* the folder from elsewhere on the desk means "bring
              // this to me and open it", and must not also toggle it shut if
              // it happened to be open already. Once it is centred, clicking
              // it toggles as normal.
              let moved = false;
              if (centerOnPiece && buttonRef.current) {
                const before = buttonRef.current.getBoundingClientRect();
                await centerOnPiece(buttonRef.current);
                const after = buttonRef.current.getBoundingClientRect();
                moved =
                  Math.abs(after.left - before.left) > 1 ||
                  Math.abs(after.top - before.top) > 1;
              }
              onOpenChange(moved ? true : !open);
            }}
            // Opts this click out of OrganizedScene's swipe-track pointer
            // capture, which would otherwise steal it before it reaches onClick.
            data-no-track-drag
            aria-label={open ? "Close file" : "Open file"}
            aria-expanded={open}
            className="absolute block cursor-pointer border-0 bg-transparent p-0"
            style={{
              ...HIT_CLOSED,
              position: "absolute",
              zIndex: 5,
              pointerEvents: "auto",
            }}
          />

          {/* The six project sheets, between the folder's back and its flap.
              The layer clips at the stage box on the sides and bottom — the
              sheets run past the pocket line and the flap's curved edge
              carves them — but keeps headroom above for the raise. A pulled
              sheet clears to -895 at the extreme, so 400px of headroom (which
              covered the hover raise) cut the card off mid-flight. */}
          <div
            ref={sheetLayerRef}
            style={{
              ...layer,
              zIndex: 6,
              clipPath: "inset(-1000px 0px 0px 0px)",
            }}
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
                aria-label={
                  p.wip ? `${p.name} — coming soon` : `Open ${p.name} case study`
                }
                className="block border-0"
                style={{
                  ...sheetStyle,
                  pointerEvents: shown && pulled === null ? "auto" : "none",
                }}
                tabIndex={shown && pulled === null ? 0 : -1}
              >
                <img
                  src={cardImage(p)}
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
                card still takes the pointer directly. Strips BELOW the lifted
                sheet stand down too: its body slides up beneath their bands,
                and a strip stealing the hover mid-slide makes the two sheets
                swap-lift in a jittering loop at the border. */}
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
                    shown &&
                    pulled === null &&
                    (liftedSheet === null || i > liftedSheet)
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

          {/* The pulled-out project card, above the flap so it can clear the
              folder and then settle on top of it. It stays hidden until the
              pull hands off to it at the lift pose, and it only ever shows the
              thumbnail — the case study itself belongs to the viewport page
              below, which grows out of this card's final box. */}
          {pulled !== null ? (
            <div
              ref={pullCardRef}
              aria-hidden
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
                pointerEvents: "none",
              }}
            >
              <img
                src={cardImage(PROJECTS[pulled])}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>

      {expanded !== null ? (
        <ExpandedPage
          project={PROJECTS[expanded]}
          theme={theme}
          from={pullCardRef.current}
          onShrunk={onShrunk}
        />
      ) : null}

      {/* "Coming soon" for unpublished projects — a transient pill floating
          above the folder, clear of the sheets and the hit area. */}
      {wipNotice ? (
        <div
          role="status"
          className="absolute left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap capitalize"
          style={{
            top: -14 * scale,
            background: "#2f2f2f",
            color: "#fdfeff",
            fontFamily: "'DM Mono', monospace",
            fontWeight: 500,
            fontSize: 14,
            padding: "10px 18px",
            borderRadius: 999,
            boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
          }}
        >
          {wipNotice} — coming soon
        </div>
      ) : null}
    </div>
  );
}

/**
 * A project blown up to fill the viewport at Figma's 40px inset (224:801).
 *
 * Portalled to `<body>` on purpose: the folder lives inside the canvas's
 * `transform: scale()`, and a transformed ancestor makes `position: fixed`
 * resolve against that ancestor instead of the viewport — so an in-place
 * overlay would be scaled and clipped along with the desk.
 *
 * It grows out of, and shrinks back into, the exact screen box the pulled card
 * occupies, so the handoff in both directions is invisible.
 */
function ExpandedPage({
  project,
  theme,
  from,
  onShrunk,
}: {
  project: Project;
  theme: Theme;
  from: HTMLElement | null;
  /** Called once the page has finished collapsing back into the card — this
   *  is what unmounts it, so the shrink is always seen through to the end. */
  onShrunk: () => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  /**
   * How far the case study's furniture is unfolded, 0..1 — see `chrome` in
   * CaseStudy. Nothing cross-fades: the hero *is* the sheet's thumbnail and
   * stays put throughout, while the rail and body open out around it.
   */
  const [chrome, setChrome] = useState(0);
  const chromeRef = useRef({ v: 0 });
  /** Guards a second Escape/click while the collapse is already running. */
  const closingRef = useRef(false);
  /** Back control: collapsed to a square until hovered or focused. */
  const [backOpen, setBackOpen] = useState(false);
  const backLabelRef = useRef<HTMLSpanElement>(null);
  const [labelW, setLabelW] = useState(0);
  useLayoutEffect(() => {
    if (backLabelRef.current) setLabelW(backLabelRef.current.scrollWidth);
  }, []);
  // The expanded page stays paper-white in both themes — see CaseStudy — so
  // its own face and border are fixed rather than inverting with the desk.
  const face = "#fdfeff";
  const ink = "#2f2f2f";
  /** The card's screen box, captured before the folder starts closing under
   *  it — by the time we shrink back, the folder has moved on. */
  const originRef = useRef<DOMRect | null>(null);

  const viewportBox = () => ({
    left: EXPAND_INSET,
    top: EXPAND_INSET,
    width: window.innerWidth - EXPAND_INSET * 2,
    height: window.innerHeight - EXPAND_INSET * 2,
  });

  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const target = viewportBox();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = from?.getBoundingClientRect() ?? null;
    originRef.current = r;
    if (!r || reduce) {
      gsap.set(el, target);
      chromeRef.current.v = 1;
      setChrome(1);
      return;
    }
    const tween = gsap.fromTo(
      el,
      { left: r.left, top: r.top, width: r.width, height: r.height },
      { ...target, duration: EXPAND_DUR, ease: EXPAND_EASE },
    );
    // Mirror of the collapse: the page unfolds over the LAST `CROSSFADE` of
    // the grow so it finishes exactly as the box lands, which is the
    // time-reverse of folding away over the FIRST `CROSSFADE` of the shrink.
    const swap = gsap.to(chromeRef.current, {
      v: 1,
      duration: CROSSFADE,
      delay: Math.max(0, EXPAND_DUR - CROSSFADE),
      ease: EXPAND_EASE,
      onUpdate: () => setChrome(chromeRef.current.v),
    });
    return () => {
      tween.kill();
      swap.kill();
    };
    // Runs once per expansion: `from` is read at mount and captured above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Collapse back into the card. `onShrunk` is the *completion* callback and
   * the only thing that unmounts this page — an earlier version fired the
   * unmount alongside the tween, so the element left the DOM on the next
   * render and the shrink played out on a detached node: invisible, and the
   * page simply blinked out.
   */

  const shrink = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = pageRef.current;
    const r = originRef.current;
    if (!el || !r || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onShrunk();
      return;
    }
    /*
     * Sequential, and deliberately NOT a strict time-reversal of the grow.
     * Reversing exactly meant the furniture collapsed *while* the box was
     * already shrinking, so the page appeared to fold in behind the hero —
     * two moves fighting for the same moment.
     *
     * Expanding reads as [box grows] -> [hero settles into place]. The mirror
     * of that is the reverse ORDER, one after the other: the hero grows back
     * out to fill the page at full size, and only then does the whole thing
     * travel home.
     */
    const tl = gsap.timeline({ onComplete: onShrunk });
    tl.to(chromeRef.current, {
      v: 0,
      duration: CROSSFADE,
      ease: SHRINK_EASE,
      onUpdate: () => setChrome(chromeRef.current.v),
    });
    tl.to(el, {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      duration: EXPAND_DUR,
      ease: SHRINK_EASE,
    });
  }, [onShrunk]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && shrink();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shrink]);

  // Browser Back while the page is open closes it — the expand pushed
  // /projects/<slug>, so a popstate that takes the URL away from this
  // project reads as the same intent as Escape.
  const popShrinkRef = useRef(shrink);
  useEffect(() => {
    popShrinkRef.current = shrink;
  }, [shrink]);
  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname !== `/projects/${project.slug}`) {
        popShrinkRef.current();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [project.slug]);

  return createPortal(
    <div
      ref={pageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} case study`}
      data-no-track-drag
      data-project-overlay
      className="z-[100] overflow-hidden"
      style={{
        position: "fixed",
        top: EXPAND_INSET,
        left: EXPAND_INSET,
        width: viewportBox().width,
        height: viewportBox().height,
        background: face,
        border: `2px solid ${ink}`,
        borderRadius: SHEET_RADIUS,
        boxSizing: "border-box",
      }}
    >
      {/* The case study fills the page. Its own hero is the sheet's
          thumbnail, so there is nothing to cross-fade — `chrome` just unfolds
          the rail and body around an image that never moves or swaps. */}
      <div className="h-full w-full">
        <CaseStudy
          project={project}
          theme={theme}
          chrome={chrome}
          sections={
            project.slug === "hacksvit"
              ? HACKSVIT_SECTIONS
              : project.slug === "greenera"
                ? GREENERA_SECTIONS
                : project.slug === "the-family-table"
                  ? THE_FAMILY_TABLE_SECTIONS
                  : undefined
          }
        />
      </div>

      {/* Back control, filling the page's top-left corner. Only the
          bottom-right corner is rounded here; the page clips the rest. */}
      <button
        type="button"
        onClick={shrink}
        onMouseEnter={() => setBackOpen(true)}
        onMouseLeave={() => setBackOpen(false)}
        onFocus={() => setBackOpen(true)}
        onBlur={() => setBackOpen(false)}
        data-no-track-drag
        // The visible label is part of the accessible name (WCAG 2.5.3), with
        // the project appended so the control still says what it closes while
        // collapsed.
        aria-label={`${BACK_LABEL} — close ${project.name} case study`}
        className="absolute left-0 top-0 z-10 flex cursor-pointer items-center overflow-hidden border-0 p-0"
        style={{
          background: "#2f2f2f",
          color: "#fdfeff",
          height: BACK_SIZE,
          borderBottomRightRadius: BACK_RADIUS,
          transition: "width 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
          width: BACK_SIZE + (backOpen ? labelW : 0),
        }}
      >
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ width: BACK_SIZE, height: BACK_SIZE }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5m0 0 7-7m-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {/* Measured rather than guessed: the button tweens to a real width, so
            the label can be any length without a magic number to keep in step
            (and `width: auto` cannot be transitioned). */}
        <span
          ref={backLabelRef}
          aria-hidden
          className="whitespace-nowrap pr-[14px] text-[15px] leading-none"
          style={{
            opacity: backOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        >
          {BACK_LABEL}
        </span>
      </button>
    </div>,
    document.body,
  );
}
