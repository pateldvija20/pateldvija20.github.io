import type { ReactNode } from "react";

/**
 * One Organised-mode section, spaced after rachelchen.tech.
 *
 * Her page is mostly empty on purpose, and the emptiness does three things
 * this layout copies:
 *
 *   one column          Figma Homepage 2232:4847: 1105px between 120px
 *                       gutters, which is exactly what the 167px sidebar
 *                       leaves at 1512; past that it centres
 *   room above          a page starts 160px down, not at the top edge
 *   no rules            sections are separated by space alone; nothing draws
 *                       a line between them
 *
 * Headings are quiet labels in Roboto Slab, the hero's and the nav's face,
 * 20px (text-xl, the hero greeting's size) in the secondary grey — the work
 * is what should be loud, not the name of the shelf it is on.
 *
 * Spacing, one scale at every width:
 *
 *   gutter            24 phone / 60 tablet / 120 desktop
 *   above / below     64 & 80 phone, 112 & 112 tablet, 160 & 140 desktop;
 *                     120 above when it follows the hero (`afterHero`)
 *   label -> content  32
 */
const CONTENT_MAX = 1105;

export function Section({
  id,
  label,
  title,
  afterHero = false,
  children,
}: {
  id: string;
  /** Accessible name. Defaults to `title` when one is given. */
  label?: string;
  /** Visible heading, a quiet label above the content. */
  title?: string;
  /** Sits under the hero, which already gives it room: 120 above, not 160. */
  afterHero?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label ?? title}
      className={`px-[24px] pb-[80px] pt-[64px] md:px-[60px] md:pb-[112px] md:pt-[112px] lg:px-[120px] lg:pb-[140px] ${
        afterHero ? "lg:pt-[120px]" : "lg:pt-[160px]"
      }`}
    >
      <div className="mx-auto w-full" style={{ maxWidth: CONTENT_MAX }}>
        {title ? (
          <div className="mb-[32px]">
            <SectionHeading>{title}</SectionHeading>
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-slab text-xl leading-[1.3]" style={{ color: "var(--quiet)" }}>
      {children}
    </h2>
  );
}
