import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { anim } from "../anim";
import { DRAWN, toy } from "../toy";
import type { ObjectMeta, ObjectProps } from "./types";

/**
 * The takeaway cup on the coffee machine's drip tray (the left cup in
 * refs/cup-rooth-sleeves.png): a white paper cup with a slight taper and a
 * rolled rim, a white sip lid (a skirt and bead that grip the rim, a tall
 * wall, a raised ring round a shallow dish, a raised sip spout with its
 * drink-through slot, a vent hole), and an orange fluted cardboard sleeve
 * (fine vertical flutes, rolled-over top and bottom edges, a glued seam on
 * the right) with a small white wordmark.
 *
 * Clicking it opens the contact view (the scene wires that). The scene also
 * lifts the lid and pours (frames 4 and 31): the lid is its own group, read
 * from anim.lid every frame (0 shut, 1 lifted and tipped back on its back
 * edge), and the coffee's surface sits just under the rim, shown only while
 * the lid is up. The sleeve never moves.
 *
 * Scene units: 0.42 tall, the lid 0.305 across. Origin at the middle of the
 * foot, front +Z.
 */

export const meta: ObjectMeta = {
  name: "cup",
  kind: "toy",
  refs: ["docs/storyboard/refs/cup-rooth-sleeves.png", "docs/storyboard/refs/cup-kraft-seed-now.png"],
  width: 0.31,
  height: 0.42,
  depth: 0.31,
};

/** The wordmark on the sleeve. */
const WORDMARK = "dvija";

/* ---------- Measurements (from the photo, scaled to 0.42 tall) ---------- */

/** The paper cup's outside radius at height y: a straight cone. */
const R0 = 0.1025;
const TAPER = 0.1045;
const rc = (y: number) => R0 + TAPER * y;
/** Top of the rolled rim, and the coffee's surface just under it. */
const RIM_Y = 0.344;
const COFFEE_Y = 0.326;
/** Sleeve: bottom and top, its board thickness, the rolled edges' height, the seam. */
const SLEEVE = { y0: 0.058, y1: 0.275, t: 0.0045, edge: 0.0028, seam: THREE.MathUtils.degToRad(98), flap: THREE.MathUtils.degToRad(24), flapT: 0.0022 };
/** Flutes round the sleeve. */
const FLUTES = 300;
/** The lid's hinge for the lift: its back edge, on top of the bead. */
const HINGE = { y: 0.356, z: -0.152 };
/** The lid fully lifted (anim.lid = 1): tipped back on its hinge, hopped up and back a touch. */
/** Where the lid rests beside the cup, flat on the tray (relative to the cup's foot): the lid's skirt (y = 0.333) set down on the tray. */
const ASIDE = { x: 0.31, y: -0.332, z: 0.03 };
const LID_OPEN = { tip: THREE.MathUtils.degToRad(72), lift: 0.025, back: 0.02 };

const SEG = 128;

/** Coffee falling: a stream that wobbles and narrows as it drops, with moving bands and a bright edge, so it reads as liquid and not a rod. */
function streamMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uT;
      varying float vY;
      varying vec3 vN;
      void main() {
        vY = position.y;
        vec3 p = position;
        // A smooth, steady stream: a little thicker where it leaves the spout, drawing in as it falls (gravity stretches it), with
        // only the faintest shiver.
        float neck = 1.0 + 0.32 * p.y;
        p.xz *= neck * (1.0 + 0.025 * sin(p.y * 9.0 - uT * 11.0));
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uT;
      varying float vY;
      varying vec3 vN;
      void main() {
        // Dark espresso with a warm golden edge (the crema) and one soft glossy highlight along it.
        float edge = pow(1.0 - abs(vN.z), 1.6);
        vec3 core = vec3(0.12, 0.06, 0.03);
        vec3 rim = vec3(0.50, 0.30, 0.12);
        vec3 c = mix(core, rim, edge * 0.8);
        float gloss = smoothstep(0.55, 0.9, vN.x * 0.8 + 0.35) * (0.5 + 0.1 * sin(vY * 14.0 - uT * 6.0));
        c += vec3(1.0, 0.88, 0.7) * gloss * 0.45;
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  return m;
}

// ----- The guest's name as pen strokes -----

type InkPlan = { key: string; glyph: HTMLCanvasElement; w: number; h: number; path: [number, number][]; stroke: number };
const inkPlans = new Map<string, InkPlan>();

/** Zhang-Suen thinning: the glyph's one-pixel centre line. */
function thin(a: Uint8Array, w: number, h: number) {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[y * w + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      const kill: number[] = [];
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          if (!a[y * w + x]) continue;
          const p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1), p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let A = 0;
          for (let i = 0; i < 8; i++) if (!seq[i] && seq[i + 1]) A++;
          if (A !== 1) continue;
          if (step === 0 ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0 : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) kill.push(y * w + x);
        }
      if (kill.length) {
        changed = true;
        for (const i of kill) a[i] = 0;
      }
    }
  }
}

/** The order a pen would lay the name down in: from the left, along each stroke, lifting and jumping to the next unwritten bit on the left. */
function inkPlan(name: string): InkPlan {
  const key = `${name}|${document.fonts?.check(`700 64px ${HANDWRITING}`) ? 1 : 0}`;
  const hit = inkPlans.get(key);
  if (hit) return hit;
  const size = 220;
  const [gc, gg] = canvas(1, 1);
  gg.font = `700 ${size}px ${HANDWRITING}`;
  const w = Math.ceil(gg.measureText(name).width + 80);
  const h = Math.ceil(size * 1.5);
  gc.width = w;
  gc.height = h;
  gg.font = `700 ${size}px ${HANDWRITING}`;
  gg.textAlign = "center";
  gg.textBaseline = "middle";
  gg.fillStyle = "#16120F";
  gg.fillText(name, w / 2, h / 2);
  const data = gg.getImageData(0, 0, w, h).data;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  // The stroke width: twice the typical distance to the edge; approximated from the glyph's area over its skeleton length.
  let area = 0;
  for (let i = 0; i < a.length; i++) area += a[i];
  thin(a, w, h);
  const pts: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i]) pts.push(i);
  const stroke = Math.max(10, area / Math.max(1, pts.length));
  // Written as a person writes: letter by letter from the left; within a letter, each stroke starts at its top-left end and runs
  // one way, following its direction of travel, then the pen lifts to the next stroke (top to bottom, left to right).
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const total = gg.measureText(name).width;
  const x0 = w / 2 - total / 2;
  const cuts: number[] = [];
  for (let i = 0; i <= name.length; i++) cuts.push(x0 + gg.measureText(name.slice(0, i)).width);
  const order: [number, number][] = [];
  const has = new Set(pts);
  const neighbours = (i: number) => {
    const x = i % w, y = Math.floor(i / w);
    let n = 0;
    for (const [dx, dy] of nb) if (has.has((y + dy) * w + (x + dx))) n++;
    return n;
  };
  for (let L = 0; L < name.length; L++) {
    const band = pts.filter((i) => {
      const x = i % w;
      return x >= cuts[L] && (x < cuts[L + 1] || L === name.length - 1);
    });
    const left = new Set(band);
    while (left.size) {
      // Where the next stroke begins: an open end if there is one (top-left first), otherwise the top of a loop.
      let start = -1;
      let best = Infinity;
      for (const i of left) {
        const x = i % w, y = Math.floor(i / w);
        const open = neighbours(i) <= 1;
        const score = y + 0.35 * x + (open ? 0 : 400);
        if (score < best) {
          best = score;
          start = i;
        }
      }
      let cur = start;
      let dir: [number, number] = [-0.4, 1];
      while (cur >= 0) {
        left.delete(cur);
        const x = cur % w, y = Math.floor(cur / w);
        order.push([x, y]);
        let next = -1;
        let top = -Infinity;
        for (const [dx, dy] of nb) {
          const q = (y + dy) * w + (x + dx);
          if (!left.has(q)) continue;
          const sc = dx * dir[0] + dy * dir[1];
          if (sc > top) {
            top = sc;
            next = q;
          }
        }
        if (next >= 0) {
          const nx = next % w, ny = Math.floor(next / w);
          dir = [dir[0] * 0.6 + (nx - x) * 0.4, dir[1] * 0.6 + (ny - y) * 0.4];
        }
        cur = next;
      }
    }
  }
  const plan = { key, glyph: gc, w, h, path: order, stroke };
  inkPlans.set(key, plan);
  return plan;
}


/** The group head's spouts, above the cup (cup-local), and how far either side of the middle. */
const SPOUT_Y = 0.452;
const SPOUT_DX = 0.03;

/** In the object lab only: /?objlab=cup&lid=1 shows the lid lifted (the coffee under it). */
if (import.meta.env.DEV && typeof window !== "undefined") {
  const q = new URLSearchParams(window.location.search);
  if (q.get("objlab") === "cup" && q.has("lid")) anim.lid = Number(q.get("lid")) || 0;
}

type P = [number, number] | [number, number, "crease"];

/** A lathe from a profile, duplicating the points marked "crease" so the shading (and the drawn line) breaks there. */
function lathe(points: P[], segments = SEG) {
  const v: THREE.Vector2[] = [];
  for (const p of points) {
    v.push(new THREE.Vector2(p[0], p[1]));
    if (p[2] === "crease") v.push(new THREE.Vector2(p[0], p[1]));
  }
  // Start at the back, so u = 0.5 faces the front.
  // Hard edges where the profile turns sharply (the lid's rim, the sleeve's edges), so they draw as one unbroken line.
  const g = new THREE.LatheGeometry(v, segments, -Math.PI, Math.PI * 2);
  const creased = toCreasedNormals(g, 0.45);
  g.dispose();
  return creased;
}

/** A circle arc of profile points, angles in degrees, counter-clockwise. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / n);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

/* ---------- The paper cup ---------- */

function cupGeometry() {
  const roll = 0.0034;
  const rollC: [number, number] = [rc(RIM_Y - roll) + 0.0021, RIM_Y - roll];
  const floorY = COFFEE_Y - 0.012;
  const pts: P[] = [
    // The recessed bottom, out to the foot ring.
    [0.0001, 0.005],
    [0.095, 0.005],
    [0.0975, 0.0012],
    [0.0995, 0.0001],
    [0.1012, 0.0003],
    [0.1021, 0.0013],
    [rc(0.0035), 0.0035],
    [rc(0.009), 0.009],
    // The wall.
    [rc(0.17), 0.17],
    [rc(RIM_Y - 0.012), RIM_Y - 0.012],
    [rc(RIM_Y - 0.0075), RIM_Y - 0.0075],
    // Rolled rim: round the outside, over the top, down the inside.
    ...arc(rollC[0], rollC[1], roll, 235, 540, 14),
    // Inside wall, down under the coffee, and a floor.
    [rc(RIM_Y - 0.012) - 0.0012, RIM_Y - 0.012],
    [rc(floorY) - 0.0012, floorY],
    [0.0001, floorY],
  ];
  return lathe(pts);
}

/* ---------- The lid ---------- */

/** The lid's top: the raised ring's crest, and the dish inside it. */
const LID_RING_Y = 0.4038;
const LID_DISH_Y = 0.4;

function lidGeometry() {
  const pts: P[] = [
    // Underside, from the middle out, then down inside the skirt.
    [0.0001, LID_DISH_Y - 0.0022],
    [0.118, LID_DISH_Y - 0.0022],
    [0.1312, 0.3965],
    [0.1374, 0.3655],
    [0.1386, 0.3598],
    [0.1466, 0.3586],
    [0.1462, 0.3345],
    // The skirt's lower edge.
    [0.1466, 0.3333],
    [0.1475, 0.3329],
    [0.1483, 0.3335],
    // Up the skirt and round the bead, its widest point.
    [0.1488, 0.3352],
    [0.1495, 0.338],
    [0.1503, 0.341],
    [0.1515, 0.3442],
    [0.1523, 0.3476],
    [0.1525, 0.3505],
    [0.1522, 0.3535],
    [0.1513, 0.3563],
    [0.1499, 0.3586],
    [0.148, 0.3603],
    [0.1458, 0.3612],
    // The ledge, then the wall.
    [0.1408, 0.3615, "crease"],
    [0.1398, 0.366],
    [0.1356, 0.3915],
    // Rounded shoulder up to the ring's crest.
    [0.1348, 0.3952],
    [0.1334, 0.3986],
    [0.1314, 0.4013],
    [0.1288, 0.4031],
    [0.1258, 0.4038],
    [0.1228, 0.4034],
    [0.1202, 0.402],
    // Down into the dish.
    [0.1182, 0.4004],
    [0.1165, LID_DISH_Y, "crease"],
    [0.06, LID_DISH_Y],
    [0.0001, LID_DISH_Y],
  ];
  return lathe(pts);
}

/* ---------- The sleeve ---------- */

/**
 * The sleeve as one wrapped band: a cone just off the cup, its top and
 * bottom edges rolled in to meet the paper (a crease where they turn, so
 * frame 2 draws one line there), and the glued end lapping over itself on
 * the right, with a cut edge you can see.
 */
function sleeveGeometry(drawn = false) {
  const { y0, y1, t, edge, seam, flap } = SLEEVE;
  // The overlap's step only exists in colour; the drawing has no seam line.
  const flapT = drawn ? 0 : SLEEVE.flapT;
  // Rows up the profile: [y, how far out (0 on the paper, 1 the full board)].
  const rows: [number, number][] = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    rows.push([y0 + edge * s, s * s]);
  }
  rows.push([y0 + edge, 1]);
  rows.push([y1 - edge, 1]);
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    rows.push([y1 - edge + edge * s, (1 - s) * (1 - s)]);
  }
  // Columns round, starting at the seam's cut edge.
  const N = 200;
  const cut = 0.035;
  const cols: number[] = [];
  for (let i = 0; i <= 6; i++) cols.push(seam + (cut * i) / 6);
  cols.push(seam + cut);
  for (let j = 1; j <= N; j++) {
    const th = seam + (Math.PI * 2 * j) / N;
    if (th > seam + cut + 0.005) cols.push(th);
  }
  const lap = (th: number) => {
    const d = th - seam;
    if (d < 0 || d > flap) return 0;
    if (d <= cut) return (d / cut) * (d / cut);
    // Full over the lap, easing down over the other end's edge underneath.
    const ramp = THREE.MathUtils.degToRad(5);
    return d < flap - ramp ? 1 : THREE.MathUtils.smoothstep(flap - d, 0, ramp);
  };
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const put = (th: number, y: number, f: number, thick: number, u: number, v: number) => {
    const r = rc(y) + 0.0002 + f * thick;
    pos.push(Math.sin(th) * r, y, Math.cos(th) * r);
    uv.push(u, v);
  };
  const vOf = (y: number) => (y - y0) / (y1 - y0);
  const C = cols.length - 1;
  for (let j = 0; j <= C; j++) {
    const th = cols[j];
    // The crease column (index 7) is the lap's full top, kept apart for a crisp edge.
    const thick = t + flapT * (j === C ? 0 : j === 7 ? 1 : lap(th));
    for (const [y, f] of rows) put(th, y, f, thick, th / (Math.PI * 2) + 0.5, vOf(y));
  }
  const R = rows.length;
  // Each row pair once: the duplicate rows (the creases) make zero-area strips, which keeps their normals apart.
  for (let j = 0; j < C; j++)
    for (let i = 0; i < R - 1; i++) {
      const a = j * R + i;
      const b = (j + 1) * R + i;
      idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- Textures ---------- */

const ORANGE = "#C9502E";

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** The sleeve's print: the orange board, its flutes' faint grooves and cross lines, the cut edges, and the wordmark at the front. */
const HANDWRITING = '"Caveat", "Segoe Script", cursive';

function sleeveMap() {
  const W = 2048;
  const H = 560;
  const [c, g] = canvas(W, H);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  const { y0, y1, t, edge } = SLEEVE;
  const h = y1 - y0;
  const draw = () => {
    g.fillStyle = ORANGE;
    g.fillRect(0, 0, W, H);
    // A soft mottle, like dyed board.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? "120,30,10" : "255,170,120"},${0.02 + rnd() * 0.03})`;
      const x = rnd() * W;
      const y = rnd() * H;
      g.fillRect(x, y, 3 + rnd() * 30, 2 + rnd() * 14);
    }
    // The flutes' grooves, faintly darker.
    const fw = W / FLUTES;
    g.fillStyle = "rgba(90,20,5,0.06)";
    for (let i = 0; i < FLUTES; i++) g.fillRect(i * fw, 0, 1, H);
    // Faint cross lines, as in the board's emboss.
    g.fillStyle = "rgba(90,20,5,0.06)";
    const step = H / 11;
    for (let y = step * 0.5; y < H; y += step) g.fillRect(0, Math.round(y), W, 1.5);
    // The cut edges: darker board.
    const e = Math.ceil((edge / h) * H) + 1;
    g.fillStyle = "#7A3A22";
    g.fillRect(0, 0, W, e * 0.6);
    g.fillStyle = "rgba(122,58,34,0.55)";
    g.fillRect(0, e * 0.6, W, e * 0.5);
    g.fillStyle = "rgba(110,40,20,0.35)";
    g.fillRect(0, H - e, W, e);
    // The wordmark: small, wide, spaced, at the front, low on the band.
    const pxY = H / h;
    const rText = rc(0.09) + t;
    const pxX = W / (Math.PI * 2 * rText);
    const capH = 0.0175 * pxY;
    const size = capH / 0.72;
    g.save();
    g.translate(W / 2, H - (0.081 - y0) * pxY);
    g.scale((pxX / pxY) * 0.82, 1);
    g.font = `600 ${size}px "DM Sans", "Helvetica Neue", Arial, sans-serif`;
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${size * 0.16}px`;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#FBF7F2";
    g.fillText(WORDMARK, size * 0.1, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  // The guest's name, laid down as pen strokes: a brush follows the letters' centre line in writing order (left to right, along
  // each stroke), and only the ink under the brush shows.
  const [mc, mg] = canvas(1, 1);
  const [cc, cg] = canvas(1, 1);
  let drawn = 0;
  let maskKey = "";
  tex.userData.writeInk = (name: string, p: number) => {
    draw();
    if (!name || p <= 0) return;
    const plan = inkPlan(name);
    const pxY = H / h;
    const rText = rc(0.09) + t;
    const pxX = W / (Math.PI * 2 * rText);
    const sx = (pxX / pxY) * 0.82;
    const scale = (0.085 * pxY) / 220;
    if (maskKey !== plan.key + "|" + plan.w) {
      mc.width = cc.width = plan.w;
      mc.height = cc.height = plan.h;
      maskKey = plan.key + "|" + plan.w;
      drawn = 0;
      mg.clearRect(0, 0, plan.w, plan.h);
    }
    const target = Math.floor(plan.path.length * Math.min(1, p));
    if (target < drawn) {
      mg.clearRect(0, 0, plan.w, plan.h);
      drawn = 0;
    }
    mg.fillStyle = "#000";
    const r = plan.stroke * 0.8;
    for (let i = drawn; i < target; i++) {
      const [x, y] = plan.path[i];
      mg.beginPath();
      mg.arc(x, y, r, 0, Math.PI * 2);
      mg.fill();
    }
    drawn = target;
    cg.clearRect(0, 0, plan.w, plan.h);
    cg.globalCompositeOperation = "source-over";
    cg.drawImage(plan.glyph, 0, 0);
    if (p < 1) {
      cg.globalCompositeOperation = "destination-in";
      cg.drawImage(mc, 0, 0);
    }
    cg.globalCompositeOperation = "source-over";
    g.save();
    g.translate(W / 2, H * 0.47);
    g.scale(sx, 1);
    g.rotate(-0.03);
    g.drawImage(cc, (-plan.w / 2) * scale, (-plan.h / 2) * scale, plan.w * scale, plan.h * scale);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load(`600 64px "DM Sans"`).then(draw, () => {});
  return tex;
}

/** The flutes as a normal map: rounded ridges, narrow grooves, and a faint cross groove. One flute per tile across. */
function fluteNormals() {
  const W = 32;
  const H = 64;
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H);
  const hgt = (x: number) => Math.pow(Math.max(0, Math.sin(Math.PI * x)), 0.55);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const du = (hgt(u + 0.01) - hgt(u - 0.01)) / 0.02;
      let nx = -du * 0.22;
      // The cross groove, a soft dip.
      const dy = (y + 0.5) / H - 0.5;
      const ny = Math.abs(dy) < 0.06 ? -Math.sign(dy) * 0.25 * (1 - Math.abs(dy) / 0.06) : 0;
      nx *= 1;
      const l = Math.hypot(nx, ny, 1);
      const k = (y * W + x) * 4;
      img.data[k] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[k + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[k + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(FLUTES, 11);
  tex.anisotropy = 8;
  return tex;
}

/** The coffee's top: crema, paler at the wall where it climbs. */
function cremaMap() {
  const [c, g] = canvas(256, 256);
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "#5A321C");
  r.addColorStop(0.6, "#6E3F22");
  r.addColorStop(0.88, "#8A5530");
  r.addColorStop(0.97, "#B5885E");
  r.addColorStop(1, "#C9A27A");
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The soft shadow the cup sits in, seen from above: a dark contact ring at
 * the foot and a soft fall-off to the back right (the key light is front
 * left). Plane space: 1 unit across, the foot's middle at its centre.
 */
const SHADOW_SIZE = 1.1;
function shadowMap() {
  const S = 512;
  const [c, g] = canvas(S, S);
  const px = S / SHADOW_SIZE;
  const cx = S / 2;
  const cy = S / 2;
  // Canvas x is +x, canvas y is +z (front).
  const dir = new THREE.Vector2(0.55, -0.83).normalize();
  const len = 0.16;
  g.fillStyle = "#000";
  g.filter = `blur(${0.045 * px}px)`;
  g.globalAlpha = 0.24;
  g.beginPath();
  const r0 = 0.103 * px;
  const r1 = 0.14 * px;
  for (let k = 0; k <= 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    g.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
  }
  g.fill();
  for (let s = 0.15; s <= 1.001; s += 0.12) {
    g.globalAlpha = 0.2 * (1 - s * 0.7);
    g.beginPath();
    g.arc(cx + dir.x * len * s * px, cy + dir.y * len * s * px, THREE.MathUtils.lerp(r0, r1, s), 0, Math.PI * 2);
    g.fill();
  }
  // The contact: tight and darker.
  g.filter = `blur(${0.008 * px}px)`;
  g.globalAlpha = 0.55;
  g.beginPath();
  g.arc(cx, cy, 0.1 * px, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

/* ---------- The object ---------- */

export default function Cup({ drawn = false }: ObjectProps) {
  const lid = useRef<THREE.Group>(null);
  const streams = useRef<THREE.Group>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const lastInk = useRef({ name: "", p: -1 });
  const aside = useRef<THREE.Group>(null);
  const coffee = useRef<THREE.Mesh>(null);
  const k = useMemo(() => {
    const sleeveMat = toy("#FFFFFF", {
      map: sleeveMap(),
      normalMap: fluteNormals(),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.78,
      clearcoat: 0,
      sheen: 0.35,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#FFB08A"),
    });
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowMap(), color: "#2A2622", transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const shadowGeo = new THREE.PlaneGeometry(SHADOW_SIZE, SHADOW_SIZE);
    shadowGeo.rotateX(-Math.PI / 2);
    const coffeeGeo = new THREE.CircleGeometry(rc(COFFEE_Y) - 0.0013, 64);
    coffeeGeo.rotateX(-Math.PI / 2);
    // The sip spout: a low, long dome on the lid's ring at the back left, its drink-through slot on top.
    const spout = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const slot = new THREE.CapsuleGeometry(0.0024, 0.02, 4, 16);
    slot.rotateZ(Math.PI / 2);
    const vent = new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 20);
    // A coffee stream: unit tall, hanging down from its top, scaled to the gap between the spout and the surface.
    const stream = new THREE.CylinderGeometry(0.0058, 0.0058, 1, 18, 24, true);
    stream.translate(0, -0.5, 0);
    return {
      stream,
      streamMat: streamMaterial(),
      ripple: new THREE.CircleGeometry(1, 40),
      rippleMat: new THREE.MeshBasicMaterial({ color: "#6B4426", transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }),
      cup: cupGeometry(),
      lid: lidGeometry(),
      sleeve: sleeveGeometry(drawn),
      spout,
      slot,
      vent,
      shadowGeo,
      coffeeGeo,
      paper: toy("#FFFFFF", { emissive: new THREE.Color("#FFFFFF"), emissiveIntensity: 0.14, roughness: 0.82, clearcoat: 0, sheen: 0.2, sheenRoughness: 0.8 }),
      plastic: toy("#FFFFFF", { emissive: new THREE.Color("#FFFFFF"), emissiveIntensity: 0.14, roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.18, sheen: 0 }),
      hole: toy("#6E6E6C", { roughness: 0.6, clearcoat: 0, sheen: 0 }),
      sleeveMat,
      shadowMat,
      coffeeMat: toy("#FFFFFF", { map: cremaMap(), roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08, sheen: 0 }),
    };
  }, [drawn]);

  useFrame(() => {
    const a = THREE.MathUtils.clamp(anim.lid, 0, 1.2);
    const l = lid.current;
    if (l) {
      // Tips back on the hinge at its back edge, with a little hop up and back.
      l.rotation.x = -LID_OPEN.tip * a;
      l.position.set(0, HINGE.y + LID_OPEN.lift * Math.sin(Math.min(1, a) * Math.PI * 0.5), HINGE.z - LID_OPEN.back * a);
    }
    // The lid rests on the tray beside the cup (anim.lidAside = 1) until the coffee view lifts it back on.
    const side = THREE.MathUtils.clamp(anim.lidAside, 0, 1);
    // Only the cup comes forward and grows: its lid stays on the tray where it was put (undo the cup's move, turn and growth).
    const xf = anim.cupXf;
    const ax = ASIDE.x * side - xf.dx;
    const ay = ASIDE.y * side - xf.dy;
    const c = Math.cos(-xf.rz);
    const sn = Math.sin(-xf.rz);
    aside.current?.position.set((ax * c - ay * sn) / xf.sc, (ax * sn + ay * c) / xf.sc, (ASIDE.z * side - xf.dz) / xf.sc);
    aside.current?.scale.setScalar(1 / xf.sc);
    aside.current?.rotation.set(0, 0, -xf.rz);
    // The coffee: fills from the bottom as anim.fill goes 0 to 1 (the surface is a disc, narrower lower down the cone).
    const level = THREE.MathUtils.clamp(anim.fill * (1 - 0.8 * anim.spillOut), 0, 1);
    if (coffee.current) {
      const y = THREE.MathUtils.lerp(COFFEE_Y - 0.1, COFFEE_Y, level);
      coffee.current.visible = level > 0.01 && anim.tip < 0.35;
      coffee.current.position.y = y;
      const r = rc(y) / rc(COFFEE_Y);
      coffee.current.scale.set(r, 1, r);
    }
    // Two streams from the group head's spouts to the surface while pouring.
    if (streams.current) {
      const pour = THREE.MathUtils.clamp(anim.pour, 0, 1);
      streams.current.visible = pour > 0.01;
      const surface = THREE.MathUtils.lerp(COFFEE_Y - 0.1, COFFEE_Y, level);
      streams.current.scale.y = Math.max(0.001, (SPOUT_Y - surface) * Math.min(1, pour * 1.6));
      (k.streamMat as THREE.ShaderMaterial).uniforms.uT.value = performance.now() / 1000;
      // Where the stream lands, the surface ripples.
      const rp = rippleRef.current;
      if (rp) {
        rp.visible = pour > 0.3 && level > 0.01;
        const ph = (performance.now() / 1000) % 0.5;
        const rr = rc(surface) * 0.8;
        rp.position.set(0, surface + 0.001, 0);
        rp.scale.set(rr, rr, rr);
        (k.rippleMat as THREE.MeshBasicMaterial).opacity = 0.45 + 0.2 * Math.sin(ph * 12.6);
      }
    }
    // The name on the sleeve, written as anim.ink goes 0 to 1.
    const li = lastInk.current;
    if (li.p !== anim.ink || li.name !== anim.inkName) {
      li.p = anim.ink;
      li.name = anim.inkName;
      // The function lives on the texture itself, so it always repaints the texture this cup is wearing.
      (k.sleeveMat.map?.userData.writeInk as ((n: string, p: number) => void) | undefined)?.(anim.inkName, anim.ink);
    }
    // The shadow belongs to the 3D cup, not the drawing.
    k.shadowMat.opacity = 1 - DRAWN.value;
  });

  const ink = { ink: drawn ? "decor" : "color" };
  const SPOUT_AT = THREE.MathUtils.degToRad(-138);
  const VENT_AT = THREE.MathUtils.degToRad(122);
  return (
    <group>
      <mesh geometry={k.cup} material={k.paper} castShadow receiveShadow userData={ink} />
      <mesh geometry={k.sleeve} material={k.sleeveMat} castShadow receiveShadow userData={ink} />
      <mesh ref={coffee} geometry={k.coffeeGeo} material={k.coffeeMat} position={[0, COFFEE_Y, 0]} visible={false} userData={ink} />
      <mesh ref={rippleRef} geometry={k.ripple} material={k.rippleMat} rotation={[-Math.PI / 2, 0, 0]} visible={false} userData={{ ink: "skip" }} />
      <group ref={streams} position={[0, SPOUT_Y, 0]} visible={false}>
        {[-SPOUT_DX, SPOUT_DX].map((x) => (
          <mesh key={x} geometry={k.stream} material={k.streamMat} position={[x, 0, 0]} userData={{ ink: "skip" }} />
        ))}
      </group>
      <group ref={aside}>
      <group ref={lid} position={[0, HINGE.y, HINGE.z]}>
        <group position={[0, -HINGE.y, -HINGE.z]}>
          <mesh geometry={k.lid} material={k.plastic} castShadow receiveShadow userData={ink} />
          <group rotation={[0, SPOUT_AT, 0]}>
            <mesh geometry={k.spout} material={k.plastic} position={[0, LID_RING_Y - 0.0035, 0.122]} scale={[0.04, 0.0135, 0.019]} castShadow receiveShadow userData={ink} />
            <mesh geometry={k.slot} material={k.hole} position={[0, LID_RING_Y + 0.0085, 0.118]} scale={[1, 0.55, 1]} userData={ink} />
          </group>
          <group rotation={[0, VENT_AT, 0]}>
            <mesh geometry={k.vent} material={k.hole} position={[0, LID_DISH_Y - 0.0004, 0.104]} userData={ink} />
          </group>
        </group>
      </group>
      </group>
      {/* Not part of the drawing: hidden from the ink pass. */}
      <mesh geometry={k.shadowGeo} material={k.shadowMat} position={[0, 0.0008, 0]} renderOrder={-1} userData={{ ink: "skip" }} />
    </group>
  );
}

