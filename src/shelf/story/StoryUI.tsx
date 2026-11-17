import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { anim, heroRect, toScreen } from "./anim";
import { CaseStudy } from "../../desk/pieces/CaseStudy";
import { PROJECTS } from "../../desk/pieces/projects";
import { sectionsFor } from "../../desk/pieces/caseStudySections";
import { BOOK_SIZE, CAM_D, view, type BookId } from "./layout";
import { ACTION, actionLabel, actionWidth } from "./pages";
import { pageWidthOf } from "./ToyBook";
import { CASES, navigate, type Case, type Route } from "../routes";
import { toggleMode, useMode } from "./theme";
import { ABOUT_SPREADS, CASE_INFO, CASE_SECTIONS, CALENDLY_URL, CONTACT_LINKS, MAIL_TO, PLAYGROUND_PAGES, PLAYGROUND_PIECES } from "./content";

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

/**
 * Frames 8 to 10, with the site's real case studies (16 Nov): the layout and content of the deployed pages, unchanged (src/desk/pieces:
 * CaseStudy's section rail and body, and each project's own sections), inside the shelf. The 3D book still shrinks into the page's hero
 * while the page arrives around it. Back is a plain text button over the page; the rail's section titles are centred in the window.
 */
export function CaseStudyPage({ c, shown, onSwitch }: { c: Case; shown: boolean; onSwitch: (to: Case) => void }) {
  const mode = useMode();
  const project = PROJECTS.find((p) => p.slug === c);
  const sections = sectionsFor(c);
  const wrap = useRef<HTMLDivElement>(null);
  // Tell the 3D book where the hero is, as the page lays out and scrolls.
  useLayoutEffect(() => {
    const root = wrap.current;
    if (!root) return;
    const measure = () => {
      const hero = root.querySelector<HTMLElement>('[data-ui="Hero"]');
      const r = hero?.getBoundingClientRect();
      if (r) Object.assign(heroRect, { x: r.left, y: r.top, w: r.width, h: r.height });
    };
    measure();
    const sc = root.querySelector<HTMLElement>("[data-cs-scroller]");
    sc?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (sc) ro.observe(sc);
    // The hero's own box changes as the page lays out and the images load, without the scroller resizing.
    const heroEl = root.querySelector<HTMLElement>('[data-ui="Hero"]');
    if (heroEl) ro.observe(heroEl);
    return () => {
      sc?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [c]);
  /** Scrolls the page back to the top (smoothly), and resolves once it's there. */
  const toTop = () =>
    new Promise<void>((done) => {
      const sc = wrap.current?.querySelector<HTMLElement>("[data-cs-scroller]");
      if (!sc || sc.scrollTop < 2) return done();
      sc.scrollTo({ top: 0, behavior: "smooth" });
      const t0 = performance.now();
      const tick = () => (sc.scrollTop < 2 || performance.now() - t0 > 1400 ? done() : requestAnimationFrame(tick));
      tick();
    });
  if (!project) return null;
  return (
    <div
      ref={wrap}
      className="story-read story-cs"
      role="main"
      data-shown={shown || undefined}
      onClickCapture={(e) => {
        // Another project's card (the page's own links go to /projects/<slug>, which would leave the shelf): scroll up, back to the
        // book, flip to that case's spread, then open it.
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="/projects/"]');
        const slug = a?.getAttribute("href")?.split("/")[2] as Case | undefined;
        if (a && slug && (CASES as readonly string[]).includes(slug)) {
          e.preventDefault();
          e.stopPropagation();
          if (slug !== c) void toTop().then(() => onSwitch(slug));
        }
      }}
      onClick={(e) => {
        // The book fills the hero area: clicking it grows it back into the full spread (frame 11).
        if ((e.target as HTMLElement).closest('[data-ui="Hero"]')) navigate({ kind: "work", case: c, read: false });
      }}
    >
      <button type="button" className="story-cs-back" onClick={() => void toTop().then(() => navigate({ kind: "work", case: c, read: false }))}>
        ← Back
      </button>
      <CaseStudy key={c} project={project} sections={sections} theme={mode} />
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
        <a
          className="story-grid-home"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate(home);
          }}
        >
          Dvija Patel
        </a>
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

/**
 * Frame 31, as reworked (16 Nov): plain text links where the sketch's red box is (under the group head, to its right), no
 * card or box. Email opens the form.
 */
export function ContactLinks({ shown, onEmail }: { shown: boolean; onEmail: () => void }) {
  return (
    <nav className="story-contact" data-shown={shown || undefined} aria-label="Contact" aria-hidden={!shown}>
      {CONTACT_LINKS.map((l) =>
        l.href ? (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" tabIndex={shown ? 0 : -1}>
            {l.label}
          </a>
        ) : (
          <button key={l.label} type="button" tabIndex={shown ? 0 : -1} onClick={onEmail}>
            {l.label}
          </button>
        ),
      )}
    </nav>
  );
}

/** Dev only: ?demo (or ?demo=fail) on the first page load skips the network and pretends it sent (or failed), so the pour, the writing and the spill can be tried without the email service. */
const DEMO: "ok" | "fail" | null = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo") ? (new URLSearchParams(window.location.search).get("demo") === "fail" ? "fail" : "ok") : null;

/**
 * The reach-out form, redesigned (16 Nov): plain text on the page beside the machine, no box: underlined fields and a text
 * button. It sends to /api/contact; only a message that really sent brings the coffee (onSent). If sending fails, a short
 * note and a link to open the mail app. In dev, ?demo skips the network so the animation can be tried.
 */
export function ContactForm({ shown, name: given, onSent, onFail, onClose }: { shown: boolean; name: string; onSent: (name: string) => void; onFail: () => void; onClose: () => void }) {
  const [name, setName] = useState(given);
  useEffect(() => {
    if (given) setName((n) => n || given);
  }, [given]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending">("idle");
  const ok = name.trim() && /.+@.+\..+/.test(email.trim()) && message.trim();
  const mail = `mailto:${MAIL_TO}?subject=${encodeURIComponent("Hello from your portfolio")}&body=${encodeURIComponent(message)}`;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || state === "sending") return;
    setState("sending");
    try {
      if (DEMO === "fail") throw new Error("demo");
      if (!DEMO) {
        const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: name.trim(), email: email.trim(), project: message.trim() }) });
        if (!res.ok) throw new Error(String(res.status));
      }
      onSent(name.trim());
    } catch {
      setState("idle");
      onFail();
    }
  };
  return (
    <form className="story-form" data-shown={shown || undefined} aria-hidden={!shown} onSubmit={submit} noValidate>
      <p className="story-form-title">Say hello</p>
      <label>
        <span>Your first name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" tabIndex={shown ? 0 : -1} maxLength={40} />
      </label>
      <label>
        <span>Your email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" tabIndex={shown ? 0 : -1} maxLength={120} />
      </label>
      <label>
        <span>What's on your mind</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} tabIndex={shown ? 0 : -1} maxLength={2000} />
      </label>
      <div className="story-form-row">
        <button type="submit" className="story-form-send" disabled={!ok || state === "sending"} tabIndex={shown ? 0 : -1}>
          {state === "sending" ? "Sending…" : "Send"}
        </button>
        <button type="button" onClick={onClose} tabIndex={shown ? 0 : -1}>
          Cancel
        </button>
      </div>
      <p className="story-form-alt">
        <a href={mail} tabIndex={shown ? 0 : -1}>
          Open my mail app instead
        </a>
      </p>
    </form>
  );
}

/**
 * The cup was clicked in the coffee view (16 Nov): it comes to the middle and asks the guest's name; once it's written on the
 * sleeve it asks whether they're up for a coffee chat, with the booking link (not set up yet) and the other ways to reach out.
 */
export function ContactChat({ shown, name, ready, onName, onEmail, onBack }: { shown: boolean; name: string; ready: boolean; onName: (n: string) => void; onEmail: () => void; onBack: () => void }) {
  const [draft, setDraft] = useState("");
  const asking = !name;
  return (
    <div className="story-thanks story-chat" data-shown={shown || undefined} aria-hidden={!shown}>
      {asking ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) onName(draft.trim());
          }}
        >
          <p>Hi! What's your first name?</p>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={14} autoComplete="given-name" tabIndex={shown ? 0 : -1} aria-label="Your first name" />
          <button type="submit" disabled={!draft.trim()} tabIndex={shown ? 0 : -1}>
            Pour me a coffee
          </button>
        </form>
      ) : (
        <div data-ready={ready || undefined} className="story-chat-ask">
          <p>Nice to meet you, {name.split(" ")[0]}.</p>
          <p>Would you be up for a coffee chat?</p>
          {CALENDLY_URL ? (
            <a href={CALENDLY_URL} target="_blank" rel="noreferrer" tabIndex={ready ? 0 : -1}>
              Book a time
            </a>
          ) : null}
          <button type="button" onClick={onEmail} tabIndex={ready ? 0 : -1}>
            Write me instead
          </button>
          <span className="story-chat-links">
            {CONTACT_LINKS.filter((l) => l.href).map((l) => (
              <a key={l.label} href={l.href!} target="_blank" rel="noreferrer" tabIndex={ready ? 0 : -1}>
                {l.label}
              </a>
            ))}
          </span>
        </div>
      )}
      <button type="button" className="story-back-link" onClick={onBack} tabIndex={shown ? 0 : -1}>
        Back to the machine
      </button>
    </div>
  );
}

/** Sending failed (the cup has been knocked over and the coffee spilt): say so, and offer a retry or the mail app. */
export function ContactFailed({ shown, mail, onRetry }: { shown: boolean; mail: string; onRetry: () => void }) {
  return (
    <div className="story-failed" role="alertdialog" aria-label="The message didn't send" data-shown={shown || undefined} aria-hidden={!shown}>
      <p className="story-failed-title">Oops, that didn't send.</p>
      <p>Spilt the coffee, too. Try again, or open your mail app and write to me there.</p>
      <div>
        <button type="button" onClick={onRetry} tabIndex={shown ? 0 : -1}>
          Try again
        </button>
        <a href={mail} tabIndex={shown ? 0 : -1}>
          Open my mail app
        </a>
      </div>
    </div>
  );
}

/** After the coffee is made and the name written: a line of thanks and a way back to the machine. */
export function ContactThanks({ shown, onBack }: { shown: boolean; onBack: () => void }) {
  return (
    <div className="story-thanks" data-shown={shown || undefined} aria-hidden={!shown}>
      <p>Thanks, I'll write back soon.</p>
      <button type="button" onClick={onBack} tabIndex={shown ? 0 : -1}>
        Back to the machine
      </button>
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

/**
 * Keyboard access to the 3D things (audit F6): an invisible button over each book and the cup, in reading order, that
 * takes focus with a visible ring and does what a click does. Positions follow the scene every frame.
 */
export function ObjectFocus({ active, onBook, onCup }: { active: boolean; onBook: (id: BookId) => void; onCup: () => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    let raf = 0;
    const place = (el: HTMLElement | null, a: { x: number; y: number }, b: { x: number; y: number }) => {
      if (!el) return;
      el.style.left = `${Math.min(a.x, b.x)}px`;
      el.style.top = `${Math.min(a.y, b.y)}px`;
      el.style.width = `${Math.abs(b.x - a.x)}px`;
      el.style.height = `${Math.abs(b.y - a.y)}px`;
    };
    const tick = () => {
      for (const id of ["playground", "work", "about"] as BookId[]) {
        const p = anim.books[id];
        const { w, h } = BOOK_SIZE[id];
        place(refs.current[id], toScreen(p.x - (w / 2) * p.s, p.y + h * p.s, p.z), toScreen(p.x + (w / 2) * p.s, p.y, p.z));
      }
      const cx = anim.machineX - 0.138;
      place(refs.current.cup, toScreen(cx - 0.12, 0.62, -0.15), toScreen(cx + 0.12, 0.2, -0.15));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  const set = (k: string) => (el: HTMLButtonElement | null) => {
    refs.current[k] = el;
  };
  return (
    <div className="story-objfocus" aria-label="Things on the shelf">
      <button ref={set("playground")} type="button" tabIndex={active ? 0 : -1} aria-label="Playground: experiments and illustration" onClick={() => onBook("playground")} />
      <button ref={set("work")} type="button" tabIndex={active ? 0 : -1} aria-label="Work: case studies" onClick={() => onBook("work")} />
      <button ref={set("about")} type="button" tabIndex={active ? 0 : -1} aria-label="About and résumé" onClick={() => onBook("about")} />
      <button ref={set("cup")} type="button" tabIndex={active ? 0 : -1} aria-label="Coffee cup: say hello" onClick={onCup} />
    </div>
  );
}
