import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { MONO, RelatedProjects } from "./caseStudyBits";
import { Button } from "./Button";
import { PhaseExplorer } from "./BindDeskPhases";
import { COLOR, OVERLINE, TYPE } from "./tokens";

/**
 * The Bind Desk case study, authored as CaseStudy sections.
 *
 * Order: TL;DR, five solution scenarios, insights (the journey map, played
 * stage by stage, and what the stakeholders expected), the problem, the design
 * process, the outcome (the same stages with Bind Desk), next steps and how AI
 * was used.
 * People are named by role only. Gaps only the author can fill are left on the
 * page as `Need` markers, never written around.
 *
 * The interactive prototype is a separate prebuilt app (its own router,
 * store and fonts) served from `public/bind-desk/`, so it is linked rather
 * than bundled. The clips under `public/assets/projects/bind-desk/` were
 * recorded from that same build.
 */

const ART = "/assets/projects/bind-desk";
const PROTOTYPE = "/bind-desk/#/prototype";
const TOUR = `${PROTOTYPE}?tour=1`;

/* Colour comes from the semantic tokens in index.css (light and dark), type
 * from the roles in tokens.ts. Local aliases keep the JSX short. */
/** Cards and full-bleed sections sit a step off the page. */
const SURFACE = COLOR.surfaceRaised;
/** Callouts and image wells. */
const WELL = COLOR.surfaceSunken;
const PAGE = COLOR.surfacePage;
const INK = COLOR.textPrimary;
const MUTED = COLOR.textSecondary;
const DIVIDER = COLOR.borderSubtle;
const YES = COLOR.statusPositive;
const NO = COLOR.statusNegative;

const MD = TYPE.body;
const SM = TYPE.bodySm;
const STATEMENT = TYPE.headline;
const H3 = TYPE.title;
/** A card's heading: body size, medium weight. */
const H4 = `${TYPE.body} font-medium`;
const TITLE = TYPE.display;
const LABEL = OVERLINE;
/**
 * The page's text rules, top to bottom:
 *   section label  mono caps 15px (LABEL), 12px above the section's content
 *   page title     slab 28px (TITLE)
 *   subsection     sans 22px medium (STATEMENT), 32px above what it introduces
 *   lead statement sans 18px medium (H3), the opening line of a band
 *   item title     sans 16px medium (H4), a card's or row's name
 *   body           sans 16px (MD), paragraphs
 *   small          sans 14px (SM), captions, card text, facts
 *   item label     mono caps 12px (ITEM_LABEL), labels inside a section
 */
const ITEM_LABEL = { ...OVERLINE, fontSize: 12 };

const ink = { color: INK };
const ink2 = { color: MUTED };
/* Components, as on madhurima.me/work/loan-servicing: 24px padding, a soft 12px radius,
 * no fill, held by a 1px ring rather than a border. */
const card = { background: "transparent", boxShadow: `0 0 0 1px ${DIVIDER}` };

/* ------------------------------ copy ------------------------------ */

/** The hero's three facts. */
const META: [string, string][] = [
  ["Timeline", "4 hours"],
  ["Role", "Product designer"],
  ["Scope", "2 to 3 screens"],
];

/** The brief's wishlist: what each item asked for, then why it did or did not make it in. */
const EXPECTATIONS: { item: string; included: boolean; asked: string; why: string }[] = [
  {
    item: "Smart autofill",
    included: true,
    asked: "Fill checklist fields automatically from the documents.",
    why: "Included in its smallest form: fields are filled from documents already on file, and the assistant accepts or corrects each value.",
  },
  { item: "Cleaner interface", included: true, asked: "A clearer screen than the spreadsheet assistants use today.", why: "Every screen in Bind Desk replaces the spreadsheet, so it needed no separate work." },
  {
    item: "Leave the checklist alone",
    included: true,
    asked: "Keep the checklist exactly as the assistants know it.",
    why: "Assistant A said it works, and it took Assistant B 3 minutes, so no steps were added or removed.",
  },
  {
    item: "Mobile access",
    included: false,
    asked: "Check and work on submissions from a phone.",
    why: "Neither the interviews nor the logs showed anyone needing to work away from the desk.",
  },
  { item: "AI chat assistant", included: false, asked: "Ask an assistant questions about a submission.", why: "No one described a question they would ask it." },
];

/**
 * The solution, in the order a submission moves: one paragraph per step, with
 * the part that says what Bind Desk does highlighted.
 */
type Scenario = { text: string; clip: string; label: string; need?: string };

const SCENARIOS: Scenario[] = [
  {
    text: "The extension gathers **inbox, fax, and portal documents, allocates them to policies**, and flags uncertain matches for confirmation. This reduces time spent finding documents across different sources and lets reviewers move directly to review.",
    clip: "scenario-c",
    label: "Video: the capture panel matches documents and asks about a 40% match",
  },
  {
    text: "Each policy has a checklist of required documents and fields. The **extension updates checklists, flags missing items, drafts broker requests, and fills empty fields** for the assistant to confirm or correct.",
    clip: "scenario-b",
    label: "Video: a value read off the application is corrected, then accepted",
  },
  {
    text: "The application and insurance documents are compared side by side, with **differences highlighted for the assistant to correct. An autogenerated email to communicate with the broker for confirmed corrections**.",
    clip: "scenario-a",
    label: "Video: a mismatch is marked real and the broker email is edited",
  },
  {
    text: "Broker requests often wait 2.1 days without follow-up. **Overdue submissions appear on the home screen**, helping assistants decide when to follow up or wait.",
    clip: "scenario-d",
    label: "Video: Harbor Line moves from Waiting to Overdue on Home",
  },
  {
    text: "Since binding cannot be undone, **a summary of all checks appears for human approval before a policy is bound**, helping prevent missed mismatches and uncovered claims.",
    clip: "scenario-e",
    label: "Video: a policy is approved and bound",
  },
];

/** Two decisions from the review rounds, each as the first build and what replaced it. */
const DECISIONS: { title: string; ratio: string; before: { src: string; alt: string; text: string }; after: { src: string; alt: string; text: string } }[] = [
  {
    title: "Status as a column, then status as the grouping",
    ratio: "2432 / 1440",
    before: {
      src: `${ART}/process/home-before.jpg`,
      alt: "The first home table: five columns, Status, Submission, Reason, Broker and Next step, with a coloured status pill on every row.",
      text: "Five columns, with a status label on every row, made every row look equally urgent.",
    },
    after: {
      src: `${ART}/process/home-after.jpg`,
      alt: "The current home table: three columns, with rows grouped under Mismatch, Missing and Overdue bands.",
      text: "Status became the grouping, so the table dropped to three columns with the action in the next step.",
    },
  },
  {
    title: "Separate tabs, then one flow",
    ratio: "1.3 / 1",
    before: {
      src: `${ART}/process/policy-before.jpg`,
      alt: "The earlier policy page: Checklist, Docs, Follow-up and Bind as tabs, open on Docs.",
      text: "Tabs opened on the problem and hid the rest of the checklist.",
    },
    after: {
      src: `${ART}/process/policy-after.jpg`,
      alt: "The current policy page: the checklist, document mismatch, follow-up and final review as steps on one page.",
      text: "One page shows the four steps in order, and each turns into a tick when it is done.",
    },
  },
];

/** What comes next, one card each: build and test, what to measure, what to clarify, what each answer changes. */
const NEXT: { label: string; text: string }[] = [
  { label: "Build and test", text: "Prioritize mismatch detection, the most common issue in the logs. Test the prototype against the existing spreadsheet using sample submissions from 2 to 3 assistants." },
  { label: "Measure", text: "Track document-matching time, mismatches detected, and submissions pending beyond four days." },
  { label: "Clarify", text: "Ask the brokerage about paper/fax submissions, rules for minor mismatches, and current broker follow-up processes." },
  { label: "What changes", text: "Use the findings to improve scan uploads, automate minor mismatch handling, and set broker-specific follow-up reminders." },
];

/* ------------------------------ parts ------------------------------ */

/** The small uppercase eyebrow, in the portfolio's mono. */
function Eyebrow({ children, className = "", style, item = false }: { children: ReactNode; className?: string; style?: React.CSSProperties; item?: boolean }) {
  return (
    <p data-ui="Overline" data-src="src/pieces/bindDesk.tsx › Eyebrow" className={`uppercase ${className}`} style={{ ...(item ? ITEM_LABEL : LABEL), color: MUTED, ...style }}>
      {children}
    </p>
  );
}

/** A section's headline and lede. */
function SectionHead({ title, lede }: { title: string; lede?: ReactNode }) {
  return (
    <div data-ui="Section header" data-src="src/pieces/bindDesk.tsx › SectionHead" className="mb-8">
      <h3 data-ui="Headline" data-src="src/pieces/bindDesk.tsx › SectionHead" className={`max-w-3xl ${STATEMENT}`}>{title}</h3>
      {lede ? (
        <p data-ui="Body" data-src="src/pieces/bindDesk.tsx › SectionHead" className={`mt-3 max-w-2xl ${MD}`} style={ink2}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}

const P = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`${MD} ${className}`} style={ink2}>
    {children}
  </p>
);
const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold" style={ink}>
    {children}
  </strong>
);

/**
 * A band that breaks the page's flow: it runs the full width of the scrolling
 * column, past the body's side padding, with its own content back inside that
 * padding so the text still lines up with everything else.
 */
const BODY_PAD = "clamp(24px, 6vw, 110.816px)";
function Band({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      data-ui="Full-bleed section" data-src="src/pieces/bindDesk.tsx › Band"
      className="py-10 md:py-12"
      style={{
        // `cqw` is the scroller's own width (CaseStudy makes it a size container).
        width: "100cqw",
        // Centred on the column whatever its own width: half the section, less half the container.
        marginLeft: "calc(50% - 50cqw)",
        // At least the body's side padding; on a wide screen the 800px column is centred,
        // so the text starts where that column does, in line with everything else.
        paddingInline: `max(${BODY_PAD}, calc(50cqw - 400px))`,
        background: SURFACE,
        borderBlock: `1px solid ${DIVIDER}`,
      }}
    >
      <p data-ui="Overline" data-src="src/pieces/bindDesk.tsx › Band" className="mb-3 uppercase" style={{ ...LABEL, color: MUTED }}>
        {label}
      </p>
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}

/** Opens the prototype in its own tab. It is a separate app, not a page of this one. */
function PrototypeLink({ href = PROTOTYPE, children, outline = false }: { href?: string; children: ReactNode; outline?: boolean }) {
  return (
    <Button href={href} target="_blank" rel="noreferrer" variant={outline ? "outlined" : "filled"}>
      {children}
      <span className="sr-only">(opens in a new tab)</span>
    </Button>
  );
}

/**
 * A gap only the author can fill, left visible on the page rather than written
 * around. Every one is greppable as `NEED`.
 */
function Need({ children }: { children: ReactNode }) {
  return (
    <span
      data-ui="Gap marker" data-src="src/pieces/bindDesk.tsx › Need"
      className={`inline-block rounded-[6px] px-2 py-1 ${SM}`}
      style={{ fontFamily: MONO, color: INK, border: `1px dashed ${MUTED}` }}
    >
      [{children}]
    </span>
  );
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A silent looping clip recorded from the prototype, playing only while on screen. With reduced motion it holds on its poster. */
function Clip({ name, label }: { name: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
    // React does not always set the muted property, and unmuted video may not autoplay.
    el.muted = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div data-ui="Video" data-src="src/pieces/bindDesk.tsx › Clip" className="overflow-hidden rounded-[12px]" style={{ border: `1px solid ${DIVIDER}` }}>
      <video ref={ref} muted loop playsInline preload="none" poster={`${ART}/${name}.jpg`} aria-label={label} className="block aspect-[1440/900] w-full object-cover">
        <source src={`${ART}/${name}.webm`} type="video/webm" />
        <source src={`${ART}/${name}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}

/* ------------------------- stakeholder expectations ------------------------- */

/**
 * The wishlist in two groups side by side, Included and Not included, each
 * named once. A group's rows share its colour as a quiet tint and a hairline
 * stroke. On the phone the groups stack.
 */
function Expectations() {
  const groups = [
    { title: "Included", included: true, c: YES },
    { title: "Not included", included: false, c: NO },
  ];
  return (
    <div className="grid items-start gap-8 md:grid-cols-2 md:gap-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-3 flex items-center gap-2 uppercase" style={{ ...ITEM_LABEL, color: g.c }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {g.included ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
            </svg>
            {g.title}
          </p>
          <ul data-ui="List" data-src="src/pieces/bindDesk.tsx › Expectations" className="list-none space-y-3 p-0">
            {EXPECTATIONS.filter((e) => e.included === g.included).map((e) => (
              <li
                key={e.item}
                data-ui="Row" data-src="src/pieces/bindDesk.tsx › Expectations"
                className="rounded-[12px] p-4"
                style={{
                  background: `color-mix(in srgb, ${g.c} 5%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${g.c} 35%, transparent)`,
                }}
              >
                <p className={H4} style={ink}>
                  {e.item}
                </p>
                <p className={`mt-1 ${SM}`} style={ink2}>
                  {e.asked} {e.why}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- solution ---------------------------- */

/** Copy with its key phrases marked `**like this**`: the phrases set bright and semibold, the rest left muted. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) => (i % 2 === 1 ? <Strong key={i}>{part}</Strong> : part))}
    </>
  );
}

/**
 * One scenario: its number and title across the top, then the clip and the two
 * short paragraphs side by side, centred on each other. On the phone they stack,
 * clip first.
 */
function ScenarioCard({ s }: { s: Scenario }) {
  return (
    <article data-ui="Media object" data-src="src/pieces/bindDesk.tsx › ScenarioCard">
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10">
        <div>
          <Clip name={s.clip} label={s.label} />
          {s.need ? (
            <p className="mt-3">
              <Need>{s.need}</Need>
            </p>
          ) : null}
        </div>
        <p className={MD} style={ink2}>
          <Marked text={s.text} />
        </p>
      </div>
    </article>
  );
}

/* ---------------------------- design process ---------------------------- */

type Version = { src: string; alt: string; text: string };

/**
 * One decision: its title, the caption and the switch on the left, and the
 * screen on the right, first version or now, one at a time. Stacked on a phone.
 * Both images stay mounted and cross-fade, so switching does not reflow the page.
 */
function Decision({ title, ratio, before, after }: { title: string; ratio: string; before: Version; after: Version }) {
  const [now, setNow] = useState(false);
  const versions: [string, Version, boolean][] = [
    ["First version", before, false],
    ["Now", after, true],
  ];
  return (
    <figure data-ui="Decision" data-src="src/pieces/bindDesk.tsx › Decision" className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
      <div className="md:w-[36%] md:shrink-0">
        <h3 className={`mb-3 ${STATEMENT}`}>{title}</h3>
        {/* Both captions take the same cell, so the longer one sets the height and switching does not move the page. */}
        <figcaption className={`mb-5 grid ${SM}`} style={ink2}>
          {versions.map(([label, v, isNow]) => (
            <span key={label} aria-hidden={now !== isNow} style={{ gridArea: "1 / 1", visibility: now === isNow ? "visible" : "hidden" }}>
              {v.text}
            </span>
          ))}
        </figcaption>
        <div role="tablist" aria-label="Version" className="inline-flex gap-1 rounded-full p-1" style={{ boxShadow: `0 0 0 1px ${DIVIDER}` }}>
          {versions.map(([label, , isNow]) => {
            const on = now === isNow;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setNow(isNow)}
                className="h-8 cursor-pointer rounded-full px-4 active:scale-[0.97]"
                style={{ ...ITEM_LABEL, textTransform: "uppercase", background: on ? INK : "transparent", color: on ? PAGE : MUTED, transition: "background-color 200ms ease, color 200ms ease, scale 160ms cubic-bezier(0.23, 1, 0.32, 1)" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-[12px]" style={{ border: `1px solid ${DIVIDER}`, background: WELL, aspectRatio: ratio }}>
        {versions.map(([label, v, isNow]) => (
          <img
            key={label}
            src={v.src}
            alt={v.alt}
            aria-hidden={now !== isNow}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 block h-full w-full object-cover object-left-top transition-opacity duration-300"
            style={{ opacity: now === isNow ? 1 : 0 }}
          />
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------ sections ------------------------------ */

/** The hero. CaseStudy renders this under the meta row in place of its default title line: the title, where it came from, and three facts in a row. */
const INTRO = (
  <div>
    <h1 className={`max-w-3xl ${TITLE}`}>
      Redesigning Bind Desk for faster, safer binding
    </h1>
    <dl data-ui="Facts" data-src="src/pieces/bindDesk.tsx › INTRO" className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
      {META.map(([k, v]) => (
        <div key={k}>
          <dt className="uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
            {k}
          </dt>
          <dd className={`m-0 mt-1 ${SM}`} style={ink}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
    <div className="mt-8">
      <PrototypeLink>Open the prototype</PrototypeLink>
    </div>
  </div>
);

export const BIND_DESK_SECTIONS: CaseStudySection[] = [
  {
    id: "intro",
    title: "Intro",
    children: INTRO,
  },
  {
    id: "tldr",
    title: "TL;DR",
    // The label sits inside the band, so the section draws no heading of its own.
    hideTitle: true,
    children: (
      <Band label="TL;DR">
        {/* The highlight statement leads; the explanation follows under it. */}
        <p className={H3} style={ink}>
          Bind Desk is a chrome extension and dashboard that gathers documents and flags issues, with employees verifying
          discrepancies and approving each binding.
        </p>
        <P className="mt-4">
          A commercial insurance brokerage helps businesses secure coverage for risks like property damage and liability.
          Before a policy becomes active, or is “bound,” employees verify required documents and coverage details against
          the client’s application. Research showed that finding documents and catching mismatches takes longer than
          completing the coverage checklist.
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
          {SCENARIOS.map((s) => (
            <ScenarioCard key={s.clip} s={s} />
          ))}
        </div>
        <div className="mt-16">
          <PrototypeLink href={TOUR} outline>
            Start the guided tour
          </PrototypeLink>
        </div>
      </div>
    ),
  },
  {
    id: "insights",
    title: "Insights",
    children: (
      <div className="space-y-16">
        {/* Today's work in five phases, one at a time. */}
        <PhaseExplorer mode="journey" title="Journey map" />
        <div>
          <SectionHead title="Stakeholder expectations" />
          <Expectations />
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
          <Marked text="Assistants spend valuable time **locating documents across multiple systems, detecting inconsistencies and missing files, and following up with brokers to collect the required documentation**, increasing the risk of **errors and coverage gaps during policy binding**." />
        </p>
      </Band>
    ),
  },
  {
    id: "process",
    title: "Design Decisions",
    children: (
      <div className="space-y-16">
        {DECISIONS.map((d) => (
          <Decision key={d.title} title={d.title} ratio={d.ratio} before={d.before} after={d.after} />
        ))}
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome",
    // The label travels inside the pinned explorer instead, so it stays on screen with it.
    hideTitle: true,
    children: <PhaseExplorer mode="outcome" eyebrow="Outcome" />,
  },
  {
    id: "next-steps",
    title: "Next Steps",
    children: (
      <ul data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › section next-steps" className="grid list-none gap-4 p-0 md:grid-cols-2">
        {NEXT.map((n) => (
          <li key={n.label} data-ui="Card" data-src="src/pieces/bindDesk.tsx › section next-steps" className="rounded-[12px] p-6" style={card}>
            <Eyebrow item>{n.label}</Eyebrow>
            <p className={`mt-2 ${SM}`} style={ink2}>
              <Marked text={n.text} />
            </p>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "ai",
    title: "AI",
    inRail: false,
    children: (
      <div className="max-w-3xl">
        <P>
          With four hours, designing every screen and then building a demo was not realistic. I used Claude Code to build
          the design directly as a working prototype, then used it myself, round by round, to find and fix problems.
        </P>
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["greenera", "billy-and-buddy"]} />,
  },
];
