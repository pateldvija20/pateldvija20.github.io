import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoopMedia } from "./LoopMedia";
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
/** The gap under the header's meta row. */
const RAIL_GAP = 11.082;
/**
 * The section rail is the same component as Organised mode's own nav
 * (Sidebar): DM Sans 16 on a 21 line, 24 apart, the quiet grey, and the
 * section the reader is in set in bold ink rather than picked out in blue.
 */
const NAV_FONT = 16;
const NAV_LINE = 21;
const NAV_GAP = 24;
const NAV_PAD = 60;
/** Height kept clear at the rail's top for the hanging lamp (LampSwitch at
 *  120 wide is ~134 tall), plus breathing room under its bulb. */
const LAMP_ROOM = 170;
/** `Project Header` 67:13060 inside `Main Content` 67:13056. */
const BODY_PAD_X = 110.816;
const BODY_W = 1079.536;
/** Hero bottom to the header — `Frame 48096010`'s own top padding. */
const BODY_PAD_TOP = 92.347;
/**
 * Header/section to the next block — every top-level block in the file sits
 * this far from the one before it, uniformly: 260.204 - 200.204,
 * 563.642 - 503.642, 1194.362 - 1134.362, and so on down the page.
 *
 * A clamp rather than the flat 80: on a phone the columns either side of a
 * block have collapsed into it, so 80px of air between every section turns a
 * long case study into a scroll through mostly nothing. The `vw` term is
 * 80/1512, so the desktop rhythm is the file's own to the pixel.
 */
const SECTION_GAP = "clamp(44px, 5.29vw, 80px)";
/** A section's own heading to its first line of body copy — `TLDR Section
 *  Block` 325:11704's own gap, which also separates its two paragraphs. */
const HEAD_GAP = 22.163;
/** `2ae66f10…-1920x1080` 67:13059 — 1301.168 x 731.907, i.e. 16:9. */
const HERO_ASPECT = 731.907 / 1301.168;
/**
 * Type scale, all DM Mono Medium / DM Sans / Roboto Slab Regular.
 *
 * The page is authored against a 1512-wide frame but is now reachable from the
 * Work grid at phone and tablet widths too, so the two display sizes are
 * expressed as clamps rather than fixed px: they hold the authored value on
 * desktop and shrink from there. The Figma number is the clamp's ceiling in
 * both cases, so nothing about the desktop rendering changes.
 */
const META_FONT = "clamp(13px, 1.22vw, 18.469px)";
/** Section headings ("TL;DR", "Identity"…): the meta size plus 2px. */
const SECTION_FONT = "clamp(15px, calc(1.22vw + 2px), 20.469px)";
const META_GAP = "clamp(14px, 1.9vw, 28.628px)";
const META_PY = 7.388;
export const TITLE_FONT = "clamp(28px, 2.93vw, 44.327px)";
export const TITLE_TRACK = 0.8865;
/**
 * The phone/tablet section picker's height, and the left inset that keeps it
 * clear of the overlay's floating back button (36px square, pinned to the
 * card's top-left corner).
 *
 * It doubles as the scroll offset every jump lands short by, so a section
 * heading arrives *under* the bar rather than behind it — which is why the
 * rail uses it too rather than its own number.
 */
export const PICKER_H = 48;
/** The bar's title starts clear of the back control, which now fills the bar's
 *  full height (a PICKER_H square) rather than a 36px corner tab. */
const PICKER_INSET = PICKER_H + 12;

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
  railTop,
}: {
  project: Project;
  /** Hung at the top of the section rail — Organised mode's lamp switch, as
   *  its own sidebar has. The desk passes nothing. */
  railTop?: React.ReactNode;
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
  // The page's palette. On the desk it is a printed sheet that stays paper
  // white in both themes; in Organised mode it follows the theme, through the
  // `--cs-*` tokens index.css sets there (dark mode only — light keeps these
  // fallbacks).
  const face = "var(--cs-face, #fdfeff)";
  const ink = "var(--cs-ink, #18191a)";
  const muted = "var(--cs-muted, #626262)";
  const divider = "var(--cs-divider, #e3e5e8)";

  // Scroll-spy: whichever section the reader is in lights up on the rail.
  // A rail click pins its section for the duration of the smooth scroll —
  // otherwise the spy re-lights intermediate sections mid-flight, and
  // bottom-dwelling sections can never reach the top threshold at all.
  const bodyRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<string | null>(null);
  const settleRef = useRef<number | undefined>(undefined);
  const [active, setActive] = useState(sections[0]?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);
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

  /**
   * Scroll the body column to a section, and pin the rail there for the
   * duration of the smooth scroll. Shared by the desktop rail and the phone
   * picker so the two cannot drift — both pin, both set `active` up front,
   * and both land on the same offset.
   */
  const goToSection = useCallback(
    (id: string) => {
      const el = bodyRef.current;
      const sec = document.getElementById(`${project.slug}-${id}`);
      if (!el || !sec) return;
      lockRef.current = id;
      setActive(id);
      window.clearTimeout(settleRef.current);
      const top =
        sec.getBoundingClientRect().top -
        el.getBoundingClientRect().top +
        el.scrollTop -
        PICKER_H;
      el.scrollTo({ top, behavior: "smooth" });
    },
    [project.slug],
  );

  /**
   * What the phone picker should read as current.
   *
   * The spy tracks every section, the picker only lists the ones the rail
   * shows (`inRail !== false`) — Greenera's metadata strip is a section with
   * no rail entry, and letting the select fall to a value it has no option
   * for blanks the control mid-scroll. Walking back to the nearest listed
   * section instead keeps it on the heading the reader last passed.
   */
  const railSections = sections.filter((s) => s.inRail !== false);
  const pickerValue = (() => {
    const i = sections.findIndex((s) => s.id === active);
    for (let j = i; j >= 0; j--) {
      if (sections[j].inRail !== false) return sections[j].id;
    }
    return railSections[0]?.id ?? "";
  })();

  // `compact` is the tighter scale from madhurima.me/work/loan-servicing: a
  // 800px column, 128px between sections, 15px mono labels, 12px under them.
  const compact = project.scale === "compact";
  const sectionGap = compact ? "clamp(72px, 8.9vw, 128px)" : SECTION_GAP;
  const heroSrc = cardImage(project);
  const introBlock = sections.find((s) => s.id === "intro")?.children;
  // The file crops the hero to 16:9 (1301.168 x 731.907) rather than letting
  // the asset's own proportions decide, so the header always lands in the
  // same place. `heroAspect` is still measured — it is the fallback for an
  // image that has not loaded yet.
  // A project can override the crop when its art is not 16:9 — Greenera's
  // three-screen lineup is 1212x600, and forcing it taller clips the outer
  // two phones.
  const cropAspect = project.heroAspect ?? HERO_ASPECT;
  const heroNatural = box.w * (cropAspect || heroAspect);
  const heroH =
    box.w && box.h
      ? lerp(box.h, project.heroMax ? Math.min(heroNatural, box.h * project.heroMax) : heroNatural, chrome)
      : undefined;

  return (
    <div className="flex h-full w-full" style={{ background: face, color: ink }}>
      {/* Section rail. A fixed column, outside the scroll — only the body
          column moves, exactly as authored in the Figma file. */}
      <nav
        data-ui="Side navigation" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
        className="no-scrollbar relative hidden shrink-0 flex-col overflow-x-hidden lg:flex"
        style={{
          // Folds out of nothing rather than fading in: at chrome 0 it has no
          // width at all, so the hero genuinely owns the whole card.
          width: SIDEBAR_W * chrome,
          opacity: chrome,
          borderRight: chrome > 0.02 ? `1px solid ${divider}` : "none",
          // The links sit at the foot of the column, 60 in, clear of the
          // lamp at the top. `safe`: a list taller than the space starts
          // under the lamp instead of running up into it, and the rail
          // scrolls for the rest.
          justifyContent: "safe flex-end",
          overflowY: chrome > 0.99 ? "auto" : "hidden",
          gap: NAV_GAP,
          paddingLeft: NAV_PAD * chrome,
          paddingRight: SIDEBAR_PAD * chrome,
          paddingTop: railTop ? LAMP_ROOM : 0,
          paddingBottom: SIDEBAR_PAD,
        }}
        aria-hidden={chrome < 0.5}
        aria-label={`${project.name} sections`}
      >
        {railTop ? (
          <div className="absolute top-0" style={{ left: 24, width: 120, opacity: chrome }}>
            {railTop}
          </div>
        ) : null}
        {sections.map((s) =>
          s.inRail === false ? null : (
            <a
              key={s.id}
              href={`#${project.slug}-${s.id}`}
            onClick={(e) => {
              // Native anchor navigation scrolls every scrollable ancestor,
              // which pans the whole desk page. Scroll only the body column.
              e.preventDefault();
              goToSection(s.id);
            }}
            aria-current={active === s.id ? "true" : undefined}
            data-cursor-frame="pill"
            className="w-fit whitespace-nowrap font-sans transition-colors duration-200"
            style={{
              // The section in view is bold ink; the rest the quiet grey.
              color: active === s.id ? ink : muted,
              fontWeight: active === s.id ? 700 : 400,
              fontSize: NAV_FONT,
              lineHeight: `${NAV_LINE}px`,
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
          // So a section can size itself to the column (`cqw`) and run edge to
          // edge, past the body's side padding.
          containerType: "inline-size",
        }}
      >
        {/* Full-width art above the header, per the Figma layout, and the
            rail's Intro scroll target. This is the same image the folder
            sheet shows — at chrome 0 it fills the card exactly, so expanding
            unfolds the page around it instead of replacing it. */}
        <div
          id={`${project.slug}-intro`}
          data-ui="Hero" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
          style={{
            height: heroH,
            overflow: "hidden",
            background: project.heroBg,
            ...(project.heroMax ? { display: "flex", justifyContent: "center" } : null),
          }}
        >
          {/* A capped hero keeps the art's own proportions, centred on the
              backdrop, rather than cropping it taller. */}
          <div
            className="h-full"
            style={project.heroMax ? { aspectRatio: 1 / (cropAspect || heroAspect || 0.65), maxWidth: "100%" } : { width: "100%" }}
          >
          <LoopMedia
            still={heroSrc}
            video={project.heroVideo}
            onAspect={setHeroAspect}
            // Clipped to the art's product window, so the project's backdrop
            // colour shows around it and the art itself is left untouched.
            className="block h-full w-full"
            style={project.heroClip ? { clipPath: project.heroClip } : undefined}
          />
          </div>
        </div>

        {/*
          The section rail, for widths that have no room for a column beside
          the body.

          Sticky and placed *after* the hero rather than pinned to the top of
          the card: it should ride up with the art and only take the top edge
          once the reader is actually in the body — the same moment the rail
          becomes useful on desktop.

          A native <select> rather than a custom menu. A case study runs nine
          sections and ~9,000px, so this is a real navigation control, and on
          a phone the platform picker is the one that scrolls properly,
          reaches the keyboard, and does not fight the body's own scroll.
        */}
        <div
          // z-5, not higher: it has to outrank the body's own positioned
          // figures (all at `auto`) but stay under the overlay's floating
          // back button at z-10, which shares this stacking context and must
          // never end up behind the bar.
          ref={pickerRef}
          data-ui="Top app bar" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
          className="sticky top-0 z-[5] lg:hidden"
          style={{
            height: PICKER_H,
            background: face,
            borderBottom: `1px solid ${divider}`,
            // Folds in with the rest of the chrome, and stays inert until the
            // page has finished opening — the body cannot be scrolled before
            // then anyway.
            opacity: chrome,
            pointerEvents: chrome > 0.99 ? "auto" : "none",
          }}
          aria-hidden={chrome < 0.5}
        >
          <button
            type="button"
            data-ui="Dropdown menu" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
            className="flex h-full w-full cursor-pointer items-center justify-between bg-transparent pr-4 text-left font-sans font-bold outline-none"
            style={{ color: ink, fontSize: NAV_FONT, paddingLeft: PICKER_INSET }}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            aria-label={`${project.name} sections`}
            onClick={() => setPickerOpen((o) => !o)}
          >
            {railSections.find((s) => s.id === pickerValue)?.title}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              style={{
                transform: pickerOpen ? "rotate(180deg)" : undefined,
                transition: "transform 0.2s",
              }}
            >
              <path d="m6 9 6 6 6-6" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* The open list, in the Work/Play/About/CV menu's own type with a
              hairline under every item. A native <select> cannot be styled
              this far, so the list is drawn here. */}
          {pickerOpen ? (
            <ul
              role="listbox"
              data-ui="Menu" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
              aria-label={`${project.name} sections`}
              className="absolute left-0 right-0 top-full m-0 list-none overflow-y-auto p-0"
              style={{
                background: face,
                borderBottom: `1px solid ${divider}`,
                maxHeight: "min(70vh, 480px)",
              }}
            >
              {railSections.map((s, i) => (
                <li key={s.id} role="option" aria-selected={s.id === pickerValue}>
                  <button
                    type="button"
                    className="w-full cursor-pointer bg-transparent text-left font-sans"
                    style={{
                      color: s.id === pickerValue ? ink : muted,
                      fontWeight: s.id === pickerValue ? 700 : 400,
                      fontSize: NAV_FONT,
                      lineHeight: `${NAV_LINE}px`,
                      padding: "16px 24px",
                      borderBottom: i === railSections.length - 1 ? "none" : `1px solid ${divider}`,
                    }}
                    onClick={() => {
                      setPickerOpen(false);
                      goToSection(s.id);
                    }}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div
          data-cs-body
          data-ui="Container" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
          style={{
            // Compact: exactly an 800px reading column, whatever the side padding is.
            maxWidth: compact
              ? `calc(800px + 2 * clamp(24px, 6vw, ${BODY_PAD_X}px))`
              : BODY_W + BODY_PAD_X * 2,
            width: "100%",
            boxSizing: "border-box",
            marginInline: compact ? "auto" : 0,
            paddingInline: `clamp(24px, 6vw, ${BODY_PAD_X}px)`,
            paddingTop: `calc(clamp(40px, 6.11vw, ${BODY_PAD_TOP}px) * ${chrome})`,
            paddingBottom: 120,
          }}
        >
          <header style={{ marginBottom: sectionGap }}>
            <div
              data-ui="Metadata" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
              className="flex flex-wrap items-start uppercase"
              style={{
                color: muted,
                gap: compact ? 24 : META_GAP,
                fontFamily: "'DM Mono', monospace",
                fontWeight: compact ? 400 : 500,
                fontSize: compact ? 14 : META_FONT,
                letterSpacing: compact ? "0.4px" : undefined,
                paddingBlock: compact ? 0 : META_PY,
              }}
            >
              <span>{project.name}</span>
              {project.type ? <span>{project.type}</span> : null}
              {project.year ? <span>{project.year}</span> : null}
            </div>
            {/* An "intro" section with content of its own replaces the
                default title line: the project authors its whole title
                block (Bind Desk sets its title beside a lede and buttons). */}
            {introBlock != null ? (
              <div style={{ marginTop: RAIL_GAP }}>{introBlock}</div>
            ) : (
            /* No `capitalize`: the file sets this in sentence case
                ("…Identity for Hackathons"), and the utility was forcing a
                capital F onto the preposition. */
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
            )}
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
              data-ui="Section" data-src="src/pieces/CaseStudy.tsx › CaseStudy"
              data-ui-title={s.title}
              style={{ scrollMarginTop: PICKER_H, marginBottom: sectionGap }}
            >
              {s.hideTitle ? null : (
                <h2
                  className="uppercase"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: compact ? 400 : 500,
                    fontSize: compact ? 15 : SECTION_FONT,
                    lineHeight: compact ? "18.4px" : undefined,
                    letterSpacing: compact ? "0.4px" : undefined,
                    color: muted,
                    paddingBlock: compact ? 0 : META_PY,
                    marginBottom: compact ? 12 : HEAD_GAP,
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
