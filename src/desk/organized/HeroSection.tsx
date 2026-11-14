import { useRef, type CSSProperties } from "react";
import type { Theme } from "../pieces/Piece";
import { CHAIR_PIVOT, coneAt, coneClip, HERO_H, HERO_W, HeroArt, LAMP_PIVOT } from "./HeroArt";
import { useSwing } from "./useSwing";
import { HERO } from "./content";

/**
 * The hero (Figma Homepage 2232:4847 light / 2232:4729 dark, "Frame 25").
 *
 * From tablet up it is the frame's own 1105x710 block at the top of the
 * content column: the lamp on the left with the copy hung under it, the
 * chair, plant and table on the right, all standing on a grey floor line.
 * The drawing is in the block's coordinates (HeroArt) and the copy is
 * positioned in the same coordinates with container-query units, so the
 * lines of type stay under the lamp as the column narrows. In dark mode the
 * lamp is lit and casts a yellow cone over the copy. The copy reacts to the
 * light the way print would: a second, dark-ink copy of the greeting and
 * tagline sits over the first, clipped to the cone's current shape, so as the
 * lamp swings the light carries the dark type with it and what it leaves
 * goes back to light-on-dark (`.hero-lit`, index.css).
 *
 * The phone gets its own arrangement: the copy, then the furniture. The lamp
 * hangs in the top bar instead, where it is the light switch on every page.
 */

/** A length in the block's px, scaled with the column. */
const u = (n: number) => `calc(${n} * 100cqw / ${HERO_W})`;

/** Roboto Slab 20 on a 26 line, as the frame sets the greeting and tagline.
 *  Never below 14px, which is where the tablet column would take it. */
const SIZE = 20;
const LEADING = 26 / SIZE;
const BODY = `max(14px, ${u(SIZE)})`;

/** Frame 23's boxes, in the block's coordinates. */
const TEXT_X = 145.74;
const TEXT_Y = 378.02;
const AXIS = LAMP_PIVOT.x;
/** The lettering is the old outlined artwork (391:72), centred in the frame's
 *  394x99 line box. */
const SCRIPT = { left: TEXT_X, top: TEXT_Y + 40 + (99 - (394 * 72) / 391) / 2, width: 394 };
const TAGLINE = { left: TEXT_X + 6.5, top: TEXT_Y + 153, width: 381 };

const centred = (top: number): CSSProperties => ({
  position: "absolute",
  left: u(AXIS),
  top: u(top),
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
  // The cone is recast from the lamp every frame, so the light moves the way
  // light does rather than swinging like a stiff paper triangle.
  const cone = useRef<SVGPathElement>(null);
  const lit = useRef<HTMLDivElement>(null);
  const lamp = useSwing<SVGGElement>({
    pivot: LAMP_PIVOT,
    stiffness: 15,
    damping: 0.9,
    maxAngle: 10,
    bob: 2,
    pull: { max: 60, threshold: 24, onPull: onToggleTheme },
    onFrame: (deg, dy) => {
      cone.current?.setAttribute("d", coneAt(deg, dy));
      if (lit.current) lit.current.style.clipPath = coneClip(deg, dy);
    },
  });
  // Heavier: slower, a longer settle, and a smaller bob on its rope.
  const chair = useSwing<SVGGElement>({ pivot: CHAIR_PIVOT, stiffness: 7, damping: 0.55, maxAngle: 8, bob: 1.5 });
  const phoneChair = useSwing<SVGGElement>({ pivot: CHAIR_PIVOT, stiffness: 7, damping: 0.55, maxAngle: 8, bob: 1.5 });
  const lampLabel = theme === "light" ? "Turn the lights off" : "Turn the lights on";

  return (
    <section id="intro" aria-label="Introduction">
      {/* Tablet and desktop: the frame's block, in the content column. */}
      <div className="hidden md:block md:px-[60px] lg:px-[120px]">
        <div className="mx-auto w-full" style={{ maxWidth: HERO_W, containerType: "inline-size" }}>
          <div className="relative w-full" style={{ aspectRatio: `${HERO_W} / ${HERO_H}` }}>
            <HeroArt
              className="absolute inset-0 h-full w-full"
              // Not clipped to the block: the light runs on past its sides
              // (still stopping at the floor line), and a swinging lamp's
              // shade can reach past them too.
              style={{ overflow: "visible" }}
              lampRef={lamp}
              chairRef={chair}
              coneRef={cone}
              lampProps={{
                role: "button",
                tabIndex: 0,
                "aria-label": lampLabel,
                "data-cursor": "Pull me",
                style: { cursor: "pointer", touchAction: "none" },
              }}
              chairProps={{ "data-cursor": "Push me", style: { cursor: "grab", touchAction: "none" } }}
            />

            {/* The foot of the lamp. Once it scrolls off the top, the sidebar
                hangs its own lamp above the nav (Sidebar). */}
            <div data-lamp-sentinel="" aria-hidden="true" className="absolute left-0 h-px w-px" style={{ top: u(315) }} />

            <p
              className="font-slab whitespace-nowrap"
              style={{ ...centred(TEXT_Y), fontSize: BODY, lineHeight: LEADING, color: "var(--content)" }}
            >
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
              className="absolute text-center font-slab"
              style={{
                left: u(TAGLINE.left),
                top: u(TAGLINE.top),
                width: u(TAGLINE.width),
                fontSize: BODY,
                lineHeight: LEADING,
                color: "var(--quiet)",
              }}
            >
              {HERO.tagline}
            </p>

            {/* The lit copy: dark ink where the cone falls (dark mode only). */}
            <div
              ref={lit}
              aria-hidden="true"
              className="hero-lit pointer-events-none absolute inset-0"
              style={{ clipPath: coneClip(0, 0) }}
            >
              <p
                className="font-slab whitespace-nowrap"
                style={{ ...centred(TEXT_Y), fontSize: BODY, lineHeight: LEADING, color: "#212121" }}
              >
                {HERO.greeting}
              </p>
              <p
                className="absolute text-center font-slab"
                style={{
                  left: u(TAGLINE.left),
                  top: u(TAGLINE.top),
                  width: u(TAGLINE.width),
                  fontSize: BODY,
                  lineHeight: LEADING,
                  color: "#525252",
                }}
              >
                {HERO.tagline}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phone: copy, then the furniture. */}
      <div className="flex flex-col items-center md:hidden">
        <div className="flex flex-col items-center gap-[14px] px-[24px] pt-[24px] text-center">
          <p className="font-slab text-[18px] leading-[1.2]" style={{ color: "var(--content)" }}>
            {HERO.greeting}
          </p>
          <h1 className="w-[min(300px,80vw)]" style={{ color: "var(--content)" }}>
            <span className="sr-only">{HERO.role}</span>
            <span aria-hidden="true" className="hero-script" />
          </h1>
          <p className="max-w-[320px] font-slab text-[16px] leading-[1.3]" style={{ color: "var(--quiet)" }}>
            {HERO.tagline}
          </p>
        </div>
        <HeroArt
          part="furniture"
          viewBox="520 300 460 410"
          className="mt-[24px] block w-full px-[24px]"
          chairRef={phoneChair}
          // Vertical drags still scroll the page; sideways ones push the chair.
          chairProps={{ style: { touchAction: "pan-y" } }}
        />
      </div>
    </section>
  );
}
