import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { ArrowIcon } from "../organized/ArrowIcon";
import { COPYRIGHT } from "../organized/SiteFooter";
import { MONO, RelatedProjects } from "./caseStudyBits";
import { Button } from "./Button";
import { COLOR, OVERLINE, TYPE } from "./tokens";

/**
 * The Bind Desk case study, authored as CaseStudy sections.
 *
 * A port of the project's original standalone case study site: the same
 * blocks in the same arrangement, the same copy (with the people named by
 * role only: "the operations director", "Assistant A", "Assistant B"), and
 * the same type sizes and card shapes. Only the colours and fonts are the
 * portfolio's: the `--cs-*` tokens (so it follows dark mode), Roboto Slab
 * for display lines, DM Sans for text and DM Mono for labels.
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
const FACE = COLOR.surfacePage;
/** Cards and full-bleed sections sit a step off the page. */
const SURFACE = COLOR.surfaceRaised;
/** Chart tracks and image wells. */
const WELL = COLOR.surfaceSunken;
const INK = COLOR.textPrimary;
const MUTED = COLOR.textSecondary;
const DIVIDER = COLOR.borderSubtle;

const DISPLAY = "font-['Roboto_Slab'] font-normal";
const MD = TYPE.body;
const SM = TYPE.bodySm;
const XS = TYPE.bodySm;
const STATEMENT = TYPE.headline;
const H3 = TYPE.title;
/** A card's heading: body size, medium weight. */
const H4 = `${TYPE.body} font-medium`;
const TITLE = TYPE.display;
const LABEL = OVERLINE;

/* ------------------------------ copy ------------------------------ */

const JOURNEY: { stage: string; happens: string; evidence: string; agrees: boolean; check: string }[] = [
  { stage: "Capture", happens: "Documents arrive by portal, email or fax.", evidence: "11 min to find them. 17 of 54 off-portal.", agrees: false, check: "Confirm uncertain matches." },
  { stage: "Triage", happens: "Open work, most urgent first.", evidence: "14 min before the first flag.", agrees: false, check: "Choose what to open." },
  { stage: "Review", happens: "Both documents side by side.", evidence: "35–38% have a mismatch, found by reading.", agrees: false, check: "Mark each difference." },
  { stage: "Resolve", happens: "Broker email drafted from real mismatches.", evidence: "“That can take days waiting on a reply.”", agrees: false, check: "Edit and send." },
  { stage: "Follow up", happens: "A row turns Overdue after its follow-up date.", evidence: "Median 2.1 days. 9 waited over 4.", agrees: false, check: "Chase, call or wait." },
  { stage: "Bind", happens: "Checklist, summary, then approval.", evidence: "Checklist: 3 min. “I know it cold.”", agrees: true, check: "Approve the bind." },
];

const EXPECTATIONS: string[][] = [
  ["Smart autofill", "Suggested values in missing-document gaps only", "Weak: one passing mention"],
  ["Cleaner interface", "The design itself", "No user evidence"],
  ["Mobile access", "One status list for chasing brokers", "No evidence of need"],
  ["AI chat assistant", "Held back", "Nobody described a question for it"],
  ["“Don’t touch the checklist”", "Unchanged", "Supported: 3 min"],
];

/* [CONFIRM] "AI helped sort the evidence" is still vague: say what it sorted and how it was checked. */
const AI_USE: [string, string][] = [
  ["Analysis", "I analyzed the logs, read the interviews for needs and mapped the journey. AI helped sort the evidence."],
  ["Product and design", "I defined the flow, where each human checkpoint sits, the layout and the brand, and tried several directions."],
  ["Build", "I built the prototype, with AI writing much of the code to the flow, states and checkpoints I set."],
];

/** Today's baseline from the brief's logs, what to measure, and the result that would count against the design. */
const EVALUATION: string[][] = [
  ["Finding documents", "11 min per submission. 17 of 54 off-portal.", "Time from arrival to a confirmed match", "Assistants search by hand anyway, or reject many matches"],
  ["Spotting mismatches", "14 min to the first flag. 35–38% have one.", "Time to first flag, and mismatches caught in a seeded set", "Assistants miss mismatches the tool highlighted, or override it often"],
  ["Chasing brokers", "Median reply 2.1 days. 9 waited over 4.", "Submissions waiting more than 4 days", "Overdue rows sit untouched"],
  ["Binding", "Checklist: 3 min.", "Checklist time stays flat", "The checklist gets slower"],
];

const NEXT_STEPS: [string, string][] = [
  ["Build the mismatch check first", "It covers the most frequent problem in the logs."],
  ["Test it on a seeded week", "Two or three assistants work the same submissions in the prototype and in the spreadsheet. Compare time to first flag and mismatches caught."],
  ["Let the answers set the scope", "The questions below decide how capture and follow-ups work."],
];

const QUESTIONS: { q: string; assumed: string; ifWrong: string; shapes: string }[] = [
  { q: "How do documents reach you?", assumed: "Portal, email and fax", ifWrong: "Build the main channel first, or add a broker upload link", shapes: "Pick documents up where they arrive" },
  { q: "Can faxes go to an inbox?", assumed: "Yes", ifWrong: "Scan upload becomes a core feature", shapes: "Pick documents up where they arrive" },
  { q: "When and how do you chase brokers?", assumed: "A follow-up date per policy, repeat emails", ifWrong: "Per-broker defaults and free-form drafts", shapes: "Make waiting visible" },
  { q: "Is there a rule for minor mismatches?", assumed: "No, so a person checks every flag", ifWrong: "Auto-classify minor differences", shapes: "The tool highlights, a person decides" },
];

/**
 * The redesign as moments in the order the work happens, each with the
 * evidence behind it, the human checkpoint it keeps and the clip or capture
 * that shows it.
 */
type Moment = {
  stage: string;
  title: string;
  decision: string;
  why: string;
  checkpoint: string;
  /** A clip recorded from the prototype, or a still. A still that isn't tall sits full width under its copy. */
  media: { clip: string; label: string } | { img: string; alt: string; tall?: boolean };
  /** The hypothesis the design rests on, and the fallback if it is wrong. */
  assumes?: string;
  ifWrong?: string;
};

const MOMENTS: Moment[] = [
  {
    stage: "Capture",
    title: "Pick documents up where they already arrive",
    decision: "A capture panel reads the inbox and portal notices, and only reads. It matches each document to its application, and when a match is unsure it says so and asks.",
    why: "About a third of submissions arrive off the portal, and finding documents is the longest step before review.",
    // [RATIONALE NEEDED] why 80%.
    checkpoint: "You confirm any match under 80%.",
    media: { clip: "scenario-c", label: "Video: the capture panel confirms a 40% match" },
    assumes: "Assumes the panel can read the inbox or portal.",
    ifWrong: "If not, drag-and-drop or a scan folder.",
  },
  {
    stage: "Triage",
    title: "Group the week by what blocks binding",
    decision: "Home groups work as Mismatch, Missing, Overdue and Waiting, and each row says what to do next, so it reads as a to-do list, not a report.",
    why: "Assistant A reached their first flag 14 minutes in. Blocking work now sits at the top.",
    checkpoint: "You choose what to open.",
    media: { img: "home", alt: "The Home screen, with the week's applications grouped into Mismatch, Missing and Overdue bands, each row ending in a next step." },
  },
  {
    stage: "Review",
    title: "The tool highlights, a person decides",
    decision: "Both documents sit side by side with differences highlighted. The tool never decides: a person marks every difference real or acceptable.",
    why: "More than a third of submissions have a mismatch, and today they’re found by careful reading.",
    checkpoint: "You mark each difference.",
    media: { clip: "scenario-a", label: "Video: a mismatch is marked real and the broker email is edited" },
    assumes: "Assumes every flag needs a person.",
    ifWrong: "If not, minor differences are auto-classified.",
  },
  {
    stage: "Resolve",
    title: "Draft the email from your decisions",
    decision: "The draft cites the exact values you marked, and nothing leaves the company until you press Send.",
    why: "A broker reply takes days, so the first email has to ask the right question.",
    checkpoint: "You edit and send.",
    media: { img: "email", alt: "A drafted email to the broker quoting the certificate and application values, with Edit and Send buttons." },
  },
  {
    stage: "Follow up",
    title: "Make waiting visible",
    decision: "Each application carries its own follow-up date. When it passes, the row turns Overdue on Home.",
    why: "The median reply is 2.1 days, and 9 submissions waited more than four with nobody tracking them.",
    checkpoint: "You chase, call or wait.",
    media: { clip: "scenario-d", label: "Video: Harbor Line moves from Waiting to Overdue" },
    assumes: "Assumes a date per policy is enough.",
    ifWrong: "If some brokers are always slow, the default is set per broker.",
  },
  {
    stage: "Bind",
    title: "Autofill, kept to the gaps",
    decision: "When a document is missing, the gap shows in place on the checklist with suggested values.",
    why: "Autofill had one passing mention in the interviews, so it gets the smallest role: suggestions in the gaps, and the checklist itself unchanged.",
    checkpoint: "You accept or dismiss each suggestion.",
    media: { clip: "scenario-b", label: "Video: one suggestion accepted, one dismissed" },
  },
  {
    stage: "Bind",
    title: "Show what was verified before an irreversible bind",
    decision: "A summary of every check comes before an explicit approval.",
    why: "Binding can’t be undone, and a missed mismatch “comes back to bite us later.”",
    checkpoint: "You approve the bind.",
    media: { clip: "scenario-e", label: "Video: a policy is approved and bound" },
  },
];

/* ------------------------------ parts ------------------------------ */

const ink = { color: INK };
const ink2 = { color: MUTED };
/* Components, as on madhurima.me/work/loan-servicing: 24px padding, a soft 12px radius,
 * no fill, held by a 1px ring rather than a border. */
const card = { background: "transparent", boxShadow: `0 0 0 1px ${DIVIDER}` };

/** The original's small uppercase eyebrow, in the portfolio's mono. */
function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p data-ui="Overline" data-src="src/pieces/bindDesk.tsx › Eyebrow" className={`uppercase ${className}`} style={{ ...LABEL, color: MUTED }}>
      {children}
    </p>
  );
}

/** A section's display title and lede, as the original's Section header. */
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

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 data-ui="Title" data-src="src/pieces/bindDesk.tsx › Sub" className={`mb-6 ${H3}`}>{title}</h4>
      {children}
    </div>
  );
}

/**
 * A band that breaks the page's flow: it runs the full width of the scrolling
 * column, past the body's side padding, with its own content back inside that
 * padding so the text still lines up with everything else.
 */
const BODY_PAD = "clamp(24px, 6vw, 110.816px)";
function Band({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
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
      {title ? <h4 data-ui="Headline" data-src="src/pieces/bindDesk.tsx › Band" className={`mb-3 ${STATEMENT}`}>{title}</h4> : null}
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

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A silent looping clip recorded from the prototype, playing only while on
 * screen. With reduced motion it holds on its poster. With `href` the clip
 * is a link into the prototype, with the original's hover call to action.
 */
function Clip({ name, label, href }: { name: string; label: string; href?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
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
  const video = (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={`${ART}/${name}.jpg`}
      aria-label={href ? undefined : label}
      aria-hidden={href ? true : undefined}
      className="block aspect-[1440/900] w-full object-cover"
    >
      <source src={`${ART}/${name}.webm`} type="video/webm" />
      <source src={`${ART}/${name}.mp4`} type="video/mp4" />
    </video>
  );
  return (
    // Just the clip: no card surface, rule or well behind it.
    <div data-ui="Video" data-src="src/pieces/bindDesk.tsx › Clip" className="group relative overflow-hidden rounded-[12px]">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" aria-label={`${label} (opens in a new tab)`} className="block">
          {video}
          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-2 font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${XS}`}
            style={{ background: INK, color: FACE }}
          >
            Open the prototype <ArrowIcon size={13} />
          </span>
        </a>
      ) : (
        video
      )}
    </div>
  );
}

/** Lucide-style stroke icons, drawn inline so the page needs no icon package. */
function Icon({ d, size = 12 }: { d: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {d}
    </svg>
  );
}
const CHECK = <path d="M20 6 9 17l-5-5" />;
const ALERT = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </>
);

/* ---------------------------- the journey ---------------------------- */

type Stage = (typeof JOURNEY)[number];

/**
 * The journey as a map: stage names along a timeline, a row each for what
 * happens, the evidence and what the person does. A hollow dot is a gap; the
 * one filled dot, Bind, is where the design agrees and leaves the checklist alone,
 * so that column is lifted off the page.
 */
const MAP_ROWS: { label: string; get: (s: Stage) => string; strong?: boolean }[] = [
  { label: "What happens", get: (s) => s.happens },
  { label: "Evidence", get: (s) => s.evidence },
  { label: "You", get: (s) => s.check, strong: true },
];
const MAP_COLS = "84px repeat(6, minmax(0, 1fr))";

const Dot = ({ agrees }: { agrees: boolean }) => (
  <span
    aria-hidden
    className="relative z-10 block h-2.5 w-2.5 shrink-0 rounded-full"
    style={{ background: agrees ? INK : FACE, boxShadow: `0 0 0 2px ${INK}` }}
  />
);

const monoLabel = { ...ink2, fontFamily: MONO, letterSpacing: "0.4px" } as const;

/** One stage on the phone: the same rows, stacked under its name. */
function StageCard({ s }: { s: Stage }) {
  return (
    <>
      <p className="flex items-center gap-2 uppercase" style={{ ...monoLabel, color: INK, fontSize: 14 }}>
        <Dot agrees={s.agrees} />
        {s.stage}
      </p>
      <dl className="mt-4 space-y-3">
        {MAP_ROWS.map((r) => (
          <div key={r.label}>
            <dt className={`uppercase ${XS}`} style={monoLabel}>
              {r.label}
            </dt>
            <dd className={`mt-1 ${SM} ${r.strong ? "font-medium" : ""}`} style={r.strong ? ink : ink2}>
              {r.get(s)}
            </dd>
          </div>
        ))}
      </dl>
      {s.agrees ? (
        <p className={`mt-4 ${SM} font-medium`} style={ink}>
          Leave the checklist alone
        </p>
      ) : null}
    </>
  );
}

/**
 * The phone's journey: one stage at a time, swiped sideways. Each card hugs its
 * own content; only the centred card is filled and outlined, and the
 * neighbours peek in either side with neither.
 */
function JourneyCards() {
  const track = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState(0);
  /** Distance between two cards' left edges: the card's width plus the gap. */
  const stride = () => {
    const kids = track.current?.children;
    return kids && kids.length > 1 ? (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft : 0;
  };
  const go = (i: number) => track.current?.scrollTo({ left: i * stride(), behavior: "smooth" });
  return (
    <div data-ui="Carousel" data-src="src/pieces/bindDesk.tsx › JourneyCards" className="md:hidden">
      <ul
        ref={track}
        onScroll={(e) => {
          const st = stride();
          if (st) setAt(Math.round(e.currentTarget.scrollLeft / st));
        }}
        className="no-scrollbar m-0 flex list-none snap-x snap-mandatory items-start gap-3 overflow-x-auto p-0 px-[9%] [scroll-padding-inline:9%]"
        aria-label="Journey stages, swipe sideways"
      >
        {JOURNEY.map((s, i) => (
          <li key={s.stage} data-ui="Carousel item" data-src="src/pieces/bindDesk.tsx › JourneyCards" className="w-full shrink-0 snap-center" aria-label={`Stage ${i + 1} of ${JOURNEY.length}`}>
            <div
              data-ui="Card" data-src="src/pieces/bindDesk.tsx › JourneyCards"
              className="rounded-[12px] p-6 transition-[background-color,box-shadow] duration-200"
              style={at === i ? { background: SURFACE, boxShadow: `0 0 0 1px ${DIVIDER}` } : { background: "transparent", boxShadow: "0 0 0 1px transparent" }}
            >
              <StageCard s={s} />
            </div>
          </li>
        ))}
      </ul>
      <div data-ui="Pagination" data-src="src/pieces/bindDesk.tsx › JourneyCards" className="mt-4 flex justify-center gap-2" role="group" aria-label="Choose a stage">
        {JOURNEY.map((s, i) => (
          <button
            key={s.stage}
            type="button"
            onClick={() => go(i)}
            aria-label={`Stage ${i + 1}: ${s.stage}`}
            aria-current={at === i ? "true" : undefined}
            className="h-2 rounded-full p-0 transition-all duration-200"
            style={{ width: at === i ? 20 : 8, background: at === i ? INK : DIVIDER }}
          />
        ))}
      </div>
    </div>
  );
}

function Journey() {
  const last = JOURNEY.length - 1;
  /** The column the design agrees with is lifted: a soft panel, rounded top and bottom. */
  const lift = (i: number, row: number, rows: number) =>
    JOURNEY[i].agrees
      ? ({
          background: WELL,
          borderTopLeftRadius: row === 0 ? 12 : 0,
          borderTopRightRadius: row === 0 ? 12 : 0,
          borderBottomLeftRadius: row === rows - 1 ? 12 : 0,
          borderBottomRightRadius: row === rows - 1 ? 12 : 0,
        } as const)
      : undefined;
  const rows = MAP_ROWS.length + 2;
  return (
    <>
      <JourneyCards />
      <div data-ui="Timeline" data-src="src/pieces/bindDesk.tsx › Journey" className="hidden md:block">
        <div className="grid" style={{ gridTemplateColumns: MAP_COLS, columnGap: 8 }}>
          {/* Stage names, each with a tick down to its dot. */}
          <span />
          {JOURNEY.map((s, i) => (
            <div key={s.stage} className="px-2 pt-3" style={lift(i, 0, rows)}>
              <p className="uppercase" style={{ ...monoLabel, color: INK, fontSize: 13, lineHeight: "16px" }}>
                {s.stage}
              </p>
              <span aria-hidden className="mt-3 block h-4 w-px" style={{ background: INK }} />
            </div>
          ))}
          {/* The timeline: a hairline through every dot. */}
          <span className="relative h-5">
            <span aria-hidden className="absolute -right-1 left-0 top-1/2 h-px" style={{ background: DIVIDER }} />
          </span>
          {JOURNEY.map((s, i) => (
            <div key={s.stage} className="relative h-5 px-2" style={lift(i, 1, rows)}>
              <span aria-hidden className="absolute -left-1 top-1/2 h-px" style={{ background: DIVIDER, right: i === last ? 0 : -4 }} />
              <span className="absolute left-2 top-1/2 -translate-y-1/2">
                <Dot agrees={s.agrees} />
              </span>
            </div>
          ))}
          {MAP_ROWS.map((r, ri) => (
            <div key={r.label} className="contents">
              <p className={`pt-4 ${SM}`} style={{ ...ink, fontFamily: "'Roboto Slab', serif" }}>
                {r.label}
              </p>
              {JOURNEY.map((s, i) => (
                <p
                  key={s.stage}
                  className={`px-2 pt-4 ${SM} ${r.strong ? "font-medium" : ""}`}
                  style={{ ...(r.strong ? ink : ink2), ...lift(i, ri + 2, rows), paddingBottom: ri === MAP_ROWS.length - 1 ? 16 : 0 }}
                >
                  {r.get(s)}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 ${SM}`} style={ink2}>
        <span className="inline-flex items-center gap-2">
          <Dot agrees={false} /> A gap, not on the wishlist
        </span>
        <span className="inline-flex items-center gap-2">
          <Dot agrees /> Agrees: leave the checklist alone
        </span>
      </p>
    </>
  );
}

/* ------------------------------ charts ------------------------------ */

function Bar({
  label,
  value,
  max,
  display,
  inside,
  quiet = false,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  /** Text set inside the filled bar. The bar is never narrower than this text. */
  inside?: string;
  quiet?: boolean;
}) {
  return (
    <div data-ui="Bar" data-src="src/pieces/bindDesk.tsx › Bar" className={`flex items-center gap-3 ${SM}`}>
      <span className="w-[112px] shrink-0 sm:w-[150px]" style={ink2}>
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-6 flex-1 rounded-[4px]" style={{ background: WELL }}>
          <div
            className="flex h-6 items-center whitespace-nowrap rounded-[4px] px-2"
            style={{ width: `${(value / max) * 100}%`, minWidth: inside ? "max-content" : undefined, background: quiet ? MUTED : INK, color: FACE }}
          >
            {inside ? <span className={XS}>{inside}</span> : null}
          </div>
        </div>
        <span className="w-[56px] shrink-0 text-[14px]" style={{ ...ink, fontFamily: MONO }}>
          {display}
        </span>
      </div>
    </div>
  );
}

function MismatchChart() {
  return (
    <figure data-ui="Bar chart" data-src="src/pieces/bindDesk.tsx › MismatchChart" className="mt-6 rounded-[12px] p-6" style={card}>
      <figcaption className={`mb-4 font-medium ${SM}`}>Submissions with a mismatch, 30 days</figcaption>
      <div className="space-y-3">
        <Bar label="Assistant A" value={23} max={61} display="38%" inside="23 of 61" />
        <Bar label="Assistant B" value={19} max={54} display="35%" inside="19 of 54" />
        <Bar label="B’s guess" value={33} max={100} display="33%" inside="guess" quiet />
      </div>
    </figure>
  );
}

function MinutesChart() {
  return (
    <figure data-ui="Bar chart" data-src="src/pieces/bindDesk.tsx › MinutesChart" className="mt-6 rounded-[12px] p-6" style={card}>
      <figcaption className={`mb-4 font-medium ${SM}`}>Minutes per submission</figcaption>
      <div className="space-y-3">
        <Bar label="Find documents (Assistant B)" value={11} max={14} display="11 min" />
        <Bar label="First flag (Assistant A)" value={14} max={14} display="14 min" />
        <Bar label="Checklist (Assistant B)" value={3} max={14} display="3 min" quiet />
      </div>
    </figure>
  );
}

/* ------------------------------ table ------------------------------ */

/** A real table from md up. Below it each row stacks, with its own labels. */
function ResponsiveTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div data-ui="Data table" data-src="src/pieces/bindDesk.tsx › ResponsiveTable" className="overflow-hidden rounded-[12px]" style={card}>
      <table className={`w-full text-left ${SM}`}>
        <thead className={`hidden md:table-header-group ${XS}`} style={{ background: WELL, color: MUTED }}>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-6 py-3 font-medium" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="block px-6 py-4 md:table-row md:p-0" style={{ borderBottom: ri === rows.length - 1 ? "none" : `1px solid ${DIVIDER}` }}>
              {r.map((c, i) => (
                <td
                  key={i}
                  className={`block md:table-cell md:px-6 md:py-3 md:align-top ${i === 0 ? `${H4} md:w-[30%]` : "mt-1 md:mt-0"}`}
                  style={i === 0 ? ink : ink2}
                >
                  {i > 0 ? (
                    <span className={`mr-1 md:hidden ${XS}`} style={ink2}>
                      {head[i]}:
                    </span>
                  ) : null}
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ cards ------------------------------ */

function PhaseCards({ items, label }: { items: [string, string][]; label: string }) {
  return (
    <ol data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › PhaseCards" className="grid gap-6 md:grid-cols-3">
      {items.map(([title, rest], i) => (
        <li key={title} data-ui="Card" data-src="src/pieces/bindDesk.tsx › PhaseCards" className="rounded-[12px] p-6" style={card}>
          <p className={XS} style={{ ...ink2, fontFamily: MONO }}>
            {label} {i + 1}
          </p>
          <h5 className={`mt-1 ${H4}`}>{title}</h5>
          <p className={`mt-1 ${SM}`} style={ink2}>
            {rest}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------- moments ---------------------------- */

function QuestionCards() {
  return (
    <ol data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › QuestionCards" className="grid gap-6 md:grid-cols-2">
      {QUESTIONS.map((q, i) => (
        <li key={q.q} data-ui="Card" data-src="src/pieces/bindDesk.tsx › QuestionCards" className="flex flex-col rounded-[12px] p-6" style={card}>
          <span className={XS} style={{ ...ink2, fontFamily: MONO }}>
            Q{i + 1}
          </span>
          <p className={`mt-1 ${H4}`}>{q.q}</p>
          <dl className={`mt-3 flex-1 space-y-2 pt-3 ${SM}`} style={{ borderTop: `1px solid ${DIVIDER}` }}>
            {(
              [
                ["Assumed", q.assumed],
                ["If wrong", q.ifWrong],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <dt className="w-[88px] shrink-0" style={ink2}>
                  {k}
                </dt>
                <dd style={ink}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className={`mt-4 ${XS}`} style={ink2}>
            Shapes: <span className="font-medium">{q.shapes}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * A moment's copy beside its clip or tall capture. Alternate rows swap sides;
 * a wide capture sits full width under its copy. On the phone the copy comes first.
 */
function MomentCard({ m, i }: { m: Moment; i: number }) {
  const wide = "img" in m.media && !m.media.tall;
  const flip = !wide && i % 2 === 1;
  return (
    <article data-ui="Media object" data-src="src/pieces/bindDesk.tsx › MomentCard" className={`grid gap-6 md:items-center md:gap-10 ${wide ? "" : flip ? "md:grid-cols-[1.45fr_1fr]" : "md:grid-cols-[1fr_1.45fr]"}`}>
      <div className={flip ? "md:order-2" : ""}>
        <Eyebrow>{m.stage}</Eyebrow>
        <h4 className={`mt-2 ${STATEMENT}`}>{m.title}</h4>
        <div className={`mt-3 space-y-4 ${MD}`} style={ink2}>
          <p>
            <strong className="font-semibold" style={ink}>
              {m.decision}
            </strong>
          </p>
          <p>{m.why}</p>
          <p className={`border-l-2 pl-3 ${SM}`} style={{ ...ink2, borderColor: DIVIDER }}>
            Human checkpoint: <span style={ink}>{m.checkpoint}</span>
          </p>
          {m.assumes ? (
            <p className={SM} style={ink2}>
              {m.assumes} {m.ifWrong}
            </p>
          ) : null}
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        {"clip" in m.media ? (
          <Clip name={m.media.clip} label={m.media.label} />
        ) : (
          <div
            data-ui="Figure" data-src="src/pieces/bindDesk.tsx › MomentCard"
            className={`overflow-hidden rounded-[12px] ${m.media.tall ? "p-6 md:p-8" : ""}`}
            style={{ background: m.media.tall ? WELL : undefined, border: `1px solid ${DIVIDER}` }}
          >
            <img
              src={`${ART}/design/${m.media.img}.png`}
              alt={m.media.alt}
              loading="lazy"
              decoding="async"
              className={`block h-auto ${m.media.tall ? "mx-auto w-full max-w-[300px] rounded-[12px]" : "w-full"}`}
            />
          </div>
        )}
      </div>
    </article>
  );
}

/* ------------------------------ AI tag ------------------------------ */

type Review = "Needs your review" | "Confirmed by you" | "Automatic";

const AI_ICON: Record<string, ReactNode> = {
  "Document intelligence": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <circle cx="11.5" cy="14.5" r="2.5" />
      <path d="M13.3 16.3 15 18" />
    </>
  ),
  Agent: (
    <>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4M8 16h.01M16 16h.01" />
    </>
  ),
  Integration: <path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />,
  "Private environment": (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

/**
 * The prototype's AI tag: capability, what it did, review state, and "Why?".
 * The detail opens in place rather than as a floating popover, so it can
 * never run past the edge of the body column.
 */
function AiTag({
  variant,
  did,
  review,
  why,
}: {
  variant: string;
  did: string;
  review: Review;
  why: { evidence: string[]; confidence?: string; approval: string; audit: string[] };
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pill =
    review === "Confirmed by you"
      ? { background: INK, color: FACE, border: `1px solid ${INK}` }
      : review === "Needs your review"
        ? { color: INK, border: `1px solid ${INK}` }
        : { color: MUTED, border: `1px solid ${DIVIDER}` };
  const rows: [string, string[]][] = [
    ["Source evidence", why.evidence],
    ["Confidence", why.confidence ? [why.confidence] : []],
    ["Approval", [why.approval]],
    ["Audit trail", why.audit],
  ];
  return (
    <div className={`flex flex-col items-start gap-1 ${XS}`}>
      <span className="inline-flex items-center gap-1 font-medium" style={ink}>
        <Icon d={AI_ICON[variant]} size={13} />
        {variant}
      </span>
      <span style={ink2}>{did}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center rounded-full px-2 text-[14px] font-medium" style={pill}>
          {review}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="rounded px-1 font-medium underline decoration-dotted underline-offset-2"
          style={ink2}
        >
          Why?
        </button>
      </div>
      {open ? (
        <dl id={id} className="mt-2 w-full space-y-3 pt-2" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          {rows.map(([k, v]) =>
            v.length ? (
              <div key={k}>
                <dt className="mb-1 font-medium" style={ink}>
                  {k}
                </dt>
                {v.map((line) => (
                  <dd key={line} style={{ ...ink2, fontFamily: k === "Audit trail" ? MONO : undefined }}>
                    {line}
                  </dd>
                ))}
              </div>
            ) : null,
          )}
        </dl>
      ) : null}
    </div>
  );
}

const TAGS: { variant: string; did: string; review: Review; why: Parameters<typeof AiTag>[0]["why"] }[] = [
  {
    variant: "Document intelligence",
    did: "Compared 9 fields across 2 documents",
    review: "Needs your review",
    why: {
      evidence: ["Application: client portal", "Certificate of insurance: email attachment"],
      confidence: "Each occurrence: 98%",
      approval: "You mark each difference.",
      audit: ["9 fields compared, 2 differ"],
    },
  },
  {
    variant: "Agent",
    did: "Drafted the broker email from your decisions",
    review: "Confirmed by you",
    why: {
      evidence: ["Each occurrence: $1,000,000 vs $2,000,000"],
      approval: "Sent only after you pressed Send.",
      audit: ["Draft generated", "Edited and sent by you"],
    },
  },
  {
    variant: "Integration",
    did: "Reads attachments in the open web inbox",
    review: "Automatic",
    why: {
      evidence: ["Open web inbox"],
      approval: "Read-only. Nothing in the inbox is changed.",
      audit: ["5 messages scanned"],
    },
  },
  {
    variant: "Private environment",
    did: "Assumes documents stay inside the firm's own environment",
    review: "Automatic",
    why: {
      evidence: ["A deployment assumption, not built in the prototype"],
      approval: "Would be set by the firm's IT team.",
      audit: ["No compliance certification is claimed here"],
    },
  },
];

/* ------------------------------ sections ------------------------------ */

/**
 * The hero. CaseStudy renders this under the meta row in place of its
 * default title line: title, what kind of project this is, then the buttons.
 * The summary lives in the TL;DR band below, not here.
 */
const INTRO = (
  <div>
    <h1 className={`max-w-3xl ${TITLE}`}>
      Redesigning the brokerage workflow so assistants decide instead of hunt
    </h1>
    {/* [CONFIRM] timeline, and whether to say "solo". */}
    <p className={`mt-4 max-w-3xl ${SM}`} style={ink2}>
      Self-initiated concept · Fictional company, people and data · Working prototype, not yet tested with users
    </p>
    <div className="mt-6 flex flex-wrap gap-2">
      <PrototypeLink>Open the prototype</PrototypeLink>
      <PrototypeLink href={TOUR} outline>
        Start the guided tour
      </PrototypeLink>
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
        <p className={MD} style={ink2}>
          <strong className="font-semibold" style={ink}>
            The brief asks for a faster checklist.
          </strong>{" "}
          Its own logs show the checklist takes 3 minutes. So Bind Desk leaves
          it alone and redesigns the slow work around it, with a person
          approving every decision that matters.
        </p>
      </Band>
    ),
  },
  {
    id: "brief",
    title: "The Brief",
    children: (
      <div className="max-w-3xl">
        <SectionHead title="“Make the checklist faster”" />
        <p className={MD} style={ink2}>
          Bind Desk is set at a fictional 40-person insurance brokerage. Its
          assistants can’t bind a policy until every document is in and every
          coverage limit matches. The operations director asks for a faster
          checklist, and the team’s wishlist adds smart autofill, a cleaner
          interface, mobile access and an AI chat assistant.
        </p>
        {/* [CONFIRM] who wrote the brief and generated the logs and interview notes. */}
        <p className={`mt-4 ${MD}`} style={ink2}>
          The brief comes with 30 days of logs from the legacy checklist
          spreadsheet and notes from two assistant interviews, all fictional.
          I didn’t run new research. I analyzed what the brief provided and
          mapped the journey, then defined the flow, designed the interface and
          built the prototype.
        </p>
      </div>
    ),
  },
  {
    id: "evidence",
    title: "The Evidence",
    children: (
      <div className="space-y-16">
        <SectionHead
          title="The checklist is the fastest step"
          lede="Finding documents and reaching the first mismatch take longer, and broker replies take days."
        />
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Where the sources agree</Eyebrow>
            <p className={`mt-3 ${STATEMENT}`}>Mismatches are frequent.</p>
            <p className={`mt-3 ${MD}`} style={ink2}>
              Assistant B guessed &ldquo;maybe a third&rdquo;. The logs show 35&ndash;38%.
            </p>
            <MismatchChart />
          </div>
          <div>
            <Eyebrow>Where they disagree</Eyebrow>
            <p className={`mt-3 ${STATEMENT}`}>Assistant A wants autofill. Their log points elsewhere.</p>
            <p className={`mt-3 ${MD}`} style={ink2}>
              Their time goes to mismatches and broker waits.
            </p>
            <MinutesChart />
          </div>
        </div>
        <Sub title="Today’s journey">
          <Journey />
        </Sub>
      </div>
    ),
  },
  {
    id: "reframe",
    title: "The Reframe",
    hideTitle: true,
    children: (
      <div className="space-y-16">
        <Band label="The reframe" title="Leave the checklist alone">
          <p className={MD} style={ink2}>
            Speeding up a 3-minute step would save little. The time goes to the
            steps around it, so I kept the checklist as it is and gave every
            wishlist item a place sized to its evidence.
          </p>
        </Band>
        <Sub title="Every wishlist item, sized to its evidence">
          <ResponsiveTable head={["Asked for", "How it appears", "Evidence"]} rows={EXPECTATIONS} />
        </Sub>
        <div className="max-w-3xl">
          <Eyebrow>Pushback in the brief</Eyebrow>
          <p className={`mt-3 ${STATEMENT}`}>
            “Our users asked for the wishlist. Why are you showing me something else?”
          </p>
          <p className={`mt-3 ${MD}`} style={ink2}>
            <strong className="font-semibold" style={ink}>
              My answer: the checklist is 3 minutes of the work.
            </strong>{" "}
            Nothing on the wishlist is dropped without a reason in the table above.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "checkpoints",
    title: "Human Checkpoints",
    children: (
      <div>
        <SectionHead
          title="The tool proposes, a person decides"
          lede="Every AI output in the prototype carries a tag: what it did, whether a person has reviewed it, and why. Nothing irreversible happens on its own: no email leaves and no policy binds without a person."
        />
        <ul data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › section checkpoints" className="m-0 grid list-none gap-6 p-0 md:grid-cols-2">
          {TAGS.map((t) => (
            <li key={t.variant} data-ui="Tag (AI disclosure)" data-src="src/pieces/bindDesk.tsx › section checkpoints" className="rounded-[12px] p-6" style={card}>
              <AiTag {...t} />
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "design",
    title: "The Design",
    children: (
      <div>
        <SectionHead
          title="Seven moments, in the order the work happens"
          lede="Each follows a stage of the journey above. The videos are recorded from the prototype."
        />
        <div className="space-y-16">
          {MOMENTS.map((m, i) => (
            <MomentCard key={m.title} m={m} i={i} />
          ))}
        </div>
        <div className="mt-16">
          <PrototypeLink>
            Try the prototype <ArrowIcon size={16} />
          </PrototypeLink>
        </div>
      </div>
    ),
  },
  {
    id: "evaluation",
    title: "Evaluation",
    children: (
      <div className="space-y-16">
        <div>
          <SectionHead
            title="How I’d know it works"
            lede="Bind Desk hasn’t been tested with assistants. These are the measures I’d compare against the brief’s logs, and the results that would tell me the design is wrong."
          />
          <ResponsiveTable head={["Area", "Today", "Measure", "Would count against it"]} rows={EVALUATION} />
        </div>
        <div>
          <SectionHead title="Build the mismatch check first" lede="Start where the evidence is strongest. The next round decides the rest." />
          <PhaseCards items={NEXT_STEPS} label="Step" />
        </div>
        <div>
          <SectionHead title="What I still need to learn" lede="Each answer confirms the design or changes one part of it." />
          <QuestionCards />
        </div>
      </div>
    ),
  },
  /* [CONFIRM] A reflection section ("What I'd do differently") belongs here, in your words. */
  {
    id: "how-i-used-ai",
    title: "How I Used AI",
    children: (
      <div>
        <SectionHead
          title="How I used AI"
          lede={
            <>
              <strong className="font-semibold" style={ink}>
                I made the design decisions.
              </strong>{" "}
              AI helped me carry them out.
            </>
          }
        />
        <PhaseCards items={AI_USE} label="Area" />
      </div>
    ),
  },
  {
    id: "also-checkout",
    title: "Also checkout",
    inRail: false,
    children: <RelatedProjects slugs={["greenera", "billy-and-buddy"]} />,
  },
  {
    id: "rights",
    title: "Rights",
    hideTitle: true,
    inRail: false,
    children: (
      <div className={`flex flex-col gap-2 pt-6 ${SM}`} style={{ borderTop: `1px solid ${DIVIDER}`, color: MUTED }}>
        <p>{COPYRIGHT}</p>
        <p className={XS}>Company, people and data in this case study are fictional.</p>
      </div>
    ),
  },
];
