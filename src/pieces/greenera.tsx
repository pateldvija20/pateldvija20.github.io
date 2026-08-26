import type { CaseStudySection } from "./CaseStudy";
import { PersonaBoard } from "./PersonaBoard";
import {
  DefinitionGrid,
  DIVIDER,
  Figure,
  IconRow,
  ImageCard,
  Label,
  RelatedProjects,
  SectionBody,
  SectionLead,
} from "./caseStudyBits";

/**
 * The Greenera case study, authored as CaseStudy sections.
 *
 * Two sources, and they disagree in a specific, resolvable way. The skeleton —
 * section order, the tinted image cards, the layout numbers — comes from the
 * Greenera Figma file (`Container` 8:235), whose body runs TL;DR → Brief →
 * Challenge → Solution → The Problem → Initial Findings → Goal → Outcome. Its
 * sidebar still lists the *old* order and omits Challenge, so the body wins
 * and the rail here mirrors it. The copy comes from the v2 edit sheet, which
 * the file has only partly absorbed (Outcome is still lorem ipsum there), so
 * the sheet wins on every line of text.
 *
 * The sheet also asks for five beats the file has no frames for yet — the
 * metadata and scope blocks, Why a Score, The Business Case, and Before /
 * After — built here in the page's existing language. Why a Score and The
 * Business Case run text-only: both call for tight crops (the original leaf
 * badge; the Certification card's Brand-reported / AI-analyzed tags) that
 * aren't exported yet. Before / After is text-only for the same reason —
 * pair 3 has no "before" collage of its own, and reusing pair 2's would be
 * worse than none.
 *
 * Art is committed under `public/assets/projects/greenera/` as 2x PNG
 * exports from the Figma file: the hero lineup (8:258), the three Solution
 * cards (8:290 / 8:295 / 8:300), the four Problem collages (8:310 / 322 /
 * 343 / 352) and the Outcome lineup (8:567). The tints are baked into those
 * exports — they are the image frame's own fill, not a wrapper here.
 *
 * The purchase journey matrix (Initial Findings) was originally hand-built
 * out of divs so its data stayed editable, but that meant maintaining a
 * second copy of the same six-stage table already drawn in the Figma file.
 * It now renders as `journey-table.png`, a clean export of that table — the
 * same trade the Family Table case study makes for its own journey map.
 */

const ART = "/assets/projects/greenera";

/** Timeline / role / methods / tools, stated before any prose. */
const META: [string, string][] = [
  ["Timeline", "2025"],
  ["Role", "End-to-end UI/UX designer (solo)"],
  ["Methods", "Product teardown, user interviews, journey mapping, hi-fi prototyping"],
  ["Tools", "Figma, FigJam"],
];

/** What was actually researched, what was actually designed, and how far it
 *  got — the honest stand-in for the shipped metrics this project has none of. */
const SCOPE: [string, string][] = [
  [
    "Research",
    "Teardown of a live product page, four user interviews, and a six-stage purchase journey map, synthesized into four problem statements and four design goals.",
  ],
  [
    "Design",
    "High-fidelity screens for the scan entry point, the At a Glance score, the ingredient breakdown, and the claim verification split. Built solo, end to end.",
  ],
  [
    "Status",
    "Concept project. Designed and ready to test, not yet validated with users. The Outcome section says exactly what would prove it.",
  ],
];

/** Two parallel sentences per row: one naming the cost, one naming the fix. */
const BEFORE_AFTER: [string, string][] = [
  [
    "Four separate trust signals, none of them scored, and the badge exits the page.",
    "One Verified Score at the top of the page, broken into three named categories.",
  ],
  [
    "Ingredient names with no explanation, so understanding them means leaving the page.",
    "Fifteen ingredients by concentration, each with a one-sentence explanation in place.",
  ],
  [
    "Brand claims and third-party certifications look identical, so neither can be checked.",
    "Each claim tagged Brand-reported or AI-analyzed, with the source attached.",
  ],
];

function BeforeAfter() {
  return (
    <div className="flex flex-col">
      {BEFORE_AFTER.map(([before, after], i) => (
        <div
          key={before}
          className="grid gap-[60px]"
          style={{
            gridTemplateColumns: "1fr 1fr",
            paddingBlock: 32,
            borderTop: `1px solid ${DIVIDER}`,
            borderBottom: i === BEFORE_AFTER.length - 1 ? `1px solid ${DIVIDER}` : "none",
          }}
        >
          <div className="flex flex-col gap-[12px]">
            <Label>Before</Label>
            <SectionBody>{before}</SectionBody>
          </div>
          <div className="flex flex-col gap-[12px]">
            <Label>After</Label>
            <SectionLead>{after}</SectionLead>
          </div>
        </div>
      ))}
    </div>
  );
}

/** `Extended Content Block` 8:288 — three even cards, 60 apart. */
const SOLUTION = [
  {
    img: `${ART}/solution-score.png`,
    alt: "At a Glance card with the Verified Score, split three ways",
    header: "One score, not five scattered signals.",
    body: "The page leads with a single Verified Score, split into Human Health, Sourcing Impact, and Supply Chain. Shoppers see what to check first instead of guessing.",
  },
  {
    img: `${ART}/solution-ingredients.png`,
    alt: "Ingredient breakdown, sorted by concentration",
    header: "Plain-language ingredients, no detour required.",
    body: "Fifteen ingredients, sorted by concentration, each explained in one sentence, on the page. No jump to Alexa or a separate chat window.",
  },
  {
    img: `${ART}/solution-certification.png`,
    alt: "Certification card tagging each claim Brand-reported or AI-analyzed",
    header: "Brand claims and verified data, kept visibly apart.",
    body: "Every claim is tagged Brand-reported or AI-analyzed. Shoppers know which one to trust, and why.",
  },
] as const;

/** `Text Content Block` 8:308 — four teardown collages, 60 apart. */
const PROBLEM = [
  {
    img: `${ART}/problem-1.png`,
    alt: "Annotated product page — search bar, question chips, leaf badge and Alexa icon",
    header: "Every entry point promises a different kind of truth, so none of them earn trust.",
    body: "Search bar, question chips, a leaf badge, an Alexa icon. Four paths to the same answer. The badge carries no score or certification behind it, and tapping it exits the page into a chat window.",
  },
  {
    img: `${ART}/problem-2.png`,
    alt: "Annotated product page — specs, claims and callouts stacked at equal weight",
    header: "More information isn't more trust, it's more to verify.",
    body: "Specs, claims, ingredient callouts, and suggested questions all carry the same visual weight. A shopper scanning for five minutes still can't tell which claim to check first.",
  },
  {
    img: `${ART}/problem-3.png`,
    alt: "Annotated buy box — Subscribe & Save, stock urgency and a separate eco-refill card",
    header: "The purchase moment optimizes for urgency, not the habit it claims to support.",
    body: 'One-time purchase and Subscribe & Save look identical, so neither points toward the lower-waste option. "Only 13 left in stock" pushes for speed instead. Refill and impact info sit in a separate card, outside the buy box, so it never enters the decision.',
  },
  {
    img: `${ART}/problem-4.png`,
    alt: "Annotated reviews section",
    header: "Reviews tell you if it worked, not whether the claims are true.",
    body: 'Reviews cover smell and streaks, not whether a "safer chemicals" claim holds up. The page hands shoppers a pile of claims and expects them to verify it alone.',
  },
] as const;

export const GREENERA_SECTIONS: CaseStudySection[] = [
  {
    id: "intro",
    title: "Intro",
    children: null,
  },
  {
    // Sits directly under the header, before any prose, and carries no
    // eyebrow of its own — it reads as part of the title block.
    id: "meta",
    title: "Details",
    hideTitle: true,
    inRail: false,
    children: <DefinitionGrid items={META} bordered />,
  },
  {
    id: "tldr",
    title: "TL;DR",
    children: (
      <div className="flex flex-col gap-[40px]">
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
            trust. Product pages stack specs, badges, and marketing claims at
            the same visual weight, so five minutes of reading leaves you no
            closer to knowing what matters.
          </SectionLead>
          <SectionBody>
            Greenera turns that into one moment. Scan a product, get a Verified
            Score split into Human Health, Sourcing Impact, and Supply Chain,
            with plain-language ingredient breakdowns underneath. Where a claim
            can't be verified yet, the score says so instead of rounding up.
          </SectionBody>
        </div>
        <DefinitionGrid items={SCOPE} muted />
      </div>
    ),
  },
  {
    id: "brief",
    title: "Brief",
    children: (
      <SectionLead>
        Design an e-commerce experience that makes health- and
        environment-conscious buying decisions simple and transparent.
      </SectionLead>
    ),
  },
  {
    id: "challenge",
    title: "Challenge",
    children: (
      <SectionLead>
        How might a product page make sustainability claims verifiable at a
        glance, instead of handing shoppers a pile of claims and expecting them
        to check it alone?
      </SectionLead>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div className="flex flex-col gap-[60px]">
        <SectionBody>Three screens carry the idea. Here's what each one does.</SectionBody>
        {SOLUTION.map((block) => (
          <ImageCard key={block.header} {...block} columns="1fr 1fr" gap={40} radius={12} />
        ))}
      </div>
    ),
  },
  {
    id: "problem",
    title: "The Problem",
    children: (
      <div className="flex flex-col gap-[60px]">
        <SectionBody>
          I pulled apart a live product page for a cleaning product and walked
          it the way a shopper would. Four things broke.
        </SectionBody>
        {PROBLEM.map((block) => (
          <ImageCard
            key={block.header}
            {...block}
            columns="481fr 431fr"
            gap={60}
            radius={17.438}
          />
        ))}
      </div>
    ),
  },
  {
    // Answers the question an interviewer asks before they finish scrolling:
    // why a score, and not one more badge.
    id: "why-a-score",
    title: "Why a Score",
    children: (
      <div className="flex flex-col gap-[24px]">
        <SectionLead>The teardown ruled out the badge before I drew anything.</SectionLead>
        <SectionBody>
          The failure on the live page wasn't a missing signal. It was an
          unbacked one: a leaf icon with no score, no certification, and no
          comparison behind it. Adding another badge repeats the problem. A
          score has to show its parts, so the parts became the design. Three
          named categories, each traceable to a source.
        </SectionBody>
      </div>
    ),
  },
  {
    id: "initial-findings",
    title: "Initial Findings",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[20px]">
          <SectionLead>But why fix the product page and not search, or checkout?</SectionLead>
          <SectionBody>
            Because that's where the decision gets made. Mapping six stages,
            from first discovery to after-sale, showed browsing and product
            research carrying every trust question. Search sends people to the
            page. Checkout only confirms what they already decided.
          </SectionBody>
        </div>
        <div className="flex flex-col gap-[20px]">
          <SectionLead>
            People aren't unwilling to check. The checking is just too
            expensive.
          </SectionLead>
          <SectionBody>
            Four interviews, across a range of interest in sustainability.
            Nobody rejected sustainable products. They rejected the effort of
            verifying them.
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
          <SectionLead>The trust questions all cluster in one place.</SectionLead>
          <SectionBody>
            Six stages, mapped with contact points, user actions, and pain
            points at each. Discovery and browsing raise the questions. Product
            research is where shoppers try and fail to answer them. That's the
            stage worth designing for.
          </SectionBody>
        </div>
        <Figure
          src={`${ART}/journey-table.png`}
          ratio={String(1944 / 1017)}
          radius={12}
          alt="Six-stage purchase journey matrix — contact points, user actions, and pain points for Discovery, Browsing, Product Research, Purchase, Logistics, and After-Sale Services, with Product Research highlighted"
        />
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
          body="Jargon pushes people off the page to ask Alexa or search elsewhere, which builds no trust."
        />
        <IconRow
          glyph="✅"
          header="Make claims verifiable, not just visible."
          body="Trust currently rests on reviews and influencer content, neither of which can confirm a company's claim."
        />
        <IconRow
          glyph="♻️"
          header="Put the sustainable option in the path of the purchase decision."
          body="Refill and impact info sit outside the buy box, so urgency wins by default. This is the one goal I didn't get to. See Reflection."
        />
      </div>
    ),
  },
  {
    // The section that separates UI work from product work: who this is worth
    // money to, and where the money and the score pull against each other.
    id: "business-case",
    title: "The Business Case",
    children: (
      <div className="flex flex-col gap-[40px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>Transparency only differentiates if it's checkable.</SectionLead>
          <SectionBody>
            Brands already compete on sustainability claims. The teardown shows
            what that competition currently looks like, which is a leaf badge
            with nothing behind it. A brand with real data has no way to look
            different from a brand with a marketing line. Greenera gives the
            honest one a surface where the difference is visible.
          </SectionBody>
        </div>
        <div className="flex flex-col gap-[24px]">
          <SectionLead>The revenue model and the score pull against each other.</SectionLead>
          <SectionBody>
            If brands pay to be scored, the thing judging them has a reason to
            be generous. I designed against that before I had a name for it.
            Every claim is tagged Brand-reported or AI-analyzed, and undisclosed
            categories stay undisclosed instead of rounding up. The label is the
            safeguard. Whether it holds under commercial pressure is an open
            question, and it's the first thing I'd stress-test with a real
            brand.
          </SectionBody>
        </div>
      </div>
    ),
  },
  {
    id: "before-after",
    title: "Before / After",
    children: <BeforeAfter />,
  },
  {
    id: "outcome",
    title: "Outcome",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>Three of four goals designed, none validated yet.</SectionLead>
          <SectionBody>
            The scan entry point, the At a Glance score, the ingredient
            breakdown, and the claim verification split all exist as
            high-fidelity screens. The fourth goal, putting the sustainable
            option inside the purchase decision, didn't make this pass.
          </SectionBody>
        </div>
        <Figure
          src={`${ART}/outcome-lineup.png`}
          ratio="972 / 600"
          radius={12}
          alt="The four Greenera screens: camera scan, product page, ingredient breakdown, verified score breakdown"
        />
        <div className="flex flex-col gap-[24px]">
          <SectionLead>What would prove it.</SectionLead>
          <SectionBody>
            The bet is that a single scored hierarchy changes what shoppers
            check first. Testing it means putting the original page and this one
            in front of the same people and watching where they look, in what
            order, and how long before they give up. Until then it's a design
            bet, not a result.
          </SectionBody>
        </div>
      </div>
    ),
  },
  {
    id: "reflection",
    title: "Reflection",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[40px]">
          <Label>What I'd carry into the next project</Label>
          <IconRow
            glyph="🗺️"
            header="Map the journey before touching a screen."
            body="Interviews told me people wanted help. The journey map told me where to put it. Without that step I'd have redesigned search, which raises the question but never answers it."
          />
          <IconRow
            glyph="❓"
            header="An unverifiable claim needs its own state, not a zero."
            body={
              <>
                Categories with no disclosed data currently read as 0%, the same
                as a genuine failure. That quietly undercuts the whole promise
                of the score. It needs a distinct "Not disclosed" treatment.
              </>
            }
          />
          <IconRow
            glyph="⚖️"
            header="One number, one source of truth."
            body="The At a Glance card and the Verified Score breakdown show different sub-scores for the same product. Two screens, two answers, which is exactly the problem I set out to fix."
          />
          <IconRow
            glyph="🔤"
            header="I never tested a simpler format against this one."
            body="A single letter grade would be faster to read and easier to remember than three categories. I didn't prototype one, so I can't claim the score wins. That comparison is the first thing I'd run."
          />
        </div>
        <div className="flex flex-col gap-[40px]">
          <Label>What I'd do differently now with AI</Label>
          <IconRow
            glyph="🧪"
            header="Pressure-test the score with real data first."
            body="I designed the score with clean sample values. I'd now generate a spread of messy cases — missing fields, partial disclosures, conflicting certifications — and run them through the layout before calling it done."
          />
          <IconRow
            glyph="⏱️"
            header="Synthesize interviews faster, spend the time on the map."
            body="Four transcripts took longer to code than the journey map that came out of them. I'd cluster them with AI and put the saved hours into more journey stages and more teardowns."
          />
        </div>
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["the-family-table", "hacksvit"]} />,
  },
];
