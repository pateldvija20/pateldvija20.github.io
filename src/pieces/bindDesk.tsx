import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { ArrowIcon } from "../organized/ArrowIcon";
import { COPYRIGHT } from "../organized/SiteFooter";
import { MONO, RelatedProjects } from "./caseStudyBits";
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

const JOURNEY: { stage: string; happens: string; evidence: string; agrees: boolean; fitNote: string; check: string }[] = [
  { stage: "Capture", happens: "Documents arrive by portal, email or fax.", evidence: "11 min to find them. 17 of 54 off-portal.", agrees: false, fitNote: "Not on the wishlist", check: "Confirm uncertain matches." },
  { stage: "Triage", happens: "Open work, most urgent first.", evidence: "14 min before the first flag.", agrees: false, fitNote: "Not on the wishlist", check: "Choose what to open." },
  { stage: "Review", happens: "Both documents side by side.", evidence: "35–38% have a mismatch, found by reading.", agrees: false, fitNote: "Not on the wishlist", check: "Mark each difference." },
  { stage: "Resolve", happens: "Broker email drafted from real mismatches.", evidence: "“That can take days waiting on a reply.”", agrees: false, fitNote: "Not on the wishlist", check: "Edit and send." },
  { stage: "Follow up", happens: "A row turns Overdue after its follow-up date.", evidence: "Median 2.1 days. 9 waited over 4.", agrees: false, fitNote: "Not on the wishlist", check: "Chase, call or wait." },
  { stage: "Bind", happens: "Checklist, summary, then approval.", evidence: "Checklist: 3 min. “I know it cold.”", agrees: true, fitNote: "Leave the checklist alone", check: "Approve the bind." },
];

const EXPECTATIONS: string[][] = [
  ["Smart autofill", "Suggested values in missing-document gaps only", "Weak: one passing mention"],
  ["Cleaner interface", "The design itself", "No user evidence"],
  ["Mobile access", "One status list for chasing brokers", "No evidence of need"],
  ["AI chat assistant", "Held back", "Nobody described a question for it"],
  ["“Don’t touch the checklist”", "Unchanged", "Supported: 3 min"],
];

const AI_USE: [string, string][] = [
  ["Research", "I analyzed the logs, read the interviews for needs and mapped the journey. AI helped sort the evidence."],
  ["Product", "I defined the app flow and where each human checkpoint sits. AI helped build and test the prototype."],
  ["Design", "I set the layout and the brand, and tried several directions. AI helped turn them into code."],
];

const NEXT_STEPS: [string, string][] = [
  ["Ship mismatch detection", "It covers the most frequent problem."],
  ["Validate before expanding", "Compare time to first flag and broker wait against today’s logs."],
  ["Let the answers shape the next version", "The next-round questions set the scope for capture and follow-ups."],
];

const QUESTIONS: { q: string; assumed: string; ifWrong: string; shapes: string }[] = [
  { q: "How do documents reach you?", assumed: "Portal, email and fax", ifWrong: "Build the main channel first, or add a broker upload link", shapes: "Every document in one place" },
  { q: "Can faxes go to an inbox?", assumed: "Yes", ifWrong: "Scan upload becomes a core feature", shapes: "Every document in one place" },
  { q: "When and how do you chase brokers?", assumed: "One 2-day threshold, repeat emails", ifWrong: "Per-broker thresholds and free-form drafts", shapes: "See what’s stuck" },
  { q: "Is there a rule for minor mismatches?", assumed: "No, so a person checks every flag", ifWrong: "Auto-classify minor differences", shapes: "Catch mismatches side by side" },
];

type Scenario = {
  id: "c" | "d" | "a" | "b" | "e";
  title: string;
  pain: string;
  design: string;
  /** The human checkpoint. */
  decide: string;
  outcome: string;
  label: string;
  /** The hypothesis the design rests on, and the fallback if it is wrong. */
  assumes?: string;
  ifWrong?: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "c",
    title: "Every document in one place",
    pain: "Documents arrive by portal, email and fax.",
    design: "A browser panel matches each one to its application, replacing an 11-minute search.",
    decide: "You confirm any match under 80%.",
    outcome: "The hunt becomes a short review.",
    label: "Video: the capture panel confirms a 40% match",
    assumes: "Assumes the panel can read the inbox or portal.",
    ifWrong: "If not, drag-and-drop or a scan folder.",
  },
  {
    id: "d",
    title: "See what’s stuck",
    pain: "Nobody sees what’s waiting on a broker.",
    design: "Home flags a row Overdue when its follow-up date passes, against a 2.1-day median reply.",
    decide: "You chase, call or wait.",
    outcome: "Stalled work surfaces before day four.",
    label: "Video: Harbor Line moves from Waiting to Overdue",
    assumes: "Assumes one 2-day threshold fits most brokers.",
    ifWrong: "If not, it’s set per broker.",
  },
  {
    id: "a",
    title: "Catch mismatches side by side",
    pain: "Mismatches are caught only by careful reading.",
    design: "Both documents sit side by side with differences highlighted, and 35–38% of submissions have one.",
    decide: "You mark each one real or acceptable, then edit the email.",
    outcome: "Flags and broker emails come faster.",
    label: "Video: a mismatch is marked real and the broker email is edited",
    assumes: "Assumes every flag needs a person.",
    ifWrong: "If not, minor differences are auto-classified.",
  },
  {
    id: "b",
    title: "Fill a gap in place",
    pain: "A missing document stalls the checklist.",
    design: "The gap shows in place with suggested values.",
    decide: "You accept or dismiss each one.",
    outcome: "Autofill helps without changing the checklist.",
    label: "Video: one suggestion accepted, one dismissed",
  },
  {
    id: "e",
    title: "Bind with a final check",
    pain: "Binding can’t be undone.",
    design: "A summary of what was verified comes before approval, because a missed mismatch “comes back to bite us later.”",
    decide: "You confirm before the policy goes live.",
    outcome: "The riskiest step gets the most deliberate check.",
    label: "Video: a policy is approved and bound",
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

const BTN = `inline-flex h-10 items-center gap-1 rounded-full px-4 font-medium ${MD} transition-opacity duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4`;

/** Opens the prototype in its own tab. It is a separate app, not a page of this one. */
function PrototypeLink({ href = PROTOTYPE, children, outline = false }: { href?: string; children: ReactNode; outline?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-cursor-frame="pill"
      data-ui={outline ? "Button · outlined" : "Button · filled"} data-src="src/pieces/bindDesk.tsx › PrototypeLink"
      className={BTN}
      style={{
        outlineColor: INK,
        background: outline ? "transparent" : INK,
        color: outline ? INK : FACE,
        border: `1px solid ${outline ? MUTED : INK}`,
      }}
    >
      {children}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
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
          {s.fitNote}
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

function MinutesChart({ compact = false }: { compact?: boolean }) {
  return (
    <figure data-ui="Bar chart" data-src="src/pieces/bindDesk.tsx › MinutesChart" className={compact ? "mt-4" : "mt-6 rounded-[12px] p-6"} style={compact ? undefined : card}>
      {compact ? null : <figcaption className={`mb-4 font-medium ${SM}`}>Minutes per submission</figcaption>}
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

/* ---------------------------- scenarios ---------------------------- */

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

/** The copy beside its clip. Alternate rows swap sides; on the phone the copy comes first. */
function ScenarioCard({ s, flip }: { s: Scenario; flip: boolean }) {
  return (
    <article data-ui="Media object" data-src="src/pieces/bindDesk.tsx › ScenarioCard" className={`grid gap-6 md:items-center md:gap-10 ${flip ? "md:grid-cols-[1.45fr_1fr]" : "md:grid-cols-[1fr_1.45fr]"}`}>
      <div className={flip ? "md:order-2" : ""}>
        <h4 className={STATEMENT}>{s.title}</h4>
        <div className={`mt-3 space-y-4 ${MD}`} style={ink2}>
          <p>
            <strong className="font-semibold" style={ink}>
              {s.pain}
            </strong>{" "}
            {s.design}
          </p>
          <p>
            <span style={ink}>{s.decide}</span> {s.outcome}
          </p>
          {s.assumes ? (
            <p className={`border-l-2 pl-3 ${SM}`} style={{ ...ink2, borderColor: DIVIDER }}>
              {s.assumes} {s.ifWrong}
            </p>
          ) : null}
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <Clip name={`scenario-${s.id}`} label={s.label} />
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
    did: "Documents processed inside the firm's own environment",
    review: "Automatic",
    why: {
      evidence: ["Deployment choice made with the client"],
      approval: "Set by the client's IT team.",
      audit: ["No compliance certification is claimed here"],
    },
  },
];

/* ---------------------------- design decisions ---------------------------- */

/**
 * The key design decisions, taken from the prototype's own "Design decision"
 * panel (the text the demo shows on hover), each with a capture of the
 * component it is about. The scenarios above say what each scenario does; these
 * say why the interface is shaped the way it is.
 */
type Decision = {
  title: string;
  /** The decision, as the prototype words it. */
  decision: string;
  /** The evidence behind it. */
  why: string;
  /** The human checkpoint it keeps. */
  checkpoint: string;
  /** Which AI tags (indexes into TAGS) this decision carries, shown as small callouts. */
  ai?: number[];
  img: string;
  alt: string;
  /** Tall captures sit narrow, centred on a well, rather than stretched wide. */
  tall?: boolean;
};

const DECISIONS: Decision[] = [
  {
    title: "Group the week by what blocks binding",
    decision: "Home groups work as Mismatch, Missing, Overdue and Waiting, and each row says in words what to do next, so the list reads as a to-do list, not a report.",
    why: "It took 14 minutes to reach the first flag. Mismatches and stuck brokers now surface before routine work.",
    checkpoint: "You choose what to open.",
    img: "home",
    alt: "The Home screen, with the week's applications grouped into Mismatch, Missing and Overdue bands, each row ending in a next step.",
  },
  {
    title: "Pick documents up where they already arrive",
    decision: "A capture panel reads the inbox and portal notices, and only reads. When a match is unsure it says so and asks.",
    why: "17 of 54 submissions arrived off the portal, and finding them took 11 minutes.",
    checkpoint: "You confirm any match under 80%.",
    ai: [2, 3],
    img: "capture",
    alt: "The capture panel listing four documents found in an inbox, one at 40% confidence marked Needs review.",
    tall: true,
  },
  {
    title: "The tool highlights, a person decides",
    decision: "Both values sit side by side. The tool only highlights; a person marks every difference real or acceptable.",
    why: "35–38% of submissions have a mismatch, and today it is found by careful reading.",
    checkpoint: "You mark each difference.",
    ai: [0],
    img: "differences",
    alt: "The Differences column, showing each occurrence of $2,000,000 against $1,000,000 and a Real mismatch or Acceptable choice.",
    tall: true,
  },
  {
    title: "Draft the email from your decisions",
    decision: "The draft cites the exact values you marked, and nothing leaves the company until you press Send.",
    why: "Broker replies already take days, so the first email has to be right.",
    checkpoint: "You edit and send.",
    ai: [1],
    img: "email",
    alt: "A drafted email to the broker quoting the certificate and application values, with Edit and Send buttons.",
  },
  {
    title: "Make waiting visible",
    decision: "Waiting shows on the application, and the threshold is set per policy. You choose to chase, call or wait.",
    why: "The median reply is 2.1 days, and 9 submissions waited over 4.",
    checkpoint: "You chase, call or wait.",
    img: "followup",
    alt: "The follow-up step of an application, showing how long the broker has been silent and the options to follow up or call.",
  },
  {
    title: "Show what was verified before an irreversible bind",
    decision: "Binding can’t be undone, so a summary shows what was verified and asks for explicit approval.",
    why: "A missed mismatch “comes back to bite us later.”",
    checkpoint: "You approve the bind.",
    img: "bind",
    alt: "A verification summary of four checks beside a Ready to bind card with an Approve and bind button.",
  },
];

function DecisionCard({ d, i }: { d: Decision; i: number }) {
  return (
    <article data-ui="Media object" data-src="src/pieces/bindDesk.tsx › DecisionCard" className={`grid gap-6 md:items-center md:gap-10 ${d.tall ? (i % 2 ? "md:grid-cols-[1.45fr_1fr]" : "md:grid-cols-[1fr_1.45fr]") : ""}`}>
      <div className={d.tall && i % 2 ? "md:order-2" : ""}>
        <Eyebrow>Decision {i + 1}</Eyebrow>
        <h4 className={`mt-2 ${STATEMENT}`}>{d.title}</h4>
        <div className={`mt-3 space-y-4 ${MD}`} style={ink2}>
          <p>
            <strong className="font-semibold" style={ink}>
              {d.decision}
            </strong>
          </p>
          <p>{d.why}</p>
          <p className={`border-l-2 pl-3 ${SM}`} style={{ ...ink2, borderColor: DIVIDER }}>
            Human checkpoint: <span style={ink}>{d.checkpoint}</span>
          </p>
          {d.ai?.map((n) => (
            <div key={TAGS[n].variant} data-ui="Tag (AI disclosure)" data-src="src/pieces/bindDesk.tsx › DecisionCard" className="rounded-[12px] p-3" style={{ background: SURFACE, border: `1px solid ${DIVIDER}` }}>
              <p className={`mb-2 uppercase ${XS}`} style={{ ...ink2, fontFamily: MONO }}>
                AI tag
              </p>
              <AiTag {...TAGS[n]} />
            </div>
          ))}
        </div>
      </div>
      <div className={d.tall && i % 2 ? "md:order-1" : ""}>
        <div
          data-ui="Figure" data-src="src/pieces/bindDesk.tsx › DecisionCard"
          className={`overflow-hidden rounded-[12px] ${d.tall ? "p-6 md:p-8" : ""}`}
          style={{ background: d.tall ? WELL : undefined, border: `1px solid ${DIVIDER}` }}
        >
          <img
            src={`${ART}/design/${d.img}.png`}
            alt={d.alt}
            loading="lazy"
            decoding="async"
            className={`block h-auto ${d.tall ? "mx-auto w-full max-w-[300px] rounded-[12px]" : "w-full"}`}
          />
        </div>
      </div>
    </article>
  );
}

/* ------------------------------ sections ------------------------------ */

/**
 * The hero. CaseStudy renders this under the meta row in place of its
 * default title line: title on the left, buttons on the right, then the loop.
 * The summary lives in the TL;DR card below, not here.
 */
const INTRO = (
  <div>
    <div>
      <h1 className={`max-w-3xl ${TITLE}`}>
        Redesigning the brokerage workflow so assistants decide instead of hunt
      </h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <PrototypeLink>Open the prototype</PrototypeLink>
        <PrototypeLink href={TOUR} outline>
          Start the guided tour
        </PrototypeLink>
      </div>
    </div>
    <div className="mt-16">
      <Clip name="bind-desk" label="Open the prototype: product walkthrough video" href={PROTOTYPE} />
    </div>
  </div>
);

const OUTCOME: string[][] = [
  ["Finding documents", "11 min to find them. 17 of 54 off-portal.", "The hunt becomes a short review of matches."],
  ["Spotting mismatches", "14 min before the first flag. 35–38% have one.", "Flags and broker emails come faster."],
  ["Chasing brokers", "Median reply 2.1 days. 9 waited over 4.", "Stalled work surfaces before day four."],
  ["Binding", "Checklist: 3 min, and people know it cold.", "Unchanged, with a final check before approval."],
];

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
            The operations director asked for a faster checklist.
          </strong>{" "}
          The logs show the checklist takes 3 minutes. Bind Desk leaves it alone
          and fixes the slow work around it, with a person approving each
          decision that matters.
        </p>
      </Band>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div>
        <SectionHead
          title="Five scenarios, one human checkpoint each"
          lede="Each scenario fixes one slow step. Each video is recorded from the prototype."
        />
        <div className="space-y-16">
          {SCENARIOS.map((s, i) => (
            <ScenarioCard key={s.id} s={s} flip={i % 2 === 1} />
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
    id: "overview",
    title: "Overview",
    children: (
      <div className="max-w-4xl">
        <p className={STATEMENT} style={ink}>
          Bind Desk is a prototype that redesigns the workflow of a 40-person
          brokerage, so assistants spend their time deciding instead of hunting
          for documents.
        </p>
        <p className={`mt-3 ${MD}`} style={ink2}>
          Assistants can’t bind a policy until every document is in and every
          coverage limit matches. I analyzed 30 days of logs from the legacy
          checklist spreadsheet, read two interviews and mapped the journey,
          then defined the flow and set the layout for an interactive prototype
          of five scenarios, each with one human checkpoint.
        </p>
      </div>
    ),
  },
  {
    id: "problem",
    title: "The Problem",
    hideTitle: true,
    children: (
      <div className="space-y-16">
        <Band label="The Problem" title="A fast checklist inside a slow week">
          <p className={MD} style={ink2}>
            At a 40-person brokerage, assistants can’t bind a policy until every
            document is in and every coverage limit matches. Two interviews and
            30 days of logs from the legacy checklist spreadsheet show where
            their time goes.
          </p>
          <p className={`mt-4 ${MD}`} style={ink2}>
            <strong className="font-semibold" style={ink}>
              The checklist is the fastest step.
            </strong>{" "}
            Finding documents and spotting mismatches take longer, and broker
            replies take days. About one in three submissions has a mismatch.
          </p>
        </Band>
        <Sub title="Today’s journey">
          <Journey />
        </Sub>
      </div>
    ),
  },
  {
    id: "findings",
    title: "Initial Findings",
    children: (
      <div className="space-y-16">
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

        <Sub title="Stakeholder expectations">
          <ResponsiveTable head={["Asked for", "How it appears", "Evidence"]} rows={EXPECTATIONS} />
        </Sub>

        <Band label="Pushback" title="“Our users asked for the wishlist. Why are you showing me something else?”">
          <p className={MD} style={ink2}>
            <strong className="font-semibold" style={ink}>
              The checklist is 3 minutes of the work.
            </strong>{" "}
            The rest of the week goes to the steps around it. Every wishlist
            item still has a place, sized to its evidence.
          </p>
          <div className="mt-6">
            <MinutesChart compact />
          </div>
        </Band>
      </div>
    ),
  },
  {
    id: "design-process",
    title: "Design Process",
    children: (
      <div className="space-y-16">
        <SectionHead
          title="Six decisions that shaped the interface"
          lede="Each one comes from the prototype’s own decision notes, with the evidence behind it and the human checkpoint it keeps. The AI proposes. A person decides, and every AI output is tagged with what it did and whether a person has reviewed it."
        />
        <div className="space-y-16">
          {DECISIONS.map((d, i) => (
            <DecisionCard key={d.title} d={d} i={i} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome",
    children: (
      <div>
        <SectionHead
          title="What should change, and how we’ll know"
          lede="Bind Desk is a prototype, so these are targets measured against today’s logs, not results."
        />
        <ul data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › section outcome" className="m-0 grid list-none gap-6 p-0 md:grid-cols-2">
          {OUTCOME.map(([area, today, change]) => (
            <li key={area} data-ui="Card" data-src="src/pieces/bindDesk.tsx › section outcome" className="rounded-[12px] p-6" style={card}>
              <h5 className={H4}>{area}</h5>
              <p className={`mt-3 ${SM}`} style={ink2}>
                <span style={{ ...ink, fontFamily: MONO }}>Today </span>
                {today}
              </p>
              <p className={`mt-2 ${SM}`} style={ink2}>
                <span style={{ ...ink, fontFamily: MONO }}>Expected </span>
                {change}
              </p>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "open-questions",
    title: "Next Steps",
    children: (
      <div className="space-y-16">
        <div>
          <SectionHead title="Ship the mismatch check first" lede="Start where the evidence is strongest. The next round decides the rest." />
          <PhaseCards items={NEXT_STEPS} label="Step" />
        </div>
        <div>
          <SectionHead title="What we still need to learn" lede="Each answer confirms the design or changes one part of it." />
          <QuestionCards />
        </div>
      </div>
    ),
  },
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
