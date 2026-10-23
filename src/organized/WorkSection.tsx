import { FadeImg } from "./FadeImg";
import { LoopMedia } from "../pieces/LoopMedia";
import { cardImage, PROJECTS, type Project } from "../pieces/projects";
import { Section } from "./Section";

/**
 * The Work grid (Figma Homepage 2232:4847, "Frame 31"): two columns of
 * 522.5x339 images with 60px between them and between rows, each with a
 * caption under it — a row of three small grey facts (who, what, when), then
 * the project's title in Roboto Slab. No card chrome beyond the image's
 * rounded corners. The cursor carries the call to action ("View project"),
 * so the tile itself stays quiet.
 *
 * One column on the phone.
 */
const IMAGE_RATIO = "522.5 / 339.35";

function WorkTile({ project, onOpen }: { project: Project; onOpen: (el: HTMLElement) => void }) {
  const wip = project.wip === true;
  // Figma's three slots are company, sector and year. Until projects carry
  // those, they show the project, its discipline and its year.
  const facts = [project.name, wip ? "Coming soon" : project.type, wip ? null : project.year].filter(Boolean);

  const body = (
    <>
      <div className="w-full overflow-hidden rounded-[12px]" style={{ aspectRatio: IMAGE_RATIO, background: project.heroBg ?? "var(--rule)" }}>
        {project.heroVideo ? (
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
      <div className="flex flex-col gap-[10px] pt-[24px] text-left">
        <p className="flex flex-wrap gap-x-[24px] gap-y-[4px] text-[14px] leading-[21px]" style={{ color: "var(--quiet)" }}>
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
        {project.title ? (
          <p className="font-slab text-[24px] leading-[36px]" style={{ color: "var(--content)" }}>
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
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
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
      <div className="grid grid-cols-1 gap-[40px] md:grid-cols-2 lg:gap-[60px]">
        {/* Coming-soon projects stay in the data (the desk's folder still
            shows them) but are left off the grid for now. */}
        {PROJECTS.filter((p) => !p.wip).map((p) => (
          <WorkTile key={p.slug} project={p} onOpen={(el) => onOpen(p.slug, el)} />
        ))}
      </div>
    </Section>
  );
}
