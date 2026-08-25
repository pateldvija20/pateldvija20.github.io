import type { Theme } from "./Piece";

/* The card as live markup rather than the flat `intro_card_*.svg` used in
 * Scattered mode, because Organised mode reuses one card twice.
 *
 * `intro` is the opening pose (Figma 190:9395): eyebrow line visible, blocks
 * aligned to the right, white border. Once the deck starts moving the card
 * becomes the label for whatever is centred (`component_card_light/dark`,
 * Figma 190:10065 / 190:10003): eyebrow hidden, blocks aligned left, and the
 * border follows the theme's ink. */

/** Figma's design size; everything inside is laid out against it and scaled. */
export const CARD_W = 630;
export const CARD_H = 386;

export type CardCopy = {
  /** Small line, top-left. Only drawn in the intro pose. */
  eyebrow: string;
  /** Italic mono paragraph, one 300px column. */
  description: string;
  /** The big slab-serif line, bottom. */
  name: string;
};

export function ComponentCard({
  copy,
  theme,
  intro = false,
  width = CARD_W,
}: {
  copy: CardCopy;
  theme: Theme;
  intro?: boolean;
  width?: number;
}) {
  const scale = width / CARD_W;
  const border = intro ? "#fdfeff" : theme === "light" ? "#2f2f2f" : "#fdfeff";

  return (
    <div
      style={{ width: CARD_W * scale, height: CARD_H * scale }}
      className="relative shrink-0 overflow-hidden"
    >
      <div
        className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[24px] border-2 bg-[#ff5a3d]"
        style={{
          width: CARD_W,
          height: CARD_H,
          borderColor: border,
          transform: `scale(${scale})`,
          boxSizing: "border-box",
        }}
      >
        {/* Blurred gradient wash. The asset is exported oversized and bled
            past the card on every edge, exactly as the Figma layer is. */}
        <div className="absolute left-[-8.79px] top-[19.78px] h-[364.514px] w-[763.488px]">
          <img
            src={intro ? "/assets/intro_card_blob.svg" : "/assets/component_card_blob.svg"}
            alt=""
            draggable={false}
            className="absolute block max-w-none select-none"
            style={{ left: "-15.92%", top: "-54.17%", width: "139.66%", height: "209.79%" }}
          />
        </div>

        <div
          className={`absolute left-[-2px] top-[-2px] flex flex-col justify-between p-[40px] text-[#fdfeff] ${
            intro ? "items-end" : "items-start"
          }`}
          style={{ width: CARD_W, height: CARD_H - 2 }}
        >
          {/* Kept as a spacer when the eyebrow is hidden, so the three rows
              stay on Figma's 40 / 160.5 / 260 baseline grid either way. */}
          <div className="flex h-[42px] w-full items-start justify-between">
            {intro && (
              <p className="whitespace-nowrap font-['DM_Sans'] text-[32px] font-semibold capitalize leading-normal">
                {copy.eyebrow}
              </p>
            )}
          </div>
          <div className="flex w-[300px] items-start justify-between">
            <p className="min-w-px flex-[1_0_0] font-['DM_Mono'] text-[16px] italic leading-normal">
              {copy.description}
            </p>
          </div>
          <div className="flex w-full items-center justify-end">
            <p className="whitespace-nowrap font-['Roboto_Slab'] text-[64px] font-medium capitalize leading-normal">
              {copy.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
