import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mat, steel, glass } from "./materials";
import { CoffeeMachine } from "./objects/Props";
import Model from "./Model";
import { Pothos, SnakePlant } from "./objects/Plants";
import { lathe, ribbed, seeded } from "./shapes";
import { spineTexture } from "./textures";
import { STATION } from "./Room";

/**
 * The coffee corner (Dvija, 12 Nov), after the right end of the bookshelf.
 * It replaces the oak counter shelf and follows four references:
 *
 * - refs/61: a walnut sideboard, three drawers over three doors, on legs.
 *   The coffee machine and its things stand on top.
 * - refs/62: a ribbed glass jar of coffee beans.
 * - refs/63: a plywood mug cabinet, four columns by three rows.
 * - refs/64: two dark wood wall shelves on black brackets, a rail of hanging
 *   mugs under the lower one, a flip clock on two books.
 * - refs/65: Dvija's vision board, which sets the layout: the clock shelf and
 *   mug rail upper left, the top shelf upper right with the mug cabinet under
 *   it, and on the sideboard the machine (brown cups on top), the bean jar on a
 *   marble riser, a checked tray with syrups, books and an amber lamp.
 *
 * True scale (1 unit = 20 cm). The camera steps back as you reach the corner
 * (CameraRig), so the whole of it fits on screen.
 *
 * Coordinates: inside ShelfObjects' group, so y = 0 is the bookshelf top,
 * which is also the sideboard top. Everything here is in a group whose
 * z = 0 is the wall.
 */

const STAND_Z = 0.38;
const WALL_Z = 0.02 - STAND_Z;

// --- Textures ---------------------------------------------------------------

/** Smooth value noise from a seeded grid. */
function noise2(seed: number) {
  const N = 64;
  const rand = seeded(seed);
  const g = Float32Array.from({ length: N * N }, () => rand());
  const at = (x: number, y: number) => g[(((y % N) + N) % N) * N + (((x % N) + N) % N)];
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

type Wood = { seed: number; light: [number, number, number]; dark: [number, number, number]; vertical?: boolean; figure?: number; cathedral?: number };

/**
 * Wood veneer: "cathedral" grain (the arches you see on flat-sawn walnut),
 * fine pores running with the grain, and soft tonal waves. Drawn once per panel
 * with its own seed, so neighbouring doors don't repeat.
 */
function woodTexture({ seed, light, dark, vertical = true, figure = 18, cathedral = 2.4 }: Wood) {
  const W = 256;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const img = g.createImageData(W, H);
  const n = noise2(seed);
  const off = seeded(seed + 1)() * 50;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // Mostly straight grain that drifts and waves along the board...
      const warp = (n(u * 1.5 + off, v * 1.2) - 0.5) * 0.5 + Math.sin(v * 4 + off) * 0.03;
      // ...with a soft arch ("cathedral") rising through the middle of the panel.
      const arch = cathedral * 0.05 * Math.exp(-((u - 0.5) ** 2) / 0.02) * (0.6 + 0.4 * Math.sin(v * 2.5 + off));
      const ring = (u + warp * 0.3 - arch) * figure;
      const f = ring - Math.floor(ring);
      // Latewood: a thin, soft dark line per growth ring.
      const late = Math.pow(Math.sin(f * Math.PI), 10);
      // Pores and long streaks run with the grain (fast across, slow along).
      const pores = n(u * 140 + off, v * 3 + 3) * 0.55 + n(u * 30 + off, v * 0.7 + 5) * 0.45;
      const tone = n(u * 2.5 + off, v * 1.1 + 11);
      const t = Math.min(1, late * 0.3 + pores * 0.3 + tone * 0.45);
      const i = (y * W + x) * 4;
      img.data[i] = light[0] + (dark[0] - light[0]) * t;
      img.data[i + 1] = light[1] + (dark[1] - light[1]) * t;
      img.data[i + 2] = light[2] + (dark[2] - light[2]) * t;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (!vertical) {
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
  }
  return tex;
}

const WALNUT_LIGHT: [number, number, number] = [156, 104, 64];
const WALNUT_DARK: [number, number, number] = [84, 50, 28];

function woodMat(w: Wood, roughness = 0.55) {
  return new THREE.MeshStandardMaterial({ map: woodTexture(w), roughness, metalness: 0 });
}

/**
 * Real clear glass: light passes through and bends (transmission), instead of
 * a see-through white that reads milky against the white wall. `tint` and
 * `attenuation` colour it, as in the amber cup.
 */
function clearGlass({ tint = "#FFFFFF", attenuation, distance = 0.5, roughness = 0.03, thickness = 0.04 }: { tint?: string; attenuation?: string; distance?: number; roughness?: number; thickness?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: tint,
    roughness,
    metalness: 0,
    transmission: 1,
    thickness,
    ior: 1.5,
    envMapIntensity: 1.8,
    attenuationColor: new THREE.Color(attenuation ?? "#FFFFFF"),
    attenuationDistance: attenuation ? distance : Infinity,
  });
}

/** A small canvas texture for mug glazes, prints and labels. */
function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const glazes = {
  checker: (a: string, b: string, cols = 12, rows = 5) =>
    paint(256, 128, (g, w, h) => {
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          g.fillStyle = (i + j) % 2 ? a : b;
          g.fillRect((i * w) / cols, (j * h) / rows, w / cols + 1, h / rows + 1);
        }
    }),
  dots: (base: string, dot: string, count = 40) =>
    paint(256, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.fillStyle = dot;
      const r = seeded(count);
      for (let i = 0; i < count; i++) {
        g.beginPath();
        g.arc(r() * w, 12 + r() * (h - 24), 4 + r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }),
  speckle: (base: string, fleck: string, seed = 3) =>
    paint(256, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.fillStyle = fleck;
      const r = seeded(seed);
      for (let i = 0; i < 260; i++) {
        g.beginPath();
        g.arc(r() * w, r() * h, 0.6 + r() * 1.3, 0, Math.PI * 2);
        g.fill();
      }
    }),
  floral: (base: string) =>
    paint(256, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const r = seeded(21);
      for (let i = 0; i < 14; i++) {
        const x = r() * w;
        const y = 20 + r() * (h - 40);
        g.strokeStyle = "#6E8F4E";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, y + 16);
        g.quadraticCurveTo(x + 6, y + 8, x, y);
        g.stroke();
        g.fillStyle = i % 3 ? "#E0874A" : "#D9B23F";
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          g.beginPath();
          g.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.2, 0, Math.PI * 2);
          g.fill();
        }
      }
    }),
  swirl: (base: string, ink: string) =>
    paint(256, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = ink;
      g.lineWidth = 5;
      g.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        const x = 30 + i * 64;
        g.moveTo(x - 20, h * 0.7);
        g.bezierCurveTo(x - 30, h * 0.2, x + 30, h * 0.2, x + 10, h * 0.55);
        g.bezierCurveTo(x, h * 0.75, x + 24, h * 0.8, x + 28, h * 0.5);
        g.stroke();
      }
    }),
  marble: (base: string, vein: string) =>
    paint(256, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const r = seeded(9);
      g.strokeStyle = vein;
      for (let i = 0; i < 7; i++) {
        g.lineWidth = 1 + r() * 5;
        g.globalAlpha = 0.5 + r() * 0.4;
        g.beginPath();
        g.moveTo(0, h * 0.3 + r() * h * 0.5);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.25 + r() * h * 0.55);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = "#7DA6A1";
      g.fillRect(0, 0, w, 10);
    }),
  blots: (base: string, ink: string) =>
    paint(256, 128, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      g.fillStyle = ink;
      const r = seeded(14);
      for (let i = 0; i < 3; i++) {
        const x = 40 + i * 85;
        for (let k = 0; k < 9; k++) {
          g.beginPath();
          g.ellipse(x + (r() - 0.5) * 30, 64 + (r() - 0.5) * 50, 5 + r() * 9, 3 + r() * 6, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    }),
};

// --- Mugs ---------------------------------------------------------------------

type MugSpec = {
  color?: string;
  map?: THREE.Texture;
  r?: number;
  h?: number;
  handle?: boolean;
  /** A hand-cut faceted cup: this many uneven flat sides. */
  facets?: number;
  /** A bare clay foot ring, as on the glazed cup in refs/63. */
  foot?: string;
  /** Amber or tinted glass instead of ceramic. */
  glassAttenuation?: string;
  roughness?: number;
  /** Glossy glaze: a clear coat over the colour. */
  gloss?: boolean;
  /** Rim wider (bowl) or narrower (yunomi) than the base. */
  flare?: number;
  /** A rounder belly, like the white mug in refs/63. */
  belly?: number;
  /** A different glaze on the lip, as on several mugs in refs/63. */
  rim?: string;
};

function Mug({ s }: { s: MugSpec }) {
  const r = s.r ?? 0.2;
  const h = s.h ?? 0.42;
  const flare = s.flare ?? 1;
  const belly = s.belly ?? 0;
  const g = useMemo(() => {
    const wall = 0.022;
    const top = r * flare;
    const prof: [number, number][] = [
      [0, 0],
      [r * 0.84, 0],
      [r * 0.95, 0.025],
      [r * (1 + belly) + (top - r) * 0.25, h * 0.3],
      [r * (1 + belly * 0.6) + (top - r) * 0.6, h * 0.65],
      [top, h - 0.008],
      [top - wall * 0.5, h],
      [top - wall, h - 0.008],
      [r * (1 + belly * 0.5) - wall + (top - r) * 0.6, h * 0.6],
      [r * 0.86 - wall, 0.05],
      [0, 0.05],
    ];
    const cup = lathe(prof, s.facets ?? 56);
    if (s.facets) {
      // Uneven hand-cut facets: push each side's vertices in by its own amount.
      const rand = seeded(s.facets * 7);
      const dents = Array.from({ length: s.facets + 1 }, () => 1 - rand() * 0.07);
      dents[s.facets] = dents[0];
      const p = cup.attributes.position as THREE.BufferAttribute;
      // LatheGeometry lists vertices side by side: one profile per side.
      for (let i = 0; i < p.count; i++) {
        const k = dents[Math.floor(i / prof.length)] ?? 1;
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      cup.computeVertexNormals();
    }
    // A D-shaped handle: a loop a little taller than it is deep.
    const handle = new THREE.TorusGeometry(h * 0.24, 0.026, 12, 28, Math.PI * 1.15);
    handle.scale(0.85, 1.15, 1);
    return { cup, handle, rim: new THREE.TorusGeometry(top - wall * 0.5, wall * 0.6, 8, 56) };
  }, [r, h, flare, belly, s.facets]);
  const body = useMemo(() => {
    if (s.glassAttenuation) return clearGlass({ tint: "#FBEDE2", attenuation: s.glassAttenuation, distance: 0.35, thickness: 0.06 });
    const m = new THREE.MeshPhysicalMaterial({
      color: s.map ? "#FFFFFF" : s.color,
      map: s.map ?? null,
      roughness: s.roughness ?? 0.5,
      clearcoat: s.gloss ? 0.8 : 0,
      clearcoatRoughness: 0.15,
      flatShading: Boolean(s.facets),
    });
    return m;
  }, [s]);
  return (
    <group>
      <mesh geometry={g.cup} material={body} castShadow receiveShadow />
      {s.rim ? (
        <mesh geometry={g.rim} position={[0, h - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <meshPhysicalMaterial color={s.rim} roughness={0.35} clearcoat={0.6} />
        </mesh>
      ) : null}
      {s.foot ? (
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[r * 0.99, r * 0.9, 0.06, 40]} />
          <meshStandardMaterial color={s.foot} roughness={0.95} />
        </mesh>
      ) : null}
      {s.handle !== false ? (
        <mesh geometry={g.handle} material={body} position={[r * (1 + belly) * 0.97, h * 0.5, 0]} rotation={[0, 0, -Math.PI * 0.57]} castShadow />
      ) : null}
    </group>
  );
}

/** Small glossy red-brown bowls stacked and tipped (top right of refs/63). */
function StackedBowls() {
  const bowl = useMemo(() => lathe([[0, 0], [0.09, 0], [0.17, 0.08], [0.2, 0.15], [0.19, 0.155], [0.16, 0.085], [0.08, 0.02], [0, 0.02]], 48), []);
  const colours = ["#5E2216", "#7A2E1C", "#8E3A22", "#6B2819"];
  return (
    <group rotation={[0.35, 0, -0.1]}>
      {colours.map((c, i) => (
        <mesh key={c} geometry={bowl} position={[0, i * 0.055, i * -0.01]} castShadow receiveShadow>
          <meshPhysicalMaterial color={c} roughness={0.25} clearcoat={0.9} clearcoatRoughness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// --- The sideboard -------------------------------------------------------------

const SB = {
  width: STATION.length,
  depth: 2.2,
  top: 0.1,
  body: 3.4,
  legs: 0.6,
};
/** The floor, below the sideboard's legs. */
export const FLOOR_Y = -(SB.top + SB.body + SB.legs);

function Sideboard() {
  const W = SB.width;
  const D = SB.depth;
  const side = 0.09;
  const gap = 0.025;
  const drawerH = 0.72;
  const colW = (W - side * 2 - gap * 4) / 3;
  const doorH = SB.body - drawerH - gap * 3 - 0.1;
  const mats = useMemo(() => {
    const w = (seed: number, tone: number, vertical = true): Wood => ({
      seed,
      vertical,
      light: WALNUT_LIGHT.map((c) => c * tone) as [number, number, number],
      dark: WALNUT_DARK.map((c) => c * tone) as [number, number, number],
    });
    return {
      carcass: woodMat(w(3, 0.92, true)),
      top: woodMat({ ...w(5, 0.95, false), figure: 9, cathedral: 1.6 }),
      // Drawers: grain runs across. Doors: grain runs up, the middle one darkest
      // and book-matched looking, as in refs/61.
      drawers: [woodMat(w(11, 1.08, false)), woodMat(w(12, 0.98, false)), woodMat(w(13, 0.82, false))],
      doors: [woodMat(w(21, 1.02)), woodMat({ ...w(22, 0.8), figure: 12, cathedral: 3.4 }), woodMat(w(23, 0.95))],
      brass: mat("#B8934A", { metalness: 0.85, roughness: 0.3 }),
      leg: woodMat(w(31, 0.85)),
    };
  }, []);
  const yTop = -SB.top;
  const yBody = yTop - SB.body;
  const front = D;
  const colX = (i: number) => -W / 2 + side + gap + colW / 2 + i * (colW + gap);
  return (
    <group>
      {/* Top: one slab, grain running along it. */}
      <mesh position={[0, -SB.top / 2, D / 2]} material={mats.top} castShadow receiveShadow>
        <boxGeometry args={[W + 0.04, SB.top, D + 0.04]} />
      </mesh>
      {/* Carcass: end panels and the box behind the fronts. */}
      <mesh position={[0, yTop - SB.body / 2, D / 2 - 0.03]} material={mats.carcass} castShadow receiveShadow>
        <boxGeometry args={[W, SB.body, D - 0.06]} />
      </mesh>
      {/* Drawers across the top, doors below. Each front is its own veneer. */}
      {[0, 1, 2].map((i) => (
        <mesh key={`d${i}`} position={[colX(i), yTop - gap - drawerH / 2, front]} material={mats.drawers[i]} castShadow receiveShadow>
          <boxGeometry args={[colW, drawerH, 0.05]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`o${i}`} position={[colX(i), yTop - gap * 2 - drawerH - doorH / 2, front]} material={mats.doors[i]} castShadow receiveShadow>
          <boxGeometry args={[colW, doorH, 0.05]} />
        </mesh>
      ))}
      {/* The one knob, small and brass, on the right-hand door's left edge. */}
      <mesh position={[colX(2) - colW / 2 + 0.16, yTop - gap * 2 - drawerH - doorH * 0.45, front + 0.06]} material={mats.brass} castShadow>
        <sphereGeometry args={[0.045, 16, 12]} />
      </mesh>
      {/* Base frame and four square legs, slightly tapered. */}
      <mesh position={[0, yBody - 0.07, D / 2]} material={mats.leg} castShadow receiveShadow>
        <boxGeometry args={[W - 0.5, 0.14, D - 0.4]} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [0.35, D - 0.35].map((z) => (
          <mesh key={`${sx}${z}`} position={[sx * (W / 2 - 0.4), yBody - SB.legs / 2, z]} rotation={[0, Math.PI / 4, 0]} material={mats.leg} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.075, SB.legs, 4]} />
          </mesh>
        )),
      )}
    </group>
  );
}

// --- Things on the sideboard ----------------------------------------------------

/**
 * One coffee bean: an oval, flatter on one side, with the crease down the
 * middle of the flat side.
 */
function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i);
    const z = p.getZ(i);
    if (y > 0) {
      y *= 0.42;
      y -= 0.3 * Math.exp(-(x * x) / 0.012) * (1 - z * z * 0.6);
    } else {
      y *= 0.8;
    }
    p.setXYZ(i, x, y, z);
  }
  g.scale(0.04, 0.03, 0.056);
  g.computeVertexNormals();
  return g;
}

/**
 * The jar of beans (refs/62): tall fluted clear glass, a shoulder up to a short
 * neck, a glass lid with a knob and an amber seal. Beans are packed against the
 * glass (so they read through it) and across the top, over a dark core.
 */
function BeanJar() {
  const R = 0.32;
  const H = 0.95;
  const g = useMemo(() => {
    const jar = ribbed(
      lathe([[0, 0], [R * 0.9, 0], [R, 0.05], [R, H * 0.78], [R * 0.92, H * 0.89], [R * 0.8, H * 0.95], [R * 0.79, H]], 208),
      26,
      0.05,
    );
    const lid = lathe([[R * 0.78, 0], [R * 1.0, 0.015], [R * 1.04, 0.06], [R * 0.98, 0.095], [R * 0.5, 0.115], [0.075, 0.125], [0.065, 0.165], [0.105, 0.2], [0.095, 0.24], [0, 0.25]], 64);
    return { jar, lid, bean: beanGeometry() };
  }, []);
  const fill = 0.66;
  const beans = useMemo(() => {
    const r = seeded(62);
    const list: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const tones = ["#5C301A", "#6E3B1F", "#7B4524", "#4E2814", "#86502B"].map((c) => new THREE.Color(c));
    const q = new THREE.Quaternion();
    const add = (pos: THREE.Vector3) => {
      q.setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3));
      const s = 0.85 + r() * 0.3;
      list.push({ m: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(s, s, s)), c: tones[Math.floor(r() * tones.length)] });
    };
    // Two shells of beans against the glass, ring by ring...
    for (const shell of [R * 0.9, R * 0.78]) {
      for (let y = 0.06; y < fill; y += 0.045) {
        const count = Math.floor((Math.PI * 2 * shell) / 0.075);
        for (let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2 + r() * 0.08 + y * 3;
          add(new THREE.Vector3(Math.cos(a) * shell, y + (r() - 0.5) * 0.03, Math.sin(a) * shell));
        }
      }
    }
    // ...and a heaped top surface.
    for (let k = 0; k < 160; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R * 0.88;
      add(new THREE.Vector3(Math.cos(a) * d, fill + 0.02 + (1 - d / R) * 0.05 + r() * 0.02, Math.sin(a) * d));
    }
    return list;
  }, []);
  const beanMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 }), []);
  const jarGlass = useMemo(() => clearGlass({ thickness: 0.05 }), []);
  return (
    <group>
      <mesh position={[0, fill / 2 + 0.02, 0]}>
        <cylinderGeometry args={[R * 0.72, R * 0.72, fill, 32]} />
        <meshStandardMaterial color="#2E190C" roughness={0.7} />
      </mesh>
      <instancedMesh
        args={[g.bean, beanMat, beans.length]}
        ref={(im) => {
          if (!im) return;
          beans.forEach((b, i) => {
            im.setMatrixAt(i, b.m);
            im.setColorAt(i, b.c);
          });
          im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
        }}
        castShadow
      />
      <mesh geometry={g.jar} material={jarGlass} />
      {/* The amber rubber seal under the lid. */}
      <mesh position={[0, H + 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 0.8, 0.018, 10, 64]} />
        <meshStandardMaterial color="#D79A3C" roughness={0.45} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={g.lid} material={jarGlass} position={[0, H, 0]} />
    </group>
  );
}

/** White marble with soft grey veins. */
function marbleTexture(seed: number, base = "#ECEAE6", vein = "#A7A39C") {
  return paint(512, 512, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    const r = seeded(seed);
    c.strokeStyle = vein;
    for (let i = 0; i < 9; i++) {
      c.globalAlpha = 0.15 + r() * 0.35;
      c.lineWidth = 0.6 + r() * 2.5;
      c.beginPath();
      let x = r() * w;
      let y = 0;
      c.moveTo(x, y);
      while (y < h) {
        x += (r() - 0.45) * 40;
        y += 12 + r() * 24;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  });
}

/** A low white marble riser on two small black feet, under the bean jar (refs/65). */
function MarbleRiser() {
  const top = useMemo(() => mat("#FFFFFF", { map: marbleTexture(7), roughness: 0.2 }), []);
  return (
    <group>
      <mesh position={[0, 0.095, 0]} material={top} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.08, 0.66]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.3, 0.028, 0]} castShadow>
          <boxGeometry args={[0.1, 0.055, 0.5]} />
          <meshStandardMaterial color="#1D1D1F" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Black and white checked marble: a tray top or a coaster. */
function checkerMarble(cols: number, rows: number, seed: number) {
  return paint(512, Math.round((512 * rows) / cols), (c, w, h) => {
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        c.fillStyle = (i + j) % 2 ? "#1E1E20" : "#EEECE7";
        c.fillRect((i * w) / cols, (j * h) / rows, w / cols + 1, h / rows + 1);
      }
    const r = seeded(seed);
    c.strokeStyle = "#9C9890";
    for (let i = 0; i < 7; i++) {
      c.globalAlpha = 0.25;
      c.lineWidth = 1 + r() * 2;
      c.beginPath();
      c.moveTo(r() * w, 0);
      c.bezierCurveTo(r() * w, h * 0.3, r() * w, h * 0.7, r() * w, h);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
}

/** A syrup bottle with a black pump. The label is plain (no real brand). */
function PumpBottle({ label, liquid }: { label: string; liquid: string }) {
  const g = useMemo(() => ({
    bottle: lathe([[0, 0], [0.085, 0], [0.09, 0.02], [0.09, 0.42], [0.075, 0.47], [0.04, 0.52], [0.04, 0.58], [0, 0.58]], 4),
  }), []);
  const glassMat = useMemo(() => clearGlass({ thickness: 0.03 }), []);
  const labelTex = useMemo(
    () =>
      paint(128, 160, (c, w, h) => {
        c.fillStyle = "#F1EADB";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#2A2623";
        c.fillRect(10, 10, w - 20, 4);
        c.font = 'italic 24px "Fraunces", Georgia, serif';
        c.textAlign = "center";
        c.fillText(label, w / 2, 90);
        c.font = '12px "DM Sans", sans-serif';
        c.fillText("SYRUP", w / 2, 116);
      }),
    [label],
  );
  const black = useMemo(() => mat("#18181A", { roughness: 0.4 }), []);
  return (
    <group>
      {/* Square bottle: a four-sided lathe turned 45 degrees. */}
      <mesh geometry={g.bottle} material={glassMat} rotation={[0, Math.PI / 4, 0]} />
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.11, 0.36, 0.11]} />
        <meshPhysicalMaterial color={liquid} roughness={0.1} transmission={0.5} thickness={0.1} />
      </mesh>
      <mesh position={[0, 0.24, 0.064]}>
        <planeGeometry args={[0.11, 0.15]} />
        <meshStandardMaterial map={labelTex} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.61, 0]} material={black} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.07, 20]} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={black} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.12, 12]} />
      </mesh>
      <mesh position={[0, 0.78, 0]} material={black} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.05, 20]} />
      </mesh>
      <mesh position={[0, 0.78, 0.07]} material={black} castShadow>
        <boxGeometry args={[0.03, 0.025, 0.12]} />
      </mesh>
    </group>
  );
}

/**
 * The checked marble tray (refs/65): two syrup bottles, a small steel bowl,
 * a fluted sage cup, a tall glass canister of grounds and a stack of coasters.
 */
function CheckerTray() {
  const W = 1.3;
  const D = 0.8;
  const top = useMemo(() => mat("#FFFFFF", { map: checkerMarble(8, 5, 4), roughness: 0.18 }), []);
  const coaster = useMemo(() => mat("#FFFFFF", { map: checkerMarble(3, 3, 9), roughness: 0.2 }), []);
  const g = useMemo(() => ({
    bowl: lathe([[0, 0], [0.06, 0], [0.12, 0.05], [0.14, 0.09], [0.13, 0.09], [0.11, 0.05], [0.05, 0.012], [0, 0.012]], 40),
    fluted: ribbed(lathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.24], [0.115, 0.24], [0.115, 0.03], [0, 0.03]], 132), 12, 0.09),
  }), []);
  const canisterGlass = useMemo(() => clearGlass({ thickness: 0.03 }), []);
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={top} castShadow receiveShadow>
        <boxGeometry args={[W, 0.05, D]} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (W / 2 - 0.08), 0.018, sz * (D / 2 - 0.08)]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.036, 16]} />
            <meshStandardMaterial color="#C7A35A" metalness={0.85} roughness={0.3} />
          </mesh>
        )),
      )}
      <group position={[0, 0.085, 0]}>
        <group position={[-0.47, 0, -0.12]}>
          <PumpBottle label="Vanilla" liquid="#7A4A1E" />
        </group>
        <group position={[-0.25, 0, -0.18]}>
          <PumpBottle label="Caramel" liquid="#5A2E12" />
        </group>
        <mesh geometry={g.bowl} material={steel()} position={[-0.42, 0, 0.22]} castShadow />
        <mesh geometry={g.fluted} position={[0.02, 0, 0.08]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#A9B18D" roughness={0.35} clearcoat={0.6} />
        </mesh>
        {/* Tall glass canister of ground coffee, dark wooden lid. */}
        <group position={[0.42, 0, -0.15]}>
          <mesh position={[0, 0.22, 0]} material={canisterGlass}>
            <cylinderGeometry args={[0.1, 0.1, 0.44, 40]} />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.088, 0.088, 0.24, 32]} />
            <meshStandardMaterial color="#3A2416" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.105, 0.105, 0.08, 40]} />
            <meshStandardMaterial color="#4A2E1C" roughness={0.6} />
          </mesh>
        </group>
        {/* Four checked coasters, stacked a little unevenly. */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.4, 0.014 + i * 0.026, 0.2]} rotation={[0, i * 0.08 - 0.1, 0]} material={coaster} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.024, 0.3]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Three hardbacks standing spine-out (refs/65). Titles are stand-ins (assumed). */
function StandingBooks() {
  const books = [
    { color: "#B4432B", ink: "#F2C64B", title: "Slow Coffee", t: 0.15, h: 1.08 },
    { color: "#E8E1D2", ink: "#3A3230", title: "Kyoto Mornings", t: 0.13, h: 1.14 },
    { color: "#26252A", ink: "#E9E2D2", title: "Ceramics", t: 0.12, h: 1.2 },
  ];
  let x = 0;
  return (
    <group>
      {books.map((b, i) => {
        const cx = x + b.t / 2;
        x += b.t + 0.005;
        return <StandingBook key={i} x={cx} {...b} />;
      })}
    </group>
  );
}

function StandingBook({ x, color, ink, title, t, h }: { x: number; color: string; ink: string; title: string; t: number; h: number }) {
  const spine = useMemo(() => spineTexture(color, title, ink), [color, title, ink]);
  const D = 0.75;
  return (
    <group position={[x, h / 2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[t, h, D]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, h / 2 - 0.004, -0.01]}>
        <boxGeometry args={[t - 0.025, 0.01, D - 0.05]} />
        <meshStandardMaterial color="#EFE9DA" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, D / 2 + 0.001]}>
        <planeGeometry args={[t - 0.01, h - 0.02]} />
        <meshStandardMaterial map={spine} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** The ribbed amber glass lamp on a brass base, switched on (refs/65). */
function AmberLamp() {
  const g = useMemo(() => ({
    globe: ribbed(lathe([[0.17, 0], [0.25, 0.06], [0.28, 0.2], [0.27, 0.36], [0.2, 0.48], [0.08, 0.54], [0, 0.55]], 176), 22, 0.05),
  }), []);
  const brass = useMemo(() => mat("#C59B4D", { metalness: 0.88, roughness: 0.28 }), []);
  return (
    <group>
      <mesh position={[0, 0.16, 0]} material={brass} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.19, 0.32, 48]} />
      </mesh>
      <mesh position={[0, 0.335, 0]} material={brass}>
        <cylinderGeometry args={[0.15, 0.18, 0.03, 48]} />
      </mesh>
      <group position={[0, 0.35, 0]}>
        <mesh geometry={g.globe} castShadow>
          <meshStandardMaterial color="#D98A3A" emissive="#FF9A3C" emissiveIntensity={0.6} roughness={0.18} transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshBasicMaterial color="#FFE2B0" toneMapped={false} />
        </mesh>
        {/* A little warm light on the sideboard and wall around it. */}
        <pointLight position={[0, 0.25, 0.1]} color="#FFB45C" intensity={1.4} distance={3.2} decay={2} />
      </group>
    </group>
  );
}

// --- Wall shelves (refs/64) ----------------------------------------------------

const WS = { width: 3.0, depth: 0.85, thick: 0.12 };

/** A black steel L-bracket: a plate on the wall, an arm under the shelf, a curved brace. */
function Bracket() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const t = 0.05;
    s.moveTo(0, 0);
    s.lineTo(WS.depth - 0.08, 0);
    s.lineTo(WS.depth - 0.08, -t);
    s.lineTo(0.3, -t);
    s.quadraticCurveTo(t, -t, t, -0.32);
    s.lineTo(t, -0.55);
    s.lineTo(0, -0.55);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
    g.translate(0, 0, -0.035);
    g.rotateY(-Math.PI / 2);
    return g;
  }, []);
  return <mesh geometry={geo} material={mat("#1E1E20", { roughness: 0.5, metalness: 0.4 })} castShadow />;
}

function WallShelf({ y, seed, width = WS.width }: { y: number; seed: number; width?: number }) {
  const wood = useMemo(() => woodMat({ seed, vertical: false, light: [112, 72, 44], dark: [56, 34, 20], figure: 8, cathedral: 1.5 }), [seed]);
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -WS.thick / 2, WS.depth / 2]} material={wood} castShadow receiveShadow>
        <boxGeometry args={[width, WS.thick, WS.depth]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (width / 2 - 0.35), -WS.thick, 0]}>
          <Bracket />
        </group>
      ))}
    </group>
  );
}

/** A canister: body, lid, and an optional band, from one texture or colours. */
function Canister({ r, h, body, lid, band }: { r: number; h: number; body: THREE.Material; lid: THREE.Material; band?: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, h / 2, 0]} material={body} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 48]} />
      </mesh>
      <mesh position={[0, h + 0.07, 0]} material={lid} castShadow>
        <cylinderGeometry args={[r + 0.008, r + 0.008, 0.14, 48]} />
      </mesh>
      {band ? (
        <mesh position={[0, 0.05, 0]} material={band}>
          <cylinderGeometry args={[r + 0.004, r + 0.004, 0.06, 48]} />
        </mesh>
      ) : null}
    </group>
  );
}

/** The framed menu print, leaning on the wall. Text is a stand-in (assumed). */
function MenuFrame() {
  const print = useMemo(
    () =>
      paint(300, 400, (g, w, h) => {
        g.fillStyle = "#F1EAD9";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#2A2623";
        g.textAlign = "center";
        g.font = 'italic 22px "Fraunces", Georgia, serif';
        g.fillText("Coffee Corner", w / 2, 52);
        g.font = '700 44px "Fraunces", Georgia, serif';
        g.fillText("Menu", w / 2, 102);
        g.font = '17px "DM Sans", sans-serif';
        g.textAlign = "left";
        ["Espresso", "Americano", "Cortado", "Cappuccino", "Latte", "Flat white"].forEach((item, i) => {
          const y = 150 + i * 30;
          g.fillText(item, 40, y);
          g.fillText("3.50", w - 78, y);
          g.fillRect(150, y - 4, w - 240, 1);
        });
        // A little cup and checks along the bottom, as in the reference.
        g.strokeStyle = "#2A2623";
        g.lineWidth = 3;
        g.strokeRect(w / 2 - 26, 335, 52, 34);
        for (let i = 0; i < 10; i++) if (i % 2) g.fillRect(i * 30, 380, 30, 20);
      }),
    [],
  );
  return (
    <group rotation={[-0.12, 0, 0]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.78, 1.0, 0.05]} />
        <meshStandardMaterial color="#1C1C1E" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0.027]}>
        <planeGeometry args={[0.66, 0.88]} />
        <meshStandardMaterial map={print} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** The scalloped brown frame with a small botanical print, leaning (refs/64, lower left). */
function ScallopFrame() {
  const g = useMemo(() => {
    const s = new THREE.Shape();
    const W = 0.62;
    const H = 0.78;
    const bumps = 6;
    // Scalloped outline: a run of small arcs along each side.
    const pts: [number, number][] = [
      [-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2],
    ];
    s.moveTo(-W / 2, -H / 2);
    for (let k = 0; k < 4; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[(k + 1) % 4];
      for (let i = 0; i < bumps; i++) {
        const t0 = i / bumps;
        const t1 = (i + 1) / bumps;
        const mx = x0 + (x1 - x0) * (t0 + t1) / 2;
        const my = y0 + (y1 - y0) * (t0 + t1) / 2;
        const nx = (y1 - y0) / Math.hypot(x1 - x0, y1 - y0);
        const ny = -(x1 - x0) / Math.hypot(x1 - x0, y1 - y0);
        s.quadraticCurveTo(mx + nx * 0.06, my + ny * 0.06, x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1);
      }
    }
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3 });
  }, []);
  const print = useMemo(
    () =>
      paint(200, 260, (c, w, h) => {
        c.fillStyle = "#EFE7D4";
        c.fillRect(0, 0, w, h);
        c.strokeStyle = "#5E7D4A";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(w / 2, h - 30);
        c.lineTo(w / 2, 60);
        c.stroke();
        c.fillStyle = "#4F6FB0";
        for (let i = 0; i < 14; i++) {
          c.beginPath();
          c.ellipse(w / 2 + (i % 2 ? 9 : -9), 60 + i * 9, 8, 5, 0, 0, Math.PI * 2);
          c.fill();
        }
      }),
    [],
  );
  return (
    <group rotation={[-0.1, 0, 0]}>
      <mesh geometry={g} position={[0, 0.42, -0.02]} castShadow>
        <meshStandardMaterial color="#6B4426" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.42, 0.035]}>
        <planeGeometry args={[0.42, 0.56]} />
        <meshStandardMaterial map={print} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** The flip clock on two books, reading 10:41 as in the reference. */
function FlipClock() {
  const face = useMemo(
    () =>
      paint(360, 160, (g, w, h) => {
        g.fillStyle = "#1A1A1C";
        g.fillRect(0, 0, w, h);
        for (const [i, d] of ["10", "41"].entries()) {
          const x = 20 + i * 172;
          g.fillStyle = "#26262A";
          g.fillRect(x, 16, 148, 128);
          g.fillStyle = "#EDEAE2";
          g.font = '700 104px "DM Sans", sans-serif';
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(d, x + 74, 84);
          g.fillStyle = "#0E0E10";
          g.fillRect(x, 79, 148, 3);
        }
      }),
    [],
  );
  const books = [
    { c: "#5A2E26", w: 1.0, h: 0.12 },
    { c: "#7A5A3A", w: 0.92, h: 0.1 },
  ];
  let y = 0;
  return (
    <group>
      {books.map((b, i) => {
        const yy = y + b.h / 2;
        y += b.h;
        return (
          <group key={i} position={[0, yy, 0]} rotation={[0, i ? 0.05 : -0.03, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[b.w, b.h, 0.6]} />
              <meshStandardMaterial color={b.c} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.005]}>
              <boxGeometry args={[b.w - 0.04, b.h - 0.03, 0.6]} />
              <meshStandardMaterial color="#EDE6D6" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.23, 0]} castShadow>
          <boxGeometry args={[0.86, 0.44, 0.34]} />
          <meshStandardMaterial color="#1A1A1C" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.23, 0.171]}>
          <planeGeometry args={[0.8, 0.36]} />
          <meshStandardMaterial map={face} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.12, 16]} />
          <meshStandardMaterial color="#1A1A1C" roughness={0.45} />
        </mesh>
      </group>
    </group>
  );
}

/** The rail under the lower shelf, with S-hooks and six mugs hanging. */
function MugRail({ L = 2.6 }: { L?: number }) {
  const mugs: MugSpec[] = useMemo(
    () => [
      { map: glazes.floral("#F2EBDD") },
      { map: glazes.checker("#7FA06A", "#EFE9DA") },
      { map: glazes.swirl("#F1EDE3", "#5E8A4E") },
      { color: "#D9C5A4" },
      { color: "#A7B48C" },
      { map: glazes.dots("#F0EADF", "#6E9456") },
    ],
    [],
  );
  const rod = useMemo(() => mat("#4A3B2E", { metalness: 0.7, roughness: 0.4 }), []);
  const hook = useMemo(() => new THREE.TorusGeometry(0.05, 0.008, 6, 16, Math.PI * 1.5), []);
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0.24]} material={rod} castShadow>
        <cylinderGeometry args={[0.022, 0.022, L, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[Math.PI / 2, 0, 0]} position={[s * (L / 2 - 0.05), 0, 0.12]} material={rod}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
        </mesh>
      ))}
      {mugs.map((m, i) => {
        const x = -L / 2 + 0.25 + i * ((L - 0.5) / 5);
        return (
          <group key={i} position={[x, 0, 0.24]}>
            <mesh geometry={hook} material={rod} position={[0, -0.05, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} />
            {/* The mug hangs by its handle from the hook. */}
            <group position={[-0.2, -0.12 - 0.42 * 0.79, 0]} rotation={[0, 0, 0]}>
              <Mug s={m} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

// --- Mug cabinet (refs/63) ------------------------------------------------------

/**
 * Honey plywood, four columns by three rows. As in the photo, the shelves are
 * thin and the dividers are separate short boards in each row, so each row's
 * dividers stop just shy of the shelf above.
 */
function MugCabinet() {
  const W = 2.6;
  const H = 1.82;
  const D = 0.5;
  const frame = 0.05;
  const shelf = 0.03;
  const div = 0.03;
  const cols = 4;
  const rows = 3;
  const cellW = (W - frame * 2 - div * (cols - 1)) / cols;
  const cellH = (H - frame * 2 - shelf * (rows - 1)) / rows;
  const ply = useMemo(() => woodMat({ seed: 41, vertical: false, light: [204, 152, 98], dark: [158, 108, 64], figure: 10, cathedral: 1.2 }, 0.6), []);
  const back = useMemo(() => woodMat({ seed: 42, vertical: false, light: [150, 100, 58], dark: [108, 68, 38], figure: 9, cathedral: 1 }, 0.75), []);
  const mugs: (MugSpec | "bowls")[] = useMemo(
    () => [
      // Top row, left to right.
      { color: "#D8D0BF", roughness: 0.75, r: 0.19, h: 0.4 },
      { color: "#2E3032", facets: 9, handle: false, r: 0.19, h: 0.38, flare: 1.08, gloss: true, roughness: 0.3 },
      { color: "#E3DFD6", roughness: 0.7, r: 0.19, h: 0.4 },
      "bowls",
      // Middle row.
      { map: glazes.speckle("#57524B", "#2C2926", 5), handle: false, r: 0.15, h: 0.3, flare: 0.94, roughness: 0.85 },
      { glassAttenuation: "#9A2E10", handle: false, r: 0.15, h: 0.4, flare: 1.1 },
      { map: glazes.marble("#E7DFCF", "#9A4A35"), rim: "#7FA7A2", handle: false, r: 0.2, h: 0.3, flare: 1.18, gloss: true, roughness: 0.4 },
      { map: glazes.blots("#F1EEE6", "#25292B"), rim: "#8AA0A8", handle: false, r: 0.15, h: 0.3, gloss: true },
      // Bottom row.
      { map: glazes.speckle("#E6E1D6", "#6E6256", 7), rim: "#4A3A2E", r: 0.2, h: 0.42, roughness: 0.6 },
      { color: "#1C2A31", foot: "#C48A62", handle: false, r: 0.16, h: 0.4, flare: 0.94, gloss: true, roughness: 0.15 },
      { color: "#ECE8E0", r: 0.18, h: 0.38, belly: 0.08, roughness: 0.55 },
      { color: "#3A3B3D", r: 0.2, h: 0.42, roughness: 0.8 },
    ],
    [],
  );
  const cellX = (c: number) => -W / 2 + frame + cellW / 2 + c * (cellW + div);
  const cellY = (r: number) => H - frame - cellH - r * (cellH + shelf);
  return (
    <group>
      <mesh position={[0, H / 2, 0.015]} material={back} receiveShadow>
        <boxGeometry args={[W - 0.02, H - 0.02, 0.03]} />
      </mesh>
      {/* Frame: top, bottom and the two sides. */}
      {[frame / 2, H - frame / 2].map((y, i) => (
        <mesh key={`h${i}`} position={[0, y, D / 2]} material={ply} castShadow receiveShadow>
          <boxGeometry args={[W, frame, D]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`f${s}`} position={[s * (W / 2 - frame / 2), H / 2, D / 2]} material={ply} castShadow receiveShadow>
          <boxGeometry args={[frame, H, D]} />
        </mesh>
      ))}
      {/* Two thin shelves. */}
      {Array.from({ length: rows - 1 }, (_, r) => (
        <mesh key={`s${r}`} position={[0, cellY(r) - shelf / 2, D / 2]} material={ply} castShadow receiveShadow>
          <boxGeometry args={[W - frame * 2, shelf, D - 0.01]} />
        </mesh>
      ))}
      {/* Short dividers, one set per row, stopping just under the shelf above. */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols - 1 }, (_, c) => (
          <mesh key={`d${r}${c}`} position={[cellX(c) + cellW / 2 + div / 2, cellY(r) + (cellH - 0.012) / 2, D / 2]} material={ply} castShadow receiveShadow>
            <boxGeometry args={[div, cellH - 0.012, D - 0.02]} />
          </mesh>
        )),
      )}
      {mugs.map((m, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <group key={i} position={[cellX(c) - 0.04, cellY(r), D / 2 + 0.02]} rotation={[0, -0.4 + (i % 3) * 0.18, 0]}>
            {m === "bowls" ? <StackedBowls /> : <Mug s={m} />}
          </group>
        );
      })}
    </group>
  );
}

/**
 * The floor under the sideboard: pure white like the wall, drawn unlit, with a
 * see-through layer that catches the shadows. It runs under the whole scene.
 */
function Floor() {
  return (
    <group position={[-20, FLOOR_Y, 10]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <planeGeometry args={[90, 20]} />
        <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]} receiveShadow>
        <planeGeometry args={[90, 20]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
    </group>
  );
}

/** A vertical studio gradient for reflections: light sky, dark horizon band, grey floor. */
function studioGradient() {
  return paint(16, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#FFFFFF");
    grad.addColorStop(0.4, "#F2F3F4");
    grad.addColorStop(0.47, "#C9CCCF");
    grad.addColorStop(0.5, "#7E8286");
    grad.addColorStop(0.54, "#ADB1B5");
    grad.addColorStop(1, "#8E9296");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/**
 * Mirror steel (Dvija, 13 Nov; refs/71): polished stainless shows its actual
 * surroundings. Once the machine has loaded, photograph the corner around it in
 * all six directions (a cube camera, with the machine itself hidden), blur that
 * to suit each roughness, and give it to the machine's steel as its reflection.
 * It happens once; nothing in the corner moves.
 */
function MirrorProbe({ name }: { name: string }) {
  const { gl, scene } = useThree();
  const done = useRef(false);
  const frame = useRef(0);
  useFrame(() => {
    if (done.current || ++frame.current % 30) return;
    const target = scene.getObjectByName(name);
    if (!target) return;
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cubeCam = new THREE.CubeCamera(0.05, 80, rt);
    new THREE.Box3().setFromObject(target).getCenter(cubeCam.position);
    // The room in front of the machine is empty white, so a mirror there reads flat.
    // For the capture only, surround the corner with a soft studio dome: bright
    // above, a darker horizon band, a mid-grey floor. The real wall, walnut and
    // mugs still show where they are.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.MeshBasicMaterial({ map: studioGradient(), side: THREE.BackSide, toneMapped: false }));
    dome.position.copy(cubeCam.position);
    scene.add(dome);
    target.visible = false;
    cubeCam.update(gl, scene);
    target.visible = true;
    scene.remove(dome);
    dome.geometry.dispose();
    (dome.material as THREE.MeshBasicMaterial).map?.dispose();
    (dome.material as THREE.Material).dispose();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromCubemap(rt.texture).texture;
    pmrem.dispose();
    rt.dispose();
    target.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m?.isMeshStandardMaterial || !/^steel/.test(m.name)) return;
      m.envMap = env;
      m.envMapIntensity = m.name === "steel_dark" ? 0.95 : 1.25;
      m.needsUpdate = true;
    });
    done.current = true;
  });
  return null;
}

export default function CoffeeCorner() {
  const checker = useMemo(() => {
    const tex = glazes.checker("#1E1E20", "#F2EEE6", 12, 6);
    return mat("#FFFFFF", { map: tex, roughness: 0.4 });
  }, []);
  const white = useMemo(() => mat("#F2EFE8", { roughness: 0.45 }), []);
  const green = useMemo(() => mat("#3F7A4A", { roughness: 0.4 }), []);
  // Layout follows Dvija's vision board (refs/65), measured off it:
  // x from the sideboard's centre, y up from its top.
  return (
    <group position={[STATION.centre, 0, WALL_Z]}>
      <Floor />
      <Sideboard />
      <MirrorProbe name="coffee_machine" />
      {/* On top, left to right: the machine, the bean jar on its riser, the checked tray, books, the lamp. */}
      <group position={[-1.63, 0, 0.95]}>
        {/* Dvija's own Breville Barista Express (blender/breville.py), at true size. */}
        <Model src="/models/breville.glb" height={2.05} fallback={<CoffeeMachine />} palette={BREVILLE_GLASS} tint={BREVILLE_STEEL} shine={BREVILLE_SHINE} />
      </group>
      <group position={[-0.14, 0, 1.05]}>
        <MarbleRiser />
        <group position={[0, 0.135, 0]}>
          <BeanJar />
        </group>
      </group>
      <group position={[0.89, 0, 1.1]}>
        <CheckerTray />
      </group>
      <group position={[1.78, 0, 0.75]}>
        <StandingBooks />
      </group>
      <group position={[2.55, 0, 0.95]} scale={1.2}>
        <AmberLamp />
      </group>

      {/* Upper left: the shelf with the print, the flip clock and the pothos, and the mug rail under it. */}
      <group position={[-1.35, 0, 0]}>
        <WallShelf y={3.16} seed={51} width={2.8} />
        <group position={[0, 2.86, 0]}>
          <MugRail L={2.5} />
        </group>
        <group position={[-1.0, 3.16, 0.18]}>
          <ScallopFrame />
        </group>
        <group position={[-0.2, 3.16, 0.4]}>
          <FlipClock />
        </group>
        <mesh position={[0.45, 3.16 + 0.12, 0.45]} material={mat("#55794A", { roughness: 0.45 })} castShadow>
          <boxGeometry args={[0.42, 0.24, 0.3]} />
        </mesh>
        <group position={[1.05, 3.16, 0.4]} scale={0.95}>
          <Pothos />
        </group>
      </group>

      {/* Upper right: the top shelf, and the mug cabinet under it. */}
      <group position={[1.38, 0, 0]}>
        <WallShelf y={4.41} seed={52} width={2.8} />
        <group position={[-1.0, 4.41, 0.42]} scale={0.85}>
          <SnakePlant sage />
        </group>
        <group position={[-0.2, 4.41, 0.42]}>
          <Canister r={0.22} h={0.5} body={checker} lid={checker} />
        </group>
        <group position={[0.5, 4.41, 0.2]}>
          <MenuFrame />
        </group>
        <group position={[1.15, 4.41, 0.42]}>
          <Canister r={0.2} h={0.42} body={white} lid={green} band={green} />
        </group>
      </group>
      <group position={[1.6, 1.57, 0]}>
        <MugCabinet />
      </group>
    </group>
  );
}

/**
 * The machine's see-through parts, clearer than its Blender export: the glass
 * cups (two on top, glass again as in refs/40, 13 Nov), the smoky hopper, and
 * the water tank at the back with its water.
 */
const BREVILLE_GLASS = {
  glass: { color: "#FFFFFF", roughness: 0.03, glass: true },
  glass_smoke: { color: "#3B3532", roughness: 0.08, opacity: 0.55 },
  tank: { color: "#D3DCE0", roughness: 0.1, opacity: 0.22 },
  water: { color: "#B7D3E0", roughness: 0.05, opacity: 0.28 },
};
/**
 * Glossy polished stainless (Dvija, 13 Nov), tuned against Breville's own shot
 * (refs/69): a light steel tint and strong reflections, or polished metal goes
 * charcoal in the soft grey room it reflects.
 */
const BREVILLE_STEEL = { steel: "#C8CCD0", steel_brushed: "#B4B8BC", steel_dark: "#6E7276" };
const BREVILLE_SHINE = { steel: 6.5, steel_brushed: 5, steel_dark: 4 };
