import { useEffect, useState } from "react";
import { useIsTouch } from "./useIsTouch";
import { SvgPiece, type Theme } from "./Piece";

/**
 * The crumpled-paper piece that sits on the footer chair — the site's one
 * nod to github.com/item-develop/paper-crumple-demo. That demo bakes a
 * Houdini Vellum sim into a Three.js/cannon-es scene (drag, flick, physics,
 * a full unfold-into-card animation); this footer gets one static crumple
 * pose (paper_*.svg from Figma) in the site's own two-tone line style,
 * because the interaction this page needs is just "hover, then click"
 * (confirmed with the user — no drag/throw), so shipping three.js and a
 * physics engine for that would be paying real bundle weight for motion
 * nobody triggers.
 *
 * Hovering types the tooltip out a character at a time. Click swaps the ball
 * for a quick unfold flourish (scale + straighten) before `onOpen` hands off
 * to the actual form.
 */
const TOOLTIP = "Hey, don't toss that idea away!";
/** Per character: the whole line lands in just under a second. */
const TYPE_MS = 60;
export function PaperBall({
  theme,
  onOpen,
  className,
  style,
}: {
  theme: Theme;
  onOpen: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const isDark = theme === "dark";
  const isTouch = useIsTouch();
  const [hover, setHover] = useState(false);
  const [unfolding, setUnfolding] = useState(false);
  const [typed, setTyped] = useState(0);

  // Types from the start on every hover; reduced motion gets the whole line.
  useEffect(() => {
    if (!hover) {
      setTyped(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(TOOLTIP.length);
      return;
    }
    setTyped(0);
    const iv = window.setInterval(() => {
      setTyped((n) => {
        if (n >= TOOLTIP.length) {
          window.clearInterval(iv);
          return n;
        }
        return n + 1;
      });
    }, TYPE_MS);
    return () => window.clearInterval(iv);
  }, [hover]);
  const done = typed >= TOOLTIP.length;

  function handleActivate() {
    if (unfolding) return;
    setUnfolding(true);
    window.setTimeout(() => {
      onOpen();
      setUnfolding(false);
    }, 320);
  }

  // The caller positions the wrapper (the footer passes `absolute`); it falls
  // back to `relative` only when nothing does. Hard-coding both let `relative`
  // win, which stretched the wrapper to the footer's full width and centred the
  // tooltip on that instead of on the ball. `w-max` keeps it ball-sized.
  return (
    <div className={`w-max ${className ?? "relative"}`} style={style}>
      {hover && !isTouch && !unfolding && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute -top-3 left-1/2 w-max -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border-2 px-4 py-2 text-[15px] font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.2)] ${
            isDark
              ? "border-[#fdfeff] bg-[#2f2f2f] text-[#fdfeff]"
              : "border-[#2f2f2f] bg-[#fdfeff] text-[#2f2f2f]"
          }`}
        >
          {/* The invisible full line sizes the pill up front, so it doesn't
              grow — and re-centre — with every character. */}
          <span className="grid">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              {TOOLTIP}
            </span>
            <span className="col-start-1 row-start-1" aria-label={TOOLTIP}>
              <span aria-hidden="true">{TOOLTIP.slice(0, typed)}</span>
              <span
                aria-hidden="true"
                className={`ml-px inline-block h-[1em] w-[1.5px] translate-y-[2px] bg-current ${
                  done ? "caret-blink" : ""
                }`}
              />
            </span>
          </span>
        </div>
      )}

      <button
        type="button"
        aria-label="Open the contact form"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onClick={handleActivate}
        className="block h-[56px] w-[59px] cursor-pointer bg-transparent p-0 transition-transform duration-200 ease-out hover:scale-110"
        style={{
          transform: unfolding ? "scale(1.6) rotate(8deg)" : undefined,
          opacity: unfolding ? 0 : 1,
          transition: "transform 320ms ease-in, opacity 320ms ease-in",
        }}
      >
        <SvgPiece src={`/assets/paper_${theme}.svg`} alt="" className="h-full w-full" />
      </button>
    </div>
  );
}
