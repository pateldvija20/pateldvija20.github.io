import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { anim, BOOKS, toScreen, type Clickable } from "./anim";
import { MACHINE } from "./design";
import InkPass, { Inked } from "./InkPass";
import { BOOK_SIZE, CAM_D, CONTENT, CUP, MACHINE_Z, PLANT_Z, SHELF, view, type BookId } from "./layout";
import { Jelly } from "./physics";
import { FrameGuard, preloadObjects, SceneObject, toVec, useObjectModule } from "./registry";
import Rig from "./Rig";
import Studio from "./Studio";
import { BG, INK } from "./theme";
import { DRAWN, REVEAL_RECT, tracked } from "./toy";
import ToyBook from "./ToyBook";
import ToyCup from "./ToyCup";
import { Spill } from "./spill";

/**
 * The storyboard shelf: one front-on shelf, drawn as clean line art. The
 * decor (plant, machine, hanging plant, the shelf itself) are 3D models drawn
 * by the ink pass; the books and the cup are full-colour 3D once scene 3 turns
 * them, line drawings before. Every object comes from its own file in
 * ./objects through the registry, with a stand-in while it's missing.
 *
 * Every moving part reads anim.ts each frame; the director (director.ts)
 * plays the storyboard by animating those numbers. Each object sits in a
 * <Jelly>, so any move bends it at the top and it wobbles upright after.
 */

type Props = {
  /** Called once the objects have loaded and the first frames are drawn: the director can start. */
  onReady: () => void;
  onPickBook: (id: BookId) => void;
  onPickCup: () => void;
  onTurn: (book: BookId, dir: -1 | 1) => void;
  /** A click that hit nothing (the page behind the shelf). */
  onMiss?: () => void;
};

/**
 * How each kind of thing bends and wobbles (physics.tsx Jelly): `amount` is
 * how far the top trails per unit of speed, `maxLean` the most it can (as a
 * share of its height), `stiffness` and `damping` the wobble after. Tuned
 * playful: a strong bend on the way in, a swing past upright on landing, two
 * or three wobbles, then still. Heavier things bend less and settle sooner.
 */
const JELLY = {
  plant: { amount: 0.1, maxLean: 0.27, stiffness: 170, damping: 3.1 },
  book: { amount: 0.1, maxLean: 0.3, stiffness: 225, damping: 2.8 },
  machine: { amount: 0.05, maxLean: 0.12, stiffness: 200, damping: 4.4 },
  cup: { amount: 0.08, maxLean: 0.25, stiffness: 130, damping: 4.4 },
  hanger: { amount: 0.05, maxLean: 0.16, stiffness: 55, damping: 4 },
};

/** The hanging plant on the screen's top-right (frame 2): its middle this far in from the right edge, its top just past the top edge (scene units). */
const HANG = { fromRight: 0.33, aboveTop: -0.305 };
/** Its depth: behind the machine's back (z = -0.85), scaled up so it still draws at the size of the sketch. */
const HANG_Z = -1.0;

/**
 * Which book the pointer is over, from the screen alone (every pointer move, like the menu bar's hover), and where on
 * it. The books read it each frame, so the tilt follows the pointer as smoothly as the bar's, with no 3D picking in the way.
 * The front-most shut book whose rectangle holds the pointer wins.
 */
function BookHover() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      let best: BookId | null = null;
      let bestZ = -Infinity;
      let nx = 0;
      let ny = 0;
      if (e.pointerType !== "touch" && e.target === el) {
        for (const id of BOOKS) {
          const p = anim.books[id];
          if (p.cover > 0.05 || anim.follow.mix > 0.01) continue;
          const { w, h } = BOOK_SIZE[id];
          const a = toScreen(p.x - (w / 2) * p.s, p.y + h * p.s, p.z);
          const b = toScreen(p.x + (w / 2) * p.s, p.y, p.z);
          if (e.clientX < a.x || e.clientX > b.x || e.clientY < a.y || e.clientY > b.y) continue;
          if (p.z > bestZ) {
            best = id;
            bestZ = p.z;
            // Full tilt is reached a third of the way out from the middle (not at the edge), so a small move of the pointer tips it.
            nx = THREE.MathUtils.clamp(((e.clientX - (a.x + b.x) / 2) / (b.x - a.x)) * 6, -1, 1);
            ny = THREE.MathUtils.clamp(((e.clientY - (a.y + b.y) / 2) / (b.y - a.y)) * 6, -1, 1);
          }
        }
      }
      anim.hover.id = best;
      anim.hover.nx = nx;
      anim.hover.ny = ny;
      document.body.style.cursor = best ? "pointer" : "";
    };
    const leave = () => {
      anim.hover.id = null;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [gl]);
  return null;
}

/** The page colour, behind everything; it follows light and dark. */
function Clear() {
  const gl = useThree((s) => s.gl);
  useFrame(() => gl.setClearColor(BG, 1));
  return null;
}

/** Hands each thing's own "drawn" amount to its toy materials, and the selection frame to the shaders. */
function DrawnSync() {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  useFrame(() => {
    const d = anim.drawnBy;
    anim.drawn = Math.max(d.playground, d.work, d.about, d.cup);
    DRAWN.value = anim.drawn;
    const r = anim.reveal;
    REVEAL_RECT.value.set(Math.min(r.x0, r.x1) * dpr, (size.height - Math.max(r.y0, r.y1)) * dpr, Math.max(r.x0, r.x1) * dpr, (size.height - Math.min(r.y0, r.y1)) * dpr);
    for (const t of tracked) {
      const ch = t.channel as Clickable | undefined;
      t.drawn.value = ch ? d[ch] : anim.drawn;
      t.rectOn.value = ch && r.on === ch && r.show > 0.01 ? 1 : 0;
    }
  });
  return null;
}

/** Tells the toy materials under a group which clickable thing they belong to (checked a few times a second, as objects rebuild). */
function useChannel(ref: React.RefObject<THREE.Object3D | null>, ch: Clickable) {
  const n = useRef(0);
  useFrame(() => {
    if (n.current++ % 15 !== 0) return;
    ref.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      for (const x of Array.isArray(m) ? m : [m]) if (x.userData.tracked) x.userData.tracked.channel = ch;
    });
  });
}

/** True while this thing is still a line drawing, for its `drawn` prop. */
function useDrawn(ch: Clickable) {
  const [drawn, setDrawn] = useState(anim.drawnBy[ch] > 0.5);
  const last = useRef(drawn);
  useFrame(() => {
    const now = anim.drawnBy[ch] > 0.5;
    if (now !== last.current) {
      last.current = now;
      setDrawn(now);
    }
  });
  return drawn;
}

/** True while a book is standing spine-out (turned more than halfway to the screen), for its `spine` prop. */
function useSpine(id: BookId) {
  const [spine, setSpine] = useState(Math.abs(anim.books[id].ry - Math.PI / 2) < 0.5);
  const last = useRef(spine);
  useFrame(() => {
    const now = Math.abs(anim.books[id].ry - Math.PI / 2) < 0.6;
    if (now !== last.current) {
      last.current = now;
      setSpine(now);
    }
  });
  return spine;
}

/** Tells the page the objects have loaded and the scene is drawing (or gives up waiting on a slow file after a few seconds). */
function Ready({ onReady }: { onReady: () => void }) {
  const loaded = useRef(false);
  const frames = useRef(0);
  const told = useRef(false);
  useEffect(() => {
    let live = true;
    Promise.race([preloadObjects(), new Promise((r) => setTimeout(r, 6000))]).then(() => {
      if (live) loaded.current = true;
    });
    return () => {
      live = false;
    };
  }, []);
  useFrame(() => {
    if (!loaded.current || told.current) return;
    // A few frames after they've loaded, so anything they load themselves has had a moment.
    if (++frames.current < 6) return;
    told.current = true;
    onReady();
  });
  return null;
}

/**
 * The shelf (scene 1): a page-coloured block below y = 0 whose top edge the
 * ink pass draws as one 1px line right across the screen. Objects standing on
 * it share that line rather than drawing their own along their feet.
 */
function Shelf() {
  return (
    <Inked>
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[80, 4, SHELF.depth]} />
      </mesh>
    </Inked>
  );
}

/** A group placed from anim every frame: its x (with its slide-in offset), at a fixed depth. */
function Placed({ x, z, children }: { x: () => number; z: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => g.current?.position.set(x(), 0, z));
  return <group ref={g}>{children}</group>;
}

/**
 * The old toys (ToyBook, ToyCup) standing in for a book or cup whose own file
 * isn't there yet: they mark their meshes for the ink pass themselves, so
 * here they're re-marked to follow the drawn state (lines in frame 2, none
 * once 3D), and the Playground's end-on coil ring is drawn as a fine ink line.
 */
function useStandInInk(ref: React.RefObject<THREE.Group | null>) {
  const thin = useMemo(() => new THREE.TorusGeometry(0.03, 0.0012, 6, 96), []);
  useFrame(() => {
    const drawn = anim.drawn > 0.5;
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.geometry instanceof THREE.TorusGeometry) {
        // ToyBook's coil ring: the same circle, a hairline thick, in the ink colour.
        if (m.geometry !== thin) {
          const r = (m.geometry as THREE.TorusGeometry).parameters.radius;
          thin.dispose();
          Object.assign(thin, new THREE.TorusGeometry(r, 0.0012, 6, 96));
          m.geometry = thin;
        }
        (m.material as THREE.MeshBasicMaterial).color.copy(INK);
        return;
      }
      if (m.userData.ink === "skip") return;
      m.userData.ink = drawn ? "decor" : "color";
    });
  });
}

/**
 * A book. Its own closed model (objects/<id>.tsx) stands on the shelf,
 * placed from anim.books[id] and bent by its jelly; ToyBook, the rig that
 * opens and turns pages, takes over while it opens, and stands in for the
 * whole book until the book's file exists.
 */
function Book({ id, onPick, onTurn }: { id: BookId; onPick: (id: BookId) => void; onTurn: (dir: -1 | 1) => void }) {
  const mod = useObjectModule(id);
  const drawn = useDrawn(id);
  const spine = useSpine(id);
  const own = useRef<THREE.Group>(null);
  const turned = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const toy = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const lift = useRef(0);
  // The menu's hover, on the book: it tips a few degrees with the corner under the pointer pushed back (no overlay on the cover).
  const tilt = useRef({ rx: 0, ry: 0, trx: 0, tr: 0 });
  const closedNow = useRef(false);
  if (import.meta.env.DEV) Object.assign((((window as unknown as { __tilt?: Record<string, unknown> }).__tilt ??= {}) as Record<string, unknown>), { [id]: tilt.current });
  const pivot = useRef<THREE.Group>(null);
  const leaveTimer = useRef(0);
  useStandInInk(toy);
  useChannel(own, id);
  useChannel(rig, id);
  useFrame((_, dt) => {
    const p = anim.books[id];
    const enter = anim.enter[id];
    const following = anim.follow.book === id && anim.follow.mix > 0.001;
    const closed = !!mod && p.cover < 0.001 && !following;
    // In the case study only its own book is on the page: the others go (they would peek in beside the spread).
    const away = anim.follow.mix > 0.02 && anim.follow.book !== id;
    closedNow.current = closed;
    hover.current = anim.hover.id === id;
    const target = hover.current && closed ? 0.04 : 0;
    lift.current += (target - lift.current) * (1 - Math.exp(-dt * 12));
    if (own.current) {
      own.current.visible = closed && !away;
      // Hovering swells the book a touch from its foot, so it never leaves the shelf.
      own.current.position.set(p.x + enter, p.y, p.z);
    }
    if (turned.current) {
      const ti = tilt.current;
      // The corner under the pointer goes back: up to 15 degrees at the book's far edges.
      const on = anim.hover.id === id && closed;
      ti.trx = on ? anim.hover.ny * THREE.MathUtils.degToRad(15) : 0;
      ti.tr = on ? anim.hover.nx * THREE.MathUtils.degToRad(15) : 0;
      const k = 1 - Math.exp(-dt * 20);
      ti.rx += (ti.trx - ti.rx) * k;
      ti.ry += (ti.tr - ti.ry) * k;
      turned.current.rotation.set(p.rx, p.ry, 0, "YXZ");
      turned.current.scale.setScalar(p.s * (1 + lift.current * 0.4));
      // The tilt turns the book about its own middle (not its foot), so the corner under the pointer goes back
      // without the whole book swinging out from under the pointer.
      pivot.current?.rotation.set(ti.rx, ti.ry, 0, "YXZ");
    }
    if (rig.current) {
      rig.current.visible = !closed && !away;
      rig.current.position.x = enter;
    }
  });
  const events = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      // The shut model stays in the scene (hidden) while the book is open, and raycasts ignore visibility: let the
      // click through to the open book's pages then, or it would swallow every page turn.
      if (anim.books[id].cover >= 0.05 || !closedNow.current) return;
      e.stopPropagation();
      onPick(id);
    },
  };
  return (
    <>
      {mod && (
        <group ref={own} {...events}>
          <Jelly {...JELLY.book}>
            <group ref={turned}>
              <group ref={pivot} position={[0, BOOK_SIZE[id].h / 2, 0]}>
                <group position={[0, -BOOK_SIZE[id].h / 2, 0]}>
                  <SceneObject name={id} drawn={drawn} spine={spine} />
                </group>
              </group>
            </group>
          </Jelly>
        </group>
      )}
      <group ref={rig}>
        <Jelly {...JELLY.book}>
          <group ref={toy}>
            <ToyBook id={id} onPick={onPick} onTurn={onTurn} />
          </group>
        </Jelly>
      </group>
    </>
  );
}

/** The cup, standing on the machine's drip tray; it has its own little wobble on top of the machine's. */
function Cup({ at, onPick }: { at: [number, number, number]; onPick: () => void }) {
  const drawn = useDrawn("cup");
  const group = useRef<THREE.Group>(null);
  useChannel(group, "cup");
  const toy = useRef<THREE.Group>(null);
  useStandInInk(toy);
  const sp = useMemo(() => new Spill(), []);
  useEffect(() => () => sp.dispose(), [sp]);
  // After the form is sent the cup comes to the middle of the screen and grows (anim.cupFocus 0 to 1); if sending fails it is
  // knocked over on the tray and the coffee spills (anim.tip 0 to 1).
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const f = anim.cupFocus;
    const sc = 1 + 1.3 * f;
    const machineX = anim.machineX + anim.enter.machine;
    const cx = (view.left + view.right) / 2;
    const cy = (view.top + view.bottom) / 2;
    const tp = anim.tip;
    // Knocked over: it tips about the bottom-left edge of its base and falls onto its side, mouth to the left.
    const ang = tp * 1.25;
    const pvx = -0.1 + 0.1 * Math.cos(ang);
    const pvy = 0.1 * Math.sin(ang);
    g.position.set(
      // Knocked over, it also skids a little to the right, so its mouth hangs over the tray and not past its end.
      at[0] + (cx - machineX - at[0]) * f + pvx + 0.09 * tp,
      at[1] + (cy - 0.21 * sc - at[1]) * f + pvy,
      // Knocked over, it slides forward out of the machine's columns (their lines would cut across it).
      at[2] + (1.2 - MACHINE_Z - at[2]) * f + 0.3 * Math.min(1, tp * 2),
    );
    g.rotation.z = ang;
    g.scale.setScalar(sc);
    anim.cupXf.dx = g.position.x - at[0];
    anim.cupXf.dy = g.position.y - at[1];
    anim.cupXf.dz = g.position.z - at[2];
    anim.cupXf.sc = sc;
    anim.cupXf.rz = ang;
    // The spill (spill.ts): it sits still at the cup's final place; the cup's lower lip feeds it as it swings over.
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const mx = g.position.x - 0.344 * sa - 0.02;
    const my = g.position.y + 0.344 * ca - 0.005;
    const sx = at[0] - 0.415;
    sp.root.position.set(sx, at[1], at[2] + 0.02);
    sp.update(Math.min(delta, 1 / 20), tp, mx - 0.138 * ca - sx, my - 0.138 * sa - at[1], -(at[1] - 0.005) + 0.006);
  });
  return (
    <>
    <primitive object={sp.root} />
    <group
      ref={group}
      position={at}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Jelly {...JELLY.cup}>
        <SceneObject
          name="cup"
          drawn={drawn}
          standIn={
            <group ref={toy}>
              <ToyCup />
            </group>
          }
        />
      </Jelly>
    </group>
    </>
  );
}

/**
 * A point just under the machine's hot-water outlet, projected to the screen
 * as the CSS variables --pin-x and --pin-y: the contact links hang from it
 * (frame 31).
 */
function SpoutPin({ at }: { at: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const last = useRef({ x: -1, y: -1 });
  useFrame(() => {
    if (!ref.current) return;
    ref.current.getWorldPosition(v).project(camera);
    const x = ((v.x + 1) / 2) * size.width;
    const y = ((1 - v.y) / 2) * size.height;
    if (Math.abs(x - last.current.x) < 0.5 && Math.abs(y - last.current.y) < 0.5) return;
    last.current = { x, y };
    const root = document.documentElement.style;
    root.setProperty("--pin-x", `${x.toFixed(1)}px`);
    root.setProperty("--pin-y", `${y.toFixed(1)}px`);
  });
  return <group ref={ref} position={at} />;
}

/** The coffee machine, with the cup on its drip tray (where the machine's file says: CUP_SPOT) and the outlet's pin (OUTLET). */
function Machine({ onPickCup }: { onPickCup: () => void }) {
  const mod = useObjectModule("machine");
  const cup: [number, number, number] = mod?.CUP_SPOT ? toVec(mod.CUP_SPOT) : [CUP.x, CUP.y, CUP.z];
  return (
    <Placed x={() => anim.machineX + anim.enter.machine} z={MACHINE_Z}>
      <Jelly {...JELLY.machine}>
        {/* Mirrored left to right (16 Nov): the hopper and group head on the right, the steam wand on the left. */}
        <group scale-x={-1}>
          <SceneObject name="machine" />
        </group>
        <Cup at={[-cup[0], cup[1], cup[2]]} onPick={onPickCup} />
        {/* The links' place (the sketch's red box, under the group head, to its right), in the machine's own screen directions. */}
        <SpoutPin at={[0.205, 0.42, 0.3]} />
      </Jelly>
    </Placed>
  );
}

/**
 * The hanging plant, pinned to the screen's top-right in every view (as the
 * storyboard draws it). It swings like a pendulum from its pin: the jelly is
 * mirrored top to bottom, so it's the bottom that trails as it slides in.
 * The pin is the file's PIN, or else the middle of its top.
 */
function Hanger() {
  const mod = useObjectModule("hanger");
  const pin = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const k = useMemo(() => ({ box: new THREE.Box3(), part: new THREE.Box3(), inv: new THREE.Matrix4(), m: new THREE.Matrix4(), frames: 0, key: null as unknown }), []);
  const measured = useRef({ x: 0, top: 0.5, z: 0, halfW: 0.25 });
  useFrame(() => {
    const g = pin.current;
    const b = body.current;
    if (!g || !b) return;
    // Measure it in its own space for a couple of seconds after it (or a new version of it) arrives.
    if (k.key !== mod) {
      k.key = mod;
      k.frames = 0;
    }
    if (k.frames++ < 120) {
      b.updateWorldMatrix(true, true);
      k.inv.copy(b.matrixWorld).invert();
      k.box.makeEmpty();
      b.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        k.part.copy(m.geometry.boundingBox!).applyMatrix4(k.m.multiplyMatrices(k.inv, m.matrixWorld));
        k.box.union(k.part);
      });
      if (!k.box.isEmpty()) {
        const p = mod?.PIN ? toVec(mod.PIN) : null;
        measured.current = {
          x: p ? p[0] : (k.box.min.x + k.box.max.x) / 2,
          top: p ? p[1] : k.box.max.y,
          z: p ? p[2] : 0,
          halfW: (k.box.max.x - k.box.min.x) / 2,
        };
        b.position.set(-measured.current.x, -measured.current.top, -measured.current.z);
      }
    }
    // Pinned to the scene's right edge (CONTENT), not the screen's, so it stays beside the machine on wide screens; behind the machine, so the machine's drawing covers it.
    const far = (CAM_D - HANG_Z) / CAM_D;
    g.position.set((CONTENT.halfW - HANG.fromRight + anim.enter.hanger) * far, (view.baseTop + HANG.aboveTop + anim.hangerLift) * far, HANG_Z);
    g.scale.setScalar(far);
  });
  return (
    <group ref={pin}>
      <group scale-y={-1}>
        <Jelly {...JELLY.hanger}>
          <group scale-y={-1}>
            <group ref={body}>
              <SceneObject name="hanger" />
            </group>
          </group>
        </Jelly>
      </group>
    </group>
  );
}

/**
 * The sheet that comes up behind an open book (frame 7: the spread alone on
 * the page). Page-coloured, so it reads as the background closing over the
 * shelf. It also catches clicks, so nothing behind it can be picked.
 */
function Backdrop({ onMiss }: { onMiss?: () => void }) {
  const m = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: BG, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), []);
  useFrame(() => {
    if (!m.current) return;
    const on = anim.backdrop > 0.001;
    m.current.visible = on;
    // Raycasting ignores visibility: only block clicks while the sheet is up.
    m.current.raycast = on ? THREE.Mesh.prototype.raycast : () => {};
    mat.color.copy(BG);
    mat.opacity = anim.backdrop;
    m.current.position.x = (view.left + view.right) / 2;
  });
  return (
    <mesh ref={m} material={mat} position={[0, 0.7, 0.95]} renderOrder={5} visible={false} onClick={(e) => {
        e.stopPropagation();
        onMiss?.();
      }}>
      <planeGeometry args={[30, 12]} />
    </mesh>
  );
}

export default function StoryScene({ onReady, onPickBook, onPickCup, onTurn, onMiss }: Props) {
  return (
    <Canvas
      className="shelf-canvas"
      onPointerMissed={() => onMiss?.()}
      dpr={[1, 2]}
      shadows={{ type: THREE.VSMShadowMap }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 }}
      onCreated={(s) => {
        s.gl.setClearColor(BG, 1);
        if (import.meta.env.DEV) Object.assign(window as unknown as Record<string, unknown>, { __shelf: s, __anim: anim });
      }}
    >
      <FrameGuard />
      <Clear />
      <BookHover />
      <Rig follow={() => anim.camX} />
      <DrawnSync />
      <Ready onReady={onReady} />
      <Studio />
      <Shelf />
      <Placed x={() => anim.plantX + anim.enter.plant} z={PLANT_Z}>
        <Jelly {...JELLY.plant}>
          <SceneObject name="plant" />
        </Jelly>
      </Placed>
      <Machine onPickCup={onPickCup} />
      <Hanger />
      {BOOKS.map((id) => (
        <Book key={id} id={id} onPick={onPickBook} onTurn={(dir) => onTurn(id, dir)} />
      ))}
      <Backdrop onMiss={onMiss} />
      {/* The line art: every outline in the scene, one 1px ink line. It fades while a book's spread is open over the page. */}
      <InkPass fade={() => 1 - anim.backdrop} />
    </Canvas>
  );
}
