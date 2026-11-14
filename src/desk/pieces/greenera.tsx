import { useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { PERSONAS } from "./personaArt";
import { Annotated, type Note } from "./Annotated";
import { RelatedProjects } from "./caseStudyBits";
import { Band, ClipRow, DIVIDER, Facts, H3, H4, INK, ITEM_LABEL, MD, MUTED, Marked, NO, P, PrototypeLink, SectionHead, SM, STATEMENT, SURFACE, TITLE, WELL, YES, card, ink, ink2 } from "./caseStudyKit";

/**
 * The Greenera case study, on the Bind Desk model.
 *
 * Order: TL;DR, the solution clips, the problem, insights (the personas, the
 * empathy map, competitors, the product page teardown, the purchase journey and
 * the jobs to be done, each led by its interview insight), then the outcome: the
 * design broken down surface by surface, each part labelled with the reason for it.
 * The work is a concept: designed, not tested, and the page claims no result.
 *
 * The prototype is a separate static build of the v3 Figma screens under
 * `public/greenera/`, linked rather than bundled. The hero and solution clips
 * are recorded from it (`scripts/greenera-video.mjs`). The teardown art is
 * 2x PNG exports from the Greenera Figma file.
 */

const ART = "/assets/projects/greenera";
/** A separate static prototype of the v3 screens, served from `public/greenera/`, so it is linked rather than bundled. */
const PROTOTYPE = "/greenera/index.html";

const META: [string, string][] = [
  ["Timeline", "2025"],
  ["Role", "UI/UX designer"],
  ["Scope", "Application Concept"],
];

/**
 * One clip per step, in the order a shopper meets them, recorded from the
 * prototype with `scripts/greenera-video.mjs`: the clip and one paragraph, the
 * part that says what Greenera does highlighted.
 */
const SOLUTION: { clip: string; label: string; text: string }[] = [
  {
    clip: "score",
    label: "Video: the score card expands to three categories, then the breakdown shows two factors marked Not disclosed",
    text: "Greenera replaces empty sustainability **badges with a clear verdict and Verified Score across Health**, Ecosystem and Supply Chain, with transparent factors and undisclosed data clearly flagged.",
  },
  {
    clip: "pick",
    label: "Video: the better pick on the score card opens Fern's own page, down to its Verified Score",
    text: "Greenera goes beyond scoring by **recommending higher-scoring alternatives with clear price comparisons**.",
  },
  {
    clip: "ingredients",
    label: "Video: Show All opens the ingredient breakdown, scrolled through all fifteen ingredients",
    text: "Greenera **ranks all 15 ingredients by concentration, explains each in simple terms, and flags potential concerns** so shoppers can understand exactly what goes into their products.",
  },
  {
    clip: "certification",
    label: "Video: the certification section, with a claim tagged Brand-reported and three certifications",
    text: "Greenera **distinguishes brand-reported claims from AI-analyzed insights and links certifications to their standards**, helping shoppers know what to trust.",
  },
];

/** The teardown of a live product page, one collage per break. */
const TEARDOWN: { img: string; alt: string; title: string; text: string }[] = [
  {
    img: `${ART}/problem-1.png`,
    alt: "Annotated product page: a search bar, question chips, a leaf badge and a voice assistant icon.",
    title: "Four entry points, no answer",
    text: "A search bar, question chips, a leaf badge and a voice assistant all promise an answer. The badge carries no score, and tapping it leaves the page for a chat window.",
  },
  {
    img: `${ART}/problem-2.png`,
    alt: "Annotated product page: specs, claims and ingredient callouts stacked at equal weight.",
    title: "Everything at the same weight",
    text: "Specs, claims, ingredient callouts and suggested questions look equally important, so nothing tells a shopper which claim to check first.",
  },
  {
    img: `${ART}/problem-3.png`,
    alt: "Annotated buy box: one-time purchase, Subscribe and Save, a low stock warning and a separate refill card.",
    title: "Urgency at the buy box",
    text: "“Only 13 left in stock” pushes for speed, and the refill option sits in a separate card outside the buy box, so it never enters the decision.",
  },
  {
    img: `${ART}/problem-4.png`,
    alt: "Annotated reviews section.",
    title: "Reviews answer a different question",
    text: "Reviews cover smell and streaks, not whether a “safer chemicals” claim holds up.",
  },
];


/**
 * The four interview personas, from the research deck. Each one borrows its face
 * and its two quotes from the persona board (`personaArt.ts`, by index); which
 * quotes belong to which persona is matched on what they say and the gender in
 * the deck.
 */
const PERSONA_CARDS: { title: string; age: number; face: number; quote: number; tint: string; struggle: string; need: string }[] = [
  { title: "The conscious consumer", age: 32, face: 0, quote: 1, tint: "#FFE6B8", struggle: "Conflicting claims about real impact.", need: "Reliable facts to compare products." },
  { title: "The aspiring eco-warrior", age: 24, face: 1, quote: 0, tint: "#FFF4CC", struggle: "A tight budget, few affordable options.", need: "Affordable options that still score well." },
  { title: "The sustainability beginner", age: 24, face: 2, quote: 1, tint: "#EEDDFF", struggle: "Does not know where to start.", need: "Plain explanations and small steps." },
  { title: "The sustainability novice", age: 14, face: 3, quote: 1, tint: "#D9F2D3", struggle: "Skeptical of claims she cannot check.", need: "Simple reasons why a choice matters." },
];

/**
 * The four interviews as one shopper. Says is verbatim from the interviews; the
 * other three are drawn from the personas, the teardown and the journey map.
 */
const EMPATHY: { label: string; items: string[] }[] = [
  {
    label: "Says",
    items: [
      "\u201cI wish someone would just tell me what actually matters.\u201d",
      "\u201cI make my decision based on the front packaging, price and offers.\u201d",
      "\u201cReading ingredient lists feels overwhelming.\u201d",
    ],
  },
  {
    label: "Thinks",
    items: [
      "Which of these claims is actually true?",
      "The sustainable option probably costs more than I can spend.",
      "I do not know enough to judge this myself.",
    ],
  },
  {
    label: "Does",
    items: [
      "Decides on packaging, price and offers when the facts are hard to find.",
      "Leaves the page to search or ask, then often gives up.",
      "Looks a product up only when it is expensive.",
    ],
  },
  {
    label: "Feels",
    items: ["Overwhelmed by jargon and long ingredient lists.", "Skeptical of brands and their green badges.", "Willing to change, but unsure where to start."],
  },
];

/**
 * What a shopper can reach for in 2025 and 2026 when a product makes a claim, from
 * public reporting checked in October 2026. The marketplace badge is the one the
 * teardown pulls apart, so it stays unnamed, as the teardown does.
 */
const COMPETITORS: { name: string; kind: string; strengths: string[]; weaknesses: string[] }[] = [
  {
    name: "Yuka",
    kind: "Scanner app for food and cosmetics",
    strengths: ["Scan a barcode, get a 0 to 100 score.", "Says no brand can pay to change its score."],
    weaknesses: ["Scores health risk only, not sourcing or supply chain.", "Chemists call it alarmist: it rates ingredients without their concentration."],
  },
  {
    name: "EWG Skin Deep",
    kind: "Ingredient hazard database",
    strengths: ["Pairs each hazard score with how much data exists behind it.", "Widely used, including in published research."],
    weaknesses: ["A database to look things up in, not part of the shop.", "Chemists dispute its method, such as low scores where no data exists."],
  },
  {
    name: "Marketplace badges",
    kind: "Sustainability badge on the product page",
    strengths: ["Right at the moment of purchase.", "Tied to third-party certifications."],
    weaknesses: ["A badge, not a score, with nothing to compare.", "A 2025 class action alleged the badges mislead, and many come from the marketplace's own scheme."],
  },
];
const COMPETITOR_GAP =
  "Scanner apps score health but not sourcing; badges show a claim but not its evidence. **Greenera scores health, ecosystem and supply chain together, and marks which claims are verified and which are only reported by the brand.**";
/** Why it matters now: the rule that took effect while this was being designed. */
const COMPETITOR_CONTEXT =
  "Since 27 September 2026, EU rules ban generic claims such as \u201ceco-friendly\u201d unless the brand can prove them.";

/** Job stories, one per persona, each led by the interview insight it answers. */
const JOBS: { who: string; insight: string; evidence: string; story: string }[] = [
  {
    who: "The conscious consumer",
    insight: "Claims are not trusted",
    evidence: "Conflicting and unverified claims leave even the informed shopper unsure which brand to believe.",
    story: "**When** every product on the shelf claims to be green, **I want** to see which claims are verified, **so I can** buy without second-guessing.",
  },
  {
    who: "The aspiring eco-warrior",
    insight: "Price decides by default",
    evidence: "When the facts are hard to find, packaging, price and offers make the choice.",
    story: "**When** I am shopping on a budget, **I want** a cheaper option that still scores well, **so I can** choose sustainably without overspending.",
  },
  {
    who: "The sustainability beginner",
    insight: "Effort is the barrier, not interest",
    evidence: "All four want to live more sustainably. None of them will research every product to do it.",
    story: "**When** I do not understand an ingredient or a claim, **I want** it explained in plain words on the page, **so I can** decide without searching elsewhere.",
  },
  {
    who: "The sustainability novice",
    insight: "Knowledge varies, so the answer must too",
    evidence: "The informed want proof; beginners need plain language and one small step at a time.",
    story: "**When** I am new to all of this, **I want** one clear verdict instead of a wall of facts, **so I can** start making better choices now.",
  },
];

/**
 * The design, broken down one surface at a time: stills taken from the prototype by
 * scripts/greenera-shots.mjs, with a callout beside each part saying why it is there.
 * `ratio` is the still's height over its width; `width` its size in the 1000-unit frame.
 */
const BREAKDOWNS: { title: string; img: string; alt: string; ratio: number; width: number; notes: Note[] }[] = [
  {
    title: "Scan card",
    img: "scan.jpg",
    alt: "The Greenera scan card expanded over the camera: a 60% Verified Score ring, three category tiles, a better pick and the scanned product",
    ratio: 1704 / 786,
    width: 300,
    notes: [
      { title: "Keep the shelf in view", text: "The card covers only the lower half, so the scanned bottle stays in the viewfinder while the shopper reads.", side: "right", y: 0.2, at: [0.62, 0.3] },
      { title: "Lead with one number and its reason", text: "A 60% ring with one line beside it: gentle on sensitive skin, little sourcing data disclosed.", side: "left", y: 0.45, at: [0.05, 0.61] },
      { title: "Say where the score comes from", text: "\u201cAI-Generated\u201d sits right after the title, so shoppers know how the score was made before relying on it.", side: "right", y: 0.5, at: [0.7, 0.589] },
      { title: "Three categories, not one verdict", text: "Health, ecosystem and supply chain each fill to their score, so the weak spot shows without reading a number.", side: "left", y: 0.8, at: [0.04, 0.72] },
      { title: "A better option at the moment of doubt", text: "Fern at 78% for $14.99 sits under Calma's 60% at $19.99, so score and price are weighed together.", side: "right", y: 0.8, at: [0.66, 0.8] },
    ],
  },
  {
    title: "Ingredient breakdown",
    img: "ingredients.png",
    alt: "The Greenera ingredient breakdown: the bottle drawn as coloured bands beside the ingredient list, with Propylene Glycol open",
    ratio: 1704 / 786,
    width: 300,
    notes: [
      { title: "Count before the list", text: "\u201c11 no known concerns, 4 use with care\u201d is both the summary and the key to the colours.", side: "right", y: 0.12, at: [0.8, 0.24] },
      { title: "The open row lights its band", text: "Opening Propylene Glycol lightens its band, tying the row to its place in the formula.", side: "left", y: 0.3, at: [0.06, 0.435] },
      { title: "Plain words, in place", text: "Tapping a row pins it to the top and opens a short explanation right under it, not in a sheet.", side: "right", y: 0.4, at: [0.97, 0.42] },
      { title: "The label as a picture", text: "One band per ingredient in label order: green for no known concerns, yellow for use with care.", side: "left", y: 0.7, at: [0.08, 0.66] },
      { title: "Make it personal", text: "Mark as allergy turns that ingredient orange in every product scanned after it.", side: "right", y: 0.66, at: [0.89, 0.585] },
      { title: "Disclose the source once", text: "One line at the bottom says the summaries are AI-written from published safety data, instead of on every row.", side: "right", y: 0.92, at: [0.96, 0.982] },
    ],
  },
  {
    title: "Score card",
    img: "score.png",
    alt: "The At a Glance card on Calma's product page: the 60% Verified Score with its verdict, three category tiles, See full breakdown and eight claims",
    ratio: 960 / 786,
    width: 360,
    notes: [
      { title: "The method, one tap away", text: "\u201cShow scoring criteria\u201d opens how the score was worked out. A score without its method is just another badge.", side: "right", y: 0.36, at: [0.65, 0.225] },
      { title: "A verdict with both sides", text: "Strong on dermatology testing, lower on undisclosed sourcing: the sentence says what a 60% means.", side: "right", y: 0.06, at: [0.97, 0.15] },
      { title: "Let the fill do the reading", text: "Each tile fills to its percentage in its band's colour, the same three tiles as on the scan card.", side: "left", y: 0.3, at: [0.04, 0.34] },
      { title: "A clear way into the detail", text: "\u201cSee full breakdown\u201d opens every factor; data a brand hasn't published reads Not disclosed, not zero.", side: "right", y: 0.68, at: [0.64, 0.44] },
      { title: "Which claims are checked", text: "Each claim opens a note saying whether the ingredient list proves it or only the brand reports it.", side: "left", y: 0.7, at: [0.06, 0.61] },
    ],
  },
  {
    title: "Price card",
    img: "price.png",
    alt: "The price card on Calma's product page: last price and saving, unit price, scent and size pickers, one-time and subscribe options, quantity, Add to Cart and Buy Now",
    ratio: 1148 / 786,
    width: 340,
    notes: [
      { title: "The saving next to the price", text: "The last price, $23.49, struck through with \u201cSave 15%\u201d: part of the case for the budget shopper.", side: "left", y: 0.08, at: [0.05, 0.05] },
      { title: "Every price per ounce", text: "The main price and both options show cost per fl oz, so sizes compare without arithmetic.", side: "right", y: 0.1, at: [0.4, 0.1] },
      { title: "One choice updates the card", text: "Picking a size changes the price, the unit price, the saving and the description together.", side: "left", y: 0.44, at: [0.27, 0.275] },
      { title: "Options side by side", text: "One-time and Subscribe & Save each show a price and unit price; the coupon is a chip, not fine print.", side: "right", y: 0.48, at: [0.92, 0.42] },
      { title: "Lower the cost of trying", text: "\u201cFree returns\u201d on the one-time option tells a first-time buyer they can send it back.", side: "left", y: 0.8, at: [0.07, 0.48] },
      { title: "Logistics folded away", text: "Shipping, seller, delivery and returns open under \u201cSee more details\u201d, keeping At a Glance close.", side: "right", y: 0.88, at: [0.66, 0.945] },
    ],
  },
  {
    title: "Certification",
    img: "certification.png",
    alt: "The certification section on Calma's product page: a lavender AI analysis with a brand-reported claim, and three Cradle to Cradle certificates",
    ratio: 1262 / 786,
    width: 340,
    notes: [
      { title: "AI writing has its own colour", text: "The analysis sits on lavender, the colour of every AI-written summary in the app.", side: "left", y: 0.1, at: [0.05, 0.13] },
      { title: "Name what is missing", text: "It ends on what Calma hasn't published: packaging, animal welfare and sourcing. Silence would read as a pass.", side: "right", y: 0.14, at: [0.93, 0.205] },
      { title: "The certificate, not a badge", text: "Each one names its scheme, what it covers, its certificate number and its level.", side: "left", y: 0.44, at: [0.04, 0.4] },
      { title: "Brand claims kept apart", text: "\u201c97% naturally derived\u201d is the brand's own figure, so it is marked Brand-reported.", side: "right", y: 0.48, at: [0.9, 0.297] },
      { title: "Link to the standard", text: "\u201cView certification standard\u201d opens what the certifier requires, for shoppers who want to check.", side: "left", y: 0.78, at: [0.05, 0.53] },
    ],
  },
];

type Stage = { stage: string; contacts: string[]; action: string; pain: string; focus?: boolean };
/** The six-stage purchase journey from the Figma journey table, cut to the three main contact points and one short line per cell. */
const JOURNEY: Stage[] = [
  { stage: "Discovery", contacts: ["Social media", "Ads", "Search"], action: "Deciding what to buy and whom to trust.", pain: "Channel noise buries genuine claims." },
  { stage: "Browsing", contacts: ["Brand sites", "Marketplaces", "Search results"], action: "Comparing familiar brands.", pain: "Price and discounts outweigh sustainability." },
  { stage: "Product research", contacts: ["Product pages", "Reviews", "Comparison sites"], action: "Evaluating one product in depth.", pain: "Jargon and unverifiable claims send shoppers elsewhere.", focus: true },
  { stage: "Purchase", contacts: ["Cart", "Checkout", "Payment"], action: "Paying and choosing delivery.", pain: "No sense of the delivery's carbon footprint." },
  { stage: "Logistics", contacts: ["Tracking", "Courier updates"], action: "Waiting on delivery.", pain: "No guidance on use or disposal." },
  { stage: "After sale", contacts: ["Returns", "Support", "Review prompts"], action: "Using, reviewing or returning.", pain: "Support never mentions sustainability." },
];

/* ------------------------------ parts ------------------------------ */

/**
 * One slide at a time, as the Billy & Buddy service carousel is: the slides
 * scroll sideways with snapping, the current one at full strength and the next
 * peeking in faded, with dots and previous / next buttons under them.
 */
function Carousel({ label, noun, names, children }: { label: string; noun: string; names: string[]; children: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const slides = () => Array.from(track.current?.children ?? []) as HTMLElement[];
  const go = (i: number) => {
    const el = track.current;
    const slide = slides()[Math.max(0, Math.min(names.length - 1, i))];
    if (el && slide) el.scrollTo({ left: slide.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth * 0.3;
    const i = slides().findIndex((c) => c.offsetLeft + c.offsetWidth > mid);
    if (i >= 0 && i !== at) setAt(i);
  };
  return (
    <div data-ui="Carousel" data-src="src/pieces/greenera.tsx › Carousel">
      <div
        ref={track}
        onScroll={onScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        className="no-scrollbar relative flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {children.map((slide, i) => (
          <div
            key={names[i]}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${names.length}: ${names[i]}`}
            className="shrink-0 snap-start"
            style={{ width: "min(88%, 720px)", opacity: i === at ? 1 : 0.55, transition: "opacity 300ms ease" }}
          >
            {slide}
          </div>
        ))}
        <span aria-hidden className="w-px shrink-0" />
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-1.5" role="tablist" aria-label={`${noun}s`}>
          {names.map((n, i) => (
            <button key={n} type="button" role="tab" aria-selected={i === at} aria-label={`${i + 1}: ${n}`} onClick={() => go(i)} className="grid h-6 cursor-pointer place-items-center">
              <span className="block h-1.5 rounded-full" style={{ width: i === at ? 22 : 6, background: i === at ? INK : MUTED, opacity: i === at ? 1 : 0.5, transition: "width 250ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms" }} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              aria-label={d < 0 ? `Previous ${noun}` : `Next ${noun}`}
              disabled={d < 0 ? at === 0 : at === names.length - 1}
              onClick={() => go(at + d)}
              className="grid size-10 cursor-pointer place-items-center rounded-full transition-opacity duration-150 active:scale-[0.97] disabled:cursor-default disabled:opacity-30"
              style={{ boxShadow: `0 0 0 1px ${DIVIDER}`, color: INK }}
            >
              <svg width={16} height={16} viewBox="0 0 18 18" style={{ transform: d < 0 ? "scaleX(-1)" : undefined }} aria-hidden>
                <path d="M6 3 L12 9 L6 15" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A slide's card: the picture on the left, its words on the right; stacked on a phone, picture first. */
const SLIDE = "flex h-full flex-col gap-6 rounded-[16px] p-5 md:flex-row md:items-center md:gap-8 md:p-6";
const slideStyle = { border: `1px solid ${DIVIDER}`, background: WELL };

/** The teardown, one break per slide: the collage, then what broke. */
function Teardown() {
  return (
    <Carousel label="The product page teardown, one break at a time" noun="break" names={TEARDOWN.map((t) => t.title)}>
      {TEARDOWN.map((t) => (
        <article key={t.title} className={SLIDE} style={slideStyle}>
          <img src={t.img} alt={t.alt} decoding="async" className="block aspect-square w-full rounded-[12px] object-cover md:w-[48%] md:shrink-0" />
          <div className="min-w-0">
            <h4 className={`m-0 ${STATEMENT}`} style={ink}>
              {t.title}
            </h4>
            <p className={`m-0 mt-3 ${MD}`} style={ink2}>
              {t.text}
            </p>
          </div>
        </article>
      ))}
    </Carousel>
  );
}

/**
 * The four interviews as personas, laid out as the in-depth interviews row was:
 * one centred column each: the face on its persona's colour, the archetype and
 * age, then what they struggle with and what they need. The line that sums up
 * what they said rises above the face as a speech bubble on hover, focus or tap.
 * Archetypes, never names. On a phone the columns stack.
 */
function Personas() {
  const [said, setSaid] = useState(-1);
  return (
    <ul data-ui="Personas" data-src="src/pieces/greenera.tsx › Personas" className="m-0 grid list-none gap-10 p-0 text-center md:grid-cols-4 md:gap-5">
      {PERSONA_CARDS.map((p, i) => {
        const face = PERSONAS[p.face];
        const open = said === i;
        return (
          <li key={p.title} className="flex flex-col items-center">
            <button
              type="button"
              aria-describedby={`persona-quote-${i}`}
              aria-expanded={open}
              onMouseEnter={() => setSaid(i)}
              onMouseLeave={() => setSaid(-1)}
              onFocus={() => setSaid(i)}
              onBlur={() => setSaid(-1)}
              onClick={() => setSaid(open ? -1 : i)}
              className="relative block cursor-default rounded-full border-0 bg-transparent p-0"
            >
              <span className="flex size-24 items-center justify-center overflow-hidden rounded-full transition-transform duration-200 ease-out" style={{ background: p.tint, transform: open ? "scale(1.04)" : undefined }}>
                <svg role="img" aria-label={face.aria} viewBox={face.viewBox} fill="none" className="block h-[74%] w-auto" dangerouslySetInnerHTML={{ __html: face.svg }} />
              </span>
              {/* The quote, as a speech bubble whose tail points at the face */}
              <span
                id={`persona-quote-${i}`}
                role="tooltip"
                className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 w-[200px] rounded-[12px] px-4 py-3 ${SM} transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none`}
                style={{
                  ...ink,
                  background: SURFACE,
                  boxShadow: `0 0 0 1px ${DIVIDER}, 0 8px 24px rgba(0,0,0,0.25)`,
                  opacity: open ? 1 : 0,
                  transform: `translateX(-50%) translateY(${open ? 0 : 4}px) scale(${open ? 1 : 0.97})`,
                  transformOrigin: "50% 100%",
                }}
              >
                &ldquo;{face.pills[p.quote].text}&rdquo;
                <span aria-hidden className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ background: SURFACE, boxShadow: `1px 1px 0 0 ${DIVIDER}` }} />
              </span>
            </button>
            <span aria-hidden className="block h-6 w-px" style={{ borderLeft: `1px dashed ${DIVIDER}` }} />
            <p className={`m-0 ${H4}`} style={ink}>
              {p.title.replace(/^The /, "").replace(/^./, (c) => c.toUpperCase())}
            </p>
            <p className="m-0 mt-1 uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
              Age {p.age}
            </p>
            <dl className="m-0 mt-4 w-full space-y-3 pt-4" style={{ borderTop: `1px dashed ${DIVIDER}` }}>
              {(
                [
                  ["Struggles", p.struggle],
                  ["Needs", p.need],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
                    {k}
                  </dt>
                  <dd className={`m-0 mt-1 ${SM}`} style={ink2}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The empathy map: the four interviews combined into one shopper, one row per
 * quadrant, as FLOW lays it out. The quadrant's word sits large and faint on the
 * left, its three notes in three columns beside it, rows split by a dashed rule. On a phone the word
 * shrinks to a label above its notes.
 */
function EmpathyMap() {
  return (
    <div data-ui="Empathy map" data-src="src/pieces/greenera.tsx › EmpathyMap">
      {EMPATHY.map((q, i) => (
        <section key={q.label} className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:gap-8" style={i ? { borderTop: `1px dashed ${DIVIDER}` } : undefined}>
          <h4 className="m-0 shrink-0 text-[15px] font-medium uppercase tracking-[0.04em] md:w-[30%] md:text-[56px] md:normal-case md:leading-none md:tracking-[-1px]" style={{ color: MUTED, opacity: 0.6 }}>
            {q.label}
          </h4>
          <ul className="m-0 grid min-w-0 flex-1 list-none gap-3 p-0 sm:grid-cols-3">
            {q.items.map((it) => (
              <li key={it} className={`rounded-[10px] px-4 py-3 ${SM}`} style={{ ...card, background: WELL, color: q.label === "Says" ? INK : MUTED }}>
                {it}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Where Greenera sits, then the three options a shopper has today. */
function Competitors() {
  return (
    <div data-ui="Competitive analysis" data-src="src/pieces/greenera.tsx › Competitors">
      <p className={`m-0 max-w-3xl ${MD}`} style={ink2}>
        <Marked text={COMPETITOR_GAP} />
      </p>
      <p className={`m-0 mt-3 max-w-3xl ${SM}`} style={ink2}>
        {COMPETITOR_CONTEXT}
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {COMPETITORS.map((c) => (
          <section key={c.name} className="rounded-[12px] p-6" style={card}>
            <p className={`m-0 ${H4}`} style={ink}>
              {c.name}
            </p>
            <p className={`m-0 mt-1 ${SM}`} style={ink2}>
              {c.kind}
            </p>
            {(
              [
                ["Strengths", c.strengths, YES],
                ["Weaknesses", c.weaknesses, NO],
              ] as const
            ).map(([k, list, tone]) => (
              <div key={k} className="mt-5">
                <p className="m-0 uppercase" style={{ ...ITEM_LABEL, color: tone }}>
                  {k}
                </p>
                <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
                  {list.map((it) => (
                    <li key={it} className={SM} style={ink2}>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/** Four job stories, one per persona, numbered and joined by a dashed line as FLOW draws them. Each card opens with the insight behind it. */
function Jobs() {
  return (
    <ol data-ui="Job stories" data-src="src/pieces/greenera.tsx › Jobs" className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
      {JOBS.map((j, i) => (
        <li key={j.who} className="flex flex-col items-center">
          <span className={`grid size-12 place-items-center rounded-[10px] ${SM}`} style={{ border: `1px dashed ${DIVIDER}`, color: INK }}>
            {i + 1}
          </span>
          <span aria-hidden className="block h-6 w-px" style={{ borderLeft: `1px dashed ${DIVIDER}` }} />
          <div className="flex w-full flex-1 flex-col rounded-[12px] p-6" style={{ ...card, background: WELL }}>
            <p className={`m-0 ${H4}`} style={ink}>
              {j.insight}
            </p>
            <p className={`m-0 mt-2 ${SM}`} style={ink2}>
              {j.evidence}
            </p>
            <span aria-hidden className="my-5 block h-px w-full" style={{ borderTop: `1px dashed ${DIVIDER}` }} />
            <p className={`m-0 flex-1 ${SM}`} style={ink2}>
              <Marked text={j.story} />
            </p>
            <p className="m-0 mt-4 uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
              {j.who}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The purchase journey, rebuilt from the Figma table in the page's own surfaces:
 * six stages across, contact points, actions and pain points down, the stage
 * Greenera works in tinted. On a phone each stage is a card, swiped one at a time.
 */
function JourneyMap() {
  const rows: [string, (s: Stage) => ReactNode][] = [
    ["Contact points", (s) => s.contacts.join(", ")],
    ["User actions", (s) => s.action],
    ["Pain points", (s) => s.pain],
  ];
  // The stage Greenera works in: one raised grey column. A fill only, since a stroke
  // drawn on every cell doubled up wherever two cells met.
  const hot = (s: Stage) => (s.focus ? { background: SURFACE } : undefined);
  return (
    <div data-ui="Journey map" data-src="src/pieces/greenera.tsx › JourneyMap" className="[overflow-wrap:break-word]">
      {/* Desktop: the table */}
      <div className="hidden md:block">
        <div className="flex">
          <div className="w-[13%] shrink-0" />
          {JOURNEY.map((s) => (
            <div key={s.stage} className="min-w-0 flex-1 rounded-t-[12px] px-3 pb-3 pt-4" style={hot(s)}>
              <p className={`m-0 ${H4}`} style={ink}>
                {s.stage}
              </p>
              {s.focus ? (
                <p className="m-0 mt-1 uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
                  Greenera
                </p>
              ) : null}
            </div>
          ))}
        </div>
        {rows.map(([label, cell], r) => (
          <div key={label} className="flex">
            <p className="m-0 w-[13%] shrink-0 pr-3 pt-4 uppercase" style={{ ...ITEM_LABEL, color: MUTED, borderTop: `1px solid ${DIVIDER}` }}>
              {label}
            </p>
            {JOURNEY.map((s) => (
              <div
                key={s.stage}
                className={`min-w-0 flex-1 px-3 py-4 text-[13px] leading-[18px] ${r === rows.length - 1 ? "rounded-b-[12px]" : ""}`}
                style={{ borderTop: `1px solid ${DIVIDER}`, color: label === "Pain points" ? INK : MUTED, ...hot(s) }}
              >
                {cell(s)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Phone: one stage card at a time, swiped sideways, with the carousel's dots and buttons */}
      <div className="md:hidden">
        <Carousel label="The purchase journey, stage by stage" noun="stage" names={JOURNEY.map((s) => s.stage)}>
          {JOURNEY.map((s) => (
            <div key={s.stage} className="h-full rounded-[12px] p-5" style={{ ...card, ...hot(s) }}>
              <p className={`m-0 ${H4}`} style={ink}>
                {s.stage}
                {s.focus ? <span className="ml-2 uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>Greenera</span> : null}
              </p>
              {rows.map(([label, cell]) => (
                <div key={label} className="mt-3">
                  <p className="m-0 uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
                    {label}
                  </p>
                  <div className={`mt-1 ${SM}`} style={{ color: label === "Pain points" ? INK : MUTED }}>
                    {cell(s)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  );
}

/* ------------------------------ sections ------------------------------ */

const INTRO = (
  <div>
    <h1 className={`max-w-3xl ${TITLE}`}>An app for conscious, informed shopping</h1>
    <Facts items={META} />
    <div className="mt-8">
      <PrototypeLink href={PROTOTYPE}>Open the prototype</PrototypeLink>
    </div>
  </div>
);

export const GREENERA_SECTIONS: CaseStudySection[] = [
  { id: "intro", title: "Intro", children: INTRO },
  {
    id: "tldr",
    title: "TL;DR",
    hideTitle: true,
    children: (
      <Band label="TL;DR">
        <p className={H3} style={ink}>
          Greenera is a mobile app that scans products, provides a verified sustainability score, and helps consumers distinguish brand claims from independently verified facts.
        </p>
        <P className="mt-4">
          Shoppers want safer, more sustainable products but struggle to separate real impact from marketing claims. With unverified badges and green promises everywhere, making conscious choices becomes a guessing game. Greenera turns confusion into confidence.
        </P>
      </Band>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div>
        <div className="space-y-20 pt-4">
          {SOLUTION.map((s) => (
            <ClipRow key={s.clip} clip={`${ART}/clips/${s.clip}`} label={s.label} text={s.text} ratio="1 / 1" />
          ))}
        </div>
        <div className="mt-16">
          <PrototypeLink href={PROTOTYPE} outline>
            Open the prototype
          </PrototypeLink>
        </div>
      </div>
    ),
  },
  {
    id: "problem",
    title: "Problem",
    hideTitle: true,
    children: (
      <Band label="Problem">
        <p className={H3} style={ink2}>
          <Marked text="Product pages **overwhelm shoppers with sustainability claims** but offer little clarity on **what to trust**. Verifying them takes time and effort, pushing even conscious consumers to rely on **packaging, price and promotions** instead of informed choices." />
        </p>
      </Band>
    ),
  },
  {
    id: "insights",
    title: "Insights",
    children: (
      <div className="space-y-16">
        <div>
          <div className="mb-8 flex items-end justify-between gap-4">
            <h3 className={`m-0 ${STATEMENT}`}>Personas</h3>
            <p className={`m-0 text-right ${SM}`} style={ink2}>
              11 questions
              <br />4 participants
            </p>
          </div>
          <Personas />
        </div>
        <div>
          <SectionHead title="Empathy map" />
          <EmpathyMap />
        </div>
        <div>
          <SectionHead title="Competitive analysis" />
          <Competitors />
        </div>
        <div>
          <SectionHead title="Product page teardown" />
          <Teardown />
        </div>
        <div>
          <SectionHead title="Journey map" />
          <p className={`mb-8 ${SM}`} style={ink2}>
            <Marked text="Discovery and browsing raise the trust questions, and **product research is where shoppers try and fail to answer them**. Search sends people to the product page, and checkout only confirms what they already decided, so the product page is where Greenera works." />
          </p>
          <JourneyMap />
        </div>
        <div>
          <SectionHead title="Jobs to be done" />
          <Jobs />
        </div>
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome",
    children: (
      <div className="space-y-24">
        {BREAKDOWNS.map((b) => (
          <div key={b.title}>
            <SectionHead title={b.title} />
            <Annotated src={`${ART}/breakdown/${b.img}`} alt={b.alt} ratio={b.ratio} width={b.width} notes={b.notes} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["bind-desk", "billy-and-buddy"]} />,
  },
];
