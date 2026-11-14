import { ARCHIVE_NOTE } from "./content";
import { Section } from "./Section";

/**
 * Archive (Figma 456:31743).
 *
 * ⚠️ Collapsed. The frame ships nine empty cards and the real images, titles
 * and links are still being chosen — rendering the placeholders drew nine
 * black rectangles and read as a bug rather than as a section awaiting
 * content. Until the entries exist the section keeps its heading (so the nav
 * item and the scroll target both still resolve) and says so in one line.
 *
 * `ARCHIVE_COLUMNS` in `content.ts` still holds Figma's alternating 360/480
 * rhythm, which is what the grid goes back to once there are entries to put
 * in it. Restoring it means re-adding the grid here and in `ArchiveNote`'s
 * other caller — not re-deriving the layout.
 */
export function ArchiveSection() {
  return (
    <Section id="archive" title="Archive">
      <ArchiveNote />
    </Section>
  );
}

/**
 * The stand-in the Archive shows while it is empty. Shared with the Scattered
 * route into the same content (`ArchiveOverlay`, opened by finishing the
 * puzzle) so both say the same thing — the puzzle is a second way in, never a
 * different destination.
 */
export function ArchiveNote() {
  return (
    <p className="max-w-[60ch] text-xl text-muted md:text-2xl">{ARCHIVE_NOTE}</p>
  );
}
