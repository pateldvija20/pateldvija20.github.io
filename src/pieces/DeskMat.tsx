import { SvgPiece, type Theme } from "./Piece";

export function DeskMat({ theme, className }: { theme: Theme; className?: string }) {
  return <SvgPiece src={`/assets/desk_mat_${theme}.svg`} className={className} alt="" />;
}
