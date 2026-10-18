import type { CSSProperties } from "react";
import { HeroArt } from "./HeroArt";
import { HERO } from "./content";

/**
 * The hero (Figma Homepage, 2754:1044 light / 2754:1176 dark).
 *
 * From tablet up it is the Figma frame itself: the content area right of the
 * 250px sidebar is a 1262x982 stage, the illustration is Figma's paths in that
 * stage's coordinates, and the copy is positioned in the same coordinates
 * with container-query units. So the lines of type stay hung under the lamp
 * at every width rather than drifting as the drawing scales — the lamp
 * pointing at the title is the composition.
 *
 * The phone gets its own arrangement. Scaled to 375 the frame would set the
 * copy at about 6px, so instead the lamp hangs over the copy and the chair,
 * table and plant sit underneath it.
 */

/** Figma's content area: the 1512 frame less the 250 sidebar. */
const STAGE_W = 1262;
const STAGE_H = 982;
const SIDEBAR_W = 250;

/** A length in the frame's px, scaled with the stage. */
const u = (n: number) => `calc(${n} * 100cqw / ${STAGE_W})`;

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
  left: u(AXIS),
  top: u(top),
  transform: "translateX(-50%)",
  textAlign: "center",
});

export function HeroSection() {
  return (
    <section id="intro" aria-label="Introduction">
      {/* Tablet and desktop: the Figma frame. */}
      <div className="hidden w-full md:block" style={{ containerType: "inline-size", maxWidth: STAGE_W }}>
        <div className="relative w-full" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
          <HeroArt className="absolute inset-0 h-full w-full" />

          <p className="font-slab whitespace-nowrap" style={{ ...centred(GREETING_TOP), fontSize: BODY, lineHeight: LEADING, color: "var(--content)" }}>
            {HERO.greeting}
          </p>

          <h1
            className="absolute"
            style={{ left: u(SCRIPT.left), top: u(SCRIPT.top), width: u(SCRIPT.width), color: "var(--content)" }}
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

      {/* Phone: lamp, copy, then the furniture. */}
      <div className="flex flex-col items-center md:hidden">
        <HeroArt part="lamp" viewBox="470 0 245 300" className="block w-[132px]" />
        <div className="flex flex-col items-center gap-[14px] px-[24px] pt-[8px] text-center">
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
        <HeroArt part="furniture" viewBox="690 300 822 682" className="mt-[24px] block w-full" />
      </div>
    </section>
  );
}
