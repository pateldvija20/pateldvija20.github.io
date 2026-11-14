import type { ReactNode } from "react";
import { Button } from "../pieces/Button";
import { CV, EDUCATION, EXPERIENCE, RESUME_PDF } from "./content";
import { Intro, INTRO_TEXT, Section } from "./Section";

/**
 * CV, after madhurima.me/cv: one narrow column that reads like the document
 * it is. Name and a two-line summary, a quiet Download resume button, then
 * labelled blocks — Work Experience, Education — of short rows:
 * a mark and the organisation, the role, and the dates in mono.
 *
 * The rows are a three-column grid from tablet up so the roles and dates line
 * up down the page; on the phone each row stacks.
 *
 * The section keeps the id `resume`, which /work-experience deep links land
 * on; only its label says CV.
 */

/** Organisation, role, dates. */
const ROW =
  "grid grid-cols-1 gap-[2px] py-[10px] text-[15px] leading-[1.4] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_140px] md:items-baseline md:gap-[16px]";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <h3 className="pb-[8px] text-[16px] font-medium" style={{ color: "var(--content)" }}>
        {title}
      </h3>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

/** The organisation's logo, as LinkedIn shows it: a small rounded square.
 *  Without one, its initial in an ink square stands in. */
function Mark({ name, logo }: { name: string; logo?: string }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        width={24}
        height={24}
        loading="lazy"
        className="mt-[-1.5px] h-[24px] w-[24px] shrink-0 rounded-[4px] bg-white object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mt-[-1.5px] inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[4px] font-slab text-[13px] font-bold"
      style={{ background: "var(--content)", color: "var(--surface)" }}
    >
      {name.charAt(0)}
    </span>
  );
}

function Org({ name, logo }: { name: string; logo?: string }) {
  return (
    // The row lines its columns up on the text baseline. An image's baseline
    // is its bottom edge, so the name alone sets this one (`self-baseline`),
    // and the mark sits centred on the name's first line beside it.
    <span className="flex min-w-0 items-start gap-[10px]" style={{ color: "var(--content)" }}>
      <Mark name={name} logo={logo} />
      <span className="min-w-0 self-baseline">{name}</span>
    </span>
  );
}

const Dates = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[13px] md:text-right" style={{ color: "var(--quiet)" }}>
    {children}
  </span>
);

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M7 1.5v8M3.5 6 7 9.5 10.5 6M2 12.5h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ResumeSection() {
  return (
    <Section id="resume" title="CV">
      <div className="flex flex-col gap-[64px]">
        {/* Opens the way About does: the same measure and type. */}
        <Intro>
          <p className={INTRO_TEXT}>{CV.summary}</p>
          <Button href={RESUME_PDF} download variant="outlined" className="mt-[8px]">
            <DownloadIcon />
            Download resume
          </Button>
        </Intro>

        <div className="flex max-w-[640px] flex-col gap-[40px]">
          <Block title="Work Experience">
            {EXPERIENCE.map((e) => (
              <div key={e.company + e.dates} className={ROW}>
                <Org name={e.company} logo={e.logo} />
                <span style={{ color: "var(--content)" }}>{e.role}</span>
                <Dates>{e.dates}</Dates>
              </div>
            ))}
          </Block>

          <Block title="Education">
            {EDUCATION.map((e) => (
              <div key={e.school} className={ROW}>
                <Org name={e.school} logo={e.logo} />
                <span style={{ color: "var(--content)" }}>
                  {e.degree}
                  <span className="block text-[13px]" style={{ color: "var(--quiet)" }}>
                    {e.details}
                  </span>
                </span>
                <Dates>{e.dates}</Dates>
              </div>
            ))}
          </Block>
        </div>
      </div>
    </Section>
  );
}
