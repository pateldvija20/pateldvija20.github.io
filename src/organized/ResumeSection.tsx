import type { ReactNode } from "react";
import { CV, EDUCATION, EXPERIENCE, RESUME_PDF } from "./content";
import { Section } from "./Section";

/**
 * CV, after madhurima.me/cv: one narrow column that reads like the document
 * it is. Name and a two-line summary, a quiet Download PDF button, then
 * labelled blocks — Contact, Work Experience, Education — of short rows:
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

/** Stand-in for a logo: the organisation's initial in a small ink square. */
function Mark({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] font-slab text-[11px] font-bold"
      style={{ background: "var(--content)", color: "var(--surface)" }}
    >
      {name.charAt(0)}
    </span>
  );
}

function Org({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-[10px]" style={{ color: "var(--content)" }}>
      <Mark name={name} />
      <span className="min-w-0">{name}</span>
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
      <path d="M7 1.5v8M3.5 6 7 9.5 10.5 6M2 12.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ResumeSection() {
  return (
    <Section id="resume" title="CV">
      <div className="flex max-w-[640px] flex-col gap-[40px]">
        <div className="flex flex-col items-start gap-[12px]">
          <p className="text-[18px] font-medium" style={{ color: "var(--content)" }}>
            {CV.name}
          </p>
          <p className="text-[15px] leading-[1.55]" style={{ color: "var(--quiet)" }}>
            {CV.summary}
          </p>
          <a
            href={RESUME_PDF}
            download
            data-cursor="Download"
            className="mt-[6px] inline-flex items-center gap-[8px] rounded-[6px] px-[12px] py-[7px] text-[14px] transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--rule)_18%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              color: "var(--content)",
              border: "1px solid color-mix(in srgb, var(--rule) 60%, transparent)",
              outlineColor: "var(--content)",
            }}
          >
            <DownloadIcon />
            Download PDF
          </a>
        </div>

        <Block title="Contact">
          {CV.contact.map((c) => (
            <div key={c.label} className="grid grid-cols-[110px_minmax(0,1fr)] py-[8px] text-[15px] leading-[1.4]">
              <span style={{ color: "var(--quiet)" }}>{c.label}</span>
              <a
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="w-fit underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: "var(--content)", outlineColor: "var(--content)" }}
              >
                {c.value} <span aria-hidden="true">↗</span>
              </a>
            </div>
          ))}
        </Block>

        <Block title="Work Experience">
          {EXPERIENCE.map((e) => (
            <div key={e.company + e.dates} className={ROW}>
              <Org name={e.company} />
              <span style={{ color: "var(--content)" }}>{e.role}</span>
              <Dates>{e.dates}</Dates>
            </div>
          ))}
        </Block>

        <Block title="Education">
          {EDUCATION.map((e) => (
            <div key={e.school} className={ROW}>
              <Org name={e.school} />
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
    </Section>
  );
}
