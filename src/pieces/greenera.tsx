import { useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { PROJECTS } from "./projects";
import { PersonaBoard } from "./PersonaBoard";

/**
 * The Greenera case study, authored as CaseStudy sections.
 *
 * Skeleton, section order and layout numbers come from the portfolio Figma
 * file (`Container` 67:12759 — the body order there is TL;DR → Solution →
 * Brief → Initial Findings → The Problem → Goal → Outcome, which is the
 * order the rail follows here too). The final copy for the Problem bodies,
 * Solution blocks, Initial Findings leads, Outcome and the whole Reflection
 * section comes from the client's edit sheet, which supersedes the file
 * where the two disagree.
 *
 * Art is committed under `public/assets/projects/greenera/` as 2x PNG
 * exports: the four Problem collages (`Desktop 1–4` 67:12907/19/40/49),
 * the persona quote board (67:12831), and the four hi-fi screens from the
 * Greenera file (746:4576, 746:4028, 746:4804, 746:4470).
 */

const ART = "/assets/projects/greenera";

/** Matches the standard body size used across the case studies. */
const BODY_FONT = 22.163;
const BODY_TRACK = 0.2216;
const MUTED = "#7c838b";
const INK = "#18191a";
const DIVIDER = "#e3e5e8";
const MONO = "'DM Mono', monospace";

function SectionLead({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-medium"
      style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}
    >
      {children}
    </p>
  );
}

function SectionBody({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: BODY_FONT,
        letterSpacing: BODY_TRACK,
        lineHeight: "normal",
        color: MUTED,
      }}
    >
      {children}
    </p>
  );
}

function Figure({
  src,
  ratio,
  radius = 12,
  className = "",
  style,
  alt = "",
}: {
  src: string;
  ratio?: string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, borderRadius: radius, background: "#e9ecf0", ...style }}
    >
      {ok ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setOk(false)}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[#e9ecf0]" style={{ borderRadius: radius }} />
      )}
    </div>
  );
}

/**
 * The 162x162 rounded tile the Goal and Reflection rows lead with. The
 * Figma file ships these as empty #ccdeff squares; they carry an emoji for
 * now until real icons are drawn.
 */
function IconTile({ glyph }: { glyph: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 162,
        height: 162,
        background: "#ccdeff",
        border: `0.727px solid ${DIVIDER}`,
        borderRadius: 17.438,
        fontSize: 64,
        lineHeight: 1,
      }}
    >
      {glyph}
    </div>
  );
}

/** One [icon | header + body] row, shared by Goal and Reflection. */
function IconRow({
  glyph,
  header,
  body,
}: {
  glyph: string;
  header: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-[40px]">
      <IconTile glyph={glyph} />
      <div
        className="flex min-w-0 flex-1 flex-col gap-[12px]"
        style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}
      >
        <p className="w-full">{header}</p>
        <p className="w-full" style={{ color: MUTED }}>
          {body}
        </p>
      </div>
    </div>
  );
}

/** The six-stage purchase journey matrix, `Purchase Journey Section Block` 67:12839. */
const JOURNEY_STAGES = [
  "Discovery",
  "Browsing",
  "Product Research",
  "Purchase",
  "Logistics",
  "After-Sale Services",
] as const;

const JOURNEY: { label: string; cells: string[][] }[] = [
  {
    label: "Contact Points",
    cells: [
      [
        "Social media",
        "Brand campaigns",
        "Blogs & Reviews",
        "AI - recs",
        "Marketplace recommendations",
        "Search",
        "Ads",
        "Supermarket Aisles",
      ],
      ["Brand websites", "Ecommerce marketplaces", "Search results", "Recommendation feeds"],
      ["Product pages", "Reviews", "Comparison sites", "Product specifications"],
      ["Shopping cart", "Checkout", "Payment gateway"],
      ["Shipment tracking", "Courier updates"],
      ["Returns portal", "Customer support", "Loyalty & review prompts"],
    ],
  },
  {
    label: "User Actions",
    cells: [
      ["Deciding what to buy and which brand to trust"],
      ["Comparing a shortlist of familiar brands"],
      ["Evaluating one product in depth before buying"],
      ["Finalizing cart, payment, and delivery choice"],
      ["Tracking the order and waiting on delivery"],
      ["Using the product, leaving feedback, or requesting a return"],
    ],
  },
  {
    label: "User Pain-point",
    cells: [
      ["Too much channel noise before trust has a chance to form, so genuine claims get scrolled past"],
      ["Multiple brands compete for attention, and price and discounts pull judgment away from sustainability"],
      ["Dense jargon and unverifiable claims force users to leave the app to research elsewhere, which builds no trust"],
      ["No sense of the delivery's carbon footprint."],
      ["No guidance on proper use, disposal, or take-back"],
      ["Support is generic: refunds, reviews, customer service, nothing tied to sustainability"],
    ],
  },
];

const JOURNEY_CELL = 12.333;

function JourneyTable() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: "#fdfeff",
        border: `1px solid ${DIVIDER}`,
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        className="relative flex flex-col"
        style={{ gap: 31.861, maxWidth: 955.833, marginInline: "auto" }}
      >
        {/* The #dee6fa band behind the Product Research column — the design's
            way of saying this is the stage the project lives in. It spans the
            full column height, row gaps included (67:12841). */}
        <div
          aria-hidden
          className="absolute bottom-0 top-0"
          style={{
            left: "calc(71.944px + (100% - 71.944px - 5 * 20.556px) * 3 / 6 + 20.556px * 3 - 10px)",
            width: "calc((100% - 71.944px - 5 * 20.556px) / 6 + 20px)",
            background: "#dee6fa",
            borderRadius: 12.333,
          }}
        />
        {/* Stage header row. */}
        <div className="relative flex items-end" style={{ gap: 20.556 }}>
          <div style={{ width: 71.944, flexShrink: 0 }}>
            <p
              className="font-medium"
              style={{ fontSize: JOURNEY_CELL, letterSpacing: 0.1233, color: INK, paddingBottom: 12.333 }}
            >
              Stage
            </p>
          </div>
          {JOURNEY_STAGES.map((stage, i) => (
            <div key={stage} className="min-w-0 flex-1">
              <p
                className="font-medium"
                style={{
                  fontSize: JOURNEY_CELL,
                  letterSpacing: 0.1233,
                  color: INK,
                  whiteSpace: "nowrap",
                  paddingBottom: 12.333,
                  borderBottom: `2.056px solid ${i === 2 ? "#0059ff" : INK}`,
                }}
              >
                {stage}
              </p>
            </div>
          ))}
        </div>
        {/* Content rows. */}
        {JOURNEY.map((row) => (
          <div key={row.label} className="relative flex items-start" style={{ gap: 20.556 }}>
            <div style={{ width: 71.944, flexShrink: 0 }}>
              <p
                className="font-medium"
                style={{ fontSize: JOURNEY_CELL, letterSpacing: 0.1233, color: INK, paddingBlock: 10.447 }}
              >
                {row.label}
              </p>
            </div>
            {row.cells.map((cell, i) => (
              <div key={i} className="min-w-0 flex-1">
                {cell.length > 1 ? (
                  <ul
                    className="list-disc pl-[18.5px]"
                    style={{
                      fontSize: JOURNEY_CELL,
                      letterSpacing: 0.1233,
                      color: "#545558",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {cell.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    style={{
                      fontSize: JOURNEY_CELL,
                      letterSpacing: 0.1233,
                      color: "#545558",
                      padding: 4.111,
                    }}
                  >
                    {cell[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Two related-project cards — the projects stacked before and after
 *  Greenera in the folder fan (`Related Projects Block` 67:12992). */
function RelatedProjects() {
  const related = ["the-family-table", "hacksvit"]
    .map((slug) => PROJECTS.find((p) => p.slug === slug))
    .filter((p) => p !== undefined);
  return (
    <div className="grid grid-cols-2 gap-[40px]">
      {related.map((p) => (
        <a key={p.slug} href={`#${p.slug}`} className="flex flex-col gap-[12px]">
          <Figure src={p.hero ?? p.thumb} ratio="466 / 360" radius={12} alt={p.name} />
          <div
            className="flex items-start gap-[31px] uppercase"
            style={{
              color: MUTED,
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 16,
            }}
          >
            <span>{p.name}</span>
            {p.type ? <span>{p.type}</span> : null}
            {p.year ? <span>{p.year}</span> : null}
          </div>
          {p.title ? (
            <p className="font-medium" style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK }}>
              {p.title}
            </p>
          ) : null}
        </a>
      ))}
    </div>
  );
}

export const GREENERA_SECTIONS: CaseStudySection[] = [
  {
    id: "intro",
    title: "Intro",
    children: null,
  },
  {
    id: "tldr",
    title: "TL;DR",
    children: (
      <div
        className="flex flex-col"
        style={{
          gap: 22.163,
          padding: 22.163,
          borderRadius: 11.082,
          border: `0.923px solid ${DIVIDER}`,
        }}
      >
        <SectionLead>
          Shoppers who want to buy sustainably can't tell which claims to
          trust. Product pages stack specs, sustainability badges, and
          marketing claims with no hierarchy, so a five-minute read leaves a
          shopper no closer to knowing what actually matters.
        </SectionLead>
        <SectionBody>
          Greenera turns that into one moment: scan a product and get a
          Verified Score, broken into Human Health, Sourcing Impact, and Supply
          Chain, with plain-language ingredient breakdowns underneath. Where a
          claim can't be verified yet, like an independent supply-chain audit,
          the score says so instead of rounding up.
        </SectionBody>
      </div>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div className="flex flex-col gap-[60px]">
        {(
          [
            {
              img: `${ART}/at-a-glance.png`,
              alt: "At a Glance card with the Verified Score",
              header: "One score, not five scattered signals.",
              body: "The product page leads with a single Verified Score, split into Human Health, Ecosystem Impact, and Supply Chain. Shoppers see what to check first instead of guessing.",
            },
            {
              img: `${ART}/ingredients.png`,
              alt: "Ingredient breakdown screen",
              header: "Plain-language ingredients, no detour required.",
              body: "Fifteen ingredients, sorted by concentration, each explained in one sentence, right on the page. No jump to Alexa or a separate chat window.",
            },
            {
              img: `${ART}/certification.png`,
              alt: "Certification card splitting brand-reported and AI-analyzed claims",
              header: "Brand claims and verified data, kept visibly separate.",
              body: "The Certification card tags every claim Brand-reported or AI-analyzed. Shoppers know exactly which one to trust, and why.",
            },
          ] as const
        ).map((block) => (
          <div key={block.header} className="grid gap-[40px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Figure src={block.img} ratio="1 / 1" radius={12} alt={block.alt} />
            <div className="flex flex-col gap-[12px]">
              <SectionLead>{block.header}</SectionLead>
              <SectionBody>{block.body}</SectionBody>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "brief",
    title: "Brief",
    children: (
      <SectionLead>
        Design an e-commerce experience that promotes informed, health- and
        environmentally conscious purchasing decisions through simple and
        transparent shopping.
      </SectionLead>
    ),
  },
  {
    id: "initial-findings",
    title: "Initial Findings",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[20px]">
          <SectionLead>User interview</SectionLead>
          <SectionBody>
            Four interviews, mixed levels of interest in sustainability, to
            understand why sustainable shopping feels hard.
          </SectionBody>
        </div>
        {/* The interactive persona board — React port of the user's
            persona-hero.html: autoplay cycle, hover wiggle + quote pills,
            draggable faces. Bordered like the Figma Personas Container. */}
        <div
          className="overflow-hidden"
          style={{ background: "#fdfeff", border: `1px solid ${DIVIDER}`, borderRadius: 12 }}
        >
          <PersonaBoard />
        </div>
        <div className="flex flex-col gap-[20px]">
          <SectionLead>End-to-end purchase journey</SectionLead>
          <SectionBody>
            Mapping my own shopping habits and friends' across six stages,
            discovery to after-sale, surfaced where purchase decisions actually
            happen. That's the part of the journey worth designing for.
          </SectionBody>
        </div>
        <JourneyTable />
      </div>
    ),
  },
  {
    id: "problem",
    title: "The Problem",
    children: (
      <div className="flex flex-col gap-[60px]">
        {(
          [
            {
              img: `${ART}/problem-1.png`,
              alt: "Annotated Amazon product page — search bar, chips, leaf badge and Alexa icon",
              header: "Every entry point promises a different kind of truth, so none of them build user trust.",
              body: "Search bar, question chips, a leaf badge, an Alexa icon: four separate paths to the same answer. The badge carries no score or certification behind it, and tapping it exits the page entirely into a chat window.",
            },
            {
              img: `${ART}/problem-2.png`,
              alt: "Annotated product page — specs, claims and callouts stacked with equal weight",
              header: "More information isn't more trust, it's more to verify.",
              body: "Specs, claims, ingredient callouts, and suggested questions all carry the same visual weight. A shopper scanning for five minutes still can't tell which claim to check first.",
            },
            {
              img: `${ART}/problem-3.png`,
              alt: "Annotated buy box — Subscribe & Save, stock urgency and a separate eco-refill card",
              header: "The purchase moment optimizes for urgency, not the habit it claims to support.",
              body: 'One-time purchase and Subscribe & Save look identical, so neither points toward the lower-waste option. "Only 13 left in stock" pushes for speed instead. Refill and environmental-impact info sit in a separate card, outside the buy box, so it never enters the decision.',
            },
            {
              img: `${ART}/problem-4.png`,
              alt: "Annotated reviews section",
              header: "Reviews tell you if it worked, not if the claims are true.",
              body: 'Reviews cover experience, smell, streaks, not whether a "safer chemicals" claim actually holds up. The page hands shoppers a pile of claims and expects them to verify it alone.',
            },
          ] as const
        ).map((block) => (
          <div key={block.header} className="grid items-start gap-[60px]" style={{ gridTemplateColumns: "481fr 431fr" }}>
            <Figure src={block.img} ratio="1 / 1" radius={17.438} alt={block.alt} />
            <div className="flex flex-col gap-[24px]">
              <SectionLead>{block.header}</SectionLead>
              <SectionBody>{block.body}</SectionBody>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "goal",
    title: "Goal",
    children: (
      <div className="flex flex-col gap-[40px]">
        <IconRow
          glyph="🪜"
          header="Give the page one visible hierarchy."
          body="Specs, badges, and callouts carry equal weight, so nothing tells the shopper what to check first."
        />
        <IconRow
          glyph="💬"
          header="Explain claims in plain language, in place."
          body="Jargon pushes users to leave the page and ask Alexa or search elsewhere, which builds no trust."
        />
        <IconRow
          glyph="✅"
          header="Make claims verifiable, not just visible."
          body="Trust rests on reviews and influencer content, neither of which can confirm a company's claim."
        />
        <IconRow
          glyph="♻️"
          header="Put the sustainable option in the path of the purchase decision."
          body="Right now refill and environmental impact info sit outside the buy box, so urgency wins by default."
        />
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>Three of four goals shipped as high-fidelity screens.</SectionLead>
          <SectionBody>
            The camera scan, At a Glance score, ingredient breakdown, and
            claim-verification split are designed and ready to test. Goal 4,
            sustainable options inside the purchase decision, didn't make this
            pass. See Reflection.
          </SectionBody>
        </div>
        <Figure src={`${ART}/product-page.png`} ratio="972 / 600" radius={12} alt="The full Greenera product page design" />
      </div>
    ),
  },
  {
    id: "reflection",
    title: "Reflection",
    children: (
      <div className="flex flex-col gap-[40px]">
        <IconRow
          glyph="⚖️"
          header="The score doesn't match itself."
          body="The At a Glance card and the Verified Score Breakdown screen show different sub-scores for the same product. One needs to be the source of truth."
        />
        <IconRow
          glyph="❓"
          header="0% means two different things right now."
          body='Unrated categories like Energy Mix and Packaging Circularity show 0%, same as a genuine fail. That undercuts the promise that unverified claims get flagged instead of rounded up. Needs a distinct "Not disclosed" state.'
        />
        <IconRow
          glyph="🚧"
          header="Goal 4 never got a screen."
          body="Refill and environmental-impact info still live outside the buy box. With more time, I'd design that into the purchase moment directly, next to Subscribe & Save, instead of deferring it."
        />
        <SectionBody>
          Next step: usability test the At a Glance hierarchy against the
          original layout. Right now it's a design bet, not a validated one.
        </SectionBody>
      </div>
    ),
  },
  {
    id: "related",
    title: "Related projects",
    inRail: false,
    children: <RelatedProjects />,
  },
];
