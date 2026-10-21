import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Organised mode's cursor, after rachelchen.tech, drawn as a circle.
 *
 * Four states, one element that morphs between them:
 *
 *   rest    a 14px circle
 *   target  an 8px circle, typing out a label beside it when the thing under
 *           it names one (`data-cursor="View project"`); a plain link or
 *           button gets the circle alone
 *   text    a 3px caret the height of the line under it — only over the
 *           glyphs themselves, not the padding around a paragraph
 *   bubble  the circle grows into a speech pill above the pointer and types
 *           a line into it (`data-cursor-bubble="…"`): the footer's Email
 *           link says "Hey, don't toss that idea away!" this way
 *   frame   the circle opens into a soft grey fill snapped behind the item
 *           (`data-cursor-frame="pill"` for nav links, `"card"` for project
 *           cards), and the whole item leans a few px toward the pointer,
 *           fill and all. The fill is the item's own ::before, under its
 *           content, so nothing on it looks washed out (index.css). A card
 *           also rises, and keeps the small circle and its label
 *
 * The first three are drawn in paper with `mix-blend-mode: difference`, so
 * they come out ink on the light page, paper on the dark one, and the inverse
 * of any image underneath. The pill is a real surface — page colour, ink rim
 * and text — so it blends normally.
 *
 * Only on a fine pointer and above the phone breakpoint, and only while it is
 * mounted (OrganizedPage mounts it; the desk has its own grab cursors). It
 * hides the system pointer through `html[data-custom-cursor]`, set here and
 * cleared on unmount, so there is never a moment with neither.
 */

type Frame = "pill" | "card" | "button";
type State =
  | { kind: "frame"; el: HTMLElement; shape: Frame; label: string }
  | { kind: "rest" }
  | { kind: "target"; label: string }
  | { kind: "text"; h: number }
  | { kind: "bubble"; line: string; frame: HTMLElement | null };

const INTERACTIVE = "a, button, [role='button'], label, summary, input, select, textarea";
const TEXTY = "p, h1, h2, h3, h4, h5, li, dt, dd, figcaption, blockquote, span, time";
const LABEL_MS = 28;
const BUBBLE_MS = 45;
/** The pill hugs its 13px label: 10px either side and 5px above and below,
 *  a 26px box round a 16px line, with the text and caret centred on it. */
const PILL_H = 26;
const PILL_PAD = 10;
const PILL_TEXT = "flex items-center whitespace-nowrap font-sans text-[13px] font-medium leading-[16px]";
const CARET = "ml-[2px] block h-[12px] w-[1.5px] shrink-0 bg-current";
/** No rim: the pill is a plain grey fill (`--pill`) with paper type. */
const PILL_RIM = 0;
/** How far above the pointer the pill's bottom edge sits. */
const PILL_LIFT = 14;
const MORPH = "280ms cubic-bezier(0.22, 1, 0.36, 1)";

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

const shapeOf = (el: HTMLElement): Frame => {
  const f = el.dataset.cursorFrame;
  return f === "card" || f === "button" ? f : "pill";
};

function read(el: Element | null, x: number, y: number): State {
  if (!el) return { kind: "rest" };
  const bubble = el.closest<HTMLElement>("[data-cursor-bubble]");
  // A bubble can sit on a framed item too (the footer's Email link): the
  // item takes the fill and the cursor still becomes the speech pill.
  if (bubble) {
    return {
      kind: "bubble",
      line: bubble.dataset.cursorBubble ?? "",
      frame: bubble.closest<HTMLElement>("[data-cursor-frame]"),
    };
  }
  // A labelled thing gets the same speech pill, typing its label, and keeps
  // its own hover fill if it has one (a project card).
  const labelled = el.closest<HTMLElement>("[data-cursor]");
  if (labelled) {
    return {
      kind: "bubble",
      line: labelled.dataset.cursor ?? "",
      frame: labelled.closest<HTMLElement>("[data-cursor-frame]"),
    };
  }
  // An unlabelled item with a fill of its own (nav links, footer links,
  // the CV button).
  const framed = el.closest<HTMLElement>("[data-cursor-frame]");
  if (framed) {
    return {
      kind: "frame",
      el: framed,
      shape: shapeOf(framed),
      label: framed.dataset.cursor ?? "",
    };
  }
  if (el.closest(INTERACTIVE)) return { kind: "target", label: "" };
  const h = textUnder(el, x, y);
  return h ? { kind: "text", h } : { kind: "rest" };
}

/** Stable ids for framed elements, so moving within one is not a change. */
const ids = new WeakMap<Element, number>();
let nextId = 0;
const idOf = (el: Element) => {
  if (!ids.has(el)) ids.set(el, ++nextId);
  return ids.get(el);
};

/** How far an item leans toward the pointer, as a share of the pointer's
 *  offset from its centre: a nav link drifts a few px, a card about 6. */
const LEAN: Record<Frame, number> = { pill: 0.1, card: 0.02, button: 0.06 };
/** Where the fill's ::before sits outside the item (index.css), so it can
 *  grow from the pointer in the fill's own coordinates. */
const INSET: Record<Frame, { x: number; y: number }> = {
  pill: { x: 14, y: 6 },
  card: { x: 10, y: 10 },
  button: { x: 0, y: 0 },
};

const key = (s: State) =>
  s.kind === "frame"
    ? `f:${idOf(s.el)}`
    : s.kind === "target" ? `t:${s.label}` : s.kind === "text" ? `x:${s.h}` : s.kind === "bubble" ? `b:${s.line}:${s.frame ? idOf(s.frame) : ""}` : "r";

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

/** Types `text` out a character at a time; all at once for reduced motion. */
function useTyped(text: string, ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!text) {
      setN(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    let i = 0;
    setN(0);
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
    }, ms);
    return () => window.clearInterval(id);
  }, [text, ms]);
  return text.slice(0, n);
}

export function Cursor() {
  const enabled = useEnabled();
  const box = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<State>({ kind: "rest" });
  const [visible, setVisible] = useState(false);
  const [pillW, setPillW] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.dataset.customCursor = "";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    let last = { x: 0, y: 0 };
    let current = "r";
    let framed: { el: HTMLElement; shape: Frame; mx: number; my: number } | null = null;

    /** Turns an item's fill on, opening from where the pointer came in. */
    const enter = (el: HTMLElement, shape: Frame, x: number, y: number) => {
      const r = el.getBoundingClientRect();
      const inset = INSET[shape];
      el.style.setProperty("--cx", `${x - r.left + inset.x}px`);
      el.style.setProperty("--cy", `${y - r.top + inset.y}px`);
      el.dataset.cursorOn = "";
      framed = { el, shape, mx: 0, my: 0 };
    };
    /** Turns it off, closing back to where the pointer left. */
    const leave = (x: number, y: number) => {
      if (!framed) return;
      const { el, shape } = framed;
      const r = el.getBoundingClientRect();
      const inset = INSET[shape];
      el.style.setProperty("--cx", `${x - r.left + inset.x}px`);
      el.style.setProperty("--cy", `${y - r.top + inset.y}px`);
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
      delete el.dataset.cursorOn;
      framed = null;
    };
    /** The magnetic lean, measured from where the item would be at rest. */
    const lean = (x: number, y: number) => {
      if (!framed) return;
      const r = framed.el.getBoundingClientRect();
      const lift = framed.shape === "card" ? -6 : 0;
      const cx = r.left - framed.mx + r.width / 2;
      const cy = r.top - framed.my - lift + r.height / 2;
      framed.mx = (x - cx) * LEAN[framed.shape];
      framed.my = (y - cy) * LEAN[framed.shape];
      framed.el.style.setProperty("--mx", `${framed.mx.toFixed(2)}px`);
      framed.el.style.setProperty("--my", `${framed.my.toFixed(2)}px`);
    };

    const paint = () => {
      frame = 0;
      const { x, y } = last;
      if (box.current) {
        box.current.style.left = `${x}px`;
        box.current.style.top = `${y}px`;
      }
      const next = read(document.elementFromPoint(x, y), x, y);
      const k = key(next);
      if (k !== current) {
        current = k;
        leave(x, y);
        if (next.kind === "frame") enter(next.el, next.shape, x, y);
        if (next.kind === "bubble" && next.frame) enter(next.frame, shapeOf(next.frame), x, y);
        setState(next);
      }
      if (!reduced) lean(x, y);
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
      if (e.relatedTarget) return;
      setVisible(false);
      leave(last.x, last.y);
      current = "r";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      delete root.dataset.customCursor;
      leave(last.x, last.y);
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("mouseout", onLeave);
    };
  }, [enabled]);

  const line = state.kind === "bubble" ? state.line : "";
  // The pill is sized to the whole line before typing starts, so it grows
  // once, to its final width, rather than with every character.
  useLayoutEffect(() => {
    if (line && measure.current) setPillW(Math.ceil(measure.current.offsetWidth) + PILL_PAD * 2 + PILL_RIM * 2);
  }, [line]);

  const label = useTyped(state.kind === "target" || state.kind === "frame" ? state.label : "", LABEL_MS);
  const typedLine = useTyped(line, BUBBLE_MS);

  if (!enabled) return null;

  const bubble = state.kind === "bubble";
  /** A nav pill's or a button's fill is the whole cursor, so the dot goes;
   *  elsewhere the small circle stays. */
  const hideDot = state.kind === "frame" && (state.shape === "pill" || state.shape === "button");
  const shape =
    state.kind === "text"
      ? { w: 3, h: state.h, x: -1.5, y: -state.h / 2, r: 2 }
      : state.kind === "target" || state.kind === "frame"
        ? { w: hideDot ? 0 : 8, h: hideDot ? 0 : 8, x: -4, y: -4, r: 4 }
        : bubble
          ? { w: pillW, h: PILL_H, x: -pillW / 2, y: -PILL_H - PILL_LIFT, r: PILL_H / 2 }
          : { w: 14, h: 14, x: -7, y: -7, r: 7 };

  return (
    <>
    <div
      ref={box}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
        mixBlendMode: bubble ? "normal" : "difference",
      }}
    >
      {/* Off-screen copy of the line in the pill's type, caret included, for
          its width — so the space either side of the text is even. */}
      <span ref={measure} className={`invisible absolute ${PILL_TEXT}`}>
        {line}
        <span className={CARET} />
      </span>

      <div
        className="flex items-center gap-[10px] motion-reduce:transition-none"
        style={{
          transform: `translate(${shape.x}px, ${shape.y}px)`,
          // The caret snaps; everything else glides between shapes.
          transition: state.kind === "text" ? "none" : `transform ${MORPH}`,
        }}
      >
        <span
          className="flex shrink-0 items-center overflow-hidden whitespace-nowrap motion-reduce:transition-none"
          style={{
            width: shape.w,
            height: shape.h,
            borderRadius: shape.r,
            boxSizing: "border-box",
            background: bubble ? "var(--pill)" : "#fdfeff",
            boxShadow: bubble ? "0 8px 20px rgba(0,0,0,0.18)" : "none",
            color: "#fdfeff",
            paddingInline: bubble ? PILL_PAD : 0,
            transition:
              state.kind === "text"
                ? "none"
                : `width ${MORPH}, height ${MORPH}, border-radius ${MORPH}, background-color 160ms, border-width 160ms`,
          }}
        >
          {bubble ? (
            <span className={PILL_TEXT}>
              {typedLine}
              <span className={`${CARET} ${typedLine.length >= line.length ? "caret-blink" : ""}`} />
            </span>
          ) : null}
        </span>
        {label && !bubble ? (
          <span className="whitespace-nowrap font-sans text-[15px] font-medium leading-none" style={{ color: "#fdfeff" }}>
            {label}
          </span>
        ) : null}
      </div>
    </div>
    </>
  );
}
