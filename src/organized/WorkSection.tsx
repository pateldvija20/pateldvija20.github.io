import { cardImage, PROJECTS, type Project } from "../pieces/projects";
import { Section } from "./Section";

/**
 * The Work grid, after rachelchen.tech: two columns of images, each with a
 * one-line caption under it — name in ink, then " / type year" in the quiet
 * grey — and the project's title beneath. No card chrome: the image is the
 * card. The cursor carries the call to action ("View project"), so the tile
 * itself stays quiet.
 *
 * One column on the phone.
 */
function WorkTile({ project, onOpen }: { project: Project; onOpen: (el: HTMLElement) => void }) {
  const wip = project.wip === true;
  const qualifier = wip ? "Coming soon" : [project.type, project.year].filter(Boolean).join(" ");

  const body = (
    <>
      <div className="w-full overflow-hidden rounded-[4px]" style={{ aspectRatio: "16 / 10", background: "var(--rule)" }}>
        <img
          src={cardImage(project)}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
        />
      </div>
      <div className="flex flex-col gap-[4px] pt-[12px] text-left">
        <p className="text-[15px] leading-[1.4]">
          <span style={{ color: "var(--content)" }}>{project.name}</span>
          {qualifier ? <span style={{ color: "var(--quiet)" }}> / {qualifier}</span> : null}
        </p>
        {project.title ? (
          <p className="text-[15px] leading-[1.4]" style={{ color: "var(--quiet)" }}>
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
      className="group flex cursor-pointer flex-col border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{ outlineColor: "var(--content)" }}
    >
      {body}
    </button>
  );
}

export function WorkSection({ onOpen }: { onOpen: (slug: string, el: HTMLElement) => void }) {
  return (
    <Section id="work" title="Work">
      <div className="grid grid-cols-1 gap-x-[24px] gap-y-[40px] md:grid-cols-2 xl:gap-y-[56px]">
        {PROJECTS.map((p) => (
          <WorkTile key={p.slug} project={p} onOpen={(el) => onOpen(p.slug, el)} />
        ))}
      </div>
    </Section>
  );
}
