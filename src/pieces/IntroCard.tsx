import { SvgPiece, type Theme } from "./Piece";

export function IntroCard({ theme, className }: { theme: Theme; className?: string }) {
  return (
    <SvgPiece
      src={`/assets/intro_card_${theme}.svg`}
      className={className}
      alt="Hello, I am Dvija — Product Designer"
    />
  );
}
