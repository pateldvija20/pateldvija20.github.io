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
  style,
  onPointerDown,
}: {
  color: PencilColor;
  theme: Theme;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent<HTMLImageElement>) => void;
}) {
  return (
    <SvgPiece
      src={`/assets/pencil_${color}_${theme}.svg`}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      alt={`${color} pencil`}
    />
  );
}