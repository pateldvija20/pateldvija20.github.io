import { SvgPiece, type Theme } from "./Piece";

export type PencilColor =
  | "black"
  | "blue"
  | "cyan"
  | "darkblue"
  | "darkgreen"
  | "green"
  | "grey"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "yellow";

export function Pencil({
  color,
  theme,
  className,
}: {
  color: PencilColor;
  theme: Theme;
  className?: string;
}) {
  return (
    <SvgPiece
      src={`/assets/pencil_${color}_${theme}.svg`}
      className={className}
      alt={`${color} pencil`}
    />
  );
}