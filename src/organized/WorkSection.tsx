import { PROJECTS } from "../pieces/projects";
import { ProjectCard } from "../pieces/ProjectCard";
import { INTRO } from "./content";
import { Section } from "./Section";

/**
 * The introduction the page opens on (Figma 1840:35880).
 *
 * It sits inside the Work section, above its heading, rather than in a section
 * of its own: the first thing the page should say is who this is, and giving
 * that its own heading and closing rule would make the visitor cross a section
 * break before reaching any work.
 *
 * The blue pill keeps the 2.02° tilt the file gives it. That tilt is the one
 * bit of the desk's character the document borrows — everything else here is
 * square — so the tidy mode still reads as the same portfolio rather than as a
 * different site.
 */
function WorkIntro() {
  return (
    <div className="mb-[40px] flex flex-col gap-[20px] xl:mb-[60px]">
      <div className="flex flex-wrap items-center gap-x-[20px] gap-y-[12px]">
        <p className="font-slab text-section" style={{ color: "var(--content)" }}>
          {INTRO.greeting}
        </p>
        <span
          className="font-slab text-section inline-block rotate-[2.02deg] whitespace-nowrap rounded-[12px] px-[24px] py-[8px]"
          style={{
            background: "var(--color-link)",
            color: "#fdfeff",
            border: "3px solid var(--edge)",
          }}
        >
          {INTRO.role}
        </span>
      </div>
      <p className="text-2xl font-medium text-muted">{INTRO.description}</p>
    </div>
  );
}

/**
 * The Work grid (Figma 456:31740). Two columns on desktop and tablet, one on
 * the phone; 32px gutter, 30px on the phone to match its page gutter.
 */
export function WorkSection({ onOpen }: { onOpen: (slug: string, el: HTMLElement) => void }) {
  return (
    <Section id="work" title="Work" lead={<WorkIntro />}>
      <div className="grid grid-cols-1 gap-[30px] md:grid-cols-2 md:gap-8">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.slug} project={p} onOpen={(el) => onOpen(p.slug, el)} />
        ))}
      </div>
    </Section>
  );
}
