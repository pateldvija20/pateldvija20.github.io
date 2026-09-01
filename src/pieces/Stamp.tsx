import { SvgPiece, type Theme } from "./Piece";

/**
 * The ink pad and the two rubber stamps (Figma 460:47043, 478:50457,
 * 478:50461).
 *
 * Static for now: these are the *props* for the press-and-hold stamping
 * interaction, which is its own phase. They are placed here so the desk
 * composition is complete and so the interaction has real objects — at their
 * real sizes and positions — to be built onto.
 *
 * The stamp body is 154x178 because it is drawn as a block seen at a slight
 * angle: a 154x154 face with the block's side showing 24px below it. The
 * impression assets are that same face with the block and its shadow removed,
 * so an impression is ink on the desk rather than a picture of a stamp.
 */
export const INKPAD_W = 701;
export const INKPAD_H = 424;
export const STAMP_W = 154;
export const STAMP_H = 178;

export function InkPad({ theme, className, style }: { theme: Theme; className?: string; style?: React.CSSProperties }) {
  return <SvgPiece src={`/assets/inkpad_${theme}.svg`} className={className} style={style} alt="" />;
}

export type StampId = 1 | 2;

export function Stamp({
  n,
  theme,
  className,
  style,
}: {
  n: StampId;
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <SvgPiece src={`/assets/stamp${n}_${theme}.svg`} className={className} style={style} alt="" />;
}

/**
 * The mark a stamp leaves.
 *
 * Drawn as a *mask* rather than as an image, for two reasons the exported
 * assets make unavoidable.
 *
 * The ink colour is baked into the files, and `stamp1_impression.svg` is
 * filled `#2F2F2F` throughout — which is exactly the dark desk. Pressed in
 * dark mode it painted grey ink onto a grey desk and vanished, which is
 * indistinguishable from the stamp not working. Masking throws the file's own
 * colour away and keeps only its shape, so the ink is chosen here and is
 * legible on both surfaces.
 *
 * The two files also disagree about proportion — 128x129 and 133x103 — and
 * were both being drawn into the same 154x154 square, squashing the second by
 * a third. Each now renders at its own aspect.
 */
export const IMPRESSION_ASPECT: Record<StampId, number> = {
  1: 129 / 128,
  2: 103 / 133,
};

/** How wide a mark is, and therefore how tall. */
export const impressionSize = (n: StampId, width = STAMP_W) => ({
  width,
  height: width * IMPRESSION_ASPECT[n],
});

export function StampImpression({
  n,
  ink,
  className,
  style,
}: {
  n: StampId;
  /** The colour the mark is made in. The asset's own fill is discarded. */
  ink: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const src = `/assets/stamp${n}_impression.svg`;
  return (
    <div
      className={className}
      role="presentation"
      style={{
        ...style,
        backgroundColor: ink,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
