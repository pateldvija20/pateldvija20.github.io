import { cardImage, type Project } from "./projects";

/**
 * The project card, used everywhere a project is shown as a tile: the Work
 * grid in Organised mode and the "Also checkout" row at the foot of every case
 * study.
 *
 * One component on purpose. These were two near-copies that had drifted — 18px
 * versus 16px meta, 24px versus 22.163px titles, equal-width meta columns that
 * wrapped "The Family Table" onto two lines versus natural widths that did not,
 * and Title Case in one place but sentence case in the other. The skeleton,
 * spacing and type are now defined once here.
 *
 * What legitimately differs between the two homes is only the palette, so that
 * is the single prop: the Organised page flips with the theme, while a case
 * study is a printed sheet that stays paper-white in both themes. Everything
 * else is identical by construction.
 */

/** Figma's Work card (456:31673): a 515-wide card over a 360-tall image. */
const IMAGE_RATIO = "515 / 360";
const PAD = 24;
const STACK_GAP = 12;
const META_GAP = 31;

export type CardTone = "page" | "sheet";

const TONES: Record<CardTone, { edge: string; ink: string; muted: string; well: string }> = {
  // Follows the theme via the tokens in index.css.
  page: {
    edge: "var(--edge)",
    ink: "var(--content)",
    muted: "var(--color-muted)",
    well: "var(--color-well)",
  },
  // The case-study sheet does not invert with the desk, so nor does this.
  sheet: { edge: "#e3e5e8", ink: "#18191a", muted: "#626262", well: "#e9ecf0" },
};

function CardBody({ project, tone, src }: { project: Project; tone: CardTone; src?: string }) {
  const t = TONES[tone];
  const wip = project.wip === true;

  return (
    <>
      <div
        className="w-full shrink-0 overflow-hidden"
        style={{ aspectRatio: IMAGE_RATIO, background: t.well }}
      >
        <img
          src={src ?? cardImage(project)}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-cover"
        />
      </div>

      <div className="flex w-full flex-col" style={{ padding: PAD, gap: STACK_GAP }}>
        {/* Natural widths with a gap, not equal columns: at a card's real width
            three fixed thirds force "The Family Table" to wrap and knock the
            row out of alignment with its neighbours. */}
        <div
          className="flex flex-wrap items-baseline uppercase"
          style={{
            color: t.muted,
            columnGap: META_GAP,
            rowGap: 4,
            fontFamily: '"DM Mono", ui-monospace, monospace',
            fontWeight: 500,
            fontSize: 18,
          }}
        >
          <span>{project.name}</span>
          {wip ? <span>Coming soon</span> : project.type ? <span>{project.type}</span> : null}
          {project.year ? <span>{project.year}</span> : null}
        </div>

        {project.title ? (
          // `capitalize` gives the Title Case every Roboto Slab project title
          // uses, without having to re-case the source data in two places.
          <p className="font-slab text-2xl capitalize" style={{ color: t.ink }}>
            {project.title}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function ProjectCard({
  project,
  tone = "page",
  src,
  href,
  onOpen,
}: {
  project: Project;
  tone?: CardTone;
  /** Overrides the default thumbnail. */
  src?: string;
  /** Renders the card as a link. Omit to render it as a button. */
  href?: string;
  /** Receives the card element itself — the overlay grows out of its rect. */
  onOpen?: (el: HTMLElement) => void;
}) {
  const t = TONES[tone];
  const wip = project.wip === true;
  // The border and radius live on the interactive element itself so the whole
  // card is one target, padding included, and the image sits flush to the
  // stroke on every edge it touches.
  const shell = "flex w-full flex-col items-start overflow-hidden text-left";
  const frame = { border: `1px solid ${t.edge}`, borderRadius: 12 } as const;
  const lift =
    "transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transform-none motion-reduce:transition-none";

  if (wip) {
    return (
      <div className={shell} style={frame} aria-label={`${project.name} — coming soon`}>
        <CardBody project={project} tone={tone} src={src} />
      </div>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={`${shell} ${lift}`}
        style={{ ...frame, outlineColor: t.ink }}
        aria-label={`Open ${project.name} case study`}
      >
        <CardBody project={project} tone={tone} src={src} />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => onOpen?.(e.currentTarget)}
      aria-label={`Open ${project.name} case study`}
      className={`${shell} ${lift} cursor-pointer`}
      style={{ ...frame, outlineColor: t.ink }}
    >
      <CardBody project={project} tone={tone} src={src} />
    </button>
  );
}
