import { useEffect, useRef, useState } from "react";
import { NAV_SECTIONS, type SectionId } from "./content";
import { useBreakpoint } from "./useBreakpoint";

/**
 * Section nav (Figma 451:17489 desktop, 456:32660 tablet, 458:33098 phone).
 *
 * One component, three arrangements: a 250px sidebar with the links parked at
 * the bottom on desktop, and a top bar with them inline and right-aligned on
 * tablet and phone. The links themselves are identical at all three widths —
 * 18px, and that is why the type scale steps rather than flowing.
 *
 * That fixed size is also why the phone bar has to be able to scroll. Four
 * 18px labels come to 325px, and the phone bar's content box is 303px at
 * 419 wide and 204 at 341 — so the row genuinely does not fit, and since the
 * type is not allowed to shrink, something has to move. It used to overflow
 * against `justify-content: flex-end`, which pushes the excess off the *left*
 * edge: "Work" sat 42px off-screen at 375 and 97px off at 341, clipped and
 * unreachable. Now the row right-aligns while it fits and scrolls once it
 * does not, so every link stays reachable at every width.
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

export function Sidebar() {
  const active = useScrollSpy(IDS);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the current section in view when the row is scrolled. Without this
  // the highlight can be sitting off the end of a bar the reader cannot see
  // has more in it — the scroll solves the clipping, but only this makes the
  // scrolled-away part discoverable.
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
    const el = document.getElementById(id);
    if (!el) return; // let the anchor fall through to the default jump
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    // Keep the address bar honest without pushing a history entry per click.
    history.replaceState(null, "", `#${id}`);
  };

  const bp = useBreakpoint();
  const desktop = bp === "desktop";

  // Structure is set explicitly rather than by stacking three conflicting
  // height/direction utilities on one element: on desktop this is a
  // full-height column beside the content with the links at its foot, and
  // below that a bar across the top with them in a row.
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
        height: bp === "tablet" ? 107 : 95,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingLeft: bp === "tablet" ? 40 : 16,
        // Clears the control bar, which is pinned to the same corner. Figma's
        // phone frame puts the links 24px from the edge but draws no control
        // bar for them to collide with.
        paddingRight: bp === "tablet" ? 104 : 92,
      };

  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-30 flex"
      style={{ background: "var(--surface)", ...shell }}
    >
      <ul
        ref={listRef}
        className={desktop ? "flex" : "no-scrollbar flex"}
        style={
          desktop
            ? { flexDirection: "column", alignItems: "flex-start", gap: 0 }
            : {
                flexDirection: "row",
                alignItems: "center",
                // 20 on the phone rather than the tablet's 32: the gaps are
                // the only slack in a row whose type is fixed, and three of
                // them at 32 is 96px the labels could be using.
                gap: bp === "tablet" ? 32 : 20,
                // Right-aligned while it fits (`margin-left: auto`), scrolling
                // once it does not. `max-width: 100%` is what makes the
                // difference: without it the row keeps its natural width and
                // overflows the padding box instead of scrolling inside it.
                marginLeft: "auto",
                maxWidth: "100%",
                overflowX: "auto",
              }
        }
      >
        {NAV_SECTIONS.map((s) => {
          const on = active === s.id;
          return (
            <li
              key={s.id}
              // Never squash a label to make the row fit — that is what the
              // scroll is for.
              style={desktop ? { width: "100%", padding: "12px 0" } : { flexShrink: 0 }}
            >
              <a
                href={`#${s.id}`}
                onClick={(e) => go(e, s.id)}
                aria-current={on ? "true" : undefined}
                className={`text-lg capitalize transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 ${
                  on ? "font-bold" : "font-medium"
                }`}
                style={{
                  color: on ? "var(--color-accent)" : "var(--content)",
                  outlineColor: "var(--content)",
                }}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>

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
