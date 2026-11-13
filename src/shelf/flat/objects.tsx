import type { ReactNode } from "react";
import { INK, lit, mix, shade } from "./paint";

/**
 * The shelf objects in 2D (shading: refs/58 version 2). Every object is drawn
 * around its own origin: x = 0 is its centre, y = 0 is the surface it stands
 * on, and up is negative y. Light comes from the upper left, so the left or
 * top panel of each part is lit and the right or lower panel is in shade.
 */

/** Wrap an object: position it and put grain on its fills. */
function Obj({ x, children, className }: { x: number; children: ReactNode; className?: string }) {
  return (
    <g transform={`translate(${x} 0)`} className={className}>
      <g filter="url(#grain)">{children}</g>
    </g>
  );
}

/** A face-out or spine-out book seen slightly from the right, like the picked test. */
function Book({ x, w, h, d, c, title, ink = "#F6F3EC", bands = true, titleFrom = 0.2 }: { x: number; w: number; h: number; d: number; c: string; title?: string; ink?: string; bands?: boolean; titleFrom?: number }) {
  const top = -h;
  const lift = d * 0.32;
  return (
    <g>
      {/* The cover edge, in shade, on the right */}
      <path d={`M ${x + w} ${top} L ${x + w + d} ${top - lift} L ${x + w + d} ${-lift} L ${x + w} 0 Z`} fill={shade(c)} />
      {/* The page block on top */}
      <path d={`M ${x + 2} ${top} L ${x + d + 2} ${top - lift} L ${x + w + d - 2} ${top - lift} L ${x + w - 2} ${top} Z`} fill={lit("#EFE7D3")} />
      {/* The spine, lit */}
      <rect x={x} y={top} width={w} height={h} rx={5} fill={lit(c)} />
      {bands ? (
        <>
          <rect x={x} y={top} width={w} height={h * 0.13} rx={5} fill={lit(mix(c, "light", 0.32))} />
          <rect x={x} y={-h * 0.13} width={w} height={h * 0.13} rx={5} fill={lit(mix(c, "light", 0.32))} />
        </>
      ) : null}
      {title ? (
        <text
          x={x + w / 2}
          y={-h * titleFrom}
          transform={`rotate(-90 ${x + w / 2} ${-h * titleFrom})`}
          fill={ink}
          fontFamily="Fraunces, Georgia, serif"
          fontSize={Math.min(18, w * 0.36)}
          fontWeight={500}
          dominantBaseline="middle"
        >
          {title}
        </text>
      ) : null}
    </g>
  );
}

/* ------------------------------------------------------------------ */

/** 1. The bucket-hat lamp character. */
export function Lamp({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <g filter="url(#grain)">
        <rect x={-38} y={-16} width={34} height={16} rx={8} fill={lit("#E7DFD0")} />
        <rect x={4} y={-16} width={34} height={16} rx={8} fill={shade("#E7DFD0")} />
        <path d="M -44 -12 C -46 -80 -36 -130 -22 -160 L 0 -166 L 0 -12 Z" fill={lit("#EDE6DA")} />
        <path d="M 44 -12 C 46 -80 36 -130 22 -160 L 0 -166 L 0 -12 Z" fill={shade("#EDE6DA")} />
        <path d="M -47 -30 C -48 -80 -40 -118 -26 -138 L -12 -132 L -14 -30 Z" fill={lit("#4F72B4")} />
        <path d="M 47 -30 C 48 -80 40 -118 26 -138 L 12 -132 L 14 -30 Z" fill={shade("#4F72B4")} />
        <rect x={-62} y={-132} width={18} height={80} rx={9} fill={lit("#4F72B4")} transform="rotate(6 -53 -132)" />
        <rect x={44} y={-132} width={18} height={80} rx={9} fill={shade("#4F72B4")} transform="rotate(-6 53 -132)" />
      </g>
      <ellipse className="lamp-glow" cx={0} cy={-158} rx={58} ry={34} fill="url(#lampGlow)" />
      <g className="lamp-eyes" style={{ transformOrigin: "0px -150px" }}>
        <circle cx={-11} cy={-150} r={4} fill={INK} />
        <circle cx={11} cy={-150} r={4} fill={INK} />
      </g>
      <g filter="url(#grain)">
        <path d="M -74 -170 Q 0 -186 74 -170 L 62 -160 Q 0 -170 -62 -160 Z" fill={shade("#2A9D9A")} />
        <path d="M -48 -174 L -40 -236 Q -36 -246 -16 -248 L -16 -178 Z" fill={lit(mix("#2A9D9A", "light", 0.2))} />
        <path d="M -16 -178 L -16 -248 L 16 -248 L 16 -178 Z" fill={lit("#2A9D9A")} />
        <path d="M 48 -174 L 40 -236 Q 36 -246 16 -248 L 16 -178 Z" fill={shade("#2A9D9A")} />
        <rect x={-46} y={-192} width={92} height={10} fill={shade(mix("#2A9D9A", "dark", 0.2))} />
      </g>
    </g>
  );
}

const CASE_BOOKS = [
  { title: "Bind Desk", c: "#2BA84A", ink: "#F6F3EC" },
  { title: "Billy and Buddy", c: "#F2622E", ink: "#F6F3EC" },
  { title: "Greenera", c: "#F0A7B8", ink: "#7A3346" },
  { title: "The Family Table", c: "#2C8FE0", ink: "#F6F3EC" },
];

/** 2. The four case studies in their open box. Each book lifts on hover. */
export function CaseStudies({ x }: { x: number }) {
  const W = 50;
  const H = 240;
  const boxW = 4 * (W + 12) + 20;
  return (
    <g transform={`translate(${x - boxW / 2} 0)`}>
      {CASE_BOOKS.map((b, i) => (
        <g key={b.title} className="flat-book" tabIndex={0} aria-label={`${b.title}, case study`}>
          <g filter="url(#grain)">
            <Book x={12 + i * (W + 12)} w={W} h={H} d={12} c={b.c} title={b.title} ink={b.ink} titleFrom={0.36} />
          </g>
        </g>
      ))}
      <g filter="url(#grain)">
        <rect x={0} y={-80} width={boxW} height={80} rx={3} fill={lit("#E2D5BC")} />
        <rect x={0} y={-80} width={boxW} height={12} rx={3} fill={lit("#EFE5D2")} />
        <path d={`M ${boxW} -80 L ${boxW + 14} -86 L ${boxW + 14} -5 L ${boxW} 0 Z`} fill={shade("#E2D5BC")} />
      </g>
    </g>
  );
}

/** Coin leaves on thin stems, for both pileas. Leaves sway in three groups. */
function CoinLeaves({ base, leaves }: { base: number; leaves: [number, number, number][] }) {
  return (
    <g className="pilea-sway" style={{ transformOrigin: `0px ${base}px` }}>
      {leaves.map(([lx, ly, r], i) => (
        <g key={i} className={`pilea-leaf pilea-leaf-${i % 3}`} style={{ transformOrigin: `0px ${base}px` }}>
          <path d={`M 0 ${base} Q ${lx * 0.4} ${base + ly * 0.6} ${lx} ${base + ly}`} stroke="#6E9A45" strokeWidth={3} fill="none" />
          <g filter="url(#grain)">
            <path d={`M ${lx} ${base + ly - r} A ${r} ${r} 0 0 0 ${lx} ${base + ly + r} Z`} fill={lit("#78B556")} />
            <path d={`M ${lx} ${base + ly - r} A ${r} ${r} 0 0 1 ${lx} ${base + ly + r} Z`} fill={shade("#78B556")} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** 3. Pilea in a cream pot with a smiling face and little legs. */
export function SmilePilea({ x }: { x: number }) {
  const top = -96;
  return (
    <g transform={`translate(${x} 0)`}>
      <CoinLeaves base={top} leaves={[[-62, -130, 24], [-26, -168, 21], [12, -182, 26], [52, -150, 23], [78, -108, 19], [-84, -88, 19], [28, -110, 17]]} />
      <g filter="url(#grain)">
        <rect x={-42} y={-18} width={14} height={18} rx={5} fill={lit("#D9CCB2")} />
        <rect x={-7} y={-18} width={14} height={18} rx={5} fill={lit("#D9CCB2")} />
        <rect x={28} y={-18} width={14} height={18} rx={5} fill={shade("#D9CCB2")} />
        <path d={`M -60 ${top} L -48 -16 L 0 -16 L 0 ${top} Z`} fill={lit("#EEE3CB")} />
        <path d={`M 60 ${top} L 48 -16 L 0 -16 L 0 ${top} Z`} fill={shade("#EEE3CB")} />
        <rect x={-64} y={top - 6} width={128} height={16} rx={4} fill={lit("#E6D9BE")} />
      </g>
      <circle cx={-16} cy={top + 36} r={4} fill={INK} />
      <circle cx={16} cy={top + 36} r={4} fill={INK} />
      <path d={`M -14 ${top + 50} Q 0 ${top + 62} 14 ${top + 50}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** 4. Experiments: a tall green spiral notebook, face out, with stamps on the cover. */
export function Experiments({ x }: { x: number }) {
  const w = 150;
  const h = 290;
  const left = -w / 2;
  return (
    <Obj x={x}>
      <path d={`M ${left + w} ${-h} L ${left + w + 12} ${-h - 5} L ${left + w + 12} -5 L ${left + w} 0 Z`} fill={shade("#1E7A46")} />
      <rect x={left} y={-h} width={w} height={h} rx={6} fill={lit("#1E7A46")} />
      {/* Stamps: one per experiment */}
      {[
        [left + 40, -230, "#F2A03A"],
        [left + 88, -196, "#4F86C6"],
        [left + 48, -150, "#E9DCC4"],
        [left + 96, -112, "#F2A03A"],
      ].map(([sx, sy, sc], i) => (
        <g key={i}>
          <rect x={(sx as number) - 2} y={(sy as number) - 2} width={36} height={42} rx={2} fill={lit("#F3EEE2")} />
          <rect x={sx as number} y={sy as number} width={32} height={38} rx={1} fill={i % 2 ? shade(sc as string) : lit(sc as string)} />
        </g>
      ))}
      {/* The coil down the left edge */}
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={left - 7} y={-h + 14 + i * 17} width={16} height={7} rx={3.5} fill={i % 2 ? shade("#C4C7C9") : lit("#C4C7C9")} />
      ))}
    </Obj>
  );
}

/** 5. About: one slim red book, spine out. */
export function About({ x }: { x: number }) {
  return (
    <Obj x={x}>
      <Book x={-22} w={44} h={230} d={12} c="#C8432E" title="About" />
    </Obj>
  );
}

/** One pointed leaf split down the middle, for the snake plant. */
function SwordLeaf({ x, h, w, tilt, c }: { x: number; h: number; w: number; tilt: number; c: string }) {
  return (
    <g transform={`translate(${x} 0) rotate(${tilt})`}>
      <path d={`M ${-w / 2 - 3} 0 Q ${-w / 2 - 6} ${-h * 0.5} 0 ${-h - 4} Q ${w / 2 + 6} ${-h * 0.5} ${w / 2 + 3} 0 Z`} fill={lit("#D9C24A")} />
      <path d={`M ${-w / 2} 0 Q ${-w / 2 - 3} ${-h * 0.5} 0 ${-h} L 0 0 Z`} fill={lit(c)} />
      <path d={`M ${w / 2} 0 Q ${w / 2 + 3} ${-h * 0.5} 0 ${-h} L 0 0 Z`} fill={shade(c)} />
    </g>
  );
}

/** White dots on a pot. */
function Dots({ points, r = 5 }: { points: [number, number][]; r?: number }) {
  return (
    <>
      {points.map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r={r} fill="#F6F1E6" opacity={0.9} />
      ))}
    </>
  );
}

/** 6. Snake plant: tall banded leaves in a pink polka-dot pot. */
export function SnakePlant({ x }: { x: number }) {
  const top = -104;
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="plant-sway" style={{ transformOrigin: `0px ${top}px` }}>
        <g filter="url(#grain)" transform={`translate(0 ${top + 6})`}>
          <SwordLeaf x={-30} h={190} w={26} tilt={-12} c="#3E7D3A" />
          <SwordLeaf x={26} h={200} w={26} tilt={10} c="#3E7D3A" />
          <SwordLeaf x={-8} h={250} w={30} tilt={-3} c="#4A8A42" />
          <SwordLeaf x={12} h={220} w={28} tilt={4} c="#3E7D3A" />
        </g>
      </g>
      <Obj x={0}>
        <path d={`M -66 ${top} L -54 0 L 0 0 L 0 ${top} Z`} fill={lit("#F2A7A0")} />
        <path d={`M 66 ${top} L 54 0 L 0 0 L 0 ${top} Z`} fill={shade("#F2A7A0")} />
        <rect x={-70} y={top - 6} width={140} height={16} rx={4} fill={lit(mix("#F2A7A0", "light", 0.1))} />
        <Dots points={[[-40, top + 30], [-14, top + 50], [12, top + 30], [38, top + 50], [-30, top + 76], [-2, top + 80], [26, top + 76]]} />
      </Obj>
    </g>
  );
}

/** 7. The butter-yellow clock on two feet. Its hands show the time the page loaded. */
export function Clock({ x }: { x: number }) {
  const R = 74;
  const cy = -R - 16;
  const now = new Date();
  const hA = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const mA = now.getMinutes() * 6;
  return (
    <Obj x={x}>
      <rect x={-50} y={-20} width={22} height={20} rx={8} fill={lit("#E4BE50")} />
      <rect x={28} y={-20} width={22} height={20} rx={8} fill={shade("#E4BE50")} />
      <circle cx={0} cy={cy} r={R} fill={shade("#F2D06B")} />
      <path d={`M ${-R} ${cy} A ${R} ${R} 0 0 1 ${R * 0.7} ${cy - R * 0.71} A ${R * 0.92} ${R * 0.92} 0 0 0 ${-R * 0.6} ${cy + R * 0.8} A ${R} ${R} 0 0 1 ${-R} ${cy} Z`} fill={lit("#F2D06B")} />
      <circle cx={0} cy={cy} r={R - 13} fill={lit("#F7EFD8")} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const long = i % 3 === 0;
        return <rect key={i} x={-2} y={-(R - 20)} width={4} height={long ? 12 : 7} rx={2} fill="#7A5A17" transform={`translate(0 ${cy}) rotate(${(a * 180) / Math.PI})`} />;
      })}
      <rect x={-3} y={-34} width={6} height={36} rx={3} fill="#7A5A17" transform={`translate(0 ${cy}) rotate(${hA})`} />
      <rect x={-2} y={-48} width={4} height={50} rx={2} fill="#7A5A17" transform={`translate(0 ${cy}) rotate(${mA})`} />
      <circle cx={0} cy={cy} r={5} fill="#7A5A17" />
    </Obj>
  );
}

/** 8. Résumé: a grey card pocket folder with a thumb notch, the sheet and a lime tab. */
export function Resume({ x }: { x: number }) {
  const w = 170;
  const left = -w / 2;
  return (
    <Obj x={x}>
      <rect x={left} y={-240} width={w} height={240} rx={10} fill={shade("#C9CED2")} />
      <rect x={left + 14} y={-226} width={w - 28} height={220} rx={3} fill={lit("#F1EEE6")} />
      <rect x={left + 106} y={-246} width={40} height={24} rx={4} fill={lit("#D7F04A")} />
      <path d={`M ${left} -180 L ${left + w / 2 - 34} -180 A 34 34 0 0 0 ${left + w / 2 + 34} -180 L ${left + w} -180 L ${left + w} -10 Q ${left + w} 0 ${left + w - 10} 0 L ${left + 10} 0 Q ${left} 0 ${left} -10 Z`} fill={lit("#D5D9DB")} />
      <path d={`M ${left + w / 2} -146 L ${left + w} -180 L ${left + w} -10 Q ${left + w} 0 ${left + w - 10} 0 L ${left + w / 2} 0 Z`} fill={shade("#D5D9DB")} opacity={0.55} />
    </Obj>
  );
}

/** 9 and 10. Illustrations (square black sketchbook) and Random design thoughts (blue pocket notebook). */
export function Notebooks({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <Obj x={0}>
        <path d="M 95 -190 L 108 -195 L 108 -5 L 95 0 Z" fill={shade("#2E2E33")} />
        <rect x={-95} y={-190} width={190} height={190} rx={8} fill={lit("#3A3A40")} />
        <rect x={60} y={-190} width={9} height={190} fill={shade("#26262A")} />
      </Obj>
      <g transform="translate(-20 0) rotate(-6)">
        <Obj x={0}>
          <path d="M 44 -126 L 52 -129 L 52 -3 L 44 0 Z" fill={shade("#2C4BD6")} />
          <rect x={-44} y={-126} width={88} height={126} rx={6} fill={lit("#2C4BD6")} />
        </Obj>
      </g>
    </g>
  );
}

/** A heart-shaped pothos leaf, tip pointing along `angle` degrees (0 = down). */
function HeartLeaf({ x, y, s, angle }: { x: number; y: number; s: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`}>
      <path d="M 0 0 C -14 -2 -16 18 0 30 L 0 0 Z" fill={lit("#5FA83C")} />
      <path d="M 0 0 C 14 -2 16 18 0 30 L 0 0 Z" fill={shade("#5FA83C")} />
    </g>
  );
}

/** 11. Pothos: green polka-dot pot on three legs, vines hanging over the shelf edge. */
export function Pothos({ x }: { x: number }) {
  const top = -110;
  const vine = (sx: number, len: number, bend: number) => {
    const pts = Array.from({ length: 8 }, (_, k) => [sx + Math.sin(k * 0.9) * bend, top + 4 + k * (len / 7)] as [number, number]);
    return pts;
  };
  const vines = [vine(-46, 230, 8), vine(40, 190, 10), vine(-10, 260, 6)];
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="plant-sway" style={{ transformOrigin: `0px ${top}px` }}>
        <g filter="url(#grain)">
          {[[-40, -150, 160], [-10, -168, 180], [24, -160, 200], [50, -140, 220], [-58, -128, 140], [6, -142, 190]].map(([lx, ly, a], i) => (
            <HeartLeaf key={i} x={lx} y={ly} s={1.25} angle={a} />
          ))}
        </g>
      </g>
      <Obj x={0}>
        <rect x={-46} y={-22} width={14} height={22} rx={5} fill={lit("#2F8F5B")} />
        <rect x={-7} y={-22} width={14} height={22} rx={5} fill={lit("#2F8F5B")} />
        <rect x={32} y={-22} width={14} height={22} rx={5} fill={shade("#2F8F5B")} />
        <path d={`M -62 ${top} L -52 -20 L 0 -20 L 0 ${top} Z`} fill={lit("#2F8F5B")} />
        <path d={`M 62 ${top} L 52 -20 L 0 -20 L 0 ${top} Z`} fill={shade("#2F8F5B")} />
        <rect x={-66} y={top - 6} width={132} height={16} rx={4} fill={lit(mix("#2F8F5B", "light", 0.1))} />
        <Dots points={[[-36, top + 28], [-8, top + 46], [20, top + 28], [44, top + 48], [-24, top + 66], [8, top + 72]]} r={4.5} />
      </Obj>
      <g className="vine-sway" style={{ transformOrigin: `0px ${top}px` }}>
        {vines.map((pts, v) => (
          <g key={v}>
            <path d={`M ${pts.map(([px, py]) => `${px} ${py}`).join(" L ")}`} stroke="#6E9A45" strokeWidth={2.5} fill="none" />
            <g filter="url(#grain)">
              {pts.slice(1).map(([px, py], k) => (
                <HeartLeaf key={k} x={px} y={py} s={0.9} angle={k % 2 ? -30 : 30} />
              ))}
            </g>
          </g>
        ))}
      </g>
    </g>
  );
}

/** 12. The red rotary phone, recoloured to the locked lacquered red with a brass dial. */
export function Phone({ x }: { x: number }) {
  const red = "#C0242E";
  return (
    <Obj x={x}>
      {/* Base: a wedge, lit front face and a shade side */}
      <path d="M -92 0 L -78 -96 L 60 -96 L 78 0 Z" fill={lit(red)} />
      <path d="M 60 -96 L 92 -86 L 104 -6 L 78 0 Z" fill={shade(red)} />
      <rect x={-96} y={-8} width={196} height={8} rx={3} fill={shade("#2E2B2C")} />
      {/* Dial */}
      <circle cx={-6} cy={-50} r={38} fill={lit("#E8E0CE")} />
      <circle cx={-6} cy={-50} r={34} fill={lit("#B9974B")} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = ((60 + i * 30) * Math.PI) / 180;
        return <circle key={i} cx={-6 + Math.cos(a) * 24} cy={-50 - Math.sin(a) * 24} r={5.5} fill="#EFE8D6" />;
      })}
      <circle cx={-6} cy={-50} r={11} fill={lit("#F1EADB")} />
      {/* Cradle horns */}
      <path d="M -52 -96 L -46 -120 L -28 -120 L -24 -96 Z" fill={lit(red)} />
      <path d="M 22 -96 L 26 -120 L 44 -120 L 50 -96 Z" fill={shade(red)} />
      {/* Handset: two cups and an arched handle */}
      <path d="M -92 -124 Q -6 -150 80 -124 L 74 -112 Q -6 -134 -86 -112 Z" fill={lit(red)} />
      <path d="M -112 -104 Q -112 -136 -82 -134 Q -62 -132 -62 -110 Z" fill={lit(red)} />
      <path d="M 54 -110 Q 54 -132 74 -134 Q 104 -136 104 -104 Z" fill={shade(red)} />
      {/* Coiled cord */}
      <path d="M 100 -104 c 10 6 -6 10 4 16 c 10 6 -6 10 4 16 c 10 6 -6 10 4 16 c 10 6 -6 10 4 16 c 10 6 -6 10 4 16 c 6 4 -4 8 -12 10" stroke={shade(red)} strokeWidth={4} fill="none" strokeLinecap="round" />
    </Obj>
  );
}

/** 13. Pilea in a yellow wavy, ribbed pot. */
export function WavyPilea({ x }: { x: number }) {
  const top = -110;
  const rib = (side: 1 | -1) => {
    let d = `M 0 ${top} L ${side * 62} ${top}`;
    for (let i = 0; i < 6; i++) {
      const y0 = top + (i * -top) / 6;
      const y1 = top + ((i + 1) * -top) / 6;
      d += ` Q ${side * 72} ${(y0 + y1) / 2} ${side * (62 - (i + 1))} ${y1}`;
    }
    return `${d} L 0 0 Z`;
  };
  return (
    <g transform={`translate(${x} 0)`}>
      <CoinLeaves base={top} leaves={[[-64, -120, 22], [-28, -160, 24], [10, -176, 22], [50, -144, 25], [76, -104, 19], [-88, -80, 18], [24, -112, 17], [-40, -96, 16]]} />
      <Obj x={0}>
        <path d={rib(-1)} fill={lit("#F2B33D")} />
        <path d={rib(1)} fill={shade("#F2B33D")} />
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={-64} y={top + 16 + i * 18} width={128} height={3} fill={shade("#F2B33D")} opacity={0.5} />
        ))}
      </Obj>
    </g>
  );
}

/* ---------------------------- Coffee station ---------------------------- */

/** The oak counter: its top is the surface (y = 0). */
export function OakCounter({ x, w }: { x: number; w: number }) {
  return (
    <g transform={`translate(${x} 0)`} filter="url(#grain)">
      <rect x={0} y={0} width={w} height={26} rx={4} fill={lit("#B98652")} />
      <rect x={0} y={18} width={w} height={8} rx={3} fill={shade("#B98652")} />
      <rect x={w * 0.14} y={26} width={18} height={16} rx={3} fill={shade("#3A3B3D")} />
      <rect x={w * 0.84} y={26} width={18} height={16} rx={3} fill={shade("#3A3B3D")} />
    </g>
  );
}

/** Succulent: a pale green rosette in a blue dotted pot on three legs. */
export function Succulent({ x }: { x: number }) {
  const top = -74;
  const petals = [-70, -40, -12, 12, 40, 70, -55, 55, 0];
  return (
    <g transform={`translate(${x} 0)`}>
      <g filter="url(#grain)">
        {petals.map((a, i) => (
          <g key={i} transform={`translate(0 ${top + 4}) rotate(${a})`}>
            <path d={`M 0 0 Q -10 -22 0 ${-34 - (i % 3) * 6} L 0 0 Z`} fill={lit(i > 5 ? "#9CD06F" : "#7BBF5A")} />
            <path d={`M 0 0 Q 10 -22 0 ${-34 - (i % 3) * 6} L 0 0 Z`} fill={shade(i > 5 ? "#9CD06F" : "#7BBF5A")} />
          </g>
        ))}
      </g>
      <Obj x={0}>
        <rect x={-36} y={-20} width={12} height={20} rx={5} fill={lit("#3D6FD1")} />
        <rect x={-6} y={-20} width={12} height={20} rx={5} fill={lit("#3D6FD1")} />
        <rect x={24} y={-20} width={12} height={20} rx={5} fill={shade("#3D6FD1")} />
        <path d={`M -48 ${top} Q -50 -26 -30 -18 L 0 -18 L 0 ${top} Z`} fill={lit("#3D6FD1")} />
        <path d={`M 48 ${top} Q 50 -26 30 -18 L 0 -18 L 0 ${top} Z`} fill={shade("#3D6FD1")} />
        <Dots points={[[-26, top + 18], [-4, top + 30], [18, top + 16], [30, top + 34], [-20, top + 42]]} r={3.5} />
      </Obj>
    </g>
  );
}

/** The espresso machine: pale blue top housing, white body, chrome group head, steel drip tray. */
export function CoffeeMachine({ x }: { x: number }) {
  return (
    <Obj x={x}>
      {/* Drip tray and base */}
      <rect x={-110} y={-40} width={220} height={40} rx={8} fill={lit("#E9E6DF")} />
      <rect x={-110} y={-14} width={220} height={14} rx={6} fill={shade("#E9E6DF")} />
      <rect x={-96} y={-52} width={192} height={14} rx={4} fill={lit("#BFC3C6")} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={-88 + i * 15} y={-49} width={7} height={8} rx={2} fill={shade("#8C9094")} />
      ))}
      {/* The waisted body */}
      <path d="M -82 -52 Q -70 -150 -86 -230 L 0 -230 L 0 -52 Z" fill={lit("#F1EFEA")} />
      <path d="M 82 -52 Q 70 -150 86 -230 L 0 -230 L 0 -52 Z" fill={shade("#F1EFEA")} />
      {/* Top housing in pale blue, with the white front band and gauge */}
      <rect x={-108} y={-312} width={216} height={92} rx={34} fill={lit("#A9C2DD")} />
      <path d="M 0 -312 L 74 -312 Q 108 -312 108 -278 L 108 -254 Q 108 -220 74 -220 L 0 -220 Z" fill={shade("#A9C2DD")} />
      <rect x={-100} y={-268} width={200} height={34} rx={12} fill={lit("#F3F1EC")} />
      <circle cx={0} cy={-262} r={30} fill={lit("#6B6F73")} />
      <circle cx={0} cy={-262} r={24} fill={lit("#F4F2EC")} />
      <rect x={-1.5} y={-280} width={3} height={18} rx={1.5} fill="#5B5F63" transform="rotate(40 0 -262)" />
      <circle cx={-58} cy={-251} r={6} fill={lit("#6B6F73")} />
      <circle cx={58} cy={-251} r={6} fill={lit("#6B6F73")} />
      <circle cx={-80} cy={-251} r={4} fill="#9C2A2A" />
      <circle cx={80} cy={-251} r={4} fill="#9C2A2A" />
      {/* Group head, portafilter and handle */}
      <rect x={-34} y={-222} width={68} height={22} rx={6} fill={lit("#C9CCCF")} />
      <rect x={-30} y={-202} width={60} height={14} rx={4} fill={shade("#C9CCCF")} />
      <path d="M -30 -196 L -132 -176 L -126 -162 L -26 -186 Z" fill={lit("#2F3033")} />
      <rect x={-4} y={-188} width={8} height={18} rx={2} fill={shade("#C9CCCF")} />
      {/* Steam wand */}
      <path d="M 92 -232 Q 112 -226 110 -196 L 110 -120" stroke={shade("#C9CCCF")} strokeWidth={6} fill="none" strokeLinecap="round" />
    </Obj>
  );
}

/** The burr grinder: black body, steel collar, a clear hopper of beans. */
export function Grinder({ x }: { x: number }) {
  return (
    <Obj x={x}>
      <rect x={-34} y={-120} width={68} height={120} rx={10} fill={lit("#34353A")} />
      <rect x={4} y={-120} width={30} height={120} rx={10} fill={shade("#34353A")} />
      <rect x={-10} y={-84} width={20} height={14} rx={2} fill={lit("#D6D8DA")} />
      <rect x={-12} y={-18} width={24} height={14} rx={4} fill={lit("#C9CCCF")} />
      <rect x={-30} y={-134} width={60} height={16} rx={5} fill={lit("#C9CCCF")} />
      <path d="M -28 -134 L -36 -200 L 36 -200 L 28 -134 Z" fill={lit("#E6E2DA")} opacity={0.7} />
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx={-20 + (i % 5) * 10} cy={-146 - Math.floor(i / 5) * 12} rx={5} ry={3.5} fill={lit("#6B3F24")} />
      ))}
      <rect x={-40} y={-210} width={80} height={12} rx={6} fill={lit("#3A3F55")} />
    </Obj>
  );
}

/** Herb pot: basil in terracotta. */
export function HerbPot({ x }: { x: number }) {
  const top = -70;
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="plant-sway" style={{ transformOrigin: `0px ${top}px` }} filter="url(#grain)">
        {[[-30, -30, -30], [-12, -52, -10], [10, -60, 12], [30, -36, 30], [0, -32, 0], [-22, -70, -18], [20, -74, 20]].map(([lx, ly, a], i) => (
          <g key={i} transform={`translate(${lx} ${top + ly}) rotate(${a})`}>
            <path d="M 0 16 C -14 6 -12 -14 0 -18 L 0 16 Z" fill={lit("#5DAA44")} />
            <path d="M 0 16 C 14 6 12 -14 0 -18 L 0 16 Z" fill={shade("#5DAA44")} />
          </g>
        ))}
      </g>
      <Obj x={0}>
        <path d={`M -46 ${top} L -36 0 L 0 0 L 0 ${top} Z`} fill={lit("#C46A42")} />
        <path d={`M 46 ${top} L 36 0 L 0 0 L 0 ${top} Z`} fill={shade("#C46A42")} />
        <rect x={-50} y={top - 6} width={100} height={18} rx={4} fill={lit(mix("#C46A42", "light", 0.1))} />
      </Obj>
    </g>
  );
}

const MUGS = [
  { c: "#5E8C7A" },
  { c: "#F4F2EC", stripe: "#2D4F9E" },
  { c: "#C27A4A" },
  { c: "#E3ECEA", glass: true },
  { c: "#EDE6D6", speckle: true },
  { c: "#34353A" },
];

/** One mug, side on, with its handle to the right. */
function Mug({ x, y, c, stripe, glass, speckle }: { x: number; y: number; c: string; stripe?: string; glass?: boolean; speckle?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={glass ? 0.75 : 1}>
      <path d="M 18 -36 q 18 0 18 14 q 0 14 -18 14" stroke={shade(c)} strokeWidth={7} fill="none" />
      <rect x={-22} y={-44} width={44} height={44} rx={5} fill={lit(c)} />
      <rect x={4} y={-44} width={18} height={44} rx={5} fill={shade(c)} />
      {glass ? <rect x={-20} y={-30} width={40} height={28} rx={4} fill={lit("#5A3520")} /> : null}
      {stripe ? (
        <>
          <rect x={-22} y={-34} width={44} height={5} fill={stripe} />
          <rect x={-22} y={-14} width={44} height={5} fill={stripe} />
        </>
      ) : null}
      {speckle
        ? [[-12, -32], [-2, -20], [8, -36], [-14, -12], [12, -16], [0, -8]].map(([sx, sy], i) => <circle key={i} cx={sx} cy={sy} r={1.6} fill="#6E5A44" />)
        : null}
    </g>
  );
}

/** The oak mug cubby on the wall: three columns, the middle shelf at a different height, six mugs. */
export function MugCubby({ x, y }: { x: number; y: number }) {
  const W = 300;
  const H = 210;
  const t = 9;
  const colW = (W - t * 4) / 3;
  const splits = [0.5, 0.42, 0.5];
  const colX = (i: number) => t + i * (colW + t);
  return (
    <g transform={`translate(${x - W / 2} ${y})`} filter="url(#grain)">
      <rect x={0} y={-H} width={W} height={H} rx={4} fill={lit("#E2D3B8")} />
      <rect x={0} y={-H} width={W} height={t} fill={lit("#B98652")} />
      <rect x={0} y={-t} width={W} height={t} fill={shade("#B98652")} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * (colW + t)} y={-H} width={t} height={H} fill={i < 2 ? lit("#B98652") : shade("#B98652")} />
      ))}
      {splits.map((s, i) => (
        <rect key={i} x={colX(i)} y={-H + s * H} width={colW} height={t} fill={lit("#B98652")} />
      ))}
      {MUGS.map((m, i) => {
        const col = Math.floor(i / 2);
        const row = i % 2;
        const mugY = row === 0 ? -H + splits[col] * H : -t;
        return <Mug key={i} x={colX(col) + colW / 2 - 6} y={mugY} {...m} />;
      })}
    </g>
  );
}

/** String of pearls: a small cream pot on the cubby, strands of green beads hanging down its side. */
export function StringOfPearls({ x, y }: { x: number; y: number }) {
  const strands = [150, 190, 120, 170];
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="vine-sway" style={{ transformOrigin: "0px -10px" }} filter="url(#grain)">
        {strands.map((len, s) => (
          <g key={s}>
            {Array.from({ length: Math.floor(len / 11) }, (_, k) => (
              <circle key={k} cx={26 + s * 6 + Math.sin(k * 0.7 + s) * 3} cy={-14 + k * 11} r={4.5} fill={k % 3 ? lit("#7DB65A") : shade("#7DB65A")} />
            ))}
          </g>
        ))}
      </g>
      <Obj x={0}>
        <path d="M -30 -40 L -24 0 L 0 0 L 0 -40 Z" fill={lit("#EFE9DE")} />
        <path d="M 30 -40 L 24 0 L 0 0 L 0 -40 Z" fill={shade("#EFE9DE")} />
      </Obj>
    </g>
  );
}
