import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { anim, heroRect } from "./anim";
import { CASES, navigate, type Case, type Route } from "../routes";
import { toggleMode, useMode } from "./theme";
import { ABOUT_SPREADS, CASE_INFO, CASE_SECTIONS, CONTACT_LINKS, PLAYGROUND_PAGES, PLAYGROUND_PIECES } from "./content";

/**
 * The phase 1 interface over the shelf: logo tab, menu bar, the open books'
 * spreads and pager, the expanded case study, the Playground grid and the
 * contact links. Placeholder content; the layout and the moves between
 * states are the point.
 */

type Section = "work" | "playground" | "about" | "contact";
const SECTIONS: { id: Section; label: string; to: Route }[] = [
  { id: "work", label: "Work", to: { kind: "work", case: CASES[0], read: false } },
  { id: "playground", label: "Playground", to: { kind: "playground", page: 0 } },
  { id: "about", label: "About", to: { kind: "about", page: 0 } },
  { id: "contact", label: "Contact", to: { kind: "contact" } },
];
const sectionOf = (r: Route): Section | null => (r.kind === "home" ? null : r.kind);
const home: Route = { kind: "home" };

/** Frame 4: the logo, in a tab in the top-left corner with a rounded edge. It goes home. */
export function LogoTab({ hidden }: { hidden: boolean }) {
  return (
    <a
      className="story-logo"
      data-hidden={hidden || undefined}
      href="/"
      onClick={(e) => {
        e.preventDefault();
        navigate(home);
      }}
      aria-label="Dvija Patel, home"
    >
      Dvija Patel
    </a>
  );
}

function SectionLinks({ route, onPicked }: { route: Route; onPicked?: () => void }) {
  const active = sectionOf(route);
  return (
    <>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className="story-pill"
          data-on={active === s.id || undefined}
          aria-current={active === s.id ? "page" : undefined}
          onClick={() => {
            navigate(s.to);
            onPicked?.();
          }}
        >
          {s.label}
        </button>
      ))}
    </>
  );
}

/** Frame 4: the menu bar, centred in the shelf's front. */
export function MenuBar({ route, hidden }: { route: Route; hidden: boolean }) {
  return (
    <nav className="story-menu" aria-label="Sections" data-hidden={hidden || undefined}>
      <SectionLinks route={route} />
    </nav>
  );
}

/**
 * Frames 7, 17, 26: the pager under an open book. Dots for the pages; the
 * pill on the left closes the book, the one on the right (marked "M" in the
 * sketches) opens the sections, so you can jump to another book (frame 12).
 */
function Pager({ count, index, onGo, onClose, route }: { count: number; index: number; onGo: (i: number) => void; onClose: () => void; route: Route }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="story-pager">
      <button type="button" className="story-pill" onClick={onClose}>
        ← Shelf
      </button>
      <div className="story-dots" role="tablist" aria-label="Pages">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={`Page ${i + 1}`} className="story-dot" data-on={i === index || undefined} onClick={() => onGo(i)} />
        ))}
      </div>
      <div className="story-menu-pop">
        <button type="button" className="story-pill" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          Menu
        </button>
        {menu && (
          <div className="story-pop">
            <SectionLinks route={route} onPicked={() => setMenu(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Under an open book (the book itself is 3D; see ToyBook): the pager, and the
 * one action each book has. Work: read the case study (frame 7's expand
 * button). Playground: see everything (frames 17 to 19). About: on the last
 * spread, download the résumé.
 */
export function BookControls({ route, shown }: { route: Route; shown: boolean }) {
  if (route.kind !== "work" && route.kind !== "playground" && route.kind !== "about") return null;
  let count = 0;
  let index = 0;
  let go = (_i: number) => {};
  let action: ReactNode = null;
  if (route.kind === "work") {
    count = CASES.length;
    index = CASES.indexOf(route.case);
    go = (i) => navigate({ kind: "work", case: CASES[i], read: false });
    action = (
      <button type="button" className="story-pill story-action" onClick={() => navigate({ kind: "work", case: route.case, read: true })}>
        Read the case study ↗
      </button>
    );
  } else if (route.kind === "playground") {
    count = PLAYGROUND_PAGES.length;
    index = route.page === "all" ? 0 : route.page;
    go = (i) => navigate({ kind: "playground", page: i });
    action = (
      <button type="button" className="story-pill story-action" onClick={() => navigate({ kind: "playground", page: "all" })}>
        See everything ↗
      </button>
    );
  } else {
    count = ABOUT_SPREADS.length;
    index = Math.min(route.page, count - 1);
    go = (i) => navigate({ kind: "about", page: i });
    const link = ABOUT_SPREADS[index].link;
    if (link)
      action = (
        <a className="story-pill story-action" href={link.href} target="_blank" rel="noreferrer">
          {link.label}
        </a>
      );
  }
  return (
    <div className="story-controls" data-shown={shown || undefined} aria-hidden={!shown}>
      {action}
      <Pager count={count} index={index} onGo={go} onClose={() => navigate(home)} route={route} />
    </div>
  );
}

/** Frames 8 to 10: a case study expanded into a page. */
export function CaseStudyPage({ c, shown }: { c: Case; shown: boolean }) {
  const info = CASE_INFO[c];
  const i = CASES.indexOf(c);
  const others = [CASES[(i + 1) % CASES.length], CASES[(i + 2) % CASES.length]];
  const scroller = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLButtonElement>(null);
  // The 3D book sits in the header slot (frame 8): tell it where the slot is, as the page lays out and scrolls.
  useLayoutEffect(() => {
    const measure = () => {
      const r = slot.current?.getBoundingClientRect();
      if (r) Object.assign(heroRect, { x: r.left, y: r.top, w: r.width, h: r.height });
    };
    measure();
    const el = scroller.current;
    el?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);
  useLayoutEffect(() => {
    scroller.current?.scrollTo(0, 0);
    const r = slot.current?.getBoundingClientRect();
    if (r) Object.assign(heroRect, { x: r.left, y: r.top, w: r.width, h: r.height });
  }, [c]);
  return (
    <div ref={scroller} className="story-read" role="main" data-shown={shown || undefined}>
      <div className="story-read-inner">
        <aside className="story-rail">
          <button type="button" className="story-pill" onClick={() => navigate({ kind: "work", case: c, read: false })}>
            ← Back
          </button>
          <ol>
            {CASE_SECTIONS.map((s) => (
              <li key={s}>
                <a href={`#${s.toLowerCase()}`}>{s}</a>
              </li>
            ))}
          </ol>
        </aside>
        <article>
          {/* The 3D book itself shows through here; clicking it grows it back into the full spread (frame 11). */}
          <button ref={slot} type="button" className="story-hero-slot" aria-label={`Back to the book: ${info.name}`} onClick={() => navigate({ kind: "work", case: c, read: false })} />
          <p className="story-kicker story-read-kicker">{[info.kind, info.year].filter(Boolean).join(" · ")}</p>
          <h2 className="story-title">{info.name}</h2>
          {info.line && <p className="story-lede">{info.line}</p>}
          {CASE_SECTIONS.map((s) => (
            <section key={s} id={s.toLowerCase()} className="story-section">
              <h3>{s}</h3>
              <p className="story-placeholder">This section of the case study comes in phase 3, from the existing case-study content.</p>
            </section>
          ))}
          <div className="story-end">
            <p className="story-kicker">More case studies</p>
            <div className="story-cards">
              {others.map((o) => (
                <button key={o} type="button" className="story-card" onClick={() => navigate({ kind: "work", case: o, read: true })}>
                  <img src={CASE_INFO[o].image} alt="" />
                  <span>{CASE_INFO[o].name}</span>
                </button>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

/** Frame 19: the Playground as a grid. */
export function PlaygroundGrid({ shown }: { shown: boolean }) {
  return (
    <div className="story-read story-grid-page" role="main" data-shown={shown || undefined}>
      <div className="story-grid-head">
        <button type="button" className="story-pill" onClick={() => navigate({ kind: "playground", page: anim.pages.playground.right })}>
          ← Back
        </button>
        <p className="story-kicker">Playground · everything</p>
      </div>
      <div className="story-grid">
        {PLAYGROUND_PIECES.map((p) => (
          <div key={p.title} className="story-tile">
            {p.title}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Frame 31: the contact links, hanging from the machine's outlet (the pin is set by the scene). */
export function ContactLinks({ shown }: { shown: boolean }) {
  return (
    <div className="story-contact" data-shown={shown || undefined} aria-hidden={!shown}>
      <p className="story-kicker">Say hello</p>
      {CONTACT_LINKS.map((l) =>
        l.href ? (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ) : (
          <span key={l.label} title="Address to add">
            {l.label} (to add)
          </span>
        ),
      )}
    </div>
  );
}

/** Light and dark: a small round switch in the shelf's band, bottom right. Follows the system until pressed; remembered after. */
export function ThemeToggle() {
  const mode = useMode();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <button type="button" className="story-theme" onClick={toggleMode} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
      </svg>
    </button>
  );
}
