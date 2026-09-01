/**
 * The six case studies, in display order: published work first, then the two
 * that are still coming. This is the order the Work grid and the folder's fan
 * both read, so a visitor meets real case studies before placeholders.
 *
 * `thumb` files are committed under `public/assets/projects/`, downloaded from
 * the Figma fills rather than linked: the MCP asset URLs expire after ~7 days.
 */
export type Project = {
  /** Stable id, also the thumbnail's filename stem. */
  slug: string;
  /** Shown in the tab pill on the sheet. */
  name: string;
  thumb: string;
  /** Case study not published yet: clicking says "coming soon" instead of
   *  opening, and the card shows the shared Coming Soon art. */
  wip?: boolean;
  /** Case-study copy. Only the header is authored so far — the body sections
   *  arrive per project, so everything below is optional. */
  type?: string;
  year?: string;
  title?: string;
  /** Full-width art shown above the header (Figma `Project Main Image`). */
  hero?: string;
  /**
   * The hero's own height/width, when the art is not the template's default
   * 16:9. Greenera's `Project Main Image` is 1212x600, so cropping it to 16:9
   * would scale it up and clip the outer two phones off the lineup.
   */
  heroAspect?: number;
};

export const PROJECTS: Project[] = [
  {
    slug: "billy-and-buddy",
    name: "Billy & Buddy",
    thumb: "/assets/projects/billy-and-buddy/game-hero.jpg",
    type: "Service Design",
    title: "A mini game that teaches kids to tell a need from a want, in two minutes",
    hero: "/assets/projects/billy-and-buddy/game-hero.jpg",
    // The game captures are 1400x909, not the template's 16:9 — cropping them
    // taller cuts the scoreboard off the top of every screen.
    heroAspect: 909 / 1400,
  },
  {
    slug: "the-family-table",
    name: "The Family Table",
    thumb: "/assets/projects/the-family-table/hero.png",
    type: "UI/UX Design",
    year: "2025",
    title: "A weekly family meal everyone wants to be part of",
    hero: "/assets/projects/the-family-table/hero.png",
  },
  {
    slug: "greenera",
    name: "Greenera",
    thumb: "/assets/projects/greenera.jpg",
    type: "UI/UX Design",
    year: "2025",
    title: "A Product Page That Tells You Which Sustainability Claims To Trust",
    hero: "/assets/projects/greenera/hero-lineup.png",
    heroAspect: 600 / 1212,
  },
  {
    slug: "hacksvit",
    name: "HackSVIT",
    thumb: "/assets/projects/hacksvit.png",
    type: "Brand Design",
    year: "2022",
    title: "Designing Visual Identity for Hackathons",
    hero: "/assets/projects/hacksvit/hero.png",
  },
  {
    slug: "burnout",
    name: "Burnout",
    thumb: "/assets/projects/coming-soon.png",
    wip: true,
  },
  {
    slug: "nearby",
    name: "Nearby",
    thumb: "/assets/projects/coming-soon.png",
    wip: true,
  },
];

/**
 * The image a project shows on its folder sheet and on the card that pulls
 * out of it. This is deliberately the case study's own hero when there is one:
 * the expanded page collapses back into that card, so if the two carried
 * different pictures the shrink ended on a cut. Projects without a hero yet
 * fall back to their standalone thumbnail.
 */
export const cardImage = (p: Project) => p.hero ?? p.thumb;
