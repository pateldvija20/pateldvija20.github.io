import { createContext, useContext, useId, type CSSProperties, type ReactNode } from "react";
import { Abs, Cursor, PhaseExplorer, boxed, clip, lerp, ping, seg, tiny, track, win, type StageDef } from "./PhaseEngine";
import { COLOR } from "./tokens";

/**
 * Billy & Buddy's three explorers, on the shared phase engine.
 *
 *   journey   how a child meets money today: the shop, school, growing up
 *   outcome   the same three stages, with the game
 *   service   the proposed service, macro then micro: one turn of it, then
 *             who makes a book, how a family joins, the website, and the
 *             game replaying the book's lesson
 *
 * The art is the game's own (public/billy-and-buddy-game/assets), so the
 * scenes and the playable prototype show the same items and the same Billy.
 * Wide scenes are laid out on 800 x 450, portrait ones on 400 x the stage's
 * `tallH`, each centred by construction.
 */

const INK = COLOR.textPrimary;
const MUTED = COLOR.textSecondary;
const DIVIDER = COLOR.borderSubtle;
const RAISED = COLOR.surfaceRaised;
const PAGE = COLOR.surfacePage;
const NO = COLOR.statusNegative;
const YES = COLOR.statusPositive;
/** The game's two basket colours. */
const NEED = "#0AB4AD";
const WANT = "#F3AF26";

const GAME = "/billy-and-buddy-game/assets";
const item = (id: string) => `${GAME}/items/${id}.svg`;

const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const label: CSSProperties = { fontSize: 13, lineHeight: "17px", fontWeight: 500, color: INK };

/* ------------------------------ parts ------------------------------ */

function Img({ src, x, y, w, o = 1, s = 1, r = 0 }: { src: string; x: number; y: number; w: number; o?: number; s?: number; r?: number }) {
  return (
    <Abs x={x} y={y} w={w} o={o} s={s} r={r}>
      <img src={src} alt="" draggable={false} style={{ width: w, display: "block" }} />
    </Abs>
  );
}

/** A labelled box: a node in a map, a lane cell, a card. `lit` lifts its edge and text. */
function Node({ x, y, w, h, title, sub, lit = 0, tone = INK, o = 1, center = false }: { x: number; y: number; w: number; h?: number; title: string; sub?: string; lit?: number; tone?: string; o?: number; center?: boolean }) {
  return (
    <Abs x={x} y={y} w={w} h={h} o={o}>
      <div
        style={{
          ...boxed,
          height: h,
          padding: "9px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: center ? "center" : "flex-start",
          textAlign: center ? "center" : "left",
          border: `1px solid color-mix(in srgb, ${tone} ${Math.round(lerp(0, 80, lit))}%, ${DIVIDER})`,
          background: `color-mix(in srgb, ${tone} ${Math.round(lerp(0, 10, lit))}%, ${RAISED})`,
        }}
      >
        <div style={{ ...label, color: `color-mix(in srgb, ${INK} ${Math.round(lerp(70, 100, lit))}%, ${MUTED})` }}>{title}</div>
        {sub ? <div style={{ fontSize: 11.5, lineHeight: "15px", color: MUTED, marginTop: 3 }}>{sub}</div> : null}
      </div>
    </Abs>
  );
}

/** One of the game's two baskets. */
function Basket({ x, y, w, h, kind, glow = 0 }: { x: number; y: number; w: number; h: number; kind: "need" | "want"; glow?: number }) {
  const c = kind === "need" ? NEED : WANT;
  return (
    <Abs x={x} y={y} w={w} h={h}>
      <div style={{ height: h, borderRadius: 14, background: c, display: "grid", placeItems: "center", color: "#fff", fontSize: 22, fontWeight: 700, letterSpacing: "0.02em", boxShadow: glow ? `0 0 0 ${3 * glow}px ${mix("#fff", 70 * glow)}` : undefined }}>
        {kind === "need" ? "NEEDS" : "WANTS"}
      </div>
    </Abs>
  );
}

/** A speech bubble, in the game's blue. */
function Bubble({ x, y, w, text, o = 1, tone = "#4A9DF8" }: { x: number; y: number; w: number; text: string; o?: number; tone?: string }) {
  return (
    <Abs x={x} y={y} w={w} o={o} s={lerp(0.92, 1, o)}>
      <div style={{ background: tone, color: "#fff", borderRadius: 12, padding: "8px 12px", fontSize: 13, lineHeight: "17px", fontWeight: 500 }}>{text}</div>
    </Abs>
  );
}

/** A curved connector with an arrowhead, lit from 0 to 1 along its length. */
function Link({ d, lit = 1, tone = INK, dim = 0.28 }: { d: string; lit?: number; tone?: string; dim?: number }) {
  const arrow = useContext(ArrowId);
  return (
    <g>
      <path d={d} fill="none" stroke={MUTED} strokeOpacity={dim} strokeWidth={1.5} />
      <path d={d} fill="none" stroke={tone} strokeWidth={1.8} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lit} markerEnd={lit > 0.98 ? `url(#${arrow})` : undefined} />
    </g>
  );
}

/** Each drawing defines its own arrowhead, so two on one page never share an id. */
const ArrowId = createContext("bb-arrow");
function Svg({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const id = `bb-arrow-${useId().replace(/:/g, "")}`;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={INK} />
        </marker>
      </defs>
      <ArrowId.Provider value={id}>{children}</ArrowId.Provider>
    </svg>
  );
}

const W = (p: boolean) => (p ? 400 : 800);

/* ------------------------------ the shop ------------------------------ */

const SHELF = ["water-bottle", "chips", "lollipop", "balloon-dog"];

/** A shelf of items, a basket, and a child's hand that goes straight for the candy; then the age ruler. */
function shopJourney(t: number, p: boolean) {
  const xs = p ? [40, 125, 210, 295] : [210, 320, 430, 540];
  const sy = p ? 40 : 46;
  const size = p ? 62 : 70;
  const basket = p ? [130, 220] : [360, 220];
  // The hand: rests, reaches the lollipop, carries it to the basket.
  const lx = xs[2] + size / 2;
  const [cx, cy] = track(t, [
    [0.3, p ? 330 : 640, p ? 330 : 300],
    [1.5, lx, sy + size / 2],
    [2.8, basket[0] + 70, basket[1] + 20],
  ]);
  const carried = t > 1.6;
  const ruler = win(t, 3, 99);
  const fill = seg(t, 3.4, 5.6);
  const rx0 = p ? 30 : 110;
  const rx1 = p ? 370 : 690;
  const ry = p ? 420 : 368;
  const at = (age: number) => lerp(rx0, rx1, age / 18);
  return (
    <>
      <Abs x={p ? 20 : 180} y={sy + size + 10} w={p ? 360 : 440} h={8}>
        <div style={{ height: 8, borderRadius: 4, background: mix(MUTED, 35) }} />
      </Abs>
      {SHELF.map((id, i) =>
        id === "lollipop" && carried ? null : <Img key={id} src={item(id)} x={xs[i]} y={sy} w={size} o={id === "lollipop" ? 1 : 0.55} />,
      )}
      <Abs x={basket[0]} y={basket[1]} w={140} h={84}>
        <svg width={140} height={84}>
          <path d="M8 18 H132 L118 80 H22 Z" fill={RAISED} stroke={MUTED} strokeWidth={2} />
          <path d="M30 18 C30 -6 110 -6 110 18" fill="none" stroke={MUTED} strokeWidth={3} />
        </svg>
      </Abs>
      {carried ? <Img src={item("lollipop")} x={cx - size / 2} y={cy - size / 2 + 6} w={size} r={t > 2.8 ? 18 : 0} /> : null}
      <Img src={`${GAME}/buddy.svg`} x={p ? 285 : 600} y={p ? 225 : 190} w={p ? 100 : 140} o={0.95} />
      <Cursor x={cx} y={cy} kind={carried ? "grab" : t > 1.2 ? "open" : "arrow"} o={1 - seg(t, 2.9, 3.3)} />
      {/* The age ruler: 0 to 18, with the stretch to seven filling in. */}
      <Abs x={0} y={0} o={ruler}>
        <Svg w={W(p)} h={450}>
          <line x1={rx0} y1={ry} x2={rx1} y2={ry} stroke={mix(MUTED, 60)} strokeWidth={2} />
          {Array.from({ length: 19 }, (_, a) => (
            <line key={a} x1={at(a)} y1={ry - (a % 6 ? 4 : 8)} x2={at(a)} y2={ry + (a % 6 ? 4 : 8)} stroke={mix(MUTED, 60)} strokeWidth={1.5} />
          ))}
          <rect x={rx0} y={ry - 7} width={(at(7) - rx0) * fill} height={14} rx={7} fill={INK} />
        </Svg>
        {[0, 7, 18].map((a) => (
          <Abs key={a} x={at(a) - 20} y={ry + 14} w={40}>
            <div style={{ ...tiny, textAlign: "center", color: a === 7 ? INK : MUTED }}>{a === 18 ? "18 yrs" : a}</div>
          </Abs>
        ))}
        <Abs x={rx0} y={ry - 36} w={240} o={seg(t, 5, 5.6)}>
          <div style={{ ...label }}>Habits form</div>
        </Abs>
      </Abs>
    </>
  );
}

/** The game's version: the same lollipop, two baskets, and Billy answering. */
function shopOutcome(t: number, p: boolean) {
  const size = p ? 66 : 74;
  const home: [number, number] = p ? [167, 60] : [363, 52];
  const want: [number, number] = p ? [300, 330] : [520, 300];
  const need: [number, number] = p ? [100, 330] : [280, 300];
  const [lx, ly] = track(t, [
    [2.6, home[0], home[1]],
    [3.8, want[0] - size / 2, want[1] - size / 2],
  ]);
  const [bx, by] = track(t, [
    [5.2, home[0], home[1]],
    [6.4, need[0] - size / 2, need[1] - size / 2],
  ]);
  const [cx, cy] = t < 4.6
    ? track(t, [
        [1.4, p ? 330 : 700, p ? 420 : 380],
        [2.5, home[0] + size / 2, home[1] + size / 2],
        [3.8, want[0], want[1] - 10],
      ])
    : track(t, [
        [4.6, want[0], want[1] - 10],
        [5.1, home[0] + size / 2, home[1] + size / 2],
        [6.4, need[0], need[1] - 10],
      ]);
  const bw = p ? 170 : 220;
  return (
    <>
      <Basket x={need[0] - bw / 2} y={need[1] - 30} w={bw} h={p ? 70 : 80} kind="need" glow={win(t, 6.3, 7.4)} />
      <Basket x={want[0] - bw / 2} y={want[1] - 30} w={bw} h={p ? 70 : 80} kind="want" glow={win(t, 3.7, 4.8)} />
      <Img src={item("lollipop")} x={lx} y={ly} w={size} o={1 - seg(t, 3.8, 4.2)} s={lerp(1, 0.7, seg(t, 3.4, 3.8))} />
      {t > 4.6 ? <Img src={item("water-bottle")} x={bx} y={by} w={size} o={seg(t, 4.6, 5) * (1 - seg(t, 6.4, 6.8))} s={lerp(1, 0.7, seg(t, 6, 6.4))} /> : null}
      <Img src={`${GAME}/billy.svg`} x={p ? 300 : 670} y={p ? 110 : 70} w={p ? 80 : 104} />
      <Bubble x={p ? 150 : 470} y={p ? 168 : 130} w={p ? 150 : 190} text="Yes, that is a want." o={win(t, 3.9, 5.4)} />
      <Bubble x={p ? 150 : 470} y={p ? 168 : 130} w={p ? 150 : 190} text="Good, that is a need." o={win(t, 6.5, 99)} />
      <Cursor x={cx} y={cy} kind={(t > 2.5 && t < 3.8) || (t > 5.1 && t < 6.4) ? "grab" : "point"} click={ping(t, 3.8) || ping(t, 6.4)} o={seg(t, 1.2, 1.5) * (1 - seg(t, 6.8, 7.2))} />
    </>
  );
}

/* ------------------------------ school ------------------------------ */

const GRADES = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

/** The grade tiles, ages above them: in one row on a wide screen, two rows on a phone. */
function gradeBox(i: number, p: boolean) {
  if (!p) return { x: 36 + i * 52, y: 118, w: 46, h: 62 };
  const r = i < 7 ? 0 : 1;
  return { x: 22 + (i % 7) * 52, y: 60 + r * 118, w: 46, h: 62 };
}

function Grades({ t, p, walk, early = 0 }: { t: number; p: boolean; walk: number; early?: number }) {
  const hs = seg(t, 3.6, 4.4);
  const reached = walk * GRADES.length;
  const g0 = gradeBox(0, p);
  const g3 = gradeBox(3, p);
  const g10 = gradeBox(10, p);
  const g13 = gradeBox(13, p);
  return (
    <>
      {GRADES.map((g, i) => {
        const b = gradeBox(i, p);
        const lit = clamp(reached - i);
        const finance = i >= 10 ? hs : 0;
        return (
          <Abs key={g} x={b.x} y={b.y} w={b.w} h={b.h}>
            <div style={{ ...tiny, position: "absolute", top: -18, width: b.w, textAlign: "center" }}>{i + 4}</div>
            <div
              style={{
                height: b.h,
                borderRadius: 8,
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 600,
                color: finance ? PAGE : `color-mix(in srgb, ${INK} ${Math.round(lerp(55, 100, lit))}%, ${MUTED})`,
                background: finance ? `color-mix(in srgb, ${INK} ${Math.round(finance * 100)}%, ${RAISED})` : RAISED,
                border: `1px solid color-mix(in srgb, ${INK} ${Math.round(lit * 45)}%, ${DIVIDER})`,
              }}
            >
              {g}
            </div>
          </Abs>
        );
      })}
      {/* High school, where personal finance is required */}
      <Abs x={g10.x} y={g10.y + g10.h + 12} w={g13.x + g13.w - g10.x} o={hs}>
        <div style={{ borderTop: `2px solid ${INK}`, paddingTop: 6, ...label, textAlign: "center" }}>Personal finance</div>
      </Abs>
      {/* The game's age band, 4 to 7 */}
      <Abs x={g0.x - 6} y={g0.y - 26} w={g3.x + g3.w - g0.x + 12} h={g0.h + 34} o={early}>
        <div style={{ height: "100%", borderRadius: 12, border: `2px solid ${YES}`, background: mix(YES, 10) }} />
      </Abs>
      <Abs x={g0.x - 6} y={g0.y + g0.h + 14} w={220} o={early}>
        <div style={{ ...label, color: YES }}>Basket of Choices, ages 4 to 7</div>
      </Abs>
    </>
  );
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** 50 dots for 50 states, 35 of them lighting up. */
function States({ p, q }: { p: boolean; q: number }) {
  const cols = 10;
  const gap = p ? 30 : 26;
  const x0 = p ? 65 : 270;
  const y0 = p ? 340 : 270;
  return (
    <>
      {Array.from({ length: 50 }, (_, i) => {
        const on = i < Math.round(35 * q);
        return (
          <Abs key={i} x={x0 + (i % cols) * gap} y={y0 + Math.floor(i / cols) * gap} w={16} h={16}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: on ? INK : "transparent", border: `1.5px solid ${on ? INK : mix(MUTED, 60)}` }} />
          </Abs>
        );
      })}
    </>
  );
}

function schoolJourney(t: number, p: boolean) {
  const walk = seg(t, 0.3, 3.4);
  const states = win(t, 5.6, 99);
  return (
    <>
      <Grades t={t} p={p} walk={walk} />
      <Abs x={0} y={0} o={states}>
        <States p={p} q={seg(t, 6, 9)} />
      </Abs>
    </>
  );
}

function schoolOutcome(t: number, p: boolean) {
  const early = seg(t, 2.8, 3.6);
  const frame = p ? { x: 110, y: 330, w: 180 } : { x: 300, y: 262, w: 200 };
  return (
    <>
      <Grades t={4.4} p={p} walk={1} early={early} />
      <Abs x={frame.x} y={frame.y} w={frame.w} h={frame.w * 0.62} o={seg(t, 3.6, 4.3)} s={lerp(0.9, 1, seg(t, 3.6, 4.3))}>
        <div style={{ height: "100%", borderRadius: 10, overflow: "hidden", border: `1px solid ${DIVIDER}`, background: "#F7E9D6", position: "relative" }}>
          <img src={`${GAME}/bg/zoo.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
        </div>
      </Abs>
      <Abs x={frame.x} y={frame.y + frame.w * 0.62 + 8} w={frame.w} o={seg(t, 4.3, 4.8)}>
        <div style={{ ...tiny, textAlign: "center" }}>The zoo round, at home</div>
      </Abs>
    </>
  );
}

/* ------------------------------ growing up ------------------------------ */

const BILL = [
  ["Rent", "$1,150"],
  ["Groceries", "$410"],
  ["Phone", "$65"],
  ["Card payment", "$230"],
];

function Bill({ x, y, w, t }: { x: number; y: number; w: number; t: number }) {
  return (
    <Abs x={x} y={y} w={w}>
      <div style={{ ...boxed, padding: 16 }}>
        <div style={{ ...tiny, marginBottom: 10 }}>This month</div>
        {BILL.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, lineHeight: "26px", opacity: seg(t, 0.3 + i * 0.5, 0.7 + i * 0.5) }}>
            <span style={{ color: MUTED }}>{k}</span>
            <span style={{ color: INK, fontVariantNumeric: "tabular-nums" }}>{v}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${DIVIDER}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, opacity: seg(t, 2.4, 2.8) }}>
          <span style={{ color: INK }}>Due</span>
          <span style={{ color: INK, fontVariantNumeric: "tabular-nums" }}>$1,855</span>
        </div>
      </div>
    </Abs>
  );
}

/** 25 squares for the share of questions answered correctly: 12 of 25 is 48%. */
function Answers({ x, y, q }: { x: number; y: number; q: number }) {
  return (
    <>
      <Abs x={x} y={y - 26} w={220}>
        <div style={tiny}>Basic money questions</div>
      </Abs>
      {Array.from({ length: 25 }, (_, i) => {
        const shown = i < Math.round(25 * q);
        const right = [0, 2, 3, 5, 8, 9, 12, 14, 17, 19, 21, 24].includes(i);
        return (
          <Abs key={i} x={x + (i % 5) * 40} y={y + Math.floor(i / 5) * 40} w={30} h={30}>
            <div style={{ width: 30, height: 30, borderRadius: 7, border: `1.5px solid ${shown ? (right ? INK : mix(MUTED, 70)) : mix(MUTED, 35)}`, background: shown && right ? INK : "transparent" }} />
          </Abs>
        );
      })}
    </>
  );
}

function grownJourney(t: number, p: boolean) {
  return (
    <>
      <Bill x={p ? 50 : 110} y={p ? 20 : 92} w={p ? 300 : 260} t={t} />
      <Abs x={0} y={0} o={win(t, 3.2, 99)}>
        <Answers x={p ? 100 : 470} y={p ? 300 : 120} q={seg(t, 3.6, 7)} />
      </Abs>
    </>
  );
}

const CART = [
  ["water-bottle", 3],
  ["hat", 4],
  ["backpack", 5],
  ["chips", 2],
  ["sunglasses", 2],
] as const;

/** The checkout: needs fill most of the $20, a want pushes it over, Billy asks, it goes back and a cheaper one fits. */
function grownOutcome(t: number, p: boolean) {
  const budget = 20;
  const needsIn = Math.round(seg(t, 2.6, 4.2) * CART.length);
  const over = t > 4.6 && t < 6.2;
  const lolly = t > 6.6;
  const spent = CART.slice(0, needsIn).reduce((a, [, v]) => a + v, 0) + (over ? 9 : 0) + (lolly ? 2 : 0);
  const bx = p ? 30 : 150;
  const bw = p ? 340 : 500;
  const by = p ? 60 : 70;
  const tone = spent > budget ? NO : NEED;
  const chips = [...CART.slice(0, needsIn).map(([id]) => id as string), ...(t > 4.6 && t < 6.4 ? ["binoculars"] : []), ...(lolly ? ["lollipop"] : [])];
  // The cursor takes the binoculars back off, then pays
  const off = p ? { x: 161, y: 265 } : { x: 537, y: 177 };
  const pay = p ? { x: 190, y: 383 } : { x: 400, y: 323 };
  const q = seg(t, 6.3, 7.1);
  return (
    <>
      <Abs x={bx} y={by} w={bw}>
        <div style={{ display: "flex", justifyContent: "space-between", ...label }}>
          <span>Budget $20</span>
          <span style={{ color: spent > budget ? NO : MUTED, fontVariantNumeric: "tabular-nums" }}>{spent > budget ? `Over by $${spent - budget}` : `Left $${budget - spent}`}</span>
        </div>
        <div style={{ marginTop: 10, height: 16, borderRadius: 8, background: RAISED, border: `1px solid ${DIVIDER}`, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, (spent / budget) * 100)}%`, background: tone, borderRadius: 8, transition: "width 250ms" }} />
        </div>
      </Abs>
      {chips.map((id, i) => {
        const cols = p ? 4 : 7;
        return <Img key={id} src={item(id)} x={(p ? 50 : 160) + (i % cols) * (p ? 82 : 70)} y={(p ? 150 : 150) + Math.floor(i / cols) * 86} w={p ? 58 : 54} o={id === "binoculars" ? 1 - seg(t, 6.2, 6.4) : 1} />;
      })}
      <Abs x={p ? 120 : 330} y={p ? 360 : 300} w={140} h={46}>
        <div style={{ height: 46, borderRadius: 12, background: NEED, color: "#fff", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 600 }}>Pay now</div>
      </Abs>
      <Bubble x={p ? 90 : 500} y={p ? 420 : 290} w={220} tone={NO} text="That is $5 more than we have. Could something wait?" o={win(t, 4.9, 6.4)} />
      <Bubble x={p ? 90 : 500} y={p ? 420 : 290} w={200} text="You saved $2." o={win(t, 7.6, 99)} />
      <Cursor x={lerp(off.x, pay.x, q)} y={lerp(off.y, pay.y, q)} kind="point" click={ping(t, 6.1) || ping(t, 7.4)} o={win(t, 5.3, 8.2)} />
    </>
  );
}

/* ------------------------------ the service ------------------------------ */

const TURN = ["Make the book", "Ship it each quarter", "Read it together", "Play it back", "The next book"];

/** Macro: one turn of the service, a book travelling the loop. */
function loopService(t: number, p: boolean) {
  const cx = p ? 200 : 400;
  const cy = p ? 270 : 215;
  const rx = p ? 130 : 300;
  const ry = p ? 210 : 140;
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i / TURN.length) * Math.PI * 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  };
  const lap = seg(t, 0.4, 6.4) * (TURN.length - 1);
  const a = -Math.PI / 2 + (lap / TURN.length) * Math.PI * 2;
  const [bx, by] = [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  const game = seg(t, 6.6, 7.2);
  return (
    <>
      <Svg w={W(p)} h={p ? 540 : 450}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={mix(MUTED, 45)} strokeWidth={1.5} strokeDasharray="4 6" />
      </Svg>
      {TURN.map((name, i) => {
        const [x, y] = pos(i);
        const lit = clamp(lap - i + 1) * (i === 3 ? 1 : 1 - game * 0.6);
        const w = p ? 136 : 150;
        return <Node key={name} x={x - w / 2} y={y - 20} w={w} h={40} title={name} lit={i === 3 ? Math.max(lit, game) : lit} tone={i === 3 ? YES : INK} center />;
      })}
      <Abs x={bx - 13} y={by - 36} w={26} h={20} o={1 - game}>
        <div style={{ width: 26, height: 18, borderRadius: 3, background: INK, boxShadow: `inset 12px 0 0 ${mix(PAGE, 25)}` }} />
      </Abs>
      <Abs x={pos(3)[0] - 80} y={pos(3)[1] + 26} w={160} o={game}>
        <div style={{ ...tiny, color: YES, textAlign: "center" }}>The game, alone</div>
      </Abs>
    </>
  );
}

const MAKERS = [
  ["Author", "turns one money idea into a story"],
  ["Illustrator", "draws Billy and Buddy"],
  ["Financial advisor", "checks every claim before print"],
  ["Editor", "holds the reading level"],
  ["Publisher", "print run and shelf price"],
];
const REACH = ["Logistics", "Libraries", "Schools"];

/** Micro: who makes a book. Five makers light as one book passes, then the reach widens to the family. */
function makersService(t: number, p: boolean) {
  const pass = seg(t, 0.4, 4.4) * MAKERS.length;
  const reach = seg(t, 5, 6.2);
  const fam = seg(t, 6.6, 7.2);
  const advisor = win(t, 2.2, 99);
  return (
    <>
      {MAKERS.map(([role, duty], i) => {
        const b = p ? { x: 40, y: 16 + i * 62, w: 320, h: 52 } : { x: 22 + i * 154, y: 50, w: 142, h: 92 };
        return <Node key={role} {...b} title={role} sub={duty} lit={clamp(pass - i)} tone={i === 2 ? YES : INK} />;
      })}
      <Abs x={p ? 316 : 22 + 2 * 154 + 112} y={p ? 16 + 2 * 62 + 12 : 40} w={28} h={28} o={advisor}>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: YES, color: PAGE, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16 }}>✓</div>
      </Abs>
      <Svg w={W(p)} h={p ? 560 : 450}>
        {REACH.map((_, i) => {
          const x = p ? 70 + i * 130 : 200 + i * 200;
          const d = p ? `M200 330 C200 350 ${x} 340 ${x} 362` : `M400 150 C400 190 ${x} 180 ${x} 222`;
          return <Link key={i} d={d} lit={reach} />;
        })}
        {REACH.map((_, i) => {
          const x = p ? 70 + i * 130 : 200 + i * 200;
          const d = p ? `M${x} 410 C${x} 440 200 430 200 456` : `M${x} 268 C${x} 310 400 300 400 336`;
          return <Link key={`f${i}`} d={d} lit={fam} />;
        })}
      </Svg>
      {REACH.map((r, i) => {
        const x = p ? 70 + i * 130 : 200 + i * 200;
        return <Node key={r} x={x - 55} y={p ? 364 : 224} w={110} h={44} title={r} lit={reach} center o={lerp(0.25, 1, reach)} />;
      })}
      <Node x={(p ? 200 : 400) - 90} y={p ? 458 : 338} w={180} h={44} title="Parent and child" lit={fam} tone={YES} center o={lerp(0.25, 1, fam)} />
    </>
  );
}

const JOIN = [
  { step: "Hears about it", cells: ["A school or library mentions it", "Newsletter, a library display", "Outreach places sample copies"] },
  { step: "Chooses a plan", cells: ["Compares the two plans", "$10 a month or $100 a year", "Payments and subscriptions"] },
  { step: "Waits for volume one", cells: ["Waits for the box", "Order email, tracking link", "Logistics ships the quarter"] },
];
const LANES = ["The family", "What they see", "Behind the scenes"];

/** Micro: how a family joins, as a blueprint whose columns light as the family moves through them. */
function joinService(t: number, p: boolean) {
  const at = seg(t, 0.4, 6.4) * JOIN.length;
  if (p) {
    return (
      <>
        {JOIN.map((c, i) => {
          const lit = clamp(at - i);
          return (
            <Abs key={c.step} x={30} y={14 + i * 172} w={340}>
              <div style={{ ...label, marginBottom: 8, color: `color-mix(in srgb, ${INK} ${Math.round(lerp(60, 100, lit))}%, ${MUTED})` }}>
                {i + 1}. {c.step}
              </div>
              {c.cells.map((cell, k) => (
                <div key={cell} style={{ display: "flex", gap: 10, fontSize: 12.5, lineHeight: "17px", padding: "7px 10px", marginTop: 4, borderRadius: 8, border: `1px solid color-mix(in srgb, ${INK} ${Math.round(lit * (k === 1 ? 70 : 35))}%, ${DIVIDER})`, background: RAISED, color: k === 0 ? INK : MUTED }}>
                  <span style={{ ...tiny, width: 96, flexShrink: 0 }}>{LANES[k]}</span>
                  <span>{cell}</span>
                </div>
              ))}
            </Abs>
          );
        })}
      </>
    );
  }
  const x0 = 150;
  const cw = 210;
  return (
    <>
      {LANES.map((l, k) => (
        <Abs key={l} x={18} y={102 + k * 96} w={120} h={82}>
          <div style={{ ...tiny, height: 82, display: "flex", alignItems: "center" }}>{l}</div>
        </Abs>
      ))}
      <Abs x={x0} y={180} w={3 * cw} h={2}>
        <div style={{ height: 0, borderTop: `1px dashed ${mix(MUTED, 50)}` }} />
      </Abs>
      {JOIN.map((c, i) => {
        const lit = clamp(at - i);
        return (
          <div key={c.step}>
            <Abs x={x0 + i * cw} y={50} w={cw - 12}>
              <div style={{ ...label, color: `color-mix(in srgb, ${INK} ${Math.round(lerp(55, 100, lit))}%, ${MUTED})` }}>
                {i + 1}. {c.step}
              </div>
            </Abs>
            {c.cells.map((cell, k) => (
              <Node key={cell} x={x0 + i * cw} y={102 + k * 96} w={cw - 12} h={82} title={cell} lit={lit * (k === 1 ? 1 : 0.55)} />
            ))}
          </div>
        );
      })}
      <Abs x={x0 + Math.min(at, 2.6) * cw - 10} y={78} w={20} h={20}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: YES, boxShadow: `0 0 0 4px ${mix(YES, 25)}` }} />
      </Abs>
    </>
  );
}

/** Micro: the website. A child plays straight away; a second path to the shop stops at the parent gate. */
function websiteService(t: number, p: boolean) {
  const n = p
    ? { home: [130, 20], play: [30, 130], game: [30, 220], coins: [30, 310], shop: [230, 130], gate: [230, 220], ok: [215, 320], wish: [315, 320] }
    : { home: [40, 190], play: [240, 80], game: [440, 80], coins: [640, 80], shop: [240, 300], gate: [440, 300], ok: [640, 250], wish: [640, 350] };
  const W0 = p ? 140 : 120;
  const c = (k: keyof typeof n, dx = W0 / 2, dy = 22) => [n[k][0] + dx, n[k][1] + dy] as const;
  const a1 = seg(t, 0.4, 1.4);
  const a2 = seg(t, 1.4, 2.4);
  const a3 = seg(t, 2.4, 3.2);
  const b1 = seg(t, 4, 5);
  const b2 = seg(t, 5, 6);
  const stop = seg(t, 6, 6.4);
  const split = seg(t, 6.8, 7.8);
  const path = (from: keyof typeof n, to: keyof typeof n) => {
    const [x1, y1] = c(from, p ? W0 / 2 : W0, 22);
    const [x2, y2] = c(to, p ? W0 / 2 : 0, p ? 0 : 22);
    return p ? `M${x1} ${y1 + 22} C${x1} ${(y1 + y2) / 2 + 20} ${x2} ${(y1 + y2) / 2} ${x2} ${y2 - 2}` : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2 - 2} ${y2}`;
  };
  return (
    <>
      <Svg w={W(p)} h={p ? 400 : 450}>
        <Link d={path("home", "play")} lit={a1} />
        <Link d={path("play", "game")} lit={a2} />
        <Link d={path("game", "coins")} lit={a3} />
        <Link d={path("home", "shop")} lit={b1} />
        <Link d={path("shop", "gate")} lit={b2} />
        <Link d={path("gate", "ok")} lit={split} tone={YES} />
        <Link d={path("gate", "wish")} lit={split} />
      </Svg>
      <Node x={n.home[0]} y={n.home[1]} w={W0} h={44} title="Homepage" lit={1} center />
      <Node x={n.play[0]} y={n.play[1]} w={W0} h={44} title="Play" lit={a1} center />
      <Node x={n.game[0]} y={n.game[1]} w={W0} h={44} title="Basket of Choices" lit={a2} tone={YES} center />
      <Node x={n.coins[0]} y={n.coins[1]} w={W0} h={44} title="Coins and badges" lit={a3} center />
      <Node x={n.shop[0]} y={n.shop[1]} w={W0} h={44} title="Shop" lit={b1} center />
      <Abs x={n.gate[0]} y={n.gate[1]} w={W0} h={44} style={{ transform: `translate(${n.gate[0] + Math.sin(t * 40) * 3 * win(t, 6, 6.6, 0.1)}px, ${n.gate[1]}px)` }}>
        <div style={{ ...boxed, height: 44, display: "grid", placeItems: "center", border: `1.5px solid ${stop ? NO : DIVIDER}`, background: stop ? mix(NO, 12) : RAISED, ...label }}>Parent gate</div>
      </Abs>
      <Node x={n.ok[0] - (p ? 40 : 0)} y={n.ok[1] - (p ? 0 : 8)} w={p ? 110 : W0} h={p ? 44 : 60} title="Approved" sub={p ? undefined : "order and tracking"} lit={split} tone={YES} o={lerp(0.3, 1, split)} center />
      <Node x={n.wish[0] - (p ? 30 : 0)} y={n.wish[1] - (p ? 0 : 8)} w={p ? 110 : W0} h={p ? 44 : 60} title="Not yet" sub={p ? undefined : "saved to a wishlist"} lit={split} o={lerp(0.3, 1, split)} center />
    </>
  );
}

/** Micro: the book's lesson, then the same lesson as the game, with no adult in the room. */
function replayService(t: number, p: boolean) {
  const swap = seg(t, 3.4, 4.6);
  const bw = p ? 340 : 520;
  const bh = p ? 260 : 300;
  const bx = (W(p) - bw) / 2;
  const by = p ? 30 : 60;
  return (
    <>
      <Abs x={bx} y={by} w={bw} h={bh} o={1 - swap} s={lerp(1, 0.96, swap)}>
        <div style={{ height: bh, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 10, overflow: "hidden", border: `1px solid ${DIVIDER}`, background: "#F6EFE3", boxShadow: "inset -1px 0 0 rgba(0,0,0,.08)" }}>
          <div style={{ position: "relative", borderRight: "1px solid rgba(0,0,0,.12)" }}>
            <img src={`${GAME}/billy-wave.svg`} alt="" style={{ position: "absolute", bottom: 0, left: "50%", width: "70%", transform: "translateX(-50%)" }} />
          </div>
          <div style={{ padding: p ? 14 : 22, color: "#2F2F2F" }}>
            <div style={{ fontSize: p ? 15 : 19, fontWeight: 700, lineHeight: 1.25 }}>Need or want?</div>
            {(["water-bottle", "lollipop"] as const).map((id, i) => (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: p ? 14 : 22, opacity: seg(t, 0.6 + i * 0.8, 1 + i * 0.8) }}>
                <img src={item(id)} alt="" style={{ width: p ? 40 : 52 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: i ? "#CB9220" : "#089690" }}>{i ? "Want" : "Need"}</span>
              </div>
            ))}
          </div>
        </div>
      </Abs>
      <Abs x={bx} y={by + bh + 10} w={bw} o={1 - swap}>
        <div style={{ ...tiny, textAlign: "center" }}>In the book, read together</div>
      </Abs>
      <Abs x={0} y={0} o={swap}>
        <Basket x={p ? 30 : 170} y={p ? 210 : 250} w={p ? 160 : 220} h={70} kind="need" glow={win(t, 6.2, 7.2)} />
        <Basket x={p ? 210 : 410} y={p ? 210 : 250} w={p ? 160 : 220} h={70} kind="want" />
        <Img src={item("water-bottle")} x={lerp(p ? 168 : 365, p ? 88 : 250, seg(t, 5, 6.2))} y={lerp(p ? 70 : 80, p ? 200 : 230, seg(t, 5, 6.2))} w={66} o={1 - seg(t, 6.2, 6.5)} />
        <Img src={`${GAME}/billy.svg`} x={p ? 300 : 660} y={p ? 40 : 40} w={p ? 70 : 96} />
        <Abs x={0} y={p ? 300 : 340} w={W(p)}>
          <div style={{ ...tiny, textAlign: "center" }}>In the game, alone</div>
        </Abs>
      </Abs>
    </>
  );
}

/* ------------------------------ the service blueprint, section by section ------------------------------ */

/**
 * One step of the journey as a vertical slice of the blueprint: what the
 * family does, what they meet (frontstage), the work they never see
 * (backstage) and what supports it. Each is one box; `null` leaves a lane
 * empty for that step.
 */
type Slice = { who: string; does: string; front: string | null; back: [string, string?] | null; support: [string, string?] | null };

const LANE_Y = { does: 18, front: 138, back: 258, support: 368 };
const BOX_H = 52;
const RULE_Y: [number, string, boolean][] = [
  [118, "Line of interaction", true],
  [238, "Line of visibility", false],
  [348, "Line of internal interaction", true],
];
const LANE_NAME: [keyof typeof LANE_Y, string][] = [
  ["does", "The family"],
  ["front", "Frontstage"],
  ["back", "Backstage"],
  ["support", "Support"],
];
const YELLOW = "#F3AF26";

/**
 * Draws a section: its steps side by side, revealed lane by lane from the
 * family down, each lane's box joined by an arrow up to the one it serves.
 * The family and frontstage come in during the first clip, the backstage
 * and support during the second.
 */
function slices(steps: Slice[]) {
  return function draw(t: number, p: boolean) {
    const wide = W(p);
    const left = p ? 92 : 150;
    const gap = 24;
    const bw = Math.min(p ? 280 : 250, (wide - left - 16 - gap * (steps.length - 1)) / steps.length);
    const total = bw * steps.length + gap * (steps.length - 1);
    const x0 = left + (wide - left - 16 - total) / 2;
    const at = (i: number) => x0 + i * (bw + gap);
    const show = { does: seg(t, 0.2, 0.7), front: seg(t, 1, 1.5), back: seg(t, 3.2, 3.7), support: seg(t, 4, 4.5) };
    const arrowUp = (i: number, from: keyof typeof LANE_Y, to: keyof typeof LANE_Y, q: number) => {
      const x = at(i) + bw / 2;
      return <Link key={`${i}${from}`} d={`M${x} ${LANE_Y[from] - 2} V${LANE_Y[to] + BOX_H + 4}`} lit={q} tone={YELLOW} dim={0} />;
    };
    return (
      <>
        {LANE_NAME.map(([k, name]) => (
          <Abs key={k} x={12} y={LANE_Y[k] + BOX_H / 2 - 7} w={left - 20}>
            <div style={tiny}>{name}</div>
          </Abs>
        ))}
        <Svg w={wide} h={450}>
          {RULE_Y.map(([y, , dashed]) => (
            <line key={y} x1={12} x2={wide - 12} y1={y} y2={y} stroke={MUTED} strokeOpacity={0.45} strokeDasharray={dashed ? "5 5" : undefined} />
          ))}
          {steps.map((s, i) =>
            i < steps.length - 1 ? <Link key={`h${i}`} d={`M${at(i) + bw + 3} ${LANE_Y.does + BOX_H / 2} H${at(i + 1) - 5}`} lit={show.does} /> : null,
          )}
          {steps.map((s, i) => (
            <g key={`v${i}`}>
              {s.front ? arrowUp(i, "front", "does", seg(t, 1.5, 2)) : null}
              {s.back && s.front ? arrowUp(i, "back", "front", seg(t, 3.7, 4.1)) : null}
              {s.back && !s.front ? arrowUp(i, "back", "does", seg(t, 3.7, 4.1)) : null}
              {s.support && s.back ? arrowUp(i, "support", "back", seg(t, 4.5, 4.9)) : null}
            </g>
          ))}
        </Svg>
        {RULE_Y.map(([y, name]) => (
          <Abs key={name} x={12} y={y + 4} w={200}>
            <div style={{ fontSize: 10, color: MUTED }}>{name}</div>
          </Abs>
        ))}
        {steps.map((s, i) => (
          <div key={i}>
            <Node x={at(i)} y={LANE_Y.does + (1 - show.does) * 8} w={bw} h={BOX_H} title={s.does} sub={s.who} o={show.does} lit={show.does} />
            {s.front ? <Node x={at(i)} y={LANE_Y.front + (1 - show.front) * 8} w={bw} h={BOX_H} title={s.front} o={show.front} /> : null}
            {s.back ? <Node x={at(i)} y={LANE_Y.back + (1 - show.back) * 8} w={bw} h={BOX_H} title={s.back[0]} sub={s.back[1]} o={show.back} lit={show.back} tone={NEED} /> : null}
            {s.support ? <Node x={at(i)} y={LANE_Y.support + (1 - show.support) * 8} w={bw} h={BOX_H} title={s.support[0]} sub={s.support[1]} o={show.support} lit={show.support} tone={NEED} /> : null}
          </div>
        ))}
      </>
    );
  };
}

const FINDING = slices([
  { who: "Parent", does: "Sees advertising", front: "Advertisements, digital and print", back: ["Marketing and promotions"], support: ["Libraries and schools", "pass it on to families"] },
  { who: "Parent", does: "Subscribes", front: "Ordering the book: $10 a month or $100 a year", back: ["Order processing"], support: ["Payment processing", "banks and cards"] },
]);
const ARRIVING = slices([
  { who: "Child", does: "Receives the book", front: "Unboxing the package", back: ["Logistics, manufacturing and storage"], support: ["Distribution channels"] },
]);
const READING = slices([
  { who: "Child", does: "Reads, using the interactions", front: "Book interaction: stickers, coins, slide tabs", back: ["Story, design and print", "writer, illustrator, editor, publisher"], support: null },
  { who: "Parent", does: "Supports the child", front: null, back: null, support: null },
]);
const PLAYING = slices(
  [
    { who: "Child", does: "Finishes the book, unlocks the code", front: "Website interaction", back: ["UX and UI web design"], support: ["Tech support"] },
    { who: "Child", does: "Plays the game on the website", front: "Playing the game", back: ["Web development"], support: ["Customer service and feedback"] },
  ],
);

const BLUEPRINT: StageDef[] = [
  {
    name: "Finding it",
    tallH: 450,
    track: {
      clips: [
        clip(FINDING, 0, 2.6, 3.4, "A parent **sees an ad** and **subscribes**."),
        clip(FINDING, 2.6, 5.4, 4, "Behind it: **marketing, order processing**,", "and the **libraries, schools and payments** that support them."),
      ],
    },
  },
  {
    name: "The book arrives",
    tallH: 450,
    track: {
      clips: [
        clip(ARRIVING, 0, 2.6, 3, "The child **receives the book** and unboxes it."),
        clip(ARRIVING, 2.6, 5.4, 3.6, "Behind it: **logistics and storage**, through the **distribution channels**."),
      ],
    },
  },
  {
    name: "Reading together",
    tallH: 450,
    track: {
      clips: [
        clip(READING, 0, 2.6, 3.4, "The child **reads, using the paper interactions**,", "with **a parent there to help**."),
        clip(READING, 2.6, 5.4, 3.6, "Behind it: **the writer, illustrator, editor and publisher**."),
      ],
    },
  },
  {
    name: "Playing the game",
    tallH: 450,
    track: {
      clips: [
        clip(PLAYING, 0, 2.6, 3.4, "The last page unlocks **the code**, and the child **plays the game alone**."),
        clip(PLAYING, 2.6, 6, 4.2, "Behind it: **web design and development**, with **tech support and feedback**."),
      ],
      coda: "↻ **Next quarter the parent renews**, and the next book arrives.",
    },
  },
];

/** The service blueprint, a section at a time as the reader scrolls. */
export function BillyServiceBlueprint() {
  return <PhaseExplorer stages={BLUEPRINT} label="The service blueprint, section by section" />;
}

/* ------------------------------ the stages ------------------------------ */

const count = (n: number, unit = "") => (q: number) => `${Math.max(0, Math.round(n * q))}${unit}`;

const JOURNEY: StageDef[] = [
  {
    name: "The shop",
    tallH: 470,
    track: {
      clips: [
        clip(shopJourney, 0, 3, 3.4, "At the shop, a young child **reaches for what they want**."),
        clip(shopJourney, 3, 6, 4, "Habits like planning ahead and waiting", "**form before a child turns seven**."),
        clip(shopJourney, 6, 9, 4, "Money habits form **by age seven**."),
      ],
      stat: { clips: [2, 2], value: count(7), label: "Age money habits form by · MAS 2013" },
    },
  },
  {
    name: "School",
    tallH: 500,
    track: {
      clips: [
        clip(schoolJourney, 0, 3.4, 3.8, "School teaches **reading and maths** from the start."),
        clip(schoolJourney, 3.4, 5.4, 3.4, "Where personal finance is required,", "it waits for **high school**."),
        clip(schoolJourney, 5.4, 9.4, 4.4, "**35 states** require it to graduate."),
      ],
      stat: { clips: [2, 2], value: count(35), label: "States requiring it · CEE 2024" },
    },
  },
  {
    name: "Growing up",
    tallH: 520,
    track: {
      clips: [
        clip(grownJourney, 0, 3, 3.4, "The same child grows up and **pays the bills**."),
        clip(grownJourney, 3, 7.4, 4.8, "Adults get **under half** of the basics right."),
      ],
      stat: { clips: [1, 1], value: count(48, "%"), label: "Answered right, US adults · P-Fin 2024" },
    },
  },
];

const OUTCOME: StageDef[] = [
  {
    name: "The shop",
    tallH: 420,
    track: {
      clips: [
        clip(shopOutcome, 0, 2.4, 2.6, "At the shop, a young child **reaches for what they want**."),
        clip(shopOutcome, 2.4, 7.6, 6, "The game asks **need or want**,", "and Billy **answers every choice**."),
      ],
    },
  },
  {
    name: "School",
    tallH: 480,
    track: {
      clips: [
        clip(schoolOutcome, 0, 2.6, 2.8, "Where personal finance is required, it waits for **high school**."),
        clip(schoolOutcome, 2.6, 6, 4.4, "The game reaches children **years earlier**,", "at **four to seven**."),
      ],
    },
  },
  {
    name: "Growing up",
    tallH: 480,
    track: {
      clips: [
        clip(grownOutcome, 0, 2.4, 2.6, "The same child grows up and **pays the bills**."),
        clip(grownOutcome, 2.4, 8.4, 6.6, "At the checkout **needs come first**,", "and going **over budget costs a star**."),
      ],
    },
  },
];

const SERVICE: StageDef[] = [
  {
    name: "One turn",
    tallH: 540,
    track: {
      clips: [
        clip(loopService, 0, 6.4, 6.6, "Billy & Buddy is **a book every quarter**,", "made, shipped and read together at home."),
        clip(loopService, 6.4, 8, 3.2, "The game is **the part a child does alone**, between books."),
      ],
    },
  },
  {
    name: "Who makes it",
    tallH: 510,
    track: {
      clips: [
        clip(makersService, 0, 4.6, 5, "Five makers turn **one money idea into one book**."),
        clip(makersService, 4.6, 7.6, 4, "It reaches families through **shops, libraries and schools**."),
      ],
    },
  },
  {
    name: "Joining",
    tallH: 530,
    track: {
      clips: [
        clip(joinService, 0, 2.6, 3.2, "A parent **hears about it** from a school or library."),
        clip(joinService, 2.6, 6.6, 4.8, "They choose **$10 a month or $100 a year**,", "then wait for the first box."),
      ],
    },
  },
  {
    name: "The website",
    tallH: 390,
    track: {
      clips: [
        clip(websiteService, 0, 3.4, 3.8, "From the homepage, a child can **play straight away**."),
        clip(websiteService, 3.4, 8, 5.2, "Buying anything stops at **the parent gate**."),
      ],
    },
  },
  {
    name: "Playing it back",
    tallH: 340,
    track: {
      clips: [
        clip(replayService, 0, 3.2, 3.6, "Each book teaches **one money idea**, read together."),
        clip(replayService, 3.2, 7.4, 4.8, "The game **replays the same lesson**,", "with **no adult in the room**."),
      ],
    },
  },
];

export function BillyJourney() {
  return <PhaseExplorer stages={JOURNEY} label="How a child meets money today" title="Journey map" />;
}

export function BillyOutcome() {
  return <PhaseExplorer stages={OUTCOME} label="The same stages, with Basket of Choices" eyebrow="Outcome" tone="yes" />;
}

export function BillyService() {
  return <PhaseExplorer stages={SERVICE} label="The proposed service, overview then close ups" />;
}

/** The system: one turn of the service, then who makes a book and how it reaches families. */
export function BillySystemMap() {
  return <PhaseExplorer stages={SERVICE.slice(0, 2)} label="The proposed service, as a system" title="System map" />;
}

/** The blueprint: what a family does, what they see and what happens behind it, from joining to playing. */
export function BillyBlueprint() {
  return <PhaseExplorer stages={SERVICE.slice(2)} label="The proposed service, front stage and back stage" title="Service blueprint" />;
}
