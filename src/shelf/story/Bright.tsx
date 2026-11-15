import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BOOK_SIZE, STROKE, type BookId, type Pose } from "./layout";

/**
 * The orange objects in the storyboard: the three books and the takeaway cup,
 * as bright full-colour 3D (looks A and B). Sizes from the sketches.
 *
 * `drawn` is storyboard frame 2: the same objects before they "turn 3D",
 * white, so the ink pass draws them as outlines.
 */

const PAGE = "#FBF6EA";
export const CREAM = "#FFF3E3";
export const INK_TEXT = "#1E1E1E";

export const PALETTE = {
  work: "#F0532D",
  about: "#2F55F0",
  playground: "#FFC22E",
  coil: "#1F7A4D",
  cup: "#FF7EAE",
  lid: "#FFFFFF",
  page: PAGE,
};

/** The coil's rings: radius, and how far below the top edge their centres sit. */
export const COIL = { r: 0.105, drop: 0.03, count: 12, inset: 0.08 };

/** The cup, measured off frame 31: body, then a lid that flares at its rim and tapers to its top. */
export const CUP_SHAPE = { botR: 0.107, topR: 0.15, bodyH: 0.34, rimR: 0.184, rimY0: 0.335, rimY1: 0.362, lidTopR: 0.13, h: 0.42 };

const WHITE = new THREE.MeshBasicMaterial({ color: "#FFFFFF" });
const WHITE_2 = new THREE.MeshBasicMaterial({ color: "#FFFFFF", side: THREE.DoubleSide });

function std(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, W: number, H: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const px = (id: BookId) => Math.round((1024 * BOOK_SIZE[id].h) / BOOK_SIZE[id].w);

export function coverWork() {
  return canvasTex(1024, px("work"), (g, W, H) => {
    g.fillStyle = PALETTE.work;
    g.fillRect(0, 0, W, H);
    g.fillStyle = CREAM;
    // Narrow enough to clear the About book standing in front at home.
    g.font = `800 180px ${SANS}`;
    g.fillText("Work", 66, 220);
    g.font = `500 56px ${SANS}`;
    g.fillText("Case studies", 72, 300);
    ["#FFF3E3", "#FFC22E", "#FF9E80", "#FFE1D2"].forEach((c, i) => {
      g.fillStyle = c;
      const x = 80 + i * 84;
      const top = H - 470 - (i % 2) * 70;
      g.beginPath();
      g.roundRect(x, top, 64, H - 100 - top, 14);
      g.fill();
    });
  });
}

export function coverAbout() {
  return canvasTex(1024, px("about"), (g, W, H) => {
    g.fillStyle = PALETTE.about;
    g.fillRect(0, 0, W, H);
    g.fillStyle = CREAM;
    g.font = `800 250px ${SANS}`;
    g.fillText("About", 60, 300);
    g.font = `500 72px ${SANS}`;
    g.fillText("me + résumé", 70, 400);
    const cx = W / 2;
    const cy = H * 0.66;
    g.beginPath();
    g.arc(cx, cy, 300, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALETTE.about;
    g.beginPath();
    g.arc(cx - 105, cy - 65, 34, 0, Math.PI * 2);
    g.arc(cx + 105, cy - 65, 34, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = PALETTE.about;
    g.lineWidth = 34;
    g.lineCap = "round";
    g.beginPath();
    g.arc(cx, cy + 10, 145, 0.2 * Math.PI, 0.8 * Math.PI);
    g.stroke();
  });
}

export function coverPlayground() {
  return canvasTex(1024, px("playground"), (g, W, H) => {
    g.fillStyle = PALETTE.playground;
    g.fillRect(0, 0, W, H);
    // Punched holes where the coil's wire passes through the cover.
    const { pitch, span } = coilLoops();
    const { w: bw, h: bh } = BOOK_SIZE.playground;
    const holeY = ((COIL.drop + COIL.r * Math.sin(Math.acos(BOOK_SIZE.playground.t / 2 / COIL.r))) / bh) * H;
    g.fillStyle = "rgba(60, 46, 20, 0.85)";
    for (let k = 0; k < COIL.count; k++) {
      const x = -span / 2 + pitch * (k - 0.343);
      g.beginPath();
      g.ellipse(((x + bw / 2) / bw) * W, holeY, 9, 10, 0, 0, Math.PI * 2);
      g.fill();
    }
    // In the top strip: the books in front cover the rest at home.
    g.fillStyle = INK_TEXT;
    // Between the coil's holes and the Work book's top edge at home.
    g.font = `800 52px ${SANS}`;
    g.fillText("Playground", 56, 98);
    const star = (x: number, y: number, r: number, c: string) => {
      g.fillStyle = c;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    };
    // Down the right edge, which shows beside the About book.
    star(W - 110, H * 0.36, 70, PALETTE.work);
    g.fillStyle = PALETTE.coil;
    g.beginPath();
    g.arc(W - 105, H * 0.6, 52, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALETTE.cup;
    g.beginPath();
    g.moveTo(W - 160, H * 0.86);
    g.lineTo(W - 50, H * 0.8);
    g.lineTo(W - 70, H * 0.93);
    g.closePath();
    g.fill();
  });
}

export function spineTex(title: string, bg: string, w: number, h: number) {
  return canvasTex(160, Math.round((160 * h) / w), (g, W, H) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2, H * 0.07);
    g.rotate(Math.PI / 2);
    g.fillStyle = CREAM;
    g.font = `800 ${Math.round(W * 0.5)}px ${SANS}`;
    g.textBaseline = "middle";
    g.fillText(title, 0, 0);
    g.restore();
  });
}

/** A flat panel with rounded corners, `t` thick along Z, centred; front-face UVs are its x, y. */
export function slab(w: number, h: number, t: number, r: number, bevel = 0.004) {
  const s = new THREE.Shape();
  const x = -w / 2 + bevel;
  const y = -h / 2 + bevel;
  const W = w - bevel * 2;
  const H = h - bevel * 2;
  const rr = Math.min(r, W / 2, H / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + W - rr, y);
  s.quadraticCurveTo(x + W, y, x + W, y + rr);
  s.lineTo(x + W, y + H - rr);
  s.quadraticCurveTo(x + W, y + H, x + W - rr, y + H);
  s.lineTo(x + rr, y + H);
  s.quadraticCurveTo(x, y + H, x, y + H - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  const depth = Math.max(t - bevel * 2, 0.0005);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function faceMap(tex: THREE.Texture, w: number, h: number) {
  tex.repeat.set(1 / w, 1 / h);
  tex.offset.set(0.5, 0.5);
  return tex;
}

/**
 * Eases a book from pose to pose (the "turn the books" and pull-forward
 * moves). With `onPick` it's clickable: it lifts a little under the pointer.
 */
export function Posed({ pose, onPick, children }: { pose: Pose; onPick?: () => void; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const placed = useRef(false);
  const hover = useRef(false);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const k = placed.current ? 1 - Math.exp(-dt * 3.2) : 1;
    placed.current = true;
    const s = pose.s ?? 1;
    const lift = hover.current && onPick ? 0.035 : 0;
    o.position.x += (pose.x - o.position.x) * k;
    o.position.y += (lift - o.position.y) * Math.min(1, k * 2);
    o.position.z += (pose.z - o.position.z) * k;
    o.rotation.y += (pose.ry - o.rotation.y) * k;
    o.scale.setScalar(o.scale.x + (s - o.scale.x) * k);
  });
  const events = onPick
    ? {
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onPick();
        },
        onPointerOver: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          hover.current = true;
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hover.current = false;
          document.body.style.cursor = "";
        },
      }
    : {};
  return (
    <group ref={g} {...events}>
      {children}
    </group>
  );
}

type Drawn = { drawn: boolean };
const tag = (drawn: boolean) => ({ ink: drawn ? "decor" : "color" });

/** Paper seen edge-on: fine lines, one per few pages. `across`: lines run across the texture (vary in v), else down it. */
export function pageEdges(across: boolean) {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = PAGE;
    g.fillRect(0, 0, W, H);
    let s = 3;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      const p = ((i + 0.3 + rand() * 0.4) / 46) * (across ? H : W);
      g.strokeStyle = `rgba(110, 96, 72, ${0.1 + rand() * 0.12})`;
      g.lineWidth = 1 + rand();
      g.beginPath();
      if (across) {
        g.moveTo(0, p);
        g.lineTo(W, p);
      } else {
        g.moveTo(p, 0);
        g.lineTo(p, H);
      }
      g.stroke();
    }
  });
}

/** A page block's six faces (BoxGeometry order +X, -X, +Y, -Y, +Z, -Z): page edges where they show. */
function pageBlock(sides: "fore" | "both") {
  const plain = std(PAGE, { roughness: 0.92 });
  const down = std("#FFFFFF", { map: pageEdges(false), roughness: 0.92 });
  const across = std("#FFFFFF", { map: pageEdges(true), roughness: 0.92 });
  return [down, sides === "both" ? down : plain, across, across, plain, plain];
}

/**
 * A side-bound hardcover: rounded boards, a round-backed spine at local -X,
 * a page block with its edges showing, cover facing +Z, base at y = 0.
 */
function Hardcover({ id, cover, title, drawn }: { id: "work" | "about"; cover: () => THREE.Texture; title: string } & Drawn) {
  const { w, h, t } = BOOK_SIZE[id];
  const color = PALETTE[id];
  const board = 0.022;
  const over = 0.012;
  const joint = 0.016;
  const res = useMemo(() => {
    const edge = std(color);
    // Half a cylinder facing -X, flattened, for the spine's rounded back.
    const spine = new THREE.CylinderGeometry(t / 2, t / 2, h - 0.004, 32, 1, false, Math.PI, Math.PI);
    // The cover art spans the whole book; the board starts a joint's width in, so shift the art to match.
    const art = faceMap(cover(), w, h);
    art.offset.x = 0.5 + joint / (2 * w);
    return {
      board: slab(w - joint, h, board, 0.035),
      front: [std("#FFFFFF", { map: art }), edge],
      back: [edge, edge],
      spine,
      spineMat: [std("#FFFFFF", { map: spineTex(title, color, t, h) }), edge, edge],
      pages: pageBlock("fore"),
    };
    // cover is a stable module-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, title]);
  const m = (x: THREE.Material | THREE.Material[]) => (drawn ? WHITE : x);
  const left = -w / 2 + joint;
  const pw = w / 2 - over - left;
  return (
    <group position={[0, h / 2, 0]}>
      <mesh geometry={res.board} material={m(res.front)} position={[joint / 2, 0, t / 2 - board / 2]} castShadow receiveShadow userData={tag(drawn)} />
      <mesh geometry={res.board} material={m(res.back)} position={[joint / 2, 0, -(t / 2 - board / 2)]} castShadow receiveShadow userData={tag(drawn)} />
      <mesh geometry={res.spine} material={m(res.spineMat)} position={[left, 0, 0]} scale={[0.34, 1, 1]} castShadow receiveShadow userData={tag(drawn)} />
      <mesh material={m(res.pages)} position={[left + pw / 2, 0, 0]} castShadow receiveShadow userData={tag(drawn)}>
        <boxGeometry args={[pw, h - over * 2, t - board * 2]} />
      </mesh>
    </group>
  );
}

/** The Playground's spiral: one wire, round and round the top edge, advancing a loop at a time. */
export class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private x0: number,
    private pitch: number,
    private turns: number,
    private cy: number,
    private r: number,
  ) {
    super();
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    const th = -Math.PI + u * this.turns * Math.PI * 2;
    return target.set(this.x0 + (this.pitch * th) / (Math.PI * 2), this.cy + this.r * Math.sin(th), this.r * Math.cos(th));
  }
}

/** Where the coil's loops sit across the Playground's top: the first loop's x offset, and the spacing. */
export function coilLoops() {
  const { w } = BOOK_SIZE.playground;
  const span = w - COIL.inset * 2;
  const pitch = span / (COIL.count - 1);
  // A loop's top is a quarter turn on from where it starts, so start it a quarter pitch early.
  return { x0: -span / 2 - pitch * 0.25, pitch, span };
}

/** The Playground sketchbook: bound at the top with a spiral coil, which reads as a dome seen spine-on. */
function Playground({ drawn }: Drawn) {
  const { w, h, t } = BOOK_SIZE.playground;
  const res = useMemo(() => {
    const edge = std(PALETTE.playground);
    const { x0, pitch, span } = coilLoops();
    return {
      geo: slab(w, h, 0.014, 0.03),
      front: [std("#FFFFFF", { map: faceMap(coverPlayground(), w, h) }), edge],
      back: [edge, edge],
      pages: pageBlock("both"),
      coil: std(PALETTE.coil, { roughness: 0.35, metalness: 0.4 }),
      wire: new THREE.TubeGeometry(new Helix(x0, pitch, COIL.count, h / 2 - COIL.drop, COIL.r), COIL.count * 64, 0.007, 8),
      lineRing: new THREE.TorusGeometry(COIL.r, STROKE / 2, 8, 96),
      inkLine: new THREE.MeshBasicMaterial({ color: INK_TEXT }),
      firstLoop: -span / 2,
    };
  }, [w, h]);
  const m = (x: THREE.Material | THREE.Material[]) => (drawn ? WHITE : x);
  return (
    <group position={[0, h / 2, 0]}>
      <mesh geometry={res.geo} material={m(res.front)} position={[0, 0, t / 2 - 0.007]} castShadow receiveShadow userData={tag(drawn)} />
      <mesh geometry={res.geo} material={m(res.back)} position={[0, 0, -(t / 2 - 0.007)]} castShadow receiveShadow userData={tag(drawn)} />
      <mesh material={m(res.pages)} position={[0, -0.03, 0]} castShadow receiveShadow userData={tag(drawn)}>
        <boxGeometry args={[w - 0.03, h - 0.08, t - 0.028]} />
      </mesh>
      {drawn ? (
        // Drawn (frame 2): one loop, as a plain line the stroke's width. Inking the
        // whole coil, end-on, would turn the dome into a black blob.
        <mesh geometry={res.lineRing} material={res.inkLine} position={[res.firstLoop, h / 2 - COIL.drop, 0]} rotation={[0, Math.PI / 2, 0]} userData={{ ink: "skip" }} />
      ) : (
        <mesh geometry={res.wire} material={res.coil} castShadow userData={tag(drawn)} />
      )}
    </group>
  );
}

/** A paper takeaway cup with a lid, as drawn in frame 31. Base at y = 0. */
export function Cup({ drawn }: Drawn) {
  const res = useMemo(() => {
    const c = CUP_SHAPE;
    const v = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
    return {
      body: new THREE.LatheGeometry(v([[0.0001, 0], [c.botR - 0.004, 0], [c.botR, 0.008], [c.topR, c.bodyH]]), 96),
      // Rolled rim, a ridge where it presses on, then a raised top.
      lid: new THREE.LatheGeometry(
        v([
          [c.topR - 0.006, c.rimY0],
          [c.rimR - 0.004, c.rimY0 + 0.002],
          [c.rimR, c.rimY0 + 0.008],
          [c.rimR + 0.002, (c.rimY0 + c.rimY1) / 2],
          [c.rimR, c.rimY1 - 0.004],
          [c.rimR - 0.008, c.rimY1],
          [c.rimR - 0.016, c.rimY1 + 0.002],
          [c.lidTopR + 0.012, c.h - 0.022],
          [c.lidTopR + 0.004, c.h - 0.006],
          [c.lidTopR - 0.006, c.h],
          [0.0001, c.h],
        ]),
        96,
      ),
      bodyMat: std(PALETTE.cup, { roughness: 0.6 }),
      lidMat: std(PALETTE.lid, { roughness: 0.35 }),
    };
  }, []);
  const m = (x: THREE.Material) => (drawn ? WHITE_2 : x);
  return (
    <group>
      <mesh geometry={res.body} material={m(res.bodyMat)} castShadow receiveShadow userData={tag(drawn)} />
      <mesh geometry={res.lid} material={m(res.lidMat)} castShadow receiveShadow userData={tag(drawn)} />
    </group>
  );
}

export function Books({ poses, drawn, onPick }: { poses: Record<BookId, Pose>; onPick?: (id: BookId) => void } & Drawn) {
  const pick = (id: BookId) => (onPick ? () => onPick(id) : undefined);
  return (
    <>
      <Posed pose={poses.work} onPick={pick("work")}>
        <Hardcover id="work" cover={coverWork} title="WORK" drawn={drawn} />
      </Posed>
      <Posed pose={poses.about} onPick={pick("about")}>
        <Hardcover id="about" cover={coverAbout} title="ABOUT" drawn={drawn} />
      </Posed>
      <Posed pose={poses.playground} onPick={pick("playground")}>
        <Playground drawn={drawn} />
      </Posed>
    </>
  );
}
