import { useEffect, useRef, useState } from "react";
import type { Project } from "./projects";
import type { Theme } from "./Piece";

/**
 * The scrollable case-study shell that fills an expanded project sheet
 * (Figma `project_div` 224:7495 → `Folder Back` 224:801).
 *
 * Deliberately a *template*, not one project's page: the six case studies are
 * being designed one at a time, so this owns the chrome they all share — the
 * static section rail, the header block, the body column and the section
 * rhythm — and takes the actual content as `sections`. Greenera's layout is
 * the reference (sidebar 253px, body column 1147px inside a 1387px main), so
 * dropping its real content in later means filling `sections`, not rebuilding
 * this.
 *
 * Per the Figma file, the rail never moves: the card is a fixed two-column
 * layout and only the body column scrolls, so the section list stays
 * reachable down a ~9700px case study. The rail tracks the reader with a
 * scroll-spy highlight instead.
 */

/** Figma's `Container`, inset 4px inside the 1649x1037 sheet. */
const SIDEBAR_W = 253;
const BODY_W = 1147;
/** The body column's inset inside `Main Content`. */
const BODY_PAD_X = 120;
const BODY_PAD_TOP = 100;

export type CaseStudySection = {
  /** Rail label, and the scroll target's id. */
  id: string;
  title: string;
  children?: React.ReactNode;
};

/** The rail Greenera ships with; a project can pass its own. */
export const DEFAULT_SECTIONS: CaseStudySection[] = [
  { id: "intro", title: "Intro" },
  { id: "tldr", title: "TL;DR" },
  { id: "brief", title: "Brief" },
  { id: "solution", title: "Solution" },
  { id: "initial-findings", title: "Initial Findings" },
  { id: "design-process", title: "Design Process" },
  { id: "goal", title: "Goal" },
  { id: "outcome", title: "Outcome" },
  { id: "reflection", title: "Reflection" },
];

export function CaseStudy({
  project,
  theme,
  sections = DEFAULT_SECTIONS,
}: {
  project: Project;
  theme: Theme;
  sections?: CaseStudySection[];
}) {
  const face = theme === "light" ? "#fdfeff" : "#2f2f2f";
  const ink = theme === "light" ? "#2f2f2f" : "#fdfeff";
  const muted = theme === "light" ? "#2f2f2f99" : "#fdfeff99";
  const divider = theme === "light" ? "#2f2f2f14" : "#fdfeff14";
  const accent = "#2563eb";

  // Scroll-spy: whichever section the reader is in lights up on the rail.
  // A rail click pins its section for the duration of the smooth scroll —
  // otherwise the spy re-lights intermediate sections mid-flight, and
  // bottom-dwelling sections can never reach the top threshold at all.
  const bodyRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<string | null>(null);
  const settleRef = useRef<number | undefined>(undefined);
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const update = () => {
      // Scrolled to the end: the last section can't reach the top, so the
      // bottom of the scroll owns the highlight.
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
        setActive(sections[sections.length - 1]?.id);
        return;
      }
      const top = el.getBoundingClientRect().top;
      let current = sections[0]?.id;
      for (const s of sections) {
        const sec = document.getElementById(`${project.slug}-${s.id}`);
        if (!sec) continue;
        if (sec.getBoundingClientRect().top - top <= 140) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!lockRef.current) {
        update();
        return;
      }
      // Pinned: resume spying once the smooth scroll has settled.
      window.clearTimeout(settleRef.current);
      settleRef.current = window.setTimeout(() => {
        lockRef.current = null;
        update();
      }, 150);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.clearTimeout(settleRef.current);
    };
  }, [project.slug, sections]);

  return (
    <div className="flex h-full w-full" style={{ background: face, color: ink }}>
      {/* Section rail. A fixed column, outside the scroll — only the body
          column moves, exactly as authored in the Figma file. */}
      <nav
        className="hidden shrink-0 flex-col justify-center gap-[12px] px-[40px] lg:flex"
        style={{ width: SIDEBAR_W, borderRight: `1px solid ${divider}` }}
        aria-label={`${project.name} sections`}
      >
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${project.slug}-${s.id}`}
            onClick={(e) => {
              // Native anchor navigation scrolls every scrollable ancestor,
              // which pans the whole desk page. Scroll only the body column.
              e.preventDefault();
              const el = bodyRef.current;
              const sec = document.getElementById(`${project.slug}-${s.id}`);
              if (!el || !sec) return;
              lockRef.current = s.id;
              setActive(s.id);
              window.clearTimeout(settleRef.current);
              const top =
                sec.getBoundingClientRect().top -
                el.getBoundingClientRect().top +
                el.scrollTop -
                40;
              el.scrollTo({ top, behavior: "smooth" });
            }}
            className="whitespace-nowrap py-[12px] text-[14px] uppercase transition-colors duration-200"
            style={{
              color: active === s.id ? accent : ink,
              opacity: active === s.id ? 1 : 0.55,
              borderLeft: `3px solid ${active === s.id ? accent : "transparent"}`,
              paddingLeft: 14,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.04em",
            }}
          >
            {s.title}
          </a>
        ))}
      </nav>

      {/* Body column — the only part that scrolls. */}
      <div ref={bodyRef} className="min-w-px flex-1 overflow-y-auto" data-no-track-drag>
        <div
          className="mx-auto"
          style={{ maxWidth: BODY_W, paddingInline: BODY_PAD_X, paddingTop: BODY_PAD_TOP, paddingBottom: 120 }}
        >
          <header style={{ marginBottom: 80 }}>
            <div className="flex items-center gap-[31px] text-[16px]" style={{ color: muted }}>
              <span>{project.name}</span>
              {project.type ? <span>{project.type}</span> : null}
              {project.year ? <span>{project.year}</span> : null}
            </div>
            <h1
              className="font-['Roboto_Slab'] font-medium capitalize"
              style={{ marginTop: 54 - 42, fontSize: 56, lineHeight: 1.125 }}
            >
              {project.title ?? project.name}
            </h1>
          </header>

          {sections.map((s) => (
            <section
              key={s.id}
              id={`${project.slug}-${s.id}`}
              style={{ scrollMarginTop: 40, marginBottom: 80 }}
            >
              <h2 className="text-[24px] font-semibold" style={{ marginBottom: 24 }}>
                {s.title}
              </h2>
              {s.children ?? (
                // Placeholder until this project's content is designed. Sized
                // off Greenera's blocks so the scroll length is representative.
                <div
                  className="rounded-[16px]"
                  style={{ height: 320, border: `2px dashed ${muted}`, opacity: 0.4 }}
                />
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
