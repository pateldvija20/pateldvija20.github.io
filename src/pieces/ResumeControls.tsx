import { RESUME_PDF } from "../organized/content";
import type { Theme } from "./Piece";

/**
 * The Resume's own controls, shown only while the sheet is being read.
 *
 * They join the mode and brightness buttons in the top-right rather than
 * floating over the page, because the page is a physical object on the desk:
 * a toolbar attached to it would turn it into a viewer window, which is the
 * one thing the reading mode is trying not to be. Same button geometry as
 * `ControlBar`, so the row reads as one set of controls that grew.
 *
 * `data-focus-chrome` keeps a click here from being read as a click off the
 * sheet — these belong to the focused object even though they sit nowhere
 * near it.
 */

/** Matches ControlBar's own scale exactly — see the note on its constants. */
const EDGE = "clamp(22px, 10.38px + 1.1348vw, 30px)";
const BUTTON = "clamp(44px, 20.76px + 2.2695vw, 60px)";
const ICON = "clamp(18px, 9.29px + 0.8511vw, 24px)";
const PAD = "clamp(6px, 3.1px + 0.2837vw, 8px)";
const RADIUS = "clamp(9px, 4.65px + 0.4255vw, 12px)";
/** Clears the control bar, which owns the corner. */
const ROW_GAP = "clamp(52px, 24.9px + 2.723vw, 72px)";

export function ResumeControls({
  theme,
  onZoomIn,
  onZoomOut,
  onClose,
}: {
  theme: Theme;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClose: () => void;
}) {
  const light = theme === "light";
  const face = light ? "#fdfeff" : "#2f2f2f";
  const ink = light ? "#2f2f2f" : "#fdfeff";

  const button: React.CSSProperties = {
    width: BUTTON,
    height: BUTTON,
    borderRadius: RADIUS,
    background: face,
    border: `2px solid ${ink}`,
    color: ink,
  };

  const stroke = { stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const };

  return (
    <div
      data-focus-chrome
      className="fixed z-50 flex w-max items-center"
      style={{ top: `calc(${EDGE} + ${ROW_GAP})`, right: EDGE, gap: PAD }}
      role="toolbar"
      aria-label="Resume controls"
    >
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
      <button
        type="button"
        onClick={onClose}
        aria-label="Put the resume back on the desk"
        className="flex shrink-0 cursor-pointer items-center justify-center"
        style={button}
      >
        <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" {...stroke} />
        </svg>
      </button>
    </div>
  );
}
