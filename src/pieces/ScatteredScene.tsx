import { useState } from "react";
import { AboutBook } from "./AboutBook";
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

/** Figma's Scattered frame (458:45201) — pieces are spread across a canvas far
 *  larger than the 1729x1117 window, which is what you pan around. */
export const CANVAS_W = 5313;
export const CANVAS_H = 3580;
/**
 * Where the window rests on that canvas: centred on the intro card, which is
 * the hero and so the thing the desk should open on.
 *
 * The card is 630x386 with its unrotated top-left at (2242.43, 843.41), so its
 * centre is (2557.43, 1036.41). Subtracting half the 1729x1117 window puts
 * that centre in the middle of the view.
 */
export const CANVAS_ORIGIN_X = -1693;
export const CANVAS_ORIGIN_Y = -478;

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
   * last. The stamps and the puzzle each open their own stacking context, so
   * their internal numbering cannot leak into this scale.
   */
  objects: 2,
} as const;

/**
 * The Scattered composition.
 *
 * Every placement below is derived from Figma's frame. Figma reports an
 * axis-aligned bounding box for a rotated instance, not the piece's own size,
 * so each rotation was solved from its box against the piece's known unrotated
 * dimensions and the left/top here is the *unrotated* top-left — which is what
 * CSS `rotate()` about the centre needs. Pieces that came back at 0° really
 * are unrotated in the new design (the three stickers, the cup, and every one
 * of the new objects).
 */
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

  const drag = (children: React.ReactNode) => (
    <Draggable enabled={draggable} scale={scale}>
      {children}
    </Draggable>
  );

  return (
    <div className="relative shrink-0 overflow-visible" style={{ width: CANVAS_W, height: CANVAS_H }}>
      {/* The desk surface is the backdrop: it sits behind every other piece,
          the cutting mat included. */}
      <div className="pointer-events-none absolute left-[349.64px] top-[2628.72px] rotate-[-5.25deg]" style={{ zIndex: Z.deskMat }}>
        <DeskMat theme={theme} className="h-[1093px] w-[3044px]" />
      </div>

      {/* Mats are scenery. They take no pointer events at all, so nothing about
          them suggests they can be picked up — which is the whole point of the
          recolour. */}
      <div className="pointer-events-none absolute left-[231.3px] top-[206.68px] rotate-[2.4deg]" style={{ zIndex: Z.mats }}>
        <CuttingMat theme={theme} className="h-[1009.72px] w-[1545.26px]" />
      </div>
      <div className="pointer-events-none absolute left-[4110.71px] top-[3313.75px] rotate-[6.9deg]" style={{ zIndex: Z.mats }}>
        <GoldenRatioMat theme={theme} className="h-[508px] w-[777px]" />
      </div>

      {/* Box and loose pencils are one group: pencils move between the two, so
          neither can own its own placement (see PencilTray). */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: Z.objects }}>
        <PencilTray theme={theme} scale={scale} draggable={draggable} />
      </div>

      <div className="absolute left-[558.89px] top-[276.43px]" style={{ zIndex: Z.objects }}>
        {drag(
          // Rest tilt lives inside AboutBook (GSAP-owned) so it can straighten
          // to 0 while the book is open.
          <AboutBook theme={theme} open={bookOpen} onOpenChange={onBookOpenChange} deepLinkSpread={deepLinkSpread} />,
        )}
      </div>

      {/* No placement rotation here: the folder carries its own rest tilt and
          straightens itself on open, so a wrapper rotation would compound with
          it and leave the opened folder off-square. */}
      <div className="absolute left-[3773.3px] top-[193px]" style={{ zIndex: Z.objects }}>
        {drag(
          <FileFolder
            theme={theme}
            open={fileOpen}
            onOpenChange={onFileOpenChange}
            deepLinkProject={deepLinkProject}
          />,
        )}
      </div>

      {/* Under the folder, which overlaps its top-right corner in the design. */}
      <div className="absolute left-[3401px] top-[954px]" style={{ zIndex: Z.flat }}>
        {drag(<Keyboard theme={theme} style={{ width: KEYBOARD_W, height: KEYBOARD_H }} />)}
      </div>

      <div className="absolute left-[612.96px] top-[2035.81px]" style={{ zIndex: Z.flat }}>
        {drag(
          <div className="rotate-[-7.6deg]">
            <CvV1 className="h-[1022.1px] w-[789.8px]" />
          </div>,
        )}
      </div>

      <div className="absolute left-[2242.43px] top-[843.41px]" style={{ zIndex: Z.flat }}>
        {drag(
          <div className="rotate-[-7.85deg]">
            <IntroCard theme={theme} className="h-[386px] w-[630px]" />
          </div>,
        )}
      </div>

      <div className="absolute left-[2721px] top-[556px]" style={{ zIndex: Z.objects }}>
        {drag(<CoffeeCup theme={theme} className="h-[282.08px] w-[278.82px]" />)}
      </div>
      <div className="absolute left-[512.56px] top-[2839.84px]" style={{ zIndex: Z.objects }}>
        {drag(
          <div className="rotate-[4.15deg]">
            <Coaster theme={theme} className="h-[359px] w-[361px]" />
          </div>,
        )}
      </div>

      {/* Ink pad and the two stamps. Like the puzzle, this spans the canvas
          but is transparent to hit-testing — only the stamps take pointers. */}
      <StampSystem theme={theme} scale={scale} enabled={draggable} z={Z.objects} />

      {/* The Archive puzzle. Its wrapper spans the canvas but is transparent
          to hit-testing; only the pieces themselves take clicks. */}
      <Puzzle scale={scale} enabled={draggable} z={Z.objects} onSolvedOpen={() => setArchiveOpen(true)} />

      {archiveOpen ? <ArchiveOverlay onClose={() => setArchiveOpen(false)} /> : null}

      <div className="absolute left-[2189px] top-[351px]" style={{ zIndex: Z.flat }}>
        {drag(<Sticker n={1} className="h-[169.59px] w-[179.41px]" />)}
      </div>
      <div className="absolute left-[2727px] top-[3240px]" style={{ zIndex: Z.flat }}>
        {drag(<Sticker n={2} className="h-[184.74px] w-[226.12px]" />)}
      </div>
      <div className="absolute left-[1524px] top-[1585px]" style={{ zIndex: Z.flat }}>
        {drag(<Sticker n={3} className="h-[169.02px] w-[191.17px]" />)}
      </div>
    </div>
  );
}
