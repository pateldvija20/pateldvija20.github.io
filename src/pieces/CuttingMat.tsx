import { SvgPiece, type Theme } from "./Piece";

export function CuttingMat({ theme, className }: { theme: Theme; className?: string }) {
  return <SvgPiece src={`/assets/cuttingmat_${theme}.svg`} className={className} alt="Cutting mat" />;
}
