import { FadeImg } from "./FadeImg";
import { LoopMedia } from "../pieces/LoopMedia";
import { cardImage, PROJECTS, type Project } from "../pieces/projects";
import { Section } from "./Section";

/**
 * The Work list, after madhurima.me: one column of large 800x542 images with
 * 80px between them, each with a short caption under it — one grey uppercase
 * mono line of facts (who • what • when), then the project's title. No card
 * chrome beyond the image's rounded corners. The cursor carries the call to
 * action ("View project"), so the tile itself stays quiet.
 */
const IMAGE_RATIO = "800 / 542";

/**
 * One Work tile. On the homepage it opens the case study overlay (`onOpen`);
 * the "Also checkout" row at the foot of every case study passes `href`
 * instead, with the case study's own text colours.
 */
export function WorkTile({
  project,
  onOpen,
  href,
  ink = "var(--content)",
  quiet = "var(--quiet)",
}: {
  project: Project;
  onOpen?: (el: HTMLElement) => void;
  href?: string;
  ink?: string;
  quiet?: string;
}) {
  const wip = project.wip === true;
  // Figma's three slots are company, sector and year. Until projects carry
  // those, they show the project, its discipline and its year.
  const facts = [project.name, wip ? "Coming soon" : project.type, wip ? null : project.year].filter(Boolean);

  const body = (
    <>
      <div className="w-full overflow-hidden rounded-[12px]" style={{ aspectRatio: IMAGE_RATIO, background: project.heroBg ?? "var(--rule)" }}>
        {project.heroLoop ? (
          <project.heroLoop />
        ) : project.heroVideo ? (
          <LoopMedia
            still={cardImage(project)}
            video={project.heroVideo}
            className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
            style={project.heroClip ? { clipPath: project.heroClip } : undefined}
          />
        ) : (
          <FadeImg
            src={cardImage(project)}
            alt=""
            draggable={false}
            className="h-full w-full select-none object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        )}
      </div>
      <div className="flex flex-col gap-[6px] pt-[16px] text-left">
        <p className="font-mono text-[12px] uppercase leading-[18px] tracking-[0.4px] md:text-[14px]" style={{ color: quiet }}>
          {facts.join(" • ")}
        </p>
        {project.title ? (
          <p className="font-slab text-[20px] leading-[30px]" style={{ color: ink }}>
            {project.title}
          </p>
        ) : null}
      </div>
    </>
  );

  if (wip) {
    return (
      <div className="flex flex-col" data-cursor="Coming soon" aria-label={`${project.name}, coming soon`}>
        {body}
      </div>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        data-cursor="View project"
        data-cursor-frame="card"
        aria-label={`Open ${project.name} case study`}
        className="group flex cursor-pointer flex-col focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ outlineColor: ink }}
      >
        {body}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => onOpen?.(e.currentTarget)}
      data-cursor="View project"
      // The card rises as the cursor's fill opens behind it (index.css).
      data-cursor-frame="card"
      className="group flex cursor-pointer flex-col border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ outlineColor: "var(--content)" }}
    >
      {body}
    </button>
  );
}

export function WorkSection({ onOpen }: { onOpen: (slug: string, el: HTMLElement) => void }) {
  return (
    // No visible heading: the hero above already says what this is.
    <Section id="work" label="Work" afterHero>
      <div className="mx-auto flex w-full max-w-[800px] flex-col gap-[56px] md:gap-[80px]">
        {/* Coming-soon projects stay in the data (the desk's folder still
            shows them) but are left off the grid for now. */}
        {PROJECTS.filter((p) => !p.wip).map((p) => (
          <WorkTile key={p.slug} project={p} onOpen={(el) => onOpen(p.slug, el)} />
        ))}
      </div>
    </Section>
  );
}
