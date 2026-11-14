import { SvgPiece } from "./Piece";

/**
 * The résumé sheet lying on the desk, and the document the camera opens into
 * when it is read (`FocusObject` id "resume").
 *
 * Sized entirely by the caller. It used to carry an inline `75%` on both
 * axes, which quietly overrode whatever size it was given: the export's own
 * artboard is 790x1023 and its first element is a full-bleed sheet, so there
 * was no padding for the 75% to be correcting — it just drew the résumé three
 * quarters the size the frame places it at, anchored to the top-left of its
 * own box. That left the sheet smaller than `CV V1` 458:45214 on the desk and
 * unreadable once the camera framed the box rather than the ink.
 */
export function CvV1({ className }: { className?: string }) {
  return <SvgPiece src="/assets/cv_v1.svg" className={className} alt="Dvija Patel — résumé" />;
}
