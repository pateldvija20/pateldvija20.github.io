import type { Case } from "../routes";

/**
 * What the books hold, for the phase 1 skeleton: enough to make every page
 * reachable. The real spreads and case-study pages come in phases 3 to 5,
 * from the case-study content already in src/desk/pieces/.
 */

/** One Work spread per case study. Names, types, years and lines from src/desk/pieces/projects.ts. */
/** `tint`: the spread's main colour, for its page dot (the reference's coloured dots). */
export const CASE_INFO: Record<Case, { name: string; kind?: string; year?: string; line?: string; image: string; tint: string }> = {
  "bind-desk": {
    name: "Bind Desk",
    kind: "B2B Insurance SaaS",
    year: "2026",
    line: "Redesigning Bind Desk for faster, safer binding",
    image: "/assets/projects/bind-desk/peek.jpg",
    tint: "#D9D4C7",
  },
  "billy-and-buddy": {
    name: "Billy & Buddy",
    kind: "Making Financial Education",
    year: "2024",
    line: "Basket of Choices, a shopping game for kids",
    image: "/assets/projects/billy-and-buddy/game-hero.jpg",
    tint: "#58B6D6",
  },
  greenera: {
    name: "Greenera",
    kind: "E-Commerce",
    year: "2025",
    line: "An app for conscious, informed shopping",
    image: "/assets/projects/greenera.jpg",
    tint: "#1E9EAD",
  },
  "the-family-table": {
    name: "The Family Table",
    image: "/assets/projects/the-family-table/hero.png",
    tint: "#3E6B45",
  },
};

/** The case-study page's sections (the left rail in frame 8). */
export const CASE_SECTIONS = ["Overview", "Problem", "Research", "Design", "Outcome"];

/** Playground pages (frame 17): placeholders until phase 4 fills them. */
export const PLAYGROUND_PAGES = [
  { title: "Illustration", note: "Drawings and visual play", tint: "#2F6B4F" },
  { title: "Experiments", note: "Small projects, still in progress", tint: "#C8553D" },
  { title: "Thought pieces", note: "Short writing", tint: "#3D52B8" },
  { title: "Process sketches", note: "From the case studies", tint: "#C9962E" },
];

/** Tiles for the Playground grid (frame 19). */
export const PLAYGROUND_PIECES = Array.from({ length: 9 }, (_, i) => ({ title: `Piece ${i + 1}` }));

/** About spreads (frame 26): the About content and the résumé. */
export const ABOUT_SPREADS: { title: string; note: string; tint: string; link?: { label: string; href: string } }[] = [
  { title: "About", note: "Who I am and how I work", tint: "#2F55F0" },
  { title: "Experience", note: "Work history", tint: "#E0644F" },
  { title: "Résumé", note: "Education, skills, and the PDF", tint: "#D9A23A", link: { label: "Download the résumé (PDF)", href: "/Dvija_Patel_Resume.pdf" } },
];

/**
 * The coffee machine's contact links (frame 31). LinkedIn is the one the desk
 * site links to. The email address isn't in the site's code (the old form
 * sent mail server-side), so it's left for Dvija to fill in.
 */
export const CONTACT_LINKS: { label: string; href: string | null }[] = [
  { label: "Email", href: null },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/pateldvija/" },
];
