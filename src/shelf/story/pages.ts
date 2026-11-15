import * as THREE from "three";
import { CASES } from "../routes";
import { ABOUT_SPREADS, CASE_INFO, PLAYGROUND_PAGES } from "./content";
import { BOOK_CORNER, BOOK_SIZE, type BookId } from "./layout";

/**
 * The open books' pages, after the HTWKR picture book (14 Nov): each spread
 * is one full-bleed picture running across both pages, rounded at its outer
 * corners, with a soft shadow down the gutter and the words set in the lower
 * right. Drawn on one canvas per spread, then shown as two textures (its
 * left and right halves) on the 3D pages. Placeholder content for now
 * (phases 3 to 5 fill it in).
 */

const SERIF = 'Fraunces, Georgia, "Times New Roman", serif';
const SANS = '"DM Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
const HAND = '"Cabin Sketch", "DM Sans", sans-serif';
const CHALK = "#F4EFE6";
/**
 * The page's own button (16 Nov): each spread prints its action on the right-hand page's lower right, so it turns with
 * the page. `actionLabel` is its text (none for a spread with no action).
 */
export const ACTION = { h: 84, padX: 36, font: 34, right: 70, bottom: 62 };
export function actionLabel(book: BookId, i: number): string | null {
  if (book === "work") return "Read the case study \u2197";
  if (book === "playground") return "See everything \u2197";
  return ABOUT_SPREADS[i]?.link ? `${ABOUT_SPREADS[i].link!.label}` : null;
}
let measurer: CanvasRenderingContext2D | null = null;
/** The printed pill's width, in page-canvas pixels. */
export function actionWidth(label: string) {
  measurer ??= document.createElement("canvas").getContext("2d")!;
  measurer.font = `600 ${ACTION.font}px ${SANS}`;
  return Math.ceil(measurer.measureText(label).width) + ACTION.padX * 2;
}

/**
 * The punched holes along a spiral book's top edge, drawn on a top-bound page (the paper runs up to the coil, with the holes
 * the wire passes through, as on a real pad). Positions follow the Playground's slots.
 */
function holes(g: CanvasRenderingContext2D, W: number, H: number) {
  const { w, h } = BOOK_SIZE.playground;
  const pageW = w - 0.004;
  const pitch = (w - 0.1) / 29;
  g.fillStyle = "#2B2B2A";
  for (let k = 0; k < 30; k++) {
    const x = ((-w / 2 + 0.05 + k * pitch + pageW / 2) / pageW) * W;
    const y = (0.045 / (h - 0.014)) * H;
    g.beginPath();
    g.arc(x, y, (0.0105 / pageW) * W, 0, Math.PI * 2);
    g.fill();
  }
}

/** The blank spreads' paper. */
const PAPER = "#F3EFE7";

export type Side = "left" | "right" | "single" | "blank";

/** How many pages (spreads, for side-bound books) each book has. */
export const PAGE_COUNT: Record<BookId, number> = {
  work: CASES.length,
  about: ABOUT_SPREADS.length,
  playground: PLAYGROUND_PAGES.length,
};

/** Each page's main colour, for its dot under the book. */
export function pageTint(book: BookId, i: number) {
  if (book === "work") return CASE_INFO[CASES[i]].tint;
  if (book === "about") return ABOUT_SPREADS[i].tint;
  return PLAYGROUND_PAGES[i].tint;
}

/** One page's size in canvas pixels, from the book's page proportions (a board's width less the spine). */
const PAGE_PX = 1024;
function pagePx(book: BookId): [number, number] {
  const { w, h } = BOOK_SIZE[book];
  const pw = book === "playground" ? w : w - 0.05;
  return [PAGE_PX, Math.round((PAGE_PX * h) / pw)];
}
/** The corner radius, matching the boards' (BOOK_CORNER, per book). */
const radiusPx = (book: BookId) => (BOOK_CORNER[book] * PAGE_PX) / (book === "playground" ? BOOK_SIZE[book].w : BOOK_SIZE[book].w - 0.05);

type Spread = { canvas: HTMLCanvasElement; textures: Partial<Record<Side, THREE.CanvasTexture>> };
const spreads = new Map<string, Spread>();

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > maxW && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = next;
  }
  if (line) g.fillText(line, x, y);
  return y;
}

/** Dots on a wall, like the reference's polka-dot gallery. */
function dots(g: CanvasRenderingContext2D, W: number, H: number, colour: string, step = 74, r = 15) {
  g.fillStyle = colour;
  for (let y = step / 2, row = 0; y < H; y += step * 0.87, row++)
    for (let x = row % 2 ? step : step / 2; x < W; x += step) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
}

/** The words in the lower right of a spread: kicker, title, a line under it. */
function words(g: CanvasRenderingContext2D, x: number, y: number, maxW: number, kicker: string, title: string, line?: string) {
  g.fillStyle = "rgba(244, 239, 230, 0.75)";
  g.font = `600 26px ${SANS}`;
  g.fillText(kicker.toUpperCase(), x, y);
  g.fillStyle = CHALK;
  g.font = `500 84px ${SERIF}`;
  const end = wrapText(g, title, x, y + 92, maxW, 86);
  if (line) {
    g.font = `400 34px ${SERIF}`;
    g.fillStyle = "rgba(244, 239, 230, 0.88)";
    wrapText(g, line, x, end + 62, maxW, 46);
  }
}

function paint(book: BookId, i: number, sp: Spread) {
  const c = sp.canvas;
  const g = c.getContext("2d")!;
  const W = c.width;
  const H = c.height;
  const top = book === "playground";
  const R = radiusPx(book);
  g.clearRect(0, 0, W, H);
  g.save();
  // Rounded at the spread's outer corners only.
  g.beginPath();
  g.roundRect(0, 0, W, H, R);
  g.clip();
  // Blank for now (16 Nov): one plain paper spread running unbroken across both pages, with just the fold's shadow, until the
  // illustrations arrive (each will be one continuous picture across the spread).
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  if (top) holes(g, W, H);
  const pw = top ? W : W / 2;
  // The page's own button, lower right of the right-hand page.
  const label = actionLabel(book, i);
  if (label) {
    const bw = actionWidth(label);
    const x1 = W - ACTION.right;
    const y1 = H - ACTION.bottom;
    g.fillStyle = "#0C0F12";
    g.beginPath();
    g.roundRect(x1 - bw, y1 - ACTION.h, bw, ACTION.h, ACTION.h / 2);
    g.fill();
    g.fillStyle = "#F4F8FB";
    g.font = `600 ${ACTION.font}px ${SANS}`;
    g.textBaseline = "middle";
    g.fillText(label, x1 - bw + ACTION.padX, y1 - ACTION.h / 2 + 2);
    g.textBaseline = "alphabetic";
  }
  if (!top) {
    // The gutter: a soft shadow either side of the fold.
    const gut = g.createLinearGradient(pw - 120, 0, pw + 120, 0);
    gut.addColorStop(0, "rgba(0,0,0,0)");
    gut.addColorStop(0.47, "rgba(0,0,0,0.10)");
    gut.addColorStop(0.5, "rgba(0,0,0,0.17)");
    gut.addColorStop(0.53, "rgba(0,0,0,0.10)");
    gut.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gut;
    g.fillRect(pw - 120, 0, 240, H);
  }
  g.restore();
  for (const t of Object.values(sp.textures)) if (t) t.needsUpdate = true;
}

const images = new Map<string, HTMLImageElement>();
function imageFor(src: string, onload: () => void) {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.onload = onload;
    img.src = src;
    images.set(src, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

function refresh(book: BookId, i: number) {
  const sp = spreads.get(`${book}:${i}`);
  if (sp) paint(book, i, sp);
}

function spread(book: BookId, i: number): Spread {
  const key = `${book}:${i}`;
  let sp = spreads.get(key);
  if (sp) return sp;
  const [pw, ph] = pagePx(book);
  const c = document.createElement("canvas");
  c.width = book === "playground" ? pw : pw * 2;
  c.height = ph;
  sp = { canvas: c, textures: {} };
  spreads.set(key, sp);
  paint(book, i, sp);
  // The display faces may still be loading: paint again once they're in.
  if (!document.fonts.check(`600 34px ${SANS}`)) document.fonts.load(`600 34px ${SANS}`).then(() => refresh(book, i));
  return sp;
}

let blank: THREE.CanvasTexture | null = null;
/** The back of a Playground page: plain board. */
function blankTexture() {
  if (blank) return blank;
  const [w, h] = pagePx("playground");
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#EDE6D8";
  g.beginPath();
  g.roundRect(0, 0, w, h, radiusPx("playground"));
  g.fill();
  holes(g, w, h);
  blank = new THREE.CanvasTexture(c);
  blank.colorSpace = THREE.SRGBColorSpace;
  return blank;
}

/** The texture for one page side: a half of its spread (side-bound books), or the whole page (the Playground). */
export function pageTexture(book: BookId, index: number, side: Side): THREE.CanvasTexture {
  if (side === "blank") return blankTexture();
  const i = Math.max(0, Math.min(index, PAGE_COUNT[book] - 1));
  const sp = spread(book, i);
  const key: Side = book === "playground" ? "single" : side;
  let t = sp.textures[key];
  if (!t) {
    t = new THREE.CanvasTexture(sp.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (key === "left" || key === "right") {
      t.repeat.set(0.5, 1);
      t.offset.set(key === "left" ? 0 : 0.5, 0);
    }
    sp.textures[key] = t;
  }
  return t;
}
