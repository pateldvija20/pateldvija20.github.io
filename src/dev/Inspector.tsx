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
 * Press `E` over any text to edit it: the inspector finds where those words are
 * written under src/ (through the `inspector-edit` plugin in vite.config.ts),
 * shows them as written, with `**` marking bold, and saves your change into
 * that file; hot reload shows it on the page.
 *
 * Mounted only in development (main.tsx), so it never ships.
 */

const MONO = "'DM Mono', ui-monospace, monospace";
const BLUE = "#0d99ff";

type Line = [string, string];
type Hit = { file: string; start: number; end: number; line: number; raw: string };
type Edit = { el: Element; hits: Hit[] | null; pick: number; draft: string; status: string; error: boolean };

/** The block of text to edit: the paragraph, heading, label or control the pointer is on. */
function textBlock(hit: Element): HTMLElement | null {
  const block = hit.closest("p, h1, h2, h3, h4, h5, h6, dd, dt, li, blockquote, figcaption, button, a, label, td, th, span");
  const el = (block ?? hit) as HTMLElement;
  return (el.textContent ?? "").trim() ? el : null;
}

/** The words as written, not as styled: hidden text out, whitespace collapsed. */
function visibleText(el: HTMLElement): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(".sr-only, [aria-hidden='true']").forEach((n) => n.remove());
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
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
  /** The named element under the pointer: what `describe` would report for it. */
  const last = useRef<Element | null>(null);
  /** The element ArrowUp / ArrowDown has moved the selection to, and the way back down. */
  const sel = useRef<Element | null>(null);
  const trail = useRef<Element[]>([]);
  const pick = () => sel.current ?? last.current;
  const card = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  /** The raw element under the pointer, for `E`. */
  const hitEl = useRef<Element | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);

  const startEdit = useCallback(async () => {
    const block = hitEl.current && textBlock(hitEl.current);
    if (!block) return;
    const text = visibleText(block);
    setEdit({ el: block, hits: null, pick: 0, draft: "", status: "Finding where this is written…", error: false });
    try {
      const { hits } = (await post("/__inspector/find", { text })) as { hits: Hit[] };
      if (!hits?.length) {
        setEdit((e) => e && { ...e, hits: [], status: "Could not find these words in src/. They may be built from parts, or come from an image or video.", error: true });
        return;
      }
      // Prefer the file the element says it comes from.
      const src = (block.closest("[data-src]") as HTMLElement | null)?.dataset.src?.split(" › ")[0];
      const best = Math.max(0, hits.findIndex((h) => src && h.file === src));
      setEdit((e) => e && { ...e, hits, pick: best, draft: hits[best].raw, status: hits.length > 1 ? `Found in ${hits.length} places` : "", error: false });
    } catch {
      setEdit((e) => e && { ...e, hits: [], status: "The dev server did not answer. Restart it so vite.config.ts loads the edit plugin.", error: true });
    }
  }, []);

  const saveEdit = useCallback(async () => {
    if (!edit?.hits?.length) return;
    const h = edit.hits[edit.pick];
    if (edit.draft === h.raw) return setEdit(null);
    setEdit({ ...edit, status: "Saving…", error: false });
    const r = await post("/__inspector/save", { file: h.file, start: h.start, end: h.end, raw: h.raw, next: edit.draft });
    if (r.ok) setEdit(null);
    else setEdit({ ...edit, status: r.error ?? "Could not save.", error: true });
  }, [edit]);

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
      if (on && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        startEdit();
        return;
      }
      if (on && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        // Caught before the page sees it, so the arrows never scroll the page underneath.
        e.preventDefault();
        e.stopPropagation();
        const cur = pick();
        if (!cur) return;
        if (e.key === "ArrowUp") {
          // The next named ancestor; a plain parent only where nothing above has a name.
          const named = cur.parentElement?.closest("[data-ui]");
          const next = named ?? cur.parentElement;
          if (!next || next === document.body || next === document.documentElement) return;
          trail.current.push(cur);
          sel.current = next;
        } else {
          // Back down the way ArrowUp came, else into the first named child.
          const next = trail.current.pop() ?? cur.querySelector("[data-ui]");
          if (!next) return;
          sel.current = next;
        }
        setInfo(describe(sel.current));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [on, startEdit]);

  useEffect(() => {
    const root = document.documentElement;
    if (!on) {
      root.removeAttribute("data-inspect");
      setInfo(null);
      setEdit(null);
      last.current = null;
      sel.current = null;
      trail.current = [];
      return;
    }
    root.setAttribute("data-inspect", "");
    const onMove = (e: PointerEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        if (!hit || inInspector(hit)) return;
        hitEl.current = hit;
        // Compare named elements, not raw ones: moving within the same component
        // must not undo ArrowUp / ArrowDown.
        const el = hit.closest("[data-ui]") ?? hit;
        if (el === last.current) return;
        last.current = el;
        sel.current = null;
        trail.current = [];
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
              {copied ? "Copied. Paste it in the chat and add your change." : "Click to copy  ·  E edit text  ·  ↑ parent  ↓ child"}
            </div>
          </div>
        </>
      ) : null}
      {on && edit ? (
        <div
          data-inspector-ui
          role="dialog"
          aria-label="Edit text"
          style={{
            position: "fixed", left: "50%", bottom: 64, transform: "translateX(-50%)", width: "min(640px, calc(100vw - 32px))", pointerEvents: "auto",
            background: "#161616", color: "#f2f2f2", border: `1px solid ${BLUE}`, borderRadius: 12, padding: 14, fontSize: 12, lineHeight: "17px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Edit text</span>
            <span style={{ color: "#9a9a9a" }}>**bold**  ·  ⌘Enter save  ·  Esc cancel</span>
          </div>
          {edit.hits && edit.hits.length > 1 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {edit.hits.map((h, i) => (
                <button
                  key={`${h.file}:${h.start}`}
                  type="button"
                  onClick={() => setEdit({ ...edit, pick: i, draft: h.raw })}
                  style={{ fontFamily: MONO, fontSize: 11, padding: "3px 8px", borderRadius: 999, cursor: "pointer", border: `1px solid ${i === edit.pick ? BLUE : "#3a3a3a"}`, background: i === edit.pick ? BLUE : "transparent", color: "#fff" }}
                >
                  {h.file.replace(/^src\//, "")}:{h.line}
                </button>
              ))}
            </div>
          ) : edit.hits?.length === 1 ? (
            <div style={{ color: "#9a9a9a", marginBottom: 8 }}>{edit.hits[0].file}:{edit.hits[0].line}</div>
          ) : null}
          {edit.hits?.length ? (
            <textarea
              autoFocus
              value={edit.draft}
              onChange={(e) => setEdit({ ...edit, draft: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setEdit(null);
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveEdit();
                }
              }}
              rows={Math.min(10, Math.max(3, Math.ceil(edit.draft.length / 70)))}
              style={{ width: "100%", resize: "vertical", background: "#0e0e0e", color: "#f2f2f2", border: "1px solid #3a3a3a", borderRadius: 8, padding: 10, fontFamily: MONO, fontSize: 13, lineHeight: "19px" }}
            />
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ flex: 1, color: edit.error ? "#ff7b6b" : "#9a9a9a" }}>{edit.status}</span>
            <button type="button" onClick={() => setEdit(null)} style={{ fontFamily: MONO, fontSize: 12, padding: "6px 12px", borderRadius: 999, border: "1px solid #3a3a3a", background: "transparent", color: "#fff", cursor: "pointer" }}>
              Cancel
            </button>
            {edit.hits?.length ? (
              <button type="button" onClick={saveEdit} style={{ fontFamily: MONO, fontSize: 12, padding: "6px 12px", borderRadius: 999, border: `1px solid ${BLUE}`, background: BLUE, color: "#fff", cursor: "pointer" }}>
                Save to file
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
