/**
 * The six case studies that live in the folder, top of the fan to bottom —
 * the order Figma stacks them in `Group 14777` (node 233:7627).
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
  /** Case-study copy. Only the header is authored so far — the body sections
   *  arrive per project, so everything below is optional. */
  type?: string;
  year?: string;
  title?: string;
};

export const PROJECTS: Project[] = [
  {
    slug: "burnout",
    name: "Burnout",
    thumb: "/assets/projects/burnout.png",
  },
  {
    slug: "nearby",
    name: "Nearby",
    thumb: "/assets/projects/nearby.png",
  },
  {
    slug: "billy-and-buddy",
    name: "Billy & Buddy",
    thumb: "/assets/projects/billy-and-buddy.jpg",
  },
  {
    slug: "the-family-table",
    name: "The Family Table",
    thumb: "/assets/projects/the-family-table.jpg",
  },
  {
    slug: "greenera",
    name: "Greenera",
    thumb: "/assets/projects/greenera.jpg",
  },
  {
    slug: "hacksvit",
    name: "HackSVIT",
    thumb: "/assets/projects/hacksvit.png",
  },
];
