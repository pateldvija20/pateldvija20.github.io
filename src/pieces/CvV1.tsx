import { SvgPiece } from "./Piece";

export function CvV1({ className }: { className?: string }) {
  return <SvgPiece src="/assets/cv_v1.svg" className={className} alt="Dvija Patel — résumé"  style={{ height: "75%", width: "75%" }}
/>;
}
