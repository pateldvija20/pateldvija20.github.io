import { AboutBook } from "./AboutBook";
import { Coaster } from "./Coaster";
import { CoffeeCup } from "./CoffeeCup";
import { CuttingMat } from "./CuttingMat";
import { CvV1 } from "./CvV1";
import { DeskMat } from "./DeskMat";
import { Draggable } from "./Draggable";
import { FileFolder } from "./FileFolder";
import { GoldenRatioMat } from "./GoldenRatioMat";
import { IntroCard } from "./IntroCard";
import { Pencil } from "./Pencil";
import { PencilBox } from "./PencilBox";
import type { Theme } from "./Piece";
import { Sticker } from "./Sticker";

/** Figma's `main_canvas` for the Scattered frame — pieces are spread across a
 *  canvas far larger than the 1729x1117 window, which is what you pan around. */
export const CANVAS_W = 4327;
export const CANVAS_H = 2713;
/** Where Figma parks the window on that canvas at rest (`left:-1299; top:-240`). */
export const CANVAS_ORIGIN_X = -1299;
export const CANVAS_ORIGIN_Y = -240;

/**
 * Pencils sitting in the box are shrunk by PencilBox's own useElementScale —
 * a stable 0.7804 of natural size (it derives from layout height, which the
 * canvas's `fit` transform doesn't affect, so it holds at every viewport).
 * Match it here so loose pencils on the desk read at the same scale as boxed
 * ones instead of a third larger.
 */
const LOOSE_PENCIL = "h-[641.9px] w-[32.95px]";

/**
 * The Scattered composition, node 69:8583. Every left/top/rotation below is
 * taken straight from that frame's CSS (calc(50% ± n) values resolved against
 * the 4327x2713 canvas centre), so the layout matches Figma exactly rather
 * than being a nudged copy of the No Drag arrangement.
 */
export function ScatteredScene({
  theme,
  bookOpen,
  onBookOpenChange,
  fileOpen,
  onFileOpenChange,
  draggable,
  scale,
}: {
  theme: Theme;
  bookOpen: boolean;
  onBookOpenChange: (open: boolean) => void;
  fileOpen: boolean;
  onFileOpenChange: (open: boolean) => void;
  draggable: boolean;
  /** Canvas `fit` scale, so pointer deltas convert to canvas units. */
  scale: number;
}) {
  const drag = (children: React.ReactNode) => (
    <Draggable enabled={draggable} scale={scale}>
      {children}
    </Draggable>
  );

  return (
    <div className="relative shrink-0 overflow-visible" style={{ width: CANVAS_W, height: CANVAS_H }}>
      {/* The desk surface is the backdrop: it sits behind every other piece,
          the cutting mat included. */}
      <div className="absolute left-[850px] top-[1200px] z-[-1] rotate-[-5.25deg]">
        <DeskMat theme={theme} className="h-[1093px] w-[3044px]" />
      </div>

      <div className="absolute left-[3019.78px] top-[2132.71px] z-[1]">
        {drag(
          <div className="rotate-[-72.02deg]">
            <Pencil color="black" theme={theme} className={LOOSE_PENCIL} />
          </div>,
        )}
      </div>
      <div className="absolute left-[3022.64px] top-[1357.44px] z-[1]">
        {drag(<Pencil color="darkgreen" theme={theme} className={LOOSE_PENCIL} />)}
      </div>

      <div className="absolute left-[3287px] top-[1477px] z-[1]">
        {drag(
          <div className="rotate-[5.19deg]">
            <PencilBox theme={theme} />
          </div>,
        )}
      </div>

      <div className="absolute left-[2748.9px] top-[428.9px] z-0 scale-y-[-1]">
        <GoldenRatioMat theme={theme} className="h-[508px] w-[777px]" />
      </div>

      <div className="absolute left-[99px] top-[297px] z-0 rotate-[6.92deg]">
        <CuttingMat theme={theme} className="h-[1009.72px] w-[1545.26px]" />
      </div>

      <div className="absolute left-[679px] top-[134px] z-[1]">
        {drag(
          <div className="rotate-[-4.73deg]">
            <AboutBook theme={theme} open={bookOpen} onOpenChange={onBookOpenChange} />
          </div>
        )}
      </div>

      {/* No placement rotation here: the folder carries its own 5° rest tilt
          (state1) and straightens itself on open, so a wrapper rotation would
          compound with it and leave the opened folder off-square. */}
      <div className="absolute left-[1257.67px] top-[1218.83px] z-[1]">
        {drag(<FileFolder theme={theme} open={fileOpen} onOpenChange={onFileOpenChange} />)}
      </div>

      <div className="absolute left-[273px] top-[1214px] z-[1]">
        {drag(
          <div className="rotate-[-7.58deg]">
            <CvV1 className="h-[1022.1px] w-[789.8px]" />
          </div>,
        )}
      </div>

      <div className="absolute left-[1867px] top-[615px] z-0">
        {drag(
          <div className="rotate-[-7.86deg]">
            <IntroCard theme={theme} className="h-[386px] w-[630px]" />
          </div>,
        )}
      </div>

      <div className="absolute left-[2352px] top-[469px] z-[2]">
        {drag(<CoffeeCup theme={theme} className="h-[282.08px] w-[278.82px]" />)}
      </div>
      <div className="absolute left-[3387px] top-[837px] z-[1]">
        {drag(
          <div className="rotate-[15deg]">
            <Coaster theme={theme} className="h-[359px] w-[361px]" />
          </div>,
        )}
      </div>

      <div className="absolute left-[2805px] top-[486px] z-[1]">
        {drag(<Sticker n={1} className="h-[169.59px] w-[179.41px]" />)}
      </div>
      <div className="absolute left-[3028px] top-[678px] z-[1]">
        {drag(<Sticker n={2} className="h-[184.74px] w-[226.12px]" />)}
      </div>
      <div className="absolute left-[3271px] top-[468px] z-[1]">
        {drag(<Sticker n={3} className="h-[169.02px] w-[191.17px]" />)}
      </div>

      <div className="absolute left-[3522.75px] top-[872.26px] z-[1]">
        {drag(
          <div className="rotate-[-94.89deg]">
            <Pencil color="darkblue" theme={theme} className={LOOSE_PENCIL} />
          </div>,
        )}
      </div>
      <div className="absolute left-[2750.61px] top-[1450.24px] z-[1]">
        {drag(
          <div className="rotate-[9.85deg]">
            <Pencil color="yellow" theme={theme} className={LOOSE_PENCIL} />
          </div>,
        )}
      </div>
    </div>
  );
}
