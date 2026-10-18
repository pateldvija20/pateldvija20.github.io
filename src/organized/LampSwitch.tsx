import type { Theme } from "../pieces/Piece";
import { HeroArt, LAMP_PIVOT } from "./HeroArt";
import { useSwing } from "./useSwing";

/**
 * The hero's lamp on its own, small, as Organised mode's light switch
 * wherever the hero's own lamp is not on screen: top-left of the phone and
 * tablet bar, and the top of the desktop sidebar on pages other than Work.
 *
 * Same drawing and same behaviour as the big one: it swings when brushed,
 * and a tap, click or pull flips the theme (see `useSwing`).
 */
export function LampSwitch({
  theme,
  onToggle,
  className,
  style,
}: {
  theme: Theme;
  onToggle: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const lamp = useSwing<SVGGElement>({
    pivot: LAMP_PIVOT,
    stiffness: 22,
    damping: 1.1,
    pull: { max: 70, threshold: 24, onPull: onToggle },
  });
  return (
    <HeroArt
      part="lamp"
      // Wide enough either side for the shade to swing without clipping.
      viewBox="420 0 345 300"
      className={className}
      // Not clipped to its box: a pull stretches the lamp up to 70 units below
      // the drawing's foot, and that has to show. Above the box is the top of
      // the window, so the cord running up there is never seen anyway.
      style={{ overflow: "visible", ...style }}
      lampRef={lamp}
      lampProps={{
        role: "button",
        tabIndex: 0,
        "aria-label": theme === "light" ? "Turn the lights off" : "Turn the lights on",
        "data-cursor": "Pull me",
        style: { cursor: "pointer", touchAction: "none" },
      }}
    />
  );
}
