import { SvgPiece, type Theme } from "./Piece";

/**
 * The ink pad and the rubber stamps (Figma 460:47043, 478:50457, 478:50461).
 *
 * One artwork, drawn twice. The frame puts two stamps on the desk and the
 * export ships a single body and a single impression, so both positions render
 * the same block — which is why nothing here is keyed by stamp any more.
 *
 * The impression is the mark the face leaves: the same outlined card and
 * lettering with the block and its shadow removed, so what lands on the desk is
 * ink rather than a picture of a stamp.
 *
 * Both come in light and dark, and that matters more than it sounds. The
 * previous export baked one ink colour into the file and it happened to be
 * `#2F2F2F` — the dark desk exactly — so every mark made in dark mode was
 * invisible. A themed pair is what lets these be plain images again rather
 * than shapes recoloured through a mask.
 */

/** Canvas sizes, from the frame. The SVGs are exported smaller (the pad at
 *  375x227, the body at 83x96) and scale into these; the aspects agree to
 *  within a tenth of a percent, so nothing is stretched to fit. */
export const INKPAD_W = 701;
export const INKPAD_H = 424;
export const STAMP_W = 154;
export const STAMP_H = 178;

/** The impression's own export is 52x37, sized against the 83-wide body. */
export const IMPRESSION_W = STAMP_W * (52 / 83);
export const IMPRESSION_H = IMPRESSION_W * (37 / 52);

/**
 * Where the inked face sits inside the block, as a fraction of the body.
 *
 * The face is the rotated 46.25x30.15 card at 18.39,19.33 in the body's own
 * 83x96 space — up and a little left of the block's centre, because the block
 * is drawn at an angle with its side showing. A carried stamp is centred on
 * the pointer, so a mark placed at the pointer lands low and right of where
 * the face actually is; this puts the ink under the face instead.
 */
export const FACE_CX = 39.08 / 83;
export const FACE_CY = 37.56 / 96;

export function InkPad({
  theme,
  className,
  style,
}: {
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
}) {
  return <SvgPiece src={`/assets/inkpad_${theme}.svg`} className={className} style={style} alt="" />;
}

export function Stamp({
  theme,
  className,
  style,
}: {
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <SvgPiece src={`/assets/stampbody_${theme}.svg`} className={className} style={style} alt="" />
  );
}

/** The mark a stamp leaves. Press duration drives its density by opacity
 *  alone — the brief is explicit that the mark must not blur or spread. */
export function StampImpression({
  theme,
  className,
  style,
}: {
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <SvgPiece
      src={`/assets/stampimpression_${theme}.svg`}
      className={className}
      style={style}
      alt=""
    />
  );
}
