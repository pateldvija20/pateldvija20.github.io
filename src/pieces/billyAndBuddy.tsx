import type { ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import stakeholderMap from "./diagrams/01-stakeholder-map.svg?raw";
import systemDiagram from "./diagrams/02-system-diagram.svg?raw";
import serviceBlueprint from "./diagrams/03-service-blueprint.svg?raw";
import serviceVisualization from "./diagrams/04-service-visualization.svg?raw";
import {
  BODY_FONT,
  BODY_TRACK,
  Caption,
  ClaimList,
  DefinitionGrid,
  DIVIDER,
  Figure,
  ImageCard,
  Label,
  MONO,
  MUTED,
  RelatedProjects,
  SectionBody,
  SectionLead,
} from "./caseStudyBits";

/**
 * Billy & Buddy — the needs-versus-wants mini game, written up as CaseStudy
 * sections.
 *
 * Same skeleton as Greenera and The Family Table: the template's rail and body
 * column, a metadata strip under the header, and eyebrow'd sections whose
 * headings are claims rather than categories. The section order is the one the
 * source page sets out — brief, solution, problem, findings, the system,
 * process, turning point, goals, business, outcome, reflection — which is the
 * argument in order, so the rail follows it.
 *
 * Two things this page does that the others don't:
 *
 * The research is attributed away. The five findings are the team's, gathered
 * before this author joined, and the section says so rather than letting the
 * page imply otherwise.
 *
 * Nothing is claimed as validated. The three goals each carry an `untested`
 * tag, and the outcome names the specific test that would settle them. There
 * are no metrics on this page because the project has none.
 *
 * The four service artifacts are inline SVG rather than exported PNG: they are
 * dense enough at 11px that a raster would have to be enormous to stay
 * readable, and inline they inherit the page's own faces. They are imported
 * `?raw` from `./diagrams/` and rendered through `Diagram`.
 *
 * The source files are the four standalone pages, put through a build step
 * (`scratchpad/newconv.py`) that resolves their custom properties to hex,
 * retypes them in DM Sans / Roboto Slab, strips the chrome each one carried as
 * a standalone page — masthead, aim, footnote, key — sets the runs that carry
 * the argument in bold ink, and crops the viewBox to what is left. The prose
 * and the key that used to live inside the artwork are rebuilt above it as
 * page text, where they stay readable however far the drawing is scaled.
 */

const ART = "/assets/projects/billy-and-buddy";

/** Billy & Buddy's own four accents, as the diagrams use them. */
const BB = {
  coral: "#E15F54",
  teal: "#1CAEA9",
  green: "#71A351",
  amber: "#F0AF43",
  grey: "#7C838B",
  ink: "#2F2F2F",
};

/** The line every key ends on, now that emphasis is carried by weight. */
const BOLD_KEY = { color: BB.ink, label: "Bold — the part that matters" };

/** Every game screen is a 1400x909 capture. */
const SCREEN = String(1400 / 909);

/** Role / methods / type / status, stated before any prose. There is no
 *  timeline or tool list here because the project record does not carry one,
 *  and inventing either would be worse than the gap. */
const META: [string, string][] = [
  ["Role", "Website mini games. Story and narrative, with Kaitlyn Carney."],
  ["Methods", "Game ideation, physical prototype test, service mapping"],
  ["Type", "Student project, COllab Studio"],
  ["Team", "Five designers. Visual language and illustration by Sharanya."],
];

/** What was researched, what was designed, and how far it got. */
const SCOPE: [string, string][] = [
  [
    "Research",
    "Team research on financial literacy education, done before I joined. One physical prototype test of the game logic.",
  ],
  [
    "Design",
    "Game concept, two-part structure, full state map, website flow, and four service artifacts.",
  ],
  [
    "Status",
    "Designed and prototyped on paper. The digital version has not been tested with children.",
  ],
];

const PROBLEM: [string, string][] = [
  [
    "Half of schools do not teach it at all.",
    "In American primary and secondary education, only about half of schools require classes on financial literacy. As of 2024, 26 states required it. Whether a child learns this comes down to an address.",
  ],
  [
    "Four in seven adults can be considered financially literate.",
    "The gap does not close with age. Children who never learn this become adults who cannot make informed decisions about their own money.",
  ],
  [
    "The resources that exist hand over information, not practice.",
    "There are services that give students the basics. Few of them teach money gradually, in a form a child will sit through more than once.",
  ],
  [
    "A definition does not survive contact with a supermarket aisle.",
    "A child can repeat what a need is and still put candy in the basket. The concept has to be used inside a situation or it stays a word.",
  ],
];

const FINDINGS: [string, string][] = [
  [
    "Learning sticks when it looks like the situation it is for.",
    "Real-life scenarios bridge the gap between theory and practice.",
  ],
  [
    "Attention is the constraint, not comprehension.",
    "Interactive and gamified learning with incentives is the most effective way to hold a child's attention.",
  ],
  [
    "Small pieces beat one long explanation.",
    "Structuring learning in chunks is the most accessible format and the most likely to be retained.",
  ],
  [
    "Nobody agrees what a child should know by adulthood.",
    "There is no current standard for a child's financial literacy on entering the teenage years or adult life.",
  ],
  [
    "The gap compounds.",
    "Financially illiterate children grow into financially illiterate adults who cannot make smart and informed financial decisions.",
  ],
];

const SOLUTION = [
  {
    img: `${ART}/game-menu.jpg`,
    alt: "Scenario select screen",
    header: "The lesson starts with a situation, not a definition.",
    body: "A player picks a context first. A day at the zoo, a birthday party. The same item can be a need in one situation and a want in another, so the game hands over the situation before it asks anything.",
  },
  {
    img: `${ART}/game-sort.jpg`,
    alt: "Sorting screen with a timer and cart",
    header: "Ten items, two baskets, two minutes.",
    body: "The player sorts ten items into Needs and Wants against a clock, with three lives. A wrong basket costs one. The clock is what forces a decision instead of a lookup.",
  },
  {
    img: `${ART}/game-correct.jpg`,
    alt: "Billy giving feedback after a correct sort",
    header: "Billy answers every choice out loud.",
    body: "Right or wrong, the response lands in the same second as the tap. A wrong sort says so and offers the next try rather than ending the round.",
  },
  {
    img: `${ART}/game-checkout.jpg`,
    alt: "Budget shopping screen at checkout",
    header: "Sorting is half of it. Then you have to pay.",
    body: "Part two hands the player a budget. Every need has to make it into the cart, wants only fit if there is room, and money left over adds to the score. Knowing the difference is not the same as spending on it.",
  },
] as const;

const PROCESS = [
  {
    img: `${ART}/pb-ideation.jpg`,
    alt: "Grid layout tests from game ideation",
    ratio: String(1302 / 1064),
    header: "I tested the grid before I tested the game.",
    body: "The first round was structure. How a grid changes difficulty, what happens when the goal moves, what each new parameter costs in confusion. Cheap to draw and quick to throw away.",
  },
  {
    img: `${ART}/pb-concept.jpg`,
    alt: "Sketches of the falling object concept",
    ratio: String(1400 / 787),
    header: "The first working idea was a falling-object game.",
    body: "Objects drop from the top and the player steers them into Needs or Wants. Speed rises each level. Three lives, bonuses, sale coupons. It was fun to describe and it did not survive the test.",
  },
  {
    img: `${ART}/pb-prototype.jpg`,
    alt: "Photos of the physical paper prototype",
    ratio: String(1145 / 1400),
    header: "Then I built it out of paper and watched it fail.",
    body: "I tested the logic as a physical prototype with a shopping cart, item cards and a time limit. Three things came back. One of them ended the falling-object version.",
  },
  {
    img: `${ART}/pb-rules.jpg`,
    alt: "Slide showing part one and part two rules",
    ratio: String(1400 / 787),
    header: "The rules that survived.",
    body: "Part one is sorting, two minutes, ten items, three lives. Part two is a budget at the checkout where every need is mandatory. Failing part one blocks part two, so the sorting has to be learned before the spending.",
  },
] as const;

const GOALS: [string, string][] = [
  [
    "A child should be able to sort without asking an adult.",
    "Categories have to be clear enough, and items obvious enough, for an independent decision inside the time limit.",
  ],
  [
    "The budget should teach itself.",
    "A player has to see the total move as items go in and out, and work out on their own that the needs are not optional.",
  ],
  [
    "The trade-off is the actual lesson.",
    "What matters is whether a child reasons about leftover money, and whether overspending on wants registers as a consequence rather than bad luck.",
  ],
];

const REFLECTION: [string, string][] = [
  [
    "Test the medium, not only the logic.",
    "Paper told me the rules worked and nothing about the timer, which was the whole point of the design. The prototype has to be made of the same material as the thing.",
  ],
  [
    "The categories have to come from the player.",
    "I wrote the item list from an adult's idea of a need. The first test found that in minutes, and it is the finding I have not yet answered.",
  ],
  [
    "A companion character needs a job.",
    "Standing beside the game is not a role. Billy now responds to every action, which gives her one reason to be on screen.",
  ],
];

const NEXT_TIME: [string, string][] = [
  [
    "Build the clickable version first.",
    "I tested on paper because a digital prototype was expensive to make. That reason has mostly gone, and the test I actually needed was always the digital one.",
  ],
  [
    "Let children write the item list.",
    "A short survey and a pass over the answers would give me the categories the game should use, instead of the ones I assumed.",
  ],
];

/** A legend swatch. `line` is a route, `pill` a condition chip, `ring` a
 *  partner organisation — the three non-dot keys these diagrams use. */
type Key = { color: string; label: string; shape?: "dot" | "ring" | "line" | "pill" };

function Swatch({ color, shape = "dot" }: { color: string; shape?: Key["shape"] }) {
  if (shape === "line") {
    return (
      <span
        className="inline-block shrink-0"
        style={{
          width: 18,
          height: 0,
          borderTop: `2px dotted ${color}`,
          transform: "translateY(-3px)",
        }}
      />
    );
  }
  if (shape === "pill") {
    return (
      <span
        className="inline-block shrink-0"
        style={{ width: 18, height: 11, borderRadius: 999, border: `1px solid ${color}` }}
      />
    );
  }
  return (
    <span
      className="inline-block shrink-0"
      style={{
        width: 10,
        height: 10,
        borderRadius: shape === "ring" ? 2 : 999,
        background: shape === "ring" ? "transparent" : color,
        border: shape === "ring" ? `1.5px solid ${color}` : "none",
      }}
    />
  );
}

/**
 * The diagram's key, lifted out of the artwork and set as page text.
 *
 * Inside the SVG this was 10 to 12px type that shrank with everything else
 * when the drawing was scaled to fit; out here it sits at the page's own size
 * and stays readable no matter how far the artwork is reduced. It reads before
 * the diagram, so the colours mean something by the time they are seen.
 */
function DiagramKey({ items }: { items: Key[] }) {
  return (
    <ul
      className="flex list-none flex-nowrap items-center gap-x-[26px] overflow-x-auto p-0"
      style={{
        margin: 0,
        // Sits inside the diagram's frame, so it takes the frame's own inset
        // and only the rule beneath it — a top border would double the frame's.
        padding: "13px 16px",
        borderBottom: `1px solid ${DIVIDER}`,
      }}
    >
      {items.map((it) => (
        <li
          key={it.label}
          className="flex shrink-0 items-center gap-[9px] whitespace-nowrap"
          style={{ color: MUTED, fontSize: 15 }}
        >
          <Swatch color={it.color} shape={it.shape} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * One of the four service artifacts.
 *
 * Each was drawn as a standalone page, so it arrived carrying its own
 * masthead, subtitle, aim, footnote and key. On a case study those are the
 * page's job, not the picture's: the chrome is stripped at build time and said
 * here in prose, and the key is rebuilt above as real text. What is left is
 * cropped to its own content bounds.
 *
 * The frame takes the page's own gutter rather than one of its own: it sits
 * in the body column's normal flow, so its edges line up with the prose above
 * it and with every other block on the page.
 *
 * The drawing scales to fit that width, whole and unscrolled. That is a
 * deliberate trade: at the column's ~648px these are reduced far past the size
 * their labels were drawn for — the blueprint is 2358 units across, so its
 * 14.5px copy lands near 4px — and they read as a shape rather than as
 * something anyone can follow word by word. The prose above each one carries
 * the argument; the artwork is there to show its scale and structure.
 */
function Diagram({
  svg,
  label,
  lead,
  body,
  keys,
}: {
  svg: string;
  label: string;
  lead: string;
  body: ReactNode;
  keys: Key[];
}) {
  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex flex-col gap-[12px]">
        <SectionLead>{lead}</SectionLead>
        <SectionBody>{body}</SectionBody>
      </div>
      {/* One framed object: the key banded across the top, the drawing under
          it. Only the drawing scrolls — the key has to stay put, or the
          swatches slide away from the artwork they explain. */}
      <div
        className="overflow-hidden"
        style={{ border: `1px solid ${DIVIDER}`, borderRadius: 12 }}
      >
        <DiagramKey items={keys} />
        {/* `role="img"` goes here rather than on the frame: on the frame it
            would make the key's text presentational and hide it from a screen
            reader, which is the opposite of why the key was lifted out. */}
        <div
          className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          style={{ padding: 16 }}
          role="img"
          aria-label={label}
          // The SVGs are build-time assets in this repo, imported `?raw` — no
          // runtime or user-supplied markup reaches this.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}

/** The small pill a claim carries when it is a position rather than a result. */
function Tag({ children, tone }: { children: ReactNode; tone: "untested" | "mine" }) {
  const untested = tone === "untested";
  return (
    <span
      className="ml-[10px] inline-block align-middle uppercase"
      style={{
        fontFamily: MONO,
        fontWeight: 500,
        fontSize: 12,
        letterSpacing: 0.6,
        color: untested ? "#8a6d1f" : "#1f5f8a",
        background: untested ? "#fbf0d6" : "#dceaf5",
        borderRadius: 999,
        padding: "3px 10px",
      }}
    >
      {children}
    </span>
  );
}

/** A line the page has to qualify rather than assert — attribution, an open
 *  question, a limit on what the work proves. */
function Note({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 18,
        letterSpacing: BODY_TRACK,
        lineHeight: "normal",
        color: MUTED,
        borderLeft: `2.77px solid ${DIVIDER}`,
        paddingLeft: 24,
        paddingBlock: 4,
      }}
    >
      {children}
    </p>
  );
}

/** One of the three paper-test findings, and the change it forced. */
function Finding({
  label,
  children,
  accent = false,
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-[12px]"
      style={{
        padding: 24,
        borderRadius: 12,
        background: accent ? "#eff7f6" : "#fbfaf7",
        border: `1px solid ${accent ? "#c9e5e3" : DIVIDER}`,
      }}
    >
      <Label>{label}</Label>
      <p style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}>
        {children}
      </p>
    </div>
  );
}

/** Claim/body rows where the claim carries a tag. */
function TaggedList({ items, tone }: { items: [string, string][]; tone: "untested" | "mine" }) {
  return (
    <div className="flex flex-col">
      {items.map(([claim, body], i) => (
        <div
          key={claim}
          className="flex flex-col gap-[12px]"
          style={{
            paddingBlock: 28,
            borderTop: `1px solid ${DIVIDER}`,
            borderBottom: i === items.length - 1 ? `1px solid ${DIVIDER}` : "none",
          }}
        >
          <p
            className="font-medium"
            style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}
          >
            {claim}
            <Tag tone={tone}>{tone === "untested" ? "untested" : "my read"}</Tag>
          </p>
          <SectionBody>{body}</SectionBody>
        </div>
      ))}
    </div>
  );
}

export const BILLY_AND_BUDDY_SECTIONS: CaseStudySection[] = [
  {
    id: "intro",
    title: "Intro",
    children: null,
  },
  {
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
            Only about half of American schools require a class on money. A
            child's chance of learning how saving, spending and budgeting work
            comes down to which state they live in, and the gap does not close
            on its own.
          </SectionLead>
          <SectionBody>
            Billy &amp; Buddy is a sixteen-book series delivered a book at a
            time, with mini games on the website that replay each book's lesson.
            I designed the game for needs against wants. A child picks a
            situation, sorts ten items into two baskets on a two-minute clock,
            then spends a fixed budget at the checkout. Billy answers every
            choice as it happens.
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
      <div className="flex flex-col gap-[24px]">
        <SectionLead>
          Teach American children ages five to nine about money through books,
          and reinforce each lesson on a digital platform.
        </SectionLead>
        <SectionBody>
          Each book carries one age-appropriate concept in an interactive story.
          The website is where the concept gets used again, in a game short
          enough that a child will actually finish it.
        </SectionBody>
      </div>
    ),
  },
  {
    id: "challenge",
    title: "Challenge",
    children: (
      <SectionLead>
        How can a six-year-old learn to tell a need from a want in the two
        minutes they will actually give a game?
      </SectionLead>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div className="flex flex-col gap-[60px]">
        <SectionBody>Four screens carry the idea. Here is what each one does.</SectionBody>
        {SOLUTION.map((block) => (
          <ImageCard
            key={block.header}
            {...block}
            columns="1fr 1fr"
            gap={40}
            radius={12}
            ratio={SCREEN}
          />
        ))}
      </div>
    ),
  },
  {
    id: "problem",
    title: "The Problem",
    children: (
      <div className="flex flex-col gap-[40px]">
        <SectionLead>
          Financial literacy for children fails in four ordinary ways.
        </SectionLead>
        <ClaimList items={PROBLEM} />
      </div>
    ),
  },
  {
    id: "initial-findings",
    title: "Initial Findings",
    children: (
      <div className="flex flex-col gap-[40px]">
        <SectionLead>
          Five findings from the team's research, and the two that decided the
          format.
        </SectionLead>
        <Note>
          I joined this project after the research was done. The five findings
          below are the team's work. I am reporting them, not claiming them.
        </Note>
        <ClaimList items={FINDINGS} />
        <SectionBody>
          Findings two and three point at the same thing. If attention is the
          limit and small chunks are the unit, the reinforcement has to be
          short, situated and repeatable. That is a game, not a chapter.
        </SectionBody>
      </div>
    ),
  },
  {
    id: "system",
    title: "The System",
    children: (
      <div className="flex flex-col gap-[60px]">
        <div className="flex flex-col gap-[24px]">
          <SectionLead>
            Before designing the game I mapped what it sits inside.
          </SectionLead>
          <SectionBody>
            A game that reinforces a book is only worth building if the book
            arrives on a schedule, the site is where a child goes between
            deliveries, and somebody is paying for both. These four artifacts
            describe that. They are redrawn here from the process book, with the
            content unchanged.
          </SectionBody>
        </div>
        <Diagram
          svg={stakeholderMap}
          label="Stakeholder map: ten roles, three partner organisations and five touchpoints arranged around the service"
          keys={[
            { color: BB.amber, label: "Makes the book" },
            { color: BB.coral, label: "Uses it at home" },
            { color: BB.teal, label: "Runs the platform" },
            { color: BB.green, label: "Partner that carries it", shape: "ring" as const },
            { color: BB.grey, label: "How a touchpoint reaches a role", shape: "line" as const },
            BOLD_KEY,
          ]}
          lead="Stakeholder map. Ten people, three partners, and five things a family ever actually touches."
          body={
            <>
              The arrows run clockwise: five people make the book, three
              partners carry it out into the world, a parent and a child use it,
              and what the site learns on the way round comes back to the
              author. Numbering follows that loop rather than importance, and
              colour says which side someone is on — amber makes the book, coral
              uses it at home, teal runs the platform.
            </>
          }
        />
        <Diagram
          svg={systemDiagram}
          label="System diagram: the website flow, from the homepage through five destinations to a parent-approval gate"
          keys={[
            { color: BB.teal, label: "Entry & account" },
            { color: BB.coral, label: "Play" },
            { color: BB.amber, label: "Shop & checkout" },
            { color: BB.green, label: "Learn" },
            { color: BB.grey, label: "Support" },
            { color: BB.grey, label: "Route", shape: "line" as const },
            { color: BB.grey, label: "Condition", shape: "pill" as const },
            BOLD_KEY,
          ]}
          lead="System diagram. Every route through the website, and the one gate that stops a child buying alone."
          body={
            <>
              The homepage opens onto five destinations, and every screen
              carries a route back to it. Play and shopping both feed the same
              profile dashboard, and checkout cannot complete without a grown-up
              approving it. Mini games are one of those five, which is the whole
              reason the game has to work without an adult reading the
              instructions.
            </>
          }
        />
        <Diagram
          svg={serviceBlueprint}
          label="Service blueprint: one setup phase and six stages of the family's journey across five lanes"
          keys={[
            { color: BB.coral, label: "Parent & child" },
            { color: BB.teal, label: "Frontstage & technology" },
            { color: BB.green, label: "Backstage" },
            { color: BB.amber, label: "Support processes" },
            { color: "#CFCCC0", label: "Setup, before the family arrives", shape: "ring" as const },
            BOLD_KEY,
          ]}
          lead="Service blueprint. One setup phase, then six stages of the family's journey."
          body={
            <>
              Five lanes, from a blank page to a child playing. The family does
              not appear until stage one; everything in the setup column is
              people the family never sees. Eighteen months for the first title,
              then twelve weeks per volume, and the subscriptions from stage six
              pay for the next four titles.
            </>
          }
        />
        <Diagram
          svg={serviceVisualization}
          label="Service visualization: one turn of the service, from signup through making the book to a child playing the lesson back"
          keys={[
            { color: BB.coral, label: "Where the family is" },
            { color: BB.amber, label: "Made before anyone sees it" },
            { color: BB.green, label: "How it travels, and what travels back" },
            { color: BB.teal, label: "The digital layer" },
            { color: BB.grey, label: "The quarterly loop", shape: "line" as const },
            BOLD_KEY,
          ]}
          lead="Service visualization. One turn of the service, then the loop."
          body={
            <>
              A parent signs up, four people make a book, a courier carries it,
              and a child plays the lesson back. Sixteen volumes across four
              years at $100 a year or $10 a month. A book arrives every quarter,
              which is the gap the game has to bridge.
            </>
          }
        />
      </div>
    ),
  },
  {
    id: "design-process",
    title: "Design Process",
    children: (
      <div className="flex flex-col gap-[60px]">
        <SectionLead>Grid first, then a game, then paper.</SectionLead>
        {PROCESS.map((block) => (
          <ImageCard key={block.header} {...block} columns="1fr 1fr" gap={40} radius={12} />
        ))}
      </div>
    ),
  },
  {
    id: "turning-point",
    title: "Turning Point",
    children: (
      <div className="flex flex-col gap-[40px]">
        <SectionLead>The paper test ended the falling-object version.</SectionLead>
        <div className="grid grid-cols-2 gap-[24px]">
          <Finding label="Finding one">
            The predetermined categories for Needs and Wants did not align with
            players' own view of what counts as a need. That caused confusion
            and mismatches during play.
          </Finding>
          <Finding label="Finding two">
            The dog character was not effectively integrated into gameplay, so
            it felt disconnected and secondary, despite being intended as a
            companion and guide.
          </Finding>
          <Finding label="Finding three">
            Physical play with a time constraint did not capture the digital
            experience the game was for. It said nothing about how a child would
            handle a UI, real-time feedback or pacing.
          </Finding>
          <Finding label="What I changed" accent>
            The falling-object mechanic went. Sorting became deliberate and
            timed instead of reflex-driven, a second part was added so the
            concept has to be spent as well as named, and the guide now speaks
            on every single action.
          </Finding>
        </div>
        <Note>
          The first finding is still open. The fix is a survey of children in the
          target age range on which items they call a need, and then rebuilding
          the item list from their answers rather than mine. I have not run it.
        </Note>
      </div>
    ),
  },
  {
    id: "goal",
    title: "Goal",
    children: (
      <div className="flex flex-col gap-[40px]">
        <SectionLead>
          Three things the game has to prove, none of them proven yet.
        </SectionLead>
        <TaggedList items={GOALS} tone="untested" />
      </div>
    ),
  },
  {
    id: "business-case",
    title: "The Business Case",
    children: (
      <div className="flex flex-col gap-[40px]">
        <SectionLead>
          Who pays for this, and the part I could not resolve.
        </SectionLead>
        <div className="flex flex-col gap-[24px]">
          <Label>The model</Label>
          <SectionBody>
            A subscription at $100 a year or $10 a month delivers one book at a
            time across sixteen books and four years, with revenue also from
            single book sales and branded merchandise. The buyers are parents
            who want their child financially literate and educators who want
            something they can drop into a classroom without building it.
          </SectionBody>
        </div>
        <TaggedList
          items={[
            [
              "The game is free, and the lesson inside it is to want less.",
              "Its job is to bring children back between deliveries. The service earns more when families stay subscribed and buy more, while the game teaches spending less. Naming that is not solving it, and I did not solve it.",
            ],
          ]}
          tone="mine"
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
          <SectionLead>What exists, and the test that would settle it.</SectionLead>
          <SectionBody>
            A full game concept with a two-part structure and a mapped state
            set: three lose states, two win states, a checkout, and victory
            scoring. Alongside it, the website flow and four service artifacts.
            The physical prototype tested the logic. Nothing has been tested
            with children, and nothing has been tested on a screen.
          </SectionBody>
        </div>
        <div className="flex flex-col gap-[16px]">
          <div className="grid grid-cols-2 gap-[24px]">
            <Figure
              src={`${ART}/game-lose.jpg`}
              ratio={SCREEN}
              radius={12}
              alt="Lose screen after running out of lives"
            />
            <Figure
              src={`${ART}/game-progress.jpg`}
              ratio={SCREEN}
              radius={12}
              alt="Menu screen showing a completed scenario"
            />
          </div>
          <Caption>
            Two states from the map. Losing keeps the tone the same as winning,
            which matters when the player is six.
          </Caption>
        </div>
        <div className="flex flex-col gap-[24px]">
          <SectionLead>The test I would run.</SectionLead>
          <SectionBody>
            A clickable prototype, timed, with children in the target age range.
            Three things to watch: whether they sort without asking, whether the
            budget total makes sense to them as it moves, and whether any of
            them choose to leave money unspent. Before that, the survey on what
            a child calls a need. The paper test already told me the item list
            is the weak point.
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
        <div className="flex flex-col gap-[24px]">
          <Label>What I take forward</Label>
          <ClaimList items={REFLECTION} />
        </div>
        <div className="flex flex-col gap-[24px]">
          <Label>What I would do differently now</Label>
          <ClaimList items={NEXT_TIME} />
        </div>
        <Note>
          Original project by COllab Studio. Visual language, style guide,
          illustrations and branding by Sharanya. Story and narrative by Kaitlyn
          Carney and Dvija Patel. Book layouts by Sam Collins. Interactions and
          pop-ups by Kaitlyn Carney. Website mini games by Dvija Patel. The four
          diagrams on this page were redrawn by me from the team's process book,
          content unchanged.
        </Note>
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["greenera", "the-family-table"]} />,
  },
];
