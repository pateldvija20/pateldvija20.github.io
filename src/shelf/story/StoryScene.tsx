import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { anim, BOOKS } from "./anim";
import { MACHINE } from "./design";
import InkPass, { Inked } from "./InkPass";
import { CUP, MACHINE_Z, PLANT_Z, SHELF, view, type BookId } from "./layout";
import { Jelly } from "./physics";
import { FrameGuard, preloadObjects, SceneObject, toVec, useObjectModule } from "./registry";
import Rig from "./Rig";
import Studio from "./Studio";
import { BG, INK } from "./theme";
import { DRAWN } from "./toy";
import ToyBook from "./ToyBook";
import ToyCup from "./ToyCup";

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
};

/**
 * How each kind of thing bends and wobbles (physics.tsx Jelly): `amount` is
 * how far the top trails per unit of speed, `maxLean` the most it can (as a
 * share of its height), `stiffness` and `damping` the wobble after. Tuned
 * playful: a strong bend on the way in, a swing past upright on landing, two
 * or three wobbles, then still. Heavier things bend less and settle sooner.
 */
const JELLY = {
  plant: { amount: 0.1, maxLean: 0.27, stiffness: 170, damping: 4.5 },
  book: { amount: 0.1, maxLean: 0.3, stiffness: 225, damping: 4 },
  machine: { amount: 0.05, maxLean: 0.12, stiffness: 200, damping: 6 },
  cup: { amount: 0.08, maxLean: 0.25, stiffness: 130, damping: 6 },
  hanger: { amount: 0.12, maxLean: 0.45, stiffness: 40, damping: 3.2 },
};

/** The hanging plant on the screen's top-right (frame 2): its middle this far in from the right edge, its top just past the top edge (scene units). */
const HANG = { fromRight: 0.32, aboveTop: 0.03 };

/** The page colour, behind everything; it follows light and dark. */
function Clear() {
  const gl = useThree((s) => s.gl);
  useFrame(() => gl.setClearColor(BG, 1));
  return null;
}

/** Hands the director's "drawn" amount to the toy materials. */
function DrawnSync() {
  useFrame(() => {
    DRAWN.value = anim.drawn;
  });
  return null;
}

/** True while the books and cup are still line drawings (frame 2), for their `drawn` prop. */
function useDrawn() {
  const [drawn, setDrawn] = useState(anim.drawn > 0.5);
  const last = useRef(drawn);
  useFrame(() => {
    const now = anim.drawn > 0.5;
    if (now !== last.current) {
      last.current = now;
      setDrawn(now);
    }
  });
  return drawn;
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
  const drawn = useDrawn();
  const own = useRef<THREE.Group>(null);
  const turned = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const toy = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const lift = useRef(0);
  useStandInInk(toy);
  useFrame((_, dt) => {
    const p = anim.books[id];
    const enter = anim.enter[id];
    const following = anim.follow.book === id && anim.follow.mix > 0.001;
    const closed = !!mod && p.cover < 0.001 && !following;
    const target = hover.current && closed ? 0.04 : 0;
    lift.current += (target - lift.current) * (1 - Math.exp(-dt * 12));
    if (own.current) {
      own.current.visible = closed;
      own.current.position.set(p.x + enter, p.y + lift.current, p.z);
    }
    if (turned.current) {
      turned.current.rotation.set(p.rx, p.ry, 0, "YXZ");
      turned.current.scale.setScalar(p.s);
    }
    if (rig.current) {
      rig.current.visible = !closed;
      rig.current.position.x = enter;
    }
  });
  const events = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (anim.books[id].cover < 0.05) onPick(id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      hover.current = true;
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      hover.current = false;
      document.body.style.cursor = "";
    },
  };
  return (
    <>
      {mod && (
        <group ref={own} {...events}>
          <Jelly {...JELLY.book}>
            <group ref={turned}>
              <SceneObject name={id} drawn={drawn} />
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
  const drawn = useDrawn();
  const toy = useRef<THREE.Group>(null);
  useStandInInk(toy);
  return (
    <group
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
  const n = MACHINE.nozzle;
  const cup: [number, number, number] = mod?.CUP_SPOT ? toVec(mod.CUP_SPOT) : [CUP.x, CUP.y, CUP.z];
  const outlet: [number, number, number] = mod?.OUTLET ? toVec(mod.OUTLET) : [(n.x0 + n.x1) / 2, n.y0 - 0.02, 0.2];
  return (
    <Placed x={() => anim.machineX + anim.enter.machine} z={MACHINE_Z}>
      <Jelly {...JELLY.machine}>
        <SceneObject name="machine" />
        <Cup at={cup} onPick={onPickCup} />
        <SpoutPin at={outlet} />
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
    g.position.set(view.right - HANG.fromRight + anim.enter.hanger, view.top + HANG.aboveTop, -0.3);
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
function Backdrop() {
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
    <mesh ref={m} material={mat} position={[0, 0.7, 1.0]} renderOrder={5} visible={false} onClick={(e) => e.stopPropagation()}>
      <planeGeometry args={[30, 12]} />
    </mesh>
  );
}

export default function StoryScene({ onReady, onPickBook, onPickCup, onTurn }: Props) {
  return (
    <Canvas
      className="shelf-canvas"
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
      <Backdrop />
      {/* The line art: every outline in the scene, one 1px ink line. It fades while a book's spread is open over the page. */}
      <InkPass fade={() => 1 - anim.backdrop} />
    </Canvas>
  );
}
