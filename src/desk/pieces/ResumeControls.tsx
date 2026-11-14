import { RESUME_PDF } from "../organized/content";
import type { Theme } from "./Piece";

/**
 * The Resume's own controls, shown only while the sheet is being read.
 *
 * A floating bar at the bottom centre, clear of the sheet rather than attached
 * to it: the page is a physical object on the desk, and a chrome rail welded
 * to its edge would turn it into a viewer window, which is the one thing the
 * reading mode is trying not to be. Bottom centre because that is where the
 * hand is while reading — the top-right corner is already the mode and
 * brightness bar's, and a second row stacked under it read as an overflow menu
 * rather than as this document's own controls.
 *
 * Same button geometry as `ControlBar`, so the two read as one family.
 *
 * `data-focus-chrome` keeps a click here from being read as a click off the
 * sheet — these belong to the focused object even though they sit nowhere near
 * it.
 */

/** Matches ControlBar's own scale exactly — see the note on its constants. */
const BUTTON = "clamp(44px, 20.76px + 2.2695vw, 60px)";
const ICON = "clamp(18px, 9.29px + 0.8511vw, 24px)";
const PAD = "clamp(6px, 3.1px + 0.2837vw, 8px)";
const RADIUS = "clamp(9px, 4.65px + 0.4255vw, 12px)";
/** How far the row floats off the bottom edge. */
const EDGE = "clamp(22px, 10.38px + 1.1348vw, 30px)";

export function ResumeControls({
  theme,
  onZoomIn,
  onZoomOut,
  onClose,
}: {
  theme: Theme;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Puts the sheet back on the desk. Labelled rather than an X: with the
   *  scroll-to-leave gesture gone this is the only visible way out, and a
   *  bare X on a document reads as "discard" rather than "put down". */
  onClose: () => void;
}) {
  const light = theme === "light";
  const face = light ? "#fdfeff" : "#2f2f2f";
  const ink = light ? "#2f2f2f" : "#fdfeff";

  const button: React.CSSProperties = {
    height: BUTTON,
    width: BUTTON,
    borderRadius: RADIUS,
    background: face,
    border: `2px solid ${ink}`,
    color: ink,
  };

  const stroke = { stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const };

  return (
    <div
      data-focus-chrome
      className="fixed left-1/2 z-50 flex w-max -translate-x-1/2 items-center"
      style={{ bottom: EDGE, gap: PAD }}
      role="toolbar"
      aria-label="Resume controls"
    >
      {/* Wider than the icon buttons and carrying a word, because this is the
          exit and it should not have to be guessed at. */}
      <button
        type="button"
        onClick={onClose}
        className="flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap px-4 text-[15px] font-medium"
        style={{ ...button, width: "auto" }}
      >
        <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 6l-6 6 6 6" {...stroke} strokeLinejoin="round" />
        </svg>
        Back to desk
      </button>

      <a
        href={RESUME_PDF}
        download
        aria-label="Download resume as PDF"
        className="flex shrink-0 cursor-pointer items-center justify-center no-underline"
        style={button}
      >
        <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" {...stroke} strokeLinejoin="round" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" {...stroke} strokeLinejoin="round" />
        </svg>
      </a>
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="flex shrink-0 cursor-pointer items-center justify-center"
        style={button}
      >
        <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h14" {...stroke} />
        </svg>
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="flex shrink-0 cursor-pointer items-center justify-center"
        style={button}
      >
        <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" {...stroke} />
        </svg>
      </button>
    </div>
  );
}
