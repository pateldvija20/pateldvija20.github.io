import { PROJECTS } from "../pieces/projects";
import { ProjectCard } from "../pieces/ProjectCard";
import { Section } from "./Section";

/**
 * The Work grid (Figma 456:31740). Two columns on desktop and tablet, one on
 * the phone; 32px gutter, 30px on the phone to match its page gutter.
 */
export function WorkSection({ onOpen }: { onOpen: (slug: string, el: HTMLElement) => void }) {
  return (
    <Section id="work" title="Work">
      <div className="grid grid-cols-1 gap-[30px] md:grid-cols-2 md:gap-8">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.slug} project={p} onOpen={(el) => onOpen(p.slug, el)} />
        ))}
      </div>
    </Section>
  );
}
