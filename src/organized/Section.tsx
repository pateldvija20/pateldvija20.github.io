import type { ReactNode } from "react";

/**
 * One Organised-mode section.
 *
 * Owns the page gutter and the rule that closes the section off. Sections
 * scroll freely; nothing snaps.
 *
 * The gutter steps 30 / 60 / 60 / 100 rather than Figma's 30 / 60 / 100,
 * because between 1025 and 1511 the 250px sidebar is already taking its width
 * out of the same row: at 1025 a 100px gutter would leave the content column
 * around 575px. The full 100 arrives with the full 1512 frame it was drawn
 * against.
 *
 * Past the 1512 frame the section keeps widening, so its rule reaches the
 * window's right edge, but its content stops at CONTENT_MAX, left-aligned
 * beside the nav. The nav column takes the extra width on the left (see
 * Sidebar), so nav and content stay together as one centred block. 1062 is
 * what the frame gave the content (1512, less the 250 sidebar and two 100
 * gutters), so nothing changes up to 1512.
 *
 * One spacing scale for every section, at every width:
 *
 *   section padding       30 phone / 60 tablet & laptop / 100 from 1280
 *   heading -> content    40, 60 from 1280  (HEADING_GAP)
 *   block -> block        40, 60 from 1280  (BLOCK_GAP)
 *   rows, cards, items    24 phone, 32 from tablet  (ITEM_GAP)
 *
 * Sections size to their content. About used to be forced to a full viewport
 * with its content centred in it, which put 179px under its heading at 1512
 * against 60 everywhere else.
 */
const CONTENT_MAX = 1062;

/** Heading to the content under it. */
export const HEADING_GAP = "mb-[40px] xl:mb-[60px]";
/** Between the blocks that make up a section. */
export const BLOCK_GAP = "gap-[40px] xl:gap-[60px]";
/** Between repeated items: list rows, cards. */
export const ITEM_GAP = "gap-[24px] md:gap-[32px]";

export function Section({
  id,
  label,
  title,
  children,
}: {
  id: string;
  /** Accessible name. Defaults to `title` when one is given. */
  label?: string;
  /** Visible heading, rendered in Roboto Slab, Title Case. Every section has
   *  one, so the page reads as a sequence of named parts rather than a run of
   *  unlabelled blocks. */
  title?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label ?? title}
      // scroll-mt keeps a smooth-scrolled section clear of the sticky top bar
      // at the two widths that have one; the desktop sidebar is beside the
      // content, not over it, so it needs none.
      className="scroll-mt-[95px] px-[30px] py-[30px] md:scroll-mt-[107px] md:px-[60px] md:py-[60px] lg:scroll-mt-0 xl:px-[100px] xl:py-[100px]"
      style={{
        borderBottom: "1px solid color-mix(in srgb, var(--edge) 18%, transparent)",
      }}
    >
      <div className="w-full" style={{ maxWidth: CONTENT_MAX }}>
        {title ? (
          <div className={HEADING_GAP}>
            <SectionHeading>{title}</SectionHeading>
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/**
 * Section heading — Roboto Slab, at the same size as the introduction it now
 * sits under (`text-section`, 28px).
 *
 * It used to be `text-page`, 40px, which made every section name louder than
 * the sentence introducing the page. Dropping to the introduction's size lets
 * the names read as labels on the parts rather than as competing headlines.
 *
 * No `capitalize` either: the titles are written in Title Case at the point
 * they are defined, so the casing is editable copy rather than something CSS
 * imposes — which also stops it forcing a capital onto words that should keep
 * their own case.
 */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-slab text-section" style={{ color: "var(--content)" }}>
      {children}
    </h2>
  );
}
