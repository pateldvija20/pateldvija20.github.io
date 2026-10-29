import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { COLOR, OVERLINE, TYPE } from "./tokens";

/**
 * The phase explorer, shared. It was first built for Bind Desk
 * (`BindDeskPhases.tsx`, which still carries its own copy); a case study now
 * passes in its own stages instead.
 *
 * Scrolling moves from one stage to the next while the explorer stays pinned;
 * each stage then plays on its own: its scene in stretches, each led by a
 * caption typed into the band under the scene, with `**` phrases swept by the
 * highlighter, and an optional number that counts up in the band's corner.
 *
 * Every scene is a pure function of its time `t`. On a wide screen it is drawn
 * on an 800 x 450 stage; on a phone (`p`, portrait) on a 400 x 680 one with its
 * own layout. Either way the frame is scaled to the column. With reduced motion
 * each stage holds on one frame.
 */

/**
 * One stage: its pill name, its timeline, how far to shift its scene so it sits
 * centred in the frame ([x, y] wide, then tall), and on a phone how tall its
 * frame is, so a short scene does not sit in a tall empty box.
 */
export type StageDef = { name: string; track: Track; center?: [[number, number], [number, number]]; tallH?: number };

/** A stretch of a scene with the caption that goes with it; seconds are at the starting speed. */
export const clip = (draw: Draw, from: number, to: number, secs: number, ...lines: string[]): Clip => ({ draw, from, to, secs, lines });

const INK = COLOR.textPrimary;
const MUTED = COLOR.textSecondary;
const DIVIDER = COLOR.borderSubtle;
const RAISED = COLOR.surfaceRaised;
const WELL = COLOR.surfaceSunken;
const PAGE = COLOR.surfacePage;
const YES = COLOR.statusPositive;
const NO = COLOR.statusNegative;
const MONO = "'DM Mono', monospace";

/* ------------------------------ time helpers ------------------------------ */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ease = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
/** 0 before a, 1 after b, eased between. */
export const seg = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)));
export const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
/** Visible between a and b, fading over `f` seconds at each end. */
export const win = (t: number, a: number, b: number, f = 0.35) => Math.min(seg(t, a, a + f), 1 - seg(t, b - f, b));
/** A point that moves through keyframes [time, x, y], eased between each. */
export function track(t: number, keys: [number, number, number][]): [number, number] {
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
export const phaseOf = <T,>(t: number, states: [number, T][]): T => states.reduce((cur, [at, v]) => (t >= at ? v : cur), states[0][1]);

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

export type Draw = (t: number, p: boolean) => ReactNode;
/**
 * A stretch of a scene, from one moment to another, played over `secs` seconds,
 * with its caption; `**` marks what gets highlighted. The scene holds on its
 * first frame for `LEAD` seconds first, so the caption is read before the
 * action it describes starts.
 */
export type Clip = { draw: Draw; from: number; to: number; secs: number; lines: string[] };
/** A number that counts up in the band's corner across a run of clips: the evidence, as part of the picture. */
export type Stat = { clips: [number, number]; value: (q: number) => string; label: string };
export type Track = { clips: Clip[]; stat?: Stat };
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

export function PhaseExplorer({ stages, label: listLabel, title, eyebrow, tone: toneName = "ink" }: { stages: StageDef[]; label: string; title?: string; eyebrow?: string; tone?: "ink" | "yes" }) {
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
  const n = stages.length;
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
  const track = stages[stage].track;
  // Each clip runs LEAD + secs: its caption comes in while the scene holds, then the scene plays.
  const lens = track.clips.map((c) => LEAD + c.secs);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  const total = lens.reduce((a, b) => a + b, 0);
  const key = `${listLabel}-${stage}`;
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
  const offset = `${(stages[stage].center?.[portrait ? 1 : 0] ?? [0, 0]).join("px, ")}px`;
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
      if (r && b) setReach(b.left + b.width / 2 - r.left);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
  }, [stage, portrait]);

  const tone = toneName === "yes" ? YES : INK;
  /** The current pill's fill: the flow colour, light enough to read the name over. */
  // One tint for the stages already played and for the current one as it fills, so done and current read as the same thing.
  const fillTone = `color-mix(in srgb, ${tone} 18%, ${PAGE})`;
  const doneEdge = `color-mix(in srgb, ${tone} 45%, ${PAGE})`;
  const hoverEdge = `color-mix(in srgb, ${INK} 60%, ${PAGE})`;
  const [hover, setHover] = useState(-1);
  const label = [...track.clips.map((c) => c.lines.join(" ")), track.stat ? `${track.stat.value(1)} ${track.stat.label}` : ""].join(" ").replace(/\*\*/g, "");

  return (
    <div ref={wrap} data-ui="Phase explorer" data-src="src/pieces/PhaseEngine.tsx › PhaseExplorer" className="relative" style={{ height: `${n * 70 + 30}vh` }}>
      <div ref={sticky} className="sticky" style={{ top: pin }}>
        {/* The section's own label can ride along in the pinned block, so it stays in view with the explorer. */}
        {eyebrow ? (
          <h2 className="mb-3 uppercase" style={{ ...OVERLINE, color: MUTED }}>
            {eyebrow}
          </h2>
        ) : null}
        {title ? <h3 className={`mb-4 md:mb-8 ${TYPE.headline}`}>{title}</h3> : null}
        {/* The stages spread edge to edge, joined by a flow line that fills to the current one. */}
        <div ref={row} role="tablist" aria-label={listLabel} className="relative flex items-center justify-between">
          <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: 2, background: DIVIDER }} />
          <div aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 transition-[width] duration-500" style={{ height: 2, width: reach, background: tone }} />
          {stages.map((s, i) => {
            const on = i === stage;
            const done = i < stage;
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
                onClick={() => go(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(-1)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(-1)}
                className="relative flex cursor-pointer rounded-full outline-none"
              >
                <span
                  className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] leading-none transition-colors duration-300 md:h-8 md:gap-2 md:px-4 md:text-[14px]"
                  style={{
                    // Done stages hold the tint; the current one fills with it, left to right, as it plays.
                    // Hovering any other stage lifts its outline and text.
                    background: done ? fillTone : on ? `linear-gradient(to right, ${fillTone} ${(now / total) * 100}%, ${PAGE} ${(now / total) * 100}%)` : hover === i ? RAISED : PAGE,
                    color: done || on || hover === i ? INK : MUTED,
                    border: `1px solid ${on ? INK : hover === i ? hoverEdge : done ? doneEdge : DIVIDER}`,
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  <span style={{ opacity: 0.6 }}>{i + 1}</span>
                  {/* On a phone only the current stage shows its name, so they all fit. */}
                  {!portrait || on ? <span>{s.name}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
        <Stage
          portrait={portrait}
          height={portrait ? stages[stage].tallH : undefined}
          maxHeight={room}
          label={`${stages[stage].name}. ${label}`}
          band={<Band portrait={portrait} lines={clip.lines} t={lt} len={lens[ci]} stat={track.stat && statWin ? { ...track.stat, q: clamp01((now - statWin[0]) / (statWin[1] - statWin[0])), on: now >= statWin[0] - 0.3 } : undefined} />}
        >
          {under && fade < 1 ? (
            <div style={{ position: "absolute", inset: 0, opacity: 1 - fade, transform: `translate(${under.offset})` }}>
              {under.draw(under.x, portrait)}
            </div>
          ) : null}
          <div style={{ position: "absolute", inset: 0, opacity: fade, transform: `translate(${offset})` }}>
            {clip.draw(x, portrait)}
          </div>
        </Stage>
        <div className="mt-3 flex justify-end md:mt-4">
          {/* Playback speed. */}
          <div role="group" aria-label="Playback speed" className="flex items-center gap-1">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rate === r}
                onClick={() => setRate(r)}
                className={`rounded-full px-2.5 py-1 ${TYPE.bodySm} transition-colors duration-200`}
                style={{ background: rate === r ? INK : "transparent", color: rate === r ? PAGE : MUTED, border: `1px solid ${rate === r ? INK : DIVIDER}` }}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The band under the scene: the current clip's caption on the left, and the
 * stage's live number on the right (above the caption on a phone). `t` runs
 * from the clip's start to `len`.
 */
function Band({ portrait, lines, t, len, stat }: { portrait: boolean; lines: string[]; t: number; len: number; stat?: Stat & { q: number; on: boolean } }) {
  const o = Math.min(seg(t, 0, FADE), 1 - seg(t, len - FADE, len));
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

export const tiny: CSSProperties = { fontFamily: MONO, fontSize: 11, lineHeight: "14px", letterSpacing: "0.4px", textTransform: "uppercase", color: MUTED };
export const body: CSSProperties = { fontSize: 14, lineHeight: "19px" };
export const boxed: CSSProperties = { background: RAISED, border: `1px solid ${DIVIDER}`, borderRadius: 10, color: INK };

export function Abs({ x, y, w, h, r = 0, s = 1, o = 1, z, style, children }: { x: number; y: number; w?: number; h?: number; r?: number; s?: number; o?: number; z?: number; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, opacity: o, zIndex: z, ...style }}>
      {children}
    </div>
  );
}

/** `**x**` as emphasis. */
export function Marked({ text }: { text: string }) {
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

export type Hand = "arrow" | "open" | "grab" | "point";
const HAND: Record<Exclude<Hand, "arrow">, string> = {
  open: "M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
  grab: "M18 11.5V9a2 2 0 0 0-4 0v1.4M14 10V8a2 2 0 0 0-4 0v2M10 9.9V9a2 2 0 0 0-4 0v5M6 14a2 2 0 0 0-4 0M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8 2 2 0 1 1 4 0",
  point: "M22 14a8 8 0 0 1-8 8M18 11v-1a2 2 0 0 0-4 0M14 10V9a2 2 0 0 0-4 0v1M10 9.5V4a2 2 0 0 0-4 0v10M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
};

/** The person's hand: an arrow, an open hand, a grab or a pointing finger, with a ring when it clicks. */
export function Cursor({ x, y, kind = "arrow", click = 0, o = 1 }: { x: number; y: number; kind?: Hand; click?: number; o?: number }) {
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
export const ping = (t: number, a: number) => (t >= a && t < a + 0.45 ? (t - a) / 0.45 : 0);

export function Pill({ children, color, fill = false }: { children: ReactNode; color: string; fill?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 20, padding: "0 8px", borderRadius: 99, fontSize: 11, border: `1px solid ${color}`, background: fill ? color : "transparent", color: fill ? PAGE : color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}
