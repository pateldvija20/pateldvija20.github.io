import { useEffect, useRef, useState } from "react";
import { NAV_SECTIONS, type SectionId } from "./content";
import { useBreakpoint } from "./useBreakpoint";

/**
 * Section nav (Figma 451:17489 desktop, 456:32660 tablet, 458:33098 phone).
 *
 * One component, three arrangements: a 250px sidebar with the links parked at
 * the bottom on desktop, an inline right-aligned row on tablet, and a menu
 * behind a button on the phone. The links are 18px at all three widths — that
 * is the design's stepped type scale, and it is also what forces the phone to
 * collapse rather than reflow.
 *
 * Four labels at 18px come to 325px. The phone bar's content box is 303px at
 * 419 wide and 204 at 341, and the type is not allowed to shrink, so the row
 * cannot be made to fit by any amount of tightening — laying it out inline was
 * always going to end in either clipping or a sideways scroll nobody would
 * discover. Behind a button the width stops mattering: the bar holds one
 * 44px control at every phone size, and the links get a full-width panel with
 * tap targets instead of a hairline row.
 */

/** Which section is under the top of the viewport right now. */
function useScrollSpy(ids: SectionId[]) {
  const [active, setActive] = useState<SectionId>(ids[0]);

  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    // rootMargin pulls the detection line down to ~a third of the viewport, so
    // a section counts as "current" once it genuinely occupies the screen
    // rather than the instant its top edge appears.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id as SectionId);
      },
      { rootMargin: "-33% 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  return active;
}

const IDS = NAV_SECTIONS.map((s) => s.id);

/** The phone bar's one control. Matches `ControlBar`'s geometry at phone
 *  widths so the two sit together as a pair rather than as two loose
 *  buttons. */
const MENU_BUTTON = 44;

/**
 * Three bars that fold into a cross.
 *
 * Drawn rather than swapped for a second glyph so the open and closed states
 * are the same three elements moving — a menu that turns into its own close
 * control, which is what says the panel belongs to this button.
 */
function MenuIcon({ open }: { open: boolean }) {
  const bar: React.CSSProperties = {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 2,
    borderRadius: 2,
    background: "var(--content)",
    transition: "transform 220ms ease, opacity 140ms ease",
  };
  return (
    <span aria-hidden="true" className="relative block" style={{ width: 20, height: 14 }}>
      <span style={{ ...bar, top: 0, transform: open ? "translateY(6px) rotate(45deg)" : "none" }} />
      <span style={{ ...bar, top: 6, opacity: open ? 0 : 1 }} />
      <span
        style={{ ...bar, top: 12, transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }}
      />
    </span>
  );
}

export function Sidebar() {
  const active = useScrollSpy(IDS);
  const listRef = useRef<HTMLUListElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  const bp = useBreakpoint();
  const desktop = bp === "desktop";
  const phone = bp === "mobile";

  // A menu that is open when the phone bar is no longer on screen would come
  // back the next time the window narrowed, over content it no longer belongs
  // to. Widening past the phone closes it.
  useEffect(() => {
    if (!phone) setOpen(false);
  }, [phone]);

  // Escape, and a press anywhere outside. Both are what a menu is expected to
  // answer to; without them the only way out is the button that opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target instanceof Node ? e.target : null;
      if (t && navRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Tablet only: the row can still outgrow its box between 768 and 1024, and
  // an active link sitting off the end of a bar that does not look scrollable
  // is invisible. No-op on the phone, whose panel is a column.
  useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const link = list.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (!link) return;
    const l = link.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    if (l.left >= b.left && l.right <= b.right) return;
    list.scrollTo({
      left: list.scrollLeft + (l.left - b.left) - (b.width - l.width) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [active]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return; // let the anchor fall through to the default jump
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    // Keep the address bar honest without pushing a history entry per click.
    history.replaceState(null, "", `#${id}`);
  };

  // Structure is set explicitly rather than by stacking three conflicting
  // height/direction utilities on one element: on desktop this is a
  // full-height column beside the content with the links at its foot, and
  // below that a bar across the top.
  const shell: React.CSSProperties = desktop
    ? {
        width: 250,
        height: "100vh",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: 60,
        flexShrink: 0,
      }
    : {
        width: "100%",
        height: phone ? 95 : 107,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingLeft: phone ? 24 : 40,
        // Clears the control bar, which is pinned to the same corner. Figma's
        // phone frame puts the links 24px from the edge but draws no control
        // bar for them to collide with.
        paddingRight: phone ? 80 : 104,
      };

  const links = NAV_SECTIONS.map((s) => {
    const on = active === s.id;
    return (
      <li
        key={s.id}
        style={
          desktop
            ? { width: "100%", padding: "12px 0" }
            : phone
              ? { width: "100%" }
              : // Never squash a label to make the row fit.
                { flexShrink: 0 }
        }
      >
        <a
          href={`#${s.id}`}
          onClick={(e) => go(e, s.id)}
          aria-current={on ? "true" : undefined}
          className={`text-lg capitalize transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 ${
            on ? "font-bold" : "font-medium"
          } ${phone ? "block" : ""}`}
          style={{
            color: on ? "var(--color-accent)" : "var(--content)",
            outlineColor: "var(--content)",
            // A row of text is a fine target with a mouse and a poor one with
            // a thumb, so the panel gives every link a real one.
            ...(phone ? { padding: "14px 24px", minHeight: 48 } : null),
          }}
        >
          {s.label}
        </a>
      </li>
    );
  });

  return (
    <nav
      ref={navRef}
      aria-label="Sections"
      className="sticky top-0 z-30 flex"
      style={{ background: "var(--surface)", ...shell }}
    >
      {phone ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="section-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex shrink-0 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{
              width: MENU_BUTTON,
              height: MENU_BUTTON,
              borderRadius: 10,
              background: "var(--surface)",
              border: "2px solid var(--content)",
              outlineColor: "var(--content)",
            }}
          >
            <MenuIcon open={open} />
          </button>

          {/* Anchored under the bar rather than covering the screen: four
              links do not need a full-page takeover, and leaving the page
              visible behind them keeps the jump feeling like a jump. */}
          {open ? (
            <ul
              id="section-menu"
              className="absolute left-0 right-0 flex flex-col"
              style={{
                top: "100%",
                background: "var(--surface)",
                paddingBlock: 8,
                borderBottom: "1px solid color-mix(in srgb, var(--edge) 18%, transparent)",
              }}
            >
              {links}
            </ul>
          ) : null}
        </>
      ) : (
        <ul
          ref={listRef}
          className={desktop ? "flex" : "no-scrollbar flex"}
          style={
            desktop
              ? { flexDirection: "column", alignItems: "flex-start", gap: 0 }
              : {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 32,
                  // Right-aligned while it fits, scrolling once it does not.
                  // `max-width: 100%` is what makes the difference: without it
                  // the row keeps its natural width and overflows the padding
                  // box instead of scrolling inside it.
                  marginLeft: "auto",
                  maxWidth: "100%",
                  overflowX: "auto",
                }
          }
        >
          {links}
        </ul>
      )}

      {/* The 0.2px rule Figma draws down the sidebar's right edge. Desktop
          only — the top bar has no rule in any frame. */}
      {desktop ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-px"
          style={{ background: "var(--edge)", opacity: 0.2 }}
        />
      ) : null}
    </nav>
  );
}
