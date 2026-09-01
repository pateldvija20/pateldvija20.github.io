import { SvgPiece, type Theme } from "./Piece";

export type Mode = "scattered" | "organized";

/* Top control bar (Figma `Component 9`, 144x76 at the 1729 design width).
 *
 * Two 60px buttons — the layout toggle and the theme toggle — sitting directly
 * on the page. There is no enclosing pill: each button already carries its own
 * outline and radius, so a container drawing the same border around both read
 * as a box inside a box. The wrapper below is positioning only.
 *
 * The buttons invert with the theme: light face and dark ink in light mode,
 * the other way round in dark.
 *
 * Pinned to the top-right corner in every mode. This is the only chrome
 * outside the fit-scaled scene, so it's the only place clamp()/vw is used: the
 * values resolve to the Figma sizes at 1729px and shrink continuously from
 * there. Below 1025px the layout toggle is dropped, since Scattered mode is
 * unavailable at those widths. */

/** Figma parks the bar 30px in from the top-right corner of the 1729 scene. */
const EDGE = "clamp(22px, 10.38px + 1.1348vw, 30px)";
const BUTTON = "clamp(44px, 20.76px + 2.2695vw, 60px)";
const ICON = "clamp(18px, 9.29px + 0.8511vw, 24px)";
const PAD = "clamp(6px, 3.1px + 0.2837vw, 8px)";
const RADIUS = "clamp(9px, 4.65px + 0.4255vw, 12px)";

/**
 * The layout glyph, drawn in `em` off the icon size so it scales with the
 * button. Scattered shows three squares strewn about (one tilted, clipped by
 * the button); Organised shows them stacked into a neat row.
 */
function LayoutIcon({ mode, fg, bg }: { mode: Mode; fg: string; bg: string }) {
  const square: React.CSSProperties = {
    position: "absolute",
    width: "1em",
    height: "1em",
    borderRadius: "0.1667em",
    border: `0.0833em solid ${fg}`,
    background: bg,
  };

  if (mode === "organized") {
    return (
      <div className="relative" style={{ fontSize: ICON, width: "1.4167em", height: "1em" }}>
        <div style={{ ...square, left: 0, top: 0 }} />
        <div style={{ ...square, left: "0.2083em", top: 0 }} />
        <div style={{ ...square, left: "0.4167em", top: 0, background: fg }} />
      </div>
    );
  }
  return (
    <div className="relative" style={{ fontSize: ICON, width: "3.1583em", height: "2.6663em" }}>
      <div style={{ ...square, left: 0, top: 0 }} />
      <div style={{ ...square, left: "0.7875em", top: "1.6663em" }} />
      <div style={{ ...square, left: "1.9333em", top: "0.4579em", background: fg, transform: "rotate(15deg)" }} />
    </div>
  );
}

export function ControlBar({
  theme,
  mode,
  onMode,
  onToggleTheme,
  showLayoutToggle = true,
}: {
  theme: Theme;
  mode: Mode;
  onMode: (m: Mode) => void;
  onToggleTheme: () => void;
  /** False at and below 1024, where Scattered mode is unavailable — the bar
   *  keeps only the theme button rather than offering a layout that cannot
   *  be entered. */
  showLayoutToggle?: boolean;
}) {
  const light = theme === "light";
  // The pill and its buttons share one fill and one ink colour, so the bar
  // reads as an outlined stack rather than an inverted shell.
  const face = light ? "#fdfeff" : "#2f2f2f";
  const ink = light ? "#2f2f2f" : "#fdfeff";
  const next: Mode = mode === "scattered" ? "organized" : "scattered";

  const button: React.CSSProperties = {
    width: BUTTON,
    height: BUTTON,
    borderRadius: RADIUS,
    background: face,
    border: `2px solid ${ink}`,
  };

  return (
    <div
      className="fixed z-50 flex w-max items-center"
      style={{ top: EDGE, right: EDGE, gap: PAD }}
    >
      {showLayoutToggle ? (
        <button
          onClick={() => onMode(next)}
          aria-label={next === "organized" ? "Switch to organised layout" : "Switch to scattered layout"}
          aria-pressed={mode === "organized"}
          className="flex shrink-0 cursor-pointer items-center justify-center overflow-hidden"
          style={button}
        >
          <LayoutIcon mode={next} fg={ink} bg={face} />
        </button>
      ) : null}
      <button
        onClick={onToggleTheme}
        aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
        className="flex shrink-0 cursor-pointer items-center justify-center"
        style={button}
      >
        <SvgPiece src={light ? "/assets/icon_moon.svg" : "/assets/icon_sun.svg"} style={{ width: ICON, height: ICON }} />
      </button>
    </div>
  );
}
