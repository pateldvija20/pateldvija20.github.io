import { useEffect, useRef, useState } from "react";
import { NAV_PAGES } from "./content";
import type { Theme } from "../pieces/Piece";
import { LampSwitch } from "./LampSwitch";
import { navigate, PAGE_PATHS, type Page } from "./router";
import { useBreakpoint } from "./useBreakpoint";

/**
 * Section nav (Figma 451:17489 desktop, 456:32660 tablet, 458:33098 phone).
 *
 * One component, three arrangements: a 167px sidebar with the links at its
 * top on desktop, an inline right-aligned row on tablet, and a menu behind a
 * button on the phone. The links are 16px at all three widths — that is the
 * design's stepped type scale, and it is also what forces the phone to
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

/**
 * Whether the page's own lamp is out of sight, so the sidebar should hang
 * one. Always true off Work; on Work, true once the hero lamp's foot
 * (`[data-lamp-sentinel]`) has scrolled up past the top of the window.
 */
function useLampAway(page: Page) {
  const [away, setAway] = useState(page !== "work");
  useEffect(() => {
    if (page !== "work") {
      setAway(true);
      return;
    }
    setAway(false);
    const el = document.querySelector("[data-lamp-sentinel]");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [page]);
  return away;
}

/** Half of whatever the window has beyond the 1512 frame; 0 up to 1512. */
const SPARE_HALF = "max(0px, (100% - 1512px) / 2)";

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
    background: "var(--menu-bar, var(--content))",
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

export function Sidebar({
  page: active,
  theme,
  onToggleTheme,
}: {
  page: Page;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  const bp = useBreakpoint();
  const lampAway = useLampAway(active);
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
    const link = list.querySelector<HTMLElement>(`a[href="${PAGE_PATHS[active]}"]`);
    if (!link) return;
    const l = link.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    if (l.left >= b.left && l.right <= b.right) return;
    list.scrollTo({
      left: list.scrollLeft + (l.left - b.left) - (b.width - l.width) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [active]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, page: Page) => {
    setOpen(false);
    // Modified clicks keep their usual meaning: a new tab gets a real URL.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(page);
  };

  // Structure is set explicitly rather than by stacking three conflicting
  // height/direction utilities on one element: on desktop this is a
  // full-height column beside the content with the links at its foot, and
  // below that a bar across the top.
  //
  // Past 1512 the nav and the content move together as one centred 1512
  // block. The nav column absorbs the left-hand half of the spare width (its
  // links stay 60px in from its right edge, beside the content), and Section
  // leaves the matching half empty on the right. `100%` here is the full-width
  // page row, so the scrollbar never skews the split.
  const shell: React.CSSProperties = desktop
    ? {
        // Figma Homepage 2232:4847: a 167px column, links at the top.
        width: `calc(167px + ${SPARE_HALF})`,
        height: "100vh",
        flexDirection: "column",
        alignItems: "flex-start",
        // The links sit at the column's middle, under the lamp that hangs
        // from its top.
        justifyContent: "safe center",
        padding: 60,
        // The lamp hangs over the top ~134px; the links centre in what is
        // left, so a short window cannot push them up under it.
        paddingTop: 170,
        paddingLeft: `calc(60px + ${SPARE_HALF})`,
        flexShrink: 0,
      }
    : {
        width: "100%",
        height: phone ? 95 : 107,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingLeft: phone ? 24 : 40,
        // Nothing shares this corner below 1025: the control bar's layout
        // toggle only exists where the desk does, and the theme button gave
        // way to the lamp — so the bar keeps Figma's own edge padding.
        paddingRight: phone ? 24 : 40,
      };

  const links = NAV_PAGES.map((s) => {
    const on = active === s.page;
    return (
      <li
        key={s.page}
        style={
          desktop
            ? // Flex, so the item is exactly the link's 21px line; the list's
              // 24px gap makes Figma's 45 top to top.
              { width: "100%", display: "flex" }
            : phone
              ? { width: "100%" }
              : // Never squash a label to make the row fit.
                { flexShrink: 0 }
        }
      >
        <a
          href={PAGE_PATHS[s.page]}
          onClick={(e) => go(e, s.page)}
          aria-current={on ? "page" : undefined}
          data-cursor-frame="pill"
          // DM Sans 16 on a 21 line, as the frame sets it. Active is ink and
          // bold, the rest the quiet grey.
          className={`font-sans text-[16px] leading-[21px] transition-colors duration-200 hover:text-[var(--content)] focus-visible:outline-2 focus-visible:outline-offset-4 ${
            on ? "font-bold" : "font-normal"
          } ${phone ? "block" : ""}`}
          style={{
            color: on ? "var(--content)" : "var(--quiet)",
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
      {/* Desktop: the lamp hangs from the top of the sidebar, above the
          links, whenever the page's own lamp is out of sight — always off
          Work, and on Work once the hero lamp has scrolled away, when it
          drops in on its cord. Pinned to the window rather than the
          column: the column is only sticky while its row is on screen, so
          as the footer arrives it scrolls up, and the lamp stays put. */}
      {desktop ? (
        <div
          aria-hidden={!lampAway}
          className="fixed top-0 motion-reduce:transition-none"
          style={{
            left: 24,
            width: 120,
            transform: lampAway ? "none" : "translateY(-110%)",
            opacity: lampAway ? 1 : 0,
            pointerEvents: lampAway ? "auto" : "none",
            transition: "transform 650ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 250ms ease-out",
          }}
        >
          <LampSwitch theme={theme} onToggle={onToggleTheme} className="block w-full" />
        </div>
      ) : null}

      {/* Phone and tablet: in the bar's top-left corner — on the phone on
          every page, and on tablet wherever the hero's own lamp is not on
          screen. */}
      {!desktop && (phone || active !== "work") ? (
        <LampSwitch
          theme={theme}
          onToggle={onToggleTheme}
          className="absolute top-0 block"
          style={{ left: phone ? 4 : 20, width: phone ? 76 : 88 }}
        />
      ) : null}

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
              // Filled grey with paper bars and no outline, like the
              // cursor's speech pill.
              background: "var(--pill)",
              border: 0,
              outlineColor: "var(--content)",
              ["--menu-bar" as string]: "#fdfeff",
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
              ? { flexDirection: "column", alignItems: "flex-start", gap: 24 }
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
                  // A scrolling row clips whatever spills past its edges, and
                  // the cursor's hover fill sits 14px beyond each link and 6px
                  // above and below (index.css). Room for it inside the row,
                  // given back outside so the links stay where they were.
                  padding: "8px 16px",
                  marginRight: -16,
                  marginBlock: -8,
                }
          }
        >
          {links}
        </ul>
      )}

    </nav>
  );
}
