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

export type SectionId = "work" | "about" | "resume" | "archive";

export const NAV_SECTIONS: { id: SectionId; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "about", label: "About" },
  { id: "resume", label: "Resume" },
  { id: "archive", label: "Archive" },
];

/* ------------------------------------------------------------------ */
/* About (Figma 456:18891)                                              */
/* ------------------------------------------------------------------ */

export const ABOUT = {
  heading: "Hi, I'm Dvija Patel.",
  paragraphs: [
    "I believe in creating meaningful products through the intersection of technology, culture, and human behavior. I explore ideas from research to interactive experiences, always seeking new perspectives that shape the way I see and create.",
    "Beyond design, you’ll usually find me watching films, trying new food, reading and napping.",
  ],
};

/**
 * The photo deck. Three are visible at a time in the polaroid stack; clicking
 * it deals through all of them. These are the journal's own pictures — the
 * About frame ships empty placeholders, and the brief is to reuse what the
 * book already has.
 */
export const ABOUT_PHOTOS = [
  "/assets/aboutme/Images/Image_1.jpg",
  "/assets/aboutme/Images/Image_2.jpg",
  "/assets/aboutme/Images/Image_3.jpg",
  "/assets/aboutme/Images/Image_4.jpg",
  "/assets/aboutme/Images/Image_5.jpg",
  "/assets/aboutme/Images/Image_6.jpg",
  "/assets/aboutme/Images/Image_7.jpg",
];

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
export const EXPERIENCE = [
  {
    role: "UI/UX Designer",
    company: "Hi-fi Cincy LLC",
    city: "Cincinnati, OH",
    dates: "Mar ‘26 – Present",
  },
  {
    role: "UX Design Researcher",
    company: "The Livewell Collaborative",
    city: "Cincinnati, OH",
    dates: "May ‘25 – Aug ‘25",
  },
  {
    role: "Graphic Designer",
    company: "University of Cincinnati - Graduate college",
    city: "Cincinnati, OH",
    dates: "Sep ‘24 – May ‘25",
  },
  {
    role: "Visual Designer",
    company: "Bluelearn.in",
    city: "Bangalore, India",
    dates: "Jun ‘22 – Jun ‘23",
  },
];

/** Four columns: school, degree, details, dates. */
export const EDUCATION = [
  {
    school: "University of Cincinnati",
    degree: "Master of Design",
    details: "Human-Centered Technology Design",
    city: "Cincinnati, OH",
    dates: "Sep ‘24 – Apr ‘26",
  },
  {
    school: "Gujarati Technological University",
    degree: "Bachelor of Engineering",
    details: "Computer Engineering",
    city: "Ahmedabad, India",
    dates: "Jun ‘19 – May ‘23",
  },
];

export const SOCIALS = [
  { label: "Email", href: "mailto:pateldvija20@gmail.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/pateldvija" },
  { label: "Twitter", href: "https://twitter.com/pateldvija" },
  { label: "Github", href: "https://github.com/pateldvija" },
];

/* ------------------------------------------------------------------ */
/* Archive (Figma 456:31743)                                            */
/* ------------------------------------------------------------------ */

/**
 * ⚠️ PLACEHOLDER — the Archive frame is nine empty cards and the real images,
 * titles and links are still being chosen. The heights below are Figma's own
 * alternating rhythm, kept so the grid reads correctly while it waits for
 * content. Replace the array, not the layout.
 */
export const ARCHIVE_COLUMNS: number[][] = [
  [360, 360, 480],
  [480, 360, 360],
  [360, 360, 480],
];
