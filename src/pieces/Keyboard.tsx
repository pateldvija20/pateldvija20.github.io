import { SvgPiece, type Theme } from "./Piece";

/**
 * The keyboard (Figma 472:48975), 802x352 on the Scattered canvas.
 *
 * Set dressing for now — it is drawn as one flat asset rather than as ~80
 * addressable keys. If it ever needs to be typed on, the replacement is a
 * layered export swapped in behind this same component boundary; nothing
 * placing it needs to change.
 */
export const KEYBOARD_W = 802 * 1.2;
export const KEYBOARD_H = 351.793 * 1.2;

export function Keyboard({ theme, className, style }: { theme: Theme; className?: string; style?: React.CSSProperties }) {
  return <SvgPiece src={`/assets/keyboard_${theme}.svg`} className={className} style={style} alt="" />;
}
