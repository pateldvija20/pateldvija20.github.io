import { useState } from "react";
import { DIVIDER, H4, INK, MUTED, SM, ink, ink2 } from "./caseStudyKit";

/**
 * A design breakdown: one screen or card in the middle, and callouts on either side,
 * each a short title with a line of reasoning under it, joined to the part it is about
 * by a dashed elbow line that ends on a dot.
 *
 * Everything is placed in a 1000-unit-wide frame and drawn in container query units, so
 * the callouts, lines and type scale together with the column. On a phone there is no
 * room beside the image, so the lines give way to numbered dots on it and the callouts
 * follow underneath as a numbered list. Hovering a callout lights it and its line.
 */
export type Note = {
  title: string;
  text: string;
  /** Which side of the image the callout sits on. */
  side: "left" | "right";
  /** The callout's vertical centre, as a fraction of the image's height. */
  y: number;
  /** Where the line lands, as fractions of the image's width and height. */
  at: [number, number];
};

const W = 1000;
const GAP = 64; // between a callout and the image edge; the line turns halfway across it
const PAD = 64; // above and below the image, for callouts that sit past its ends
const R = 14; // corner radius of the line's turns
const u = (n: number) => `${(n / W) * 100}cqw`;

/** A dashed line out of the callout, turning once towards the target's height, then in to it. */
function elbow(sx: number, sy: number, mx: number, ex: number, ey: number) {
  const dir = Math.sign(ex - sx);
  const dy = ey - sy;
  if (Math.abs(dy) < 2) return `M${sx} ${sy} H${ex}`;
  const v = Math.sign(dy);
  const r = Math.min(R, Math.abs(dy) / 2);
  return `M${sx} ${sy} H${mx - dir * r} Q${mx} ${sy} ${mx} ${sy + v * r} V${ey - v * r} Q${mx} ${ey} ${mx + dir * r} ${ey} H${ex}`;
}

export function Annotated({ src, alt, ratio, notes, width = 320 }: { src: string; alt: string; ratio: number; notes: Note[]; width?: number }) {
  const [on, setOn] = useState(-1);
  const imgH = width * ratio;
  const H = imgH + PAD * 2;
  const left = (W - width) / 2;
  const right = left + width;
  const labelW = left - GAP;
  const lit = (i: number) => on < 0 || on === i;

  return (
    <figure data-ui="Annotated design" data-src="src/pieces/Annotated.tsx › Annotated" className="m-0">
      {/* Desktop and tablet: callouts on both sides, lines in to the parts */}
      <div className="relative hidden w-full md:block" style={{ containerType: "inline-size" }}>
        <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
          <img src={src} alt={alt} decoding="async" loading="lazy" className="absolute block rounded-[2cqw]" style={{ left: u(left), top: u(PAD), width: u(width), height: u(imgH), boxShadow: `0 0 0 1px ${DIVIDER}` }} />
          <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" fill="none">
            {notes.map((n, i) => {
              const sy = PAD + n.y * imgH;
              const l = n.side === "left";
              const sx = l ? labelW + 10 : right + GAP - 10;
              const mx = l ? left - GAP / 2 : right + GAP / 2;
              const ex = left + n.at[0] * width;
              const ey = PAD + n.at[1] * imgH;
              const col = on === i ? INK : MUTED;
              return (
                <g key={i} style={{ opacity: lit(i) ? 1 : 0.25, transition: "opacity 160ms ease-out" }}>
                  <path d={elbow(sx, sy, mx, ex, ey)} stroke={col} strokeWidth={1.4} strokeDasharray="3 4" strokeLinecap="round" />
                  <circle cx={sx} cy={sy} r={2.6} fill={col} />
                  {/* The end dot sits on the light still, so it carries a dark core and a white ring */}
                  <circle cx={ex} cy={ey} r={4} fill="#141414" stroke="#fff" strokeWidth={1.8} />
                </g>
              );
            })}
          </svg>
          {notes.map((n, i) => (
            <div
              key={i}
              onMouseEnter={() => setOn(i)}
              onMouseLeave={() => setOn(-1)}
              className="absolute -translate-y-1/2"
              style={{
                left: n.side === "left" ? 0 : u(right + GAP),
                top: u(PAD + n.y * imgH),
                width: u(labelW),
                textAlign: n.side === "left" ? "right" : "left",
                opacity: lit(i) ? 1 : 0.4,
                transition: "opacity 160ms ease-out",
              }}
            >
              <p className="m-0 font-medium" style={{ ...ink, fontSize: `max(13px, ${u(19)})`, lineHeight: 1.3 }}>
                {n.title}
              </p>
              <p className="m-0" style={{ ...ink2, marginTop: u(6), fontSize: `max(12px, ${u(16)})`, lineHeight: 1.45 }}>
                {n.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Phone: the image alone, with numbered dots where the lines would land */}
      <div className="md:hidden">
        <div className="relative mx-auto w-full max-w-[320px]">
          <img src={src} alt={alt} decoding="async" loading="lazy" className="block w-full rounded-[12px]" style={{ boxShadow: `0 0 0 1px ${DIVIDER}` }} />
          {notes.map((n, i) => (
            <span key={i} aria-hidden className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-medium" style={{ left: `${n.at[0] * 100}%`, top: `${n.at[1] * 100}%`, background: "#141414", color: "#fff", boxShadow: "0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,0.3)" }}>
              {i + 1}
            </span>
          ))}
        </div>
        <ol className="m-0 mt-8 list-none space-y-6 p-0">
          {notes.map((n, i) => (
            <li key={i} className="flex gap-4">
              <span className={`grid size-7 shrink-0 place-items-center rounded-[8px] ${SM}`} style={{ border: `1px dashed ${DIVIDER}`, color: INK }}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className={`m-0 ${H4}`} style={ink}>
                  {n.title}
                </p>
                <p className={`m-0 mt-1 ${SM}`} style={ink2}>
                  {n.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
