import { SvgPiece, type Theme } from "./Piece";

export function CoffeeCup({ theme, className }: { theme: Theme; className?: string }) {
  return <SvgPiece src={`/assets/coffee_cup_${theme}.svg`} className={className} alt="Coffee cup" />;
}
