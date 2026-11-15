import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeVertices, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mat } from "./materials";
import { CoffeeMachine } from "./objects/Props";
import Model from "./Model";
import { lathe, ribbed, seeded } from "./shapes";
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
 * - refs/espresso (user, later): the rail holds six glossy espresso cups
 *   instead of mugs, the machine's top a stack of saucers with a cup, and
 *   the drip tray a poured espresso in place of the glass shot cup.
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
  const rand = seeded(seed + 1);
  const off = rand() * 50;
  // Where the log's heart runs, a little off the panel's centre.
  const heart = 0.5 + (rand() - 0.5) * 0.25;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // The grain drifts and waves along the board...
      const warp = (n(u * 1.5 + off, v * 1.2) - 0.5) * 0.5 + Math.sin(v * 4 + off) * 0.03;
      // ...and is a flat-sawn cut through a tapering log: each growth ring is
      // a cylinder, so on the plank it shows as nested arches pointing up the
      // panel ("cathedrals", refs/61 and 65), with straight grain at the edges.
      // Slow swirls bend whole groups of rings, as in a flame figure.
      const swirl = (n(u * 1.2 + off * 2, v * 0.9 + 21) - 0.5) * 0.22;
      const dx = u - heart + warp * 0.12 + swirl;
      const r = Math.sqrt(dx * dx + 0.004);
      // Rings are never evenly spaced: a slow noise bunches and spreads them.
      const ring = (r - cathedral * 0.065 * v) * figure * 1.15 + warp * 0.8 + n(u * 3 + off, v * 2 + 7) * 1.6;
      const f = ring - Math.floor(ring);
      // Latewood: a broad soft dark band per growth ring (no hard pinstripes).
      const late = Math.pow(Math.sin(f * Math.PI), 3);
      // Pores and long streaks run with the grain (fast across, slow along).
      const pores = n(u * 140 + off, v * 3 + 3) * 0.55 + n(u * 30 + off, v * 0.7 + 5) * 0.45;
      const tone = n(u * 2.5 + off, v * 1.1 + 11);
      const t = Math.min(1, late * 0.36 + pores * 0.14 + tone * 0.5);
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

/**
 * Thin clear glass seen against the white wall (the machine's cups, the jar's
 * lid). Transmission only shows what is opaque behind it, so against the wall
 * it reads as white and hides the jar's own rim. These are see-through shells
 * instead: almost no colour, a faint grey that doubles up where the walls
 * overlap so rims and edges outline themselves, and only a soft reflection,
 * so the front faces don't fog over.
 */
function sheetGlass({ facets = false }: { facets?: boolean } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#93A3A0",
    roughness: 0,
    metalness: 0,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 0.6,
    specularIntensity: 0.6,
    flatShading: facets,
  });
  // Fresnel: almost nothing where you look straight through, a fine grey-green
  // line where the glass turns edge-on. That edge is what makes glass read as
  // glass against a white wall; a uniform tint only reads as frosting.
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
      {
        vec3 nn = normalize(normal);
        float edge = pow(1.0 - clamp(abs(dot(nn, normalize(vViewPosition))), 0.0, 1.0), 4.0);
        // Broad faces turned up or down (a lid's dome seen from the side) stay
        // clear too; only the glass's silhouette and rims draw a line.
        edge *= 1.0 - 0.85 * abs(nn.y);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.38, 0.46, 0.44), edge * 0.8);
        gl_FragColor.a = mix(0.02, 0.55, edge);
      }`,
    );
  };
  return m;
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
      for (let i = 0; i < 420; i++) {
        g.beginPath();
        g.arc(r() * w, r() * h, 0.4 + r() * 0.9, 0, Math.PI * 2);
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
      // A grey-teal glaze over the inside and down the outside from the lip,
      // ending in a soft wavy line (refs/63). The canvas's top half is the
      // cup's inside, its lower half the outside, rim at the middle.
      g.fillStyle = "#86A3A0";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(w, 0);
      for (let x = w; x >= 0; x -= 8) g.lineTo(x, h * 0.58 + Math.sin(x * 0.09) * 2.5 + r() * 2);
      g.closePath();
      g.fill();
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
  /** A metallic glaze, like the gunmetal faceted cup in refs/63. */
  metal?: number;
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
      metalness: s.metal ?? 0,
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

/** Three shallow matte terracotta bowls stacked and tipped back (top right of refs/63). */
function StackedBowls() {
  const bowl = useMemo(() => lathe([[0, 0], [0.09, 0], [0.18, 0.05], [0.21, 0.1], [0.2, 0.105], [0.17, 0.055], [0.08, 0.02], [0, 0.02]], 48), []);
  const colours = ["#8E4A2E", "#A0583A", "#7E3F27"];
  return (
    <group rotation={[0.3, 0, -0.08]}>
      {colours.map((c, i) => (
        <mesh key={c} geometry={bowl} position={[0, i * 0.04, i * -0.008]} castShadow receiveShadow>
          <meshStandardMaterial color={c} roughness={0.85} />
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
  // Thin dark seams between the fronts (refs/61), about 2-3 mm.
  const gap = 0.013;
  const drawerH = 0.72;
  const rail = 0.1;
  const colW = (W - side * 2 - gap * 4) / 3;
  const doorH = SB.body - drawerH - gap * 3 - rail;
  const mats = useMemo(() => {
    const w = (seed: number, tone: number, vertical = true, figure = 9, cathedral = 2.4): Wood => ({
      seed,
      vertical,
      figure,
      cathedral,
      light: WALNUT_LIGHT.map((c) => c * tone) as [number, number, number],
      dark: WALNUT_DARK.map((c) => c * tone) as [number, number, number],
    });
    return {
      carcass: woodMat(w(3, 0.92, true)),
      // The end panels: plainer, nearly straight grain.
      ends: woodMat(w(4, 0.9, true, 7, 0.6)),
      top: woodMat(w(5, 0.95, false, 7, 1.6)),
      // Drawers: grain runs across. Doors: broad flame figure running up, each
      // panel its own, the middle one darker (refs/61).
      drawers: [woodMat(w(11, 1.06, false, 7, 1.4)), woodMat(w(12, 1.0, false, 6, 1.8)), woodMat(w(13, 0.9, false, 8, 1.2))],
      doors: [woodMat(w(21, 1.05, true, 8, 2.6)), woodMat(w(22, 0.8, true, 7, 3.4)), woodMat(w(23, 1.0, true, 9, 2.2))],
      brass: mat("#B8934A", { metalness: 0.85, roughness: 0.3 }),
      leg: woodMat(w(31, 0.85)),
      seam: mat("#24150C", { roughness: 0.9 }),
    };
  }, []);
  // A front shows its veneer on the face only; its edges are in the seam's shadow,
  // so no lit edge shows in a seam and reads as one front overlapping the next.
  const faced = useMemo(() => {
    const f = (m: THREE.Material) => [mats.seam, mats.seam, mats.seam, mats.seam, m, mats.seam];
    return { drawers: mats.drawers.map(f), doors: mats.doors.map(f) };
  }, [mats]);
  const yTop = -SB.top;
  const yBody = yTop - SB.body;
  // Fronts sit flush with the end panels' front edges.
  const front = D - 0.025;
  const colX = (i: number) => -W / 2 + side + gap + colW / 2 + i * (colW + gap);
  return (
    <group>
      {/* Top: one slab, grain running along it. */}
      <mesh position={[0, -SB.top / 2, D / 2]} material={mats.top} castShadow receiveShadow>
        <boxGeometry args={[W + 0.04, SB.top, D + 0.04]} />
      </mesh>
      {/* Carcass: the box behind the fronts, and a dark recess that shows in the seams. */}
      <mesh position={[0, yTop - SB.body / 2, D / 2 - 0.03]} material={mats.carcass} castShadow receiveShadow>
        <boxGeometry args={[W - side * 2, SB.body, D - 0.06]} />
      </mesh>
      <mesh position={[0, yTop - SB.body / 2, D - 0.055]} material={mats.seam}>
        <planeGeometry args={[W - side * 2, SB.body]} />
      </mesh>
      {/* End panels, full depth, framing the fronts. */}
      {[-1, 1].map((sx) => (
        <mesh key={`e${sx}`} position={[sx * (W / 2 - side / 2), yTop - SB.body / 2, D / 2]} material={mats.ends} castShadow receiveShadow>
          <boxGeometry args={[side, SB.body, D]} />
        </mesh>
      ))}
      {/* Bottom rail under the doors. */}
      <mesh position={[0, yBody + (rail - gap) / 2, front]} material={mats.carcass} castShadow receiveShadow>
        <boxGeometry args={[W - side * 2, rail - gap, 0.05]} />
      </mesh>
      {/* Drawers across the top, doors below, all in one plane. Each front is its own veneer. */}
      {[0, 1, 2].map((i) => (
        <mesh key={`d${i}`} position={[colX(i), yTop - gap - drawerH / 2, front]} material={faced.drawers[i]} castShadow receiveShadow>
          <boxGeometry args={[colW, drawerH, 0.05]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={`o${i}`} position={[colX(i), yTop - gap * 2 - drawerH - doorH / 2, front]} material={faced.doors[i]} castShadow receiveShadow>
          <boxGeometry args={[colW, doorH, 0.05]} />
        </mesh>
      ))}
      {/* The one knob, small and brass, on the right-hand door's left edge. */}
      <mesh position={[colX(2) - colW / 2 + 0.16, yTop - gap * 2 - drawerH - doorH * 0.45, front + 0.04]} material={mats.brass} castShadow>
        <sphereGeometry args={[0.045, 16, 12]} />
      </mesh>
      {/* Base frame and four tapered legs, near the corners. */}
      <mesh position={[0, yBody - 0.07, D / 2]} material={mats.leg} castShadow receiveShadow>
        <boxGeometry args={[W - 0.4, 0.14, D - 0.3]} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [0.24, D - 0.24].map((z) => (
          <mesh key={`${sx}${z}`} position={[sx * (W / 2 - 0.26), yBody - SB.legs / 2, z]} rotation={[0, Math.PI / 4, 0]} material={mats.leg} castShadow receiveShadow>
            <cylinderGeometry args={[0.13, 0.09, SB.legs, 4]} />
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
      y *= 0.5;
      y -= 0.3 * Math.exp(-(x * x) / 0.012) * (1 - z * z * 0.6);
    } else {
      y *= 0.8;
    }
    p.setXYZ(i, x, y, z);
  }
  g.scale(0.031, 0.025, 0.043);
  g.computeVertexNormals();
  return g;
}

/**
 * The jar of beans (refs/62): thick clear glass with 14 wide flutes, straight
 * sides rounding over a broad shoulder into a short neck and a flange, a thick
 * clear base. A glass lid with a faceted knob sits on an amber seal. The beans
 * fill a bit over half, kept inside the glass, a clear empty band above.
 */
function BeanJar() {
  const R = 0.32;
  const H = 0.95;
  const wall = 0.016;
  const g = useMemo(() => {
    const neck = R * 0.74;
    const sh0 = H * 0.66;
    const sh1 = H * 0.86;
    const arc = (r0: number, rN: number, inset: number) =>
      Array.from({ length: 9 }, (_, k) => {
        const t = (k / 8) * (Math.PI / 2);
        return [rN + (r0 - rN) * Math.cos(t) - inset, sh0 + (sh1 - sh0) * Math.sin(t) - inset * 0.5] as [number, number];
      });
    const outer: [number, number][] = [[0, 0], [R * 0.94, 0], [R, 0.03], ...arc(R, neck, 0), [neck, H * 0.9], [R * 0.8, H * 0.91], [R * 0.8, H * 0.94], [neck - wall, H * 0.94]];
    const inner: [number, number][] = [...arc(R, neck, wall).reverse(), [R - wall, 0.08], [R * 0.85, 0.07], [0, 0.07]];
    const jar = ribbed(lathe([...outer, ...inner], 224), 14, 0.035);
    const lid = lathe([[0, 0], [R * 0.84, 0], [R * 0.86, 0.02], [R * 0.86, 0.045], [R * 0.78, 0.07], [R * 0.5, 0.1], [0.1, 0.115], [0, 0.118]], 64);
    // A cut-glass knob: eight flat facets on a short stem.
    const knob = lathe([[0, 0], [0.035, 0], [0.03, 0.035], [0.075, 0.065], [0.082, 0.095], [0.06, 0.12], [0, 0.125]], 8);
    return { jar, lid, knob, bean: beanGeometry() };
  }, []);
  const fill = H * 0.56;
  const beans = useMemo(() => {
    const r = seeded(62);
    const list: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const tones = ["#8C4A22", "#9E5A2C", "#7A3D1B", "#B06A35", "#6A3517"].map((c) => new THREE.Color(c));
    const q = new THREE.Quaternion();
    const add = (pos: THREE.Vector3) => {
      q.setFromEuler(new THREE.Euler(r() * 6.3, r() * 6.3, r() * 6.3));
      const s = 0.85 + r() * 0.25;
      list.push({ m: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(s, s, s)), c: tones[Math.floor(r() * tones.length)] });
    };
    // The outer shell lies flat against the glass, each bean's back to the
    // wall, so they touch it without pushing through; a looser shell behind.
    const up = new THREE.Vector3(0, 1, 0);
    const spin = new THREE.Quaternion();
    for (const [shell, flat] of [[R * 0.84, true], [R * 0.68, false]] as [number, boolean][]) {
      for (let y = 0.1; y < fill; y += 0.034) {
        const count = Math.floor((Math.PI * 2 * shell) / 0.05);
        for (let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2 + r() * 0.08 + y * 3;
          const pos = new THREE.Vector3(Math.cos(a) * shell, y + (r() - 0.5) * 0.03, Math.sin(a) * shell);
          if (!flat) {
            add(pos);
            continue;
          }
          // Rounded back against the glass (crease side in), turned any way, tipped a little.
          q.setFromUnitVectors(up, new THREE.Vector3(-Math.cos(a), (r() - 0.5) * 0.5, -Math.sin(a)).normalize());
          spin.setFromAxisAngle(up, r() * 6.3);
          q.multiply(spin);
          const sc = 0.85 + r() * 0.25;
          list.push({ m: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(sc, sc, sc)), c: tones[Math.floor(r() * tones.length)] });
        }
      }
    }
    // ...and a gently heaped top surface.
    for (let k = 0; k < 260; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R * 0.8;
      add(new THREE.Vector3(Math.cos(a) * d, fill + 0.02 + (1 - d / R) * 0.04 + r() * 0.02, Math.sin(a) * d));
    }
    return list;
  }, [fill]);
  // Each bean keeps its own small highlight: a glossy coat over a satin roast.
  const beanMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.45, clearcoat: 0.9, clearcoatRoughness: 0.22 }), []);
  const jarGlass = useMemo(() => clearGlass({ thickness: 0.05, attenuation: "#B9CAC5", distance: 0.2 }), []);
  // Lid and knob: the same clear glass, as thin shells so the jar's neck, the
  // amber seal and the beans show through them (refs/62).
  const lidGlass = useMemo(() => sheetGlass(), []);
  const knobGlass = useMemo(() => sheetGlass({ facets: true }), []);
  return (
    <group>
      <mesh position={[0, (fill + 0.07) / 2 + 0.01, 0]}>
        <cylinderGeometry args={[R * 0.6, R * 0.6, fill - 0.07, 32]} />
        <meshStandardMaterial color="#3A1E0E" roughness={0.7} />
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
      {/* The amber rubber seal on the flange, under the lid. */}
      <mesh position={[0, H * 0.94 + 0.008, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 0.8, 0.014, 10, 64]} />
        <meshStandardMaterial color="#D79A3C" roughness={0.45} transparent opacity={0.9} />
      </mesh>
      <group position={[0, H * 0.94 + 0.016, 0]}>
        <mesh geometry={g.lid} material={lidGlass} renderOrder={3} />
        <mesh geometry={g.knob} material={knobGlass} position={[0, 0.112, 0]} renderOrder={3} />
      </group>
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

/**
 * The long beige marble tray (refs/65), under the bean jar and on beige
 * feet, with a neat stack of black coasters on it.
 */
function CheckerTray() {
  // One long beige marble tray, running left under the bean jar too.
  const W = 2.16;
  const D = 0.8;
  const X = -0.43;
  const top = useMemo(() => {
    const edge = mat("#DDCDB4", { roughness: 0.22 });
    const face = mat("#FFFFFF", { map: marbleTexture(4, "#E6D8C2", "#B09A7C"), roughness: 0.2 });
    return [edge, edge, face, edge, edge, edge];
  }, []);
  // Coasters: plain matte black stone.
  const coaster = useMemo(() => mat("#1C1C1E", { roughness: 0.35 }), []);
  const feet = useMemo(() => mat("#CDBB9E", { roughness: 0.3 }), []);
  return (
    <group>
      <mesh position={[X, 0.06, 0]} material={top} castShadow receiveShadow>
        <boxGeometry args={[W, 0.05, D]} />
      </mesh>
      {[-1, 0, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[X + sx * (W / 2 - 0.1), 0.018, sz * (D / 2 - 0.1)]} material={feet} castShadow>
            <cylinderGeometry args={[0.04, 0.045, 0.036, 16]} />
          </mesh>
        )),
      )}
      <group position={[0, 0.085, 0]}>
        {/* Four black coasters in a neat stack. */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.4, 0.013 + i * 0.026, 0.0]} rotation={[0, (i % 2 ? 0.015 : -0.01), 0]} material={coaster} castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.024, 0.32]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Two cookbooks propped cover-out against the wall (Dvija, 13 Nov): a green
 * "The Condiment Book" in front, a taller blue one leaning behind it.
 */
function CoverBooks() {
  const condiment = useMemo(
    () =>
      paint(360, 480, (c, w, h) => {
        c.fillStyle = "#2F9A5C";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#F4EBDA";
        c.textAlign = "left";
        c.font = '600 17px "DM Sans", sans-serif';
        c.fillText("Recipes, pairings, and a little", 24, 34);
        c.fillText("history of the things we pour", 24, 54);
        c.font = '700 58px "Fraunces", Georgia, serif';
        c.fillText("The", 24, 116);
        c.fillText("Condiment", 24, 170);
        c.fillText("Book", 24, 224);
        // A row of jars and bottles, drawn flat, between the title and the author.
        const r = seeded(21);
        const cols = ["#E2402F", "#F2C64B", "#D9632B", "#7A2E3A", "#E9E2D2", "#1E1C1E", "#B4432B"];
        for (let i = 0; i < 7; i++) {
          const bw = 30 + r() * 10;
          const bh = 56 + r() * 40;
          const x = 22 + i * 46 + r() * 4;
          const y = 352 - bh;
          c.fillStyle = cols[i % cols.length];
          c.beginPath();
          c.roundRect(x, y, bw, bh, 7);
          c.fill();
          c.fillStyle = "#1E1C1E";
          c.fillRect(x + bw * 0.2, y - 13, bw * 0.6, 14);
          c.fillStyle = "#F4EBDA";
          c.fillRect(x + 4, y + bh * 0.35, bw - 8, bh * 0.28);
        }
        c.fillStyle = "#E2402F";
        c.font = '700 40px "Fraunces", Georgia, serif';
        c.fillText("Claire", 24, h - 66);
        c.fillText("Dinhut", 24, h - 24);
      }),
    [],
  );
  // The book behind: a stand-in jacket, deep blue with big cream letters.
  const blue = useMemo(
    () =>
      paint(360, 480, (c, w, h) => {
        c.fillStyle = "#3C4C9C";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#EFE3C8";
        c.textAlign = "center";
        c.font = '800 150px "Fraunces", Georgia, serif';
        c.fillText("SA", w / 2, 180);
        c.fillText("LT", w / 2, 330);
        c.font = '600 22px "DM Sans", sans-serif';
        c.fillText("A KITCHEN COMPANION", w / 2, h - 40);
      }),
    [],
  );
  return (
    <group>
      <CoverBook w={0.86} h={1.15} t={0.09} x={0.22} z={0.24} cover={blue} color="#3C4C9C" />
      <CoverBook w={0.72} h={0.95} t={0.08} x={0.0} z={0.4} cover={condiment} color="#2F9A5C" />
    </group>
  );
}

/** A hardback stood on its bottom edge, cover to the room, leaning back on the wall behind. */
function CoverBook({ w, h, t, x, z, cover, color }: { w: number; h: number; t: number; x: number; z: number; cover: THREE.Texture; color: string }) {
  const mats = useMemo(() => {
    const board = mat(`#${new THREE.Color(color).multiplyScalar(0.7).getHexString()}`, { roughness: 0.8 });
    const pages = mat("#EFE9DA", { roughness: 0.9 });
    const face = mat("#FFFFFF", { map: cover, roughness: 0.7 });
    // Box faces: +x, -x, +y, -y, +z (cover), -z (back).
    return [pages, board, pages, pages, face, board];
  }, [cover, color]);
  return (
    <group position={[x, 0, z]} rotation={[-0.12, 0, 0]}>
      <mesh position={[0, h / 2, -t / 2]} material={mats} castShadow receiveShadow>
        <boxGeometry args={[w, h, t]} />
      </mesh>
    </group>
  );
}

/**
 * The table lamp (refs/65), switched on: a deep amber ribbed glass lantern, a
 * barrel with rounded shoulders, a little brass cap on top, lit from inside
 * by a bright warm bulb that also throws a warm pool on the sideboard, on a
 * polished brass drum.
 */
function AmberLamp() {
  const g = useMemo(() => {
    // A smooth barrel profile: a superellipse, so the shoulders round over without facets.
    const prof: [number, number][] = [];
    for (let k = 0; k <= 28; k++) {
      const t = -Math.PI / 2 + (k / 28) * Math.PI;
      const c = Math.cos(t);
      const sn = Math.sin(t);
      prof.push([0.07 + 0.18 * Math.pow(c, 0.45), 0.25 + 0.25 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.75)]);
    }
    return { globe: ribbed(lathe(prof, 320), 32, 0.06) };
  }, []);
  // Polished warm brass.
  // Polished warm brass. Built directly, not with mat(): mat()'s mint rim light
  // tinted the gold's edges khaki. A faint warm glow keeps it gold where the
  // soft room has little to reflect.
  const brass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#E8B456",
        metalness: 0.85,
        roughness: 0.14,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.5,
        emissive: "#4A2E0A",
        emissiveIntensity: 0.25,
        // Its own bright studio to mirror (light above, a dark band at the
        // horizon): the room's soft light alone left polished metal khaki.
        envMap: studioReflection(),
      }),
    [],
  );
  // A soft round glow, bright in the middle and fading out: the light filling the upper shade.
  const glow = useMemo(
    () =>
      paint(128, 128, (g, w, h) => {
        const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        r.addColorStop(0, "rgba(255,255,255,1)");
        r.addColorStop(0.25, "rgba(255,255,255,0.55)");
        r.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = r;
        g.fillRect(0, 0, w, h);
      }),
    [],
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#E08A3C",
        emissive: "#FF8A30",
        emissiveIntensity: 0.75,
        roughness: 0.1,
        clearcoat: 1,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  return (
    <group>
      <mesh position={[0, 0.15, 0]} material={brass} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.3, 64]} />
      </mesh>
      <mesh position={[0, 0.31, 0]} material={brass}>
        <cylinderGeometry args={[0.1, 0.16, 0.025, 64]} />
      </mesh>
      <group position={[0, 0.32, 0]}>
        {/* The bulb: a hot white core and a warm halo, added on top of the glass
            (drawn after it, additively) so the shade can't dull them to peach. */}
        <mesh position={[0, 0.24, 0]} renderOrder={5}>
          <sphereGeometry args={[0.065, 20, 14]} />
          <meshBasicMaterial color="#FFF6E0" transparent opacity={1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <sprite position={[0, 0.26, 0]} scale={[0.5, 0.5, 1]} renderOrder={4}>
          <spriteMaterial map={glow} color="#FFA850" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
        <mesh geometry={g.globe} material={glassMat} renderOrder={2} />
        <mesh position={[0, 0.51, 0]} material={brass} castShadow>
          <cylinderGeometry args={[0.07, 0.075, 0.025, 32]} />
        </mesh>
        <mesh position={[0, 0.54, 0]} material={brass}>
          <cylinderGeometry args={[0.012, 0.012, 0.04, 10]} />
        </mesh>
        {/* A warm pool of light on the sideboard and the wall around it. */}
        <pointLight position={[0, 0.2, 0.15]} color="#FFAA50" intensity={4} distance={3.2} decay={2} />
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
    s.lineTo(WS.depth, 0);
    s.lineTo(WS.depth, -t);
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
          {/* The bracket's arm turns up over the shelf's front edge, flush with its top (refs/64). */}
          <mesh position={[0, (WS.thick - 0.03) / 2, WS.depth + 0.012]} material={mat("#1E1E20", { roughness: 0.5, metalness: 0.4 })} castShadow>
            <boxGeometry args={[0.075, WS.thick + 0.03, 0.024]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- Espresso cups and saucers (refs/espresso) ---------------------------------

/**
 * The glossy porcelain glazes (refs/espresso swatches; the user's own sampled
 * colours): wine red, salmon, terracotta, coffee and periwinkle from the
 * photos, a pale creamy butter, and the soft sage of the old sage rail mug.
 * Cups are coloured outside and over the lip, white only inside.
 */
const ESPRESSO = {
  wine: "#9E1A1B",
  salmon: "#CB5E4F",
  butter: "#EBD5AE",
  sage: "#A7B48C",
  coffee: "#4F3422",
  // Sampled #A3402A reads as salmon under the scene light; this deeper, browner
  // burnt orange keeps it apart from the salmon cup.
  terracotta: "#8A3A22",
  periwinkle: "#9CBBD6",
};
type Glaze = keyof typeof ESPRESSO;
const PORCELAIN = "#F3F0E8";

const glazeCache = new Map<string, THREE.MeshPhysicalMaterial>();
/**
 * Glossy glaze: a clear coat over the colour, as on fired porcelain. `flat`
 * is for saucers: their tops face the bright sky, which at full gloss washes
 * the colour out (salmon went dusty pink), so they reflect a little less.
 */
function glaze(color: string, flat = false) {
  const key = `${color}${flat ? "f" : ""}`;
  let m = glazeCache.get(key);
  if (!m) {
    // Softer than a mirror-glaze (13 Nov): full clearcoat put hot white blobs on
    // every cup and lit the white insides like lamps. A satin-gloss porcelain
    // keeps a gentle sheen and lets the cups shade like the rest of the corner.
    m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: flat ? 0.35 : 0.55, clearcoatRoughness: 0.22, envMapIntensity: flat ? 0.4 : 0.6 });
    glazeCache.set(key, m);
  }
  return m;
}

/**
 * Espresso cup (refs/espresso SHAPE): a low, wide, rounded tulip bowl, about
 * 1.6 times as wide at the rim as it is tall, curving smoothly into a short
 * foot ring a little narrower than the bowl's base. 0.354 across, 0.224 tall.
 */
/** The ear handle's path, joined just under the rim and on the lower body. */
const EAR: [number, number][] = [[0.165, 0.186], [0.2, 0.204], [0.238, 0.2], [0.262, 0.172], [0.264, 0.135], [0.247, 0.1], [0.215, 0.078], [0.18, 0.07], [0.145, 0.072]];
const EAR_TUBE = 0.02;
/** Where an S-hook's wire rests in the ear: the inside of its outermost bend. */
const EAR_GRIP = new THREE.Vector3(0.264 - EAR_TUBE - 0.006, 0.137, 0);

function espressoGeometry() {
  // Outside, coloured: the foot ring flowing up into the bowl and right over
  // the rolled lip, to its inner edge (no white band, the user's call).
  const outer = lathe([[0, 0.004], [0.066, 0.004], [0.074, 0], [0.082, 0.004], [0.086, 0.012], [0.09, 0.02], [0.1, 0.028], [0.118, 0.04], [0.14, 0.06], [0.158, 0.088], [0.17, 0.12], [0.176, 0.152], [0.177, 0.18], [0.177, 0.2], [0.177, 0.215], [0.171, 0.224], [0.16, 0.221], [0.1556, 0.212]], 72);
  // White inside only: from just inside the lip down the thick wall to the
  // bottom. It starts a hair inside the coloured edge, so the two never overlap.
  const inner = lathe([[0.1553, 0.2118], [0.155, 0.2], [0.153, 0.16], [0.142, 0.114], [0.118, 0.076], [0.082, 0.054], [0.036, 0.046], [0, 0.045]], 72);
  // An ear: thick, a little taller than wide, with a small hole.
  const handle = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(EAR.map(([x, y]) => new THREE.Vector3(x, y, 0))), 40, EAR_TUBE, 12, false);
  return { outer, inner, handle };
}

function saucerGeometry() {
  // Coloured on top and underneath; a raised ring in the middle for the cup's foot.
  const body = lathe([[0, 0.012], [0.105, 0.012], [0.11, 0], [0.122, 0], [0.126, 0.014], [0.2, 0.034], [0.27, 0.062], [0.292, 0.074], [0.288, 0.082], [0.262, 0.07], [0.19, 0.046], [0.125, 0.034], [0.11, 0.042], [0.098, 0.044], [0.09, 0.034], [0, 0.03]], 72);
  // The white rim edge.
  const rim = new THREE.TorusGeometry(0.288, 0.0065, 10, 72);
  return { body, rim };
}

/** Crema on a fresh espresso: pale hazel in the middle, darker towards the cup's wall. */
function cremaTexture() {
  return paint(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w * 0.46, h * 0.46, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, "#D3A06A");
    r.addColorStop(0.55, "#B47A45");
    r.addColorStop(0.85, "#7A4523");
    r.addColorStop(1, "#4A2412");
    g.fillStyle = r;
    g.fillRect(0, 0, w, h);
  });
}

/**
 * One espresso cup: coloured outside and over the lip, white inside, a
 * coloured ear handle. `espresso` fills it with a shot under crema.
 */
function EspressoCup({ glazeName, espresso = false }: { glazeName: Glaze; espresso?: boolean }) {
  const g = useMemo(espressoGeometry, []);
  const outside = glaze(ESPRESSO[glazeName]);
  const white = glaze(PORCELAIN);
  const crema = useMemo(() => (espresso ? new THREE.MeshPhysicalMaterial({ map: cremaTexture(), roughness: 0.35, clearcoat: 0.4 }) : null), [espresso]);
  return (
    <group>
      <mesh geometry={g.outer} material={outside} castShadow receiveShadow />
      <mesh geometry={g.inner} material={white} castShadow receiveShadow />
      <mesh geometry={g.handle} material={outside} castShadow />
      {crema ? (
        <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]} material={crema}>
          <circleGeometry args={[0.146, 48]} />
        </mesh>
      ) : null}
    </group>
  );
}

/** A matching saucer, about 0.084 tall: coloured, a white rim edge, a raised centre well. */
function Saucer({ glazeName }: { glazeName: Glaze }) {
  const g = useMemo(saucerGeometry, []);
  return (
    <group>
      <mesh geometry={g.body} material={glaze(ESPRESSO[glazeName], true)} castShadow receiveShadow />
      <mesh geometry={g.rim} material={glaze(PORCELAIN, true)} position={[0, 0.077, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
    </group>
  );
}
/** Where a cup's foot sits in its saucer's well. */
const SAUCER_WELL = 0.034;

/**
 * On the machine's cup warmer, where the glass cups were: four saucers stacked
 * (wine red, salmon, butter, sage from the bottom), on their own (the cup on top
 * was removed, 13 Nov). MirrorProbe moves it onto the warmer once the model loads.
 */
function CupStack() {
  const order: Glaze[] = ["wine", "salmon", "butter", "sage"];
  // Saucers nest: each one's foot drops into the dish of the one below.
  const step = 0.032;
  return (
    <group>
      {order.map((n, i) => (
        <group key={n} position={[0, i * step, 0]} rotation={[0, i * 0.9, 0]}>
          <Saucer glazeName={n} />
        </group>
      ))}
    </group>
  );
}

/**
 * An S-hook in the y-z plane, sized for espresso cups: over the rail at the
 * top, a short shank, a small cradle at the bottom for a ring handle.
 */
function sHookGeometry() {
  const pts: THREE.Vector3[] = [];
  const top = 0.03;
  for (let k = 0; k <= 14; k++) {
    const a = Math.PI + 0.7 - (k / 14) * (Math.PI * 1.5 + 0.7);
    pts.push(new THREE.Vector3(0, top * Math.sin(a), top * Math.cos(a)));
  }
  pts.push(new THREE.Vector3(0, -0.065, 0));
  const low = HOOK_LOW;
  for (let k = 0; k <= 12; k++) {
    const a = -(k / 12) * (Math.PI + 0.7);
    pts.push(new THREE.Vector3(0, -0.085 + low * Math.sin(a), -low + low * Math.cos(a)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.006, 6, false);
}
const HOOK_LOW = 0.02;
/** Where the hook's cradle holds a handle, from the rail's centre. */
const HOOK_SEAT = new THREE.Vector3(0, -0.085 - HOOK_LOW, -HOOK_LOW);

/**
 * The bronze pipe rail under the lower shelf (refs/64): held off the wall on
 * round flanges at the ends and the middle, with six S-hooks and six
 * espresso cups (refs/espresso) hanging by their ear handles, wine red,
 * salmon, butter, sage, coffee and terracotta from the left: handle up, the
 * rim turned to the left and a little towards you, each a few degrees off true.
 */
function MugRail({ L = 2.6 }: { L?: number }) {
  const cups: Glaze[] = ["wine", "salmon", "butter", "sage", "coffee", "terracotta"];
  const rod = useMemo(() => mat("#6B5238", { metalness: 0.8, roughness: 0.35 }), []);
  const hook = useMemo(sHookGeometry, []);
  const Z = 0.22;
  // Six hooks, evenly along the rail, kept in from the brackets' arms (at
  // about ±1.05) so the end cups hang clear of them, the row nudged a touch left.
  const hookX = useMemo(() => Array.from({ length: 6 }, (_, i) => -0.86 + (i * 1.7) / 5), []);
  const hung = useMemo(
    () =>
      cups.map((c, i) => {
        // The inside top of the handle ring (wire resting on it), once turned handle-up.
        const grip = EAR_GRIP.clone();
        // Each cup sits a few degrees (2-5) off true on its hook.
        const tilt = (i % 2 ? 1 : -1) * (0.035 + ((i * 17) % 3) * 0.02);
        const e = new THREE.Euler(tilt, 0.22 + ((i * 37) % 5) * 0.06, Math.PI / 2 - 0.08 + ((i * 23) % 4) * 0.04, "YXZ");
        const pos = HOOK_SEAT.clone().sub(grip.applyEuler(e));
        return { c, e, pos };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, Z]} material={rod} castShadow>
        <cylinderGeometry args={[0.02, 0.02, L, 12]} />
      </mesh>
      {/* Round end knobs. */}
      {[-1, 1].map((s) => (
        <mesh key={`k${s}`} position={[s * (L / 2 + 0.01), 0, Z]} material={rod} castShadow>
          <sphereGeometry args={[0.032, 14, 10]} />
        </mesh>
      ))}
      {/* Stand-offs to round wall flanges: at both ends, and one between the middle two hooks. */}
      {[-(L / 2 - 0.08), (hookX[2] + hookX[3]) / 2, L / 2 - 0.08].map((x) => (
        <group key={`f${x}`} position={[x, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Z / 2]} material={rod} castShadow>
            <cylinderGeometry args={[0.018, 0.018, Z, 10]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]} material={rod} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.024, 20]} />
          </mesh>
          <mesh position={[0, 0, Z]} material={rod}>
            <sphereGeometry args={[0.03, 12, 8]} />
          </mesh>
        </group>
      ))}
      {hookX.map((x, i) => (
        <mesh key={`h${i}`} geometry={hook} material={rod} position={[x, 0, Z]} castShadow />
      ))}
      {hung.map(({ c, e, pos }, i) => (
        <group key={c} position={[hookX[i], 0, Z]}>
          <group position={pos} rotation={e}>
            <EspressoCup glazeName={c} />
          </group>
        </group>
      ))}
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
  const ply = useMemo(() => woodMat({ seed: 41, vertical: false, light: [190, 128, 74], dark: [140, 88, 48], figure: 10, cathedral: 1.2 }, 0.6), []);
  // The boards' front edges show the plywood's layers (refs/63): fine pale and
  // dark stripes along the edge, on the +z face only.
  const edged = useMemo(() => {
    const layers = (vertical: boolean) => {
      const t = paint(64, 64, (g, w, h) => {
        const n = 7;
        for (let i = 0; i < n; i++) {
          g.fillStyle = i % 2 ? "#B88452" : "#E2BF8E";
          if (vertical) g.fillRect((i * w) / n, 0, w / n + 1, h);
          else g.fillRect(0, (i * h) / n, w, h / n + 1);
        }
      });
      const m = mat("#FFFFFF", { map: t, roughness: 0.7 });
      return [ply, ply, ply, ply, m, ply];
    };
    return { h: layers(false), v: layers(true) };
  }, [ply]);
  const back = useMemo(() => woodMat({ seed: 42, vertical: false, light: [150, 100, 58], dark: [108, 68, 38], figure: 9, cathedral: 1 }, 0.75), []);
  const mugs: (MugSpec | "bowls")[] = useMemo(
    () => [
      // Top row, left to right.
      { color: "#D8D0BF", roughness: 0.75, r: 0.19, h: 0.4 },
      { color: "#4A4D50", facets: 9, handle: false, r: 0.18, h: 0.38, flare: 0.9, belly: 0.12, gloss: true, roughness: 0.3, metal: 0.45 },
      { color: "#E3DFD6", roughness: 0.7, r: 0.19, h: 0.4 },
      "bowls",
      // Middle row.
      { map: glazes.speckle("#57524B", "#2C2926", 5), handle: false, r: 0.15, h: 0.3, flare: 0.94, roughness: 0.85 },
      { glassAttenuation: "#9A2E10", handle: false, r: 0.15, h: 0.4, flare: 1.1 },
      { map: glazes.marble("#E7DFCF", "#9A4A35"), rim: "#86A3A0", handle: false, r: 0.19, h: 0.3, flare: 1.12, belly: 0.1, gloss: true, roughness: 0.4 },
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
        <mesh key={`h${i}`} position={[0, y, D / 2]} material={edged.h} castShadow receiveShadow>
          <boxGeometry args={[W, frame, D]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`f${s}`} position={[s * (W / 2 - frame / 2), H / 2, D / 2]} material={edged.v} castShadow receiveShadow>
          <boxGeometry args={[frame, H, D]} />
        </mesh>
      ))}
      {/* Two thin shelves. */}
      {Array.from({ length: rows - 1 }, (_, r) => (
        <mesh key={`s${r}`} position={[0, cellY(r) - shelf / 2, D / 2]} material={edged.h} castShadow receiveShadow>
          <boxGeometry args={[W - frame * 2, shelf, D - 0.01]} />
        </mesh>
      ))}
      {/* Short dividers, one set per row, stopping just under the shelf above. */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols - 1 }, (_, c) => (
          <mesh key={`d${r}${c}`} position={[cellX(c) + cellW / 2 + div / 2, cellY(r) + (cellH - 0.012) / 2, D / 2]} material={edged.v} castShadow receiveShadow>
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
    // Not pure white: a white sky blows polished sides out to flat white.
    grad.addColorStop(0, "#E2E4E6");
    grad.addColorStop(0.4, "#DCDFE1");
    grad.addColorStop(0.47, "#C9CCCF");
    grad.addColorStop(0.5, "#7E8286");
    grad.addColorStop(0.54, "#ADB1B5");
    grad.addColorStop(1, "#8E9296");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

/**
 * A little photo studio as a reflection map, for polished metal with no probe
 * of its own (the lamp's brass): a grey room with two tall bright softboxes,
 * so a round drum shows the vertical highlights polished brass has.
 */
function studioReflection() {
  const t = paint(256, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#C9CCCF");
    grad.addColorStop(0.5, "#5E6266");
    grad.addColorStop(1, "#3E4246");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (const [x, bw] of [[0.22, 0.09], [0.62, 0.05]]) {
      const lg = g.createLinearGradient((x - bw) * w, 0, (x + bw) * w, 0);
      lg.addColorStop(0, "rgba(255,255,255,0)");
      lg.addColorStop(0.5, "rgba(255,255,255,1)");
      lg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = lg;
      g.fillRect((x - bw) * w, h * 0.12, bw * 2 * w, h * 0.7);
    }
  });
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

/**
 * Mirror steel (Dvija, 13 Nov; refs/71): polished stainless shows its actual
 * surroundings. Once the machine has loaded, photograph the corner around it in
 * all six directions (a cube camera, with the machine itself hidden), blur that
 * to suit each roughness, and give it to the machine's steel as its reflection.
 * It happens once; nothing in the corner moves.
 *
 * Round 2 (refs/67-70): the walnut top is left out of the capture (it turned
 * the panel bronze from above), the sky is a soft grey, not white, and the
 * reflections are a little weaker, so the steel reads bright grey as in
 * refs/69. The same pass also finishes parts the .glb can't name apart by
 * material alone: clear cups, chrome button rings, a steel drip-tray grille,
 * a quieter cup-warmer, a light smoky water tank, and it trims off a few stray
 * faces of the body mesh that run back through the tank to the wall.
 */
function MirrorProbe({ name, stackName, trayCupName }: { name: string; stackName: string; trayCupName: string }) {
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
    // For the capture only, surround the corner with a soft studio dome: light
    // grey above, a darker horizon band, a mid-grey floor. The real wall and
    // mugs still show where they are.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), new THREE.MeshBasicMaterial({ map: studioGradient(), side: THREE.BackSide, toneMapped: false }));
    dome.position.copy(cubeCam.position);
    scene.add(dome);
    // Leave out the walnut and the things standing beside the machine (the
    // beans, books and lamp streaked its sides brown); keep the wall, shelves, mugs.
    const hidden = ["sideboard", "bean_jar", "checker_tray", "standing_books", "amber_lamp"]
      .map((n) => scene.getObjectByName(n))
      .filter((o): o is THREE.Object3D => Boolean(o));
    hidden.forEach((o) => (o.visible = false));
    target.visible = false;
    cubeCam.update(gl, scene);
    target.visible = true;
    hidden.forEach((o) => (o.visible = true));
    scene.remove(dome);
    dome.geometry.dispose();
    (dome.material as THREE.MeshBasicMaterial).map?.dispose();
    (dome.material as THREE.Material).dispose();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromCubemap(rt.texture).texture;
    pmrem.dispose();
    rt.dispose();
    const strength: Record<string, number> = { steel: 0.85, steel_brushed: 0.85, steel_dark: 0.8 };
    target.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m?.isMeshStandardMaterial || !/^steel/.test(m.name)) return;
      m.envMap = env;
      m.envMapIntensity = strength[m.name] ?? 1;
      if (m.name === "steel_brushed") m.roughness = Math.max(m.roughness, 0.25);
      m.needsUpdate = true;
    });
    // The body's real back is just in front of the tank: clip away anything behind it.
    const tank = target.getObjectByName("tank");
    const body = target.getObjectByName("body") as THREE.Mesh | undefined;
    if (tank && body) {
      const back = new THREE.Box3().setFromObject(tank).max.z - 0.03;
      gl.localClippingEnabled = true;
      const bm = body.material as THREE.MeshStandardMaterial;
      // A touch rougher, so its big side panels soften what they mirror instead of going white.
      bm.roughness = Math.max(bm.roughness, 0.14);
      bm.envMapIntensity = 0.75;
      bm.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), -back)];
      bm.clipShadows = true;
      bm.needsUpdate = true;
      // The overhang under the control panel was exported as uneven triangles
      // with flat normals; in mirror steel they showed as a jagged "W" glitch.
      // Re-smooth the body's normals, keeping edges sharper than 25° as they are.
      body.geometry = toCreasedNormals(body.geometry, THREE.MathUtils.degToRad(25));
    }
    const chrome = new THREE.MeshStandardMaterial({ name: "steel_chrome", color: "#E6E9EC", metalness: 1, roughness: 0.08, envMap: env, envMapIntensity: 1.2 });
    target.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial;
      const n = mesh.name;
      if (/^cup_top_[ab](_handle)?$/.test(n)) {
        // The glass cups on top give way to the saucer stack (placed below).
        mesh.visible = false;
      } else if (/^cup_shot(_handle|_coffee|_crema)?$/.test(n)) {
        // The glass shot cup and its espresso give way to a periwinkle espresso cup (placed below).
        mesh.visible = false;
      }
      // Button rings: chrome; the button faces: a lighter spun steel (refs/67).
      else if (/^(power|filter_size|program|one_cup|two_cup)_ring$/.test(n)) mesh.material = chrome;
      else if (/_cap$/.test(n) && m.name === "steel_brushed") m.color.set("#D8DBDE");
      // Drip-tray grille in steel; its slots stay dark (refs/68).
      // (Part diffuse: fully metallic it mirrors the dark horizon band and reads charcoal.)
      else if (n === "grille") {
        m.color.set("#C9CDD1");
        m.metalness = 0.55;
        m.roughness = 0.35;
        m.envMapIntensity = 0.8;
      }
      // The cup-warmer: the plate a lighter steel so its ribs don't stripe so hard.
      else if (n === "cup_warmer") m.color.set("#9EA2A6");
      // The curved chin under the control panel: its exported normals are faceted,
      // so in mirror steel it showed jagged triangles. Weld and re-smooth its
      // normals, and give it its own slightly satin steel so it reads as one curve.
      else if (n === "chin") {
        const smooth = mergeVertices(mesh.geometry.deleteAttribute("normal"), 1e-4);
        smooth.computeVertexNormals();
        mesh.geometry = smooth;
        const sm = m.clone();
        sm.roughness = Math.max(m.roughness, 0.3);
        sm.envMapIntensity = 0.6;
        mesh.material = sm;
      }
      else if (/^warmer_rib_/.test(n)) {
        m.color.set("#A8ACB0");
        m.envMapIntensity = 0.6;
      }
    });
    // The saucer stack stands on the cup warmer, centred where the two glass cups stood.
    const stack = scene.getObjectByName(stackName);
    const cupA = target.getObjectByName("cup_top_a");
    const cupB = target.getObjectByName("cup_top_b");
    if (stack?.parent && cupA && cupB) {
      const box = new THREE.Box3().setFromObject(cupA).union(new THREE.Box3().setFromObject(cupB));
      const at = box.getCenter(new THREE.Vector3());
      at.y = box.min.y;
      stack.position.copy(stack.parent.worldToLocal(at));
      stack.visible = true;
    }
    // The periwinkle cup stands on the drip tray where the shot glass stood.
    const trayCup = scene.getObjectByName(trayCupName);
    const shot = target.getObjectByName("cup_shot");
    if (trayCup?.parent && shot) {
      const box = new THREE.Box3().setFromObject(shot);
      const at = box.getCenter(new THREE.Vector3());
      at.y = box.min.y;
      trayCup.position.copy(trayCup.parent.worldToLocal(at));
      trayCup.visible = true;
    }
    done.current = true;
  });
  return null;
}

export default function CoffeeCorner() {
  // Layout follows Dvija's vision board (refs/65), measured off it:
  // x from the sideboard's centre, y up from its top.
  return (
    <group position={[STATION.centre, 0, WALL_Z]}>
      <Floor />
      <group name="sideboard">
        <Sideboard />
      </group>
      <MirrorProbe name="coffee_machine" stackName="cup_stack" trayCupName="tray_cup" />
      {/* On top, left to right: the machine, the bean jar on its riser, the checked tray, books, the lamp. */}
      <group position={[-1.63, 0, 0.95]}>
        {/* Dvija's own Breville Barista Express (blender/breville.py), at true size. */}
        <Model src="/models/breville.glb" height={2.05} fallback={<CoffeeMachine />} palette={BREVILLE_GLASS} tint={BREVILLE_STEEL} shine={BREVILLE_SHINE} />
        {/* Saucers and a cup on the warmer; hidden until the probe sets it on the loaded model. */}
        <group name="cup_stack" visible={false}>
          <CupStack />
        </group>
        {/* A periwinkle espresso, poured, on the drip tray (no saucer); placed by the probe too. */}
        <group name="tray_cup" visible={false} rotation={[0, -0.35, 0]}>
          <EspressoCup glazeName="periwinkle" espresso />
        </group>
      </group>
      <group name="bean_jar" position={[-0.14, 0, 1.05]}>
        {/* Stands on the long marble tray (CheckerTray). */}
        <group position={[0, 0.085, 0]}>
          <BeanJar />
        </group>
      </group>
      <group name="checker_tray" position={[0.95, 0, 1.1]}>
        <CheckerTray />
      </group>
      <group name="standing_books" position={[1.86, 0, 0]}>
        <CoverBooks />
      </group>
      <group name="amber_lamp" position={[2.55, 0, 0.95]} scale={1.2}>
        <AmberLamp />
      </group>

      {/* Upper left: a bare shelf, and the mug rail under it. */}
      <group name="shelf_low" position={[-1.35, 0, 0]}>
        <WallShelf y={3.16} seed={51} width={2.8} />
        <group name="mug_rail" position={[0, 2.86, 0]}>
          <MugRail L={2.5} />
        </group>
      </group>

      {/* Upper right: a bare top shelf, and the mug cabinet under it. */}
      <group name="shelf_top" position={[1.38, 0, 0]}>
        <WallShelf y={4.41} seed={52} width={2.8} />
      </group>
      <group name="mug_cabinet" position={[1.6, 1.57, 0]}>
        <MugCabinet />
      </group>
    </group>
  );
}

/**
 * The machine's see-through parts, clearer than its Blender export: the smoky
 * hopper and the water tank at the back with its water. (Its glass cups, two
 * on top and the shot cup on the tray, are hidden; porcelain espresso cups
 * stand in their places.)
 */
const BREVILLE_GLASS = {
  glass: { color: "#FFFFFF", roughness: 0.03, glass: true },
  glass_smoke: { color: "#3B3532", roughness: 0.08, opacity: 0.55 },
  // The water tank behind the body (it carries the MAX mark): light smoky plastic.
  tank: { color: "#C3CCD0", roughness: 0.15, opacity: 0.45 },
  water: { color: "#B7D3E0", roughness: 0.05, opacity: 0.3 },
};
/**
 * Glossy polished stainless (Dvija, 13 Nov), tuned against Breville's own shot
 * (refs/69) and Dvija's machine (refs/40): a mid steel tint and strong
 * reflections, enough that it shines but still reads as grey steel, not white.
 * (Once the MirrorProbe has run, it sets the final reflection strengths.)
 */
const BREVILLE_STEEL = { steel: "#B2B6BA", steel_brushed: "#A6AAAE", steel_dark: "#6E7276" };
const BREVILLE_SHINE = { steel: 4.5, steel_brushed: 3.6, steel_dark: 3.2 };
