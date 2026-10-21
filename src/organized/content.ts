import type { Page } from "./router";

/**
 * Organised-mode copy and data.
 *
 * Everything here is transcribed from the Figma frames rather than invented.
 * Where a frame ships a placeholder (the Archive grid, the writing links) it
 * is marked as such rather than filled with plausible-looking filler.
 */

/* ------------------------------------------------------------------ */
/* Nav                                                                  */
/* ------------------------------------------------------------------ */

/** The sidebar's pages, in order. Each is its own URL (see router.ts). */
export const NAV_PAGES: { page: Page; label: string }[] = [
  { page: "work", label: "Work" },
  { page: "play", label: "Play" },
  { page: "about", label: "About" },
  { page: "cv", label: "CV" },
];

/* ------------------------------------------------------------------ */
/* Intro (Figma 1840:35880)                                             */
/* ------------------------------------------------------------------ */

/**
 * How the portfolio introduces itself, in one place.
 *
 * Used twice, deliberately: it heads the Work section in Organised mode and it
 * is the copy printed on the desk's gradient card in Scattered. Two modes are
 * two ways of showing the same portfolio, so the sentence that says what this
 * is cannot be allowed to differ between them — which it did, the card having
 * been exported with its own wording and a spelling mistake in it.
 */
export const INTRO = {
  greeting: "Hello I am Dvija",
  /** The blue pill after the greeting. */
  role: "Product designer",
  description:
    "Designing products that feel human and effortless to use. Over the past 4+ years, I\u2019ve worked across startups building for 0\u21921 products and setup systems that adapt to evolving user and business needs.",
  /** The card is a fifth the width of the section, so it carries the claim
   *  rather than the whole paragraph. */
  cardAside: "Designing products that feel human and effortless to use.",
};

/* ------------------------------------------------------------------ */
/* About (Figma 456:18891)                                              */
/* ------------------------------------------------------------------ */

export const ABOUT = {
  paragraphs: [
    "I believe in creating meaningful products through the intersection of technology, culture, and human behavior. I explore ideas from research to interactive experiences, always seeking new perspectives that shape the way I see and create.",
    "Beyond design, you’ll usually find me watching films, trying new food, reading and napping.",
  ],
};

/**
 * The four photos under the About copy, captioned "01 / Me" style. Picked
 * from the journal's own pictures; the captions describe what is in each
 * frame, so they change with the photo.
 */
export const ABOUT_PHOTOS: { src: string; caption: string }[] = [
  { src: "/assets/aboutme/Images/Image_1.jpg", caption: "Me" },
  { src: "/assets/aboutme/Images/Image_2.jpg", caption: "At my desk" },
  { src: "/assets/aboutme/Images/Image_3.jpg", caption: "Kayaking" },
  { src: "/assets/aboutme/Images/Image_5.jpg", caption: "Graduation" },
];

/* ------------------------------------------------------------------ */
/* Hero (Figma Homepage 2754:1044)                                      */
/* ------------------------------------------------------------------ */

export const HERO = {
  greeting: "Hi, I’m Dvija,",
  /** Drawn, not set: the script line is Figma's outlined lettering
   *  (`.hero-script`), so this is its accessible text. */
  role: "Product Designer",
  tagline: "I bridge the gap between ambiguity and structured, scalable design.",
};

/* ------------------------------------------------------------------ */
/* Play                                                                 */
/* ------------------------------------------------------------------ */

export type PlayItem = {
  title: string;
  /** "Type · Tool", the line under the title. */
  meta: string;
  src: string;
  /** The art is a line drawing with a dark-theme version. */
  srcDark?: string;
  /** Opens the desk (Scattered mode) instead of being a static tile. */
  playground?: boolean;
  /** A screenshot rather than a drawing: it fills its frame edge to edge
   *  instead of sitting inside it with a margin. */
  bleed?: boolean;
};

/**
 * ⚠️ PLACEHOLDER COPY — the tiles are the desk and its own drawings, so the
 * images are real, but the titles and meta lines are stand-ins written to
 * describe them. Replace with real side projects and explorations as they are
 * ready; the layout takes any number of tiles.
 *
 * The desk screenshots are captures of Scattered mode at 1600 wide, controls
 * cropped off. Re-capture them when the desk changes.
 */
export const PLAY: PlayItem[] = [
  {
    title: "A desk you can play with: the interactive version of this portfolio",
    meta: "Interaction · React",
    src: "/assets/play/desk-light.jpg",
    srcDark: "/assets/play/desk-dark.jpg",
    playground: true,
    bleed: true,
  },
  {
    title: "A keyboard that types along with you",
    meta: "Illustration · Interaction",
    src: "/assets/keyboard_light.svg",
    srcDark: "/assets/keyboard_dark.svg",
  },
  {
    title: "A pencil box with a pencil for every colour",
    meta: "Illustration · Figma",
    src: "/assets/pencilbox_light.svg",
    srcDark: "/assets/pencilbox_dark.svg",
  },
  {
    title: "A journal that opens into the About page",
    meta: "Illustration · Interaction",
    src: "/assets/aboutme_book_open.svg",
  },
];

/* ------------------------------------------------------------------ */
/* CV                                                                   */
/* ------------------------------------------------------------------ */

export const CV = {
  name: "Dvija Patel",
  summary:
    "Product designer based in Cincinnati, with 4+ years across startups building 0→1 products and the systems that let them grow. Master of Design in Human-Centered Technology Design from the University of Cincinnati.",
  contact: [
    { label: "LinkedIn", value: "pateldvija", href: "https://www.linkedin.com/in/pateldvija/" },
    { label: "Github", value: "pateldvija20", href: "https://github.com/pateldvija20" },
    { label: "X", value: "@pateldvija20", href: "https://x.com/pateldvija20" },
  ],
};

/* ------------------------------------------------------------------ */
/* How I See Things (Figma 451:17513)                                   */
/* ------------------------------------------------------------------ */

export type WritingCard = {
  title: string;
  /** Outbound link. The Figma cards carry placeholder copy and no URL yet, so
   *  a card without one renders as a non-interactive tile. */
  href?: string;
  /** One of the three exported mesh gradients. */
  mesh: string;
};

export const WRITING_HEADING = "How I See Things";

export const WRITING_NOTE =
  "Notes on design, process and the things I keep noticing. The first pieces are being written; this section opens when they are worth reading.";

/**
 * ⚠️ PLACEHOLDER, currently unrendered — all three cards carry the same
 * stand-in title and no link, because the writing itself does not exist yet.
 * Drawing them put three identical "How to use icons in interfaces" tiles on
 * the page, which reads as a bug rather than as a section awaiting content,
 * so the section shows `WRITING_NOTE` instead. The three mesh gradients are
 * kept: restoring the grid means replacing the entries, not the layout.
 */
export const WRITING: WritingCard[] = [
  { title: "How to use icons in interfaces", mesh: "/assets/gradient_card_1.svg" },
  { title: "How to use icons in interfaces", mesh: "/assets/gradient_card_2.svg" },
  { title: "How to use icons in interfaces", mesh: "/assets/gradient_card_3.svg" },
];

/* ------------------------------------------------------------------ */
/* Resume (Figma 456:18800)                                             */
/* ------------------------------------------------------------------ */

export const RESUME_PDF = "/Dvija_Patel_Resume.pdf";

/**
 * Four columns: role, company, city, dates.
 *
 * Roles, companies and cities all follow the CV artwork, which is the source
 * of truth where it and the Figma frame disagree.
 */
export const EXPERIENCE: { role: string; company: string; logo?: string; city?: string; dates: string }[] = [
  {
    role: "UX/UI Designer",
    company: "Vidasana Wellness",
    logo: "/assets/logos/vidasana.jpg",
    dates: "Sep ‘26 – Present",
  },
  {
    role: "UX/UI Designer",
    company: "Hi-fi Cincy LLC",
    city: "Cincinnati, OH",
    dates: "Mar ‘26 – Aug ‘26",
  },
  {
    role: "UX Design Researcher",
    company: "The Livewell Collaborative",
    logo: "/assets/logos/livewell.jpg",
    city: "Cincinnati, OH",
    dates: "May ‘25 – Aug ‘25",
  },
  {
    role: "Graphic Designer",
    company: "University of Cincinnati - Graduate college",
    logo: "/assets/logos/uc-grad.jpg",
    city: "Cincinnati, OH",
    dates: "Sep ‘24 – May ‘25",
  },
  {
    role: "Visual Designer",
    company: "Bluelearn.in",
    logo: "/assets/logos/bluelearn.jpg",
    city: "Bangalore, India",
    dates: "Jun ‘22 – Jun ‘23",
  },
];

/** Four columns: school, degree, details, dates.
 *
 * `logo`: each organisation's LinkedIn logo (public/assets/logos). Without
 * one, the row falls back to the initial in an ink square. */
export const EDUCATION = [
  {
    school: "University of Cincinnati",
    logo: "/assets/logos/uc.jpg",
    degree: "Master of Design",
    details: "Human-Centered Technology Design",
    city: "Cincinnati, OH",
    dates: "Sep ‘24 – Apr ‘26",
  },
  {
    school: "Gujarati Technological University",
    logo: "/assets/logos/gtu.jpg",
    degree: "Bachelor of Engineering",
    details: "Computer Engineering",
    city: "Ahmedabad, India",
    dates: "Jun ‘19 – May ‘23",
  },
];

/* ------------------------------------------------------------------ */
/* Archive (Figma 456:31743)                                            */
/* ------------------------------------------------------------------ */

/**
 * What the Archive says while it has no entries. Shown by both routes into
 * it — the Organised section and the Scattered puzzle's overlay — so the two
 * never disagree about what is there.
 */
export const ARCHIVE_NOTE =
  "Side projects, explorations and older work are being sorted through. This section opens once the pieces worth showing are picked.";

/**
 * ⚠️ PLACEHOLDER, currently unrendered — the Archive frame is nine empty cards
 * and the real images, titles and links are still being chosen. Drawing them
 * put nine blank rectangles on the page, so both Archive views show
 * `ARCHIVE_NOTE` instead until there are entries. The heights below are
 * Figma's own alternating rhythm and are what the grid goes back to: replace
 * the array, not the layout.
 */
export const ARCHIVE_COLUMNS: number[][] = [
  [360, 360, 480],
  [480, 360, 360],
  [360, 360, 480],
];
