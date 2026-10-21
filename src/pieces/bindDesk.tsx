import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { CaseStudySection } from "./CaseStudy";
import { ArrowIcon } from "../organized/ArrowIcon";
import { COPYRIGHT } from "../organized/SiteFooter";
import { DIVIDER, INK, MONO, MUTED, RelatedProjects } from "./caseStudyBits";

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

/* The original's palette, mapped onto the portfolio's tokens. */
const FACE = "var(--cs-face, #fdfeff)";
/** Cards sit a step off the page, as the original's white cards did. */
const SURFACE = "var(--cs-card, #f6f7f9)";
/** Bar tracks and table heads. */
const WELL = "var(--cs-well, #e9ecf0)";

const DISPLAY = "font-['Roboto_Slab'] font-normal";
/** The original's text-md: body copy. */
const MD = "text-[16px] leading-[24px]";
const SM = "text-[13px] leading-[18px]";
const XS = "text-[12px] leading-[16px]";

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
const card = { background: SURFACE, border: `1px solid ${DIVIDER}` };

/** The original's small uppercase eyebrow, in the portfolio's mono. */
function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`uppercase tracking-[0.08em] ${XS} ${className}`} style={{ fontFamily: MONO, fontWeight: 500, color: MUTED }}>
      {children}
    </p>
  );
}

/** A section's display title and lede, as the original's Section header. */
function SectionHead({ title, lede }: { title: string; lede?: ReactNode }) {
  return (
    <div className="mb-10 md:mb-16">
      <h3 className={`max-w-3xl ${DISPLAY} text-[30px] leading-9 tracking-[-0.01em] md:text-[40px] md:leading-[46px]`}>{title}</h3>
      {lede ? (
        <p className={`mt-3 max-w-2xl ${MD}`} style={ink2}>
          {lede}
        </p>
      ) : null}
    </div>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className={`mb-6 ${DISPLAY} text-[24px] leading-8 md:text-[26px]`}>{title}</h4>
      {children}
    </div>
  );
}

function Callout({ title, children, footer, left = false }: { title: string; children: ReactNode; footer?: ReactNode; left?: boolean }) {
  return (
    <div className={`rounded-[14px] px-6 py-7 md:px-12 md:py-8 ${left ? "text-left" : "text-center"}`} style={card}>
      <h4 className={`${DISPLAY} text-[24px] leading-8 md:text-[28px] md:leading-9`}>{title}</h4>
      <div className={`mt-3 max-w-2xl ${left ? "" : "mx-auto"}`}>{children}</div>
      {footer}
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
    <div className="group relative overflow-hidden rounded-[14px]">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" aria-label={`${label} (opens in a new tab)`} className="block">
          {video}
          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${XS}`}
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

function Journey() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute left-0 right-0 top-[15px] hidden h-px md:block" style={{ background: DIVIDER }} />
      <ol className="grid gap-8 md:grid-cols-6 md:gap-4">
        {JOURNEY.map((s, i) => (
          <li key={s.stage} className="relative flex gap-3 md:block">
            <span
              className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${XS}`}
              style={{ border: `1px solid ${INK}`, background: INK, color: FACE, fontFamily: MONO }}
            >
              {i + 1}
            </span>
            <div className="md:mt-4">
              <h5 className={`${MD} font-semibold`}>{s.stage}</h5>
              <p className={`mt-1 ${SM}`} style={ink2}>
                {s.happens}
              </p>
              <p className={`mt-2 border-l-2 pl-2 ${XS}`} style={{ ...ink2, borderColor: MUTED }}>
                {s.evidence}
              </p>
              <p
                className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${XS}`}
                style={s.agrees ? { background: INK, color: FACE, border: `1px solid ${INK}` } : { color: INK, border: `1px solid ${MUTED}` }}
              >
                <Icon d={s.agrees ? CHECK : ALERT} />
                {s.agrees ? "Agrees" : "Gap"}
                <span className="sr-only">: </span>
              </p>
              <p className={`mt-1 ${XS}`} style={ink2}>
                {s.fitNote}
              </p>
              <p className={`mt-2 font-medium ${XS}`} style={ink}>
                <span style={ink2}>You: </span>
                {s.check}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------ charts ------------------------------ */

function Bar({ label, value, max, display, quiet = false }: { label: string; value: number; max: number; display: string; quiet?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${SM}`}>
      <span className="w-[112px] shrink-0 sm:w-[150px]" style={ink2}>
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-6 flex-1 rounded-[6px]" style={{ background: WELL }}>
          <div className="h-6 rounded-[6px]" style={{ width: `${(value / max) * 100}%`, background: quiet ? MUTED : INK }} />
        </div>
        <span className="w-[56px] shrink-0 text-[13px]" style={{ ...ink, fontFamily: MONO }}>
          {display}
        </span>
      </div>
    </div>
  );
}

function MismatchChart() {
  return (
    <figure className="mt-6 rounded-[14px] p-5" style={card}>
      <figcaption className={`mb-4 font-medium ${SM}`}>Submissions with a mismatch, 30 days</figcaption>
      <div className="space-y-3">
        <Bar label="Assistant A" value={23} max={61} display="38%" />
        <Bar label="Assistant B" value={19} max={54} display="35%" />
      </div>
      <p className={`mt-3 ${XS}`} style={ink2}>
        23 of 61 and 19 of 54. Assistant B&rsquo;s guess: 33%.
      </p>
    </figure>
  );
}

function MinutesChart({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={compact ? "mt-4" : "mt-6 rounded-[14px] p-5"} style={compact ? undefined : card}>
      {compact ? null : <figcaption className={`mb-4 font-medium ${SM}`}>Minutes per submission</figcaption>}
      <div className="space-y-3">
        <Bar label="Find documents (Assistant B)" value={11} max={14} display="11 min" />
        <Bar label="First flag (Assistant A)" value={14} max={14} display="14 min" />
        <Bar label="Checklist (Assistant B)" value={3} max={14} display="3 min" quiet />
      </div>
      {compact ? null : (
        <p className={`mt-3 ${XS}`} style={ink2}>
          Different people, so the bars aren&rsquo;t added.
        </p>
      )}
    </figure>
  );
}

/* ------------------------------ table ------------------------------ */

/** A real table from md up. Below it each row stacks, with its own labels. */
function ResponsiveTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-[14px]" style={card}>
      <table className={`w-full text-left ${SM}`}>
        <thead className={`hidden md:table-header-group ${XS}`} style={{ background: WELL, color: MUTED }}>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-5 py-2.5 font-medium" style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="block px-5 py-4 md:table-row md:p-0" style={{ borderBottom: ri === rows.length - 1 ? "none" : `1px solid ${DIVIDER}` }}>
              {r.map((c, i) => (
                <td
                  key={i}
                  className={`block md:table-cell md:px-5 md:py-3.5 md:align-top ${i === 0 ? `${MD} font-semibold md:w-[30%]` : "mt-1 md:mt-0"}`}
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
    <ol className="grid gap-4 md:grid-cols-3">
      {items.map(([title, rest], i) => (
        <li key={title} className="rounded-[14px] p-5" style={card}>
          <p className={XS} style={{ ...ink2, fontFamily: MONO }}>
            {label} {i + 1}
          </p>
          <h5 className={`mt-1 font-semibold ${MD}`}>{title}</h5>
          <p className={`mt-1 ${SM}`} style={ink2}>
            {rest}
          </p>
        </li>
      ))}
    </ol>
  );
}

function QuestionCards() {
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {QUESTIONS.map((q, i) => (
        <li key={q.q} className="flex flex-col rounded-[14px] p-5" style={card}>
          <span className={XS} style={{ ...ink2, fontFamily: MONO }}>
            Q{i + 1}
          </span>
          <p className={`mt-1 font-semibold ${MD}`}>{q.q}</p>
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

/* ---------------------------- scenarios ---------------------------- */

/** The copy beside its clip. Alternate rows swap sides; on the phone the copy comes first. */
function ScenarioCard({ s, flip }: { s: Scenario; flip: boolean }) {
  return (
    <article className={`grid gap-6 md:items-center md:gap-12 ${flip ? "md:grid-cols-[1.45fr_1fr]" : "md:grid-cols-[1fr_1.45fr]"}`}>
      <div className={flip ? "md:order-2" : ""}>
        <h4 className={`${DISPLAY} text-[26px] leading-8`}>{s.title}</h4>
        <div className="mt-5 space-y-4 text-[16px] leading-7" style={ink2}>
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
            <p className={`border-l-2 pl-3 text-[13px] leading-6`} style={{ ...ink2, borderColor: DIVIDER }}>
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
      <span className="inline-flex items-center gap-1 font-semibold" style={ink}>
        <Icon d={AI_ICON[variant]} size={13} />
        {variant}
      </span>
      <span style={ink2}>{did}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-medium" style={pill}>
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
        <dl id={id} className="mt-2 w-full space-y-2.5 pt-2" style={{ borderTop: `1px solid ${DIVIDER}` }}>
          {rows.map(([k, v]) =>
            v.length ? (
              <div key={k}>
                <dt className="mb-0.5 font-semibold" style={ink}>
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

function AiTagGrid() {
  return (
    <ul className="mt-6 grid items-start gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
      {TAGS.map((t) => (
        <li key={t.variant} className="rounded-[10px] p-3" style={{ background: FACE, border: `1px solid ${DIVIDER}` }}>
          <AiTag {...t} />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------ sections ------------------------------ */

/**
 * The hero. CaseStudy renders this under the meta row in place of its
 * default title line: title on the left, buttons on the right, then the loop.
 */
const INTRO = (
  <div>
    <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-end">
      <h1 className={`${DISPLAY} text-[40px] leading-[44px] tracking-[-0.02em] md:text-[56px] md:leading-[60px]`}>
        Bridging the gap between stakeholder expectations and user pain points
      </h1>
      <div className="flex flex-wrap gap-2">
        <PrototypeLink>Open the prototype</PrototypeLink>
        <PrototypeLink href={TOUR} outline>
          Start the guided tour
        </PrototypeLink>
      </div>
    </div>
    <div className="mt-14">
      <Clip name="bind-desk" label="Open the prototype: product walkthrough video" href={PROTOTYPE} />
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
    children: (
      <p className={`max-w-3xl ${DISPLAY} text-[24px] leading-8 md:text-[28px] md:leading-9`}>
        The operations director asked for a faster checklist. The logs show the
        checklist takes 3 minutes. Bind Desk leaves it alone and fixes the slow
        work around it, with a person approving each decision that matters.
      </p>
    ),
  },
  {
    id: "problem",
    title: "The Problem",
    children: (
      <div>
        <SectionHead
          title="A fast checklist inside a slow week"
          lede="At a 40-person brokerage, assistants can’t bind a policy until every document is in and every coverage limit matches. Two interviews and 30 days of logs from the legacy checklist spreadsheet show where their time goes."
        />
        <div className="space-y-24 md:space-y-32">
          <Sub title="Today’s journey">
            <Journey />
          </Sub>
          <Callout title="The problem" left>
            <p className={MD} style={ink2}>
              <strong className="font-semibold" style={ink}>
                The checklist is the fastest step.
              </strong>{" "}
              Finding documents and spotting mismatches take longer, and broker
              replies take days. About one in three submissions has a mismatch.
            </p>
          </Callout>
        </div>
      </div>
    ),
  },
  {
    id: "findings",
    title: "Findings",
    children: (
      <div className="space-y-24 md:space-y-32">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Where the sources agree</Eyebrow>
            <p className={`mt-2 ${DISPLAY} text-[24px] leading-8`}>Mismatches are frequent.</p>
            <p className={`mt-2 ${MD}`} style={ink2}>
              Assistant B guessed &ldquo;maybe a third&rdquo;. The logs show 35&ndash;38%.
            </p>
            <MismatchChart />
          </div>
          <div>
            <Eyebrow>Where they disagree</Eyebrow>
            <p className={`mt-2 ${DISPLAY} text-[24px] leading-8`}>Assistant A wants autofill. Their log points elsewhere.</p>
            <p className={`mt-2 ${MD}`} style={ink2}>
              Their time goes to mismatches and broker waits.
            </p>
            <MinutesChart />
          </div>
        </div>

        <Sub title="Stakeholder expectations">
          <ResponsiveTable head={["Asked for", "How it appears", "Evidence"]} rows={EXPECTATIONS} />
        </Sub>

        <div>
          <Eyebrow>Pushback</Eyebrow>
          <div className="mt-2 grid gap-10 md:grid-cols-[1.3fr_1fr] md:gap-12">
            <div>
              <h4 className={`${DISPLAY} text-[26px] leading-9 md:text-[32px] md:leading-10`}>
                &ldquo;Our users asked for the wishlist. Why are you showing me something else?&rdquo;
              </h4>
              <p className={`mt-6 text-[16px] leading-7`} style={ink2}>
                <strong className="font-semibold" style={ink}>
                  The checklist is 3 minutes of the work.
                </strong>{" "}
                The rest of the week goes to the steps around it. Every wishlist
                item still has a place, sized to its evidence.
              </p>
            </div>
            <aside className="self-start rounded-[14px] p-5" style={card}>
              <Eyebrow>Where the minutes go, per submission</Eyebrow>
              <MinutesChart compact />
            </aside>
          </div>
        </div>
      </div>
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
        <div className="space-y-20 md:space-y-28">
          {SCENARIOS.map((s, i) => (
            <ScenarioCard key={s.id} s={s} flip={i % 2 === 1} />
          ))}
        </div>
        <div className="mt-16 md:mt-20">
          <PrototypeLink>
            Try the prototype <ArrowIcon size={16} />
          </PrototypeLink>
        </div>
      </div>
    ),
  },
  {
    id: "human-in-the-loop",
    title: "Human in the Loop",
    children: (
      <div className="space-y-24 md:space-y-32">
        <Callout title="AI tag" footer={<AiTagGrid />}>
          <p className={MD} style={ink2}>
            Marks anything AI changed, with a review state and a &ldquo;Why?&rdquo; link to the source.
          </p>
        </Callout>
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
      </div>
    ),
  },
  {
    id: "open-questions",
    title: "Open Questions",
    children: (
      <div>
        <SectionHead title="What we still need to learn" lede="Each answer confirms the design or changes one part of it." />
        <QuestionCards />
      </div>
    ),
  },
  {
    id: "outcome",
    title: "Outcome & Reflection",
    children: (
      <div>
        <SectionHead title="Ship the mismatch check first" lede="Start where the evidence is strongest. The next round decides the rest." />
        <PhaseCards items={NEXT_STEPS} label="Step" />
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
      <div className={`flex flex-col gap-1.5 pt-6 ${SM}`} style={{ borderTop: `1px solid ${DIVIDER}`, color: MUTED }}>
        <p>{COPYRIGHT}</p>
        <p className={XS}>Company, people and data in this case study are fictional.</p>
      </div>
    ),
  },
];
