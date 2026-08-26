import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardImage, type Project } from "./projects";
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

/**
 * Layout read straight off `MacBook Pro 14" - 1` (322:11690), a 1512x982
 * frame. Everything below is that file's own number rather than a rounded
 * approximation, so the odd decimals are deliberate.
 */
/**
 * Layout read off the Greenera case study itself (`Container` 67:12759):
 * `Sidebar` 67:12760 is 253 wide with its `Sections Container` inset 40 —
 * the numbers the rail actually has to fit, longest label included. (An
 * earlier read off a scaled-down frame gave 207/48.5, which poured
 * "INITIAL FINDINGS" over the divider.)
 */
/** `Sidebar` 67:12760, and the inset its `Sections Container` sits at. */
const SIDEBAR_W = 253;
const SIDEBAR_PAD = 40;
/** `Section Link` 67:13042 — padding, the gap between links, and the accent
 *  bar the active one carries. */
const RAIL_PY = 11.082;
const RAIL_GAP = 11.082;
const RAIL_FONT = 16.622;
const RAIL_BAR = 2.77;
/** `Project Header` 67:13060 inside `Main Content` 67:13056. */
const BODY_PAD_X = 110.816;
const BODY_W = 1079.536;
/** Hero bottom to the header — `Frame 48096010`'s own top padding. */
const BODY_PAD_TOP = 92.347;
/** Header/section to the next block — every top-level block in the file sits
 *  this far from the one before it, uniformly: 260.204 - 200.204,
 *  563.642 - 503.642, 1194.362 - 1134.362, and so on down the page. */
const SECTION_GAP = 60;
/** A section's own heading to its first line of body copy — `TLDR Section
 *  Block` 325:11704's own gap, which also separates its two paragraphs. */
const HEAD_GAP = 22.163;
/** `2ae66f10…-1920x1080` 67:13059 — 1301.168 x 731.907, i.e. 16:9. */
const HERO_ASPECT = 731.907 / 1301.168;
/** Type scale, all DM Mono Medium / DM Sans / Roboto Slab Regular. */
const META_FONT = 18.469;
const META_GAP = 28.628;
const META_PY = 7.388;
const TITLE_FONT = 44.327;
const TITLE_TRACK = 0.8865;

export type CaseStudySection = {
  /** Rail label, and the scroll target's id. */
  id: string;
  title: string;
  children?: React.ReactNode;
  /** Renders no heading above the body — the section styles its own. */
  hideTitle?: boolean;
  /** Omitted from the section rail while still rendering in the body. */
  inRail?: boolean;
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function CaseStudy({
  project,
  sections = DEFAULT_SECTIONS,
  chrome = 1,
}: {
  project: Project;
  /** Still threaded from the desk, but the page no longer inverts with it. */
  theme: Theme;
  sections?: CaseStudySection[];
  /**
   * How much of the page's furniture is unfolded, 0..1. At 0 the hero fills
   * the card exactly and everything else is collapsed or below the fold, so
   * the page *is* the thumbnail; at 1 it is the full case study.
   *
   * This is what lets the expand read as one continuous object: the hero is
   * never faded or swapped — it is the same element throughout, and the rail
   * and body simply open out around it.
   */
  chrome?: number;
}) {
  // The case study page is a printed sheet: it keeps the same paper white in
  // both themes rather than inverting with the desk around it, so the ink and
  // rule that sit on it are fixed to match.
  const face = "#fdfeff";
  const ink = "#18191a";
  const muted = "#7c838b";
  const divider = "#e3e5e8";
  const accent = "#0059ff";

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

  /**
   * The body's live box, and the hero's own aspect. Together these give the
   * two heights the hero interpolates between — filling the card, and its
   * natural block height — and a ResizeObserver keeps the first honest while
   * the page is still growing underneath it.
   */
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [heroAspect, setHeroAspect] = useState(0);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (chrome >= 0.999) return;
    const el = bodyRef.current;
    if (el && el.scrollTop !== 0) el.scrollTop = 0;
  }, [chrome]);

  const heroSrc = cardImage(project);
  // The file crops the hero to 16:9 (1301.168 x 731.907) rather than letting
  // the asset's own proportions decide, so the header always lands in the
  // same place. `heroAspect` is still measured — it is the fallback for an
  // image that has not loaded yet.
  const heroH =
    box.w && box.h
      ? lerp(box.h, box.w * (HERO_ASPECT || heroAspect), chrome)
      : undefined;

  return (
    <div className="flex h-full w-full" style={{ background: face, color: ink }}>
      {/* Section rail. A fixed column, outside the scroll — only the body
          column moves, exactly as authored in the Figma file. */}
      <nav
        className="hidden shrink-0 flex-col overflow-hidden lg:flex"
        style={{
          // Folds out of nothing rather than fading in: at chrome 0 it has no
          // width at all, so the hero genuinely owns the whole card.
          width: SIDEBAR_W * chrome,
          opacity: chrome,
          borderRight: chrome > 0.02 ? `1px solid ${divider}` : "none",
          // The file bottom-anchors the list rather than centring it: the
          // container sits at y 557.861 in a 982-tall sidebar, which is
          // exactly 982 - 375.633 - 48.506. Same inset on the left.
          justifyContent: "flex-end",
          gap: RAIL_GAP,
          paddingLeft: SIDEBAR_PAD * chrome,
          paddingRight: SIDEBAR_PAD * chrome,
          paddingBottom: SIDEBAR_PAD,
        }}
        aria-hidden={chrome < 0.5}
        aria-label={`${project.name} sections`}
      >
        {sections.map((s) =>
          s.inRail === false ? null : (
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
            className="whitespace-nowrap uppercase transition-colors duration-200"
            style={{
              // Only the active link carries the bar and the indent — the
              // rest sit flush at the rail's own inset, so the current
              // section steps out of the column rather than merely
              // recolouring. That step is the design (67:13042 vs 67:13044),
              // not an oversight.
              color: active === s.id ? accent : muted,
              borderLeft: active === s.id ? `${RAIL_BAR}px solid ${accent}` : "none",
              paddingLeft: active === s.id ? RAIL_PY : 0,
              paddingBlock: RAIL_PY,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              fontSize: RAIL_FONT,
            }}
          >
            {s.title}
          </a>
        ))}
      </nav>

      {/* Body column — the only part that scrolls. */}
      <div
        ref={bodyRef}
        className="min-w-px flex-1"
        data-cs-scroller
        data-no-track-drag
        style={{
          // Locked while the page is still unfolding, so the body cannot be
          // scrolled away from the hero mid-move.
          overflowY: chrome > 0.99 ? "auto" : "hidden",
        }}
      >
        {/* Full-width art above the header, per the Figma layout, and the
            rail's Intro scroll target. This is the same image the folder
            sheet shows — at chrome 0 it fills the card exactly, so expanding
            unfolds the page around it instead of replacing it. */}
        <div
          id={`${project.slug}-intro`}
          style={{ height: heroH, overflow: "hidden" }}
        >
          <img
            src={heroSrc}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth) setHeroAspect(img.naturalHeight / img.naturalWidth);
            }}
            className="block h-full w-full select-none object-cover"
          />
        </div>
        <div
          style={{
            maxWidth: BODY_W + BODY_PAD_X * 2,
            width: "100%",
            boxSizing: "border-box",
            marginInline: 0,
            paddingInline: `clamp(24px, 6vw, ${BODY_PAD_X}px)`,
            paddingTop: BODY_PAD_TOP * chrome,
            paddingBottom: 120,
          }}
        >
          <header style={{ marginBottom: SECTION_GAP }}>
            <div
              className="flex items-start uppercase"
              style={{
                color: muted,
                gap: META_GAP,
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                fontSize: META_FONT,
                paddingBlock: META_PY,
              }}
            >
              <span>{project.name}</span>
              {project.type ? <span>{project.type}</span> : null}
              {project.year ? <span>{project.year}</span> : null}
            </div>
            {/* No `capitalize`: the file sets this in sentence case
                ("…Identity for Hackathons"), and the utility was forcing a
                capital F onto the preposition. */}
            <h1
              className="font-['Roboto_Slab'] font-normal"
              style={{
                marginTop: RAIL_GAP,
                fontSize: TITLE_FONT,
                letterSpacing: TITLE_TRACK,
                lineHeight: "normal",
                maxWidth: 934.551,
              }}
            >
              {project.title ?? project.name}
            </h1>
          </header>

          {sections.map((s) =>
            // "intro" has no section of its own — the hero above already
            // owns that anchor (`${project.slug}-intro`). Rendering a
            // <section> here too gave the page a second element with the
            // same id, and a bare "Intro" heading sitting in empty space.
            s.id === "intro" ? null : (
            <section
              key={s.id}
              id={`${project.slug}-${s.id}`}
              style={{ scrollMarginTop: 40, marginBottom: SECTION_GAP }}
            >
              {s.hideTitle ? null : (
                <h2
                  className="uppercase"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 500,
                    fontSize: META_FONT,
                    color: muted,
                    paddingBlock: META_PY,
                    marginBottom: HEAD_GAP,
                  }}
                >
                  {s.title}
                </h2>
              )}
              {s.children !== undefined ? (
                s.children
              ) : (
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
