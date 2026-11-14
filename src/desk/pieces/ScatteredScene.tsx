import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AboutBook } from "./AboutBook";
import { FocusObject } from "./FocusObject";
import { ArchiveOverlay } from "./ArchiveOverlay";
import { Coaster } from "./Coaster";
import { CoffeeCup } from "./CoffeeCup";
import { CuttingMat } from "./CuttingMat";
import { CvV1 } from "./CvV1";
import { DeskMat } from "./DeskMat";
import { Draggable } from "./Draggable";
import { FileFolder } from "./FileFolder";
import { GoldenRatioMat } from "./GoldenRatioMat";
import { IntroCard } from "./IntroCard";
import { Keyboard, KEYBOARD_H, KEYBOARD_W } from "./Keyboard";
import { PencilTray } from "./PencilTray";
import type { Theme } from "./Piece";
import { Puzzle } from "./Puzzle";
import { StampSystem } from "./StampSystem";
import { Sticker } from "./Sticker";
import { useFocusedId } from "./ScatteredFocus";

/**
 * Figma's Scattered frame (`Frame 48096042` 458:45201, inside the `macscreen`
 * 1512x982 window 491:2154).
 *
 * ── Units ──────────────────────────────────────────────────────────────────
 * The frame is 2437.33 x 1911 in its own file, sitting at (-463, 0) behind a
 * 1512-wide window. Every number below is that frame multiplied by
 * `FIGMA_SCALE` (3580 / 1911), which is the factor that leaves the *pieces*
 * at the sizes they are already drawn at: the desk mat solves to 3044x1093,
 * the cutting mat to 1545.26x1009.72, the book to 671x900, the intro card to
 * 630x386 — the file's own values to four significant figures.
 *
 * That is the whole reason for the conversion. Expressing the canvas in raw
 * Figma units instead would have meant dividing every piece's intrinsic size,
 * the puzzle cell, the pencil wells and the book's page geometry by the same
 * factor, for no gain: the composition is identical either way, and this way
 * a placement change stays a placement change.
 *
 * ── Reading a placement off the frame ──────────────────────────────────────
 * Figma reports an *axis-aligned bounding box* for a rotated instance, never
 * the piece's own size. Each piece's rotation below was solved from its box
 * against its known unrotated dimensions, and the left/top is the *unrotated*
 * top-left — the frame's box centre, minus half the piece — which is what CSS
 * `rotate()` about the centre needs. Every solve came back with
 * sin²+cos² within 0.0006 of 1, so the sizes and the boxes agree.
 *
 * Three pieces are not simply re-placed, because the frame draws them at a
 * different size than the code did:
 *   · the keyboard, 1.06x (see `Keyboard.tsx`)
 *   · the file folder, 0.808x (`FOLDER_FIT` below)
 *   · the loose pencils, 1.28x — up to the 42.219x822.446 the seated ones
 *     already use, which is the size jump on pick-up that `pencilLayout`
 *     flagged and this finally closes.
 */
const FIGMA_SCALE = 3580 / 1911;

export const CANVAS_W = 4566;
/**
 * Taller than the frame it is derived from, on purpose.
 *
 * The frame is 1911 units tall, which is 3580 here — but two pieces are drawn
 * hanging past its bottom edge, and Figma simply clips them. The canvas is a
 * scrollable desk rather than a fixed frame, so clipping them is not a
 * faithful reproduction, it is a cut-off desk: measured against 3580, the
 * desk mat's rotated corner ran 99 units past the edge and the golden-ratio
 * mat 128. The grid mat is lifted back onto the desk below, which leaves the
 * desk mat's corner as the deepest thing on the canvas; 3700 clears it with
 * room to spare and costs nothing but pan range.
 *
 * The origin is untouched, so the resting view is exactly where it was — this
 * only gives the desk somewhere to end.
 */
export const CANVAS_H = 3700;
/**
 * Where the window rests on the canvas. The frame sits at x -463 behind the
 * window, so the desk opens 867 canvas units in — on the intro card, the
 * cutting mat and the book, which is the composition the frame is centred on.
 * The frame's top edge is the window's top edge, so there is no vertical
 * offset to apply.
 */
export const CANVAS_ORIGIN_X = -463 * FIGMA_SCALE;
export const CANVAS_ORIGIN_Y = 0;

/**
 * The folder is drawn smaller in the new frame than its stage box is authored
 * at. Applied as a wrapper transform rather than by rescaling the stage: every
 * number inside `FileFolder` — the sheet matrices, the pivot, the open/shut
 * tween — is expressed in that one 1403x945 space, and rescaling it would mean
 * rescaling all of them.
 */
const FOLDER_FIT = 0.80785;

/**
 * Stacking order for the desk.
 *
 * Named rather than sprinkled as literals because two of these layers span the
 * whole canvas — the pencil tray and the puzzle both position their own
 * children — and a full-canvas layer silently swallows every pointer event
 * beneath it unless it is explicitly transparent to hit-testing. Both are
 * `pointer-events-none` at the wrapper with their pieces opting back in.
 */
const Z = {
  /** The desk surface everything else sits on. */
  deskMat: -1,
  /** Scenery. Also `pointer-events-none`: mats are not pick-up-able, and the
   *  recoloured surfaces are meant to read as backdrop, not as objects. */
  mats: 0,
  /** Flat things lying *on* the desk — printed and stuck-down. Nothing here
   *  is thick, so nothing here needs to sit above anything else in the band. */
  flat: 1,
  /**
   * Objects with height, and everything the visitor handles. One band on
   * purpose: these all sit on top of the paper, and within the band DOM order
   * decides — which is why the source order below is the layering, front-most
   * last. It runs cup and coaster, pencils, stamps, puzzle, then the book and
   * the folder, the two pieces that open into something and so must never
   * come up from under anything else. The stamps and the puzzle each open
   * their own stacking context, so their internal numbering cannot leak into
   * this scale.
   */
  objects: 2,
  /**
   * The two focus layers. A focused object leaves the desk's own bands
   * entirely rather than being bumped a step within them: it has to clear the
   * scrim, and the scrim has to clear everything else, so both live above the
   * scale the desk is built on and neither can collide with it.
   */
  scrim: 20,
  focused: 30,
} as const;

export function ScatteredScene({
  theme,
  bookOpen,
  onBookOpenChange,
  fileOpen,
  onFileOpenChange,
  draggable,
  scale,
  deepLinkProject = null,
  deepLinkSpread = null,
}: {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
  draggable: boolean;
  /** Canvas `fit` scale, so pointer deltas convert to canvas units. */
  scale: number;
  /** Project to mount already expanded (deep link from /projects/<slug>). */
  deepLinkProject?: number | null;
  /** Spread to open the about book to (deep link from /work-experience). */
  deepLinkSpread?: number | null;
}) {
  // Opened by finishing the puzzle. Owned here rather than in App because
  // nothing outside Scattered can reach it.
  const [archiveOpen, setArchiveOpen] = useState(false);
  const focusedId = useFocusedId();

  const drag = (children: React.ReactNode) => (
    <Draggable enabled={draggable} scale={scale}>
      {children}
    </Draggable>
  );

  return (
    <div className="relative shrink-0 overflow-visible" style={{ width: CANVAS_W, height: CANVAS_H }}>
      {/* The desk surface is the backdrop: it sits behind every other piece,
          the cutting mat included. */}
      <div className="pointer-events-none absolute left-[190.64px] top-[2448.72px] rotate-[-5.25deg]" style={{ zIndex: Z.deskMat }}>
        <DeskMat theme={theme} className="h-[1093px] w-[3044px]" />
      </div>

      {/* Mats are scenery. They take no pointer events at all, so nothing about
          them suggests they can be picked up — which is the whole point of the
          recolour. */}
      <div className="pointer-events-none absolute left-[516.3px] top-[273.68px] rotate-[2.38deg]" style={{ zIndex: Z.mats }}>
        <CuttingMat theme={theme} className="h-[1009.72px] w-[1545.26px]" />
      </div>
      {/* Moved off the frame's own coordinate, and the only piece that is.
          The frame parks the grid mat below the puzzle and lets it hang past
          the bottom edge, where Figma clips it; here it is the surface the
          puzzle is worked on, so it is centred on the pile
          (`puzzleState.SLOTS`) instead. Its size and 6.31° tilt are still the
          file's — only the placement moved. */}
      <div className="pointer-events-none absolute left-[1428.2px] top-[2675.75px] rotate-[6.31deg]" style={{ zIndex: Z.mats }}>
        <GoldenRatioMat theme={theme} className="h-[508px] w-[777px]" />
      </div>

      {/* ── Flat band ──────────────────────────────────────────────────── */}

      {/* Under the folder, which overlaps its top-right corner in the design.
          The frame tilts it; it used to sit square. */}
      <div className="absolute left-[2635.57px] top-[1145.68px]" style={{ zIndex: Z.flat }}>
        {drag(
          <div className="rotate-[4.07deg]">
            <Keyboard theme={theme} style={{ width: KEYBOARD_W, height: KEYBOARD_H }} />
          </div>,
        )}
      </div>

      {/* The resume reads rather than opens, so it is the one piece that asks
          for `width` fit: the camera frames the sheet's width and leaves the
          rest of the page below the fold to be scrolled through, the way you
          would hold a sheet of paper up rather than lay it flat. */}
      <FocusObject
        id="resume"
        left={787.88}
        top={1660.28}
        width={789.8}
        height={1022.1}
        tilt={-7.58}
        z={Z.flat}
        focusZ={Z.focused}
        fill={0.86}
        fit="width"
        scrollable
        draggable={draggable}
        scale={scale}
      >
        <CvV1 className="h-[1022.1px] w-[789.8px]" />
      </FocusObject>

      <div className="absolute left-[1836.43px] top-[816.41px]" style={{ zIndex: Z.flat }}>
        {drag(
          <div className="rotate-[-7.86deg]">
            <IntroCard theme={theme} className="h-[386px] w-[630px]" />
          </div>,
        )}
      </div>

      {/* The frame draws all three stickers square to the desk. */}
      <div className="absolute left-[415.26px] top-[1136px]" style={{ zIndex: Z.flat }}>
        {drag(<Sticker n={1} className="h-[169.59px] w-[179.41px]" />)}
      </div>
      <div className="absolute left-[374.26px] top-[1368px]" style={{ zIndex: Z.flat }}>
        {drag(<Sticker n={2} className="h-[184.74px] w-[226.12px]" />)}
      </div>
      <div className="absolute left-[147.26px] top-[1220px]" style={{ zIndex: Z.flat }}>
        {drag(<Sticker n={3} className="h-[169.02px] w-[191.17px]" />)}
      </div>

      {/* ── Object band, back to front ─────────────────────────────────── */}

      <div className="absolute left-[2315px] top-[529px]" style={{ zIndex: Z.objects }}>
        {drag(<CoffeeCup theme={theme} className="h-[282.08px] w-[278.82px]" />)}
      </div>
      <div className="absolute left-[599.12px] top-[2171px]" style={{ zIndex: Z.objects }}>
        {drag(
          <div className="rotate-[4.12deg]">
            <Coaster theme={theme} className="h-[359px] w-[361px]" />
          </div>,
        )}
      </div>

      {/* Box and loose pencils are one group: pencils move between the two, so
          neither can own its own placement (see PencilTray). */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: Z.objects }}>
        <PencilTray theme={theme} scale={scale} draggable={draggable} />
      </div>

      {/* Ink pad and the two stamps. Like the puzzle, this spans the canvas
          but is transparent to hit-testing — only the stamps take pointers. */}
      <StampSystem theme={theme} scale={scale} enabled={draggable} z={Z.objects} />

      {/* The Archive puzzle. Its wrapper spans the canvas but is transparent
          to hit-testing; only the pieces themselves take clicks. */}
      <Puzzle
        scale={scale}
        enabled={draggable}
        z={Z.objects}
        focusZ={Z.focused}
        onSolvedOpen={() => setArchiveOpen(true)}
      />

      {/* The +27.6 on `top` is measured, not derived. The closed cover hinges
          about its spine (`transformOrigin: left center`) rather than about
          the spread's centre, so the shut book's box does not sit centred in
          the 1342x900 layout the placement is solved against — it rides that
          much high. Verified against the frame: the cover's box lands at
          416.2, 118.0 in frame units, which is `aboutme_book` 458:45203. */}
      {/* `straighten={false}`: the book's rest tilt is GSAP-owned inside
          AboutBook so it can flatten as part of opening, and a second hand on
          the same rotation would land it somewhere neither intended. The
          camera frames the full 1342-wide spread rather than the shut cover,
          so opening does not immediately overflow the frame it just took. */}
      <FocusObject
        id="about-book"
        left={480}
        top={274.87}
        width={1342}
        height={900}
        straighten={false}
        z={Z.objects}
        focusZ={Z.focused}
        // Lower than the resume's, and deliberately: a spread is read across
        // rather than down, so the margin either side is what stops the two
        // pages running into the edges of the window. At 0.86 the book met
        // the viewport almost exactly on its limiting axis and had nowhere to
        // put the shadow it casts.
        fill={0.78}
        draggable={draggable}
        scale={scale}
        // Letting go of an object puts it back the way it was found, state
        // included — a book left lying open on a desk you have walked away
        // from is a book you did not finish putting down.
        onFocusChange={(f) => {
          if (!f) onBookOpenChange(false);
        }}
      >
        <AboutBook theme={theme} open={bookOpen} onOpenChange={onBookOpenChange} deepLinkSpread={deepLinkSpread} />
      </FocusObject>

      {/* No placement rotation here: the folder carries its own rest tilt and
          straightens itself on open, so a wrapper rotation would compound with
          it and leave the opened folder off-square. The scale is a wrapper
          though — see FOLDER_FIT — and sits inside `drag` so the pointer
          delta is still measured in plain canvas units. */}
      {/* A smaller `fill` than the others on purpose — the brief asks the
          folder for "a small zoom-in so its contents are easier to interact
          with", not for the sheets to fill the window. `straighten={false}`
          for the same reason as the book: the folder squares itself up as
          part of opening. */}
      <FocusObject
        id="file-folder"
        left={2849.46}
        top={374.82}
        width={1340 * FOLDER_FIT}
        height={926 * FOLDER_FIT}
        straighten={false}
        z={Z.objects}
        focusZ={Z.focused}
        fill={0.72}
        draggable={draggable}
        scale={scale}
        onFocusChange={(f) => {
          if (!f) onFileOpenChange(false);
        }}
      >
        <div className="origin-top-left" style={{ transform: `scale(${FOLDER_FIT})` }}>
          <FileFolder
            theme={theme}
            open={fileOpen}
            onOpenChange={onFileOpenChange}
            deepLinkProject={deepLinkProject}
          />
        </div>
      </FocusObject>

      {/* Sits between the desk and whatever is focused, so being focused is
          what puts an object in front of it. */}
      <FocusScrim active={focusedId !== null} />

      {archiveOpen ? <ArchiveOverlay onClose={() => setArchiveOpen(false)} /> : null}
    </div>
  );
}

/**
 * The desk falling back while one object is looked at.
 *
 * `backdrop-filter` rather than a filter on the desk itself: it blurs what is
 * already painted underneath, so it costs one composited layer instead of
 * re-rasterising forty pieces, and the focused object — which sits above it —
 * is untouched without having to be excluded from anything.
 *
 * The blur is in canvas units and so is scaled by the camera along with
 * everything else, landing between two and four screen pixels across the
 * zoom range. That is the intent: the depth of field belongs to the scene,
 * not to the screen.
 */
function FocusScrim({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // Kept on through the fade out, or the desk snaps back into focus a
  // half-second before the camera has finished pulling away from it.
  const [blurring, setBlurring] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) setBlurring(true);
    const tween = gsap.to(el, {
      opacity: active ? 1 : 0,
      duration: active ? 0.5 : 0.45,
      ease: "power2.out",
      onComplete: () => {
        if (!active) setBlurring(false);
      },
    });
    return () => {
      tween.kill();
    };
  }, [active]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: Z.scrim,
        opacity: 0,
        background: "rgba(16,17,19,0.3)",
        backdropFilter: blurring ? "blur(4px)" : undefined,
        WebkitBackdropFilter: blurring ? "blur(4px)" : undefined,
      }}
    />
  );
}
