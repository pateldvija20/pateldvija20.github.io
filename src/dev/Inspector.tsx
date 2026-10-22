import { useCallback, useEffect, useRef, useState } from "react";
import { BORDER, COLOR_VARS, RADIUS, SPACE, TYPE_ROLES, WEIGHT } from "../pieces/tokens";

/**
 * UI inspector: a development tool for talking about the interface.
 *
 * Press `I` (or use the pill at the bottom left) to turn it on. The cursor
 * becomes a crosshair; hovering any part of the page outlines it and shows a
 * card with its component name (industry terms, from `data-ui`), where it sits,
 * and the design tokens its values resolve to. Click to copy that card as text,
 * paste it into the chat, and say what should change. `Esc` turns it off.
 *
 * Mounted only in development (main.tsx), so it never ships.
 */

const MONO = "'DM Mono', ui-monospace, monospace";
const BLUE = "#0d99ff";

type Line = [string, string];
type Info = { rect: DOMRect; name: string; crumbs: string; lines: Line[]; text: string };

const px = (v: string) => parseFloat(v) || 0;

/** The name of a colour token for an rgb() value, or the value itself. */
function colorName(value: string, map: Map<string, string>): string | null {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => p.trim());
  if (parts.length === 4 && parseFloat(parts[3]) === 0) return null;
  const key = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  return map.get(key) ?? key;
}

function tokenColors(): Map<string, string> {
  const map = new Map<string, string>();
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  for (const [name, v] of Object.entries(COLOR_VARS)) {
    probe.style.color = `var(${v})`;
    const c = getComputedStyle(probe).color;
    if (!map.has(c)) map.set(c, name);
  }
  probe.remove();
  return map;
}

const FALLBACK_NAME: Record<string, string> = {
  P: "Text", SPAN: "Text", H1: "Heading", H2: "Heading", H3: "Heading", H4: "Heading", H5: "Heading",
  IMG: "Image", VIDEO: "Video", A: "Link", BUTTON: "Button", LI: "List item", UL: "List", OL: "List",
  SVG: "Icon", TABLE: "Data table", SECTION: "Section", NAV: "Navigation", HEADER: "Header", FIGURE: "Figure",
};

/** Nearest React components that render this element, innermost first (dev builds keep their names). */
function reactNames(el: Element): string[] {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let f: any = key ? (el as any)[key] : null;
  const names: string[] = [];
  while (f && names.length < 3) {
    const t = f.type;
    if (typeof t === "function") {
      const n = t.displayName || t.name;
      if (n && !names.includes(n)) names.push(n);
    }
    f = f.return;
  }
  return names;
}

/** An industry name for an element nobody has tagged yet, from what it is and holds. */
function guessName(el: HTMLElement): string {
  const tag = el.tagName.toUpperCase();
  if (FALLBACK_NAME[tag]) return FALLBACK_NAME[tag];
  const cs = getComputedStyle(el);
  const holdsMedia = !!el.querySelector(":scope > img, :scope > video, :scope > svg, :scope > canvas, :scope > * > img, :scope > * > video, :scope > * > svg");
  const hasText = (el.innerText ?? "").trim().length > 0;
  const framed = parseFloat(cs.borderTopLeftRadius) > 0 || cs.boxShadow !== "none" || parseFloat(cs.borderTopWidth) > 0;
  if (holdsMedia && hasText && el.getBoundingClientRect().width > 150) return framed ? "Card" : "Media object";
  if (holdsMedia && !hasText) return framed ? "Figure" : "Media";
  if (framed && parseFloat(cs.paddingTop) > 0) return "Card";
  if (cs.display.includes("grid")) return "Grid";
  if (cs.display.includes("flex")) return cs.flexDirection.startsWith("column") ? "Stack" : "Row";
  return "Container";
}

function describe(start: Element): Info {
  const target = (start.closest("[data-ui]") as HTMLElement | null) ?? (start as HTMLElement);
  const cs = getComputedStyle(target);
  const rect = target.getBoundingClientRect();
  const colors = tokenColors();
  const name = target.dataset.ui ?? guessName(target);

  // Where it sits: project, section, then each named ancestor.
  const chain: string[] = [];
  for (let el: HTMLElement | null = target.parentElement; el; el = el.parentElement) {
    const ui = el.dataset?.ui;
    if (!ui) continue;
    if (ui === "Section") chain.push(`Section: ${el.dataset.uiTitle ?? el.id}`);
    else if (ui !== "Container") chain.push(ui);
  }
  const overlay = document.querySelector("[data-project-overlay]")?.getAttribute("aria-label")?.replace(/ case study$/, "");
  // Where it is on the page: the route, and the last heading before it in the document.
  const route = window.location.pathname === "/" ? "Home" : window.location.pathname.replace(/^\//, "");
  const heading = Array.from(document.querySelectorAll("h1, h2, h3"))
    .filter((h) => !h.contains(target) && h.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)
    .pop()?.textContent?.trim();
  const under = heading && !chain.some((c) => c.startsWith("Section")) ? `Under: “${heading.slice(0, 36)}”` : null;
  const crumbs = [overlay ?? route, under, ...chain.reverse(), name].filter(Boolean).join(" › ");

  const lines: Line[] = [];

  // Which one, exactly: its place among identical siblings, what it says, and
  // where it is defined.
  const kin = Array.from(target.parentElement?.children ?? []).filter((c) =>
    target.dataset.ui ? (c as HTMLElement).dataset.ui === target.dataset.ui : c.tagName === target.tagName,
  );
  if (kin.length > 1) lines.push(["Position", `${kin.indexOf(target) + 1} of ${kin.length}`]);
  const snippet = (target.innerText ?? "").replace(/\s+/g, " ").trim();
  if (snippet) lines.push(["Content", `“${snippet.length > 48 ? `${snippet.slice(0, 48).trimEnd()}…` : snippet}”`]);
  const src = (target.closest("[data-src]") as HTMLElement | null)?.dataset.src;
  const react = reactNames(target);
  if (src) lines.push(["Source", src]);
  else if (react.length) lines.push(["Source", `React: ${react.join(" ‹ ")}`]);
  // Many alike: elements of the same tag with the same classes share one style.
  const alike = Array.from(document.querySelectorAll(target.tagName)).filter((e) => (e as HTMLElement).className === target.className);
  if (alike.length > 1) lines.push(["Similar", `${alike.length} on this page, same classes`]);

  const w = window.innerWidth;
  const bp = w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  const dark = document.documentElement.dataset.layout === "organized" && document.documentElement.dataset.theme === "dark";
  lines.push(["Viewport", `${bp} ${w}px · ${dark ? "dark" : "light"}`]);
  lines.push(["Size", `${Math.round(rect.width)} × ${Math.round(rect.height)}`]);

  const bg = colorName(cs.backgroundColor, colors);
  if (bg) lines.push(["Surface", bg]);

  // A ring is a 0-blur spread shadow; a border is a border.
  const ring = cs.boxShadow.match(/(rgba?\([^)]+\))\s+0px 0px 0px (\d+)px/);
  if (ring) lines.push(["Border", `border-${ring[2]} · ${colorName(ring[1], colors)}`]);
  else if (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") {
    lines.push(["Border", `${BORDER[px(cs.borderTopWidth)] ?? `${cs.borderTopWidth}`} · ${colorName(cs.borderTopColor, colors) ?? "transparent"}`]);
  }

  const r = px(cs.borderTopLeftRadius);
  if (r > 0 || cs.borderTopLeftRadius.includes("%")) {
    lines.push(["Radius", cs.borderTopLeftRadius.includes("%") ? "radius-full" : RADIUS[r] ?? (r > 999 ? "radius-full" : `${r}px`)]);
  }

  const pads = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
  if (pads.some((p) => p > 0)) {
    // The page's side padding is responsive (clamp(24px, 6vw, 111px)): the gutter.
    const gutter = px(getComputedStyle(document.querySelector("[data-cs-body]") ?? document.body).paddingLeft);
    const tok = (v: number) => SPACE[v] ?? (gutter && Math.abs(v - gutter) < 0.5 ? "gutter" : `${v}px`);
    lines.push(["Padding", pads.every((p) => p === pads[0]) ? tok(pads[0]) : `y ${tok(pads[0])} · x ${tok(pads[1])}`]);
  }
  if (cs.rowGap !== "normal" && px(cs.rowGap) > 0) lines.push(["Gap", SPACE[px(cs.rowGap)] ?? cs.rowGap]);

  const hasText = Array.from(target.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
  if (hasText) {
    const size = px(cs.fontSize);
    const line = px(cs.lineHeight);
    const role = TYPE_ROLES.find((t) => t.size === size && Math.abs(t.line - line) < 0.6)?.name;
    const family = cs.fontFamily.includes("Mono") ? "mono" : cs.fontFamily.includes("Slab") ? "slab" : "sans";
    lines.push(["Type", `${role ?? `${size}/${Math.round(line * 10) / 10}`} · ${WEIGHT[Number(cs.fontWeight)] ?? cs.fontWeight} · ${family}`]);
    const c = colorName(cs.color, colors);
    if (c) lines.push(["Text", c]);
  }

  const text = [
    crumbs,
    ...lines.map(([k, v]) => `${k}: ${v}`),
    "",
    "Change: ",
  ].join("\n");
  return { rect, name, crumbs, lines, text };
}

export default function Inspector() {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const last = useRef<Element | null>(null);
  /** How many levels above the hovered element is selected (ArrowUp / ArrowDown). */
  const up = useRef(0);
  const pick = () => {
    let el = last.current as Element | null;
    for (let i = 0; i < up.current && el?.parentElement && el.parentElement !== document.body; i++) el = el.parentElement;
    return el;
  };
  const card = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const inInspector = (el: Element | null) => !!el?.closest("[data-inspector-ui]");

  const refresh = useCallback(() => {
    const el = pick();
    if (el && document.contains(el)) setInfo(describe(el));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "i" || e.key === "I") setOn((v) => !v);
      if (e.key === "Escape") setOn(false);
      if (on && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        up.current = Math.max(0, up.current + (e.key === "ArrowUp" ? 1 : -1));
        const el = pick();
        if (el) setInfo(describe(el));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on]);

  useEffect(() => {
    const root = document.documentElement;
    if (!on) {
      root.removeAttribute("data-inspect");
      setInfo(null);
      last.current = null;
      return;
    }
    root.setAttribute("data-inspect", "");
    const onMove = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || inInspector(el)) return;
        // A small mouse jiggle over the same element must not undo ArrowUp.
        if (el === last.current) return;
        last.current = el;
        up.current = 0;
        setInfo(describe(el));
      });
    };
    const onClick = (e: MouseEvent) => {
      if (inInspector(e.target as Element)) return;
      e.preventDefault();
      e.stopPropagation();
      const el = pick() ?? document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const i = describe(el);
      const done = () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      };
      navigator.clipboard?.writeText(i.text).then(done, () => {
        const ta = document.createElement("textarea");
        ta.value = i.text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
      });
    };
    const swallow = (e: Event) => {
      if (!inInspector(e.target as Element)) e.stopPropagation();
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("mousedown", swallow, true);
    window.addEventListener("scroll", refresh, true);
    return () => {
      root.removeAttribute("data-inspect");
      cancelAnimationFrame(raf.current);
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("mousedown", swallow, true);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [on, refresh]);

  // Keep the card on screen: right of the pointer, flipped when it would leave.
  const W = 320;
  const h = card.current?.offsetHeight ?? 240;
  const left = Math.min(pos.x + 18, window.innerWidth - W - 12);
  const top = pos.y + 18 + h > window.innerHeight ? Math.max(12, pos.y - h - 18) : pos.y + 18;

  return (
    <div data-inspector-ui style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none", fontFamily: MONO }}>
      <button
        type="button"
        data-inspector-ui
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        style={{
          position: "fixed", left: 16, bottom: 16, pointerEvents: "auto", cursor: "pointer", border: `1px solid ${on ? BLUE : "#4a4a4a"}`,
          background: on ? BLUE : "#1c1c1c", color: "#fff", borderRadius: 999, padding: "8px 14px", fontFamily: MONO, fontSize: 13,
        }}
      >
        {on ? "Inspecting · Esc to stop" : "Inspect · I"}
      </button>

      {on && info ? (
        <>
          <div
            style={{
              position: "fixed", left: info.rect.left, top: info.rect.top, width: info.rect.width, height: info.rect.height,
              outline: `2px solid ${BLUE}`, background: "rgba(13,153,255,0.10)", outlineOffset: -1,
            }}
          >
            <span style={{ position: "absolute", left: -2, top: -22, background: BLUE, color: "#fff", fontSize: 12, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap" }}>
              {info.name}
            </span>
          </div>
          <div
            ref={card}
            style={{
              position: "fixed", left, top, width: W, background: "#161616", color: "#f2f2f2", border: "1px solid #3a3a3a",
              borderRadius: 12, padding: 14, fontSize: 12, lineHeight: "17px", boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{info.name}</div>
            <div style={{ color: "#9a9a9a", marginBottom: 10 }}>{info.crumbs}</div>
            {info.lines.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 8 }}>
                <span style={{ width: 66, flexShrink: 0, color: "#8a8a8a" }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, color: copied ? "#5ee08a" : BLUE }}>
              {copied ? "Copied. Paste it in the chat and add your change." : "Click to copy  ·  ↑ parent  ↓ child"}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
