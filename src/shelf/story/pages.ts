import * as THREE from "three";
import { CASES } from "../routes";
import { ABOUT_SPREADS, CASE_INFO, PLAYGROUND_PAGES } from "./content";
import { BOOK_CORNER, BOOK_SIZE, type BookId } from "./layout";
import { ABOUT, CV, EDUCATION, EXPERIENCE } from "../../desk/organized/content";

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

/* ---------- The About book's pages (16 Nov): the About section and the CV, set like the earlier About book's spreads ---------- */

const A_INK = "#1B1B1C";
const A_MUTED = "#7A7D84";
const A_RULE = "#CFCFD2";
const A_SERIF = '"Roboto Slab", Georgia, serif';
const A_SANS = '"DM Sans", "Helvetica Neue", Arial, sans-serif';

function wrapped(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
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
  return y + lh;
}

/** A picture cropped to fill a rounded box (or a soft grey box until it has loaded). */
function photo(g: CanvasRenderingContext2D, src: string, x: number, y: number, w: number, h: number, again: () => void) {
  const img = imageFor(src, again);
  g.save();
  g.beginPath();
  g.roundRect(x, y, w, h, 18);
  g.clip();
  if (img) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s;
    const sh = h / s;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  } else {
    g.fillStyle = "#E7E4DC";
    g.fillRect(x, y, w, h);
  }
  g.restore();
}

const dash = (d: string) => d.replace(/\u2018/g, "\u2019");

/**
 * The About book's type and grid (16 Nov), in the spread's own 1342 x 900 units: one margin all round (78), one baseline for
 * every page's title (114), the same bottom edge for everything (819, where the photo grid ends), and four type sizes:
 *   title 30 serif, body 22 / 32, label 20 medium (section headings), row 18 / 24 with 14 for detail lines and 13 mono for dates.
 */
const GRID = { margin: 78, top: 80, bottom: 819, colW: 530, rightX: 738, titleY: 114, gutter: 16 };

function paintAbout(g: CanvasRenderingContext2D, i: number, W: number, H: number, again: () => void) {
  const k = W / 1342;
  const { margin, bottom, colW, rightX, titleY, gutter } = GRID;
  const lx = margin * k;
  const rx = rightX * k;
  const cw = colW * k;
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  const title = (text: string, x: number) => {
    g.fillStyle = A_INK;
    g.font = `400 ${30 * k}px ${A_SERIF}`;
    g.fillText(text, x, titleY * k);
  };
  const label = (text: string, x: number, y: number) => {
    g.fillStyle = A_INK;
    g.font = `500 ${20 * k}px ${A_SANS}`;
    g.fillText(text, x, y);
  };
  const body = (text: string, x: number, y: number) => {
    g.fillStyle = A_MUTED;
    g.font = `400 ${22 * k}px ${A_SANS}`;
    return wrapped(g, text, x, y, cw, 32 * k);
  };
  if (i === 0) {
    // Spread 1: the About copy over three photographs on the left; four photographs on the right. Both pages end on one edge.
    title("Hi, I\u2019m Dvija Patel.", lx);
    let y = 170 * k;
    for (const p of ABOUT.paragraphs) y = body(p, lx, y) + 10 * k;
    const px = (n: number) => n * k;
    // Left: one tall photograph and two stacked, from the top of the right page's lower-left photo (416) to the common bottom.
    const half = (colW - gutter) / 2;
    photo(g, "/assets/aboutme/Images/Image_5.jpg", px(margin), px(416), px(half), px(bottom - 416), again);
    photo(g, "/assets/aboutme/Images/Image_6.jpg", px(margin + half + gutter), px(416), px(half), px((bottom - 416 - gutter) / 2), again);
    photo(g, "/assets/aboutme/Images/Image_7.jpg", px(margin + half + gutter), px(416 + (bottom - 416 - gutter) / 2 + gutter), px(half), px((bottom - 416 - gutter) / 2), again);
    // Right: the four-up grid, as in the earlier book.
    photo(g, "/assets/aboutme/Images/Image_1.jpg", px(731), px(80), px(251.5), px(320), again);
    photo(g, "/assets/aboutme/Images/Image_2.jpg", px(1012.5), px(80), px(251.5), px(360), again);
    photo(g, "/assets/aboutme/Images/Image_3.jpg", px(731), px(416), px(251.5), px(bottom - 416), again);
    photo(g, "/assets/aboutme/Images/Image_4.jpg", px(1012.5), px(456), px(251.5), px(bottom - 456), again);
    return;
  }
  // Spread 2: the r\u00e9sum\u00e9. Left: title, summary, work experience. Right: education, then contact, above the PDF button.
  title("R\u00e9sum\u00e9", lx);
  let y = body(CV.summary, lx, 170 * k);
  const logoAt = (src: string | undefined, name: string, x: number, yy: number) => {
    const sz = 26 * k;
    const img = src ? imageFor(src, again) : null;
    g.save();
    g.beginPath();
    g.roundRect(x, yy, sz, sz, 5 * k);
    g.clip();
    if (img) g.drawImage(img, x, yy, sz, sz);
    else {
      g.fillStyle = A_INK;
      g.fillRect(x, yy, sz, sz);
      g.fillStyle = PAPER;
      g.font = `700 ${14 * k}px ${A_SERIF}`;
      g.textAlign = "center";
      g.fillText(name.charAt(0), x + sz / 2, yy + sz * 0.7);
    }
    g.restore();
    g.textAlign = "left";
  };
  const lines = (text: string, maxW: number, font: string) => {
    g.font = font;
    const out: string[] = [];
    let line = "";
    for (const w of text.split(" ")) {
      const next = line ? `${line} ${w}` : w;
      if (g.measureText(next).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = next;
    }
    out.push(line);
    return out;
  };
  // One row of the CV: mark and organisation, role (with a detail line), dates on the right. Returns the next row's top.
  const row = (x: number, top: number, logo: string | undefined, org: string, role: string, sub: string | undefined, dates: string) => {
    const f17 = `400 ${18 * k}px ${A_SANS}`;
    const f14 = `400 ${14 * k}px ${A_SANS}`;
    const base = top + 20 * k;
    logoAt(logo, org, x, top);
    const o = lines(org, 150 * k, f17);
    const r = lines(role, 150 * k, f17);
    const sl = sub ? lines(sub, 150 * k, f14) : [];
    g.fillStyle = A_INK;
    g.font = f17;
    o.forEach((l, n) => g.fillText(l, x + 38 * k, base + n * 24 * k));
    r.forEach((l, n) => g.fillText(l, x + 214 * k, base + n * 24 * k));
    g.fillStyle = A_MUTED;
    g.font = f14;
    sl.forEach((l, n) => g.fillText(l, x + 214 * k, base + r.length * 24 * k - 2 * k + n * 19 * k));
    g.font = `400 ${13 * k}px "DM Mono", monospace`;
    g.textAlign = "right";
    g.fillText(dash(dates), x + cw, base);
    g.textAlign = "left";
    const h = Math.max(o.length * 24 * k, r.length * 24 * k + sl.length * 19 * k);
    return top + h + 28 * k;
  };
  // Left page: work experience.
  y += 36 * k;
  label("Work Experience", lx, y);
  y += 30 * k;
  for (const e of EXPERIENCE.slice(0, 5)) y = row(lx, y, e.logo, e.company, e.role, undefined, e.dates);
  // Right page: education from the title baseline, contact up from the bottom.
  label("Education", rx, titleY * k);
  let ey = (titleY + 30) * k;
  for (const e of EDUCATION) ey = row(rx, ey, e.logo, e.school, e.degree, e.details, e.dates);
  const contactTop = 640;
  label("Contact", rx, contactTop * k);
  let cy = (contactTop + 40) * k;
  for (const c of CV.contact) {
    g.fillStyle = A_MUTED;
    g.font = `400 ${18 * k}px ${A_SANS}`;
    g.fillText(c.label, rx, cy);
    g.fillStyle = A_INK;
    g.fillText(c.value, rx + 150 * k, cy);
    g.fillStyle = A_RULE;
    g.fillRect(rx, cy + 14 * k, cw, 1.5);
    cy += 46 * k;
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
  if (book === "about") paintAbout(g, i, W, H, () => refresh(book, i));
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
  try {
    paint(book, i, sp);
  } catch (err) {
    // A page that failed to paint is dropped, so the next request paints it again instead of showing a blank sheet for good.
    spreads.delete(key);
    console.warn("[shelf] a page failed to paint", err);
  }
  // The display faces may still be loading: paint again once they're in.
  if (!document.fonts.check(`600 34px ${SANS}`)) document.fonts.load(`600 34px ${SANS}`).then(() => refresh(book, i));
  if (book === "about" && !document.fonts.check(`400 30px ${A_SERIF}`)) Promise.all([document.fonts.load(`400 30px ${A_SERIF}`), document.fonts.load(`400 30px ${A_SANS}`)]).then(() => refresh(book, i));
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
