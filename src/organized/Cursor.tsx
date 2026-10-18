import { useEffect, useRef, useState } from "react";

/**
 * Organised mode's cursor, after rachelchen.tech.
 *
 * Three states, one element:
 *
 *   rest    a 14px square
 *   target  an 8px square, typing out a label beside it when the thing under
 *           it names one (`data-cursor="View project"`); a plain link or
 *           button gets the square alone
 *   text    a 3px caret the height of the line under it — only over the
 *           glyphs themselves, not the padding around a paragraph
 *
 * It is drawn in paper with `mix-blend-mode: difference`, so it comes out ink
 * on the light page, paper on the dark one, and the inverse of whatever image
 * it crosses — one square that never disappears into what it is over.
 *
 * Only on a fine pointer and above the phone breakpoint, and only while it is
 * mounted (OrganizedPage mounts it; the desk has its own grab cursors). It
 * hides the system pointer through `html[data-custom-cursor]`, set here and
 * cleared on unmount, so there is never a moment with neither.
 */

type State = { kind: "rest" } | { kind: "target"; label: string } | { kind: "text"; h: number };

const INTERACTIVE = "a, button, [role='button'], label, summary, input, select, textarea";
const TEXTY = "p, h1, h2, h3, h4, h5, li, dt, dd, figcaption, blockquote, span, time";
const TYPE_MS = 28;

/** The caret shows only when the pointer is on a run of text, measured per
 *  line box, so hovering the empty end of a short line does not count. */
function textUnder(el: Element, x: number, y: number): number | null {
  const host = el.closest(TEXTY);
  if (!host) return null;
  for (const node of Array.from(host.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) {
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return Math.round(parseFloat(getComputedStyle(host).fontSize) * 1.1);
      }
    }
  }
  return null;
}

function read(el: Element | null, x: number, y: number): State {
  if (!el) return { kind: "rest" };
  const labelled = el.closest<HTMLElement>("[data-cursor]");
  if (labelled) return { kind: "target", label: labelled.dataset.cursor ?? "" };
  if (el.closest(INTERACTIVE)) return { kind: "target", label: "" };
  const h = textUnder(el, x, y);
  return h ? { kind: "text", h } : { kind: "rest" };
}

const same = (a: State, b: State) =>
  a.kind === b.kind &&
  (a.kind !== "target" || a.label === (b as { label: string }).label) &&
  (a.kind !== "text" || a.h === (b as { h: number }).h);

function useEnabled() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 769px)");
    const check = () => setOn(mq.matches);
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);
  return on;
}

export function Cursor() {
  const enabled = useEnabled();
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ kind: "rest" });
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.dataset.customCursor = "";

    let frame = 0;
    let last = { x: 0, y: 0 };
    let current: State = { kind: "rest" };

    const paint = () => {
      frame = 0;
      const { x, y } = last;
      if (box.current) box.current.style.left = `${x}px`;
      if (box.current) box.current.style.top = `${y}px`;
      const next = read(document.elementFromPoint(x, y), x, y);
      if (!same(next, current)) {
        current = next;
        setState(next);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = { x: e.clientX, y: e.clientY };
      setVisible(true);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    // Content moves under a still pointer when the page scrolls, so the state
    // is re-read then too.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) setVisible(false);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      delete root.dataset.customCursor;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("mouseout", onLeave);
    };
  }, [enabled]);

  // Type the label out a letter at a time; all at once for reduced motion.
  const label = state.kind === "target" ? state.label : "";
  useEffect(() => {
    if (!label) {
      setTyped("");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(label);
      return;
    }
    let i = 0;
    setTyped("");
    const id = window.setInterval(() => {
      i += 1;
      setTyped(label.slice(0, i));
      if (i >= label.length) window.clearInterval(id);
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [label]);

  if (!enabled) return null;

  const size =
    state.kind === "text"
      ? { w: 3, h: state.h, dx: -1.5, dy: -state.h / 2 }
      : state.kind === "target"
        ? { w: 8, h: 8, dx: -4, dy: -4 }
        : { w: 14, h: 14, dx: -7, dy: -7 };

  return (
    <div
      ref={box}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{
        transform: `translate(${size.dx}px, ${size.dy}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
        mixBlendMode: "difference",
        color: "#fdfeff",
      }}
    >
      <div className="flex items-center gap-[10px]">
        <span
          className="block shrink-0 motion-reduce:transition-none"
          style={{
            width: size.w,
            height: size.h,
            background: "#fdfeff",
            // The caret snaps; the square eases between its two sizes.
            transition: state.kind === "text" ? "none" : "width 120ms ease-out, height 120ms ease-out",
          }}
        />
        {typed ? (
          <span className="whitespace-nowrap font-sans text-[15px] font-medium leading-none">{typed}</span>
        ) : null}
      </div>
    </div>
  );
}
