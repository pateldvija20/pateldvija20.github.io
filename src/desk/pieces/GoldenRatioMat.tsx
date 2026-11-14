import { SvgPiece, type Theme } from "./Piece";

export function GoldenRatioMat({ theme, className }: { theme: Theme; className?: string }) {
  return <SvgPiece src={`/assets/goldenratio_mat_${theme}.svg`} className={className} alt="" />;
}
