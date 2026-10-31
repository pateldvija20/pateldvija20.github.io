// hairline-room kit. Fixed. Object modules import this and nothing else.

import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

export { THREE };

// ---------------------------------------------------------------- tokens

export const UNIT = 1;      // 1 three.js unit = 1 cm
export const GRID = 2;      // snap, in cm
export const STROKE = 1.1;  // css px, constant at every zoom

const BASE = {
  light: { ink: 0x111113, plate: 0xffffff },
  dark:  { ink: 0xf4f4f6, plate: 0x0b0b0d },
};

export const WEIGHT = { sil: 1.0, crease: 0.7, detail: 0.45, guide: 0.2 };

export const ACCENT = {
  hover:   0x00bcd4,  // cyan   — clickable
  open:    0xa8d82a,  // lime   — you are inside this
  visited: 0xb5a6f0,  // lavender — you have been here
};

export const CONTENT = {
  blue:      0x5b8def,
  yellow:    0xf5c84c,
  bubblegum: 0xf58fc2,
};

let mode = "light";
const lineMats = new Set();
const plateMats = new Set();

// ---------------------------------------------------------------- internals

function ink() { return BASE[mode].ink; }
function plateColor() { return BASE[mode].plate; }

function lineMaterial(weight) {
  const m = new LineMaterial({
    color: ink(),
    linewidth: STROKE,
    worldUnits: false,
    transparent: true,
    opacity: WEIGHT[weight] ?? WEIGHT.crease,
    depthTest: true,
  });
  m.resolution.set(window.innerWidth, window.innerHeight);
  m.userData.weight = weight;
  m.userData.accent = null;
  lineMats.add(m);
  return m;
}

function plateMaterial() {
  const m = new THREE.MeshBasicMaterial({
    color: plateColor(),
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    side: THREE.DoubleSide,
  });
  m.userData.accent = null;
  plateMats.add(m);
  return m;
}

function segmentsFrom(positions, weight) {
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  const l = new LineSegments2(g, lineMaterial(weight));
  l.computeLineDistances();
  l.renderOrder = 2;
  return l;
}

// ---------------------------------------------------------------- solids

// A plate mesh plus its crease edges. Rule 02: never add a mesh without this.
export function solid(geometry, { crease = 25, weight = "crease" } = {}) {
  const group = new THREE.Group();

  const mesh = new THREE.Mesh(geometry, plateMaterial());
  mesh.renderOrder = 1;
  mesh.userData.pickable = true;
  group.add(mesh);

  const edges = new THREE.EdgesGeometry(geometry, crease);
  const pos = Array.from(edges.attributes.position.array);
  edges.dispose();
  if (pos.length) group.add(segmentsFrom(pos, weight));

  group.userData.plate = mesh;
  return group;
}

// Authored profile or detail line. Rule 06.
export function path(points, weight = "sil", { closed = false } = {}) {
  const pts = closed ? [...points, points[0]] : points;
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    pos.push(pts[i].x, pts[i].y, pts[i].z);
    pos.push(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
  }
  return segmentsFrom(pos, weight);
}

// Closed ring in the XZ plane, for rims.
export function ring(radius, segments = 64, weight = "sil", y = 0) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  return path(pts, weight, { closed: true });
}

// ---------------------------------------------------------------- surfaces

function gradientTexture({ from, to, angle = 0 }) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const r = (angle * Math.PI) / 180;
  const x = Math.cos(r) * 128, y = Math.sin(r) * 128;
  const g = ctx.createLinearGradient(128 - x, 128 - y, 128 + x, 128 + y);
  g.addColorStop(0, "#" + new THREE.Color(from).getHexString());
  g.addColorStop(1, to === "transparent"
    ? "#" + new THREE.Color(from).getHexString() + "00"
    : "#" + new THREE.Color(to).getHexString());
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Flat content surface. The only place content hues and gradients live.
export function layer(width, height, { fill, opacity = 1 } = {}) {
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  if (fill && typeof fill === "object") mat.map = gradientTexture(fill);
  else mat.color = new THREE.Color(fill ?? plateColor());

  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  m.renderOrder = 3;
  return m;
}

// Pool of light on the desk plane.
export function glow(radius, hue = ACCENT.open, { opacity = 0.5 } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const hex = "#" + new THREE.Color(hue).getHexString();
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, hex);
  g.addColorStop(1, hex + "00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;

  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: t, transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.05;
  m.renderOrder = 0;
  return m;
}

// ---------------------------------------------------------------- state

const ORDER = { rest: 0, visited: 1, hover: 2, open: 3 };

// Rule 01 and 04. One accent at a time, precedence open > hover > visited.
export function states(group, { tintPlateOnOpen = false } = {}) {
  let current = "rest";

  function apply(name) {
    const accent = name === "rest" ? null : ACCENT[name] ?? null;
    group.traverse((o) => {
      const m = o.material;
      if (!m) return;
      if (lineMats.has(m)) {
        m.userData.accent = accent;
        m.color.set(accent ?? ink());
      } else if (plateMats.has(m)) {
        const tint = tintPlateOnOpen && name === "open" ? accent : null;
        m.userData.accent = tint;
        m.color.set(tint ?? plateColor());
      }
    });
    current = name;
  }

  apply("rest");

  return {
    set(name) { if (ORDER[name] >= 0) apply(name); },
    get() { return current; },
  };
}

// ---------------------------------------------------------------- theme

export function setTheme(next) {
  mode = next === "dark" ? "dark" : "light";
  for (const m of lineMats) m.color.set(m.userData.accent ?? ink());
  for (const m of plateMats) m.color.set(m.userData.accent ?? plateColor());
}

export function getTheme() { return mode; }

// Call on every resize or the stroke width drifts off 1.1px.
export function resize(width, height) {
  for (const m of lineMats) m.resolution.set(width, height);
}

// ---------------------------------------------------------------- grid

export function snap(v) { return Math.round(v / GRID) * GRID; }

export function place(group, [x, z], y = 0) {
  group.position.set(snap(x), y, snap(z));
  return group;
}

// ---------------------------------------------------------------- camera

// Rule 07. One perspective camera. Narrow fov at long distance reads as
// orthographic and, unlike a real ortho camera, can be tweened.
export function distanceFor(height, fovDeg) {
  return height / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
}

const TOP = [0, 0, -1];
const UP = [0, 1, 0];

// One room, three panels. y = 0 is the floor, the wall is at z = -150,
// the desk top is at y = 75.
export const VIEWS = {
  bridge:   { fov: 55, frame: 4000, dir: [0, 0.10, 1],  target: [0, 150, -2600], up: UP },
  window:   { fov: 42, frame: 320,  dir: [0, 0.06, 1],  target: [48, 140, -150], up: UP },
  wall:     { fov: 6,  frame: 180,  dir: [0, 0.02, 1],  target: [0, 144, -150],  up: UP },
  desk:     { fov: 6,  frame: 130,  dir: [0, 1, 0.001], target: [0, 75, -118],   up: TOP },
  // straight down. decided, see pages.md: no hinge, pages transition by
  // parallax. tilting this would mean redrawing every desk silhouette.
  hero:     { fov: 6,  frame: 30,   dir: [0, 1, 0.001], target: [-30, 76, -116], up: TOP },
  open:     { fov: 6,  frame: 40,   dir: [0, 1, 0.001], target: [-30, 76, -116], up: TOP },
  computer: { fov: 6,  frame: 40,   dir: [0, 0.10, 1],  target: [6, 100, -140],  up: UP },
  floor:    { fov: 6,  frame: 200,  dir: [0, 1, 0.001], target: [0, 0, 20],      up: TOP },
};

// Scroll order, top of the document to the bottom.
export const PANELS = ["wall", "desk", "floor"];

export function rig(aspect) {
  const cam = new THREE.PerspectiveCamera(6, aspect, 1, 12000);
  cam.userData.view = null;
  set(cam, "desk");
  return cam;
}

function poseOf(cam, name) {
  const v = VIEWS[name];
  const aspect = cam.aspect || 1;
  // frame is the horizontal extent; convert to the vertical the fov controls
  const height = v.frame / Math.max(aspect, 0.0001);
  const d = distanceFor(height, v.fov);
  const dir = new THREE.Vector3(...v.dir).normalize();
  const target = new THREE.Vector3(...v.target);
  return {
    position: target.clone().addScaledVector(dir, d),
    target,
    up: new THREE.Vector3(...v.up),
    fov: v.fov,
  };
}

export function set(cam, name) {
  const p = poseOf(cam, name);
  cam.position.copy(p.position);
  cam.up.copy(p.up);
  cam.fov = p.fov;
  cam.updateProjectionMatrix();
  cam.lookAt(p.target);
  cam.userData.view = name;
  cam.userData.target = p.target;
  return cam;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Arcs between a top view and a front view instead of lerping, or the
// camera travels through the desk.
export function goto(cam, name, ms = 1200) {
  const from = {
    position: cam.position.clone(),
    target: (cam.userData.target ?? new THREE.Vector3()).clone(),
    up: cam.up.clone(),
    fov: cam.fov,
  };
  const to = poseOf(cam, name);
  const arc = Math.abs(from.up.y - to.up.y) > 0.5;
  const pivot = to.target.clone();
  const r0 = from.position.clone().sub(pivot).length();
  const r1 = to.position.clone().sub(pivot).length();
  const q0 = from.position.clone().sub(pivot).normalize();
  const q1 = to.position.clone().sub(pivot).normalize();
  const start = performance.now();

  return new Promise((done) => {
    function step(now) {
      const t = Math.min(1, (now - start) / ms);
      const e = ease(t);

      if (arc) {
        const dot = THREE.MathUtils.clamp(q0.dot(q1), -1, 1);
        const omega = Math.acos(dot);
        const dir = omega < 1e-4
          ? q1.clone()
          : q0.clone().multiplyScalar(Math.sin((1 - e) * omega) / Math.sin(omega))
              .addScaledVector(q1, Math.sin(e * omega) / Math.sin(omega));
        cam.position.copy(pivot).addScaledVector(dir, THREE.MathUtils.lerp(r0, r1, e));
      } else {
        cam.position.lerpVectors(from.position, to.position, e);
      }

      cam.up.lerpVectors(from.up, to.up, e).normalize();
      cam.fov = THREE.MathUtils.lerp(from.fov, to.fov, e);
      cam.updateProjectionMatrix();
      const tgt = from.target.clone().lerp(to.target, e);
      cam.lookAt(tgt);
      cam.userData.target = tgt;

      if (t < 1) requestAnimationFrame(step);
      else { cam.userData.view = name; done(); }
    }
    requestAnimationFrame(step);
  });
}

// ---------------------------------------------------------------- picking

export function pickables(root) {
  const out = [];
  root.traverse((o) => { if (o.userData.pickable) out.push(o); });
  return out;
}
