import { SvgPiece, type Theme } from "./Piece";

/**
 * The keyboard (Figma 472:48975), 802x352 on the Scattered canvas.
 *
 * Set dressing for now — it is drawn as one flat asset rather than as ~80
 * addressable keys. If it ever needs to be typed on, the replacement is a
 * layered export swapped in behind this same component boundary; nothing
 * placing it needs to change.
 *
 * The multiplier is the asset's 802x351.793 artboard against the size the
 * Scattered frame draws it at: `Keyboard` 472:48975 reports a
 * 560.010x276.864 box at 4.07 degrees, which solves to 1019.9x447.4 canvas
 * units. 1.2 was the earlier frame's figure.
 */
const FRAME_SCALE = 1.27175;
export const KEYBOARD_W = 802 * FRAME_SCALE;
export const KEYBOARD_H = 351.793 * FRAME_SCALE;

export function Keyboard({ theme, className, style }: { theme: Theme; className?: string; style?: React.CSSProperties }) {
  return <SvgPiece src={`/assets/keyboard_${theme}.svg`} className={className} style={style} alt="" />;
}
