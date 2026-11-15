import * as THREE from "three";

/**
 * Painted surface details: polka dots, spine titles, the clock face, the
 * pressure gauge, the phone dial. Each is drawn once on a canvas.
 */

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, redraw: () => { g.clearRect(0, 0, w, h); draw(g); t.needsUpdate = true; } };
}

/** White polka dots on a colour, laid around a lathe (u wraps, v climbs). */
export function dots(base: string, dot = "#F6F3EC", count = 9, rows = 3, size = 0.09) {
  return canvasTexture(512, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = dot;
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < count; i++) {
        const x = ((i + (r % 2) * 0.5) / count) * 512;
        const y = (0.22 + (r / Math.max(rows - 1, 1)) * 0.56) * 256;
        g.beginPath();
        g.ellipse(x, 256 - y, 512 * size * 0.25, 256 * size * 0.55, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }).tex;
}

/**
 * A book spine: its colour, and the title in Fraunces running up the spine
 * (spec: titles only). Redrawn once the font has loaded.
 */
export function spineTexture(color: string, title: string, ink = "#F6F3EC") {
  const W = 128;
  const H = 768;
  const { tex, redraw } = canvasTexture(W, H, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H - 56);
    g.rotate(-Math.PI / 2);
    g.fillStyle = ink;
    g.font = '500 46px "Fraunces", Georgia, serif';
    g.textBaseline = "middle";
    g.fillText(title, 0, 0);
    g.restore();
  });
  whenFontsReady(redraw);
  return tex;
}

/** The clock face: cream, bold numerals, hands at the time the page loaded. */
export function clockFace(face: string, ink: string) {
  const S = 512;
  const { tex, redraw } = canvasTexture(S, S, (g) => {
    g.fillStyle = face;
    g.fillRect(0, 0, S, S);
    g.fillStyle = ink;
    g.font = '600 60px "DM Sans", system-ui, sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let n = 1; n <= 12; n++) {
      const a = (n / 12) * Math.PI * 2 - Math.PI / 2;
      g.fillText(String(n), S / 2 + Math.cos(a) * 188, S / 2 + Math.sin(a) * 188);
    }
    const now = new Date();
    const hand = (a: number, len: number, w: number) => {
      g.save();
      g.translate(S / 2, S / 2);
      g.rotate(a);
      g.lineCap = "round";
      g.lineWidth = w;
      g.strokeStyle = ink;
      g.beginPath();
      g.moveTo(0, 18);
      g.lineTo(0, -len);
      g.stroke();
      g.restore();
    };
    hand(((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6), 110, 16);
    hand(now.getMinutes() * (Math.PI / 30), 160, 10);
    g.beginPath();
    g.arc(S / 2, S / 2, 14, 0, Math.PI * 2);
    g.fill();
  });
  whenFontsReady(redraw);
  return tex;
}

/** The espresso machine's pressure gauge. */
export function gaugeFace() {
  const S = 256;
  return canvasTexture(S, S, (g) => {
    g.fillStyle = "#F4F2EC";
    g.fillRect(0, 0, S, S);
    g.strokeStyle = "#3A3A3C";
    g.lineWidth = 5;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      g.beginPath();
      g.moveTo(S / 2 + Math.cos(a) * 92, S / 2 + Math.sin(a) * 92);
      g.lineTo(S / 2 + Math.cos(a) * (i % 5 === 0 ? 70 : 80), S / 2 + Math.sin(a) * (i % 5 === 0 ? 70 : 80));
      g.stroke();
    }
    g.strokeStyle = "#C8432E";
    g.lineWidth = 6;
    const a = Math.PI * 1.55;
    g.beginPath();
    g.moveTo(S / 2, S / 2);
    g.lineTo(S / 2 + Math.cos(a) * 80, S / 2 + Math.sin(a) * 80);
    g.stroke();
  }).tex;
}

/** The rotary dial's finger plate: a brass disc with ten finger holes. */
export function dialFace() {
  const S = 256;
  return canvasTexture(S, S, (g) => {
    g.fillStyle = "#C9A85C";
    g.fillRect(0, 0, S, S);
    g.fillStyle = "#F3E6C4";
    g.beginPath();
    g.arc(S / 2, S / 2, 40, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#8E1A22";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI * 0.35 - (i / 10) * Math.PI * 1.6;
      g.beginPath();
      g.arc(S / 2 + Math.cos(a) * 88, S / 2 + Math.sin(a) * 88, 17, 0, Math.PI * 2);
      g.fill();
    }
  }).tex;
}

/** Slots across the espresso drip tray. */
export function slots() {
  return canvasTexture(256, 64, (g) => {
    g.fillStyle = "#B9BCBE";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#4A4C4E";
    for (let i = 0; i < 14; i++) g.fillRect(10 + i * 17.5, 14, 8, 36);
  }).tex;
}

let fontsReady: Promise<unknown> | null = null;
function whenFontsReady(fn: () => void) {
  if (typeof document === "undefined" || !document.fonts) return;
  fontsReady ??= Promise.all([
    document.fonts.load('500 46px "Fraunces"'),
    document.fonts.load('600 60px "DM Sans"'),
  ]);
  fontsReady.then(fn, () => {});
}

/* ------------------------------------------------------------------------ */
/* The books' painted surfaces (objects/Books.tsx).                          */
/* ------------------------------------------------------------------------ */

/** Runs `fn` once the given font faces are ready (they are also in index.css). */
function whenLoaded(faces: string[], fn: () => void) {
  if (typeof document === "undefined" || !document.fonts) return;
  Promise.all(faces.map((f) => document.fonts.load(f))).then(fn, () => {});
}

function mix(a: string, b: string, t: number) {
  return "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

/** A faint paper or cloth grain over everything already drawn. */
function grain(g: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number) {
  let s = seed >>> 0;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const n = Math.floor(w * h * 0.06);
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${amount * (0.4 + r() * 0.6)})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
}

/** A five-pointed star, for the star spill (refs/29) and stamps. */
function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, color: string) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
}

/**
 * A hardback's spine as in the shading test Dvija picked (refs/58, no. 2):
 * the cloth colour, a paler band at the head and the tail with a soft shadow
 * where it meets the middle, and the title up the spine in Fraunces, in a
 * pale tint of the cloth. `ornament` adds the small diamond marks of
 * refs/34 above and below the bands.
 */
export function bandedSpine(
  color: string,
  title: string,
  o: { ink?: string; ornament?: boolean; size?: number; aspect?: number } = {},
) {
  const W = 128;
  // Height over width of the spine, so the lettering keeps its shape.
  const H = Math.round(W * (o.aspect ?? 7));
  const ink = o.ink ?? mix(color, "#FFFDF5", 0.82);
  const band = mix(color, "#FFFFFF", 0.3);
  const BAND = 92;
  const { tex, redraw } = canvasTexture(W, H, (g) => {
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
    // The rounded spine: lit in the middle, falling off to both edges.
    const across = g.createLinearGradient(0, 0, W, 0);
    across.addColorStop(0, "rgba(0,0,0,0.16)");
    across.addColorStop(0.35, "rgba(255,255,255,0.06)");
    across.addColorStop(0.55, "rgba(255,255,255,0.08)");
    across.addColorStop(1, "rgba(0,0,0,0.2)");
    for (const [y0, y1] of [
      [0, BAND],
      [H - BAND, H],
    ]) {
      g.fillStyle = band;
      g.fillRect(0, y0, W, y1 - y0);
    }
    // Soft shadow under the head band and over the tail band (pick 2).
    const sh = (y: number, dir: number) => {
      const gr = g.createLinearGradient(0, y, 0, y + dir * 26);
      gr.addColorStop(0, "rgba(0,0,0,0.18)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, Math.min(y, y + dir * 26), W, 26);
    };
    sh(BAND, 1);
    sh(H - BAND, -1);
    g.fillStyle = across;
    g.fillRect(0, 0, W, H);
    if (o.ornament) {
      // refs/34: a column of three small diamonds, hollow, filled, hollow,
      // the middle one filled in a deep contrasting tone.
      for (const y of [BAND + 58, H - BAND - 58]) {
        for (const dy of [-24, 0, 24]) {
          g.save();
          g.translate(W / 2, y + dy);
          g.rotate(Math.PI / 4);
          const s = dy === 0 ? 9 : 7;
          g.lineWidth = 2.5;
          g.strokeStyle = ink;
          if (dy === 0) {
            g.fillStyle = mix(color, "#2A0A05", 0.6);
            g.fillRect(-s, -s, s * 2, s * 2);
          }
          g.strokeRect(-s, -s, s * 2, s * 2);
          g.restore();
        }
      }
    }
    // The title reads top to bottom (letter tops towards the right-hand
    // board, as on refs/08, 34 and 58), starting just under the head band.
    g.save();
    g.translate(W / 2, BAND + (o.ornament ? 120 : 40));
    g.rotate(Math.PI / 2);
    g.fillStyle = ink;
    g.font = `500 ${o.size ?? 44}px "Fraunces", Georgia, serif`;
    g.textBaseline = "middle";
    g.fillText(title, 0, 2);
    g.restore();
    grain(g, W, H, 0.05, 31);
  });
  whenLoaded(['500 44px "Fraunces"'], redraw);
  return tex;
}

/**
 * The case studies' series box, after the door-flap cover (refs/13): a grid
 * of muted colour blocks, with dark windows where little doors stand open.
 * u = 0 is the box's open front. The thumb notch (refs/10) is cut out of the
 * front edge, transparent, so use it with alphaTest.
 */
export const DOOR_GRID = {
  cols: 5,
  rows: 6,
  /** Column, row from the top, and the colour of the open door's face. */
  windows: [
    [1, 1, "#7C7C72"],
    [3, 3, "#9CA79C"],
    [2, 4, "#F7A440"],
  ] as [number, number, string][],
};
export function doorFlapCover(notch: { y: number; r: number }, windows = true) {
  const W = 512;
  const H = 640;
  const colors = [
    "#C25B6A", "#6E5F5C", "#6B8DBE", "#F2A79A", "#4F6F8E",
    "#E2A6AE", "#7C7C72", "#CE7488", "#93C49A", "#9ED3D8",
    "#A9703F", "#F4C3CE", "#FFD58A", "#E5483B", "#2F3F66",
    "#7DBAC0", "#F08A3E", "#D6463A", "#9CA79C", "#8DB8E3",
    "#EFA0A8", "#B9475A", "#F7A440", "#6F9C84", "#9AAE3E",
    "#2E5684", "#7A7149", "#B2333F", "#2E3266", "#B9726B",
  ];
  return canvasTexture(W, H, (g) => {
    const cw = W / DOOR_GRID.cols;
    const ch = H / DOOR_GRID.rows;
    for (let r = 0; r < DOOR_GRID.rows; r++)
      for (let c = 0; c < DOOR_GRID.cols; c++) {
        g.fillStyle = colors[(r * DOOR_GRID.cols + c) % colors.length];
        g.fillRect(c * cw, r * ch, cw + 1, ch + 1);
      }
    // The open doors' windows: near black, with a little white line drawing.
    for (const [c, r] of windows ? DOOR_GRID.windows : []) {
      g.fillStyle = "#1E1D1F";
      g.fillRect(c * cw, r * ch, cw, ch);
      // A little chalky line drawing in each: a sprig in a pot.
      const x0 = c * cw;
      const y0 = r * ch;
      g.strokeStyle = "#AFC3CC";
      g.lineWidth = 3;
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(x0 + cw * 0.36, y0 + ch * 0.62);
      g.lineTo(x0 + cw * 0.64, y0 + ch * 0.62);
      g.lineTo(x0 + cw * 0.6, y0 + ch * 0.82);
      g.lineTo(x0 + cw * 0.4, y0 + ch * 0.82);
      g.closePath();
      g.moveTo(x0 + cw * 0.5, y0 + ch * 0.62);
      g.lineTo(x0 + cw * 0.5, y0 + ch * 0.28);
      g.moveTo(x0 + cw * 0.5, y0 + ch * 0.45);
      g.quadraticCurveTo(x0 + cw * 0.36, y0 + ch * 0.3, x0 + cw * 0.3, y0 + ch * 0.36);
      g.moveTo(x0 + cw * 0.5, y0 + ch * 0.38);
      g.quadraticCurveTo(x0 + cw * 0.66, y0 + ch * 0.22, x0 + cw * 0.7, y0 + ch * 0.3);
      g.stroke();
    }
    grain(g, W, H, 0.05, 13);
    // Thumb notch, a half circle out of the front edge.
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000";
    g.beginPath();
    g.arc(0, (1 - notch.y) * H, notch.r * H, -Math.PI / 2, Math.PI / 2);
    g.fill();
    g.globalCompositeOperation = "source-over";
  }).tex;
}

/** A postage stamp: white with a perforated edge, its picture drawn by `art`. */
function stamp(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  bg: string,
  paper: string,
  art: (w: number, h: number) => void,
) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.shadowColor = "rgba(0,0,0,0.25)";
  g.shadowBlur = 6;
  g.shadowOffsetY = 2;
  g.fillStyle = "#F4F1E8";
  g.fillRect(-w / 2, -h / 2, w, h);
  g.shadowColor = "transparent";
  // Perforations: bites of the cover colour along each edge.
  g.fillStyle = paper;
  const p = 9;
  for (let i = -w / 2 + p / 2; i <= w / 2; i += p * 1.6) {
    g.beginPath();
    g.arc(i, -h / 2, p / 2.4, 0, Math.PI * 2);
    g.arc(i, h / 2, p / 2.4, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = -h / 2 + p / 2; i <= h / 2; i += p * 1.6) {
    g.beginPath();
    g.arc(-w / 2, i, p / 2.4, 0, Math.PI * 2);
    g.arc(w / 2, i, p / 2.4, 0, Math.PI * 2);
    g.fill();
  }
  const m = 9;
  g.fillStyle = bg;
  g.fillRect(-w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2);
  g.save();
  g.beginPath();
  g.rect(-w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2);
  g.clip();
  g.translate(-w / 2 + m, -h / 2 + m);
  art(w - m * 2, h - m * 2);
  g.restore();
  g.restore();
}

/** A pointed leaf, for the stamps' foliage. */
function leaf(g: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, color: string) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(len * 0.5, -len * 0.4, len, 0);
  g.quadraticCurveTo(len * 0.5, len * 0.4, 0, 0);
  g.fill();
  g.restore();
}

/**
 * Experiments' cover (refs/30): deep green card with a scatter of tilted,
 * overlapping illustrated stamps (the camera pushed off the top edge, one
 * cropped off the bottom left), lines of small caps, and the punched holes
 * for the coil down the left edge (`holes`: y fractions from the bottom,
 * `holeX`: x fraction). `aspect` is the cover's height over width.
 */
export function stampCover(holes: number[], holeX: number, aspect: number) {
  const W = 512;
  const H = Math.round(W * aspect);
  const GREEN = "#1F7A4E";
  const CREAM = "#F1E3B4";
  const { tex, redraw } = canvasTexture(W, H, (g) => {
    g.fillStyle = GREEN;
    g.fillRect(0, 0, W, H);
    grain(g, W, H, 0.08, 5);
    g.fillStyle = CREAM;
    g.font = '700 17px "DM Sans", system-ui, sans-serif';
    g.textBaseline = "alphabetic";
    ["THIS NOTEBOOK HOLDS", "SMALL EXPERIMENTS", "STILL IN PROGRESS."].forEach((t, i) => g.fillText(t, 70, 120 + i * 26));
    g.fillText("EXPERIMENTS, VOL. 1", 70, 528);
    // Camera, top right, pushed past the top edge.
    stamp(g, 392, 22, 160, 128, 0.14, "#F2A12C", GREEN, (w, h) => {
      g.fillStyle = "#26335E";
      g.beginPath();
      g.roundRect(w * 0.18, h * 0.36, w * 0.64, h * 0.5, 8);
      g.fill();
      g.fillRect(w * 0.42, h * 0.26, w * 0.2, h * 0.14);
      g.fillStyle = "#5F8FD6";
      g.beginPath();
      g.arc(w * 0.5, h * 0.61, h * 0.17, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#F4F1E8";
      g.fillRect(w * 0.22, h * 0.4, w * 0.1, h * 0.06);
    });
    // "Try & see", up the right side under the camera.
    g.save();
    g.translate(462, 140);
    g.rotate(Math.PI / 2);
    g.fillStyle = CREAM;
    g.font = '800 28px "DM Sans", system-ui, sans-serif';
    g.fillText("TRY &", 0, 0);
    g.fillText("SEE", 0, 32);
    g.restore();
    // A figure in a checked cap, tilted left.
    stamp(g, 262, 330, 178, 172, -0.16, "#E64A1F", GREEN, (w, h) => {
      g.fillStyle = "#7DBDEB";
      g.beginPath();
      g.ellipse(w * 0.35, h * 1.02, w * 0.52, h * 0.36, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#F0A27A";
      g.beginPath();
      g.arc(w * 0.5, h * 0.55, w * 0.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#F6C431";
      g.beginPath();
      g.arc(w * 0.66, h * 0.58, w * 0.08, 0, Math.PI * 2);
      g.fill();
      // The cap: a navy and cream checker grid.
      g.save();
      g.beginPath();
      g.ellipse(w * 0.56, h * 0.34, w * 0.3, h * 0.16, -0.45, 0, Math.PI * 2);
      g.clip();
      g.translate(w * 0.56, h * 0.34);
      g.rotate(-0.45);
      const c = w * 0.06;
      for (let i = -6; i < 6; i++)
        for (let j = -4; j < 4; j++) {
          g.fillStyle = (i + j) % 2 === 0 ? "#1E2A4E" : "#F4F1E8";
          g.fillRect(i * c, j * c, c, c);
        }
      g.restore();
    });
    // A white deer on a cliff, overlapping the figure's corner.
    stamp(g, 372, 468, 160, 140, 0.15, "#2D6FC8", GREEN, (w, h) => {
      g.fillStyle = "#245F52";
      g.beginPath();
      g.moveTo(0, h * 0.75);
      g.lineTo(w * 0.7, h * 0.62);
      g.lineTo(w, h * 0.7);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      g.fillStyle = "#4FB0D8";
      g.fillRect(0, h * 0.86, w, h * 0.14);
      g.fillStyle = "#F4F1E8";
      g.fillRect(w * 0.36, h * 0.38, w * 0.3, h * 0.12);
      g.fillRect(w * 0.38, h * 0.48, w * 0.04, h * 0.16);
      g.fillRect(w * 0.6, h * 0.48, w * 0.04, h * 0.16);
      g.fillRect(w * 0.62, h * 0.22, w * 0.06, h * 0.2);
      g.strokeStyle = "#F4F1E8";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(w * 0.65, h * 0.22);
      g.lineTo(w * 0.58, h * 0.08);
      g.moveTo(w * 0.66, h * 0.22);
      g.lineTo(w * 0.76, h * 0.08);
      g.stroke();
    });
    // A lantern, with its big two-line label.
    stamp(g, 236, 655, 132, 196, -0.16, "#3E9B48", GREEN, (w, h) => {
      g.fillStyle = "#16241C";
      g.beginPath();
      g.roundRect(w * 0.27, h * 0.16, w * 0.46, h * 0.4, 10);
      g.fill();
      g.fillStyle = "#F3E7A2";
      g.beginPath();
      g.roundRect(w * 0.35, h * 0.22, w * 0.3, h * 0.28, 8);
      g.fill();
      g.strokeStyle = "#16241C";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(w * 0.5, h * 0.16, w * 0.17, Math.PI, 0);
      g.stroke();
      g.fillStyle = "#F6C431";
      g.font = '800 34px "DM Sans", system-ui, sans-serif';
      g.textAlign = "center";
      g.fillText("EXPT", w * 0.5, h * 0.74);
      g.fillText("NOTE", w * 0.5, h * 0.92);
      g.textAlign = "start";
    });
    // A triangle stamp: fir tree, orange leaves, red base.
    g.save();
    g.translate(382, 650);
    g.rotate(0.2);
    g.shadowColor = "rgba(0,0,0,0.25)";
    g.shadowBlur = 6;
    g.fillStyle = "#F4F1E8";
    g.beginPath();
    g.moveTo(0, -105);
    g.lineTo(86, 76);
    g.lineTo(-86, 76);
    g.closePath();
    g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = "#F3E7A2";
    g.beginPath();
    g.moveTo(0, -84);
    g.lineTo(68, 64);
    g.lineTo(-68, 64);
    g.closePath();
    g.fill();
    g.fillStyle = "#1F4D33";
    g.beginPath();
    g.moveTo(0, -70);
    g.lineTo(52, 44);
    g.lineTo(-52, 44);
    g.closePath();
    g.fill();
    g.fillStyle = "#D63A2A";
    g.fillRect(-62, 46, 124, 16);
    for (const [x, y, rot] of [[-40, 30, -2.4], [-34, 0, -2.7], [26, 22, -0.5], [30, 46, -0.9], [-6, 40, -1.6]] as [number, number, number][])
      leaf(g, x, y, 30, rot, "#F2A12C");
    g.restore();
    // A stamp cropped by the bottom left edge: a face in profile on orange.
    stamp(g, 100, H - 22, 170, 170, 0.5, "#F08A2E", GREEN, (w, h) => {
      g.fillStyle = "#6B3A22";
      g.beginPath();
      g.arc(w * 0.55, h * 0.42, w * 0.26, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#F4C9A0";
      g.beginPath();
      g.arc(w * 0.6, h * 0.5, w * 0.18, 0, Math.PI * 2);
      g.fill();
    });
    // Punched holes for the coil.
    g.fillStyle = "#0E2A1C";
    for (const f of holes) {
      g.beginPath();
      g.arc(holeX * W, (1 - f) * H, 7, 0, Math.PI * 2);
      g.fill();
    }
  });
  whenLoaded(['700 17px "DM Sans"', '800 34px "DM Sans"'], redraw);
  return tex;
}

/**
 * Illustrations' cover (refs/14): a mustard cloth sketchbook with one
 * die-cut sticker of a hooded girl and a fawn, and the title blind-debossed
 * low on the cover.
 */
export function sketchbookCover() {
  const W = 512;
  const H = 544;
  const Y = "#F1B53F";
  const { tex, redraw } = canvasTexture(W, H, (g) => {
    g.fillStyle = Y;
    g.fillRect(0, 0, W, H);
    grain(g, W, H, 0.07, 9);
    // The spine's hinge groove, near the left edge.
    g.fillStyle = "rgba(120,70,0,0.18)";
    g.fillRect(34, 0, 4, H);
    // Sticker: white die-cut outline, then the drawing.
    g.save();
    g.translate(235, 225);
    g.shadowColor = "rgba(90,50,0,0.3)";
    g.shadowBlur = 8;
    g.shadowOffsetY = 3;
    g.fillStyle = "#FBF7EE";
    g.beginPath();
    g.moveTo(-10, -150);
    g.bezierCurveTo(60, -150, 70, -60, 80, -20);
    g.bezierCurveTo(150, -10, 170, 90, 120, 110);
    g.lineTo(-130, 110);
    g.bezierCurveTo(-170, 80, -150, -10, -90, -30);
    g.bezierCurveTo(-90, -100, -60, -150, -10, -150);
    g.fill();
    g.shadowColor = "transparent";
    // Hood and body.
    g.fillStyle = "#C63E2E";
    g.beginPath();
    g.ellipse(-10, -70, 52, 62, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1F5E5C";
    g.beginPath();
    g.moveTo(-60, -40);
    g.quadraticCurveTo(-80, 60, -40, 95);
    g.lineTo(60, 95);
    g.quadraticCurveTo(70, 10, 40, -40);
    g.fill();
    g.fillStyle = "#6BA7A0";
    g.beginPath();
    g.ellipse(-8, -66, 30, 36, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1E2622";
    g.beginPath();
    g.ellipse(-8, -88, 32, 16, 0, Math.PI, 0);
    g.fill();
    // Two fawns lying in front, facing each other: body, folded legs,
    // a raised head with big ears, a dark nose, white spots.
    for (const [x, d] of [[-78, 1], [72, -1]] as [number, number][]) {
      g.fillStyle = "#8E4A22";
      for (const lx of [-24, 18]) {
        g.beginPath();
        g.roundRect(x + lx * d - 7, 82, 14, 26, 6);
        g.fill();
      }
      g.fillStyle = "#C9733D";
      g.beginPath();
      g.ellipse(x, 74, 44, 24, 0, 0, Math.PI * 2);
      g.fill();
      // Neck and head, towards the middle.
      g.beginPath();
      g.moveTo(x + d * 20, 64);
      g.quadraticCurveTo(x + d * 34, 40, x + d * 40, 30);
      g.lineTo(x + d * 52, 40);
      g.quadraticCurveTo(x + d * 44, 60, x + d * 40, 72);
      g.fill();
      g.beginPath();
      g.ellipse(x + d * 48, 28, 18, 13, d * 0.3, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x + d * 36, 10, 6, 14, -d * 0.6, 0, Math.PI * 2);
      g.ellipse(x + d * 54, 8, 6, 14, d * 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2A1A12";
      g.beginPath();
      g.arc(x + d * 64, 30, 4, 0, Math.PI * 2);
      g.arc(x + d * 48, 24, 2.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#FBF7EE";
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(x - 26 + i * 10, 66 + (i % 2) * 9, 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Sparkles around.
    for (const [x, y] of [[-110, -40], [95, -60], [40, -150], [130, 40]]) star(g, x, y, 9, 0, "#FBF7EE");
    g.restore();
    // Blind-debossed title, low left.
    g.font = '500 26px "Fraunces", Georgia, serif';
    g.fillStyle = "rgba(255,240,200,0.45)";
    g.fillText("Illustrations", 71, H - 59);
    g.fillStyle = "rgba(130,80,0,0.35)";
    g.fillText("Illustrations", 70, H - 60);
  });
  whenLoaded(['500 26px "Fraunces"'], redraw);
  return tex;
}

/**
 * Random design thoughts' cover: kraft card (refs/15) with a scalloped
 * window onto blue paper, and a spill of paper stars and confetti tumbling
 * out of it down the cover (refs/29).
 */
export function starSpillCover() {
  const W = 384;
  const H = 544;
  const { tex, redraw } = canvasTexture(W, H, (g) => {
    g.fillStyle = "#B48B5F";
    g.fillRect(0, 0, W, H);
    grain(g, W, H, 0.12, 21);
    // Saddle-stitch fold at the left edge.
    g.fillStyle = "rgba(70,40,10,0.18)";
    g.fillRect(0, 0, 10, H);
    // The window: a scalloped square of textured blue paper.
    const x = 80;
    const y = 70;
    const s = 150;
    g.fillStyle = "#5B83D6";
    g.beginPath();
    g.rect(x, y, s, s);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 400; i++) g.fillRect(x + ((i * 37) % s), y + ((i * 53) % s), 2, 2);
    g.fillStyle = "#B48B5F";
    for (let i = 0; i <= s; i += 12.5) {
      for (const [cx, cy] of [[x + i, y], [x + i, y + s], [x, y + i], [x + s, y + i]]) {
        g.beginPath();
        g.arc(cx, cy, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const [sx, sy, c] of [[110, 100, "#F4E27A"], [200, 95, "#F7C9D4"], [195, 190, "#F2EAD2"], [112, 196, "#F2EAD2"]] as [number, number, string][])
      star(g, sx, sy, 9, 0.3, c);
    // The spill (refs/29): a fan of mostly orange and red-orange stars
    // widening as it falls, a few blue, then a trail of coloured dots.
    let seed = 4;
    const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const cols = ["#F39A2E", "#F39A2E", "#F7A83A", "#E8522A", "#E8522A", "#F39A2E", "#6E93DA"];
    const dots = ["#F45B9A", "#7ED8D0", "#F5E14A", "#6E93DA", "#E8522A", "#F39A2E"];
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const spread = 30 + t * 110;
      const px = 170 + t * 120 + (r() - 0.5) * spread;
      const py = 175 + t * 260 + (r() - 0.5) * 30;
      if (r() < 0.18) {
        g.fillStyle = dots[Math.floor(r() * dots.length)];
        g.beginPath();
        g.arc(px, py, 6, 0, Math.PI * 2);
        g.fill();
      } else star(g, px, py, 14 + r() * 9, r() * 6.28, cols[Math.floor(r() * cols.length)]);
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = dots[i];
      g.beginPath();
      g.arc(285 + i * 11, 450 + i * 15, 6 - i * 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#4A3320";
    g.font = '500 19px "Fraunces", Georgia, serif';
    g.fillText("Random", 32, H - 70);
    g.fillText("design thoughts", 32, H - 44);
  });
  whenLoaded(['500 19px "Fraunces"'], redraw);
  return tex;
}

/** The résumé folder's printed label (refs/18), on a clear ground. */
export function folderLabel() {
  const W = 512;
  const H = 320;
  const { tex, redraw } = canvasTexture(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#A9AEB2";
    g.font = '500 44px "DM Sans", system-ui, sans-serif';
    g.fillText("Résumé", 4, 52);
    g.fillStyle = "#5E6468";
    g.font = '600 66px "DM Sans", system-ui, sans-serif';
    ["Work history,", "skills and", "education"].forEach((t, i) => g.fillText(t, 4, 136 + i * 72));
  });
  whenLoaded(['500 44px "DM Sans"', '600 66px "DM Sans"'], redraw);
  return tex;
}

/**
 * A die-cut page tab with a cat on it (refs/41), on a clear ground. The tab's
 * square body (y 110 down) slips between the pages; the cat rides above.
 * `pose`: "book", sitting up behind an open book; "lying", stretched out
 * along the top with its paws hanging over and its tail up.
 */
export function catTab(body: string, cat: string, patch: string, pose: "book" | "lying") {
  const S = 256;
  const INK = "#2A2A2C";
  return canvasTexture(S, S, (g) => {
    g.clearRect(0, 0, S, S);
    g.lineJoin = "round";
    g.lineCap = "round";
    g.fillStyle = body;
    g.beginPath();
    g.roundRect(24, 110, 208, 140, 14);
    g.fill();
    if (pose === "book") {
      // Die-cut margin round the head.
      g.beginPath();
      g.moveTo(66, 118);
      g.lineTo(76, 36);
      g.lineTo(112, 66);
      g.lineTo(150, 66);
      g.lineTo(186, 36);
      g.lineTo(196, 118);
      g.fill();
      g.fillStyle = cat;
      g.beginPath();
      g.moveTo(84, 124);
      g.lineTo(90, 56);
      g.lineTo(118, 82);
      g.lineTo(146, 82);
      g.lineTo(174, 56);
      g.lineTo(180, 124);
      g.closePath();
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.stroke();
      g.fillStyle = patch;
      g.beginPath();
      g.ellipse(154, 88, 18, 14, 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = INK;
      for (const x of [114, 150]) {
        g.beginPath();
        g.arc(x, 104, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#E8742E";
      g.beginPath();
      g.moveTo(126, 112);
      g.lineTo(138, 112);
      g.lineTo(132, 119);
      g.fill();
      // The open book it holds up, just under its chin.
      g.fillStyle = "#4F8A8E";
      g.beginPath();
      g.moveTo(58, 124);
      g.lineTo(130, 132);
      g.lineTo(202, 124);
      g.lineTo(198, 210);
      g.lineTo(130, 220);
      g.lineTo(62, 210);
      g.closePath();
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(130, 132);
      g.lineTo(130, 220);
      g.stroke();
    } else {
      // Die-cut margin round the lying cat.
      g.beginPath();
      g.ellipse(150, 104, 84, 34, 0, 0, Math.PI * 2);
      g.ellipse(80, 84, 46, 46, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(52, 70);
      g.lineTo(56, 22);
      g.lineTo(84, 46);
      g.lineTo(108, 22);
      g.lineTo(114, 70);
      g.fill();
      g.beginPath();
      g.ellipse(214, 70, 18, 40, 0.3, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 4;
      g.fillStyle = cat;
      // Tail, up and curling.
      g.beginPath();
      g.moveTo(206, 104);
      g.quadraticCurveTo(232, 70, 212, 44);
      g.lineWidth = 14;
      g.strokeStyle = INK;
      g.stroke();
      g.lineWidth = 8;
      g.strokeStyle = cat;
      g.stroke();
      g.lineWidth = 4;
      g.strokeStyle = INK;
      // Body.
      g.beginPath();
      g.ellipse(152, 106, 62, 22, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = patch;
      g.beginPath();
      g.ellipse(170, 98, 22, 12, 0, 0, Math.PI * 2);
      g.fill();
      // Paws hanging over the page edge.
      g.fillStyle = cat;
      for (const x of [104, 132]) {
        g.beginPath();
        g.roundRect(x, 112, 18, 26, 8);
        g.fill();
        g.stroke();
      }
      // Head, ears, face.
      g.beginPath();
      g.moveTo(58, 66);
      g.lineTo(62, 32);
      g.lineTo(86, 52);
      g.lineTo(104, 32);
      g.lineTo(110, 66);
      g.fill();
      g.stroke();
      g.beginPath();
      g.arc(84, 86, 32, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = INK;
      g.lineWidth = 3.5;
      g.beginPath();
      g.arc(72, 86, 6, 0.2, Math.PI - 0.2);
      g.moveTo(104, 86);
      g.arc(96, 86, 6, 0.2, Math.PI - 0.2);
      g.stroke();
      g.fillStyle = "#E8742E";
      g.beginPath();
      g.moveTo(79, 96);
      g.lineTo(89, 96);
      g.lineTo(84, 102);
      g.fill();
    }
  }).tex;
}
