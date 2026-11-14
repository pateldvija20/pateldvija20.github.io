import { SvgPiece } from "./Piece";

export function Sticker({ n, className }: { n: 1 | 2 | 3; className?: string }) {
  return <SvgPiece src={`/assets/sticker${n}.svg`} className={className} alt={`Sticker ${n}`} />;
}
