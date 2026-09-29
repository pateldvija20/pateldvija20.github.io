import { EDUCATION, EXPERIENCE, RESUME_PDF } from "./content";
import { BLOCK_GAP, ITEM_GAP, Section, SectionHeading } from "./Section";
import type { ReactNode } from "react";

/**
 * Résumé. Three genuinely different layouts, one per authored frame:
 *
 *   phone   (458:33380)  label above; every field on its own line
 *   tablet  (456:32780)  label above; fields in columns
 *   desktop (456:18800)  label in a 200px column to the left
 *
 * Everything used to key off `xl:` (1512), which collapsed all three into the
 * phone layout at every width below the full frame — including ordinary
 * desktops. Columns now arrive at `md:`, where there is room for them, and only
 * the label's move to its own column waits for the full frame.
 *
 * Figma runs three columns here; the fourth is the city, added on request.
 */

/** One row of fields. Stacked on the phone, columns from tablet up. */
const ROW =
  "flex flex-col gap-2 text-xl font-medium text-muted md:flex-row md:items-baseline md:gap-[40px]";
/** The trailing date column — fixed at Figma's 180 once there are columns. */
const DATES = "shrink-0 md:w-[150px] xl:w-[180px]";

/**
 * A labelled block. The label sits above its rows until the full 1512 frame,
 * where it moves into its own 200px column — that is the one structural
 * difference between the tablet and desktop frames.
 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col xl:flex-row ${ITEM_GAP} xl:gap-[40px]`}>
      <div className="shrink-0 xl:w-[200px]">
        <h3 className="text-xl font-medium tracking-[0.02em]" style={{ color: "var(--content)" }}>
          {label}
        </h3>
      </div>
      <div className={`flex min-w-0 flex-1 flex-col ${ITEM_GAP}`}>{children}</div>
    </div>
  );
}

export function ResumeSection() {
  return (
    <Section id="resume" label="Resume">
      <div className={`flex flex-col ${BLOCK_GAP}`}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <SectionHeading>Resume</SectionHeading>
          {/* The button is 60px tall against the heading's 34. Its extra 13px
              above and below hang outside the row, so the heading sits the
              same distance from its content here as in every other section. */}
          <a
            href={RESUME_PDF}
            download
            className="-my-[13px] rounded-xl px-6 py-4 text-lg font-medium capitalize transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ background: "var(--color-link)", color: "#fdfeff", outlineColor: "var(--content)" }}
          >
            Download PDF
          </a>
        </div>

        <Row label="Work Experience">
          {EXPERIENCE.map((e) => (
            <div key={e.company + e.dates} className={ROW}>
              {/* Role leads and carries the weight — it is what the row is
                  about; the employer, the place and the span qualify it. */}
              <span className="min-w-0 flex-1 font-semibold" style={{ color: "var(--content)" }}>
                {e.role}
              </span>
              <span className="min-w-0 flex-1">{e.company}</span>
              <span className="min-w-0 flex-1">{e.city}</span>
              <span className={DATES}>{e.dates}</span>
            </div>
          ))}
        </Row>

        <Row label="Education">
          {EDUCATION.map((e) => (
            <div key={e.school} className={ROW}>
              <span className="min-w-0 flex-1 font-semibold" style={{ color: "var(--content)" }}>
                {e.school}
              </span>
              {/* Degree and its focus are one column in the design, stacked —
                  the focus qualifies the degree rather than standing beside it. */}
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span>{e.degree}</span>
                <span className="italic">{e.details}</span>
              </span>
              <span className={DATES}>{e.dates}</span>
            </div>
          ))}
        </Row>
      </div>
    </Section>
  );
}
