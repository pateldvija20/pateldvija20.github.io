import { WRITING_HEADING, WRITING_NOTE } from "./content";
import { Section } from "./Section";

/**
 * "How I See Things" (Figma 451:17513).
 *
 * ⚠️ Collapsed, for the same reason Archive is. The frame ships three cards
 * and all three carry the same placeholder title with no link, because none
 * of the writing exists yet — rendering them drew three identical tiles that
 * looked like a rendering fault rather than an empty section. The heading
 * stays (the scroll target and the sidebar entry both still resolve) and one
 * line says what it is waiting for.
 *
 * `WRITING` in `content.ts` still holds the three mesh gradients and the
 * grid this goes back to. Restoring it means putting real entries in that
 * array and bringing back the grid here — not re-deriving the layout.
 */
export function WritingSection() {
  return (
    <Section id="writing" title={WRITING_HEADING}>
      <p className="max-w-[60ch] text-xl text-muted md:text-2xl">{WRITING_NOTE}</p>
    </Section>
  );
}
