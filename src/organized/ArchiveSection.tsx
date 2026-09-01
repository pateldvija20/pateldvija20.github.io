import { ARCHIVE_COLUMNS } from "./content";
import { Section } from "./Section";

/**
 * Archive (Figma 456:31743).
 *
 * ⚠️ The nine cards are placeholders — the frame ships them empty and the real
 * images and links are still being chosen. What is real here is the *rhythm*:
 * three columns of alternating 360/480 heights, which is what stops the grid
 * reading as a plain matrix. Filling this in means giving each entry content,
 * not changing the layout.
 *
 * Archive content lives here, in Organised mode, and is reachable without
 * solving the Scattered puzzle — the puzzle is a bonus route to the same
 * place, never a gate.
 */
export function ArchiveSection() {
  return (
    <Section id="archive" title="Archive">
      <div className="flex flex-col gap-[40px] xl:gap-[60px]">

        {/* Columns rather than a row-major grid: the alternating heights only
            line up when each column stacks independently. On the phone the
            three columns collapse into one flow. */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {ARCHIVE_COLUMNS.map((column, ci) => (
            <div key={ci} className="flex flex-col gap-8">
              {column.map((height, ri) => (
                <div
                  key={ri}
                  className="w-full overflow-hidden rounded-xl bg-well"
                  style={{ height, border: "1px solid var(--edge)" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
