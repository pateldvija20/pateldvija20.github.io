import { useMemo } from "react";
import * as THREE from "three";
import { roundedBox } from "../geometry";
import { mat } from "../materials";
import {
  DOOR_GRID,
  bandedSpine,
  catTab,
  doorFlapCover,
  folderLabel,
  sketchbookCover,
  stampCover,
  starSpillCover,
} from "../textures";
import { linen, pageLines } from "../surfaces";

/**
 * The books and paper objects (spec §5). Every object's origin is the middle
 * of its base, sitting on the shelf top, front facing +Z.
 */

/** Book cloth: matte, with a linen weave you can see where the light grazes it. */
const CLOTH = { roughness: 0.86, normalMap: linen(), normalScale: 0.55 };
const PAGE = "#F4F0E4";

/**
 * A flat panel seen face-on with rounded corners (a cover, a folder): a
 * rounded rectangle extruded `t` deep along Z, centred. Its front face's UVs
 * are its x, y in scene units, so `faceMap` fits a texture to it exactly.
 */
function slab(w: number, h: number, t: number, r: number, bevel = 0.004) {
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
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Stretches a canvas texture over a `slab` face of w x h. */
function faceMap(tex: THREE.Texture, w: number, h: number) {
  tex.repeat.set(1 / w, 1 / h);
  tex.offset.set(0.5, 0.5);
  return tex;
}

/**
 * A cloth ribbon marker (refs/43): out of the pages, over the head and down
 * the face of the spine. Built as a flat strip along a curve in the YZ
 * plane, `w` wide in X.
 */
function ribbonGeo(points: THREE.Vector3[], w: number) {
  const pts = new THREE.CatmullRomCurve3(points).getPoints(48);
  const pos: number[] = [];
  const idx: number[] = [];
  pts.forEach((p, i) => {
    pos.push(p.x - w / 2, p.y, p.z, p.x + w / 2, p.y, p.z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * A hardback standing spine-out (refs/58, pick 2): two cloth boards, a
 * tinted page block between them (stained edges, as on refs/08), and a
 * rounded spine with pale head and tail bands and its title.
 */
function SpineBook({
  x,
  color,
  title,
  thickness,
  height,
  depth,
  ornament,
  ribbon,
}: {
  x: number;
  color: string;
  title: string;
  thickness: number;
  height: number;
  depth: number;
  ornament?: boolean;
  /** Colour of the ribbon marker, if it has one. */
  ribbon?: string;
}) {
  const BOARD = 0.016;
  const BULGE = 0.024;
  const parts = useMemo(() => {
    const t = thickness;
    const r = (t * t) / 4 / (2 * BULGE) + BULGE / 2;
    const half = Math.asin(t / 2 / r);
    const spine = new THREE.CylinderGeometry(r, r, height, 18, 1, true, -half, half * 2);
    // Head cap: the circular segment between the curve and the boards.
    const cap = new THREE.Shape();
    for (let i = 0; i <= 18; i++) {
      const a = -half + (i / 18) * half * 2;
      const px = r * Math.sin(a);
      const pz = r * Math.cos(a) - r * Math.cos(half);
      if (i === 0) cap.moveTo(px, -pz);
      else cap.lineTo(px, -pz);
    }
    cap.closePath();
    const capGeo = new THREE.ShapeGeometry(cap);
    capGeo.rotateX(-Math.PI / 2);
    return {
      r,
      spine,
      capGeo,
      board: roundedBox(BOARD, height, depth - BULGE, 0.008, 0.004),
      tex: bandedSpine(color, title, { ornament, size: ornament ? 40 : 44, aspect: height / thickness }),
      ribbon: (() => {
        const top = height / 2;
        const f = depth / 2;
        return ribbonGeo(
          [
            new THREE.Vector3(0, top - 0.03, f - 0.12),
            new THREE.Vector3(0, top + 0.02, f - 0.13),
            new THREE.Vector3(0, top + 0.045, f - 0.19),
            new THREE.Vector3(0, top + 0.03, f - 0.27),
            new THREE.Vector3(0, top + 0.01, f - 0.36),
            new THREE.Vector3(0, top + 0.006, f - 0.55),
          ],
          0.03,
        );
      })(),
    };
  }, [thickness, height, depth, color, title, ornament]);
  // Cream pages, faintly stained with the cloth colour (refs/08, 58).
  const block = new THREE.Color(color).lerp(new THREE.Color(PAGE), 0.86).getStyle();
  const zFront = depth / 2 - BULGE;
  return (
    <group position={[x, height / 2, 0]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={parts.board}
          material={mat(color, CLOTH)}
          position={[s * (thickness / 2 - BOARD / 2), 0, -BULGE / 2]}
          castShadow
          receiveShadow
        />
      ))}
      {/* The page block, a millimetre or so in from the boards' edges. */}
      <mesh position={[0, 0, -BULGE / 2 - 0.006]} castShadow receiveShadow>
        <boxGeometry args={[thickness - BOARD * 2 + 0.002, height - 0.012, depth - BULGE - 0.016]} />
        <meshStandardMaterial color={block} roughness={0.92} normalMap={pageLines()} normalScale={new THREE.Vector2(0.8, 0.8)} />
      </mesh>
      <mesh geometry={parts.spine} position={[0, 0, depth / 2 - parts.r]} castShadow receiveShadow>
        <meshStandardMaterial map={parts.tex} roughness={0.84} normalMap={linen()} normalScale={new THREE.Vector2(0.5, 0.5)} />
      </mesh>
      <mesh geometry={parts.capGeo} material={mat(color, CLOTH)} position={[0, height / 2, zFront]} />
      {ribbon ? (
        <mesh geometry={parts.ribbon} position={[thickness * 0.3, 0, 0]} castShadow>
          <meshStandardMaterial color={ribbon} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * 2. The four case studies (titles and pastel cloth: Dvija) in a series box.
 * Book size after refs/04-08: a big square-ish hardback, about 27 x 20 cm and
 * 4 cm thick. The box is a solid card case open at the front and top, as
 * deep and tall as the books (refs/11), with the half-round thumb notch of
 * the slipcase in refs/10 showing the end book's cloth. Its outer walls wear
 * the door-flap cover of refs/13: a grid of colour blocks, and on the side
 * the visitor sees, three tiles are little doors standing ajar on black
 * windows. Each book has a ribbon marker over its head (refs/43).
 */
export function CaseStudies() {
  const books: { color: string; title: string; ribbon: string }[] = [
    { color: "#93C49A", title: "Bind Desk", ribbon: "#E5483B" },
    { color: "#F29A78", title: "Billy and Buddy", ribbon: "#F5D547" },
    { color: "#F4C3CE", title: "Greenera", ribbon: "#6E93DA" },
    { color: "#8DB8E3", title: "The Family Table", ribbon: "#B48AE8" },
  ];
  const T = 0.215;
  const H = 1.34;
  const D = 1.0;
  const wall = 0.06;
  const inner = books.length * T + 0.012;
  const boxW = inner + wall * 2;
  const boxD = D + wall;
  const sideH = H + wall + 0.01;
  const notch = { y: 0.58, r: 0.1 };

  const box = mat("#F1ECE1", { roughness: 0.78 });
  const flapInside = mat("#CFC6B6", { roughness: 0.85 });
  const parts = useMemo(() => {
    // Side profile in (z, y), front at +z, with the half-round thumb notch.
    const zf = boxD / 2;
    const s = new THREE.Shape();
    s.moveTo(-zf, 0);
    s.lineTo(zf, 0);
    s.lineTo(zf, notch.y * sideH - notch.r * sideH);
    s.absarc(zf, notch.y * sideH, notch.r * sideH, -Math.PI / 2, Math.PI / 2, true);
    s.lineTo(zf, sideH);
    s.lineTo(-zf, sideH);
    s.closePath();
    const side = new THREE.ExtrudeGeometry(s, { depth: wall - 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 16 });
    side.translate(0, 0, 0.002);
    side.rotateY(-Math.PI / 2);
    const right = doorFlapCover(notch);
    const left = doorFlapCover(notch, false);
    left.wrapS = THREE.RepeatWrapping;
    left.repeat.x = -1;
    left.offset.x = 1;
    return {
      side,
      base: roundedBox(boxW, wall, boxD, 0.006, 0.003),
      back: roundedBox(boxW, sideH, wall, 0.006, 0.003),
      covers: { right, left },
    };
  }, [boxD, boxW, sideH]);

  const cw = boxD / DOOR_GRID.cols;
  const ch = sideH / DOOR_GRID.rows;
  return (
    <group>
      <mesh geometry={parts.base} material={box} position={[0, wall / 2, 0]} castShadow receiveShadow />
      <mesh geometry={parts.back} material={box} position={[0, sideH / 2, -boxD / 2 + wall / 2]} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={parts.side} material={box} position={[s > 0 ? boxW / 2 : -boxW / 2 + wall, 0, 0]} castShadow receiveShadow />
          {/* The door-flap cover on the outside face. */}
          <mesh position={[s * (boxW / 2 + 0.0015), sideH / 2, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <planeGeometry args={[boxD, sideH]} />
            <meshStandardMaterial map={s > 0 ? parts.covers.right : parts.covers.left} roughness={0.82} alphaTest={0.5} />
          </mesh>
        </group>
      ))}
      {/* The doors, each its own tile, hinged on its back edge and only just
          ajar, so they stay inside the wall's outline from the front. */}
      {DOOR_GRID.windows.map(([c, r, color], i) => {
        const zh = boxD / 2 - (c + 1) * cw;
        const y = sideH - (r + 0.5) * ch;
        const face = mat(color, { roughness: 0.82 });
        return (
          <group key={i} position={[boxW / 2 + 0.003, y, zh]} rotation={[0, 0.09 + i * 0.04, 0]}>
            <mesh position={[0.002, 0, cw / 2]} material={[face, flapInside, flapInside, flapInside, flapInside, flapInside]} castShadow>
              <boxGeometry args={[0.003, ch - 0.004, cw - 0.004]} />
            </mesh>
          </group>
        );
      })}
      <group position={[0, wall, wall / 2]}>
        {books.map((b, i) => (
          <SpineBook
            key={b.title}
            x={-inner / 2 + T / 2 + 0.006 + i * T}
            color={b.color}
            title={b.title}
            thickness={T - 0.006}
            height={H}
            depth={D - 0.004}
            ribbon={b.ribbon}
          />
        ))}
      </group>
    </group>
  );
}

/** A coil's helix: loops round the left edge, climbing `pitch` per turn. */
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private cx: number,
    private r: number,
    private y0: number,
    private turns: number,
    private pitch: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(this.cx + Math.cos(a) * this.r, this.y0 + (a / (Math.PI * 2)) * this.pitch, Math.sin(a) * this.r);
  }
}

/**
 * 4. Experiments: a spiral notebook standing face out. The binding is a
 * green plastic coil looping round the left edge (refs/16), the cover is the
 * deep green card scattered with illustrated stamps of refs/30, and a cat
 * page tab (refs/41) peeps over the top.
 */
export function Experiments() {
  // Taller than the case-study books (1.39 with their box), as Dvija asked.
  const W = 1.04;
  const H = 1.62;
  // Loops about 15% of the cover's width across (refs/16).
  const R = 0.08;
  const holeX = 0.045;
  const turns = 28;
  const y0 = 0.07;
  const pitch = (H - 0.14) / turns;
  const parts = useMemo(() => {
    const cx = -W / 2 + holeX - R;
    const coil = new THREE.TubeGeometry(new Helix(cx, R, y0, turns, pitch), turns * 22, 0.0105, 6, false);
    // Holes sit where each loop pierces the front cover.
    const pierce = Math.asin(0.047 / R) / (Math.PI * 2);
    const holes = Array.from({ length: turns }, (_, k) => (y0 + (k + pierce) * pitch) / H);
    const holeU = (holeX - R * (1 - Math.cos(pierce * Math.PI * 2))) / W;
    return {
      coil,
      front: slab(W, H, 0.014, 0.01),
      back: slab(W, H, 0.016, 0.01),
      tex: faceMap(stampCover(holes, holeU, H / W), W, H),
      tab: catTab("#F6EEDF", "#F39A4A", "#FBF7EE", "book"),
    };
  }, [pitch]);
  const green = mat("#1F7A4E", { roughness: 0.82 });
  return (
    <group position={[0.058, 0, 0.05]} rotation={[-0.06, 0, 0]}>
      <mesh geometry={parts.back} material={green} position={[0, H / 2, -0.042]} castShadow receiveShadow />
      {/* The page stack, offset a touch to the right as in refs/16. */}
      <mesh position={[0.006, H / 2, -0.002]} castShadow receiveShadow>
        <boxGeometry args={[W - 0.03, H - 0.03, 0.066]} />
        <meshStandardMaterial color={PAGE} roughness={0.92} normalMap={pageLines()} normalScale={new THREE.Vector2(0.6, 0.6)} />
      </mesh>
      <mesh geometry={parts.front} position={[0, H / 2, 0.04]} castShadow receiveShadow>
        <meshStandardMaterial attach="material-0" map={parts.tex} roughness={0.82} />
        <meshStandardMaterial attach="material-1" color="#1F7A4E" roughness={0.82} />
      </mesh>
      <mesh geometry={parts.coil} material={mat("#3FAE55", { roughness: 0.35, rim: 0.15 })} castShadow />
      {/* A cat page tab slipped between the pages: only the cat shows above. */}
      <mesh position={[-0.12, H + 0.085, 0.012]}>
        <planeGeometry args={[0.28, 0.28]} />
        <meshStandardMaterial map={parts.tab} roughness={0.7} alphaTest={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * 5. About: one slim hardback spine-out beside the spiral. Its spine follows
 * refs/34 (By the Books) rather than refs/03 or 31-33: those are saturated or
 * black and white, and refs/34's slim spines with small diamond marks at
 * head and tail suit the pastel set. Dvija's red stays; it is refs/34's red.
 */
export function About() {
  return (
    <group>
      <SpineBook x={0} color="#C8432E" title="About" thickness={0.2} height={1.16} depth={0.8} ornament />
    </group>
  );
}

/**
 * 8. Résumé: a pale grey card pocket folder (refs/18). The front flap is cut
 * away down its right side below an S-curve, so the typed sheets and a lime
 * tab show between it and the back panel, which stands a little wider. Its
 * label sits low on the left.
 */
export function Resume() {
  const W = 0.88;
  const H = 1.28;
  const geos = useMemo(() => {
    const L = -W / 2;
    const Rf = L + 0.795;
    const Rn = L + 0.7;
    const r = 0.07;
    const s = new THREE.Shape();
    s.moveTo(L + r, 0);
    s.lineTo(Rn - r, 0);
    s.quadraticCurveTo(Rn, 0, Rn, r);
    s.lineTo(Rn, 0.64 * H);
    s.bezierCurveTo(Rn, 0.7 * H, Rf, 0.7 * H, Rf, 0.76 * H);
    s.lineTo(Rf, H - r);
    s.quadraticCurveTo(Rf, H, Rf - r, H);
    s.lineTo(L + r, H);
    s.quadraticCurveTo(L, H, L, H - r);
    s.lineTo(L, r);
    s.quadraticCurveTo(L, 0, L + r, 0);
    const front = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 16 });
    return { front, back: slab(W, H, 0.012, 0.07), label: folderLabel() };
  }, []);
  return (
    <group position={[0, 0, 0.05]} rotation={[-0.07, 0, 0]}>
      <mesh geometry={geos.back} material={mat("#C3C9CC", { roughness: 0.75 })} position={[0, H / 2, -0.04]} castShadow receiveShadow />
      {/* Two clean sheets inside, the front one's right edge just short of the back panel. */}
      <mesh position={[0.012, H / 2 - 0.005, -0.029]} rotation={[0, 0, -0.008]}>
        <planeGeometry args={[0.83, H - 0.05]} />
        <meshStandardMaterial color="#ECEBE6" roughness={0.9} />
      </mesh>
      <mesh position={[0.0, H / 2 - 0.02, -0.022]} castShadow>
        <planeGeometry args={[0.83, H - 0.07]} />
        <meshStandardMaterial color="#F7F6F2" roughness={0.9} />
      </mesh>
      {/* The lime index tab, a thin card standing a few mm proud of the back panel. */}
      <mesh position={[W / 2 + 0.004, 0.5 * H, -0.032]} castShadow>
        <boxGeometry args={[0.036, 0.3 * H, 0.003]} />
        <meshStandardMaterial color="#D6EE5C" roughness={0.65} />
      </mesh>
      <mesh geometry={geos.front} material={mat("#D3D8DB", { roughness: 0.72 })} position={[0, 0, -0.008]} castShadow receiveShadow />
      <mesh position={[-W / 2 + 0.05 + 0.3, 0.25 * H, 0.0075]}>
        <planeGeometry args={[0.6, 0.375]} />
        <meshStandardMaterial map={geos.label} transparent roughness={0.72} />
      </mesh>
    </group>
  );
}

/**
 * 9 and 10. Illustrations, a mustard cloth sketchbook with an elastic band
 * and a sticker (refs/14), and Random design thoughts leaning in front: a
 * kraft, saddle-stitched pocket notebook with red thread (refs/15) whose
 * window spills paper stars down the cover (refs/29). The photos replace the
 * earlier black and blue covers.
 */
export function Notebooks() {
  const SW = 1.0;
  const SH = 1.06;
  const KW = 0.6;
  const KH = 0.84;
  const parts = useMemo(
    () => ({
      board: slab(SW, SH, 0.02, 0.045),
      spine: roundedBox(0.06, SH, 0.13, 0.028, 0.008),
      cover: faceMap(sketchbookCover(), SW, SH),
      kraft: slab(KW, KH, 0.007, 0.035, 0.002),
      kraftTex: faceMap(starSpillCover(), KW, KH),
      tab: catTab("#F08A3A", "#F6EEDF", "#E0793A", "lying"),
    }),
    [],
  );
  const yellow = mat("#F1B53F", CLOTH);
  const band = mat("#E8AD3C", { roughness: 0.6 });
  return (
    <group>
      <group position={[-0.12, 0, -0.08]} rotation={[-0.05, 0, 0]}>
        <mesh geometry={parts.board} material={yellow} position={[0, SH / 2, -0.055]} castShadow receiveShadow />
        <mesh position={[0.01, SH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[SW - 0.04, SH - 0.03, 0.09]} />
          <meshStandardMaterial color={PAGE} roughness={0.92} normalMap={pageLines()} normalScale={new THREE.Vector2(0.6, 0.6)} />
        </mesh>
        <mesh geometry={parts.spine} material={yellow} position={[-SW / 2 + 0.03, SH / 2, 0]} castShadow receiveShadow />
        <mesh geometry={parts.board} position={[0, SH / 2, 0.055]} castShadow receiveShadow>
          <meshStandardMaterial attach="material-0" map={parts.cover} roughness={0.86} normalMap={linen()} normalScale={new THREE.Vector2(0.5, 0.5)} />
          <meshStandardMaterial attach="material-1" color="#F1B53F" roughness={0.86} />
        </mesh>
        {/* The elastic band, round the fore-edge side from top to bottom. */}
        <mesh material={band} position={[SW / 2 - 0.1, SH / 2, 0.068]}>
          <boxGeometry args={[0.032, SH + 0.006, 0.005]} />
        </mesh>
        {[0, SH].map((y) => (
          <mesh key={y} material={band} position={[SW / 2 - 0.1, y + (y ? 0.002 : -0.002), 0.0]}>
            <boxGeometry args={[0.032, 0.005, 0.14]} />
          </mesh>
        ))}
        {/* A cat page tab slipped between the pages (refs/41). */}
        <mesh position={[-0.22, SH, 0.02]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshStandardMaterial map={parts.tab} roughness={0.7} alphaTest={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={[0.36, KH / 2 + 0.002, 0.14]} rotation={[-0.1, -0.08, 0]}>
        {/* Front and back kraft covers, with the pages between them set in at
            head and tail, so the pages show only at the fore-edge. */}
        {[0.019, -0.019].map((z) => (
          <mesh key={z} geometry={parts.kraft} position={[0, 0, z]} castShadow receiveShadow>
            <meshStandardMaterial attach="material-0" map={parts.kraftTex} roughness={0.9} />
            <meshStandardMaterial attach="material-1" color="#A98258" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0.004, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[KW - 0.012, KH - 0.03, 0.032]} />
          <meshStandardMaterial color="#EFE6D2" roughness={0.92} />
        </mesh>
        {/* The fold: the kraft cover wraps the spine edge, so no pages show there. */}
        <mesh position={[-KW / 2 + 0.003, 0, 0]}>
          <boxGeometry args={[0.008, KH - 0.008, 0.047]} />
          <meshStandardMaterial color="#A98258" roughness={0.9} />
        </mesh>
        {/* Red saddle stitches along the spine fold. */}
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[-KW / 2 - 0.002, -KH / 2 + 0.08 + i * ((KH - 0.16) / 6), 0]}>
            <boxGeometry args={[0.004, 0.05, 0.012]} />
            <meshStandardMaterial color="#C8383A" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
