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
};

/** The case-study page's sections (the left rail in frame 8). */
export const CASE_SECTIONS = ["Overview", "Problem", "Research", "Design", "Outcome"];

/** Playground pages (frame 17): placeholders until phase 4 fills them. */
export const PLAYGROUND_PAGES = [
  { title: "Illustration", note: "Drawings and visual play", tint: "#2F6B4F" },
  { title: "Experiments", note: "Small projects, still in progress", tint: "#C8553D" },
  { title: "Notes", note: "Thought bits and short writing", tint: "#3D52B8" },
];

/** Tiles for the Playground grid (frame 19). */
export type Piece = { id: string; title: string; kind: "Illustration" | "Experiments" | "Notes"; tags: string[]; /** Width over height of the tile. */ ratio: number; tint: string; /** An interactive piece (shipped as something you can use): shown with a badge, and usable once expanded. */ interactive?: boolean };
const T = ["#F2D6C9", "#D7E3D2", "#D9DCF0", "#F4E3B8", "#E6D3EA", "#CFE4EA", "#F0CFD4", "#DDE5C4"];
const mk = (kind: Piece["kind"], list: [string, string[], number, boolean?][]): Piece[] =>
  list.map(([title, tags, ratio, interactive], i) => ({ id: `${kind}-${i}`.toLowerCase(), title, kind, tags, ratio, tint: T[(i + kind.length) % T.length], interactive }));
/** Placeholder pieces for the masonry (frame 19) until the real ones arrive. */
export const PLAYGROUND_PIECES: Piece[] = [
  ...mk("Illustration", [
    ["Piece one", ["portrait", "bold"], 0.78],
    ["Piece two", ["linework"], 1],
    ["Piece three", ["cover", "colour"], 0.72],
    ["Piece four", ["scene"], 1.3],
    ["Piece five", ["character"], 0.85],
    ["Piece six", ["pattern", "bold"], 1],
  ]),
  ...mk("Experiments", [
    ["Experiment one", ["motion", "play"], 1.15, true],
    ["Experiment two", ["type"], 0.8],
    ["Experiment three", ["3d", "play"], 1, true],
    ["Experiment four", ["interaction"], 0.7, true],
    ["Experiment five", ["shader"], 1.25],
  ]),
  ...mk("Notes", [
    ["Note one", ["thinking"], 0.9],
    ["Note two", ["process", "writing"], 1.1],
    ["Note three", ["craft"], 0.75],
    ["Note four", ["thinking", "design"], 1],
    ["Note five", ["sketch"], 1.2],
  ]),
];

/** About spreads (frame 26): the About content and the résumé. */
export const ABOUT_SPREADS: { title: string; note: string; tint: string; link?: { label: string; href: string } }[] = [
  { title: "About", note: "Who I am and how I work", tint: "#2F55F0" },
  { title: "Résumé", note: "Work, education, and the PDF", tint: "#D9A23A", link: { label: "Download the résumé (PDF)", href: "/Dvija_Patel_Resume.pdf" } },
];

/**
 * The coffee machine's contact links (frame 31). LinkedIn is the one the desk
 * site links to. The email address isn't in the site's code (the old form
 * sent mail server-side), so it's left for Dvija to fill in.
 */
export const CONTACT_LINKS: { label: string; href: string | null }[] = [
  { label: "GitHub", href: "https://github.com/pateldvija20" },
  { label: "X", href: "https://x.com/pateldvija20" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/pateldvija/" },
  // Email opens the form (see ContactLinks); its own address is MAIL_TO.
  { label: "Email", href: null },
  { label: "R\u00e9sum\u00e9", href: "/Dvija_Patel_Resume.pdf" },
];
/** Where "open my mail app" goes (the address the contact API already delivers to). */
/** The coffee-chat booking link (Calendly): not set up yet, so the chat panel shows it as coming soon. */
export const CALENDLY_URL: string | null = null;
export const MAIL_TO = "pateldvija20@gmail.com";
