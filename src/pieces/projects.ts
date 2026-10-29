/**
 * The seven case studies, in display order: published work first, then the two
 * that are still coming, so a visitor meets real case studies before
 * placeholders. The Work grid reads this top to bottom. The folder does not
 * use it directly — its fan stacks back to front, so it puts the coming-soon
 * sheets behind the published ones (`FOLDER_PROJECTS` in FileFolder).
 *
 * `thumb` files are committed under `public/assets/projects/`, downloaded from
 * the Figma fills rather than linked: the MCP asset URLs expire after ~7 days.
 */
import type { ComponentType } from "react";
import { HeroVideo } from "./HeroVideo";
import { heroLoop } from "./caseStudyKit";

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
  /**
   * A silent loop shown wherever `hero` is (Work tile, related cards, the case
   * study's own hero), as a path stem with `.webm` and `.mp4` beside it. Its
   * first frame is `hero`, so the still stays the poster, the folder sheet and
   * the morph image.
   */
  heroVideo?: string;
  /**
   * An animated hero drawn in code, shown in place of `hero`/`heroVideo` on the
   * Work tile and the case study's own hero. It fills its box and draws its own
   * backdrop gap, so `heroClip` and `heroMax`'s art box do not apply to it.
   */
  heroLoop?: ComponentType<{ className?: string }>;
  /**
   * A flat colour behind the hero art, the same in light and dark.
   */
  heroBg?: string;
  /** A line under the case study's footer, after the rights line. */
  footnote?: string;
  /**
   * A `clip-path` that trims the hero art to the part worth showing, so the
   * colour behind it (`heroBg`) replaces the art's own backdrop without the art
   * itself being tinted.
   */
  heroClip?: string;
  /**
   * `compact` swaps CaseStudy's own chrome (section labels, meta row, section
   * gap, an 800px reading column) for the tighter scale taken from
   * madhurima.me/work/loan-servicing. Other projects keep the Figma rhythm.
   */
  scale?: "compact";
  /** Cap the case study's hero at this share of the viewport height, so the page
   *  body always starts visibly below it. */
  heroMax?: number;
};

export const PROJECTS: Project[] = [
  {
    slug: "bind-desk",
    name: "Bind Desk",
    thumb: "/assets/projects/bind-desk/peek.jpg",
    type: "B2B Insurance SaaS",
    year: "2026",
    title: "Redesigning Bind Desk for faster, safer binding",
    footnote: "Company, people and data in this case study are fictional.",
    // A sneak peek, shaped like the Work tile (1800x1170 at source): the
    // product window on a tinted backdrop, cropped off the bottom edge.
    hero: "/assets/projects/bind-desk/peek.jpg",
    heroVideo: "/assets/projects/bind-desk/peek",
    heroAspect: 936 / 1440,
    heroBg: "#FFF3DA",
    heroLoop: HeroVideo,
    scale: "compact",
    heroMax: 0.6,
    // The product window inside the 1440x936 clip, with its corner radius.
    heroClip: "inset(9.3% 7.78% 9.4% 7.78% round 1% / 1.6%)",
  },
  {
    slug: "billy-and-buddy",
    name: "Billy & Buddy",
    thumb: "/assets/projects/billy-and-buddy/game-hero.jpg",
    type: "Making Financial Education",
    year: "2024",
    title: "Basket of Choices, a shopping game for kids",
    footnote: "Billy & Buddy is a proposed service; the game is a working prototype, not yet tested with children.",
    hero: "/assets/projects/billy-and-buddy/hero/loop.jpg",
    heroVideo: "/assets/projects/billy-and-buddy/hero/loop",
    // The game window on the game's own teal wash, as Bind Desk's hero does.
    heroAspect: 936 / 1440,
    heroBg: "#CEF0EF",
    heroLoop: heroLoop("/assets/projects/billy-and-buddy/hero/loop", 1200 / 779, { tab: "Basket of Choices", url: "billyandbuddy.example/play" }),
    scale: "compact",
    heroMax: 0.6,
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
