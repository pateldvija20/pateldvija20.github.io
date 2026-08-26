import type { CaseStudySection } from "./CaseStudy";
import {
  BODY_FONT,
  BODY_TRACK,
  Caption,
  ClaimList,
  DefinitionGrid,
  DIVIDER,
  Figure,
  FigureRow,
  Label,
  MUTED,
  PullQuote,
  RelatedProjects,
  SectionBody,
  SectionLead,
} from "./caseStudyBits";

/**
 * The Family Table case study — a ten-hour timed concept for HeyNouri.
 *
 * Same skeleton as Greenera: the `CaseStudy` template's rail plus body
 * column, a metadata strip under the header, and eyebrow'd sections whose
 * headings are claims rather than categories. The section order is the one
 * the copy itself sets out — brief, problem, insight, decision, design,
 * campaign, trade-offs, validation, reflection — which is the argument in
 * order, so the rail follows it.
 *
 * The Figma node the brief pointed at (`Container` 173:2836 in the HeyNouri
 * file) is an untouched duplicate of Greenera's case-study frame — same node
 * sizes, still Greenera's copy and art in every block. So it fixes the
 * skeleton and nothing else; all copy comes from the supplied case-study
 * document, and the art comes out of the submission deck (`Section 1`
 * 176:5145, nine 1920x1080 slides).
 *
 * Art under `public/assets/projects/the-family-table/`: `hero.png` and
 * `journey-map.png` are clean high-res exports supplied directly (replacing
 * an early cut that used the submission deck's own slide-one render and a
 * heavily-compressed journey map pulled out of the case-study document); the
 * rest of the section images still come from that document at their
 * delivered sizes. Every figure is given its own aspect rather than a shared
 * crop — the journey map is 2.58:1 and the recipe card is 0.5:1, and
 * cropping either to a common box loses the thing it is there to show.
 */

const ART = "/assets/projects/the-family-table";

/** Each image's real aspect, so nothing gets cropped. */
const JOURNEY_MAP = { src: `${ART}/journey-map.png`, aspect: 3440 / 1334 };
const DISCOVERY = { src: `${ART}/discovery.jpg`, aspect: 1700 / 1149 };
const COOK_MODE = { src: `${ART}/cook-mode.jpg`, aspect: 1500 / 731 };
const RECIPE_CARD = { src: `${ART}/recipe-card.jpg`, aspect: 796 / 1608 };
const GROCERY_RUN = { src: `${ART}/grocery-run.jpg`, aspect: 1700 / 840 };
const JOURNAL = { src: `${ART}/journal.jpg`, aspect: 1700 / 1140 };
const CAMPAIGN = { src: `${ART}/campaign.jpg`, aspect: 1100 / 1379 };

/** Role / timeline / type / tools, stated before any prose. */
const META: [string, string][] = [
  ["Role", "Solo designer. Research framing, UX, UI, art direction."],
  ["Timeline", "10 hours, timed challenge"],
  ["Type", "Concept feature. Designed, not built or user-tested."],
  ["Tools", "Figma"],
];

/** Who the feature is for, and the two assumptions it rests on. */
const FRAMING: [string, string][] = [
  [
    "Who it is for",
    "Primary: kids and teens roughly 8 to 16 who want a real job, not a chore. Secondary: the parent carrying the whole meal alone.",
  ],
  [
    "What I assumed",
    "Supervised phone access for kids. Parents keep veto power over nutrition and budget. Both assumptions are stated because both are load bearing.",
  ],
  [
    "Why it matters",
    "The habit a parent actually wants is confidence around food. That transfers through doing, and the product currently gives kids nothing to do.",
  ],
];

const TRADE_OFFS: [string, string][] = [
  [
    "Cook Mode assumes a kid is unsupervised, and I have not proven the guide is good enough for that.",
    "The character needs to call out hot pans and sharp knives clearly enough for a parent to trust it. Untested.",
  ],
  [
    "Roles are offered, not enforced.",
    "Nothing stops a parent doing all five stages anyway. Making participation the default rather than the invitation is unresolved.",
  ],
  [
    "No user research and no testing inside the window.",
    "The journey map is reasoned from the brief. Both the child pain points and the age range are assumptions I would want to check.",
  ],
  [
    "Nutrition on the card face is a bet.",
    "Surfacing calories at the moment of choosing helps a parent. Whether that is the right thing to put in front of a twelve year old every night is a question I would want a specialist on.",
  ],
];

const SIGNALS: [string, string][] = [
  [
    "Grocery additions from more than one family member, after the list already felt done.",
    "The cleanest proof that the list stopped belonging to one person.",
  ],
  [
    "Cook Mode sessions started from a kid's profile, not a parent's.",
    "Started, and finished. A session a parent takes over halfway is a failed session.",
  ],
  [
    "Whether the stages that ask most of a kid hold up without an adult stepping in.",
    "Run Cook Mode start to finish with a real 8 to 16 year old and a parent watching but not helping.",
  ],
];

/** One of the four design moments: claim, copy, then its own art. */
function Moment({
  header,
  paragraphs,
  figures,
  caption,
}: {
  header: string;
  paragraphs: string[];
  figures: { src: string; alt: string; aspect: number }[];
  caption?: string;
}) {
  return (
    <div className="flex flex-col gap-[24px]">
      <SectionLead>{header}</SectionLead>
      {paragraphs.map((p) => (
        <SectionBody key={p}>{p}</SectionBody>
      ))}
      <FigureRow items={figures} />
      {caption ? <Caption>{caption}</Caption> : null}
    </div>
  );
}

export const THE_FAMILY_TABLE_SECTIONS: CaseStudySection[] = [
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
    id: "brief",
    title: "The brief",
    children: (
      <div className="flex flex-col gap-[24px]">
        <SectionLead>
          Ten hours to pick one problem and design a feature that answers it.
        </SectionLead>
        <SectionBody>
          HeyNouri gave four candidate problems drawn from parents using
          meal-prep apps. I chose the fourth, and the one with the least obvious
          feature attached to it.
        </SectionBody>
        <SectionBody>
          The other three problems have known solutions. Faster planning,
          smarter substitutions, better nutrition labelling. Problem 04 was a
          parent saying they wanted their kids involved in food, not just fed by
          it. Nothing in a recipe library answers that.
        </SectionBody>
        {/* The scope caveat runs at caption size rather than body size: it is
            the page telling you what it is not, and it should not compete
            with the argument it qualifies. */}
        <Caption>
          This was a timed exercise, so the honest scope matters. There was no
          access to HeyNouri users, no analytics, and no round of testing inside
          the window. Everything below is design reasoning from the brief and
          from competitive behaviour I could observe. Where a claim would need
          evidence I do not have, I have said so rather than dressed it up.
        </Caption>
      </div>
    ),
  },
  {
    id: "problem",
    title: "The problem",
    children: (
      <div className="flex flex-col gap-[40px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>
            A meal runs through five stages. Meal-prep apps show up for two of
            them.
          </SectionLead>
          <SectionBody>
            I mapped the meal as a repeating weekly loop rather than a single
            planning task. Once it is drawn that way, the gap is hard to miss.
            Decide and Shop are well covered. Cook, Serve and Reflect are still
            one adult working alone, and the kid has a pain point in every
            column.
          </SectionBody>
        </div>
        <div className="flex flex-col gap-[16px]">
          <Figure
            src={JOURNEY_MAP.src}
            ratio={String(JOURNEY_MAP.aspect)}
            radius={12}
            alt="Five-stage journey map covering Decide, Shop, Cook, Serve and Reflect, with parent pain points, child pain points, needs and opportunities"
          />
          <Caption>
            Journey map built from the brief. The child row is the one that
            changed the direction of the work. Every stage already has a kid in
            it, doing nothing.
          </Caption>
        </div>
        <DefinitionGrid items={FRAMING} muted />
      </div>
    ),
  },
  {
    id: "insight",
    title: "The insight",
    children: (
      <div className="flex flex-col gap-[40px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>
            Participation is the one thing a recipe app cannot hand you.
          </SectionLead>
          <SectionBody>
            A meal planner can hand a parent a decision. It cannot hand a family
            a shared activity, because the activity is the thing being replaced.
            Every efficiency the category adds removes one more reason for a
            second person to be in the room.
          </SectionBody>
          <SectionBody>
            So the problem is not that kids lack a kids' mode. It is that the
            meal has no roles in it. One account holder decides, buys, cooks,
            serves and remembers. Everyone else waits and receives.
          </SectionBody>
        </div>
        <PullQuote attribution="The reframe the rest of the work follows from">
          A family meal already repeats every week. It does not need a new
          habit. It needs roles.
        </PullQuote>
      </div>
    ),
  },
  {
    id: "decision",
    title: "The decision",
    children: (
      <div className="flex flex-col gap-[40px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>
            I gave every stage a role instead of building a separate kids'
            section.
          </SectionLead>
          <SectionBody>
            The obvious ten-hour answer is a walled kids' area. A profile
            toggle, softer illustrations, simpler recipes. I did not take it,
            for one reason. A separate section makes participation optional, and
            optional participation is exactly the current state.
          </SectionBody>
        </div>
        {/* The rejected option and the built one, side by side — the whole
            decision is in the comparison, so they get equal width. */}
        <div
          className="grid gap-[60px]"
          style={{
            gridTemplateColumns: "1fr 1fr",
            borderTop: `1px solid ${DIVIDER}`,
            borderBottom: `1px solid ${DIVIDER}`,
            paddingBlock: 32,
          }}
        >
          <div className="flex flex-col gap-[12px]">
            <Label>The rejected option</Label>
            <SectionBody>
              A kids' mode sitting beside the main app. Easy to build, easy to
              demo, and easy to ignore after week two. It also leaves the
              parent's five stages untouched, which is where the actual load
              sits.
            </SectionBody>
          </div>
          <div className="flex flex-col gap-[12px]">
            <Label>What I designed instead</Label>
            <SectionLead>
              Four touch points across the existing flow, each one handing a
              stage to someone who was previously waiting. Choosing, listing,
              cooking and remembering. The parent keeps veto, not ownership of
              every step.
            </SectionLead>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "design",
    title: "The design",
    children: (
      <div className="flex flex-col gap-[60px]">
        <SectionBody>
          Four moments where the meal stops belonging to one person.
        </SectionBody>
        <Moment
          header="Decide · One card decides how the meal starts"
          paragraphs={[
            "Meal time comes before search. The real question is what is for dinner tonight, not search all recipes, so the first filter is Breakfast, Lunch, Dinner, Snack and the default view is one large card at a time.",
            "A card sized for one hand and one decision is a card a kid can be handed. That is the actual reason for the format. The grid is there for the parent scanning fast.",
            "Protein, calories and cook time sit on the card face rather than behind a tab, so the nutrition conversation happens while choosing instead of after committing.",
          ]}
          figures={[
            {
              ...DISCOVERY,
              alt: "Discovery screens: meal-time filters, a full-bleed recipe card, a grid view, and a recipe detail with ingredient chips",
            },
          ]}
        />
        <Moment
          header="Cook · Turning the phone is the mode switch"
          paragraphs={[
            "Rotating to landscape drops the recipe into Cook Mode. A character reads each step out loud and takes questions mid recipe, so the kid asking what does simmer mean gets an answer from the app rather than from a parent who has both hands busy.",
            "No new button, no new place to find. The gesture a kid already makes when they want something to be a video is the gesture that hands them the recipe.",
            "This is the screen carrying the most risk in the whole concept, and the one I would test first. See trade-offs below.",
          ]}
          figures={[
            {
              ...COOK_MODE,
              alt: "Landscape cook mode with timed steps on the left and an illustrated avocado toast in progress on the right",
            },
            {
              ...RECIPE_CARD,
              alt: "Portrait recipe card for Turkey and Avocado Pita Pockets",
            },
          ]}
        />
        <Moment
          header="Shop · The list does not close when one person finishes it"
          paragraphs={[
            "Selecting a recipe drops its ingredients into a shared list. Every family member can add from wherever they are, including mid shop, because someone always remembers one more thing after the list feels done. Items stay grouped by who added them, which is the small move that turns a chore list into a visible contribution.",
          ]}
          figures={[
            {
              ...GROCERY_RUN,
              alt: "Grocery Run screens showing a shared list grouped by family member, collected items, and a filling basket illustration",
            },
          ]}
        />
        <Moment
          header="Serve and Reflect · The meal does not end at the plate"
          paragraphs={[
            "Cooking Alerts let the household follow along live. Who is shopping, who has started cooking, when the food is ready. After the meal, whoever cooked photographs it and leaves a note, and the app keeps a running journal of what the family actually liked.",
            "This is the stage no competitor covers, and it is also the cheapest one to build. It reuses the recipe, the photo and one text field.",
          ]}
          figures={[
            {
              ...JOURNAL,
              alt: "Journal screens with a dated calendar strip, photo and handwritten note cards, and a Cooking Alerts feed",
            },
          ]}
        />
      </div>
    ),
  },
  {
    id: "campaign",
    title: "Campaign",
    children: (
      <div className="grid items-start gap-[60px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Figure
          src={CAMPAIGN.src}
          ratio={String(CAMPAIGN.aspect)}
          radius={12}
          alt="Social post illustration of a parent and child cooking together with the line Cooking is fun when done together"
        />
        <div className="flex flex-col gap-[24px]">
          <SectionLead>The creative sells the feeling, not the feature.</SectionLead>
          <SectionBody>
            No screenshots and no UI in the frame. If The Family Table works, a
            Tuesday looks like this.
          </SectionBody>
          <SectionBody>
            The brief asked for a feature. The post sells what the feature
            produces. A kid old enough to hold the spatula, a parent handing
            over real trust, one plate at the end of it.
          </SectionBody>
        </div>
      </div>
    ),
  },
  {
    id: "trade-offs",
    title: "Trade-offs",
    children: (
      <div className="flex flex-col gap-[40px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>
            The gap I would fix before anything else is a safety one.
          </SectionLead>
          <SectionBody>
            Ten hours bought four flows and cost me onboarding. There is no step
            in this concept that captures allergies, dietary needs or household
            constraints, which means a recipe surfaced to an eight year old is
            not yet guaranteed to be safe for them to cook or eat. That is a
            real hole, not a nice to have, and it is the first thing I would
            design next.
          </SectionBody>
        </div>
        <ClaimList items={TRADE_OFFS} />
      </div>
    ),
  },
  {
    id: "validation",
    title: "Validation",
    children: (
      <div className="flex flex-col gap-[40px]">
        <SectionLead>
          Three signals would tell me whether roles actually transferred.
        </SectionLead>
        <ClaimList items={SIGNALS} />
        <SectionBody>
          Further out, the direction I would most want to explore is cuisine
          based discovery, where a family travels by cooking a different
          region's food each week. Cooking a place's food is one of the more
          honest ways to understand it, and it gives the weekly loop a reason to
          keep going once the novelty of roles wears off.
        </SectionBody>
      </div>
    ),
  },
  {
    id: "reflection",
    title: "Reflection",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[24px]">
          <Label>What the project taught me</Label>
          <SectionLead>
            The strongest move here was not a screen. It was refusing the kids'
            mode.
          </SectionLead>
          <SectionBody>
            Choosing the harder structural answer inside a ten hour window meant
            less polish across four flows, and I would make that trade again,
            because a walled section would have demoed better and solved
            nothing.
          </SectionBody>
          <SectionBody>
            The other lesson is about journey maps. Adding a second row for the
            person nobody was designing for is what produced the whole concept.
            The map was not documentation. It was the argument.
          </SectionBody>
        </div>
        <div className="flex flex-col gap-[24px]">
          <Label>What I would do differently now</Label>
          <SectionLead>
            I would spend the first hour on constraints instead of exploration.
          </SectionLead>
          <SectionBody>
            Onboarding for allergies would have taken maybe forty minutes and
            would have closed the one gap that genuinely undermines the concept.
            Beautiful flows around an unsafe default is the wrong order.
          </SectionBody>
          <SectionBody>
            I would also put a rough Cook Mode script in front of one real kid
            before designing the screen around it, even informally. The voice
            guide is doing all the work in that flow, and I designed the
            container before I knew whether the content could hold a nine year
            old's attention for twenty minutes.
          </SectionBody>
        </div>
        {/* The footer line from the source document — the page should say out
            loud that this is concept work. */}
        <p
          style={{
            fontSize: BODY_FONT,
            letterSpacing: BODY_TRACK,
            lineHeight: "normal",
            color: MUTED,
            borderTop: `1px solid ${DIVIDER}`,
            paddingTop: 24,
          }}
        >
          Concept work for the HeyNouri UX/UI design challenge, a ten hour timed
          exercise. Not affiliated with a shipped HeyNouri release.
        </p>
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["greenera", "hacksvit"]} />,
  },
];
