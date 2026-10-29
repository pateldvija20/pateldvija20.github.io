import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { COLOR, OVERLINE, TYPE } from "./tokens";

/**
 * Binding a policy, in five stages. Scrolling moves from one stage to the next
 * while the explorer stays pinned; each stage then plays on its own, in a loop:
 * one continuous scene, with a band under it where the captions come in at the
 * moment they describe (the context, then the pain point as it happens, then
 * the evidence), and a number that counts up in the corner. `mode="outcome"`
 * plays the same stage with Bind Desk, captioned with what Bind Desk does.
 *
 * Every scene is a pure function of its time `t`. On a wide screen it is drawn
 * on an 800 x 450 stage; on a phone (`p`, portrait) on a 400 x 680 one with its
 * own layout, so the text stays readable. Either way the frame is scaled to the
 * column. With reduced motion each stage holds on one frame.
 */

const INK = COLOR.textPrimary;
const MUTED = COLOR.textSecondary;
const DIVIDER = COLOR.borderSubtle;
const RAISED = COLOR.surfaceRaised;
const WELL = COLOR.surfaceSunken;
const PAGE = COLOR.surfacePage;
const YES = COLOR.statusPositive;
const NO = COLOR.statusNegative;
const MONO = "'DM Mono', monospace";

type Mode = "journey" | "outcome";

/* ------------------------------ time helpers ------------------------------ */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
/** Fast off the mark, settling slowly: for things that enter or leave, so they answer at once. */
const easeOut = (q: number) => 1 - Math.pow(1 - q, 5);
/** Gentler than `easeOut`, for a number counting up over many seconds: quick at first, slowing as it nears its value. */
const countUp = (q: number) => 1 - Math.pow(1 - q, 3);
/** 0 before a, 1 after b, eased between: for moves within the scene. */
const seg = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)));
/** As `seg`, eased out: for entrances, exits and things landing. */
const segOut = (t: number, a: number, b: number) => easeOut(clamp01((t - a) / (b - a)));
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
/** Visible between a and b, fading over `f` seconds at each end. */
const win = (t: number, a: number, b: number, f = 0.35) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));
/** A point that moves through keyframes [time, x, y], eased between each. */
function track(t: number, keys: [number, number, number][]): [number, number] {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1] = keys[i];
    const [t0, x0, y0] = keys[i - 1];
    if (t <= t1) {
      const q = seg(t, t0, t1);
      return [lerp(x0, x1, q), lerp(y0, y1, q)];
    }
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
}
/** Which of several states holds at time t: the last whose start has passed. */
const phaseOf = <T,>(t: number, states: [number, T][]): T => states.reduce((cur, [at, v]) => (t >= at ? v : cur), states[0][1]);

/** The same curves for CSS transitions: ease-out for things answering a press or arriving, in-out for moves across the screen. */
const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT_CSS = "cubic-bezier(0.77, 0, 0.175, 1)";
/** A control gives a little under a press. Pair with the `active:scale-[0.97]` class. */
const PRESS = `scale 160ms ${EASE_OUT_CSS}`;
/** Colour changes on hover and selection. */
const TINT = "background-color 200ms ease, color 200ms ease, border-color 200ms ease";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True on a phone-width screen. */
function usePortrait() {
  const query = "(max-width: 767px)";
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setP(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return p;
}

/* ------------------------------ the explorer ------------------------------ */

/** Scene size, wide or portrait on a phone; the caption band sits under the scene, inside the same frame. */
const SIZE = { wide: [800, 450], tall: [400, 680] } as const;
const BAND = { wide: 104, tall: 104 } as const;
/** Where the hand rests between moves. */
const rest = (p: boolean): [number, number] => (p ? [200, 664] : [470, 425]);

type Draw = (t: number, p: boolean) => ReactNode;
/**
 * A stretch of a scene, from one moment to another, played over `secs` seconds,
 * with its caption; `**` marks what gets highlighted. The scene holds on its
 * first frame for `LEAD` seconds first, so the caption is read before the
 * action it describes starts.
 */
type Clip = { draw: Draw; from: number; to: number; secs: number; lines: string[] };
/** A number that counts up in the band's corner across a run of clips: the evidence, as part of the picture. */
type Stat = { clips: [number, number]; value: (q: number) => string; label: string };
type Track = { clips: Clip[]; stat?: Stat };
/** Seconds each clip holds still while its caption comes in. */
const LEAD = 0.8;

/** The speed the explorer starts at; timelines are written in seconds at this speed. */
const BASE_RATE = 2;
/** How much faster than written everything plays, captions included, so a stage keeps moving. */
const TEMPO = 1.4;
/** Playback speeds the reader can pick. */
const RATES = [0.5, 1, 1.5, 2];
/** Seconds a caption takes to fade. */
const FADE = 0.4;
/** Seconds one scene takes to fade in over the last frame of the one before. */
const CROSSFADE = 0.8;
/** Seconds a stage holds its last frame before moving on to the next. */
const END_HOLD = 1.0;
/** A scene at one moment, as it was drawn, so the next scene can fade in over it. */
type Frame = { draw: Draw; x: number; offset: string };
/** The highlighter: each marked phrase is swept in turn, this many seconds apart, each sweep this long. */
const HL_STEP = 0.35;
const HL_SWEEP = 0.5;
/** The highlighter's ink: the page's own dark background, a darker band of the stage. */
const HIGHLIGHT = PAGE;

/**
 * How far to move each stage's scene, [x, y] wide and tall, so what it draws sits
 * centred in the frame. Each scene is laid out at fixed positions; these are the
 * frame's centre less the centre of the area its parts cover.
 */
const CENTER: [[number, number], [number, number]][] = [
  [[-4, 23], [0, 2]], // Collect: policies and piles span y 32 to 376 (wide), 14 to 688 (tall)
  [[7, 14], [0, 4]], // Check: the checklist and the mail span y 36 to 386, and 12 to 575
  [[0, 6], [0, -94]], // Wait: centred around its timeline wide; on a phone the row to the opened reply spans y 110 to 530
  [[0, 46], [0, 6]], // Review: the two documents, y 36 to 322, and 10 to 544
  [[0, 39], [0, 4]], // Bind: the summary card, y 36 to 336, and 12 to 352
];
/**
 * On a phone each stage's frame is only as tall as its scene, with a 16px margin
 * above and below, so a short scene does not sit in a tall empty box. The wide
 * stage keeps one size for all of them.
 */
const TALL_H = { journey: [706, 589, 452, 566, 372], outcome: [706, 595, 404, 566, 372] };
/** Where the outcome's scene covers a different area from the journey's: its sorted Collect piles reach lower, and its Wait ends at the buttons. */
const OUTCOME_CENTER: Partial<Record<number, [[number, number], [number, number]]>> = { 0: [[-4, 7], [0, 2]], 2: [[0, 32], [0, -94]] };

/**
 * Seconds since `key` last changed, at `rate` over the base speed, stopping at
 * `dur`; holds while `run` is false. It starts again from 0 whenever `key`
 * changes, in the same render, so a new stage never shows a frame of the old
 * one's clock.
 */
function usePlay(key: string, dur: number, run: boolean, rate: number) {
  const [clock, setClock] = useState({ key, t: 0 });
  const t = clock.key === key ? clock.t : 0;
  useEffect(() => {
    if (!run || reduceMotion()) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      setClock((v) => {
        const from = v.key === key ? v.t : 0;
        return from >= dur ? v : { key, t: Math.min(dur, from + (dt * rate * TEMPO) / BASE_RATE) };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, dur, run, rate]);
  return t;
}

export function PhaseExplorer({ mode, title, eyebrow }: { mode: Mode; title?: string; eyebrow?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const portrait = usePortrait();
  // Pin the block centred in the scroller's view: half of what is left over above it.
  const sticky = useRef<HTMLDivElement>(null);
  const [pin, setPin] = useState(80);
  // The tallest the frame may be: the view, less the title, pills and speed row above and below it, less a margin.
  const [room, setRoom] = useState(Infinity);
  useLayoutEffect(() => {
    const el = sticky.current;
    const box = wrap.current;
    if (!el || !box) return;
    const scroller = box.closest("[data-cs-scroller]") as HTMLElement | null;
    const measure = () => {
      const vh = scroller ? scroller.clientHeight : window.innerHeight;
      const frame = el.querySelector<HTMLElement>('[role="img"]');
      const chrome = el.offsetHeight - (frame?.offsetHeight ?? 0);
      setRoom(Math.max(240, vh - chrome - 32));
      setPin(Math.max(16, Math.round((vh - el.offsetHeight) / 2)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (scroller) ro.observe(scroller);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const n = STAGES.length;
  const [stage, setStage] = useState(0);
  const [seen, setSeen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [rate, setRate] = useState(BASE_RATE);
  // The flow line fills from the left edge to the middle of the current stage's pill.
  const row = useRef<HTMLDivElement>(null);
  const pills = useRef<(HTMLButtonElement | null)[]>([]);
  const [reach, setReach] = useState(0);

  // Scrolling only picks the stage; each stage then plays on its own.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const scroller = el.closest("[data-cs-scroller]") as HTMLElement | null;
    const source: HTMLElement | Window = scroller ?? window;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const vh = scroller ? scroller.clientHeight : window.innerHeight;
      const span = r.height - vh * 0.85;
      const into = top + pin - r.top;
      const q = clamp01(into / Math.max(1, span));
      setStage(Math.min(n - 1, Math.floor(q * n)));
      setSeen(r.bottom > top && r.top < top + vh);
      // Pinned in place, so moving on to the next stage will not pull the page out from under the reader.
      setPinned(into > -4 && into < span + 4);
    };
    onScroll();
    source.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      source.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [n, pin]);

  /** Scrolls to the middle of a stage's stretch. */
  const go = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const scroller = el.closest("[data-cs-scroller]") as HTMLElement | null;
    const r = el.getBoundingClientRect();
    const top = scroller ? scroller.getBoundingClientRect().top : 0;
    const vh = scroller ? scroller.clientHeight : window.innerHeight;
    const span = r.height - vh * 0.85;
    const y = r.top - top - pin + ((i + 0.5) / n) * span;
    const behavior = reduceMotion() ? "auto" : "smooth";
    if (scroller) scroller.scrollBy({ top: y, behavior });
    else window.scrollBy({ top: y, behavior });
  };

  // This stage's timeline: its clips back to back, played once, with captions laid over it.
  const track = STAGES[stage][mode];
  // Each clip runs LEAD + secs: its caption comes in while the scene holds, then the scene plays.
  const lens = track.clips.map((c) => LEAD + c.secs);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  const total = lens.reduce((a, b) => a + b, 0);
  const key = `${mode}-${stage}`;
  // The clock runs a beat past the end, so the last frame is seen before the next stage.
  const t = usePlay(key, total + END_HOLD, seen, rate);
  // With reduced motion, hold at the end of the second clip.
  const held = Math.min(1, lens.length - 1);
  const now = reduceMotion() ? starts[held] + lens[held] - 0.01 : Math.min(t, total - 0.001);
  let ci = 0;
  while (ci < track.clips.length - 1 && now >= starts[ci] + lens[ci]) ci++;
  const clip = track.clips[ci];
  const lt = now - starts[ci];
  const play = clamp01((lt - LEAD) / clip.secs);
  // Where the picture cuts (between clips that do not run on, and where the loop
  // starts over), the last frame stays up while the next scene fades in over it,
  // so the stage never goes empty; only the caption changes.
  const offset = `${((mode === "outcome" && OUTCOME_CENTER[stage]) || CENTER[stage])[portrait ? 1 : 0].join("px, ")}px`;
  // Where the picture cuts, the frame that was showing stays up while the next
  // scene fades in over it, so the stage never goes empty; only the caption
  // changes. Within a stage that is the previous clip's last frame; on a new
  // stage it is whatever the old stage was showing when it was left.
  const shown = useRef<Frame | null>(null);
  const handoff = useRef<{ key: string; frame: Frame | null }>({ key, frame: null });
  if (handoff.current.key !== key) handoff.current = { key, frame: shown.current };
  const prevClip = track.clips[ci - 1];
  const under: Frame | null =
    ci === 0
      ? handoff.current.frame
      : prevClip.draw !== clip.draw || Math.abs(prevClip.to - clip.from) > 0.05
        ? { draw: prevClip.draw, x: prevClip.to, offset }
        : null;
  const fade = under ? seg(lt, 0, CROSSFADE) : 1;
  const x = lerp(clip.from, clip.to, play);
  shown.current = { draw: clip.draw, x, offset };

  // Played through: move on to the next stage, as if the reader had scrolled there.
  const done = t >= total + END_HOLD;
  useEffect(() => {
    if (done && pinned && stage < n - 1) go(stage + 1);
    // `go` reads the layout when it runs; it is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, pinned, stage, n]);
  // The stat counts up across its clips' playing time.
  const statWin = track.stat ? [starts[track.stat.clips[0]] + LEAD, starts[track.stat.clips[1]] + lens[track.stat.clips[1]]] : null;

  useLayoutEffect(() => {
    const measure = () => {
      const r = row.current?.getBoundingClientRect();
      const b = pills.current[stage]?.getBoundingClientRect();
      if (r && b && r.width > 0) setReach((b.left + b.width / 2 - r.left) / r.width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
  }, [stage, portrait]);

  const tone = mode === "journey" ? INK : YES;
  const label = [...track.clips.map((c) => c.lines.join(" ")), track.stat ? `${track.stat.value(1)} ${track.stat.label}` : ""].join(" ").replace(/\*\*/g, "");
  // The pills and the speed row change only with the stage or a click, so they skip the per-frame
  // render; the current pill's fill is set here, on its element, as the stage plays.
  const fill = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (fill.current) fill.current.style.transform = `scaleX(${now / total})`;
  });
  const goRef = useRef(go);
  goRef.current = go;
  const pick = useCallback((i: number) => goRef.current(i), []);

  return (
    <div ref={wrap} data-ui="Phase explorer" data-src="src/pieces/BindDeskPhases.tsx › PhaseExplorer" className="relative" style={{ height: `${n * 70 + 30}vh` }}>
      <div ref={sticky} className="sticky" style={{ top: pin }}>
        {/* The section's own label can ride along in the pinned block, so it stays in view with the explorer. */}
        {eyebrow ? (
          <h2 className="mb-3 uppercase" style={{ ...OVERLINE, color: MUTED }}>
            {eyebrow}
          </h2>
        ) : null}
        {title ? <h3 className={`mb-4 md:mb-8 ${TYPE.headline}`}>{title}</h3> : null}
        <Pills mode={mode} stage={stage} portrait={portrait} tone={tone} reach={reach} row={row} pills={pills} fill={fill} pick={pick} />
        <Stage
          portrait={portrait}
          height={portrait ? TALL_H[mode][stage] : undefined}
          maxHeight={room}
          label={`${STAGES[stage].name}. ${label}`}
          band={<Band portrait={portrait} lines={clip.lines} t={lt} len={lens[ci]} stat={track.stat && statWin ? { ...track.stat, q: countUp(clamp01((now - statWin[0]) / (statWin[1] - statWin[0]))), on: now >= statWin[0] - 0.3 } : undefined} />}
        >
          {under && fade < 1 ? (
            <div style={{ position: "absolute", inset: 0, opacity: 1 - fade, transform: `translate(${under.offset})`, filter: `blur(${(fade * 2).toFixed(2)}px)` }}>
              {under.draw(under.x, portrait)}
            </div>
          ) : null}
          <div style={{ position: "absolute", inset: 0, opacity: fade, transform: `translate(${offset})` }}>
            {clip.draw(x, portrait)}
          </div>
        </Stage>
        <div className="mt-3 flex justify-end md:mt-4">
          <Speed rate={rate} setRate={setRate} />
        </div>
      </div>
    </div>
  );
}

/** The five stages spread edge to edge, joined by a flow line that fills to the current one. */
const Pills = memo(function Pills({ mode, stage, portrait, tone, reach, row, pills, fill, pick }: { mode: Mode; stage: number; portrait: boolean; tone: string; reach: number; row: RefObject<HTMLDivElement | null>; pills: RefObject<(HTMLButtonElement | null)[]>; fill: RefObject<HTMLDivElement | null>; pick: (i: number) => void }) {
  // One tint for the stages already played and for the current one as it fills, so done and current read as the same thing.
  const fillTone = `color-mix(in srgb, ${tone} 18%, ${PAGE})`;
  const doneEdge = `color-mix(in srgb, ${tone} 45%, ${PAGE})`;
  const hoverEdge = `color-mix(in srgb, ${INK} 60%, ${PAGE})`;
  // Hover comes from a mouse or the keyboard only, so a tap on a phone does not leave a pill lit.
  const [hover, setHover] = useState(-1);
  return (
    <div ref={row} role="tablist" aria-label={mode === "journey" ? "Stages of binding a policy today" : "Stages of binding a policy with Bind Desk"} className="relative flex items-center justify-between">
      <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 2, background: DIVIDER }} />
      <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 2, background: tone, transform: `scaleX(${reach})`, transformOrigin: "left", transition: `transform 500ms ${EASE_IN_OUT_CSS}` }} />
      {STAGES.map((s, i) => {
        const on = i === stage;
        const done = i < stage;
        const lift = hover === i && !on && !done;
        return (
          <button
            key={s.name}
            ref={(el) => {
              pills.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={`${i + 1}. ${s.name}`}
            onClick={() => pick(i)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
            onPointerLeave={() => setHover(-1)}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHover(i)}
            onBlur={() => setHover(-1)}
            className="relative flex cursor-pointer rounded-full outline-none active:scale-[0.97]"
            style={{ transition: PRESS }}
          >
            <span
              className="relative flex h-7 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-3 text-[12px] leading-none md:h-8 md:gap-2 md:px-4 md:text-[14px]"
              style={{
                background: lift ? RAISED : PAGE,
                color: done || on || hover === i ? INK : MUTED,
                border: `1px solid ${on ? INK : hover === i && !done ? hoverEdge : done ? doneEdge : DIVIDER}`,
                fontWeight: on ? 600 : 400,
                transition: TINT,
              }}
            >
              {/* Done stages hold the tint; the current one fills with it, left to right, as it plays. */}
              <span aria-hidden ref={on ? fill : undefined} className="absolute inset-0" style={{ background: fillTone, transformOrigin: "left", ...(on ? null : { transform: `scaleX(${done ? 1 : 0})` }) }} />
              <span className="relative" style={{ opacity: 0.6 }}>
                {i + 1}
              </span>
              {/* On a phone only the current stage shows its name, so all five fit. */}
              {!portrait || on ? <span className="relative">{s.name}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
});

/** Playback speed. */
const Speed = memo(function Speed({ rate, setRate }: { rate: number; setRate: (r: number) => void }) {
  return (
    <div role="group" aria-label="Playback speed" className="flex items-center gap-1">
      {RATES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={rate === r}
          onClick={() => setRate(r)}
          className={`cursor-pointer rounded-full px-2.5 py-1 active:scale-[0.97] ${TYPE.bodySm}`}
          style={{ background: rate === r ? INK : "transparent", color: rate === r ? PAGE : MUTED, border: `1px solid ${rate === r ? INK : DIVIDER}`, transition: `${TINT}, ${PRESS}` }}
        >
          {r}×
        </button>
      ))}
    </div>
  );
});

/**
 * The band under the scene: the current clip's caption on the left, and the
 * stage's live number on the right (above the caption on a phone). `t` runs
 * from the clip's start to `len`.
 */
function Band({ portrait, lines, t, len, stat }: { portrait: boolean; lines: string[]; t: number; len: number; stat?: Stat & { q: number; on: boolean } }) {
  const o = Math.min(segOut(t, 0, FADE), 1 - segOut(t, len - FADE, len));
  // Marked phrases are counted across the lines, so the highlighter runs through them in reading order.
  const before = (i: number) => lines.slice(0, i).join("").split("**").length >> 1;
  const sweep = (k: number) => seg(t, FADE + 0.1 + k * HL_STEP, FADE + 0.1 + k * HL_STEP + HL_SWEEP);
  const statBox = stat ? (
    <div style={{ opacity: stat.on ? 1 : 0, transition: "opacity 300ms", textAlign: portrait ? "left" : "right", flexShrink: 0 }}>
      <div style={{ fontSize: portrait ? 22 : 28, lineHeight: portrait ? "26px" : "32px", fontWeight: 600, color: INK, fontVariantNumeric: "tabular-nums" }}>{stat.value(stat.q)}</div>
      <div style={{ ...tiny, marginTop: 4, maxWidth: portrait ? undefined : 190, marginLeft: portrait ? 0 : "auto" }}>{stat.label}</div>
    </div>
  ) : null;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: portrait ? "column" : "row", alignItems: portrait ? "stretch" : "center", justifyContent: portrait ? "center" : "space-between", gap: portrait ? 6 : 24, padding: portrait ? "10px 18px" : "0 28px", borderTop: `1px solid ${DIVIDER}` }}>
      {portrait ? statBox : null}
      <div style={{ opacity: o, transform: `translateY(${(1 - o) * 8}px)`, minWidth: 0 }}>
        {lines.map((line, i) => (
          <div key={line} style={{ fontSize: portrait ? 16 : 19, lineHeight: portrait ? "23px" : "28px", fontWeight: 500, letterSpacing: "-0.1px", color: MUTED }}>
            <Typed text={line} n={line.length} caret={false} lit={(j) => sweep(before(i) + j)} />
          </div>
        ))}
      </div>
      {portrait ? null : statBox}
    </div>
  );
}

/**
 * A `**`-marked line with only its first `n` characters showing, emphasis kept.
 * The rest is laid out but transparent, so the line never reflows as it types.
 */
function Typed({ text, n, caret, lit }: { text: string; n: number; caret: boolean; lit: (j: number) => number }) {
  let left = n;
  let placed = false;
  const out: ReactNode[] = [];
  text.split("**").forEach((part, i) => {
    const seen = part.slice(0, Math.max(0, left));
    const rest = part.slice(seen.length);
    // The caret sits once, right after the last character typed.
    const atCaret = caret && !placed && left >= 0 && left <= part.length;
    if (atCaret) placed = true;
    left -= part.length;
    // Lines type in grey. Marked phrases are bold, and once typed a solid block sweeps in behind
    // each from the left while the phrase turns from grey to white.
    const style: CSSProperties =
      i % 2
        ? {
            color: `color-mix(in srgb, ${INK} ${Math.round(lit(i >> 1) * 100)}%, ${MUTED})`,
            // Plain weight while typing; bold arrives with the highlight, as it sweeps across.
            fontWeight: Math.round(500 + 100 * lit(i >> 1)),
            backgroundImage: `linear-gradient(${HIGHLIGHT}, ${HIGHLIGHT})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "0 0",
            backgroundSize: `${lit(i >> 1) * 100}% 100%`,
            // A solid block with rounded corners, a little wider than the words.
            borderRadius: 6,
            // Padding widens the block past the words; the matching negative margin keeps the words where plain text would put them.
            padding: "0.02em 0.16em",
            margin: "0 -0.16em",
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }
        : {};
    out.push(
      <span key={i} style={style}>
        {seen}
        {atCaret ? <span style={{ display: "inline-block", width: 0, height: "0.95em", verticalAlign: "-0.12em", boxShadow: `0 0 0 1px ${MUTED}` }} /> : null}
        <span style={{ color: "transparent" }}>{rest}</span>
      </span>,
    );
  });
  return <>{out}</>;
}

/** The scene, drawn at its own size, with the caption band under it; the whole frame scales to the column. */
function Stage({ portrait, height, maxHeight = Infinity, label, band, children }: { portrait: boolean; height?: number; maxHeight?: number; label: string; band: ReactNode; children: ReactNode }) {
  const w = portrait ? SIZE.tall[0] : SIZE.wide[0];
  const h = height ?? (portrait ? SIZE.tall[1] : SIZE.wide[1]);
  const bh = portrait ? BAND.tall : BAND.wide;
  // Scale to the column's width, or less if that would make the frame taller than the room it has.
  const slot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(w);
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(width / w, maxHeight / (h + bh));
  return (
    <div ref={slot} className="mt-4 w-full md:mt-6">
      <div role="img" aria-label={label} className="relative mx-auto overflow-hidden rounded-[12px]" style={{ width: w * scale, height: (h + bh) * scale, background: WELL, border: `1px solid ${DIVIDER}` }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: w, height: h + bh, transform: `scale(${scale})` }}>
          <div className="absolute left-0 top-0 overflow-hidden" style={{ width: w, height: h }}>
            {children}
          </div>
          <div className="absolute left-0" style={{ top: h, width: w, height: bh }}>
            {band}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ drawing parts ------------------------------ */

const tiny: CSSProperties = { fontFamily: MONO, fontSize: 11, lineHeight: "14px", letterSpacing: "0.4px", textTransform: "uppercase", color: MUTED };
const body: CSSProperties = { fontSize: 14, lineHeight: "19px" };
const boxed: CSSProperties = { background: RAISED, border: `1px solid ${DIVIDER}`, borderRadius: 10, color: INK };

function Abs({ x, y, w, h, r = 0, s = 1, o = 1, z, style, children }: { x: number; y: number; w?: number; h?: number; r?: number; s?: number; o?: number; z?: number; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, opacity: o, zIndex: z, ...style }}>
      {children}
    </div>
  );
}

/** `**x**` as emphasis. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <strong key={i} style={{ color: INK, fontWeight: 600 }}>
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

type Hand = "arrow" | "open" | "grab" | "point";
const HAND: Record<Exclude<Hand, "arrow">, string> = {
  open: "M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  grab: "M18 11.5V9a2 2 0 0 0-4 0v1.4M14 10V8a2 2 0 0 0-4 0v2M10 9.9V9a2 2 0 0 0-4 0v5M6 14a2 2 0 0 0-4 0M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0",
  point: "M22 14a8 8 0 0 1-8 8M18 11v-1a2 2 0 0 0-4 0M14 10V9a2 2 0 0 0-4 0v1M10 9.5V4a2 2 0 0 0-4 0v10M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
};

/** The person's hand: an arrow, an open hand, a grab or a pointing finger, with a ring when it clicks. */
function Cursor({ x, y, kind = "arrow", click = 0, o = 1 }: { x: number; y: number; kind?: Hand; click?: number; o?: number }) {
  return (
    <Abs x={x} y={y} o={o} z={30} style={{ pointerEvents: "none" }}>
      {click > 0 && click < 1 ? (
        <div style={{ position: "absolute", left: -14, top: -14, width: 28, height: 28, borderRadius: 14, border: `2px solid ${INK}`, opacity: 1 - click, transform: `scale(${0.6 + click})` }} />
      ) : null}
      {kind === "arrow" ? (
        <svg width="20" height="24" viewBox="0 0 26 30" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}>
          <path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#18191a" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-9px, -4px)", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}>
          <path d={HAND[kind]} stroke="#fff" strokeWidth="4.2" />
          <path d={HAND[kind]} stroke="#18191a" strokeWidth="1.7" />
        </svg>
      )}
    </Abs>
  );
}
/** 0 to 1 over the 0.45 s after a click at `at`. */
const ping = (t: number, a: number) => (t >= a && t < a + 0.45 ? (t - a) / 0.45 : 0);

function Pill({ children, color, fill = false }: { children: ReactNode; color: string; fill?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, border: `1px solid ${color}`, background: fill ? color : "transparent", color: fill ? PAGE : color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

/** Grey lines standing in for a document's text. */
function Lines({ n, lit = -1, scanned = -1 }: { n: number; lit?: number; scanned?: number }) {
  return (
    <div style={{ display: "grid", gap: 9 }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            height: 7,
            width: `${i % 3 === 2 ? 62 : i % 2 ? 86 : 94}%`,
            borderRadius: 4,
            background: i === lit ? INK : i <= scanned ? `color-mix(in srgb, ${INK} 35%, transparent)` : `color-mix(in srgb, ${MUTED} 30%, transparent)`,
          }}
        />
      ))}
    </div>
  );
}

/** An email, typed by hand or already drafted. */
function Mail({ x, y, w = 330, to, subject, text, typed = 1, drafted, sent, action }: { x: number; y: number; w?: number; to: string; subject: string; text: string; typed?: number; drafted?: boolean; sent?: boolean; action: string }) {
  const shown = text.slice(0, Math.round(text.length * clamp01(typed)));
  return (
    <Abs x={x} y={y} w={w} z={10} style={{ ...boxed, padding: 14, boxShadow: "0 16px 36px -18px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={tiny}>To: {to}</span>
        {drafted ? <Pill color={YES}>Drafted</Pill> : null}
      </div>
      <div style={{ ...body, fontWeight: 600, marginTop: 8 }}>{subject}</div>
      <div style={{ ...body, color: MUTED, marginTop: 8, minHeight: 80 }}>
        {shown}
        {typed < 1 ? <span style={{ borderRight: `1.5px solid ${INK}`, marginLeft: 1 }} /> : null}
      </div>
      <div style={{ marginTop: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 14px", borderRadius: 99, fontSize: 13, background: sent ? "transparent" : INK, color: sent ? YES : PAGE, border: `1px solid ${sent ? YES : INK}` }}>
          {sent ? "✓ Sent" : action}
        </span>
      </div>
    </Abs>
  );
}
/** Where a mail's send button sits, from the mail's top left. */
const SEND: [number, number] = [60, 176];

/* ------------------------------ phase 1: collect ------------------------------ */

const CH = ["Portal", "Email", "Fax"];
const POLICIES = ["Harbor Line Logistics", "Alder & Finch Bakery", "Pinecrest Dental Group"];
/** Eight documents: where they arrive, what they are, whose policy, how sure the match is. */
const DOCS = [
  { file: "COI_2026.pdf", type: "Certificate of insurance", ch: 0, pol: 0, score: 97 },
  { file: "app_HL_signed.pdf", type: "Signed application", ch: 0, pol: 0, score: 95 },
  { file: "loss_runs_5yr.pdf", type: "Loss runs", ch: 0, pol: 2, score: 93 },
  { file: "SOV_rev2.xlsx", type: "Statement of values", ch: 1, pol: 1, score: 95 },
  { file: "COI_AF.pdf", type: "Certificate of insurance", ch: 1, pol: 1, score: 96 },
  { file: "drivers_Q2.pdf", type: "Driver schedule", ch: 1, pol: 0, score: 91 },
  { file: "scan_0142.pdf", type: "Signed application", ch: 2, pol: 2, score: 40 },
  { file: "scan_0143.pdf", type: "Application", ch: 2, pol: 1, score: 88 },
];

/** Collect's layout: channels in a column on the left (wide) or a row across the top (portrait). */
const C = (p: boolean) =>
  p
    ? { card: [118, 48], chX: [8, 138, 268], chY: [34, 34, 34], pile: [6, 54], policyY: [432, 520, 608], policyX: 12, policyW: 376, policyH: 80, line: 14, page: { x: 85, y: 148, w: 230, h: 204 } }
    : { card: [150, 48], chX: [28, 28, 28], chY: [54, 184, 314], pile: [110, 32], policyY: [56, 166, 276], policyX: 572, policyW: 208, policyH: 100, line: 19, page: { x: 300, y: 64, w: 230, h: 292 } };

/** Each document's spot in its channel's pile, messy on purpose. */
const PILE: [number, number, number][] = [
  [4, 18, -5],
  [12, 0, 4],
  [6, 32, -2],
];
function pileAt(p: boolean, i: number): [number, number, number] {
  const L = C(p);
  const d = DOCS[i];
  const k = DOCS.filter((e, j) => e.ch === d.ch && j < i).length;
  const [dx, dy, r] = PILE[k % 3];
  const x = p ? L.chX[d.ch] + dx : L.pile[0] + dx * 2;
  const y = (p ? L.pile[1] : L.chY[d.ch] - 22) + dy;
  return [x, y, r];
}
/** Where a policy's nth filed document lands. */
const slotAt = (p: boolean, pol: number, k: number): [number, number] => {
  const L = C(p);
  return [L.policyX + 16, L.policyY[pol] + 26 + k * L.line];
};

function Channels({ p, uploadFax = false }: { p: boolean; uploadFax?: boolean }) {
  const L = C(p);
  return (
    <>
      {CH.map((c, i) => (
        <Abs key={c} x={L.chX[i] + (p ? 4 : 0)} y={L.chY[i] - (p ? 20 : 0)} w={150}>
          <div style={{ ...tiny, fontSize: 12, color: INK }}>{uploadFax && i === 2 ? "Fax · upload" : c}</div>
        </Abs>
      ))}
    </>
  );
}

type Filed = { pol: number; type: string; score?: number; unsure?: boolean; confirmed?: boolean };

function Policies({ p, filed }: { p: boolean; filed: Filed[] }) {
  const L = C(p);
  return (
    <>
      <Abs x={L.policyX} y={L.policyY[0] - 22}>
        <div style={tiny}>Policies</div>
      </Abs>
      {POLICIES.map((name, i) => {
        const mine = filed.filter((f) => f.pol === i);
        return (
          <Abs key={name} x={L.policyX} y={L.policyY[i]} w={L.policyW} h={L.policyH} style={{ ...boxed, padding: "7px 12px" }}>
            <div style={{ ...body, fontSize: 13, fontWeight: 600 }}>{name}</div>
            {mine.map((f, k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 6, marginTop: k ? 0 : 3, fontSize: 11, lineHeight: `${L.line}px`, color: MUTED }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.type}</span>
                {f.score !== undefined ? (
                  <span style={{ color: f.unsure && !f.confirmed ? NO : YES, whiteSpace: "nowrap" }}>{f.unsure ? (f.confirmed ? "✓ confirmed" : `${f.score}% · confirm?`) : `${f.score}%`}</span>
                ) : (
                  <span style={{ color: INK }}>by hand</span>
                )}
              </div>
            ))}
          </Abs>
        );
      })}
    </>
  );
}

function DocCard({ x, y, r = 0, w, h, s = 1, o = 1, title, sub, lift = false, tone, children }: { x: number; y: number; r?: number; w: number; h: number; s?: number; o?: number; title: string; sub: string; lift?: boolean; tone?: string; children?: ReactNode }) {
  return (
    <Abs x={x} y={y} r={r} s={s} o={o} w={w} h={h} z={lift ? 15 : undefined} style={{ ...boxed, padding: "8px 10px", borderColor: tone ?? DIVIDER, boxShadow: lift ? "0 18px 30px -14px rgba(0,0,0,0.55)" : "0 4px 12px -8px rgba(0,0,0,0.4)", overflow: "hidden" }}>
      <div style={{ fontSize: 12, lineHeight: "16px", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      <div style={{ ...tiny, fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
      {children}
    </Abs>
  );
}

/** Today: a hand takes one document at a time, opens it in the middle, reads it, and files it. */
const HANDLED = [0, 3];
const CYCLE = 7.2;
const START = 0.8;

function collectJourney(t: number, p: boolean) {
  const L = C(p);
  const [cw, ch] = L.card;
  const PG = L.page;
  const home = rest(p);
  const parts: ReactNode[] = [];
  const filed: Filed[] = [];
  let cursor: { x: number; y: number; kind: Hand; click: number } = { x: home[0], y: home[1], kind: "arrow", click: 0 };
  const reset = seg(t, 15.6, 16.2);

  DOCS.forEach((d, i) => {
    const [px, py, pr] = pileAt(p, i);
    const slot = HANDLED.indexOf(i);
    if (slot < 0) {
      parts.push(<DocCard key={d.file} x={px} y={py} r={pr} w={cw} h={ch} title={d.file} sub="Unopened" />);
      return;
    }
    const lt = t - (START + slot * CYCLE);
    const k = filed.filter((f) => f.pol === d.pol).length;
    const [sx, sy] = slotAt(p, d.pol, k);
    const center: [number, number] = [PG.x + PG.w / 2 - cw / 2, PG.y + PG.h / 2 - ch / 2];
    const [cx, cy] = track(lt, [
      [1.0, px, py],
      [2.0, center[0], center[1]],
      [5.2, center[0], center[1]],
      [6.3, sx - 6, sy - 10],
    ]);
    const open = seg(lt, 2.0, 2.6) * (1 - seg(lt, 4.7, 5.2));
    if (lt >= 6.3 && reset < 1) {
      filed.push({ pol: d.pol, type: d.type });
      parts.push(<DocCard key={d.file} x={px} y={py} r={pr} w={cw} h={ch} o={reset} title={d.file} sub="Unopened" />);
    } else {
      const w = lerp(cw, PG.w, open);
      const h = lerp(ch, PG.h, open);
      const known = lt >= 4.4;
      const scanned = lt < 2.8 ? -1 : Math.floor(clamp01((lt - 2.8) / 1.7) * 10);
      parts.push(
        <DocCard
          key={d.file}
          x={cx - (w - cw) / 2}
          y={cy - (h - ch) / 2}
          r={lerp(pr, 0, seg(lt, 1.0, 2.0))}
          w={w}
          h={h}
          lift={lt >= 0.9 && lt < 6.3}
          title={known ? d.type : d.file}
          sub={known ? POLICIES[d.pol] : lt >= 2.0 ? "Opened by hand" : "Unopened"}
        >
          {open > 0.6 ? (
            <div style={{ marginTop: 14, opacity: seg(open, 0.6, 1) }}>
              <Lines n={p ? 8 : 11} lit={lt < 4.6 ? scanned : -1} scanned={scanned} />
            </div>
          ) : null}
        </DocCard>,
      );
    }
    // The hand, during this document's turn.
    if (lt >= 0 && lt < CYCLE) {
      const [hx, hy] = track(lt, [
        [0, home[0], home[1]],
        [0.9, px + cw / 2, py + 22],
        [2.0, center[0] + cw / 2, center[1] + 22],
        [2.7, PG.x + 40, PG.y + 60],
        [4.5, PG.x + 60, PG.y + PG.h - 40],
        [5.2, center[0] + cw / 2, center[1] + 22],
        [6.3, sx + 64, sy + 12],
        [7.0, home[0], home[1]],
      ]);
      const kind = phaseOf<Hand>(lt, [
        [0, "arrow"],
        [0.9, "grab"],
        [2.0, "open"],
        [2.6, "point"],
        [4.6, "open"],
        [5.1, "grab"],
        [6.3, "arrow"],
      ]);
      cursor = { x: hx, y: hy, kind, click: ping(lt, 0.9) || ping(lt, 6.3) };
    }
  });

  return (
    <>
      <Channels p={p} />
      <Policies p={p} filed={filed} />
      {parts}
      <Cursor {...cursor} />
    </>
  );
}

/** With Bind Desk: everything is read where it lands and filed in one go. */
function collectOutcome(t: number, p: boolean) {
  const L = C(p);
  const [cw, ch] = L.card;
  const home = rest(p);
  const reset = seg(t, 9.0, 9.8);
  // The reading beam sweeps across the channels: left to right, or top to bottom on a phone.
  const sweep = seg(t, 0.9, 2.3);
  const named = (i: number) => {
    const [x, y] = pileAt(p, i);
    return p ? sweep * 400 > x + 40 : 100 + 200 * sweep > x + 20 || (sweep >= 1 && y >= 0);
  };
  const confirmAt = 5.4;
  const filed: Filed[] = [];
  const cards = DOCS.map((d, i) => {
    const [px, py, pr] = pileAt(p, i);
    const k = DOCS.filter((e, j) => e.pol === d.pol && j < i).length;
    const [sx, sy] = slotAt(p, d.pol, k);
    const fly = seg(t, 2.8 + i * 0.07, 3.8 + i * 0.07);
    if (fly >= 1 && reset < 1) {
      filed.push({ pol: d.pol, type: d.type, score: d.score, unsure: d.score < 50, confirmed: t >= confirmAt });
      return <DocCard key={d.file} x={px} y={py} r={pr} w={cw} h={ch} o={reset} title={d.file} sub="Unopened" />;
    }
    return (
      <DocCard
        key={d.file}
        x={lerp(px, sx - 6, fly)}
        y={lerp(py, sy - 10, fly)}
        r={lerp(pr, 0, fly)}
        w={cw}
        h={ch}
        s={lerp(1, 0.7, fly)}
        o={1 - fly * 0.3}
        lift={fly > 0}
        tone={named(i) ? YES : undefined}
        title={named(i) ? d.type : d.file}
        sub={named(i) ? `${d.score}% · ${POLICIES[d.pol].split(" ")[0]}` : "Unopened"}
      />
    );
  });
  // The unsure match's "confirm?" sits at the right of Pinecrest's second row.
  const confirm: [number, number] = [L.policyX + L.policyW - 40, L.policyY[2] + 26 + L.line + 6];
  const hand = track(t, [
    [4.2, home[0], home[1]],
    [5.2, confirm[0], confirm[1]],
    [7.0, confirm[0], confirm[1]],
    [7.8, home[0], home[1]],
  ]);
  return (
    <>
      <Channels p={p} uploadFax />
      <Policies p={p} filed={filed} />
      {/* The extension reading the inbox, portal and uploads. */}
      {p ? (
        <Abs x={lerp(0, 400, sweep)} y={20} w={3} h={110} o={win(t, 0.8, 2.6, 0.2)} style={{ background: YES, boxShadow: `0 0 18px ${YES}` }} />
      ) : (
        <Abs x={100 + 200 * sweep} y={30} w={3} h={380} o={win(t, 0.8, 2.6, 0.2)} style={{ background: YES, boxShadow: `0 0 18px ${YES}` }} />
      )}
      {cards}
      <Cursor x={hand[0]} y={hand[1]} kind="point" click={ping(t, confirmAt)} o={win(t, 4.0, 8.0)} />
    </>
  );
}

/* ------------------------------ phase 2: check ------------------------------ */

const ITEMS = ["Signed application", "Certificate of insurance", "Statement of values", "Loss runs (5 years)", "Years in business"];
const MISSING = 3;
const REQUEST = "Hi, could you send the loss runs for the last five years? We need them before we can bind.";
const listBox = (p: boolean) => (p ? { x: 12, y: 12, w: 376 } : { x: 36, y: 36, w: 340 });

function Checklist({ p, ticked, missing, pulse = 0 }: { p: boolean; ticked: (i: number) => boolean; missing: boolean; pulse?: number }) {
  const b = listBox(p);
  return (
    <Abs x={b.x} y={b.y} w={b.w} h={350} style={{ ...boxed, padding: 16 }}>
      <div style={tiny}>Binding checklist · Pinecrest Dental</div>
      {ITEMS.map((it, i) => {
        const miss = i === MISSING && missing;
        const done = ticked(i);
        return (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, height: 46, padding: "0 10px", borderRadius: 8, background: miss ? `color-mix(in srgb, ${NO} ${12 + pulse * 10}%, transparent)` : "transparent" }}>
            <span style={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: 10, fontSize: 12, border: `1.5px solid ${miss ? NO : done ? YES : DIVIDER}`, color: miss ? NO : YES }}>{miss ? "!" : done ? "✓" : ""}</span>
            <span style={{ ...body, color: done || miss ? INK : MUTED }}>{it}</span>
            {miss ? (
              <span style={{ marginLeft: "auto" }}>
                <Pill color={NO}>Missing</Pill>
              </span>
            ) : null}
          </div>
        );
      })}
    </Abs>
  );
}
/** The middle of checklist row i, in stage px. */
const rowY = (p: boolean, i: number) => listBox(p).y + 16 + 14 + 23 + 14 + i * 60;
/** Where the mail slides to. */
const mailAt = (p: boolean) => (p ? { x: 12, y: 372, w: 376 } : { x: 420, y: 46, w: 330 });

function checkJourney(t: number, p: boolean) {
  const home = rest(p);
  const tickAt = [1.2, 2.0, 2.8, 3.8, 5.0];
  const missing = t >= 4.6 && t < 14.4;
  const m = mailAt(p);
  const mailX = lerp(p ? 420 : 820, m.x, segOut(t, 7.6, 8.3));
  const lx = listBox(p).x + 44;
  const at = track(t, [
    [0, home[0], home[1]],
    [1.0, lx, rowY(p, 0)],
    [1.8, lx, rowY(p, 1)],
    [2.6, lx, rowY(p, 2)],
    [3.4, lx, rowY(p, 3)],
    [3.8, lx + 150, rowY(p, 3)],
    [4.3, lx + 80, rowY(p, 3)],
    [4.8, lx, rowY(p, 4)],
    [6.2, home[0], home[1]],
    [12.2, home[0], home[1]],
    [12.9, mailX + SEND[0], m.y + SEND[1]],
    [14.0, home[0], home[1]],
  ]);
  const clicks = [...tickAt.filter((_, i) => i !== MISSING), 13.0];
  return (
    <>
      <Checklist p={p} ticked={(i) => i !== MISSING && t >= tickAt[i] && t < 14.4} missing={missing} />
      <Cursor x={at[0]} y={at[1]} kind={t > 3.3 && t < 4.5 ? "open" : t > 12.6 && t < 13.4 ? "point" : "arrow"} click={clicks.map((a) => ping(t, a)).find((v) => v > 0) ?? 0} />
      {t > 7.5 ? <Mail x={mailX} y={m.y} w={m.w} to="Broker" subject="Loss runs for Pinecrest Dental" text={REQUEST} typed={seg(t, 8.6, 12.0)} sent={t >= 13.0} action="Send" /> : null}
    </>
  );
}

function checkOutcome(t: number, p: boolean) {
  const home = rest(p);
  const done = (i: number) => t >= 0.6 + i * 0.16 && t < 9.2;
  const missing = t >= 1.5 && t < 9.2;
  const pulse = missing ? (Math.sin(t * 5) + 1) / 2 : 0;
  const m = mailAt(p);
  const mailX = lerp(p ? 420 : 820, m.x, segOut(t, 3.4, 4.0));
  const send: [number, number] = [mailX + SEND[0] + 30, m.y + SEND[1]];
  const hand = track(t, [
    [4.6, home[0], home[1]],
    [5.6, send[0], send[1]],
    [7.0, send[0], send[1]],
    [7.8, home[0], home[1]],
  ]);
  return (
    <>
      <Checklist p={p} ticked={(i) => i !== MISSING && done(i)} missing={missing} pulse={pulse} />
      {t > 3.3 ? <Mail x={mailX} y={m.y} w={m.w} to="Broker" subject="Loss runs for Pinecrest Dental" text={REQUEST} drafted sent={t >= 6.0} action="Send to broker" /> : null}
      <Cursor x={hand[0]} y={hand[1]} kind="point" click={ping(t, 6.0)} o={win(t, 4.4, 8.0)} />
    </>
  );
}

/* ------------------------------ phase 3: wait ------------------------------ */

/**
 * Wait's layout: the policy row at the top, one timeline of five days across the
 * middle, and everything that happens hung off the day it happens on. Wide and
 * portrait share the shape; only the measurements differ.
 */
const WG = (p: boolean) =>
  p
    ? { rowX: 12, rowY: 110, rowW: 376, lineY: 330, x0: 40, dx: 80, card: 200, below: 380, mid: 200, under: 420 }
    : { rowX: 150, rowY: 36, rowW: 500, lineY: 206, x0: 130, dx: 135, card: 220, below: 252, mid: 400, under: 262 };
/** The x of day d (0 to 4). */
const dayX = (p: boolean, d: number) => WG(p).x0 + d * WG(p).dx;
/** A card's left edge when it hangs under day d, kept inside the stage. */
const underDay = (p: boolean, d: number) => {
  const g = WG(p);
  const w = p ? 400 : 800;
  return Math.min(w - 12 - g.card, Math.max(12, dayX(p, d) - g.card / 2));
};

function WaitRow({ p, status, tone, overdue = false }: { p: boolean; status: ReactNode; tone?: string; overdue?: boolean }) {
  const g = WG(p);
  return (
    <Abs x={g.rowX} y={g.rowY} w={g.rowW} h={72} style={{ ...boxed, padding: "12px 16px", borderColor: overdue ? NO : DIVIDER }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ ...body, fontWeight: 600, whiteSpace: "nowrap" }}>Pinecrest Dental Group</span>
        <span style={{ fontSize: 12, color: tone ?? MUTED, textAlign: "right" }}>{status}</span>
      </div>
      <div style={{ ...body, fontSize: 13, color: MUTED, marginTop: 6 }}>Loss runs requested from the broker</div>
    </Abs>
  );
}

/**
 * The five days, with a "Today" marker that slides along them as `today` goes
 * from 0 to 4, the request sent on day 1, and an optional follow-up date.
 */
function Timeline({ p, today, flag, overdue = false, tone = INK }: { p: boolean; today: number; flag?: number; overdue?: boolean; tone?: string }) {
  const g = WG(p);
  const span = dayX(p, 4) - g.x0;
  const tx = dayX(p, Math.min(4, today));
  return (
    <>
      {/* The request, sent on day 1. */}
      <Abs x={dayX(p, 0) - 12} y={g.lineY - 62}>
        <div style={{ ...tiny, color: INK, whiteSpace: "nowrap" }}>✉ Request sent</div>
      </Abs>
      <Abs x={g.x0} y={g.lineY - 1} w={span} h={2} style={{ background: DIVIDER }} />
      <Abs x={g.x0} y={g.lineY - 1} w={tx - g.x0} h={2} style={{ background: overdue ? NO : tone }} />
      {[0, 1, 2, 3, 4].map((d) => (
        <Abs key={d} x={dayX(p, d) - 20} y={g.lineY - 6} w={40}>
          {/* Passed days take the line's colour, so the whole run turns red together once it is overdue. */}
          <div style={{ width: 12, height: 12, margin: "0 auto", borderRadius: 6, background: d <= today ? (overdue ? NO : tone) : PAGE, border: `1.5px solid ${d <= today ? (overdue ? NO : tone) : DIVIDER}` }} />
          <div style={{ ...tiny, marginTop: 8, textAlign: "center", whiteSpace: "nowrap" }}>Day {d + 1}</div>
        </Abs>
      ))}
      {/* Where "now" is. */}
      <Abs x={tx - 26} y={g.lineY - 34} w={52}>
        <div style={{ ...tiny, fontSize: 10, textAlign: "center", color: PAGE, background: overdue ? NO : tone, borderRadius: 99, padding: "2px 0" }}>Today</div>
      </Abs>
      {flag !== undefined ? (
        <Abs x={dayX(p, flag) - 90} y={g.lineY + 34} w={180}>
          <div style={{ ...tiny, textAlign: "center", whiteSpace: "nowrap", color: overdue ? NO : YES }}>▲ Follow-up date</div>
        </Abs>
      ) : null}
    </>
  );
}

function waitJourney(t: number, p: boolean) {
  const home = rest(p);
  const g = WG(p);
  // First a reply comes on day 2; then, in the second half, none does.
  if (t < 7.6) {
    const today = t < 0.6 ? 0 : seg(t, 0.6, 1.4);
    const cx = underDay(p, 1);
    const drop = seg(t, 1.5, 2.3);
    const open = seg(t, 3.3, 3.8);
    const scanned = t < 3.9 ? -1 : Math.floor(clamp01((t - 3.9) / 1.4) * 6);
    const hand = track(t, [
      [0, home[0], home[1]],
      [3.2, cx + g.card / 2, g.below + 22],
      [3.9, cx + 40, g.below + 56],
      [5.3, cx + 60, g.below + 130],
      [6.6, home[0], home[1]],
    ]);
    return (
      <>
        <WaitRow p={p} status={t >= 5.6 ? "Checked by hand" : "Waiting"} tone={t >= 5.6 ? INK : MUTED} />
        <Timeline p={p} today={today} />
        <DocCard x={cx} y={lerp(g.lineY - 40, g.below, drop)} w={g.card} h={lerp(48, 150, open)} lift title="loss_runs_5yr.pdf" sub={t >= 5.4 ? "✓ The right document" : open > 0 ? "Opened by hand" : "Broker reply · Day 2"} o={win(t, 1.5, 7.4) * drop}>
          {open > 0.6 ? (
            <div style={{ marginTop: 12 }}>
              <Lines n={6} lit={t < 5.3 ? scanned : -1} scanned={scanned} />
            </div>
          ) : null}
        </DocCard>
        <Cursor x={hand[0]} y={hand[1]} kind={t > 3.6 && t < 5.4 ? "point" : "arrow"} click={ping(t, 3.3)} />
      </>
    );
  }
  // No reply: the days pass, nothing counts them, and a follow-up is written by hand.
  const lt = t - 7.6;
  const today = Math.min(4, lt < 0.6 ? 0 : (lt - 0.6) / 0.9);
  const days = Math.floor(today);
  const fx = underDay(p, 4);
  const followUp = "Hi, just following up on the loss runs for Pinecrest Dental.";
  const typed = seg(lt, 6.0, 7.6);
  const hand = track(lt, [
    [5.4, home[0], home[1]],
    [6.0, fx + 60, g.below + 30],
    [7.6, fx + g.card - 30, g.below + 50],
    [8.4, home[0], home[1]],
  ]);
  return (
    <>
      <WaitRow p={p} status={`Waiting ${days} day${days === 1 ? "" : "s"}`} />
      <Timeline p={p} today={today} />
      {/* How long it has been, and that nothing is keeping count. */}
      <Abs x={g.mid - 150} y={g.under + (p ? 0 : 30)} w={300} o={seg(lt, 0.8, 1.4) * (1 - seg(lt, 5.4, 5.8))}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, lineHeight: "34px", fontWeight: 600, color: INK }}>
            {days} day{days === 1 ? "" : "s"}
          </div>
          <div style={{ ...tiny, marginTop: 4 }}>No reminder, no follow-up date</div>
        </div>
      </Abs>
      {lt > 5.6 ? (
        <DocCard x={fx} y={g.below} w={g.card} h={108} lift title="Follow-up to broker" sub="Written by hand" o={seg(lt, 5.6, 6.0)}>
          <div style={{ ...body, fontSize: 12, lineHeight: "16px", color: MUTED, marginTop: 6 }}>{followUp.slice(0, Math.round(followUp.length * typed))}</div>
        </DocCard>
      ) : null}
      <Cursor x={hand[0]} y={hand[1]} o={win(lt, 5.2, 8.6)} />
    </>
  );
}

function waitOutcome(t: number, p: boolean) {
  const home = rest(p);
  const g = WG(p);
  if (t < 6.2) {
    // The reply is matched as it arrives, and the step ticks itself off.
    const cx = underDay(p, 1);
    const drop = seg(t, 1.0, 1.8);
    const file = seg(t, 2.6, 3.3);
    const filedIn = t >= 3.3;
    return (
      <>
        <WaitRow p={p} status={filedIn ? <Pill color={YES}>✓ Step done</Pill> : <Pill color={MUTED}>Waiting</Pill>} />
        <Timeline p={p} today={t < 0.6 ? 0 : seg(t, 0.6, 1.0)} tone={YES} />
        {!filedIn ? (
          <DocCard x={lerp(cx, g.rowX + g.rowW - g.card - 12, file)} y={lerp(lerp(g.lineY - 40, g.below, drop), g.rowY + 14, file)} w={g.card} h={48} s={lerp(1, 0.8, file)} tone={YES} lift title="loss_runs_5yr.pdf" sub="Matched to Pinecrest" o={drop * (1 - file * 0.6)} />
        ) : null}
      </>
    );
  }
  // No reply: the follow-up date passes, the policy turns Overdue, and the assistant picks what to do.
  const lt = t - 6.2;
  const today = Math.min(3, lt < 0.6 ? 0 : (lt - 0.6) / 0.8);
  const overdue = today > 2.05;
  const pick = lt >= 5.2 ? "Chase" : null;
  const chips = ["Chase", "Call", "Wait"];
  const chipW = 76;
  const chipsX = g.mid - (chips.length * chipW + (chips.length - 1) * 8) / 2;
  const chipsY = g.under + (p ? 30 : 56);
  const hand = track(lt, [
    [3.8, home[0], home[1]],
    [4.8, chipsX + chipW / 2, chipsY + 16],
    [6.4, chipsX + chipW / 2, chipsY + 16],
    [7.2, home[0], home[1]],
  ]);
  return (
    <>
      <WaitRow p={p} status={<Pill color={overdue ? NO : MUTED}>{overdue ? "Overdue · top of Home" : "Waiting"}</Pill>} overdue={overdue} />
      <Timeline p={p} today={today} flag={2} overdue={overdue} tone={YES} />
      {overdue ? (
        <Abs x={chipsX} y={chipsY} o={seg(lt, 2.6, 3.0)} style={{ display: "flex", gap: 8 }}>
          {chips.map((c) => (
            <span key={c} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: chipW, height: 32, borderRadius: 99, fontSize: 13, border: `1px solid ${pick === c ? INK : DIVIDER}`, background: pick === c ? INK : RAISED, color: pick === c ? PAGE : INK }}>
              {c}
            </span>
          ))}
        </Abs>
      ) : null}
      <Cursor x={hand[0]} y={hand[1]} kind="point" click={ping(lt, 5.2)} o={win(lt, 3.6, 7.4)} />
    </>
  );
}

/* ------------------------------ phase 4: review ------------------------------ */

const LINES = [
  { k: "Named insured", a: "Harbor Line Logistics LLC", c: "Harbor Line Logistics, LLC", diff: true },
  { k: "Policy period", a: "05/01/26 to 05/01/27", c: "05/01/26 to 05/01/27" },
  { k: "Each occurrence", a: "$2,000,000", c: "$1,000,000", diff: true, real: true },
  { k: "General aggregate", a: "$4,000,000", c: "$4,000,000" },
];
/** The two documents: side by side, or one above the other on a phone. */
/** Each card is its label plus four 50px rows with `gap` between, and 12px padding top and bottom. */
const docBox = (p: boolean, col: number) => (p ? { x: 12, y: col ? 282 : 10, w: 376, h: 262, gap: 6 } : { x: col ? 420 : 36, y: 36, w: 344, h: 286, gap: 12 });
/** The top of a document line, in stage px. */
const lineY = (p: boolean, col: number, i: number) => {
  const b = docBox(p, col);
  return b.y + 12 + 14 + b.gap + i * (50 + b.gap);
};

function Pair({ p, flag, reading, dim = 1, marks }: { p: boolean; flag: (i: number) => boolean; reading?: [number, number]; dim?: number; marks?: Record<number, "real" | "ok" | undefined> }) {
  return (
    <>
      {["Application", "Certificate of insurance"].map((title, col) => {
        const b = docBox(p, col);
        return (
          <Abs key={title} x={b.x} y={b.y} w={b.w} h={b.h} o={dim} style={{ ...boxed, padding: "12px 14px" }}>
            <div style={tiny}>{title}</div>
            {LINES.map((l, i) => {
              const on = flag(i);
              const read = reading && reading[0] === col && reading[1] === i;
              const m = marks?.[i];
              return (
                <div key={l.k} style={{ marginTop: b.gap, padding: "6px 8px", borderRadius: 6, height: 50, background: on ? `color-mix(in srgb, ${m === "ok" ? YES : NO} 14%, transparent)` : read ? `color-mix(in srgb, ${INK} 9%, transparent)` : "transparent", outline: on ? `1px solid ${m === "ok" ? YES : NO}` : "none" }}>
                  <div style={tiny}>{l.k}</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, marginTop: 3 }}>{col ? l.c : l.a}</div>
                </div>
              );
            })}
          </Abs>
        );
      })}
    </>
  );
}

function Panel({ x, y, w, title, children, tag }: { x: number; y: number; w: number; title: string; children: ReactNode; tag?: string }) {
  return (
    // A callout over the dimmed documents: full-strength text and a clear outline, so it reads as the focus.
    <Abs x={x} y={y} w={w} z={10} style={{ ...boxed, padding: 14, borderColor: MUTED, boxShadow: "0 16px 36px -18px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ ...tiny, color: INK }}>{title}</span>
        {tag ? <Pill color={YES}>{tag}</Pill> : null}
      </div>
      <div style={{ ...body, color: INK, marginTop: 10 }}>{children}</div>
    </Abs>
  );
}

const BROKER_EMAIL = "Hi, the certificate shows each occurrence at $1,000,000, but the application asks for $2,000,000. Could you send a corrected certificate?";
/** Slides a panel in from the right at `a` and out to the right at `b`. */
const slideX = (p: boolean, t: number, a: number, b: number) => (p ? lerp(420, 12, segOut(t, a, a + 0.5)) + lerp(0, 420, segOut(t, b - 0.4, b)) : lerp(820, 400, segOut(t, a, a + 0.5)) + lerp(0, 420, segOut(t, b - 0.4, b)));
const panel = (p: boolean) => (p ? { y: 120, w: 376 } : { y: 70, w: 364 });

function reviewJourney(t: number, p: boolean) {
  const home = rest(p);
  // Read line by line first; then the email, the call, the wait.
  const step = Math.floor(clamp01((t - 0.6) / 5.6) * 8);
  const reading: [number, number] | undefined = t > 0.6 && t < 6.2 ? [step % 2, Math.min(3, Math.floor(step / 2))] : undefined;
  const flagged = t >= 6.2 && t < 17.6;
  const lineAt = (s: number): [number, number, number] => {
    const col = s % 2;
    const i = Math.min(3, Math.floor(s / 2));
    return [0.6 + s * 0.7, docBox(p, col).x + 120, lineY(p, col, i) + 26];
  };
  const at = reading ? track(t, Array.from({ length: 9 }, (_, s) => lineAt(s))) : track(t, [lineAt(8).map((v, k) => (k === 0 ? 6.2 : v)) as [number, number, number], [7.0, home[0], home[1]]]);
  const pn = panel(p);
  return (
    <>
      <Pair p={p} flag={(i) => flagged && !!LINES[i].real} reading={reading} dim={t > 7.4 && t < 17.4 ? 0.4 : 1} />
      <Cursor x={at[0]} y={at[1]} kind={reading ? "point" : "arrow"} o={win(t, 0.2, 7.2)} />
      {t > 7.4 && t < 11.6 ? <Mail x={slideX(p, t, 7.4, 11.6)} y={pn.y - 20} w={pn.w} to="Broker" subject="Mismatch found: each occurrence limit" text={BROKER_EMAIL} typed={seg(t, 8.0, 11.0)} action="Send" /> : null}
      {t > 11.4 && t < 14.9 ? (
        <Panel x={slideX(p, t, 11.4, 14.9)} y={pn.y} w={pn.w} title="Wrong answer">
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 30, display: "inline-block", transform: `rotate(${Math.sin(t * 22) * 14}deg)` }}>☎</span>
            <span>Back and forth by email or phone with the broker, then the update is logged by hand.</span>
          </span>
        </Panel>
      ) : null}
      {t > 14.7 && t < 17.6 ? (
        <Panel x={slideX(p, t, 14.7, 17.6)} y={pn.y} w={pn.w} title="No answer">
          Waiting on the broker again, and nothing tracks how long it has been. The assistant follows up.
        </Panel>
      ) : null}
    </>
  );
}

function reviewOutcome(t: number, p: boolean) {
  const home = rest(p);
  const lit = t >= 0.5;
  const marks: Record<number, "real" | "ok" | undefined> = { 2: t >= 2.8 ? "real" : undefined, 0: t >= 3.8 ? "ok" : undefined };
  const cert = docBox(p, 1);
  // The Real / OK chips sit at the right end of each differing certificate line.
  const chipX = cert.x + cert.w - 104;
  const hand = track(t, [
    [1.8, home[0], home[1]],
    [2.7, chipX + 22, lineY(p, 1, 2) + 26],
    [3.3, chipX + 22, lineY(p, 1, 2) + 26],
    [3.7, chipX + 66, lineY(p, 1, 0) + 26],
    [4.6, home[0], home[1]],
  ]);
  const pn = panel(p);
  return (
    <>
      <Pair p={p} flag={(i) => lit && !!LINES[i].diff} marks={marks} dim={t > 5.6 ? 0.4 : 1} />
      {/* What the assistant marks each difference as. */}
      {lit && t < 5.8
        ? [0, 2].map((i) => (
            <Abs key={i} x={chipX} y={lineY(p, 1, i) + 16} z={12}>
              <span style={{ display: "flex", gap: 4 }}>
                {(["real", "ok"] as const).map((m) => (
                  <span key={m} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, border: `1px solid ${marks[i] === m ? (m === "real" ? NO : YES) : DIVIDER}`, background: marks[i] === m ? (m === "real" ? NO : YES) : RAISED, color: marks[i] === m ? PAGE : MUTED }}>
                    {m === "real" ? "Real" : "OK"}
                  </span>
                ))}
              </span>
            </Abs>
          ))
        : null}
      <Cursor x={hand[0]} y={hand[1]} kind="point" click={ping(t, 2.8) || ping(t, 3.8)} o={win(t, 1.6, 4.8)} />
      {t > 5.6 && t < 10.0 ? <Mail x={slideX(p, t, 5.6, 10.0)} y={pn.y - 20} w={pn.w} to="Broker" subject="Mismatch found: each occurrence limit" text={BROKER_EMAIL} drafted action="Send to broker" /> : null}
      {t > 9.8 && t < 14.2 ? (
        <Panel x={slideX(p, t, 9.8, 14.2)} y={pn.y} w={pn.w} title="Wrong answer" tag="Drafted">
          A reply is drafted on the policy, or the assistant calls the broker from it.
        </Panel>
      ) : null}
      {/* The last card stays up: the stage ends on it. */}
      {t > 14.0 ? (
        <Panel x={slideX(p, t, 14.0, 99)} y={pn.y} w={pn.w} title="No answer" tag="Follow up after 2 days">
          The follow-up date brings the policy back when it is due.
        </Panel>
      ) : null}
    </>
  );
}

/* ------------------------------ phase 5: bind ------------------------------ */

const CHECKS = ["12 of 12 checklist items complete", "3 coverage limits match the application", "All documents matched to this application", "No open differences between documents"];
const BY_HAND = ["Checklist re-read", "Limits compared again", "Documents counted", "Emails re-checked"];
const bindBox = (p: boolean) => (p ? { x: 12, y: 12, w: 376, h: 340 } : { x: 150, y: 36, w: 500, h: 300 });
const stampAt = (p: boolean): [number, number] => (p ? [240, 190] : [490, 196]);

function Stamp({ on, tone, xy }: { on: number; tone: string; xy: [number, number] }) {
  return (
    <Abs x={xy[0]} y={xy[1]} w={130} h={130} s={lerp(1.5, 1, on)} r={lerp(0, -9, on)} o={on} z={20} style={{ borderRadius: 65, border: `3px solid ${tone}`, color: tone, background: RAISED, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 600 }}>
      Bound
    </Abs>
  );
}

/** The middle of summary row i, in stage px. */
const checkY = (p: boolean, i: number) => bindBox(p).y + 18 + 14 + 16 + 10 + i * 36;

function bindJourney(t: number, p: boolean) {
  const home = rest(p);
  const b = bindBox(p);
  const tick = (i: number) => t >= 1.2 + i * 0.9;
  const x = b.x + 40;
  const at = track(t, [
    [0.4, home[0], home[1]],
    [1.0, x, checkY(p, 0)],
    [1.9, x, checkY(p, 1)],
    [2.8, x, checkY(p, 2)],
    [3.7, x, checkY(p, 3)],
    [4.6, home[0], home[1]],
  ]);
  return (
    <>
      <Abs x={b.x} y={b.y} w={b.w} h={b.h} style={{ ...boxed, padding: 18 }}>
        <div style={tiny}>Final check, by hand</div>
        {BY_HAND.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, opacity: tick(i) ? 1 : 0.4 }}>
            <span style={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: 10, fontSize: 12, border: `1.5px solid ${tick(i) ? INK : DIVIDER}` }}>{tick(i) ? "✓" : ""}</span>
            <span style={body}>{c}</span>
          </div>
        ))}
      </Abs>
      <Cursor x={at[0]} y={at[1]} kind={t > 0.9 && t < 4.4 ? "point" : "arrow"} o={win(t, 0.2, 5.0)} />
      <Stamp on={segOut(t, 5.0, 5.4)} tone={INK} xy={stampAt(p)} />
    </>
  );
}

function bindOutcome(t: number, p: boolean) {
  const home = rest(p);
  const b = bindBox(p);
  const tick = (i: number) => t >= 0.5 + i * 0.2;
  const agreed = t >= 2.7;
  const bound = t >= 3.8;
  // On a phone the button sits on its own line under the tick box.
  const boxAt: [number, number] = [b.x + 27, checkY(p, 3) + 50];
  const buttonAt: [number, number] = p ? [b.x + 80, checkY(p, 3) + 92] : [b.x + 430, checkY(p, 3) + 50];
  const hand = track(t, [
    [1.6, home[0], home[1]],
    [2.5, boxAt[0], boxAt[1]],
    [3.0, boxAt[0], boxAt[1]],
    [3.6, buttonAt[0], buttonAt[1]],
    [4.6, home[0], home[1]],
  ]);
  return (
    <>
      <Abs x={b.x} y={b.y} w={b.w} h={b.h} style={{ ...boxed, padding: 18 }}>
        <div style={tiny}>Verification summary</div>
        {CHECKS.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, opacity: tick(i) ? 1 : 0.4 }}>
            <span style={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: 10, fontSize: 12, color: YES, border: `1.5px solid ${tick(i) ? YES : DIVIDER}` }}>{tick(i) ? "✓" : ""}</span>
            <span style={body}>{c}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 26, opacity: bound ? 0 : 1 }}>
          <span style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: 4, fontSize: 11, border: `1.5px solid ${agreed ? INK : DIVIDER}`, background: agreed ? INK : "transparent", color: PAGE }}>{agreed ? "✓" : ""}</span>
          <span style={body}>I have checked this summary</span>
          <span style={{ marginLeft: p ? 0 : "auto", display: "inline-flex", alignItems: "center", height: 30, padding: "0 14px", borderRadius: 99, fontSize: 13, background: agreed ? INK : "transparent", color: agreed ? PAGE : MUTED, border: `1px solid ${agreed ? INK : DIVIDER}` }}>Approve and bind</span>
        </div>
      </Abs>
      <Cursor x={hand[0]} y={hand[1]} kind="point" click={ping(t, 2.7) || ping(t, 3.7)} o={win(t, 1.4, 4.8)} />
      <Stamp on={segOut(t, 3.8, 4.2)} tone={YES} xy={stampAt(p)} />
    </>
  );
}

/* ------------------------------ the stages ------------------------------ */

/** A stretch of a scene with the caption that goes with it. */
const clip = (draw: Draw, from: number, to: number, secs: number, ...lines: string[]): Clip => ({ draw, from, to, secs, lines });
const minutes = (n: number) => (q: number) => `${Math.round(n * q)} min`;
const days = (n: number) => (q: number) => `${(n * q).toFixed(1)} days`;

/**
 * Each stage, today and with Bind Desk: its scene in stretches, each with the
 * caption that leads it, and the number that counts up in the band's corner
 * across some of those stretches. Today runs context, then the pain point as it
 * happens, then the evidence. With Bind Desk, the same scene runs on throughout:
 * its first stretch carries the context line, the rest what Bind Desk does.
 * Seconds are at the starting speed.
 */
const STAGES: { name: string; journey: Track; outcome: Track }[] = [
  {
    name: "Collect",
    journey: {
      clips: [
        clip(collectJourney, 0, 2.6, 3.4, "Documents for one policy arrive by **portal, email and fax**.", "Each one has to reach **the right policy**."),
        clip(collectJourney, 2.6, 7.4, 5, "Every file is **opened by hand**", "just to see what it is."),
        clip(collectJourney, 7.6, 15.4, 7.4, "**17 of 54** submissions arrived **outside the portal**."),
      ],
      stat: { clips: [0, 2], value: minutes(11), label: "Spent finding documents, per submission" },
    },
    outcome: {
      clips: [
        clip(collectOutcome, 0, 2.6, 2.7, "Documents for one policy arrive by **portal, email and fax**."),
        clip(collectOutcome, 2.6, 8.6, 6.3, "Bind Desk **reads each file where it lands** and files it to its policy.", "**You confirm** the ones it is unsure of."),
      ],
    },
  },
  {
    name: "Check",
    journey: {
      clips: [
        clip(checkJourney, 0, 3.0, 3.4, "Each policy has **a checklist**.", "It **cannot bind** until every item is in."),
        clip(checkJourney, 3.0, 6.4, 4.4, "A missing document **only shows**", "**when someone checks**."),
        clip(checkJourney, 6.4, 14.0, 6.6, "The assistant: “**the checklist itself is fine**.”"),
      ],
      stat: { clips: [0, 1], value: minutes(3), label: "The checklist itself" },
    },
    outcome: {
      clips: [
        clip(checkOutcome, 0, 2.6, 2.7, "Each policy has **a checklist**."),
        clip(checkOutcome, 2.6, 8.8, 6.3, "The checklist **fills as documents arrive** and shows what is missing.", "The request to the broker is **already drafted**."),
      ],
    },
  },
  {
    name: "Wait",
    journey: {
      clips: [
        clip(waitJourney, 0, 6.8, 5, "When something is **missing**,", "the assistant **asks the broker and waits**."),
        clip(waitJourney, 7.6, 12.6, 5.2, "**Nobody tracks**", "how long a submission **has waited**."),
        clip(waitJourney, 12.6, 15.9, 3.6, "**Nine** submissions waited **more than four days**."),
      ],
      stat: { clips: [1, 1], value: days(2.1), label: "Median wait for a broker reply" },
    },
    outcome: {
      clips: [
        clip(waitOutcome, 0, 6.2, 5.6, "A reply is **matched and marked done**."),
        clip(waitOutcome, 6.2, 13.2, 6.6, "Each policy has **a follow-up date**.", "When it passes, the policy **moves to the top of Home**."),
      ],
    },
  },
  {
    name: "Review",
    journey: {
      clips: [
        clip(reviewJourney, 0, 3.2, 3.4, "The certificate **has to match**", "**what the client applied for**."),
        clip(reviewJourney, 3.2, 7.2, 4.4, "Differences are found **by reading**", "**both documents, line by line**."),
        clip(reviewJourney, 7.4, 17.4, 7.2, "More than **a third** of submissions had a mismatch."),
      ],
      stat: { clips: [0, 1], value: minutes(14), label: "Until the first flag" },
    },
    outcome: {
      clips: [
        clip(reviewOutcome, 0, 2.8, 2.7, "The certificate **has to match** what the client applied for."),
        clip(reviewOutcome, 2.8, 18.6, 15.2, "Every difference is **highlighted side by side**.", "**You mark each one** real or acceptable."),
      ],
    },
  },
  {
    name: "Bind",
    journey: {
      clips: [
        clip(bindJourney, 0, 4.6, 4.2, "Once **everything checks out**,", "the policy is **bound**."),
        clip(bindJourney, 4.6, 6.2, 3, "**Binding cannot be undone.**", "A missed mismatch becomes **a claim the firm cannot cover**."),
        clip(bindJourney, 6.2, 10.0, 4, "One assistant: it “**comes back to bite us later**.”"),
      ],
    },
    outcome: {
      clips: [
        clip(bindOutcome, 0, 2.4, 2.5, "Once **everything checks out**, the policy is **bound**."),
        clip(bindOutcome, 2.4, 8.8, 6.5, "**A summary of every check** comes first.", "Nothing binds **until you approve**."),
      ],
    },
  },
];
