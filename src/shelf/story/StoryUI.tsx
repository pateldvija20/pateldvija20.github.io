import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { anim, heroRect, toScreen } from "./anim";
import { BOOK_SIZE, CAM_D, view } from "./layout";
import { ACTION, actionLabel, actionWidth } from "./pages";
import { pageWidthOf } from "./ToyBook";
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

function SectionLinks({ route, onPicked, onPick, focus }: { route: Route; onPicked?: () => void; onPick?: (id: Section) => boolean; focus?: Section | null }) {
  const active = sectionOf(route) ?? focus ?? null;
  return (
    <>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className="story-pill"
          data-section={s.id}
          data-on={active === s.id || undefined}
          aria-current={active === s.id ? "page" : undefined}
          onClick={() => {
            // From home a book's name brings that book forward first (its scene), a second click opens it.
            if (!onPick?.(s.id)) navigate(s.to);
            onPicked?.();
          }}
        >
          {s.label}
        </button>
      ))}
    </>
  );
}

const GLOSS_REST = 215;

/**
 * The glass pills' small interaction: while the pointer is over one, the glint on its rim follows the pointer
 * round the edge, and the pill tips a few degrees so the corner nearest the pointer is pushed back. It eases back
 * to rest when the pointer leaves. (CSS reads --gloss for the glint's angle.)
 */
function useGlass(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = { a: GLOSS_REST, ta: GLOSS_REST, rx: 0, ry: 0, trx: 0, tr: 0, raf: 0 };
    const tick = () => {
      st.a += (((st.ta - st.a + 540) % 360) - 180) * 0.2;
      st.rx += (st.trx - st.rx) * 0.2;
      st.ry += (st.tr - st.ry) * 0.2;
      el.style.setProperty("--gloss", `${st.a}deg`);
      el.style.transform = `perspective(520px) rotateX(${st.rx.toFixed(3)}deg) rotateY(${st.ry.toFixed(3)}deg)`;
      const settled = Math.abs(((st.ta - st.a + 540) % 360) - 180) < 0.2 && Math.abs(st.trx - st.rx) < 0.01 && Math.abs(st.tr - st.ry) < 0.01;
      if (settled && st.trx === 0 && st.tr === 0) {
        st.raf = 0;
        el.style.transform = "";
        return;
      }
      st.raf = requestAnimationFrame(tick);
    };
    const go = () => {
      if (!st.raf) st.raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      // The glint sits where the pointer is round the pill's rim (clockwise from the top).
      st.ta = (Math.atan2(nx * r.width, -ny * r.height) * 180) / Math.PI - 14;
      // The corner under the pointer goes back.
      st.trx = -ny * 3.2;
      st.tr = nx * 4.5;
      go();
    };
    const leave = () => {
      st.ta = GLOSS_REST;
      st.trx = 0;
      st.tr = 0;
      go();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerenter", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerenter", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(st.raf);
    };
  }, [ref]);
}

/**
 * Frame 4: the menu bar, centred in the shelf's front: the name on its own pill (it goes home), and the sections
 * on another, with a light pill that slides in behind whichever section you're on. At home nothing is selected.
 */
export function MenuBar({ route, hidden, onHome, onPick, focus }: { route: Route; hidden: boolean; onHome?: () => void; onPick?: (id: Section) => boolean; focus?: Section | null }) {
  const active = sectionOf(route) ?? focus ?? null;
  const nav = useRef<HTMLElement>(null);
  const name = useRef<HTMLAnchorElement>(null);
  useGlass(nav);
  useGlass(name);
  const [slider, setSlider] = useState({ left: 0, width: 0, show: false });
  const wasShown = useRef(false);
  useLayoutEffect(() => {
    const place = () => {
      const el = nav.current?.querySelector<HTMLElement>(`[data-section="${active}"]`);
      if (!active || !el) {
        wasShown.current = false;
        setSlider((s) => ({ ...s, show: false }));
        return;
      }
      const left = el.offsetLeft;
      const width = el.offsetWidth;
      if (wasShown.current) setSlider({ left, width, show: true });
      else {
        // Arriving from home: put it behind the section first, then let it in, so it fades up in place rather than sliding in from wherever it was.
        setSlider({ left, width, show: false });
        requestAnimationFrame(() => requestAnimationFrame(() => setSlider({ left, width, show: true })));
      }
      wasShown.current = true;
    };
    place();
    const ro = new ResizeObserver(place);
    if (nav.current) ro.observe(nav.current);
    return () => ro.disconnect();
  }, [active]);
  return (
    <div className="story-dock" data-hidden={hidden || undefined}>
      <a
        ref={name}
        className="story-name"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          if (onHome) onHome();
          else navigate(home);
        }}
        aria-label="Dvija Patel, home"
      >
        Dvija Patel
      </a>
      <nav ref={nav} className="story-menu" aria-label="Sections">
        <span className="story-slider" data-show={slider.show || undefined} style={{ left: slider.left, width: slider.width }} aria-hidden="true" />
        <SectionLinks route={route} onPick={onPick} focus={focus} />
      </nav>
    </div>
  );
}

/** One page's circle: a small glass pill of its own, with its own rim; the page you're on stretches out to show its name. */
function Circle({ label, on, disabled, onClick }: { label: string; on?: boolean; disabled?: boolean; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useGlass(ref);
  return (
    <button ref={ref} type="button" role="tab" aria-selected={!!on} aria-label={label} className="story-circle" data-on={on || undefined} disabled={disabled} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}

const SECTION_TITLE: Record<string, string> = { work: "Work", playground: "Playground", about: "About" };

/**
 * Frames 7 and 17: the bar under an open Work or Playground book (16 Nov). The same glass pills as the home bar: the
 * name (home), the section's title, a pill of circles (one per page; the page you're on stretches into a pill with its
 * title and the rest stay circles), and a Menu pill that slides out into the other sections. About has no circles, so it
 * keeps the home bar as it is.
 */
function BookNav({ route, labels, index, onGo, soon = 0 }: { route: Route; labels: string[]; index: number; onGo: (i: number) => void; soon?: number }) {
  const [open, setOpen] = useState(false);
  const name = useRef<HTMLAnchorElement>(null);
  const sec = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useGlass(name);
  useGlass(sec);
  useGlass(menu);
  const active = sectionOf(route);
  useEffect(() => setOpen(false), [active]);
  const rest = SECTIONS.filter((x) => x.id !== active);
  return (
    <div className="story-booknav">
      <a
        ref={name}
        className="story-name"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          navigate(home);
        }}
        aria-label="Dvija Patel, home"
      >
        Dvija Patel
      </a>
      <div ref={sec} className="story-name story-sec">
        {active ? SECTION_TITLE[active] : ""}
      </div>
      <div className="story-circles" role="tablist" aria-label="Pages">
        {labels.map((l, i) => (
          <Circle key={l} label={l} on={i === index} onClick={() => onGo(i)} />
        ))}
        {Array.from({ length: soon }, (_, i) => (
          <Circle key={`soon${i}`} label="Coming soon" disabled />
        ))}
      </div>
      <div ref={menu} className="story-name story-menuexp" data-open={open || undefined}>
        <button type="button" className="story-menubtn" aria-expanded={open} onClick={() => setOpen(!open)}>
          Menu
        </button>
        <div className="story-menulist" aria-hidden={!open}>
          {rest.map((x) => (
            <button key={x.id} type="button" tabIndex={open ? 0 : -1} className="story-menuitem" data-section={x.id} onClick={() => navigate(x.to)}>
              {x.label}
            </button>
          ))}
        </div>
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
  let labels: string[] = [];
  let soon = 0;
  let index = 0;
  let go = (_i: number) => {};
  let action: { onClick?: () => void; href?: string } | null = null;
  if (route.kind === "work") {
    count = CASES.length;
    labels = CASES.map((c) => CASE_INFO[c].name);
    soon = 1;
    index = CASES.indexOf(route.case);
    go = (i) => navigate({ kind: "work", case: CASES[i], read: false });
    action = { onClick: () => navigate({ kind: "work", case: route.case, read: true }) };
  } else if (route.kind === "playground") {
    count = PLAYGROUND_PAGES.length;
    labels = PLAYGROUND_PAGES.map((p) => p.title);
    index = route.page === "all" ? 0 : route.page;
    go = (i) => navigate({ kind: "playground", page: i });
    action = { onClick: () => navigate({ kind: "playground", page: "all" }) };
  } else {
    count = ABOUT_SPREADS.length;
    index = Math.min(route.page, count - 1);
    go = (i) => navigate({ kind: "about", page: i });
    const link = ABOUT_SPREADS[index].link;
    if (link)
      action = { href: link.href };
  }
  return (
    <>
      <OnPage book={route.kind} index={index} shown={shown} action={action} />
      <div className="story-controls" data-shown={shown || undefined} aria-hidden={!shown}>
        {route.kind !== "about" && <BookNav route={route} labels={labels.slice(0, count)} index={index} onGo={go} soon={soon} />}
      </div>
    </>
  );
}

/**
 * The open book's action (Read the case study, See everything, the résumé) sits on the spread itself, in the lower
 * right of the right-hand page, and follows the book as it settles and tilts.
 */
function OnPage({ book, index, shown, action }: { book: "work" | "playground" | "about"; index: number; shown: boolean; action: { onClick?: () => void; href?: string } | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const label = actionLabel(book, book === "playground" ? 0 : index);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      const p = anim.books[book];
      if (el) {
        const { w } = BOOK_SIZE[book];
        const near = CAM_D / (CAM_D - p.z);
        // The printed pill's place on screen: the page's lower right, scaled from page-canvas pixels.
        const k = (pageWidthOf(book) * p.s * near * view.pxPerUnit) / 1024;
        const c = toScreen(p.x + (w / 2) * p.s, p.y, p.z);
        const bw = label ? actionWidth(label) : 0;
        el.style.right = `${window.innerWidth - c.x + ACTION.right * k}px`;
        el.style.bottom = `${window.innerHeight - c.y + ACTION.bottom * k}px`;
        el.style.width = `${bw * k}px`;
        el.style.height = `${ACTION.h * k}px`;
        // Only while the page is at rest: during a turn the printed button is on the turning page.
        el.style.pointerEvents = shown && !anim.pages[book].leaf.on ? "auto" : "none";
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [book, label, shown]);
  if (!action || !label) return null;
  const common = { className: "story-hit", "aria-label": label.replace(" \u2197", "") };
  return (
    <div ref={ref} className="story-onpage" aria-hidden={!shown}>
      {action.href ? <a {...common} href={action.href} target="_blank" rel="noreferrer" /> : <button type="button" {...common} onClick={action.onClick} />}
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

const FILTERS = ["All", "Illustration", "Experiments", "Notes"] as const;

/** Frame 19: the Playground as a masonry of small tiles (the Explore page of danieltriendl.com), filtered by category; a tile expands in place. */
export function PlaygroundGrid({ shown }: { shown: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const shownPieces = PLAYGROUND_PIECES.filter((p) => filter === "All" || p.kind === filter);
  const open = PLAYGROUND_PIECES.find((p) => p.id === openId) ?? null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpenId(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  useEffect(() => {
    if (!shown) setOpenId(null);
  }, [shown]);
  return (
    <div className="story-read story-grid-page" role="main" data-shown={shown || undefined}>
      <div className="story-grid-head">
        <button type="button" className="story-pill" onClick={() => navigate({ kind: "playground", page: anim.pages.playground.right })}>
          ← Back
        </button>
        <div className="story-filters" role="tablist" aria-label="Category">
          {FILTERS.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={f === filter} className="story-pill story-filter" data-on={f === filter || undefined} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="story-masonry">
        {shownPieces.map((p) => (
          <button key={p.id} type="button" className="story-piece" onClick={() => setOpenId(p.id)} aria-label={`Open ${p.title}`}>
            <span className="story-piece-art" style={{ aspectRatio: String(p.ratio), background: p.tint }}>
              {p.interactive && <span className="story-badge">Interactive</span>}
            </span>
            <span className="story-piece-title">{p.title}</span>
            <span className="story-piece-tags">{p.tags.map((t) => `#${t}`).join(" ")}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="story-piece-scrim" onClick={() => setOpenId(null)}>
          <article className="story-piece-open" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.title}>
            <div className="story-piece-stage" style={{ background: open.tint, aspectRatio: String(Math.min(1.4, Math.max(0.8, open.ratio))) }}>
              {open.interactive ? <p className="story-piece-note">An interactive piece lives here, ready to use once shipped.</p> : null}
            </div>
            <div className="story-piece-meta">
              <div>
                <h2>{open.title}</h2>
                <p>{open.tags.map((t) => `#${t}`).join(" ")}</p>
              </div>
              <button type="button" className="story-pill" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
          </article>
        </div>
      )}
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

/**
 * The pointer and the selection frame of the opening (frames 3 and 4): the cursor clicks the books and drags a
 * frame round the About book and the cup, and the thing inside the frame shows in 3D. Both are driven from
 * anim.cursor and anim.reveal by the director, every animation frame.
 */
export function OpeningOverlay() {
  const cur = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const c = anim.cursor;
      if (cur.current) {
        cur.current.style.opacity = String(c.show);
        cur.current.style.transform = `translate(${c.x}px, ${c.y}px) scale(${1 - 0.14 * c.press})`;
      }
      const r = anim.reveal;
      if (frame.current) {
        const f = frame.current.style;
        f.opacity = String(Math.min(1, r.show * 4));
        f.transform = `translate(${Math.min(r.x0, r.x1)}px, ${Math.min(r.y0, r.y1)}px)`;
        f.width = `${Math.abs(r.x1 - r.x0)}px`;
        f.height = `${Math.abs(r.y1 - r.y0)}px`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      <div ref={frame} className="story-reveal" aria-hidden="true">
        <i data-c="tl" />
        <i data-c="tr" />
        <i data-c="bl" />
        <i data-c="br" />
      </div>
      <div ref={cur} className="story-cursor" aria-hidden="true">
        <svg width="22" height="26" viewBox="0 0 22 26">
          <path d="M2 1.5 L2 20 L7 15.6 L10.4 23.4 L13.6 22 L10.3 14.4 L17 14 Z" fill="var(--ink)" stroke="var(--paper)" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
}
