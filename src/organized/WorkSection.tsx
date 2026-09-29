import { PROJECTS } from "../pieces/projects";
import { ProjectCard } from "../pieces/ProjectCard";
import { INTRO } from "./content";
import { ITEM_GAP, Section } from "./Section";

/**
 * The introduction the page opens on (Figma 1840:35880), in a section of its
 * own above Work: same padding and closing rule as every other section, and no
 * heading, since the greeting is the heading. Not in the nav — it is the top of
 * the page, and Work is the first place to jump to.
 *
 * The blue pill keeps the 2.02° tilt the file gives it. That tilt is the one
 * bit of the desk's character the document borrows — everything else here is
 * square — so the tidy mode still reads as the same portfolio rather than as a
 * different site.
 */
export function IntroSection() {
  return (
    <Section id="intro" label="Introduction">
      <div className="flex flex-col gap-[20px]">
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
    </Section>
  );
}

/**
 * The Work grid (Figma 456:31740). Two columns on desktop and tablet, one on
 * the phone; the shared item gap (24 phone, 32 up).
 */
export function WorkSection({ onOpen }: { onOpen: (slug: string, el: HTMLElement) => void }) {
  return (
    <Section id="work" title="Work">
      <div className={`grid grid-cols-1 md:grid-cols-2 ${ITEM_GAP}`}>
        {PROJECTS.map((p) => (
          <ProjectCard key={p.slug} project={p} onOpen={(el) => onOpen(p.slug, el)} />
        ))}
      </div>
    </Section>
  );
}
