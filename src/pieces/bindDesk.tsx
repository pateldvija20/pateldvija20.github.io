import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { MONO, RelatedProjects } from "./caseStudyBits";
import { Button } from "./Button";
import { COLOR, OVERLINE, TYPE } from "./tokens";

/**
 * The Bind Desk case study, authored as CaseStudy sections.
 *
 * Order: TL;DR, the problem, the journey today (where the evidence lives, as
 * callouts on each stage), what the stakeholders expected, five solution
 * scenarios, the design process, outcome, next steps and how AI was used.
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
const FACE = COLOR.surfacePage;
/** Cards and full-bleed sections sit a step off the page. */
const SURFACE = COLOR.surfaceRaised;
/** Callouts and image wells. */
const WELL = COLOR.surfaceSunken;
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

/**
 * Today's journey, one stage per solution scenario: what happens now, where it
 * hurts, the evidence behind that (each figure says whose log it came from),
 * and what the design has to do about it.
 */
const STAGES: { stage: string; today: string; pain: string; evidence: string[]; need: string }[] = [
  {
    stage: "Capture",
    today: "Documents arrive by client portal, email attachment or fax.",
    pain: "Assistants hunt across channels before any review can start.",
    evidence: ["Assistant B spent 11 minutes per submission finding documents.", "17 of Assistant B’s 54 submissions arrived outside the portal."],
    need: "Pick documents up where they already arrive.",
  },
  {
    stage: "Checklist",
    today: "Each submission is ticked off in the legacy checklist spreadsheet.",
    pain: "A policy cannot bind until every document is in, and a missing one only shows when someone checks.",
    evidence: ["The checklist itself took Assistant B 3 minutes.", "Assistant A: “the checklist itself is fine.”"],
    need: "Show the missing item in place, and ask the broker from there.",
  },
  {
    stage: "Review",
    today: "The application and the certificate are read side by side, by eye.",
    pain: "Mismatches are common, and they are found late, by careful reading.",
    evidence: ["23 of Assistant A’s 61 and 19 of Assistant B’s 54 submissions had a mismatch between documents: 38 and 35 percent.", "Assistant A reached their first flag 14 minutes into a submission."],
    need: "Highlight every difference, and let a person decide each one.",
  },
  {
    stage: "Follow up",
    today: "The assistant emails the broker and waits for a reply.",
    pain: "Nobody tracks how long a submission has been waiting.",
    evidence: ["Assistant A’s median wait for a broker reply was 2.1 days.", "Nine of their submissions waited more than four days."],
    need: "Make waiting visible, with a follow-up date per policy.",
  },
  {
    stage: "Bind",
    today: "A final check, then the policy binds.",
    pain: "Binding cannot be undone, and a missed mismatch surfaces months later as a coverage gap the firm cannot cover.",
    evidence: ["One assistant on a missed mismatch: it “comes back to bite us later.”"],
    need: "Show what was verified, then ask for an explicit approval.",
  },
];

/** The brief's wishlist: what each item asked for, then why it did or did not make it in. */
const EXPECTATIONS: { item: string; included: boolean; asked: string; why: string }[] = [
  {
    item: "Smart autofill",
    included: true,
    asked: "Fill checklist fields automatically from the documents.",
    why: "In its smallest form: values are read from documents already on file, and the assistant accepts or corrects each one.",
  },
  { item: "Cleaner interface", included: true, asked: "A tidier screen than the legacy spreadsheet.", why: "It is the redesign itself, so it needed no separate work." },
  {
    item: "Leave the checklist alone",
    included: true,
    asked: "Keep the checklist exactly as the assistants know it.",
    why: "Assistant A said it is fine and it takes 3 minutes, so no steps were added or removed.",
  },
  {
    item: "Mobile access",
    included: false,
    asked: "Check and work on submissions from a phone.",
    why: "Neither the interviews nor the logs showed a need to work away from the desk.",
  },
  { item: "AI chat assistant", included: false, asked: "Ask an assistant questions about a submission.", why: "Nobody described a question they would ask it." },
];

/**
 * The solution, in the order a submission moves: what the problem is, why it
 * happens, what Bind Desk does, and where that leaves the assistant.
 */
type Scenario = { title: string; problem: string; solution: string; clip: string; label: string; need?: string };

const SCENARIOS: Scenario[] = [
  {
    title: "Pick documents up where they arrive",
    problem: "Documents arrive by portal, email and fax, and assistants hunt for them before any work starts. Assistant B spent 11 minutes per submission just finding them.",
    solution: "A browser extension picks attachments up from the web inbox and portal, matches each one to its policy, and asks when it is unsure. It covers documents that arrive in the browser, so paper and fax are still an open question.",
    clip: "scenario-c",
    label: "Video: the capture panel matches documents and asks about a 40% match",
  },
  {
    title: "See what is missing, and ask for it",
    problem: "A policy cannot bind until every document is in, and with the checklist in a separate spreadsheet, a missing one only shows when someone checks.",
    solution: "Captured documents feed straight into their policy’s checklist, which flags what is missing and drafts the request to the broker. Empty fields fill from documents on file, for the assistant to accept or correct.",
    clip: "scenario-b",
    label: "Video: a missing document is flagged and suggested values are reviewed",
    need: "NEED REDO: re-record this clip so it shows a value being corrected",
  },
  {
    title: "Catch a mismatch between documents",
    problem: "Coverage on the certificate has to match the application, and assistants find differences by reading both. More than a third of submissions had one.",
    solution: "Both documents sit side by side with every difference highlighted, and the assistant marks each one real or acceptable. The ones marked real go straight into a drafted broker email.",
    clip: "scenario-a",
    label: "Video: a mismatch is marked real and the broker email is edited",
  },
  {
    title: "Make the wait for brokers visible",
    problem: "Once a broker is asked for something, the submission waits, a median of 2.1 days, and nobody tracks it.",
    solution: "Each policy carries a follow-up date. When it passes, the row turns Overdue on Home, and the assistant chooses to chase, call or wait.",
    clip: "scenario-d",
    label: "Video: Harbor Line moves from Waiting to Overdue on Home",
  },
  {
    title: "Bind with everything verified",
    problem: "Binding cannot be undone, and a missed mismatch surfaces months later as a claim the firm cannot cover.",
    solution: "A summary of every check comes before an explicit approval, so no policy binds without a person seeing what was verified.",
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
      text: "The first build showed five columns, with a status pill on every row and a call to action in the last one. Every row looked equally urgent at a glance.",
    },
    after: {
      src: `${ART}/process/home-after.jpg`,
      alt: "The current home table: three columns, with rows grouped under Mismatch, Missing and Overdue bands.",
      text: "Status became the grouping, so rows sit under Mismatch, Missing, Overdue and Waiting. The table dropped to three columns, with the action folded into the next step.",
    },
  },
  {
    title: "Separate tabs, then one flow",
    ratio: "1.3 / 1",
    before: {
      src: `${ART}/process/policy-before.jpg`,
      alt: "The earlier policy page: Checklist, Docs, Follow-up and Bind as tabs, open on Docs.",
      text: "The policy page started as tabs that opened on the problem: a submission with a mismatch showed only its documents. That hid the rest of the checklist just when the assistant needed to know what else was outstanding.",
    },
    after: {
      src: `${ART}/process/policy-after.jpg`,
      alt: "The current policy page: the checklist, document mismatch, follow-up and final review as steps on one page.",
      text: "The tabs became one page in order: the checklist, the document mismatch, the follow-up and the final review. Each step collapses, and its number turns into a tick when it is done.",
    },
  },
];

/** What the logs showed, beside what the design is built to change. */
const OUTCOMES: { area: string; evidence: string; outcome: string }[] = [
  { area: "Finding documents", evidence: "11 minutes per submission, and 17 of 54 arrived off the portal.", outcome: "Documents arrive matched to their policy, with uncertain matches confirmed by the assistant." },
  { area: "Spotting mismatches", evidence: "35 to 38 percent of submissions had one, and the first flag came 14 minutes in.", outcome: "Differences are highlighted when the documents arrive, and the assistant decides each one." },
  { area: "Chasing brokers", evidence: "A median 2.1 days to reply, and nine submissions waited more than four.", outcome: "Overdue submissions rise to the top of the week on their own date." },
  { area: "Binding", evidence: "The checklist took 3 minutes.", outcome: "The checklist is unchanged, and binding happens after a verified summary." },
];

/** What comes next, grouped by kind so nothing from the outcome repeats. */
const NEXT: { title: string; items: string[] }[] = [
  {
    title: "Measure",
    items: ["Time from a document arriving to a confirmed match.", "Mismatches caught in a seeded week, against the spreadsheet.", "Submissions still waiting after four days."],
  },
  {
    title: "Clarify with the brokerage",
    items: ["Whether faxes or paper arrive at all.", "Whether there is a written rule for minor mismatches.", "How assistants chase brokers today.", "Whether the bind summary covers every check the firm requires."],
  },
  {
    title: "If an assumption is wrong",
    items: ["Paper arrives: add a scan upload or an upload link for brokers.", "A minor-mismatch rule exists: classify those differences automatically.", "Some brokers are always slow: set the follow-up default per broker."],
  },
];

/* ------------------------------ parts ------------------------------ */

/** The small uppercase eyebrow, in the portfolio's mono. */
function Eyebrow({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p data-ui="Overline" data-src="src/pieces/bindDesk.tsx › Eyebrow" className={`uppercase ${className}`} style={{ ...LABEL, color: MUTED, ...style }}>
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

/* ---------------------------- the journey ---------------------------- */

/** The closest ancestor that scrolls the case study body. */
const scrollerOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-cs-scroller]");

/**
 * Today's journey as boxes on a winding line. On wide screens each stage is a
 * box on one side with its evidence as plain text on the other, alternating,
 * and a soft S-curve runs through the boxes; on the phone the evidence sits
 * under its box and the line runs down the left edge. The line eases after
 * the reader's scroll rather than snapping to it. The box nearest the middle
 * of the screen fills in the bands' style and its evidence fades in; the
 * others stay open with their evidence faded out.
 */
function Journey() {
  const wrap = useRef<HTMLDivElement>(null);
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<{ d: string; w: number; h: number } | null>(null);
  const [spot, setSpot] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const target = useRef(reduceMotion() ? 1 : 0);
  const shown = useRef(target.current);

  // The path through the boxes, recomputed whenever the layout changes.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 768px)").matches;
      const pts = boxes.current.flatMap((b) => {
        if (!b) return [];
        const br = b.getBoundingClientRect();
        // Wide: through each box's middle. Phone: down the gutter on the left.
        return [{ x: wide ? br.left - r.left + br.width / 2 : 8, top: br.top - r.top, bottom: br.bottom - r.top }];
      });
      if (pts.length < 2) return;
      // Down through each box (hidden behind it), then out of its bottom edge
      // in one long S to the top of the next. The handles are as long as the
      // gap, so each bend is a full, even swing with no straight run.
      let d = `M ${pts[0].x} ${pts[0].top}`;
      pts.forEach((a, i) => {
        d += ` L ${a.x} ${a.bottom}`;
        const b = pts[i + 1];
        if (!b) return;
        const k = (b.top - a.bottom) * 0.95;
        d += ` C ${a.x} ${a.bottom + k}, ${b.x} ${b.top - k}, ${b.x} ${b.top}`;
      });
      setGeo({ d, w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, [geo]);

  // Scroll sets where the line should be; a frame loop eases it there.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const scroller = scrollerOf(el);
    let raf = 0;
    const paint = () => {
      const path = pathRef.current;
      shown.current += (target.current - shown.current) * 0.08;
      if (Math.abs(target.current - shown.current) < 0.0005) shown.current = target.current;
      if (path && len) path.style.strokeDashoffset = String(len * (1 - shown.current));
      raf = shown.current === target.current ? 0 : requestAnimationFrame(paint);
    };
    const onScroll = () => {
      const view = scroller?.getBoundingClientRect() ?? { top: 0, height: window.innerHeight };
      const mid = view.top + view.height * 0.6;
      const r = el.getBoundingClientRect();
      if (!reduceMotion()) target.current = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      let best = 0;
      let dist = Infinity;
      boxes.current.forEach((b, i) => {
        if (!b) return;
        const br = b.getBoundingClientRect();
        const dd = Math.abs(br.top + br.height / 2 - (view.top + view.height / 2));
        if (dd < dist) {
          dist = dd;
          best = i;
        }
      });
      setSpot(best);
      if (!raf) raf = requestAnimationFrame(paint);
    };
    onScroll();
    const t: HTMLElement | Window = scroller ?? window;
    t.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [len]);

  return (
    <div ref={wrap} data-ui="Journey" data-src="src/pieces/bindDesk.tsx › Journey" className="relative">
      {geo ? (
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0" width={geo.w} height={geo.h} fill="none">
          <path d={geo.d} stroke={DIVIDER} strokeWidth={2} />
          <path
            ref={pathRef}
            d={geo.d}
            stroke={INK}
            strokeWidth={2}
            strokeLinecap="round"
            style={len ? { strokeDasharray: len, strokeDashoffset: len * (1 - shown.current) } : { opacity: 0 }}
          />
        </svg>
      ) : null}
      <ol className="relative list-none space-y-12 p-0 pl-8 md:space-y-28 md:pl-0">
        {STAGES.map((s, i) => {
          const on = spot === i;
          const right = i % 2 === 1;
          return (
            <li key={s.stage} className="grid items-center gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-10">
              <div
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                data-ui="Journey stage" data-src="src/pieces/bindDesk.tsx › Journey"
                className={`rounded-[12px] p-6 transition-colors duration-500 ${right ? "md:order-2" : ""}`}
                style={{ background: on ? SURFACE : FACE, border: `1px solid ${DIVIDER}` }}
              >
                <Eyebrow>
                  Stage {i + 1} · {s.stage}
                </Eyebrow>
                <p className={`mt-2 ${H3}`} style={ink}>
                  {s.pain}
                </p>
                <p className={`mt-2 ${SM}`} style={ink2}>
                  {s.today}
                </p>
                <p className={`mt-4 ${SM}`} style={ink}>
                  <span className="uppercase" style={{ ...LABEL, fontSize: 13, color: MUTED }}>
                    Need
                  </span>{" "}
                  {s.need}
                </p>
              </div>
              {/* The evidence floats beside its box as plain text, and only while that box is in focus. */}
              <div
                data-ui="Evidence" data-src="src/pieces/bindDesk.tsx › Journey"
                aria-hidden={!on}
                className={`space-y-2 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${right ? "md:order-1 md:text-right" : ""}`}
                style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(8px)" }}
              >
                <Eyebrow style={{ fontSize: 13 }}>Evidence</Eyebrow>
                {s.evidence.map((e) => (
                  <p key={e} className={`font-medium ${SM}`} style={ink}>
                    {e}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------- stakeholder expectations ------------------------- */

/**
 * The wishlist in two groups, Included and Not included, each named once. A
 * group's rows share its colour as a quiet tint and a hairline stroke.
 */
function Expectations() {
  const groups = [
    { title: "Included", included: true, c: YES },
    { title: "Not included", included: false, c: NO },
  ];
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-3 flex items-center gap-2 uppercase" style={{ ...LABEL, color: g.c }}>
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
                className="grid gap-1 rounded-[12px] p-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5"
                style={{
                  background: `color-mix(in srgb, ${g.c} 5%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${g.c} 35%, transparent)`,
                }}
              >
                <p className={H4} style={ink}>
                  {e.item}
                </p>
                <p className={SM} style={ink2}>
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

/** One scenario: its title and two short paragraphs beside the clip. Alternate rows swap sides; on the phone the copy comes first. */
function ScenarioCard({ s, i }: { s: Scenario; i: number }) {
  const flip = i % 2 === 1;
  return (
    <article data-ui="Media object" data-src="src/pieces/bindDesk.tsx › ScenarioCard" className={`grid gap-6 md:items-center md:gap-10 ${flip ? "md:grid-cols-[1.2fr_1fr]" : "md:grid-cols-[1fr_1.2fr]"}`}>
      <div className={flip ? "md:order-2" : ""}>
        <Eyebrow>Scenario {i + 1}</Eyebrow>
        <h4 className={`mt-2 ${STATEMENT}`}>{s.title}</h4>
        <div className={`mt-3 space-y-3 ${MD}`} style={ink2}>
          <p>{s.problem}</p>
          <p style={ink}>{s.solution}</p>
        </div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <Clip name={s.clip} label={s.label} />
        {s.need ? (
          <p className="mt-3">
            <Need>{s.need}</Need>
          </p>
        ) : null}
      </div>
    </article>
  );
}

/* ---------------------------- design process ---------------------------- */

/** One screen in a decision pair: the same-sized frame as its partner, with its own description under it. */
function Shot({ label, src, alt, text, ratio }: { label: string; src: string; alt: string; text: string; ratio: string }) {
  return (
    <figure>
      <Eyebrow className="mb-2">{label}</Eyebrow>
      <div className="overflow-hidden rounded-[12px]" style={{ border: `1px solid ${DIVIDER}`, background: WELL, aspectRatio: ratio }}>
        <img src={src} alt={alt} loading="lazy" decoding="async" className="block h-full w-full object-cover object-left-top" />
      </div>
      <figcaption className={`mt-3 ${SM}`} style={ink2}>
        {text}
      </figcaption>
    </figure>
  );
}

/* ------------------------------ outcome ------------------------------ */

function OutcomeRows() {
  return (
    <ul data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › OutcomeRows" className="grid list-none gap-4 p-0 md:grid-cols-2">
      {OUTCOMES.map((o) => (
        <li key={o.area} data-ui="Card" data-src="src/pieces/bindDesk.tsx › OutcomeRows" className="rounded-[12px] p-6" style={card}>
          <p className={H4} style={ink}>
            {o.area}
          </p>
          <dl className={`mt-3 space-y-3 ${SM}`}>
            <div className="rounded-[8px] px-3 py-2" style={{ background: WELL }}>
              <dt className="uppercase" style={{ ...LABEL, fontSize: 12, color: MUTED }}>
                In the logs
              </dt>
              <dd className="m-0 font-medium" style={ink}>
                {o.evidence}
              </dd>
            </div>
            <div>
              <dt className="uppercase" style={{ ...LABEL, fontSize: 12, color: MUTED }}>
                With Bind Desk
              </dt>
              <dd className="m-0" style={ink2}>
                {o.outcome}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function NextSteps() {
  return (
    <div data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › NextSteps" className="grid gap-4 md:grid-cols-3">
      {NEXT.map((n) => (
        <div key={n.title} data-ui="Card" data-src="src/pieces/bindDesk.tsx › NextSteps" className="rounded-[12px] p-6" style={card}>
          <p className={H4} style={ink}>
            {n.title}
          </p>
          <ul className={`mt-3 list-none space-y-2 p-0 ${SM}`} style={ink2}>
            {n.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ sections ------------------------------ */

/** The hero. CaseStudy renders this under the meta row in place of its default title line: the title and three facts. */
const INTRO = (
  <div>
    <h1 className={`max-w-3xl ${TITLE}`}>
      Redesigning Bind Desk for faster, safer binding
    </h1>
    <dl data-ui="Facts" data-src="src/pieces/bindDesk.tsx › INTRO" className="mt-6 grid max-w-xl grid-cols-3 gap-4">
      {META.map(([k, v]) => (
        <div key={k}>
          <dt className="uppercase" style={{ ...LABEL, fontSize: 13, color: MUTED }}>
            {k}
          </dt>
          <dd className={`m-0 mt-1 ${SM}`} style={ink}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
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
        <P>
          A commercial insurance brokerage asked for a faster checklist, plus autofill, a cleaner interface, mobile access
          and an AI chat assistant. Its own logs and interviews showed the time goes elsewhere: finding documents across
          channels, and spotting mismatches between the application and what arrived.{" "}
          <Strong>
            Bind Desk leaves the checklist alone and redesigns the slow work around it, with a person approving every
            decision that matters.
          </Strong>
        </P>
        <p className={`mt-4 ${SM}`} style={ink2}>
          Design exercise against a supplied brief and research materials. Company, people and data are fictional.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <PrototypeLink>Open the prototype</PrototypeLink>
          <PrototypeLink href={TOUR} outline>
            Start the guided tour
          </PrototypeLink>
        </div>
      </Band>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div>
        <SectionHead
          title="Five scenarios, in the order a submission moves"
          lede="In every one, the tool proposes and the assistant decides: no email sends and no policy binds without a person."
        />
        <div className="space-y-16">
          {SCENARIOS.map((s, i) => (
            <ScenarioCard key={s.title} s={s} i={i} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "insights",
    title: "Insights",
    children: (
      <div className="space-y-16">
        <div>
          <SectionHead
            title="The journey today, stage by stage"
            lede="Thirty days of logs from two underwriting assistants, 115 submissions, and an interview with each."
          />
          <Journey />
        </div>
        <div>
          <SectionHead title="Stakeholder expectations: five items, three made it in" />
          <Expectations />
        </div>
        {/* A card floating in the middle of the column, not a band. */}
        <figure
          data-ui="Pull quote" data-src="src/pieces/bindDesk.tsx › section insights"
          className="mx-auto max-w-2xl rounded-[16px] px-8 py-8 text-center md:px-12"
          style={{ background: SURFACE, border: `1px solid ${DIVIDER}`, boxShadow: "0 18px 40px -24px rgba(0, 0, 0, 0.45)" }}
        >
          <Eyebrow>Pushback in the brief</Eyebrow>
          <blockquote className={`mt-3 ${STATEMENT}`} style={ink}>
            “Our users asked for the wishlist. Why are you showing me something else?”
          </blockquote>
          <figcaption className={`mt-4 ${MD}`} style={ink2}>
            The wishlist is the five items above, and each one has a place sized to what the logs and interviews support.{" "}
            <Strong>The checklist they asked to speed up takes 3 minutes; the time goes everywhere around it.</Strong>
          </figcaption>
        </figure>
      </div>
    ),
  },
  {
    id: "problem",
    title: "Problem",
    hideTitle: true,
    children: (
      <Band label="Problem">
        <p className={STATEMENT} style={ink}>
          Underwriting assistants lose most of each submission before the checklist starts: hunting for documents across
          the portal, email and fax, then reading two documents line by line for a mismatch. One that slips through binds
          a policy with a coverage gap the firm cannot undo.
        </p>
        <P className="mt-4">The checklist itself takes 3 minutes.</P>
      </Band>
    ),
  },
  {
    id: "process",
    title: "Design Process",
    children: (
      <div className="space-y-16">
        <SectionHead
          title="Built with AI, shaped by review"
          lede="Claude Code built each version of the prototype from my direction. I reviewed every round by using it, and sent it back with changes. These two came out of that review."
        />
        {DECISIONS.map((d) => (
          <div key={d.title}>
            <h4 className={`mb-6 ${H3}`}>{d.title}</h4>
            <div className="grid items-start gap-6 md:grid-cols-2">
              <Shot label="First version" ratio={d.ratio} {...d.before} />
              <Shot label="Now" ratio={d.ratio} {...d.after} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome",
    children: (
      <div>
        <SectionHead
          title="What the logs showed, and what the design changes"
          lede="The prototype is a working build, not a clickable mockup: a decision on one screen carries into the broker email and the checklist. It has not been tested with underwriting assistants yet."
        />
        <OutcomeRows />
      </div>
    ),
  },
  {
    id: "next-steps",
    title: "Next Steps",
    children: (
      <div className="space-y-8">
        <SectionHead title="What to measure and clarify next" />
        <NextSteps />
        <P className="max-w-3xl">
          <Strong>First step:</Strong> build the mismatch check, the most frequent problem in the logs, and have two or three
          assistants work the same seeded week in the prototype and in the spreadsheet.
        </P>
      </div>
    ),
  },
  {
    id: "ai",
    title: "AI",
    children: (
      <div className="max-w-3xl">
        <SectionHead title="How I used AI" />
        <P>
          With four hours, designing every screen from scratch and then building a demo was not realistic. I used Claude
          Code to build the design as a working prototype, then tested it by using it and improved it round by round.
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
