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
