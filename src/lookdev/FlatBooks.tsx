import { useMemo } from "react";
import { COIL, CREAM, CUP_SHAPE, INK_TEXT, PALETTE, Posed } from "../shelf/story/Bright";
import { PX, useSvgTexture } from "../shelf/story/FlatDecor";
import { INK, LINE, P, U, circle, poly, rrect, wrap } from "../shelf/story/flatArt";
import { BOOK_SIZE, POSES, homePoses, type BookId, type Frame } from "../shelf/story/layout";
import type { V2 } from "../shelf/story/design";

/**
 * Look C: the books and cup as flat illustrations too, in colour, with the
 * same line as everything else. Each book is a paper box with a drawing on
 * each face, so it can still turn from spine-out to covers-out; seen square
 * on, it's just a drawing.
 *
 * `drawn`: frame 2, the same drawings in white.
 */

const HALF = LINE / U / 2;
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** A face's SVG: w x h scene units, origin at its bottom middle, outlined just inside its edge. */
function face(w: number, h: number, fill: string, inner: string, r = 0.02) {
  const body = `<path d="${rrect(-w / 2 + HALF, HALF, w / 2 - HALF, h - HALF, r)}" fill="${fill}"/>${inner}`;
  return wrap([-w / 2, 0], [w / 2, h], body, PX, 0).svg;
}

/** Text, unstroked, at a scene-unit point. `size` in scene units. */
function text(s: string, at: V2, size: number, fill: string, extra = "", weight = 800) {
  return `<text x="${(at[0] * U).toFixed(1)}" y="${(-at[1] * U).toFixed(1)}" font-family='${SANS}' font-weight="${weight}" font-size="${(size * U).toFixed(1)}" fill="${fill}" stroke="none" ${extra}>${s}</text>`;
}

function star(c: V2, r: number, fill: string) {
  const pts: V2[] = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr];
  });
  return `<path d="${poly(pts)}" fill="${fill}"/>`;
}

type Faces = { front: string; back: string; spine: string; fore: string; top: string };

function bookFaces(id: BookId, drawn: boolean): Faces {
  const { w, h, t } = BOOK_SIZE[id];
  const col = drawn ? "#FFFFFF" : PALETTE[id];
  const page = drawn ? "#FFFFFF" : PALETTE.page;
  const x0 = -w / 2;
  let cover = "";
  let spine = "";
  if (!drawn && id === "work") {
    cover =
      text("Work", [x0 + 0.06, h - 0.22], 0.165, CREAM) +
      text("Case studies", [x0 + 0.065, h - 0.29], 0.05, CREAM, "", 500) +
      ["#FFF3E3", "#FFC22E", "#FF9E80", "#FFE1D2"]
        .map((c, i) => {
          const x = x0 + 0.08 + i * 0.075;
          const top = 0.4 + (i % 2) * 0.06;
          return `<path d="${rrect(x, 0.09, x + 0.055, top, 0.012)}" fill="${c}"/>`;
        })
        .join("");
    spine = text("WORK", [0, h - 0.06], 0.075, CREAM, `transform="rotate(90 0 ${(-(h - 0.06) * U).toFixed(1)})" text-anchor="start" dominant-baseline="middle"`);
  }
  if (!drawn && id === "about") {
    const c: V2 = [0, h * 0.34];
    cover =
      text("About", [x0 + 0.04, h - 0.2], 0.15, CREAM) +
      text("me + résumé", [x0 + 0.045, h - 0.265], 0.042, CREAM, "", 500) +
      circle(c, 0.175, `fill="${CREAM}"`) +
      circle([c[0] - 0.06, c[1] + 0.04], 0.02, `fill="${INK}" stroke="none"`) +
      circle([c[0] + 0.06, c[1] + 0.04], 0.02, `fill="${INK}" stroke="none"`) +
      `<path d="M${P([c[0] - 0.075, c[1] - 0.03])} Q${P([c[0], c[1] - 0.12])} ${P([c[0] + 0.075, c[1] - 0.03])}" fill="none"/>`;
    spine = text("ABOUT", [0, h - 0.06], 0.065, CREAM, `transform="rotate(90 0 ${(-(h - 0.06) * U).toFixed(1)})" dominant-baseline="middle"`);
  }
  if (!drawn && id === "playground") {
    const xr = w / 2;
    cover =
      text("Playground", [x0 + 0.05, h - 0.15], 0.1, INK_TEXT) +
      star([xr - 0.12, h * 0.6], 0.08, PALETTE.work) +
      circle([xr - 0.11, h * 0.36], 0.055, `fill="${PALETTE.coil}"`) +
      `<path d="${poly([[xr - 0.17, 0.14], [xr - 0.05, 0.2], [xr - 0.07, 0.07]])}" fill="${PALETTE.cup}"/>`;
  }
  // Page edges: a cover board's edge either side of the page block.
  const board = 0.022;
  const edgeFace = (len: number) =>
    face(t, len, page, drawn ? "" : `<path d="${rrect(-t / 2 + HALF, HALF, -t / 2 + board, len - HALF, 0.005)}" fill="${col}"/><path d="${rrect(t / 2 - board, HALF, t / 2 - HALF, len - HALF, 0.005)}" fill="${col}"/>`);
  return {
    front: face(w, h, col, cover),
    back: face(w, h, col, ""),
    spine: id === "playground" ? edgeFace(h) : face(t, h, col, spine, 0.012),
    fore: edgeFace(h),
    top: face(w, t, page, ""),
  };
}

function Face({ svg, w, h, position, rotation }: { svg: string; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = useSvgTexture(svg);
  if (!tex) return null;
  return (
    <mesh position={position} rotation={rotation} userData={{ ink: "skip" }}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** The Playground's coil, drawn: loops over the top edge seen from the front, a dome seen from the side. */
function coilArt(w: number, h: number) {
  const xs = Array.from({ length: COIL.count }, (_, i) => -w / 2 + COIL.inset + (i * (w - COIL.inset * 2)) / (COIL.count - 1));
  const lift = COIL.r - COIL.drop;
  const loops = xs
    .map((x) => {
      const a: V2 = [x - 0.022, h - 0.05];
      return `${circle(a, 0.011, `fill="${INK}" stroke="none"`)}<path d="M${P(a)} L${P([a[0], h + lift - 0.02])} Q${P([a[0], h + lift])} ${P([a[0] + 0.022, h + lift])} Q${P([a[0] + 0.044, h + lift])} ${P([a[0] + 0.044, h + lift - 0.02])} L${P([a[0] + 0.044, h])}" fill="none"/>`;
    })
    .join("");
  const front = wrap([-w / 2, h - 0.08], [w / 2, h + lift + 0.01], loops, PX, 0);
  const R = COIL.r;
  const half = Math.sqrt(R * R - COIL.drop * COIL.drop);
  const dome = `<path d="M${P([-half, h])} A${(R * U).toFixed(1)} ${(R * U).toFixed(1)} 0 0 1 ${P([half, h])}" fill="none"/>`;
  const side = wrap([-R, h - 0.01], [R, h + lift + 0.01], dome, PX, 0);
  return { front, side };
}

function FlatBook({ id, drawn }: { id: BookId; drawn: boolean }) {
  const { w, h, t } = BOOK_SIZE[id];
  const f = useMemo(() => bookFaces(id, drawn), [id, drawn]);
  const coil = useMemo(() => (id === "playground" ? coilArt(w, h) : null), [id, w, h]);
  const q = Math.PI / 2;
  return (
    <group>
      <Face svg={f.front} w={w} h={h} position={[0, h / 2, t / 2]} />
      <Face svg={f.back} w={w} h={h} position={[0, h / 2, -t / 2]} rotation={[0, Math.PI, 0]} />
      <Face svg={f.spine} w={t} h={h} position={[-w / 2, h / 2, 0]} rotation={[0, -q, 0]} />
      <Face svg={f.fore} w={t} h={h} position={[w / 2, h / 2, 0]} rotation={[0, q, 0]} />
      <Face svg={f.top} w={w} h={t} position={[0, h, 0]} rotation={[-q, 0, 0]} />
      {coil && (
        <>
          <Face svg={coil.front.svg} w={coil.front.max[0] - coil.front.min[0]} h={coil.front.max[1] - coil.front.min[1]} position={[0, (coil.front.min[1] + coil.front.max[1]) / 2, t / 2 + 0.003]} />
          <Face svg={coil.side.svg} w={coil.side.max[0] - coil.side.min[0]} h={coil.side.max[1] - coil.side.min[1]} position={[-w / 2 - 0.003, (coil.side.min[1] + coil.side.max[1]) / 2, 0]} rotation={[0, -q, 0]} />
        </>
      )}
    </group>
  );
}

export function FlatBooks({ frame, drawn }: { frame: Frame; drawn: boolean }) {
  return (
    <>
      {(["work", "about", "playground"] as BookId[]).map((id) => (
        <Posed key={id} pose={(frame === "home" ? homePoses(false) : POSES.intro)[id]}>
          <FlatBook id={id} drawn={drawn} />
        </Posed>
      ))}
    </>
  );
}

export function FlatCup({ drawn }: { drawn: boolean }) {
  const svg = useMemo(() => {
    const c = CUP_SHAPE;
    const body = poly([[-c.botR, 0], [c.botR, 0], [c.topR, c.bodyH], [-c.topR, c.bodyH]]);
    const top = poly([[-c.rimR + 0.012, c.rimY1], [c.rimR - 0.012, c.rimY1], [c.lidTopR, c.h], [-c.lidTopR, c.h]]);
    const rim = rrect(-c.rimR, c.rimY0, c.rimR, c.rimY1, 0.008);
    return wrap(
      [-c.rimR, 0],
      [c.rimR, c.h],
      `<path d="${body}" fill="${drawn ? "#FFFFFF" : PALETTE.cup}"/><path d="${top}"/><path d="${rim}"/>`,
      PX,
    );
  }, [drawn]);
  const tex = useSvgTexture(svg.svg);
  if (!tex) return null;
  return (
    // Drawn after the machine's card, which it stands in front of.
    <mesh position={[(svg.min[0] + svg.max[0]) / 2, (svg.min[1] + svg.max[1]) / 2, 0]} renderOrder={2} userData={{ ink: "skip" }}>
      <planeGeometry args={[svg.max[0] - svg.min[0], svg.max[1] - svg.min[1]]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

