import { SvgPiece, type Theme } from "./Piece";

export function Coaster({ theme, className }: { theme: Theme; className?: string }) {
  return <SvgPiece src={`/assets/coaster_${theme}.svg`} className={className} alt="Coaster" />;
}
