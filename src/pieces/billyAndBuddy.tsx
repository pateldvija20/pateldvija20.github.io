import type { CaseStudySection } from "./CaseStudy";
import { RelatedProjects } from "./caseStudyBits";
import { BillyBook } from "./BillyBook";
import { BillyServiceStory } from "./BillyPhases";
import {
  Band,
  Clip,
  ClipRow,
  Decision,
  Facts,
  H3,
  H4,
  Marked,
  MD,
  Need,
  NextCards,
  P,
  PrototypeLink,
  SectionHead,
  SM,
  TITLE,
  DIVIDER,
  INK,
  ITEM_LABEL,
  MUTED,
  ink,
  ink2,
} from "./caseStudyKit";

/**
 * The Billy & Buddy case study, on the Bind Desk model.
 *
 * Order: TL;DR, four solution clips, the problem, the service (four stages: what it
 * is, who it is for, who makes it, how it reaches families), the design
 * process (two decisions), the
 * outcome (the book you can turn on screen, then the game), next steps, how AI
 * was used, and credits.
 *
 * The page is about the game. The service is a proposed design by the team and
 * is labelled that way. People are roles in the body and named only in the
 * credits. Gaps only the author can fill are `Need` markers, never written
 * around.
 *
 * The playable prototype is plain static files under
 * `public/billy-and-buddy-game/`; the clips were recorded from it with
 * `scripts/billy-video.mjs`.
 */

const ART = "/assets/projects/billy-and-buddy";
const GAME = "/billy-and-buddy-game/";
/** The clips keep the game's own 1512 x 982 stage shape. */
const CLIP_RATIO = "1200 / 779";

const META: [string, React.ReactNode][] = [
  ["Timeline", "4 months"],
  ["Role", "Game designer"],
  ["Scope", "Book volume 1 and its game"],
];

/** In the order a round is played: one paragraph each, the part that says what the game does highlighted. */
const SCENES = [
  {
    clip: "story",
    label: "Video: Billy and Buddy set up a trip to the zoo, then the rules appear",
    text: "A definition of a need does not help in a shop. The game **opens with a situation told by Billy and Buddy, a day at the zoo, Buddy's birthday party or a hike to a waterfall**, so every item is judged against a real plan.",
  },
  {
    clip: "sort",
    label: "Video: items fall one at a time and are steered into Needs or Wants",
    text: "**Ten items fall one at a time and the child steers each into Needs or Wants, with three lives and no clock.** The item lists are still an adult's idea of a need, which is the first thing to test.",
  },
  {
    clip: "feedback",
    label: "Video: a wrong basket turns red, costs a life and Billy explains",
    text: "**Billy asks a question about the trip as each item falls, never the answer, and a wrongly sorted item comes back later in the round.** A mistake costs a life, not the lesson.",
  },
  {
    clip: "checkout",
    label: "Video: the needs go on the belt, a want goes over the $20 budget and back, then pay and the stars",
    text: "**Every need has to be paid for, and the round has a $20 budget.** Missing a need loses the round; going over budget still wins, with one star fewer. What the child saves goes into their money for the shop.",
  },
];

const DECISIONS = [
  {
    title: "Paper prototype: does the concept work?",
    ratio: "1400 / 787",
    inset: "4%",
    before: {
      src: `${ART}/pb-prototype-wide.jpg`,
      alt: "Photos of the paper prototype: item cards, a shopping cart sheet and Needs and Wants sheets on a table, with a phone as the timer.",
      text: "Before building anything, children sorted item cards into Needs, Wants and a shopping cart, with a phone as the timer. It tested whether the idea worked as a game at all.",
      fit: "contain" as const,
    },
  },
  {
    title: "Layout sketch: how will it look?",
    ratio: "1400 / 787",
    before: {
      src: `${ART}/pb-concept.jpg`,
      alt: "Sketch of the first concept: objects fall towards a Need basket and a Want basket, with speed rising each level.",
      text: "A sketch of the screen: items fall towards Need and Want baskets, steered left and right, with three lives, a score per item and a leaderboard. Speed rose each level, which tested reflexes more than the choice.",
      fit: "contain" as const,
    },
    after: {
      src: `${ART}/clips/sort.jpg`,
      alt: "The game's sorting screen: a lollipop falling down the aisle, Needs and Wants baskets, three hearts, Billy's hint and the cart.",
      text: "Items still fall, but slowly, with no clock, and each one pauses above the baskets before it drops. The thinking happens at the child's speed.",
      fit: "contain" as const,
    },
  },
];

const NEXT = [
  { label: "Build and test", text: "Play the prototype with children aged 4 to 7 and watch three things: whether they **sort without help**, whether they **treat needs as required** at checkout, and what they do with **money left over**." },
  { label: "Measure", text: "Wrong sorts per item, money left at checkout, and how often a child replays a scenario." },
  { label: "Clarify", text: "Ask children what they call a need, then **rebuild the three item lists from their answers** instead of mine." },
  { label: "What changes", text: "**The game is free, and the lesson inside it is to want less.** The service earns more when families buy more, and testing should show whether parents see that as a conflict." },
];

/** By name, with what each person did; mine first. */
const CREDITS: [string, string][] = [
  ["Website mini games", "Dvija Patel"],
  ["Story and narrative", "Kaitlyn Carney & Dvija Patel"],
  ["Visual language, style guide, illustrations, branding", "Sharanya Sateesh"],
  ["Layouts for books", "Sam Collins"],
  ["Interactions, pop-ups", "Kaitlyn Carney"],
];

/** The problem: the statement with how few adults manage money on the left, how few states teach it on the right. */
function ProblemBody() {
  return (
    <div className="grid items-start gap-10 md:grid-cols-2">
      <div>
        <p className={H3} style={ink2}>
          <Marked text="Young children are taught **what a need is**, if they are taught at all, but rarely **practise choosing one** with **a budget**." />
        </p>
        <figure className="m-0 mt-10">
          <p className="text-[56px] font-medium leading-none tracking-[-1px]" style={ink}>
            4<span className="text-[24px]" style={ink2}> / 7</span>
          </p>
          <div aria-hidden="true" className="mt-5 flex gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <svg key={i} viewBox="0 0 24 28" width={30} height={35}>
                <circle cx={12} cy={7} r={5.5} fill={i < 4 ? INK : "none"} stroke={i < 4 ? "none" : DIVIDER} strokeWidth={1.5} />
                <path d="M2 27 a10 10 0 0 1 20 0 Z" fill={i < 4 ? INK : "none"} stroke={i < 4 ? "none" : DIVIDER} strokeWidth={1.5} />
              </svg>
            ))}
          </div>
          <figcaption className={`mt-4 max-w-sm ${MD}`} style={ink2}>
            Americans can be considered financially literate.
          </figcaption>
        </figure>
      </div>
      <figure className="m-0">
        <p className="text-[56px] font-medium leading-none tracking-[-1px]" style={ink}>
          26<span className="text-[24px]" style={ink2}> / 50</span>
        </p>
        <div aria-hidden="true" className="mt-5 grid max-w-[300px] grid-cols-10 gap-[6px]">
          {Array.from({ length: 50 }, (_, i) => (
            <span key={i} className="aspect-square rounded-full" style={i < 26 ? { background: INK } : { boxShadow: `inset 0 0 0 1.5px ${DIVIDER}` }} />
          ))}
        </div>
        <figcaption className={`mt-4 max-w-sm ${MD}`} style={ink2}>
          Only 26 states in America require education in financial literacy for children, as of 2024.
        </figcaption>
      </figure>
    </div>
  );
}

/** How a round plays: two parts and the result, as one row of cards. */
const PLAY: { step: string; title: string; does: string }[] = [
  {
    step: "Part 1",
    title: "Sort needs and wants",
    does: "Ten items fall one at a time. Steer each into Needs or Wants.",
  },
  {
    step: "Part 2",
    title: "Shop on a budget",
    does: "Put the needs on the belt within $20. Wants fit only if money is left.",
  },
  {
    step: "Result",
    title: "Up to three stars",
    does: "One star each for buying every need, sorting with one mistake or fewer, and staying in budget. Going over budget still wins, with one star fewer.",
  },
];

function GamePlay() {
  return (
    <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3 md:gap-8">
      {PLAY.map((p, i) => (
        <li key={p.step} className="relative flex flex-col rounded-[12px] p-5" style={{ boxShadow: `0 0 0 1px ${DIVIDER}` }}>
          <p className="m-0 uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
            {p.step}
          </p>
          <p className={`m-0 mt-1 ${H4}`} style={ink}>
            {p.title}
          </p>
          <p className={`m-0 mt-3 ${SM}`} style={ink2}>
            {p.does}
          </p>
          {i < PLAY.length - 1 && (
            <span aria-hidden="true" className="absolute hidden md:block" style={{ right: -26, top: "50%", translate: "0 -50%", color: MUTED }}>
              <svg width={20} height={14} viewBox="0 0 20 14">
                <path d="M1 7 H17 M12 2 L18 7 L12 12" stroke="currentColor" strokeWidth={1.5} fill="none" />
              </svg>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

const INTRO = (
  <div>
    <h1 className={`max-w-3xl ${TITLE}`}>Basket of Choices, a shopping game for kids</h1>
    <Facts items={META} />
    <div className="mt-8">
      <PrototypeLink href={GAME}>Play the prototype</PrototypeLink>
    </div>
  </div>
);

export const BILLY_AND_BUDDY_SECTIONS: CaseStudySection[] = [
  { id: "intro", title: "Intro", children: INTRO },
  {
    id: "tldr",
    title: "TL;DR",
    hideTitle: true,
    children: (
      <Band label="TL;DR">
        <p className={H3} style={ink}>
          Basket of Choices is a web game where children aged 4 to 7 sort a shopping list into needs and wants, then pay for it on a budget, with Billy reacting to every choice.
        </p>
        <P className="mt-4">
          It belongs to Billy &amp; Buddy, a book subscription that teaches young children about money and replays each book's lesson in games on its website. Research on young children finds that money habits are typically formed by about age seven, yet where American schools require personal finance, it is a high school course. The game gives the younger age something to practise, in a situation they recognise.
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
          {SCENES.map((s) => (
            <ClipRow key={s.clip} clip={`${ART}/clips/${s.clip}`} label={s.label} text={s.text} ratio={CLIP_RATIO} />
          ))}
        </div>
        <div className="mt-16">
          <PrototypeLink href={GAME} outline>
            Play the prototype
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
        <ProblemBody />
      </Band>
    ),
  },
  {
    id: "service",
    title: "The Service",
    children: (
      <div>
        <P className="mb-2 max-w-2xl">Billy &amp; Buddy is a proposed service designed by the team: a book every quarter, read together at home, with a game on its website for each book.</P>
        <BillyServiceStory />
      </div>
    ),
  },
  {
    id: "process",
    title: "Design Process",
    children: (
      <div className="space-y-16">
        {DECISIONS.map((d) => (
          <Decision key={d.title} title={d.title} ratio={d.ratio} before={d.before} after={d.after} inset={d.inset} />
        ))}
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome",
    children: (
      <div className="space-y-20">
        <div>
          <SectionHead title="Book: Volume 1" />
          <BillyBook />
        </div>
        <div>
          <SectionHead title="Game: Basket of Choices" />
          <div className="mb-10">
            <GamePlay />
          </div>
          <Clip src={`${ART}/hero/loop`} label="Video: a full round of Basket of Choices, from the menu to the victory screen" ratio={CLIP_RATIO} />
          <div className="mt-8">
            <PrototypeLink href={GAME} outline>
              Play the prototype
            </PrototypeLink>
          </div>
        </div>
      </div>
    ),
  },
  { id: "next-steps", title: "Next Steps", children: <NextCards items={NEXT} /> },
  {
    id: "ai",
    title: "AI",
    children: (
      <div className="max-w-3xl">
        <P>
          I designed the game in Figma, then used Claude Code to turn the frames into a playable prototype. I played every round myself to check its rules against the design.
        </P>
      </div>
    ),
  },
  {
    id: "credits",
    title: "Credits",
    children: (
      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-10">
        <ul className="m-0 list-none space-y-2 p-0">
          {CREDITS.map(([role, who]) => (
            <li key={role} className={MD} style={ink2}>
              {role} - <span style={ink}>{who}</span>
            </li>
          ))}
        </ul>
        <img src={`${ART}/team.jpg`} alt="The Billy & Buddy team, four designers, in front of a brick wall." loading="lazy" className="block w-full rounded-[12px]" />
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["bind-desk", "greenera"]} />,
  },
];
