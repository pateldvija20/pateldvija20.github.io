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
 * Today's journey, one stage per solution scenario: where it hurts, what the
 * design needs to do about it, and what the assistant does there, with the
 * evidence behind it (each figure says whose log it came from).
 */
const STAGES: { stage: string; detour?: boolean; pain: string; need: string; action: string; evidence: string[] }[] = [
  {
    stage: "Capture",
    pain: "Assistants hunt across channels before any review can start.",
    need: "Pick documents up where they already arrive.",
    action: "Confirm any match the tool is unsure of.",
    evidence: ["Assistant B spent **11 minutes per submission** finding documents.", "**17 of Assistant B’s 54** submissions arrived **outside the portal**."],
  },
  {
    stage: "Checklist",
    pain: "A policy cannot bind until every document is in, and a missing one only shows when someone checks.",
    need: "Show the missing item in place, and ask the broker from there.",
    action: "Send the request for the missing document.",
    evidence: ["The checklist itself took Assistant B **3 minutes**.", "Assistant A: “**the checklist itself is fine**.”"],
  },
  {
    stage: "Follow up",
    detour: true,
    pain: "Nobody tracks how long a submission has been waiting.",
    need: "Make waiting visible, with a follow-up date per policy.",
    action: "Chase, call or wait.",
    evidence: ["Assistant A’s median wait for a broker reply was **2.1 days**.", "**Nine** of their submissions waited **more than four days**."],
  },
  {
    stage: "Review",
    pain: "Mismatches are common, and they are found late, by careful reading.",
    need: "Highlight every difference, and let a person decide each one.",
    action: "Mark each difference real or acceptable.",
    evidence: [
      "**23 of Assistant A’s 61** and **19 of Assistant B’s 54** submissions had a mismatch between documents: **38 and 35 percent**.",
      "Assistant A reached their first flag **14 minutes** into a submission.",
    ],
  },
  {
    stage: "Bind",
    pain: "Binding cannot be undone, and a missed mismatch surfaces months later as a coverage gap the firm cannot cover.",
    need: "Show what was verified, then ask for an explicit approval.",
    action: "Approve the bind.",
    evidence: ["One assistant on a missed mismatch: it “**comes back to bite us later**.”"],
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
    problem: "Documents arrive by portal, email and fax, and assistants **hunt for them** before any work starts. Assistant B spent **11 minutes per submission** just finding them.",
    solution: "A browser extension **picks attachments up from the web inbox and portal and matches each one to its policy**, and asks when it is unsure. It covers documents that arrive in the browser, so paper and fax are still an open question.",
    clip: "scenario-c",
    label: "Video: the capture panel matches documents and asks about a 40% match",
  },
  {
    title: "See what is missing, and ask for it",
    problem: "A policy **cannot bind until every document is in**, and with the checklist in a separate spreadsheet, a missing one **only shows when someone checks**.",
    solution: "Captured documents feed straight into their policy’s checklist, which **flags what is missing and drafts the request to the broker**. Empty fields fill from documents on file, for the assistant to accept or correct.",
    clip: "scenario-b",
    label: "Video: a value read off the application is corrected, then accepted",
  },
  {
    title: "Catch a mismatch between documents",
    problem: "Coverage on the certificate has to match the application, and assistants find differences **by reading both**. **More than a third** of submissions had one.",
    solution: "Both documents sit side by side with every difference highlighted, and **the assistant marks each one real or acceptable**. The ones marked real go straight into a drafted broker email.",
    clip: "scenario-a",
    label: "Video: a mismatch is marked real and the broker email is edited",
  },
  {
    title: "Make the wait for brokers visible",
    problem: "Once a broker is asked for something, the submission waits, **a median of 2.1 days**, and **nobody tracks it**.",
    solution: "Each policy carries a follow-up date. **When it passes, the row turns Overdue on Home**, and the assistant chooses to chase, call or wait.",
    clip: "scenario-d",
    label: "Video: Harbor Line moves from Waiting to Overdue on Home",
  },
  {
    title: "Bind with everything verified",
    problem: "**Binding cannot be undone**, and a missed mismatch surfaces months later as a **claim the firm cannot cover**.",
    solution: "**A summary of every check comes before an explicit approval**, so no policy binds without a person seeing what was verified.",
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
  { area: "Finding documents", evidence: "11 minutes per submission, and 17 of 54 arrived off the portal.", outcome: "Documents arrive **matched to their policy**, with uncertain matches **confirmed by the assistant**." },
  { area: "Spotting mismatches", evidence: "35 to 38 percent of submissions had one, and the first flag came 14 minutes in.", outcome: "Differences are **highlighted when the documents arrive**, and the assistant **decides each one**." },
  { area: "Chasing brokers", evidence: "A median 2.1 days to reply, and nine submissions waited more than four.", outcome: "Overdue submissions **rise to the top of the week** on their own date." },
  { area: "Binding", evidence: "The checklist took 3 minutes.", outcome: "The checklist is **unchanged**, and binding happens after a **verified summary**." },
];

/** What comes next, one card each: build and test, what to measure, what to clarify, what each answer changes. */
const NEXT: { label: string; text: string }[] = [
  { label: "Build and test", text: "First, build the **mismatch check**, the most frequent problem in the logs, and test it with two or three assistants working the **same seeded week** in the prototype and in the spreadsheet." },
  { label: "Measure", text: "Measure the **time from a document arriving to a confirmed match**, the **mismatches caught**, and how many submissions **still wait after four days**." },
  { label: "Clarify", text: "Clarify three things with the brokerage: **whether paper or fax arrives**, **whether a rule exists for minor mismatches**, and **how assistants chase brokers** today." },
  { label: "What changes", text: "Each answer changes one part of the design: a scan upload, automatic handling of minor differences, or a follow-up default per broker." },
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

/** One drawn connection: its line, and the arrowhead at its end. */
type Link = { d: string; tip: string };
/** A branch's condition, written beside its dashed line. */
type Label = { text: string; x: number; y: number; vertical?: boolean; alignRight?: boolean };

/** An open arrowhead whose point sits at (x, y), facing the way the line arrives. */
const chevron = (x: number, y: number, dir: "down" | "left" | "right") =>
  dir === "down"
    ? `M ${x - 5} ${y - 7} L ${x} ${y} L ${x + 5} ${y - 7}`
    : dir === "right"
      ? `M ${x - 7} ${y - 5} L ${x} ${y} L ${x - 7} ${y + 5}`
      : `M ${x + 7} ${y - 5} L ${x} ${y} L ${x + 7} ${y + 5}`;

/** The closest ancestor that scrolls the case study body. */
const scrollerOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-cs-scroller]");

/**
 * Today's journey. On wide screens the main path is one column of stages,
 * capture, checklist, review, bind, joined by straight arrows that draw in as
 * the reader scrolls; each stage's evidence sits opposite it. The detour,
 * follow-up, is a dashed card in the right column between checklist and
 * review: dashed lines run in the empty lane between the columns, down from
 * the checklist (a document is missing) and up from review (a mismatch) into
 * it, and out of it down the right margin into bind once the broker replies. On the phone the boxes stack and
 * one line runs down the left edge. The box nearest the middle of the screen
 * fills in the bands' style and its evidence fades in; the others stay open.
 */
function Journey() {
  const wrap = useRef<HTMLDivElement>(null);
  /** Each stage's box, and the column holding its title and box (where arrows land). */
  const boxes = useRef<(HTMLDivElement | null)[]>([]);
  const heads = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<{ main: Link[]; detour: Link[]; labels: Label[]; w: number; h: number } | null>(null);
  const [spot, setSpot] = useState(0);
  /** The drawn-in copy of each main link, and its arrowhead. */
  const drawn = useRef<(SVGPathElement | null)[]>([]);
  const tips = useRef<(SVGPathElement | null)[]>([]);
  const target = useRef(reduceMotion() ? 1 : 0);
  const shown = useRef(target.current);

  // The connections, recomputed whenever the layout changes.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 768px)").matches;
      const rect = (n: HTMLElement | null) => {
        const b = n!.getBoundingClientRect();
        const left = b.left - r.left;
        const top = b.top - r.top;
        return { left, right: left + b.width, x: left + b.width / 2, top, bottom: top + b.height, mid: top + b.height / 2 };
      };
      if (boxes.current.some((b) => !b) || heads.current.some((h) => !h)) return;
      const box = boxes.current.map(rect);
      const head = heads.current.map(rect);
      if (!wide) {
        // Phone: the main path runs down the gutter, turning into each next stage's
        // title with an arrowhead; the detour runs dashed in a second lane beside it.
        const [p1, p2, pf, pr, pb] = box;
        const [, q2, qf, qr, qb] = head;
        /** Down a lane from one stage, then a short turn into the next stage's title. */
        const TIP = 26;
        const into = (x: number, from: number, to: { top: number }): Link => {
          const y = to.top + 9;
          return { d: `M ${x} ${from} L ${x} ${y - 8} Q ${x} ${y}, ${x + 8} ${y} L ${TIP} ${y}`, tip: chevron(TIP, y, "right") };
        };
        setGeo({
          main: [into(8, p1.mid, q2), into(8, p2.mid, qr), into(8, pr.mid, qb)],
          detour: [into(18, p2.bottom - 24, qf), into(18, pf.bottom - 24, qb)],
          labels: [],
          w: r.width,
          h: r.height,
        });
        return;
      }
      const GAP = 4;
      /** Foot of one box to the head of the next stage (above its title), one even S, arrow pointing down. */
      const down = (a: { x: number; bottom: number }, b: { x: number; top: number }, ax = a.x, bx = b.x): Link => {
        const y1 = a.bottom;
        const y2 = b.top - GAP;
        const k = (y2 - y1) * 0.9;
        return { d: `M ${ax} ${y1} C ${ax} ${y1 + k}, ${bx} ${y2 - k}, ${bx} ${y2}`, tip: chevron(bx, y2, "down") };
      };
      // Stages in data order: capture, checklist, follow-up (the detour), review, bind.
      const [c1, c2, fu, rv, bd] = box;
      const [, h2, , h3, h4] = head;
      // Main path: one column, straight down; checklist to review passes beside the detour card.
      const main: Link[] = [down(c1, h2), down(c2, h3), down(rv, h4)];
      // Into the detour through the empty lane between the columns, so no line crosses text.
      const lane = (c2.right + fu.left) / 2;
      const rr = 12;
      /** From one side of a box into the lane, along it (up or down), and out into another box's side. */
      const zig = (fromX: number, y1: number, y2: number, toX: number): Link => {
        const s1 = Math.sign(lane - fromX);
        const s2 = Math.sign(toX - lane);
        const v = Math.sign(y2 - y1);
        const endX = toX - s2 * GAP;
        return {
          d:
            `M ${fromX} ${y1} L ${lane - s1 * rr} ${y1} Q ${lane} ${y1}, ${lane} ${y1 + v * rr}` +
            ` L ${lane} ${y2 - v * rr} Q ${lane} ${y2}, ${lane + s2 * rr} ${y2} L ${endX} ${y2}`,
          tip: chevron(endX, y2, s2 > 0 ? "right" : "left"),
        };
      };
      // Out of the detour once the broker replies: down the right margin, across the gap above bind, into it.
      const LANE = 28;
      const rowRv = boxes.current[3]!.closest("li")!.getBoundingClientRect();
      const gapY = (rowRv.bottom - r.top + h4.top) / 2;
      const outX = fu.right + LANE;
      const inX = bd.right - 40;
      const y4 = h4.top - GAP;
      const detour: Link[] = [
        // A missing document: out of the checklist, down the lane, into follow-up.
        zig(c2.right, c2.mid, fu.mid - 16, fu.left),
        // A mismatch: out of review, up the lane, into follow-up.
        zig(rv.right, rv.mid, fu.mid + 16, fu.left),
        {
          d:
            `M ${fu.right} ${fu.mid} L ${outX - rr} ${fu.mid} Q ${outX} ${fu.mid}, ${outX} ${fu.mid + rr}` +
            ` L ${outX} ${gapY - rr} Q ${outX} ${gapY}, ${outX - rr} ${gapY} L ${inX + rr} ${gapY}` +
            ` Q ${inX} ${gapY}, ${inX} ${gapY + rr} L ${inX} ${y4}`,
          tip: chevron(inX, y4, "down"),
        },
      ];
      // Each branch says when it is taken, written on its own stretch of line (the label's ground breaks the line).
      const labels: Label[] = [
        { text: "Document missing", x: lane, y: (c2.mid + fu.mid - 16) / 2, vertical: true },
        { text: "Mismatch found", x: lane, y: (fu.mid + 16 + rv.mid) / 2, vertical: true },
        { text: "Broker replies", x: outX, y: (fu.mid + gapY) / 2, vertical: true },
      ];
      setGeo({ main, detour, labels, w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scroll sets how much of the main path is drawn; a frame loop eases it
  // there. The three main links fill in turn, each arrowhead once its link is whole.
  useEffect(() => {
    const el = wrap.current;
    if (!el || !geo) return;
    const scroller = scrollerOf(el);
    const lens = drawn.current.map((p) => (p ? p.getTotalLength() : 0));
    let raf = 0;
    const draw = () => {
      const n = lens.length;
      drawn.current.forEach((p, i) => {
        if (!p) return;
        const t = Math.min(1, Math.max(0, shown.current * n - i));
        p.style.strokeDasharray = String(lens[i]);
        p.style.strokeDashoffset = String(lens[i] * (1 - t));
        const tip = tips.current[i];
        if (tip) tip.style.opacity = t > 0.98 ? "1" : "0";
      });
    };
    const paint = () => {
      shown.current += (target.current - shown.current) * 0.08;
      if (Math.abs(target.current - shown.current) < 0.0005) shown.current = target.current;
      draw();
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
    draw();
    onScroll();
    const t: HTMLElement | Window = scroller ?? window;
    t.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [geo]);

  return (
    <div ref={wrap} data-ui="Journey" data-src="src/pieces/bindDesk.tsx › Journey" className="relative">
      {geo ? (
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={geo.w} height={geo.h} fill="none">
          {geo.detour.map((l, i) => (
            <g key={`d${i}`} stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d={l.d} strokeDasharray="5 6" />
              {l.tip ? <path d={l.tip} /> : null}
            </g>
          ))}
          {geo.main.map((l, i) => (
            <g key={`m${i}`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d={l.d} stroke={DIVIDER} />
              {l.tip ? <path d={l.tip} stroke={DIVIDER} /> : null}
              <path
                ref={(p) => {
                  drawn.current[i] = p;
                }}
                d={l.d}
                stroke={INK}
              />
              {l.tip ? (
                <path
                  ref={(p) => {
                    tips.current[i] = p;
                  }}
                  d={l.tip}
                  stroke={INK}
                  style={{ opacity: 0, transition: "opacity 200ms ease-out" }}
                />
              ) : null}
            </g>
          ))}
        </svg>
      ) : null}
<p data-ui="Legend" data-src="src/pieces/bindDesk.tsx › Journey" className={`mb-10 hidden flex-wrap gap-x-8 gap-y-2 md:flex ${SM}`} style={ink2}>
        <span className="inline-flex items-center gap-2">
          <svg width={28} height={4} aria-hidden>
            <path d="M 1 2 L 27 2" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          </svg>
          Main path: capture, checklist, review, bind
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width={28} height={4} aria-hidden>
            <path d="M 1 2 L 27 2" stroke={MUTED} strokeWidth={1.5} strokeDasharray="5 6" strokeLinecap="round" />
          </svg>
          Detour: when a document is missing or a value mismatches
        </span>
      </p>
      {/* Each label hangs from a zero-size point on its line and is centred on it by flex,
          with a line height of 1 so vertical text carries no off-centre slack. */}
      {geo?.labels.map((l) => (
        <div
          key={l.text}
          aria-hidden
          className={`pointer-events-none absolute z-10 flex h-0 w-0 items-center ${l.alignRight ? "justify-end" : "justify-center"}`}
          style={{ left: l.x, top: l.y }}
        >
          <span
            className="shrink-0 whitespace-nowrap uppercase"
            style={{
              ...LABEL,
              fontSize: 11,
              lineHeight: 1,
              letterSpacing: "0.4px",
              color: MUTED,
              background: FACE,
              padding: l.vertical ? "6px 3px" : "3px 4px",
              writingMode: l.vertical ? "vertical-rl" : undefined,
            }}
          >
            {l.text}
          </span>
        </div>
      ))}
      <ol className="relative list-none space-y-12 p-0 pl-8 md:space-y-16 md:pl-0">
        {STAGES.map((s, i) => {
          const on = spot === i;
          // Main stages sit in the left column with their evidence opposite; the detour card
          // sits in the right column with its evidence under it.
          const detour = s.detour === true;
          const n = STAGES.slice(0, i + 1).filter((x) => !x.detour).length;
          return (
            <li key={s.stage} className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)] md:gap-x-0">
              {/* The stage's title sits above its box, at the evidence label's size. */}
              <div
                ref={(el) => {
                  heads.current[i] = el;
                }}
                className={detour ? "md:col-start-3" : "md:col-start-1"}
              >
                <Eyebrow className="mb-2" style={{ fontSize: 13 }}>
                  {detour ? s.stage : `Stage ${n} · ${s.stage}`}
                </Eyebrow>
                <div
                  ref={(el) => {
                    boxes.current[i] = el;
                  }}
                  data-ui="Journey stage" data-src="src/pieces/bindDesk.tsx › Journey"
                  className="rounded-[12px] p-6 transition-colors duration-500"
                  style={{ background: on ? SURFACE : FACE, border: `1px ${detour ? "dashed" : "solid"} ${detour ? MUTED : DIVIDER}` }}
                >
                  <dl className="space-y-3">
                    {(
                      [
                        ["Pain point", s.pain],
                        ["Need", s.need],
                        ["User action", s.action],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className="uppercase" style={{ ...LABEL, fontSize: 12, color: MUTED }}>
                          {k}
                        </dt>
                        <dd className={`m-0 ${SM}`} style={ink2}>
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              {/* The evidence floats beside its box as plain text, and only while that box is in focus.
                  On the phone it sits under its box instead, so it always shows: fading it there left gaps. */}
              <div
                data-ui="Evidence" data-src="src/pieces/bindDesk.tsx › Journey"
                className="space-y-2 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none max-md:!transform-none max-md:!opacity-100 md:col-start-3"
                style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(8px)" }}
              >
                <Eyebrow style={{ fontSize: 13 }}>Evidence</Eyebrow>
                {s.evidence.map((e) => (
                  <p key={e} className={SM} style={ink2}>
                    <Marked text={e} />
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

/**
 * The journey on the phone: one slide at a time in a sideways row, the next
 * peeking in at the edge, swiped to reveal it. Solid arrows carry the main
 * path from slide to slide. The last slide is a stack, bind over follow-up:
 * review's solid arrow runs into bind, its dashed arrow into follow-up below
 * (a document missing or a mismatch found), and a dashed arrow climbs from
 * follow-up into bind once the broker replies. The slide in view fills in and
 * dots underneath show where the reader is.
 */
const STACK = { top: 4, under: 2 };
const PHONE_SLIDES: number[][] = [[0], [1], [3], [STACK.top, STACK.under]];

function PhoneStage({ s, on, cardRef }: { s: (typeof STAGES)[number]; on: boolean; cardRef?: (el: HTMLDivElement | null) => void }) {
  const detour = s.detour === true;
  const n = STAGES.filter((x) => !x.detour).indexOf(s) + 1;
  return (
    <div>
      <Eyebrow className="mb-2" style={{ fontSize: 13 }}>
        {detour ? s.stage : `Stage ${n} · ${s.stage}`}
      </Eyebrow>
      <div
        ref={cardRef}
        data-ui="Journey stage" data-src="src/pieces/bindDesk.tsx › JourneyCarousel"
        className="rounded-[12px] p-5 transition-colors duration-500"
        style={{ background: on ? SURFACE : FACE, border: `1px ${detour ? "dashed" : "solid"} ${detour ? MUTED : DIVIDER}` }}
      >
        <dl className="space-y-3">
          {(
            [
              ["Pain point", s.pain],
              ["Need", s.need],
              ["User action", s.action],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="uppercase" style={{ ...LABEL, fontSize: 12, color: MUTED }}>
                {k}
              </dt>
              <dd className={`m-0 ${SM}`} style={ink2}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="mt-4 space-y-2">
        <Eyebrow style={{ fontSize: 13 }}>Evidence</Eyebrow>
        {s.evidence.map((e) => (
          <p key={e} className={SM} style={ink2}>
            <Marked text={e} />
          </p>
        ))}
      </div>
    </div>
  );
}

/** A short sideways arrow between slides: solid on the main path, dashed into the detour. */
function SideArrow({ dashed = false, top }: { dashed?: boolean; top: number }) {
  const c = dashed ? MUTED : INK;
  return (
    <svg aria-hidden className="absolute right-0 w-6" style={{ top }} height={14} viewBox="0 0 24 14" fill="none">
      <path d="M 3 7 L 19 7" stroke={c} strokeWidth={dashed ? 1.5 : 2} strokeDasharray={dashed ? "3 3" : undefined} strokeLinecap="round" />
      <path d="M 14 2 L 20 7 L 14 12" stroke={c} strokeWidth={dashed ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JourneyCarousel() {
  const track = useRef<HTMLOListElement>(null);
  const [at, setAt] = useState(0);
  /** Where the two stacked cards sit in their slide, so review's arrows land on each. */
  const topCard = useRef<HTMLDivElement | null>(null);
  const underCard = useRef<HTMLDivElement | null>(null);
  const [aim, setAim] = useState({ top: 120, under: 600 });
  useLayoutEffect(() => {
    const measure = () => {
      const li = topCard.current?.closest("li");
      if (!li || !topCard.current || !underCard.current) return;
      const base = li.getBoundingClientRect().top;
      const mid = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return Math.round(r.top - base + Math.min(r.height / 2, 90) - 7);
      };
      setAim({ top: mid(topCard.current), under: mid(underCard.current) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    return () => ro.disconnect();
  }, []);
  /** Distance between two slides' left edges. */
  const stride = () => {
    const kids = track.current?.children;
    return kids && kids.length > 1 ? (kids[1] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft : 0;
  };
  const go = (i: number) => track.current?.scrollTo({ left: i * stride(), behavior: reduceMotion() ? "auto" : "smooth" });
  const last = PHONE_SLIDES.length - 1;
  return (
    <div data-ui="Carousel" data-src="src/pieces/bindDesk.tsx › JourneyCarousel" className="md:hidden">
      <ol
        ref={track}
        onScroll={(e) => {
          const st = stride();
          if (st) setAt(Math.round(e.currentTarget.scrollLeft / st));
        }}
        className="no-scrollbar -mx-6 flex list-none snap-x snap-mandatory items-start overflow-x-auto p-0 px-6 [scroll-padding-inline:24px]"
        aria-label="Journey stages, swipe sideways"
      >
        {PHONE_SLIDES.map((slide, i) => {
          const on = at === i;
          const stacked = slide.length > 1;
          return (
            <li
              key={slide.join("-")}
              className="relative shrink-0 snap-start"
              style={{ width: i < last ? "calc(100% - 24px)" : "calc(100% - 48px)", paddingRight: i < last ? 24 : 0 }}
              aria-label={`Slide ${i + 1} of ${PHONE_SLIDES.length}`}
            >
              {stacked ? (
                <>
                  <PhoneStage s={STAGES[STACK.top]} on={on} cardRef={(el) => (topCard.current = el)} />
                  {/* Up from follow-up into bind, once the broker replies. */}
                  <div className="my-4 flex items-center gap-3 pl-6" aria-hidden>
                    <svg width={14} height={44} viewBox="0 0 14 44" fill="none">
                      <path d="M 7 42 L 7 4" stroke={MUTED} strokeWidth={1.5} strokeDasharray="3 3" strokeLinecap="round" />
                      <path d="M 2 9 L 7 3 L 12 9" stroke={MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="uppercase" style={{ ...LABEL, fontSize: 11, color: MUTED }}>
                      Broker replies
                    </span>
                  </div>
                  <p className="mb-1 uppercase" style={{ ...LABEL, fontSize: 11, color: MUTED }}>
                    Document missing or mismatch found
                  </p>
                  <PhoneStage s={STAGES[STACK.under]} on={on} cardRef={(el) => (underCard.current = el)} />
                </>
              ) : (
                <PhoneStage s={STAGES[slide[0]]} on={on} />
              )}
              {/* On to the next slide; review splits, solid into bind and dashed into follow-up. */}
              {i < last ? (
                i === last - 1 ? (
                  <>
                    <SideArrow top={aim.top} />
                    <SideArrow dashed top={aim.under} />
                  </>
                ) : (
                  <SideArrow top={120} />
                )
              ) : null}
            </li>
          );
        })}
      </ol>
      <div data-ui="Pagination" data-src="src/pieces/bindDesk.tsx › JourneyCarousel" className="mt-5 flex items-center justify-center gap-2" role="group" aria-label="Choose a slide">
        {PHONE_SLIDES.map((slide, i) => (
          <button
            key={slide.join("-")}
            type="button"
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}: ${slide.map((k) => STAGES[k].stage).join(" and ")}`}
            aria-current={at === i ? "true" : undefined}
            className="h-2 rounded-full p-0 transition-all duration-200"
            style={{ width: at === i ? 20 : 8, background: at === i ? INK : DIVIDER }}
          />
        ))}
      </div>
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
function ScenarioCard({ s, i }: { s: Scenario; i: number }) {
  return (
    <article data-ui="Media object" data-src="src/pieces/bindDesk.tsx › ScenarioCard">
      <Eyebrow>Scenario {i + 1}</Eyebrow>
      <h4 className={`mt-2 ${STATEMENT}`}>{s.title}</h4>
      <div className="mt-6 grid items-center gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10">
        <div>
          <Clip name={s.clip} label={s.label} />
          {s.need ? (
            <p className="mt-3">
              <Need>{s.need}</Need>
            </p>
          ) : null}
        </div>
        <div className={`space-y-3 ${MD}`} style={ink2}>
          {/* The problem stays all grey; only the solution carries highlights. */}
          <p>{s.problem.split("**").join("")}</p>
          <p>
            <Marked text={s.solution} />
          </p>
        </div>
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
        <li key={o.area} className="flex flex-col">
          {/* The title sits above the card, outside it. */}
          <p className={`mb-3 ${H4}`} style={ink}>
            {o.area}
          </p>
          <dl data-ui="Card" data-src="src/pieces/bindDesk.tsx › OutcomeRows" className={`m-0 flex flex-1 flex-col gap-4 rounded-[12px] p-6 ${SM}`} style={card}>
            <div>
              <dt className="uppercase" style={{ ...LABEL, fontSize: 12, color: MUTED }}>
                With Bind Desk
              </dt>
              <dd className="m-0" style={ink2}>
                <Marked text={o.outcome} />
              </dd>
            </div>
            {/* Under a divider that runs edge to edge across the card, pinned to its foot so the rows line up. */}
            <div className="-mx-6 mt-auto px-6 pt-4" style={{ borderTop: `1px solid ${DIVIDER}` }}>
              <dt className="uppercase" style={{ ...LABEL, fontSize: 12, color: MUTED }}>
                In the logs
              </dt>
              <dd className="m-0" style={ink2}>
                {o.evidence}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ sections ------------------------------ */

/** The hero. CaseStudy renders this under the meta row in place of its default title line: the title, where it came from, and three facts in a row. */
const INTRO = (
  <div>
    <h1 className={`max-w-3xl ${TITLE}`}>
      Redesigning Bind Desk for faster, safer binding
    </h1>
    <p className={`mt-4 max-w-3xl ${SM}`} style={ink2}>
      Design exercise against a supplied brief and research materials. Company, people and data are fictional.
    </p>
    <dl data-ui="Facts" data-src="src/pieces/bindDesk.tsx › INTRO" className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
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
        <div className="mt-6">
          <PrototypeLink>Open the prototype</PrototypeLink>
        </div>
      </Band>
    ),
  },
  {
    id: "solution",
    title: "Solution",
    children: (
      <div>
        <div className="space-y-20 pt-4">
          {SCENARIOS.map((s, i) => (
            <ScenarioCard key={s.title} s={s} i={i} />
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
        <div>
          <JourneyCarousel />
          <div className="hidden md:block">
            <Journey />
          </div>
        </div>
        <div>
          <SectionHead title="Stakeholder expectations" />
          <Expectations />
        </div>
        {/* A card the full width of the column, not a full-bleed band. */}
        <figure
          data-ui="Pull quote" data-src="src/pieces/bindDesk.tsx › section insights"
          className="rounded-[16px] px-8 py-8 md:px-12"
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
        <p className={STATEMENT} style={ink2}>
          <Marked text="Underwriting assistants **lose most of each submission before the checklist starts**: **hunting for documents** across the portal, email and fax, then **reading two documents line by line** for a mismatch. One that slips through binds a policy with a **coverage gap the firm cannot undo**." />
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
        <OutcomeRows />
      </div>
    ),
  },
  {
    id: "next-steps",
    title: "Next Steps",
    children: (
      <ul data-ui="Card grid" data-src="src/pieces/bindDesk.tsx › section next-steps" className="grid list-none gap-4 p-0 md:grid-cols-2">
        {NEXT.map((n) => (
          <li key={n.label} data-ui="Card" data-src="src/pieces/bindDesk.tsx › section next-steps" className="rounded-[12px] p-6" style={card}>
            <Eyebrow style={{ fontSize: 13 }}>{n.label}</Eyebrow>
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
    children: (
      <div className="max-w-3xl">
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
