import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { anim, heroPose, OPEN_Z } from "./anim";
import { COIL, Helix, PALETTE, coilLoops, coverAbout, coverPlayground, coverWork, faceMap, pageEdges, slab, spineTex } from "./Bright";
import { BOOK_SIZE, CAM_D, STROKE, view, type BookId } from "./layout";
import { PAGE_COUNT, pageTexture, type Side } from "./pages";
import { THEME } from "./theme";
import { printed, toy } from "./toy";

/**
 * A book as a soft, chunky board book (the toy references, and the HTWKR
 * picture book): thick boards with big rounded corners, a page block, a
 * front cover on a hinge, and one page that turns. Origin at the middle of
 * its base; cover facing +Z.
 *
 * Side-bound (Work, About): the spine is at local -X; the cover swings open
 * to the left and its inside carries the left page. Top-bound (Playground):
 * the coil runs along the top and the cover flips up and over it.
 *
 * Open, it tilts a little toward the pointer, and its pages can be dragged
 * across to turn them, as in the reference. Everything else comes from
 * anim.books[id] and anim.pages[id].
 */

const BOARD = { work: 0.05, about: 0.046, playground: 0.03 } as const;
const COVER_ART = { work: coverWork, about: coverAbout, playground: coverPlayground };
/** The boards' corner radius, seen front-on; the pages' art is cut to match (pages.ts). */
const CORNER = 0.06;

/** Where the pointer is, -1 to 1 across the window, for the open book's tilt. */
const pointer = { x: 0, y: 0 };
if (typeof window !== "undefined")
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

type Props = {
  id: BookId;
  /** Clicked while shut: open it. */
  onPick?: (id: BookId) => void;
  /** Clicked or dragged while open: turn a page (-1 back, 1 on). */
  onTurn?: (dir: -1 | 1) => void;
};

export default function ToyBook({ id, onPick, onTurn }: Props) {
  const { w, h, t } = BOOK_SIZE[id];
  const top = id === "playground";
  const board = BOARD[id];
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const leaf = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const hover = useRef(false);
  const lift = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });
  const drag = useRef<null | { x0: number; dir: -1 | 1; from: number; moved: boolean }>(null);
  const justDragged = useRef(false);
  const { gl } = useThree();

  const k = useMemo(() => {
    const color = PALETTE[id];
    const edge = toy(color);
    const artCanvas = COVER_ART[id]().image as HTMLCanvasElement;
    const art = faceMap(new THREE.CanvasTexture(artCanvas), w, h);
    art.colorSpace = THREE.SRGBColorSpace;
    art.anisotropy = 8;
    const front = toy("#FFFFFF", { map: art });
    // Boards: rounded corners front-on, softly bevelled edges.
    const coverGeo = slab(w, h, board, CORNER, Math.min(0.012, board * 0.3));
    const pw = top ? w - 0.05 : w - board - 0.022;
    const ph = top ? h - 0.1 : h - 0.05;
    const pt = t - board * 2 + 0.006;
    const edgesDown = toy("#FFFFFF", { map: pageEdges(false), roughness: 0.85, clearcoat: 0, sheen: 0 });
    const edgesAcross = toy("#FFFFFF", { map: pageEdges(true), roughness: 0.85, clearcoat: 0, sheen: 0 });
    const paper = toy("#FBF6EA", { roughness: 0.85, clearcoat: 0, sheen: 0 });
    const blockGeo = new RoundedBoxGeometry(pw, ph, pt, 2, 0.008);
    const r = board * 0.48;
    const spine = top ? null : new RoundedBoxGeometry(board * 1.25, h, t, 4, r);
    const spineMats = top ? null : [edge, toy("#FFFFFF", { map: spineTex(id === "work" ? "WORK" : "ABOUT", color, t, h) }), edge, edge, edge, edge];
    const wire = top ? new THREE.TubeGeometry(new Helix(coilLoops().x0, coilLoops().pitch, COIL.count, h - COIL.drop, COIL.r), COIL.count * 64, 0.008, 8) : null;
    // Pages are printed edge to edge on the boards (the reference's full-bleed spreads).
    const pageW = top ? w - 0.004 : w - board;
    const pageH = top ? h - 0.06 : h - 0.004;
    const pageGeo = new THREE.PlaneGeometry(pageW, pageH);
    const page = () => {
      const m = printed();
      m.transparent = true;
      return m;
    };
    return {
      art,
      artCanvas,
      coverGeo,
      // Extruded boards: material 0 is the faces (front and inside), 1 the edges.
      coverMats: [front, edge],
      backMats: [edge, edge],
      blockGeo,
      blockMats: top ? [edgesDown, edgesDown, edgesAcross, edgesAcross, paper, paper] : [edgesDown, paper, edgesAcross, edgesAcross, paper, paper],
      spine,
      spineMats,
      wire,
      wireMat: toy(PALETTE.coil, { roughness: 0.3, metalness: 0.5, clearcoat: 0.6 }),
      // Frame 2: the coil seen end-on as a single drawn loop (inking the whole wire end-on would blot).
      ringGeo: top ? new THREE.TorusGeometry(COIL.r, STROKE / 2, 8, 96) : null,
      ringMat: new THREE.MeshBasicMaterial({ color: THEME.chalk, transparent: true, opacity: 0, toneMapped: false }),
      pw,
      ph,
      pt,
      pageW,
      pageH,
      pageGeo,
      left: page(),
      right: page(),
      leafFront: page(),
      leafBack: page(),
    };
  }, [id, w, h, t, top, board]);

  // The covers' hand lettering is a web font: redraw once it has loaded.
  useEffect(() => {
    let live = true;
    document.fonts.load('700 100px "Cabin Sketch"').then(() => {
      if (!live) return;
      const fresh = COVER_ART[id]().image as HTMLCanvasElement;
      const g = k.artCanvas.getContext("2d")!;
      g.clearRect(0, 0, k.artCanvas.width, k.artCanvas.height);
      g.drawImage(fresh, 0, 0);
      k.art.needsUpdate = true;
    });
    return () => {
      live = false;
    };
  }, [id, k]);

  const shown = useRef({ left: "", right: "", front: "", back: "" });
  const setMap = (m: THREE.MeshBasicMaterial, slot: keyof typeof shown.current, index: number, side: Side) => {
    const key = `${index}:${side}`;
    if (shown.current[slot] === key) return;
    shown.current[slot] = key;
    m.map = pageTexture(id, index, side);
    m.needsUpdate = true;
  };

  const q = useMemo(() => ({ quat: new THREE.Quaternion(), euler: new THREE.Euler(), pivot: new THREE.Vector3(), off: new THREE.Vector3() }), []);
  const pageZ = k.pt / 2 + 0.004;
  const pageX = top ? 0 : -w / 2 + board + k.pageW / 2;

  useFrame((_, dt) => {
    const o = root.current;
    if (!o) return;
    let p = anim.books[id];
    // Shrinking into (or growing back out of) the case study's header: blend toward its pose.
    const f = anim.follow;
    if (f.book === id && f.mix > 0.0001) {
      const hp = heroPose(id);
      const m = f.mix;
      p = { ...p, x: p.x + (hp.x - p.x) * m, y: p.y + (hp.y - p.y) * m, s: p.s + (hp.s - p.s) * m };
    }
    const pages = anim.pages[id];
    // Lifts a little under the pointer, while it's shut and on the shelf.
    const target = hover.current && p.cover < 0.05 && onPick ? 0.04 : 0;
    lift.current += (target - lift.current) * (1 - Math.exp(-dt * 12));
    o.position.set(p.x + anim.enter.books, p.y + lift.current, p.z);
    o.rotation.set(p.rx, p.ry, 0, "YXZ");
    o.scale.setScalar(p.s);

    // Open on its own (not shrunk into the case study): lean toward the pointer, about the spread's middle.
    const open = p.cover;
    const tiltOn = open > 0.95 && anim.backdrop > 0.5 && f.mix < 0.05 && !drag.current;
    const e = 1 - Math.exp(-dt * 4);
    tilt.current.x += ((tiltOn ? pointer.y * 0.07 : 0) - tilt.current.x) * e;
    tilt.current.y += ((tiltOn ? pointer.x * 0.11 : 0) - tilt.current.y) * e;
    if (Math.abs(tilt.current.x) + Math.abs(tilt.current.y) > 0.0005) {
      q.pivot.set(o.position.x - (top ? 0 : (w / 2) * p.s), o.position.y + (h / 2) * p.s, o.position.z);
      q.quat.setFromEuler(q.euler.set(tilt.current.x, tilt.current.y, 0));
      q.off.copy(o.position).sub(q.pivot).applyQuaternion(q.quat);
      o.position.copy(q.pivot).add(q.off);
      o.quaternion.premultiply(q.quat);
    }

    if (ring.current) {
      k.ringMat.opacity = anim.drawn;
      ring.current.visible = anim.drawn > 0.001;
    }
    if (hinge.current) {
      if (top) hinge.current.rotation.x = -1.9 * Math.PI * open;
      else hinge.current.rotation.y = -Math.PI * open;
    }
    // Pages: only drawn once the cover has started to open.
    if (open > 0.001) {
      if (top) setMap(k.right, "right", pages.right, "single");
      else {
        setMap(k.left, "left", pages.left, "left");
        setMap(k.right, "right", pages.right, "right");
      }
    }
    const l = leaf.current;
    if (l) {
      l.visible = pages.leaf.on;
      if (pages.leaf.on) {
        const a = Math.PI * pages.leaf.t;
        // Board pages: rigid, they swing on the spine and catch less light as they stand up.
        const shade = 0.62 + 0.38 * Math.abs(Math.cos(a));
        k.leafFront.color.setScalar(shade);
        k.leafBack.color.setScalar(shade);
        if (top) {
          setMap(k.leafFront, "front", pages.leaf.front, "single");
          setMap(k.leafBack, "back", pages.leaf.back, "blank");
          l.rotation.x = -1.9 * Math.PI * pages.leaf.t;
        } else {
          setMap(k.leafFront, "front", pages.leaf.front, "right");
          setMap(k.leafBack, "back", pages.leaf.back, "left");
          l.rotation.y = -a;
          // Lifted a touch off the page as it goes over, so it never cuts through the spread.
          l.position.z = pageZ + 0.004 + Math.sin(a) * 0.01;
        }
      }
    }
  });

  /** One page's width on screen, in CSS pixels: how far a drag must go to turn it. */
  const pagePx = () => {
    const near = CAM_D / (CAM_D - OPEN_Z);
    return k.pageW * anim.books[id].s * near * view.pxPerUnit;
  };

  // Dragging a page across the spine (the reference's way of turning).
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const pages = anim.pages[id];
      const dx = e.clientX - d.x0;
      if (!d.moved && Math.abs(dx) < 8) return;
      if (!d.moved) {
        const to = d.from + d.dir;
        if (to < 0 || to >= PAGE_COUNT[id] || (d.dir < 0 && top)) {
          drag.current = null;
          return;
        }
        d.moved = true;
        if (d.dir > 0) pages.right = to;
        else pages.left = to;
        Object.assign(pages.leaf, { on: true, drag: true, front: d.dir > 0 ? d.from : to, back: d.dir > 0 ? to : d.from, t: d.dir > 0 ? 0 : 1 });
      }
      const span = pagePx() * (top ? 1.2 : 1.6);
      pages.leaf.t = d.dir > 0 ? Math.min(1, Math.max(0, -dx / span)) : 1 - Math.min(1, Math.max(0, dx / span));
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.moved) return;
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      const pages = anim.pages[id];
      const done = d.dir > 0 ? pages.leaf.t > 0.3 : pages.leaf.t < 0.7;
      if (done) {
        // The director carries the turn on from here (director.ts turn()).
        onTurn?.(d.dir);
        return;
      }
      // Not far enough: it falls back.
      gsap.to(pages.leaf, {
        t: d.dir > 0 ? 0 : 1,
        duration: 0.35,
        ease: "power2.out",
        onComplete: () => {
          pages.leaf.on = false;
          pages.leaf.drag = false;
          pages.left = d.from;
          pages.right = d.from;
        },
      });
    };
    el.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // pagePx reads refs and anim only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, id, onTurn]);

  const spineX = () => {
    const o = root.current;
    return (o?.position.x ?? 0) - (top ? 0 : (w / 2) * anim.books[id].s);
  };

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (justDragged.current) return;
    const p = anim.books[id];
    if (p.cover > 0.9) {
      if (top) onTurn?.(1);
      else onTurn?.(e.point.x < spineX() ? -1 : 1);
    } else if (p.cover < 0.05) onPick?.(id);
  };

  const down = (e: ThreeEvent<PointerEvent>) => {
    const p = anim.books[id];
    if (p.cover < 0.95 || anim.pages[id].leaf.on || anim.follow.mix > 0.05) return;
    // Right of the spine drags on; left of it drags back. The Playground only flips on.
    const dir: -1 | 1 = top || e.point.x >= spineX() ? 1 : -1;
    drag.current = { x0: e.nativeEvent.clientX, dir, from: anim.pages[id].right, moved: false };
  };

  const pickable = !!(onPick || onTurn);
  const events = pickable
    ? {
        onClick: click,
        onPointerDown: down,
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hover.current = true;
          document.body.style.cursor = anim.books[id].cover > 0.9 ? "grab" : "pointer";
        },
        onPointerOut: () => {
          hover.current = false;
          document.body.style.cursor = "";
        },
      }
    : {};

  const ink = { ink: "decor" };

  return (
    <group ref={root} {...events}>
      {/* Back board. */}
      <mesh geometry={k.coverGeo} material={k.backMats} position={[0, h / 2, -t / 2 + board / 2]} castShadow receiveShadow userData={ink} />
      {/* Page block, and the right-hand page printed on it, edge to edge. */}
      <mesh
        geometry={k.blockGeo}
        material={k.blockMats}
        position={top ? [0, h / 2 - 0.035, 0] : [-w / 2 + board + k.pw / 2, h / 2, 0]}
        castShadow
        receiveShadow
        userData={ink}
      />
      <mesh geometry={k.pageGeo} material={k.right} position={[pageX, top ? h / 2 - 0.03 : h / 2, pageZ]} userData={{ ink: "skip" }} />
      {k.spine && <mesh geometry={k.spine} material={k.spineMats!} position={[-w / 2 + board * 0.62, h / 2, 0]} castShadow receiveShadow userData={ink} />}
      {k.wire && <mesh geometry={k.wire} material={k.wireMat} castShadow userData={{ ink: "skip" }} />}
      {k.ringGeo && (
        <mesh ref={ring} geometry={k.ringGeo} material={k.ringMat} position={[-coilLoops().span / 2, h - COIL.drop, 0]} rotation={[0, Math.PI / 2, 0]} userData={{ ink: "skip" }} />
      )}
      {top ? (
        // Top-bound: the cover hangs from the coil and flips up and over it.
        <group ref={hinge} position={[0, h - COIL.drop, t / 2 - board / 2]}>
          <mesh geometry={k.coverGeo} material={k.coverMats} position={[0, -(h - COIL.drop) + h / 2, 0]} castShadow receiveShadow userData={ink} />
        </group>
      ) : (
        // Side-bound: the cover swings open about the spine; its inside carries the left page.
        <group ref={hinge} position={[-w / 2 + board / 2, h / 2, t / 2 - board / 2]}>
          <mesh geometry={k.coverGeo} material={k.coverMats} position={[w / 2 - board / 2, 0, 0]} castShadow receiveShadow userData={ink} />
          <mesh geometry={k.pageGeo} material={k.left} position={[w / 2, 0, -board / 2 - 0.003]} rotation={[0, Math.PI, 0]} userData={{ ink: "skip" }} />
        </group>
      )}
      {/* The page that turns. */}
      {top ? (
        <group ref={leaf} position={[0, h - COIL.drop - 0.03, pageZ + 0.003]} visible={false}>
          <mesh geometry={k.pageGeo} material={k.leafFront} position={[0, -k.pageH / 2 + 0.005, 0.0015]} userData={{ ink: "skip" }} />
          <mesh geometry={k.pageGeo} material={k.leafBack} position={[0, -k.pageH / 2 + 0.005, -0.0015]} rotation={[0, Math.PI, 0]} userData={{ ink: "skip" }} />
        </group>
      ) : (
        <group ref={leaf} position={[-w / 2 + board, h / 2, pageZ + 0.004]} visible={false}>
          <mesh geometry={k.pageGeo} material={k.leafFront} position={[k.pageW / 2, 0, 0.0015]} userData={{ ink: "skip" }} />
          <mesh geometry={k.pageGeo} material={k.leafBack} position={[k.pageW / 2, 0, -0.0015]} rotation={[0, Math.PI, 0]} userData={{ ink: "skip" }} />
        </group>
      )}
    </group>
  );
}
