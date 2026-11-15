import { useMemo } from "react";
import * as THREE from "three";
import { mat } from "../materials";
import { lathe, potProfile, ribbed, seeded } from "../shapes";
import { dots } from "../textures";

/**
 * The planters (spec §5). Origins sit at the middle of the pot's base.
 * Leaves are thin shapes, all from one seeded random per plant, so each plant
 * grows the same way on every load. Pot patterns are painted on canvases that
 * wrap once around the pot (u) and run from its base to its rim (v).
 */

const SOIL = "#5A4636";
const UP = new THREE.Vector3(0, 1, 0);
/** Toward the viewer: plants turn their leaves to the room, as in the photos. */
const VIEW = new THREE.Vector3(0, 0, 1);

function Soil({ r, y }: { r: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[r, 32]} />
      <meshStandardMaterial color={SOIL} roughness={1} />
    </mesh>
  );
}

/** Little round legs under a pot. */
function Legs({ r, count = 3, color }: { r: number; count?: number; color: string }) {
  const geo = useMemo(() => lathe([[0, 0], [0.035, 0], [0.042, 0.04], [0.032, 0.14], [0, 0.15]], 16), []);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.PI / 2;
        return <mesh key={i} geometry={geo} material={mat(color)} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} castShadow />;
      })}
    </>
  );
}

/** A canvas texture. `wrap` repeats it both ways (leaf patterns); pots only wrap around. */
function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, wrap = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  if (wrap) t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Canvas height for a pot texture of width W, so a painted circle stays round on the pot. */
const potCanvasH = (W: number, h: number, r: number) => Math.round((W * h) / (Math.PI * 2 * r));

/** A lathe pot whose v runs up by height, so painted bands sit at the right height. */
function potGeo(profile: [number, number][], h: number, segments = 72) {
  const g = lathe(profile, segments);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, Math.min(Math.max(p.getY(i) / h, 0), 1));
  uv.needsUpdate = true;
  return g;
}

/** A straight-sided pot: soft base edge, a thin flat-cut rim, a short inner wall. */
function cylProfile(h: number, r0: number, r1: number, wall = 0.014): [number, number][] {
  return [
    [0, 0], [r0 - 0.025, 0], [r0 - 0.006, 0.005], [r0, 0.022],
    [r1, h - 0.003], [r1 - 0.002, h], [r1 - wall + 0.002, h], [r1 - wall, h - 0.003], [r1 - wall, h - 0.12],
  ];
}

/** Black dots, scattered or in offset rows, painted on a light band. */
function dotField(
  g: CanvasRenderingContext2D, W: number, y0: number, y1: number, rand: () => number,
  o: { rows: number; perRow: number; r: [number, number]; jitter: number; round?: number },
) {
  const step = (y1 - y0) / o.rows;
  for (let row = 0; row < o.rows; row++) {
    for (let i = 0; i < o.perRow; i++) {
      const x = ((i + (row % 2) * 0.5 + (rand() - 0.5) * o.jitter) / o.perRow) * W;
      const y = y0 + (row + 0.5 + (rand() - 0.5) * o.jitter) * step;
      const r = o.r[0] + rand() * (o.r[1] - o.r[0]);
      o.round ??= 1;
      for (const dx of [-W, 0, W]) {
        g.beginPath();
        g.ellipse(x + dx, y, r, r * o.round, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}

/** Faint dark speckle, like a stoneware clay body. */
function speckle(g: CanvasRenderingContext2D, W: number, H: number, rand: () => number, n: number, color = "rgba(80,70,60,0.45)") {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.arc(rand() * W, rand() * H, 0.6 + rand() * 1.3, 0, Math.PI * 2);
    g.fill();
  }
}

/** Pilea's leaf: a round pad, very slightly domed, stem under its middle. Dome along +Y. */
function padLeaf(r: number) {
  const dome = r * 0.025;
  const g = new THREE.RingGeometry(0.0005, r, 40, 5);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = Math.hypot(p.getX(i), p.getZ(i)) / r;
    p.setY(i, dome * (1 - k * k));
  }
  g.computeVertexNormals();
  return { geo: g, dome };
}

type PileaLook = { leaf: string; leafAlt: string; dot: string; stem: string; dotR: number; gloss: number };

/**
 * Pilea: round pad leaves on thin curved stems, the lower ones reaching wider
 * (refs/23, refs/26). `face` turns them toward the viewer; `droop` adds side
 * leaves [angle, height] that bend over the rim and hang below it. Each leaf
 * has the faint pale dot where its stem meets it.
 */
function Pilea({
  y, count, seed, size, lift, reach, look, face = 0, droop = [], minFace = -1,
}: {
  y: number; count: number; seed: number; size: [number, number]; lift: [number, number]; reach: number; look: PileaLook;
  face?: number; droop?: [number, number][];
  /** No leaf turns further from the viewer than this (its face normal's z), so none shows edge-on. */
  minFace?: number;
}) {
  const key = JSON.stringify([seed, count, size, lift, reach, face, droop, minFace]);
  const items = useMemo(() => {
    const rand = seeded(seed);
    const make = (a: number, hgt: number, out: number, tilt: number, sag: boolean) => {
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const end = new THREE.Vector3(radial.x * out, hgt, radial.z * out);
      const n = radial.clone().multiplyScalar(Math.sin(tilt)).addScaledVector(UP, Math.cos(tilt)).addScaledVector(VIEW, face).normalize();
      while (n.z < minFace) n.addScaledVector(VIEW, 0.1).normalize();
      const { geo, dome } = padLeaf(size[0] + rand() * (size[1] - size[0]));
      const mid = sag
        ? new THREE.Vector3(radial.x * out * 0.75, 0.08, radial.z * out * 0.75)
        : new THREE.Vector3(radial.x * out * 0.3, hgt * 0.55, radial.z * out * 0.3);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(radial.x * 0.02, -0.03, radial.z * 0.02), mid, end.clone().addScaledVector(n, -0.008)]);
      return {
        end, dome, geo,
        q: new THREE.Quaternion().setFromUnitVectors(UP, n),
        stem: new THREE.TubeGeometry(curve, 10, 0.005, 5, false),
        alt: rand() < 0.4,
      };
    };
    const out = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.7;
      const k = rand();
      const hgt = lift[0] + k * (lift[1] - lift[0]);
      const o = reach * (1 - 0.6 * k) * (0.8 + rand() * 0.22);
      return make(a, hgt, o, 0.35 + 0.65 * (o / reach) + (rand() - 0.5) * 0.3, false);
    });
    for (const [a, hgt] of droop) out.push(make(a, hgt, reach * 0.95, 1.35, true));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const dotGeo = useMemo(() => new THREE.CircleGeometry(look.dotR, 12), [look.dotR]);
  const leafMat = mat(look.leaf, { roughness: look.gloss, side: THREE.DoubleSide });
  const altMat = mat(look.leafAlt, { roughness: look.gloss, side: THREE.DoubleSide });
  return (
    <group position={[0, y, 0]}>
      {items.map((it, i) => (
        <group key={i}>
          <mesh geometry={it.stem} material={mat(look.stem, { roughness: 0.6 })} />
          <group position={it.end} quaternion={it.q}>
            <mesh geometry={it.geo} material={it.alt ? altMat : leafMat} castShadow />
            <mesh geometry={dotGeo} material={mat(look.dot, { roughness: 0.6 })} position={[0, it.dome + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          </group>
        </group>
      ))}
    </group>
  );
}

const SMILE_LEAVES: PileaLook = { leaf: "#3E6B52", leafAlt: "#46785B", dot: "#7FA58A", stem: "#7FA36A", dotR: 0.005, gloss: 0.42 };
const WAVY_LEAVES: PileaLook = { leaf: "#3A8030", leafAlt: "#438C37", dot: "#5E9F4C", stem: "#86AE55", dotR: 0.0045, gloss: 0.45 };

/** Fine horizontal print lines for the 3D-printed smile pot, as a normal map. */
function printLines() {
  const t = paint(4, 64, (g) => {
    for (let y = 0; y < 64; y++) {
      const s = Math.sin((y / 64) * Math.PI * 2 * 8);
      g.fillStyle = `rgb(128, ${Math.round(128 + s * 70)}, 255)`;
      g.fillRect(0, y, 4, 1);
    }
  }, true);
  t.colorSpace = THREE.NoColorSpace;
  t.repeat.set(1, 13);
  return t;
}

/**
 * 3. Pilea in a sand-coloured, 3D-printed pot with a little smiling face
 * pressed into the clay, two flat feet in front and two slim legs angled out
 * at its sides (refs/26). The pot is a soft bell: widest low down, rounding in
 * to a flat base. Its leaves sit low on the rim, turned to the viewer.
 */
export function SmilePilea() {
  const h = 0.34;
  const profile = useMemo<[number, number][]>(
    () =>
      ([
        [0, 0], [0.13, 0], [0.18, 0.012], [0.215, 0.04], [0.234, 0.09], [0.24, 0.15], [0.236, 0.21],
        [0.225, 0.28], [0.212, 0.35], [0.196, 0.4], [0.193, 0.402], [0.188, 0.4], [0.186, 0.28],
      ] as [number, number][]).map(([r, y]) => [r, (y * h) / 0.4] as [number, number]),
    [],
  );
  const pot = useMemo(() => potGeo(profile, h), [profile]);
  const potMat = useMemo(() => mat("#E2CDB2", { roughness: 0.78, normalMap: printLines(), normalScale: 0.35 }), []);
  // The face is pressed in: a darker clay brown, not black.
  const recess = mat("#8E735A", { roughness: 0.85 });
  const smile = useMemo(() => new THREE.TorusGeometry(0.017, 0.0034, 6, 18, Math.PI * 0.8), []);
  const foot = useMemo(() => new THREE.CapsuleGeometry(0.024, 0.026, 4, 12), []);
  const leg = useMemo(() => new THREE.CapsuleGeometry(0.014, 0.065, 4, 10), []);
  const faceY = 0.115;
  const faceZ = 0.241;
  return (
    <group>
      {/* Flat rounded feet in front, slim legs angled out at the sides. */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} geometry={foot} material={potMat} position={[x, 0.036, 0.208]} scale={[1.45, 1, 0.4]} castShadow />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={leg} material={potMat} position={[s * 0.245, 0.045, 0.04]} rotation={[0, 0, s * 0.75]} castShadow />
      ))}
      <group position={[0, 0.03, 0]}>
        <mesh geometry={pot} material={potMat} castShadow receiveShadow />
        <Soil r={0.18} y={h - 0.035} />
        {[-0.029, 0.029].map((x) => (
          <mesh key={x} position={[x, faceY + 0.026, faceZ - 0.001]} scale={[1, 1.15, 0.4]} material={recess}>
            <sphereGeometry args={[0.0095, 12, 8]} />
          </mesh>
        ))}
        <mesh geometry={smile} material={recess} position={[0, faceY + 0.008, faceZ]} rotation={[0, 0, Math.PI * 1.1]} />
        <Pilea
          y={h - 0.035} count={7} seed={7} size={[0.1, 0.115]} lift={[0.0, 0.2]} reach={0.3} face={0.7} minFace={0.55}
          droop={[[Math.PI * 0.3, 0.045]]} look={SMILE_LEAVES}
        />
        {/* Two small young leaves tucked in behind. */}
        <Pilea y={h - 0.035} count={2} seed={12} size={[0.05, 0.06]} lift={[0.12, 0.16]} reach={0.08} face={0.7} minFace={0.55} look={SMILE_LEAVES} />
      </group>
    </group>
  );
}

/** Ochre wavy stripes on a speckled cream pot, about two waves top to bottom (refs/23). */
function wavyStripes(h: number, r: number) {
  const W = 1536;
  const H = potCanvasH(W, h, r);
  return paint(W, H, (g) => {
    const rand = seeded(23);
    g.fillStyle = "#F4EFE4";
    g.fillRect(0, 0, W, H);
    speckle(g, W, H, rand, 900);
    const n = 12;
    const step = W / n;
    g.lineCap = "round";
    g.lineWidth = step * 0.48;
    for (let k = -1; k <= n; k++) {
      g.strokeStyle = "#E3A81E";
      g.beginPath();
      for (let y = -10; y <= H + 10; y += 4) {
        const x = k * step + Math.sin((y / H) * Math.PI * 2 * 2) * step * 0.2;
        if (y === -10) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

/** 15. Pilea in a squat, straight-sided cream pot with ochre wavy stripes (refs/23). */
export function WavyPilea() {
  const h = 0.41;
  const pot = useMemo(() => potGeo(cylProfile(h, 0.25, 0.25), h), []);
  const potMat = useMemo(() => mat("#FFFFFF", { map: wavyStripes(h, 0.25), roughness: 0.82 }), []);
  return (
    <group>
      <mesh geometry={pot} material={potMat} castShadow receiveShadow />
      <Soil r={0.235} y={h - 0.04} />
      <Pilea
        y={h - 0.04} count={10} seed={21} size={[0.09, 0.11]} lift={[0.0, 0.26]} reach={0.42} face={0.9}
        droop={[[Math.PI * 0.93, -0.07], [Math.PI * 0.05, -0.02]]} look={WAVY_LEAVES}
      />
    </group>
  );
}

/** Snake plant's banding: subtle dark-on-dark mottling, a yellow-green margin each side (u < 0.1, u > 0.9). */
function snakeBands() {
  return paint(100, 512, (g) => {
    const rand = seeded(28);
    g.fillStyle = "#2F6A33";
    g.fillRect(0, 0, 100, 512);
    g.strokeStyle = "rgba(78,122,66,0.4)";
    for (let y = 6; y < 512; y += 10 + rand() * 16) {
      g.lineWidth = 2 + rand() * 5;
      g.beginPath();
      for (let x = 0; x <= 100; x += 8) g.lineTo(x, y + Math.sin(x * 0.3 + y) * 3 + (rand() - 0.5) * 6);
      g.stroke();
    }
    g.fillStyle = "#D9D66A";
    g.fillRect(0, 0, 10, 512);
    g.fillRect(90, 0, 10, 512);
  });
}

/**
 * A snake plant leaf: a broad pointed blade, V-folded along its midrib,
 * twisting a little and bowing back. Base at the origin, tip along +Y, the
 * fold opening toward +Z. Its outer columns sit a fixed `edge` in from the
 * rim, so the painted margin keeps its width right up to the tip.
 */
function bladeLeaf(w: number, h: number, fold: number, bend: number, twist: number, edge = 0.013) {
  const rows = 20;
  const S = [-1, -0.9, -0.6, 0, 0.6, 0.9, 1];
  const U = [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1];
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows;
    const half = w * 0.5 * (t < 0.3 ? 0.6 + 0.4 * Math.sin((t / 0.3) * Math.PI * 0.5) : Math.cos(((t - 0.3) / 0.7) * Math.PI * 0.5) ** 0.75);
    const a = Math.max(1 - edge / Math.max(half, 1e-4), 0.3);
    const c = Math.cos(twist * t);
    const sn = Math.sin(twist * t);
    S.forEach((s0, i) => {
      const s = Math.abs(s0) === 1 ? s0 : Math.abs(s0) === 0.9 ? Math.sign(s0) * a : s0 * a;
      const x = s * half;
      const z = Math.abs(s) * half * fold - bend * t * t * h;
      pos.push(x * c + z * sn, t * h, -x * sn + z * c);
      uv.push(U[i], t);
    });
  }
  const cols = S.length - 1;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const c = a + cols + 1;
      idx.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** White band (54%) with even black dots over a bright watermelon-coral base (refs/28). */
function snakePot(h: number, r: number) {
  const W = 1536;
  const H = potCanvasH(W, h, r);
  return paint(W, H, (g) => {
    const rand = seeded(280);
    const band = H * 0.54;
    g.fillStyle = "#FFFFFF";
    g.fillRect(0, 0, W, band);
    g.fillStyle = "#111113";
    dotField(g, W, 4, band - 6, rand, { rows: 10, perRow: 60, r: [6.2, 7.8], jitter: 0.15 });
    g.fillStyle = "#EE3F55";
    g.fillRect(0, band, W, H - band);
    // A faint wash in the red, as painted.
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 80; i++) g.fillRect(rand() * W, band + rand() * (H - band), 40 + rand() * 120, 4 + rand() * 10);
  });
}

/**
 * 6. Snake plant: broad, upright, V-folded blades with yellow-green margins
 * and softly mottled dark green faces, the outer ones leaning out; in a
 * straight pot about as wide as tall, white with black dots over coral-red
 * (refs/28).
 * `sage`: the coffee corner's version, in a tall ribbed sage pot (refs/64).
 */
export function SnakePlant({ sage = false }: { sage?: boolean }) {
  const h = 0.5;
  const pot = useMemo(
    () => (sage ? ribbed(lathe(potProfile(h, 0.23, 0.25, 0.02), 144), 22, 0.05) : potGeo(cylProfile(h, 0.27, 0.275), h)),
    [sage],
  );
  const potMat = useMemo(
    () => (sage ? mat("#93A98C", { roughness: 0.6 }) : mat("#FFFFFF", { map: snakePot(h, 0.272), roughness: 0.5 })),
    [sage],
  );
  const leafMat = useMemo(() => mat("#FFFFFF", { map: snakeBands(), roughness: 0.45, side: THREE.DoubleSide }), []);
  const leaves = useMemo(() => {
    const rand = seeded(9);
    const n = 11;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + rand() * 0.5;
      // Tall ones in the middle, mid-height around them, a few short ones low at the edge.
      const kind = i % 4 === 0 ? 0 : i % 4 === 2 ? 2 : 1;
      const len = [0.85 + rand() * 0.1, 0.62 + rand() * 0.12, 0.45 + rand() * 0.12][kind];
      return {
        a,
        r: [0.03, 0.1, 0.13][kind],
        lean: [0.05 + rand() * 0.1, 0.5 + rand() * 0.17, 0.75 + rand() * 0.15][kind],
        yaw: (rand() - 0.5) * 0.35,
        geo: bladeLeaf([0.27, 0.24, 0.19][kind] + rand() * 0.04, len, 0.25 + rand() * 0.2, 0.04 + rand() * 0.06, (rand() - 0.5) * 0.9),
      };
    });
  }, []);
  return (
    <group>
      <mesh geometry={pot} material={potMat} castShadow receiveShadow />
      <Soil r={sage ? 0.225 : 0.255} y={h - 0.04} />
      {leaves.map((l, i) => (
        <group key={i} position={[Math.sin(l.a) * l.r, h - 0.07, Math.cos(l.a) * l.r]} rotation={[l.lean, l.a + l.yaw, 0, "YXZ"]}>
          <mesh geometry={l.geo} material={leafMat} castShadow />
        </group>
      ))}
    </group>
  );
}

/** Satin pothos: dark green with irregular silvery splashes (about a fifth of the leaf). */
function satinSplash() {
  return paint(128, 256, (g) => {
    const rand = seeded(27);
    g.fillStyle = "#466E45";
    g.fillRect(0, 0, 128, 256);
    g.fillStyle = "rgba(190,210,182,0.9)";
    for (let i = 0; i < 26; i++) {
      // Each splash is a ragged cluster of small blobs, smeared along the leaf.
      const x = rand() * 128;
      const y = rand() * 256;
      const n = 3 + Math.floor(rand() * 5);
      for (let k = 0; k < n; k++) {
        g.beginPath();
        g.ellipse(x + (rand() - 0.5) * 14, y + (rand() - 0.5) * 18, 1.5 + rand() * 4, 1 + rand() * 3, rand() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

/**
 * A heart-shaped pothos leaf: two rounded lobes either side of a notch at the
 * stem, tapering to a point along +Y, creased along the midrib (the fold opens
 * toward +Z, the leaf's face). Built as strips from the midrib out to the
 * outline, so the crease and the outline both stay smooth. Length L, half-width hw.
 */
function heartBlade(L: number, hw: number, fold = 0.3) {
  const V = (x: number, y: number) => new THREE.Vector2(x * hw, y * L);
  const segs = [
    new THREE.CubicBezierCurve(V(0, 0), V(0.35, -0.2), V(1.05, -0.14), V(1, 0.2)),
    new THREE.CubicBezierCurve(V(1, 0.2), V(0.95, 0.48), V(0.42, 0.76), V(0, 1)),
  ];
  const outline = [...segs[0].getPoints(8), ...segs[1].getPoints(10).slice(1)];
  const cols = 4;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (const side of [1, -1]) {
    const start = pos.length / 3;
    for (const p of outline) {
      const my = Math.min(Math.max(p.y, 0), L);
      for (let c = 0; c <= cols; c++) {
        const s = c / cols;
        const x = side * p.x * s;
        const y = my + (p.y - my) * s;
        pos.push(x, y, Math.abs(x) * fold);
        uv.push(0.5 + x / (2 * hw), Math.min(Math.max(y / L, 0), 1));
      }
    }
    for (let k = 0; k < outline.length - 1; k++) {
      for (let c = 0; c < cols; c++) {
        const a = start + k * (cols + 1) + c;
        const d = a + cols + 1;
        if (side > 0) idx.push(a, a + 1, d, a + 1, d + 1, d);
        else idx.push(a, d, a + 1, a + 1, d, d + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Cream top band with scattered black dots of mixed sizes, deep glossy green glaze below with runs (refs/27). */
function pothosPot(h: number, r: number) {
  const W = 1536;
  const H = potCanvasH(W, h, r);
  return paint(W, H, (g) => {
    const rand = seeded(270);
    const band = H * 0.44;
    g.fillStyle = "#EFE8D6";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#1E1E20";
    dotField(g, W, 10, band - 12, rand, { rows: 6, perRow: 28, r: [3, 12], jitter: 0.55 });
    // The green glaze, its top edge a little uneven where it was dipped.
    g.fillStyle = "#145239";
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, band + Math.sin(x * 0.011) * 3 + Math.sin(x * 0.037) * 2);
    g.lineTo(W, H);
    g.fill();
    // Glaze runs: darker where it pooled, lighter streaks where it ran thin.
    for (let i = 0; i < 30; i++) {
      const x = rand() * W;
      const len = 30 + rand() * (H - band) * 0.8;
      g.fillStyle = rand() < 0.5 ? "rgba(8,40,28,0.22)" : "rgba(120,180,150,0.1)";
      g.beginPath();
      g.ellipse(x, band + 4 + len / 2, 3 + rand() * 6, len / 2, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** A leaf's turn: tip along `tip`, face toward `face`. */
function orient(tip: THREE.Vector3, face: THREE.Vector3) {
  const y = tip.clone().normalize();
  const z = face.clone().addScaledVector(y, -face.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/**
 * 11. Pothos: a straight cylinder pot, cream with black dots over deep glossy
 * green glaze, on three short thick legs flush with its outer wall (refs/27).
 * A loose, lopsided spray of thin creased heart leaves: silver-splashed satin
 * up top and in the middle on curving stems, plain sage-green trailing down
 * the right, one long leaf reaching out left (refs/27, 59). Nothing reaches
 * the shelf.
 */
export function Pothos() {
  const h = 0.4;
  const legH = 0.08;
  const legR = 0.055;
  const pot = useMemo(() => potGeo(cylProfile(h, 0.25, 0.25), h), []);
  const potMat = useMemo(() => mat("#FFFFFF", { map: pothosPot(h, 0.25), roughness: 0.18 }), []);
  const leg = useMemo(() => new THREE.CylinderGeometry(legR, legR * 0.94, legH + 0.03, 18), []);
  const plain = mat("#8BA562", { roughness: 0.55, side: THREE.DoubleSide });
  const plainDark = mat("#7A9656", { roughness: 0.55, side: THREE.DoubleSide });
  const satin = useMemo(() => mat("#FFFFFF", { map: satinSplash(), roughness: 0.5, side: THREE.DoubleSide }), []);
  const leafGeos = useMemo(() => [heartBlade(0.2, 0.085, 0.28), heartBlade(0.19, 0.08, 0.2), heartBlade(0.21, 0.09, 0.34)], []);
  const { stems, leaves } = useMemo(() => {
    const rand = seeded(13);
    const stems: THREE.TubeGeometry[] = [];
    const leaves: { p: THREE.Vector3; q: THREE.Quaternion; g: number; s: number; kind: number }[] = [];
    /** `satinOdds`: how likely this leaf is the silver-splashed kind; the rest are plain sage. */
    const leaf = (p: THREE.Vector3, tip: THREE.Vector3, face: THREE.Vector3, s: number, satinOdds: number) =>
      leaves.push({ p, q: orient(tip, face), g: Math.floor(rand() * 3), s, kind: rand() < satinOdds ? 2 : Math.floor(rand() * 2) });
    const stem = (pts: THREE.Vector3[]) => stems.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.0055, 5, false));
    /** A soil point a little off centre, so stems don't all meet at one spot. */
    const root = () => {
      const a = rand() * Math.PI * 2;
      const r = 0.02 + rand() * 0.08;
      return new THREE.Vector3(Math.cos(a) * r, h - 0.04, Math.sin(a) * r);
    };
    // Standing leaves on curving stems above the rim, turned to the room; their
    // blades cover where the stems come up.
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.6;
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const out = 0.04 + rand() * 0.14;
      const base = new THREE.Vector3(radial.x * out, h + 0.06 + rand() * 0.2, radial.z * out);
      const r0 = root();
      const bow = new THREE.Vector3((rand() - 0.5) * 0.08, 0, (rand() - 0.5) * 0.08);
      stem([r0, r0.clone().lerp(base, 0.5).add(bow).setY((r0.y + base.y) / 2 + 0.02), base]);
      leaf(base, radial.clone().multiplyScalar(0.5).setY(0.6 + rand() * 0.9), radial.clone().multiplyScalar(0.4).add(new THREE.Vector3(0, 0.2, 0.9)), 1.0 + rand() * 0.3, 0.75);
    }
    // Arching leaves: curving stems out past the rim, leaves hanging tip-down outside the wall.
    for (let i = 0; i < 7; i++) {
      const side = i < 4 ? 1 : -1;
      const a = (side > 0 ? 0 : Math.PI) + (rand() - 0.5) * 1.6;
      const radial = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const out = 0.3 + rand() * 0.1;
      const end = new THREE.Vector3(radial.x * out, h + 0.03 + rand() * 0.1, radial.z * out);
      const r0 = root();
      stem([r0, new THREE.Vector3(radial.x * out * 0.45, end.y + 0.05 + rand() * 0.05, radial.z * out * 0.45 + (rand() - 0.5) * 0.06), end]);
      const swing = (rand() - 0.5) * 0.8;
      leaf(end, radial.clone().multiplyScalar(0.4 + swing * 0.3).add(new THREE.Vector3(-radial.z * swing, -1, radial.x * swing)), radial.clone().add(new THREE.Vector3(0, 0.3, 1.4)), 1.05 + rand() * 0.3, side > 0 ? 0.3 : 0.6);
    }
    // Trailing vines, drooping: the long one on the right (plain sage) ends level
    // with the pot's base; one falls left and ends in a long leaf reaching out;
    // a short one comes forward on the right.
    const vines: { pts: [number, number, number][]; satin: number }[] = [
      { pts: [[0.15, h, 0.04], [0.36, h + 0.04, 0.08], [0.5, h - 0.08, 0.12], [0.55, h * 0.55, 0.14], [0.55, 0.2, 0.15]], satin: 0.1 },
      { pts: [[-0.15, h, 0.03], [-0.33, h + 0.03, 0.05], [-0.45, h - 0.1, 0.08], [-0.5, h - 0.25, 0.1]], satin: 0.5 },
      { pts: [[0.08, h, 0.12], [0.22, h - 0.01, 0.28], [0.29, h - 0.18, 0.33]], satin: 0.2 },
    ];
    vines.forEach(({ pts, satin: odds }, v) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      stems.push(new THREE.TubeGeometry(curve, 40, 0.0055, 5, false));
      const count = Math.max(2, Math.round(curve.getLength() / 0.14));
      for (let k = 1; k <= count; k++) {
        const t = k / count;
        const p = curve.getPoint(t);
        const outward = new THREE.Vector3(p.x, 0, p.z).normalize();
        const along = curve.getTangent(t);
        const sideways = new THREE.Vector3().crossVectors(along, UP).normalize().multiplyScalar((k % 2 ? 1 : -1) * (0.15 + rand() * 0.4));
        const reachOut = v === 1 && k === count;
        const tip = reachOut ? new THREE.Vector3(-1, -0.45, 0.1) : outward.clone().multiplyScalar(0.15 + rand() * 0.35).add(sideways).setY(-1);
        leaf(p, tip, outward.clone().add(new THREE.Vector3(0, 0.15, 1.6)), reachOut ? 1.5 : 1.15 + rand() * 0.25, odds);
      }
    });
    return { stems, leaves };
  }, []);
  const mats = [plain, plainDark, satin];
  return (
    <group>
      {/* One leg at the back, two at front left and right, flush with the wall. */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        return <mesh key={i} geometry={leg} material={mat("#145239", { roughness: 0.18 })} position={[Math.cos(a) * (0.25 - legR), (legH + 0.03) / 2, Math.sin(a) * (0.25 - legR)]} castShadow />;
      })}
      <group position={[0, legH, 0]}>
        <mesh geometry={pot} material={potMat} castShadow receiveShadow />
        <Soil r={0.235} y={h - 0.04} />
        {stems.map((g, i) => (
          <mesh key={i} geometry={g} material={mat("#8FAE62", { roughness: 0.6 })} castShadow />
        ))}
        {leaves.map((l, i) => (
          <mesh key={i} geometry={leafGeos[l.g]} material={mats[l.kind]} position={l.p} quaternion={l.q} scale={l.s} castShadow />
        ))}
      </group>
    </group>
  );
}

/** 13. Succulent: a small rosette in a blue dotted pot on three legs. */
export function Succulent() {
  const h = 0.3;
  const pot = useMemo(() => lathe(potProfile(h, 0.17, 0.21)), []);
  const potMat = useMemo(() => mat("#3D6FD1", { map: dots("#3D6FD1", "#F6F3EC", 8, 2, 0.08), roughness: 0.45 }), []);
  const leaf = useMemo(() => new THREE.SphereGeometry(1, 14, 10), []);
  const petals = useMemo(() => {
    const out: { a: number; ring: number }[] = [];
    [7, 6, 5, 3].forEach((n, ring) => {
      for (let i = 0; i < n; i++) out.push({ a: (i / n) * Math.PI * 2 + ring * 0.4, ring });
    });
    return out;
  }, []);
  return (
    <group>
      <Legs r={0.11} color="#3D6FD1" />
      <group position={[0, 0.13, 0]}>
        <mesh geometry={pot} material={potMat} castShadow receiveShadow />
        <Soil r={0.19} y={h - 0.03} />
        {petals.map((p, i) => {
          const r = 0.14 - p.ring * 0.035;
          const tilt = 1.1 - p.ring * 0.3;
          return (
            <mesh
              key={i}
              geometry={leaf}
              material={mat(p.ring > 1 ? "#8ACB62" : "#6FB552", { roughness: 0.5 })}
              position={[Math.cos(p.a) * r * 0.6, h + 0.02 + p.ring * 0.045, -Math.sin(p.a) * r * 0.6]}
              rotation={[0, -p.a, -tilt]}
              scale={[0.03, 0.11 - p.ring * 0.015, 0.05]}
              castShadow
            />
          );
        })}
      </group>
    </group>
  );
}
