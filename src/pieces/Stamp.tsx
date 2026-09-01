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

/** The mark a stamp leaves. Single-colour, so press duration can drive its
 *  density by opacity alone without white paint showing through. */
export function StampImpression({
  n,
  className,
  style,
}: {
  n: StampId;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <SvgPiece src={`/assets/stamp${n}_impression.svg`} className={className} style={style} alt="" />;
}
