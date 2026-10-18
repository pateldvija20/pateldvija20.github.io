import type { CSSProperties } from "react";
import type { Theme } from "../pieces/Piece";
import { CHAIR_PIVOT, HeroArt, LAMP_PIVOT } from "./HeroArt";
import { useSwing } from "./useSwing";
import { HERO } from "./content";

/**
 * The hero (Figma Homepage, 2754:1044 light / 2754:1176 dark).
 *
 * From tablet up it is the Figma frame itself, fitted to the viewport: the
 * stage is the content area right of the sidebar and exactly one screen
 * tall, and the whole 1262x982 drawing is always inside it, never cropped.
 * The frame is scaled to fit and stood on the stage's floor
 * (`xMidYMax meet`): a wide, short window gets paper either side, a tall one
 * gets paper above, and the lamp cord and the chair rope run on up to the
 * top edge through it (HeroArt). The copy is
 * positioned in the frame's own coordinates through the same scale, in
 * container-query units, so the lines of type stay hung under the lamp at
 * every size — the lamp pointing at the title is the composition.
 *
 * A rule along its foot separates it from Work.
 *
 * The phone gets its own arrangement. Scaled to 375 the frame would set the
 * copy at about 6px, so instead the lamp hangs over the copy and the chair,
 * table and plant sit underneath it.
 */

/** Figma's content area: the 1512 frame less the 250 sidebar. */
const STAGE_W = 1262;
const STAGE_H = 982;
const SIDEBAR_W = 250;

/** Screen px per frame px: whichever axis makes the frame fit the stage. */
const SCALE = `min(100cqw / ${STAGE_W}, 100cqh / ${STAGE_H})`;
/** A length in the frame's px, scaled with the stage. */
const u = (n: number) => `calc(${n} * ${SCALE})`;
/** A frame x / y, scaled and shifted by the paper left over on that axis:
 *  half of it on x, all of it on y, which is where `xMidYMax meet` puts the
 *  drawing. */
const fx = (n: number) => `calc((100cqw - ${STAGE_W} * ${SCALE}) / 2 + ${n} * ${SCALE})`;
const fy = (n: number) => `calc(100cqh - ${STAGE_H} * ${SCALE} + ${n} * ${SCALE})`;

/**
 * Roboto Slab at 20px on a 1.3 line, matched against the export's outlines:
 * the tagline's first line measures 374.6 wide there and 373 here. Never
 * below 14px, which is where the tablet stage would otherwise take it.
 */
const SIZE = 20;
const LEADING = 1.3;
const BODY = `max(14px, ${u(SIZE)})`;
/** Line-box top to baseline in Roboto Slab (ascent 1.048em, content area
 *  1.319em), so a top can be set from one of Figma's baselines. */
const TO_BASELINE = ((LEADING - 1.319) / 2 + 1.048) * SIZE;

/** Positions read from the export's outlines (frame x less the sidebar). */
const AXIS = 591.9 - SIDEBAR_W;
const GREETING_TOP = 432 - TO_BASELINE;
const SCRIPT = { left: 396.2 - SIDEBAR_W, top: 462.5, width: 390.7 };
const TAGLINE_TOP = 585 - TO_BASELINE;

const centred = (top: number): CSSProperties => ({
  position: "absolute",
  left: fx(AXIS),
  top: fy(top),
  transform: "translateX(-50%)",
  textAlign: "center",
});

/**
 * The lamp and the chair hang, so they swing (`useSwing`). The lamp is also
 * Organised mode's light switch: pull it down — or click it — and the theme
 * flips as it bounces back up. The chair is heavier, so it swings slower and
 * longer.
 */
export function HeroSection({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const lamp = useSwing<SVGGElement>({
    pivot: LAMP_PIVOT,
    stiffness: 15,
    damping: 0.8,
    pull: { max: 90, threshold: 34, onPull: onToggleTheme },
  });
  // Heavier: slower, a longer settle, and a smaller bob on its rope.
  const chair = useSwing<SVGGElement>({ pivot: CHAIR_PIVOT, stiffness: 7, damping: 0.45, maxAngle: 12, bob: 3 });
  const phoneChair = useSwing<SVGGElement>({ pivot: CHAIR_PIVOT, stiffness: 7, damping: 0.45, maxAngle: 12, bob: 3 });
  const lampLabel = theme === "light" ? "Turn the lights off" : "Turn the lights on";

  return (
    <section id="intro" aria-label="Introduction">
      {/* Tablet and desktop: the Figma frame, fitted to one screen. The
          tablet's screen starts under its 107px top bar. */}
      <div className="hidden w-full md:block" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div
          className="relative h-[calc(100svh-108px)] w-full overflow-hidden lg:h-[calc(100svh-1px)]"
          style={{ containerType: "size" }}
        >
          <HeroArt
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMax meet"
            lampRef={lamp}
            chairRef={chair}
            lampProps={{
              role: "button",
              tabIndex: 0,
              "aria-label": lampLabel,
              "data-cursor": "Pull me",
              style: { cursor: "pointer", touchAction: "none" },
            }}
            chairProps={{ "data-cursor": "Give it a push", style: { cursor: "grab", touchAction: "none" } }}
          />

          <p className="font-slab whitespace-nowrap" style={{ ...centred(GREETING_TOP), fontSize: BODY, lineHeight: LEADING, color: "var(--content)" }}>
            {HERO.greeting}
          </p>

          <h1
            className="absolute"
            style={{ left: fx(SCRIPT.left), top: fy(SCRIPT.top), width: u(SCRIPT.width), color: "var(--content)" }}
          >
            <span className="sr-only">{HERO.role}</span>
            <span aria-hidden="true" className="hero-script" />
          </h1>

          <p
            className="font-slab"
            style={{
              ...centred(TAGLINE_TOP),
              width: u(400),
              fontSize: BODY,
              lineHeight: LEADING,
              color: "var(--quiet)",
            }}
          >
            {HERO.tagline}
          </p>
        </div>
      </div>

      {/* Phone: copy, then the furniture. The lamp hangs in the top bar
          instead, where it is the light switch on every page (LampSwitch). */}
      <div className="flex flex-col items-center md:hidden">
        <div className="flex flex-col items-center gap-[14px] px-[24px] pt-[24px] text-center">
          <p className="font-slab text-[18px] leading-[1.2]" style={{ color: "var(--content)" }}>
            {HERO.greeting}
          </p>
          <h1 className="w-[min(300px,80vw)]" style={{ color: "var(--content)" }}>
            <span className="sr-only">{HERO.role}</span>
            <span aria-hidden="true" className="hero-script" />
          </h1>
          <p className="font-slab max-w-[320px] text-[16px] leading-[1.3]" style={{ color: "var(--quiet)" }}>
            {HERO.tagline}
          </p>
        </div>
        <HeroArt
          part="furniture"
          viewBox="690 300 822 682"
          className="mt-[24px] block w-full"
          chairRef={phoneChair}
          // Vertical drags still scroll the page; sideways ones push the chair.
          chairProps={{ style: { touchAction: "pan-y" } }}
        />
      </div>
    </section>
  );
}
