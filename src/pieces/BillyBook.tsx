import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { COLOR } from "./tokens";

/**
 * Billy & Buddy, Volume 1, as a book you can turn on screen.
 *
 * Modelled on the Hello Monday picture book (howtotalktowhitekidsaboutracism
 * .com): the book opens from its cover and pages are dragged over the spine.
 *
 * Every page is the printed book's own page, rendered from the print PDF
 * (Billy&Buddy-Final.pdf) into public/assets/projects/billy-and-buddy/book.
 * The PDF has no paper add-ons, so they are laid over the page where they sit
 * in the printed copy: grandpa's letter on page 4, the Need and Want stickers
 * on page 8, the wallet and receipt coins on pages 9 and 10, the fish on page
 * 16, the answers on page 17, the slide tab on page 20, and the
 * code on the last page, which unlocks the game. The slide tab cards are cut
 * from the book's own illustrations.
 *
 * The PDF pages carry 24pt of bleed and crop marks on a 624pt page, so each
 * one is shown through a frame trimmed to the 576pt page. Overlay positions
 * are in the untrimmed page, at 600 units across.
 *
 * Page 18 (the first slide tab) is left out, so the pages after it sit on the
 * other side of the spine from print; the closing endpaper goes too, to keep
 * an even page count.
 *
 * The book is laid out on a 1200 x 600 spread and scaled to fit. Narrow
 * screens show one page at a time. Leaves turn with a CSS 3D rotation around
 * the spine, so only transform and opacity animate.
 */

const PW = 600;
const PH = 600;
const ART = "/assets/projects/billy-and-buddy/book";
const GAME_URL = "/billy-and-buddy-game/";
const GAME_ITEMS = "/billy-and-buddy-game/assets/items";
/** Bleed, in the 600 unit page, cut off each side. */
const BLEED = 24;
const TRIM = PW / (PW - 2 * BLEED);

const C = {
  ink: "#24324A",
  teal: "#16B1AA",
  coin: "#F5B731",
  coinRim: "#F9D458",
};
/** The page's outer corners are rounded, the spine edge stays square, as on a real book. */
const RADIUS = 14;
const EASE = "cubic-bezier(0.645, 0.045, 0.355, 1)";
const SANS = "Lexend, ui-sans-serif, system-ui, sans-serif";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------ shared parts ------------------------------ */

/** A printed page: the PDF render trimmed to the page, with overlays in its untrimmed coordinates. */
function Sheet({ src, alt, children }: { src: string; alt: string; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", overflow: "hidden", fontFamily: SANS, color: C.ink }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transform: `scale(${TRIM}) translate(${-BLEED}px, ${-BLEED}px)`, transformOrigin: "0 0" }}>
        <img src={`${ART}/${src}.jpg`} alt={alt} draggable={false} style={{ position: "absolute", inset: 0, width: PW, height: PH, userSelect: "none" }} />
        {children}
      </div>
    </div>
  );
}

/** A full bleed image with no trim, for the covers and endpapers. */
function Plate({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "#EEEBE1" }}>
      <img src={`${ART}/${src}.jpg`} alt={alt} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }} />
    </div>
  );
}

function At({ x, y, w, h, children, style }: { x: number; y: number; w?: number; h?: number; children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
}

function Coin({ size = 30, style }: { size?: number; style?: CSSProperties }) {
  return <span style={{ display: "block", width: size, height: size, borderRadius: "50%", background: C.coin, boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(size / 9))}px ${C.coinRim}, 0 2px 0 #D98E22`, ...style }} />;
}

/** A tap target inside a page; the book never starts a page turn from one. */
const ix = { "data-ix": "" } as const;

/** Whether the custom cursor is on (a fine pointer above the phone breakpoint), so its labels give the instructions. */
function useCursorLabels() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(pointer: fine) and (min-width: 769px)");
    const check = () => setOn(m.matches);
    check();
    m.addEventListener("change", check);
    return () => m.removeEventListener("change", check);
  }, []);
  return on;
}

/**
 * A pill on the page. An instruction shows only where there is no cursor
 * label to give it (touch screens). Feedback ("All sorted!") shows on every
 * screen for two seconds each time it changes, then clears.
 */
function Hint({ x, y, children, show = true, feedback = false }: { x: number; y: number; children: ReactNode; show?: boolean; feedback?: boolean }) {
  const labels = useCursorLabels();
  const [live, setLive] = useState(false);
  const text = typeof children === "string" ? children : "";
  useEffect(() => {
    if (!feedback || !show) return setLive(false);
    setLive(true);
    const id = window.setTimeout(() => setLive(false), 2000);
    return () => window.clearTimeout(id);
  }, [feedback, show, text]);
  const visible = feedback ? live : show && !labels;
  return (
    <At x={x} y={y} style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms ease", pointerEvents: "none", zIndex: 5 }}>
      <span style={{ display: "inline-block", whiteSpace: "nowrap", fontSize: 11, fontWeight: 500, color: "#fff", background: C.ink, borderRadius: 999, padding: "4px 10px" }}>{children}</span>
    </At>
  );
}

const inside = (el: Element | null | undefined, x: number, y: number) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

/**
 * Drags a sticker, coin or fish as a ghost on the document, so a piece can
 * cross from one page to the other without being clipped by its page. On
 * release `drop` decides: it returns the element the piece now rests in (it
 * flies there), true when the piece itself moved to a slot (it flies to its
 * new place) or false (it flies home).
 */
function startDrag(e: React.PointerEvent, el: HTMLElement, drop: (cx: number, cy: number) => Element | boolean) {
  e.stopPropagation();
  e.preventDefault();
  const r = el.getBoundingClientRect();
  const k = r.width / el.offsetWidth;
  const ghost = document.createElement("div");
  Object.assign(ghost.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, zIndex: "9999", pointerEvents: "none", willChange: "transform" });
  const clone = el.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, { position: "absolute", left: "0", top: "0", margin: "0", transform: `scale(${k})`, transformOrigin: "0 0", animation: "none", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))" });
  ghost.appendChild(clone);
  document.body.appendChild(ghost);
  el.style.opacity = "0";
  const sx = e.clientX;
  const sy = e.clientY;
  let dx = 0;
  let dy = 0;
  const move = (ev: PointerEvent) => {
    dx = ev.clientX - sx;
    dy = ev.clientY - sy;
    ghost.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    const to = drop(ev.clientX, ev.clientY);
    requestAnimationFrame(() => {
      const target = to instanceof Element ? to : el.isConnected ? el : null;
      const t = target?.getBoundingClientRect();
      const land = t ? `translate(${t.left + t.width / 2 - (r.left + r.width / 2)}px, ${t.top + t.height / 2 - (r.top + r.height / 2)}px)` : ghost.style.transform;
      const anim = ghost.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: land, opacity: to instanceof Element ? 0.4 : 1 }], { duration: reduced() ? 1 : 260, easing: EASE, fill: "forwards" });
      anim.onfinish = () => {
        ghost.remove();
        el.style.opacity = "";
      };
    });
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

/* ------------------------------ page 4: grandpa's letter ------------------------------ */

function GrandpasBox() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet src="p04" alt="Page 4. Grandpa's box, open, with a gold key and a pile of coins inside.">
      <button
        {...ix}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close grandpa's letter" : "Open grandpa's letter"}
        aria-pressed={open}
        data-cursor={open ? "Close the letter" : "Open grandpa's letter"}
        style={{ position: "absolute", left: 120, top: 330, width: 230, height: 160, border: 0, padding: 0, background: "none", cursor: "pointer" }}
      >
        <svg viewBox="0 0 230 160" width={230} height={160} style={{ position: "absolute", inset: 0, transform: "rotate(-8deg)", filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))" }}>
          <rect x={2} y={10} width={226} height={146} rx={5} fill="#F6F2EA" stroke="#DDD5C6" strokeWidth={2} />
          <path d="M2 156 L115 80 L228 156" fill="none" stroke="#DDD5C6" strokeWidth={2} />
        </svg>
        <span style={{ position: "absolute", left: 14, top: 6, width: 202, height: 100, background: "#EFE9DD", clipPath: "polygon(0 0, 100% 0, 50% 100%)", transformOrigin: "50% 0", transform: `rotate(-8deg) rotateX(${open ? 180 : 0}deg)`, transition: `transform 380ms ${EASE}` }} />
        {/* Grandpa's map rises out of the letter */}
        <span
          style={{
            position: "absolute",
            left: 40,
            top: 0,
            width: 160,
            height: 180,
            background: "#F3EDE0",
            border: "2px solid #B8AE9C",
            borderRadius: 8,
            transform: open ? "translateY(-190px) rotate(-3deg)" : "translateY(30px) scale(0.9)",
            opacity: open ? 1 : 0,
            transition: `transform 520ms ${EASE}, opacity 240ms ease`,
          }}
        >
          <svg viewBox="0 0 160 180" width={156} height={176}>
            <path d="M28 36 h40 v40 h-30 v40 h60 v30" fill="none" stroke="#C0392B" strokeWidth={4} strokeDasharray="8 7" />
            <path d="M112 136 l12 12 m0 -12 l-12 12" stroke="#C0392B" strokeWidth={5} />
            <path d="M78 56 q10 -14 22 0 q12 14 24 0" fill="none" stroke="#8A8378" strokeWidth={3} />
            <path d="M24 146 q16 -12 30 0 t30 0" fill="none" stroke="#8A8378" strokeWidth={3} />
            <circle cx={128} cy={36} r={12} fill="none" stroke="#8A8378" strokeWidth={3} />
          </svg>
        </span>
        <span style={{ position: "absolute", left: 95, top: 84, width: 40, height: 40, borderRadius: "50%", background: "#8E1E22", boxShadow: "inset 0 0 0 5px #A72B2F, inset 0 0 0 8px #3E7FA3", opacity: open ? 0 : 1, transition: "opacity 200ms ease" }} />
      </button>
      <Hint x={150} y={505} show={!open}>
        Tap the letter to open it
      </Hint>
    </Sheet>
  );
}

/* ------------------------------ page 8: need or want ------------------------------ */

const STICKERS = [
  { id: "lollipop", kind: "want", x: 112, y: 332 },
  { id: "chips", kind: "need", x: 112, y: 393 },
  { id: "binoculars", kind: "want", x: 112, y: 455 },
  { id: "balloon-dog", kind: "want", x: 183, y: 367 },
  { id: "water-bottle", kind: "need", x: 183, y: 428 },
  { id: "backpack", kind: "need", x: 183, y: 489 },
] as const;
const SLOT_Y = [340, 411, 481];
const COL_X = { need: 293, want: 439 };
function SortStickers() {
  const cols = { need: useRef<HTMLDivElement>(null), want: useRef<HTMLDivElement>(null) };
  const [placed, setPlaced] = useState<Record<string, "need" | "want">>({});
  const [miss, setMiss] = useState(false);
  const done = Object.keys(placed).length === STICKERS.length;
  return (
    <Sheet src="p08" alt="Page 8. Billy says to pay for needs first. Help Buddy sort the items into the Need and Want columns.">
      {(["need", "want"] as const).map((k) => (
        <div key={k} ref={cols[k]} style={{ position: "absolute", left: COL_X[k] - 67, top: 268, width: 134, height: 262 }} />
      ))}
      {STICKERS.map((s) => {
        const at = placed[s.id];
        const slot = at ? STICKERS.filter((o) => placed[o.id] === at).findIndex((o) => o.id === s.id) : 0;
        const cx = at ? COL_X[at] : s.x;
        const cy = at ? SLOT_Y[slot] : s.y;
        return (
          <div
            key={s.id}
            {...ix}
            role="button"
            aria-label={`${s.id.replace("-", " ")} sticker${at ? `, in ${at}s` : ""}`}
            data-cursor={at ? "Sorted" : "Drag into Need or Want"}
            onPointerDown={(e) => {
              if (at) return;
              startDrag(e, e.currentTarget, (x, y) => {
                const k = inside(cols.need.current, x, y) ? "need" : inside(cols.want.current, x, y) ? "want" : null;
                if (!k) return false;
                if (k === s.kind) {
                  setPlaced((p) => ({ ...p, [s.id]: k }));
                  return true;
                }
                setMiss(true);
                setTimeout(() => setMiss(false), 1600);
                return false;
              });
            }}
            style={{ position: "absolute", left: cx - 26, top: cy - 26, width: 52, height: 52, borderRadius: 15, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", display: "grid", placeItems: "center", cursor: at ? "default" : "grab", touchAction: "none" }}
          >
            <img src={`${GAME_ITEMS}/${s.id}.svg`} alt="" draggable={false} style={{ width: 38, height: 38, objectFit: "contain", pointerEvents: "none" }} />
          </div>
        );
      })}
      <Hint x={300} y={548} show={!done && !miss}>
        Drag a sticker into a column
      </Hint>
      <Hint x={300} y={548} feedback show={done || miss}>
        {done ? "All sorted!" : "Hmm. Could they do without it?"}
      </Hint>
    </Sheet>
  );
}

/* ------------------------------ pages 9 and 10: the wallet and the receipt ------------------------------ */

const WALLET = 10;
const RECEIPT = [
  { name: "backpack", coins: 3, y: 190 },
  { name: "water bottle", coins: 2, y: 258 },
  { name: "banana", coins: 1, y: 328 },
];
type Till = { open: boolean; paid: number[]; rows: React.MutableRefObject<(HTMLDivElement | null)[]>; setOpen: (v: boolean) => void; pay: (row: number, d: number) => void };
function useTill(): Till {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState([0, 0, 0]);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const pay = useCallback((row: number, d: number) => setPaid((v) => v.map((n, i) => (i === row ? Math.max(0, Math.min(RECEIPT[i].coins, n + d)) : n))), []);
  return { open, paid, rows, setOpen, pay };
}

function Wallet({ till }: { till: Till }) {
  const left = WALLET - till.paid.reduce((a, b) => a + b, 0);
  return (
    <Sheet src="p09" alt="Page 9. Billy: These are the items we need. A water bottle for 2 coins, a backpack for 3 coins and a banana for 1 coin. Buddy: I want this ball! Can we get it, too?">
      <button
        {...ix}
        onClick={() => till.setOpen(true)}
        aria-label={till.open ? "The open wallet" : "Open the wallet"}
        data-cursor={till.open ? "Drag a coin onto the receipt" : "Open the wallet"}
        style={{ position: "absolute", left: 298, top: 257, width: 226, height: 146, border: 0, padding: 0, background: "#fff", cursor: till.open ? "default" : "pointer" }}
      >
        <span style={{ position: "absolute", left: 24, top: 10, width: 178, height: 126, borderRadius: 12, background: till.open ? "#F5F0E8" : "#C9473F", boxShadow: "0 4px 10px rgba(0,0,0,0.2)", transition: "background 250ms ease" }} />
        {!till.open && (
          <>
            <span style={{ position: "absolute", left: 90, top: 56, width: 112, height: 30, background: "#8E2B27", borderRadius: "15px 0 0 15px" }} />
            <span style={{ position: "absolute", left: 100, top: 63, width: 16, height: 16, borderRadius: "50%", background: C.coin }} />
          </>
        )}
      </button>
      {till.open &&
        Array.from({ length: left }, (_, i) => (
          <div
            key={i}
            {...ix}
            role="button"
            aria-label="Coin. Drag it onto the receipt."
            data-cursor="Drag onto the receipt"
            onPointerDown={(e) =>
              startDrag(e, e.currentTarget, (x, y) => {
                const r = till.rows.current.findIndex((el) => inside(el, x, y));
                if (r < 0 || till.paid[r] >= RECEIPT[r].coins) return false;
                const slot = till.rows.current[r]?.querySelectorAll("[data-slot]")[till.paid[r]];
                till.pay(r, 1);
                return slot ?? true;
              })
            }
            style={{ position: "absolute", left: 336 + (i % 5) * 31, top: 282 + Math.floor(i / 5) * 40, cursor: "grab", touchAction: "none", animation: "bb-pop 260ms ease-out both", animationDelay: `${i * 30}ms` }}
          >
            <Coin size={28} />
          </div>
        ))}
      <Hint x={330} y={412} show={!till.open}>
        Tap the wallet
      </Hint>
      <Hint x={318} y={412} show={till.open && left === WALLET}>
        Drag coins onto the receipt
      </Hint>
    </Sheet>
  );
}

function Receipt({ till }: { till: Till }) {
  return (
    <Sheet src="p10" alt="Page 10. A receipt with a backpack, a water bottle and a banana. Determine how many coins go to each item, then write how many coins Billy and Buddy have left.">
      {RECEIPT.map((row, i) => (
        <div key={row.name} ref={(el) => void (till.rows.current[i] = el)} aria-label={`${row.name}: ${till.paid[i]} of ${row.coins} coins`} style={{ position: "absolute", left: 157, top: row.y, width: 137, height: 58, display: "flex", alignItems: "center", gap: 6, paddingLeft: 10 }}>
          {Array.from({ length: row.coins }, (_, s) => (
            <span key={s} data-slot="" style={{ width: 30, height: 30, borderRadius: "50%", background: s < till.paid[i] ? "transparent" : "#F1F1F1" }}>
              {s < till.paid[i] && (
                <button {...ix} aria-label="Take this coin back" data-cursor="Take it back" onClick={() => till.pay(i, -1)} style={{ border: 0, padding: 0, background: "none", cursor: "pointer", animation: "bb-pop 200ms ease-out" }}>
                  <Coin size={30} />
                </button>
              )}
            </span>
          ))}
        </div>
      ))}
      <Blank x={377} y={396} answer={WALLET - RECEIPT.reduce((n, r) => n + r.coins, 0)} label="How many coins do Billy and Buddy have left?" />
    </Sheet>
  );
}

/* ------------------------------ page 16: the fish ------------------------------ */

function Fish({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 120 60" width={size} style={{ display: "block", pointerEvents: "none" }}>
      <path d="M8 6 Q30 30 8 54 L30 30Z" fill="#8C9AC2" />
      <path d="M24 30 Q50 2 90 8 Q116 16 116 30 Q116 44 90 52 Q50 58 24 30Z" fill="#9AA8CF" stroke="#7C8AB4" strokeWidth={2} />
      <path d="M86 12 Q76 30 86 48" fill="none" stroke="#6F7CA6" strokeWidth={2} />
      <circle cx={98} cy={26} r={3.2} fill="#1E2433" />
      {[44, 56, 68].map((x) => [22, 34].map((y) => <path key={`${x}${y}`} d={`M${x} ${y} q4 4 0 8`} stroke="#fff" strokeWidth={2} fill="none" />))}
    </svg>
  );
}

const FISH = [
  { id: "a", size: 0, x: 110, y: 370, w: 80 },
  { id: "b", size: 1, x: 215, y: 360, w: 110 },
  { id: "c", size: 2, x: 345, y: 360, w: 140 },
  { id: "d", size: 2, x: 110, y: 445, w: 140 },
  { id: "e", size: 1, x: 280, y: 455, w: 110 },
];
const CRATES = [
  { label: "$", x: 92, y: 200, w: 105, h: 100 },
  { label: "$$", x: 212, y: 190, w: 124, h: 118 },
  { label: "$$$", x: 350, y: 178, w: 150, h: 142 },
];
function FishSort() {
  const crates = useRef<(HTMLDivElement | null)[]>([]);
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [miss, setMiss] = useState(false);
  const done = Object.keys(placed).length === FISH.length;
  return (
    <Sheet src="p16" alt="Page 16. Help Billy and Buddy sort the fish into the right boxes. The bigger the fish, the more money it is worth.">
      {CRATES.map((c, i) => (
        <div key={c.label} ref={(el) => void (crates.current[i] = el)} style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h }} />
      ))}
      {FISH.map((f) => {
        const at = placed[f.id];
        const c = at !== undefined ? CRATES[at] : null;
        const stack = c ? FISH.filter((o) => placed[o.id] === at).findIndex((o) => o.id === f.id) : 0;
        const w = c ? f.w * 0.6 : f.w;
        return (
          <div
            key={f.id}
            {...ix}
            role="button"
            aria-label={`${["Small", "Medium", "Big"][f.size]} fish${c ? `, in the ${c.label} box` : ""}`}
            data-cursor={c ? "Sorted" : "Drag into a box"}
            onPointerDown={(e) => {
              if (c) return;
              startDrag(e, e.currentTarget, (x, y) => {
                const i = crates.current.findIndex((el) => inside(el, x, y));
                if (i < 0) return false;
                if (i === f.size) {
                  setPlaced((p) => ({ ...p, [f.id]: i }));
                  return true;
                }
                setMiss(true);
                setTimeout(() => setMiss(false), 1600);
                return false;
              });
            }}
            style={{ position: "absolute", left: c ? c.x + (c.w - w) / 2 : f.x, top: c ? c.y + c.h * 0.42 + stack * 22 : f.y, width: w, cursor: c ? "default" : "grab", touchAction: "none" }}
          >
            <Fish size={w} />
          </div>
        );
      })}
      <Hint x={100} y={548} show={!done && !miss}>
        Drag each fish into a box
      </Hint>
      <Hint x={100} y={548} feedback show={done || miss}>
        {done ? "Five fish caught!" : "Look at its size. Which box fits?"}
      </Hint>
    </Sheet>
  );
}

/* ------------------------------ page 17: the sums ------------------------------ */

function Blank({ x, y, answer, label }: { x: number; y: number; answer: number; label: string }) {
  const [v, setV] = useState("");
  const right = v !== "" && Number(v) === answer;
  return (
    <input
      {...ix}
      aria-label={label}
      data-cursor="Type the answer"
      inputMode="numeric"
      maxLength={2}
      value={v}
      onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
      style={{ position: "absolute", left: x, top: y, width: 30, height: 18, padding: 0, border: 0, borderBottom: `2px solid ${right ? C.teal : "transparent"}`, background: v ? "#fff" : "rgba(22,177,170,0.12)", textAlign: "center", fontFamily: SANS, fontSize: 13, fontWeight: 700, color: right ? C.teal : C.ink, outline: "none", borderRadius: 3 }}
    />
  );
}

function TenEach() {
  return (
    <Sheet src="p17" alt="Page 17. The fisherman: Thank you for the help! Here is ten coins each. Enjoy your journey.">
      <Blank x={434} y={426} answer={20} label="Together, they have how many coins?" />
      <Blank x={287} y={494} answer={8} label="After the ferry tickets, how many coins are left?" />
    </Sheet>
  );
}

/* ------------------------------ pages 18 and 20: the slide tabs ------------------------------ */

function Card({ src, fit = "cover" }: { src: string; fit?: "contain" | "cover" }) {
  return <img src={`${ART}/${src}.jpg`} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: fit, pointerEvents: "none", display: "block" }} />;
}

/** One card on a slide tab page, sized to its art. */
type TabCard = { art: ReactNode; w: number; h: number };

/**
 * A paper slide tab, as in the printed book: a card stands on each side of a
 * track; dragging the tab carries a third card out from behind the left one
 * and across to the right one, and a fourth slides out from behind that.
 * Each card is sized to its own art, centred on the track's line.
 */
function SlideTab({ src, alt, prompt, still, moving, target, reward }: { src: string; alt: string; prompt: string; still: TabCard; moving: TabCard; target: TabCard; reward: TabCard }) {
  const [q, setQ] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const CY = 330;
  const stillX = 110;
  const targetX = 470 - target.w;
  const trackL = stillX + still.w;
  const trackW = targetX - trackL;
  const KNOB = 44;
  const travel = trackW - KNOB - 12;
  const start = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const k = (trackRef.current?.getBoundingClientRect().width ?? trackW) / (trackRef.current?.offsetWidth ?? trackW);
    const sx = e.clientX;
    const q0 = q;
    const move = (ev: PointerEvent) => setQ(Math.max(0, Math.min(1, q0 + (ev.clientX - sx) / k / travel)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setQ((v) => (v > 0.5 ? 1 : 0));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const out = Math.max(0, (q - 0.65) / 0.35);
  const frame: CSSProperties = { background: "#fff", border: `1.5px solid ${C.ink}`, overflow: "hidden" };
  const card = (c: TabCard, x: number, z: number, extra?: CSSProperties) => (
    <At x={x} y={CY - c.h / 2} w={c.w} h={c.h} style={{ ...frame, zIndex: z, ...extra }}>
      {c.art}
    </At>
  );
  const from = stillX - moving.w * 0.55;
  const to = targetX + (target.w - moving.w) / 2;
  return (
    <Sheet src={src} alt={alt}>
      {card(moving, from + (to - from) * q, 1, { opacity: 1 - out })}
      {card(still, stillX, 2)}
      <div ref={trackRef} style={{ position: "absolute", left: trackL, top: CY - 15, width: trackW, height: 30, borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}`, background: "#fff", zIndex: 2 }} />
      <div
        {...ix}
        role="slider"
        aria-label={prompt}
        data-cursor="Slide the tab"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(q * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setQ(1);
          if (e.key === "ArrowLeft") setQ(0);
        }}
        onPointerDown={start}
        style={{ position: "absolute", left: trackL + 6 + q * travel, top: CY - 11, width: KNOB, height: 22, background: "#fff", border: "1px solid #bbb", display: "grid", placeItems: "center", cursor: "grab", touchAction: "none", zIndex: 3 }}
      >
        <svg width={28} height={12} viewBox="0 0 30 12">
          <path d="M2 6 H22 M17 1 L25 6 L17 11" stroke={C.ink} strokeWidth={2.5} fill="none" />
        </svg>
      </div>
      {card(reward, targetX + target.w - reward.w + out * (reward.w + 4), 1, { opacity: out })}
      {card(target, targetX, 2)}
      <Hint x={trackL + 6} y={CY + 24} show={q < 1}>
        Slide the tab
      </Hint>
    </Sheet>
  );
}

/* ------------------------------ the last page: the code ------------------------------ */

const CODE = [3, 2, 8, 5];
const DIGIT_X = [233, 267, 300, 334];
function CodePage() {
  const [v, setV] = useState(["", "", "", ""]);
  const solved = v.every((d, i) => d !== "" && Number(d) === CODE[i]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <Sheet src="code" alt="Answer the questions below to build the code, then visit Billy and Buddy online. 1. How many coins are on page 5? 2. How many plants are on the supermarket windows? 3. How many coins do Billy and Buddy have left after purchasing their ferry tickets? 4. How many fish do Billy and Buddy catch?">
      {v.map((d, i) => (
        <input
          key={i}
          ref={(el) => void (refs.current[i] = el)}
          {...ix}
          aria-label={`Code digit ${i + 1}`}
          data-cursor="Type a digit"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => {
            const n = e.target.value.replace(/\D/g, "").slice(-1);
            setV((a) => a.map((x, j) => (j === i ? n : x)));
            if (n) refs.current[i + 1]?.focus();
          }}
          style={{ position: "absolute", left: DIGIT_X[i], top: 250, width: 23, height: 22, padding: 0, border: 0, background: d ? "#fff" : "rgba(22,177,170,0.14)", borderRadius: 3, textAlign: "center", fontFamily: SANS, fontSize: 17, fontWeight: 700, color: solved ? C.teal : C.ink, outline: "none" }}
        />
      ))}
      <At x={165} y={95} w={265} h={130} style={{ background: "#fff", display: "grid", placeItems: "center", opacity: solved ? 1 : 0, pointerEvents: solved ? "auto" : "none", transition: "opacity 300ms ease" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>Code 3285 accepted!</p>
          <a
            {...ix}
            href={GAME_URL}
            target="_blank"
            rel="noopener"
            tabIndex={solved ? 0 : -1}
            data-cursor="Play the game"
            style={{ display: "inline-block", padding: "9px 18px", borderRadius: 12, fontWeight: 600, fontSize: 14, color: "#fff", background: C.teal, boxShadow: "0 3px 0 #0B8C86", textDecoration: "none" }}
          >
            Play Basket of Choices
          </a>
        </div>
      </At>
    </Sheet>
  );
}

/* ------------------------------ the book ------------------------------ */

const STORY: Record<string, string> = {
  intro: "Solve the problems in this book to answer the questions on the last page. Then, visit Billy and Buddy online with the code!",
  p01: "Page 1. One sunny day, Billy and Buddy were playing in the backyard.",
  p02: "Page 2. Buddy digs. Billy! Look at what I found.",
  p03: "Page 3. Billy: Wow! This was grandpa's box. Let's see what's inside.",
  p05: "Page 5. Buddy sniffs three coins. Is this food? Billy laughs: No, this isn't food. This is money.",
  p06: "Page 6. Billy explains that money is something people use to buy things they need or want, and that grandpa's letter says to use it to buy supplies for their adventure.",
  p07: "Page 7. Outside the supermarket. Billy: Okay, Buddy, let's see what we need. We only have 10 coins. Buddy: Let's get a toy!",
  p11: "Page 11. Billy: We should save the last 2 coins for the next part of the journey. Buddy sighs.",
  p12: "Page 12. After purchasing their supplies and a toy, Billy and Buddy followed the map to their next destination.",
  p13: "Page 13. At the river ferry, tickets cost 6 coins each. Oh no! How will we get across the river? We used all of our coins!",
  p14: "Page 14. A help wanted sign: they could get paid for helping the local fisherman, then buy their ferry tickets.",
  p15: "Page 15. The fisherman: If you catch some fish, I will give you coins. You can borrow my boat and supplies!",
  p19: "Page 19. Billy and Buddy buy two ferry tickets for 12 coins. Climb aboard!",
  p23: "Page 23. Across the river, the map leads to a bank.",
  p24: "Page 24. At the bank, grandpa's key belongs to one of the savings boxes.",
  p25: "Page 25. Would you like to withdraw any money today? Buddy: Let's take it all!",
  p26: "Page 26. Billy: Buddy, that would not be smart. We should save some of this for another adventure. They withdraw 10 coins.",
  p27: "Page 27. Billy and Buddy returned safely back home after stopping for treats.",
  p28: "Page 28. The End.",
};
const page = (src: string) => <Sheet key={src} src={src} alt={STORY[src] ?? ""} />;

function usePages() {
  const till = useTill();
  return [
    <Plate key="cover" src="cover" alt="Billy and Buddy, Volume 1. Billy waves beside Buddy, with coins and dollar bills around them." />,
    <Plate key="end1" src="endpaper" alt="" />,
    page("intro"),
    page("p01"),
    page("p02"),
    page("p03"),
    <GrandpasBox key="p04" />,
    page("p05"),
    page("p06"),
    page("p07"),
    <SortStickers key="p08" />,
    <Wallet key="p09" till={till} />,
    <Receipt key="p10" till={till} />,
    page("p11"),
    page("p12"),
    page("p13"),
    page("p14"),
    page("p15"),
    <FishSort key="p16" />,
    <TenEach key="p17" />,
    page("p19"),
    <SlideTab
      key="p20"
      src="p20"
      alt="Page 20. Slide the tab to see Billy and Buddy exchange money for tickets."
      prompt="Slide the tab to see Billy and Buddy exchange money for tickets."
      moving={{ art: <Card src="card-coins" />, w: 70, h: 76 }}
      still={{ art: <Card src="card-captain" />, w: 80, h: 224 }}
      target={{ art: <Card src="card-pair" />, w: 110, h: 170 }}
      reward={{ art: <Card src="card-ticket" fit="contain" />, w: 90, h: 57 }}
    />,
    page("p23"),
    page("p24"),
    page("p25"),
    page("p26"),
    page("p27"),
    page("p28"),
    <CodePage key="code" />,
    <Plate key="back" src="back" alt="The back cover of Billy and Buddy, Volume 1." />,
  ];
}

const usePortrait = () => {
  const [p, setP] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 720px)");
    const on = () => setP(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return p;
};

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap');
@keyframes bb-pop { from { opacity: 0; scale: 0.9 } to { opacity: 1; scale: 1 } }
@media (prefers-reduced-motion: reduce) {
  [data-bb-book] * { animation-duration: 1ms !important; }
}
`;

export function BillyBook() {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const single = usePortrait();
  const designW = single ? PW : PW * 2;
  const scale = width ? Math.min(1, width / designW) : 0.5;
  const pages = usePages();
  const N = pages.length / 2; // leaves
  const last = single ? pages.length - 1 : N;
  // spread k (0..N) in book mode, page index in single mode
  const [k, setK] = useState(0);
  const [drag, setDrag] = useState<{ leaf: number; p: number } | null>(null);
  const [told, setTold] = useState(false);
  useEffect(() => {
    if (k > 0) setTold(true);
  }, [k]);
  const rm = reduced();
  const turnMs = rm ? 200 : 720;

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setK(0), [single]);

  const go = (d: number) => setK((v) => Math.max(0, Math.min(last, v + d)));

  // Book mode: drag a page over the spine. A drag on the right half turns the
  // top right leaf forward; on the left half, the top left leaf back.
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (single || (e.target as HTMLElement).closest("[data-ix]")) return;
    const book = e.currentTarget.getBoundingClientRect();
    const mid = book.left + book.width / 2;
    const fwd = k === 0 ? true : k === N ? false : e.clientX > mid;
    if ((fwd && k >= N) || (!fwd && k <= 0)) return;
    const leaf = fwd ? k : k - 1;
    const sx = e.clientX;
    const t0 = performance.now();
    let moved = false;
    let p = 0;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale;
      if (!moved && Math.abs(dx) < 6) return;
      moved = true;
      p = Math.max(0, Math.min(1, (fwd ? -dx : dx) / (PW * 1.3)));
      setDrag({ leaf, p: fwd ? p : 1 - p });
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      const v = Math.abs(ev.clientX - sx) / Math.max(1, performance.now() - t0);
      const commit = moved ? p > 0.3 || v > 0.5 : (fwd && ev.clientX > book.right - 120 * scale) || (!fwd && ev.clientX < book.left + 120 * scale);
      setDrag(null);
      if (commit) setK(fwd ? leaf + 1 : leaf);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  // One page at a time: a swipe turns it, and so does a tap near either edge
  const swipe = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-ix]")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX;
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointerup", up);
      const dx = ev.clientX - sx;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      else if (ev.clientX > r.right - r.width / 4) go(1);
      else if (ev.clientX < r.left + r.width / 4) go(-1);
    };
    window.addEventListener("pointerup", up);
  };

  const keyOf = (i: number) => String(pages[i]?.key ?? "");
  const pageName = (i: number) => {
    const key = keyOf(i);
    if (i === 0) return "Cover";
    if (i === pages.length - 1) return "Back cover";
    if (/^p\d+$/.test(key)) return `Page ${Number(key.slice(1))}`;
    if (key === "code") return "The code";
    return "";
  };
  const label = single ? pageName(k) || "Inside cover" : k === 0 ? "Cover" : k === N ? "Back cover" : [pageName(2 * k - 1), pageName(2 * k)].filter(Boolean).join(" · ") || "Inside cover";

  return (
    <div data-bb-book="" data-cursor-once="" className="select-none">
      <style>{STYLE}</style>
      <div
        ref={wrap}
        tabIndex={0}
        role="region"
        aria-roledescription="book"
        aria-label={`Billy and Buddy, Volume 1. ${label}. Use the arrow keys to turn pages.`}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest("input, [role=slider]")) return;
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        className="relative w-full outline-none"
        style={{ height: PH * scale }}
        // The page turn is explained once: on the cover, the first time the
        // pointer comes over the book. After that the pages carry no label.
        data-cursor={k === 0 && !told ? "Drag to open the book" : undefined}
        onPointerLeave={() => setTold(true)}
      >
        {single ? (
          <div onPointerDown={swipe} style={{ position: "absolute", left: "50%", top: 0, width: PW, height: PH, marginLeft: -PW / 2, transform: `scale(${scale})`, transformOrigin: "50% 0", boxShadow: "0 18px 40px rgba(0,0,0,0.18)", borderRadius: RADIUS, overflow: "hidden", touchAction: "pan-y" }}>
            {pages.map((pg, i) => (
              <div key={i} aria-hidden={i !== k} style={{ position: "absolute", inset: 0, opacity: i === k ? 1 : 0, transform: `translateX(${rm ? 0 : (i - k) * 24}px)`, pointerEvents: i === k ? "auto" : "none", visibility: Math.abs(i - k) <= 1 ? "visible" : "hidden", transition: `opacity 260ms ease, transform 360ms ${EASE}` }}>
                {pg}
              </div>
            ))}
          </div>
        ) : (
          <div
            onPointerDown={down}
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: PW * 2,
              height: PH,
              marginLeft: -PW,
              transform: `scale(${scale}) translateX(${k === 0 ? -PW / 2 : k === N ? PW / 2 : 0}px)`,
              transformOrigin: "50% 0",
              transition: `transform ${turnMs}ms ${EASE}`,
              perspective: 2600,
              touchAction: "pan-y",
              cursor: "grab",
            }}
          >
            {Array.from({ length: N }, (_, j) => {
              const active = drag?.leaf === j;
              const p = active ? drag.p : j < k ? 1 : 0;
              const z = active ? 100 : p > 0.5 ? j + 1 : N - j;
              const near = j >= k - 2 && j <= k + 1;
              return (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: PW,
                    top: 0,
                    width: PW,
                    height: PH,
                    transformStyle: "preserve-3d",
                    transformOrigin: "0 50%",
                    transform: `rotateY(${-180 * p}deg)`,
                    transition: active ? "none" : `transform ${turnMs}ms ${EASE}`,
                    zIndex: z,
                    visibility: near || active ? "visible" : "hidden",
                  }}
                >
                  <Face shade={p} spine="left" inert={p > 0.5}>
                    {pages[2 * j]}
                  </Face>
                  <Face shade={1 - p} spine="right" back inert={p < 0.5}>
                    {pages[2 * j + 1]}
                  </Face>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** One side of a leaf: the page, a soft shadow by the spine and the shading of the turn. */
function Face({ children, shade, spine, back = false, inert }: { children: ReactNode; shade: number; spine: "left" | "right"; back?: boolean; inert: boolean }) {
  return (
    <div
      aria-hidden={inert}
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        pointerEvents: inert ? "none" : "auto",
        borderRadius: spine === "left" ? `0 ${RADIUS}px ${RADIUS}px 0` : `${RADIUS}px 0 0 ${RADIUS}px`,
        overflow: "hidden",
        boxShadow: "0 18px 40px rgba(0,0,0,0.16)",
      }}
    >
      {children}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(to ${spine === "left" ? "right" : "left"}, rgba(0,0,0,0.16), rgba(0,0,0,0) 9%)` }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `linear-gradient(to ${spine === "left" ? "left" : "right"}, rgba(0,0,0,0.28), rgba(0,0,0,0.04))`, opacity: Math.min(1, shade * 1.2) }} />
    </div>
  );
}
