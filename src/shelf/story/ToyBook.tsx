import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { anim, heroPose, OPEN_Z } from "./anim";
import { slab } from "./Bright";
import { skin as aboutSkin } from "./objects/about";
import { COIL as PG_COIL, skin as playgroundSkin } from "./objects/playground";
import { skin as workSkin } from "./objects/work";
import { BOOK_CORNER, BOOK_SIZE, CAM_D, view, type BookId } from "./layout";
import { PAGE_COUNT, pageTexture, type Side } from "./pages";
import { printed } from "./toy";

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

/**
 * The rig wears the closed books' own skins (objects/<id>.tsx skin()), so a book opens in exactly the look it
 * stood in (16 Nov: "update the internal skeleton to match the external"): their cover art, inside, edges, spine, page
 * block and (Playground) wire coil.
 */
const SKINS = { work: workSkin, about: aboutSkin, playground: playgroundSkin };

/** One page's width in scene units (the printed art's width), for things that sit on the page. */
export function pageWidthOf(id: BookId) {
  const { w } = BOOK_SIZE[id];
  return id === "playground" ? w - 0.004 : w - SKINS[id]().board / 2;
}

/**
 * Work and About print their cover across the board's face as 0 to 1 (u from the spine's outer edge to the fore-edge, v
 * from the foot to the head); the Playground's print is in scene units about the board's middle (what ExtrudeGeometry
 * gives). So for the first two the slab's UVs are rescaled, or their art is blown up to a corner of itself.
 */
function normaliseUV(g: THREE.BufferGeometry, w: number, h: number, flipU = false) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = (uv.getX(i) + w / 2) / w;
    uv.setXY(i, flipU ? 1 - u : u, (uv.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
  return g;
}

/** The boards' faces as one extruded slab split into its front lid (material 0), its back lid (2) and its sides (1). */
function splitCaps(g: THREE.ExtrudeGeometry) {
  const lids = g.groups.find((x) => x.materialIndex === 0)!;
  const sides = g.groups.find((x) => x.materialIndex === 1)!;
  const half = lids.count / 2;
  g.clearGroups();
  g.addGroup(lids.start, half, 2);
  g.addGroup(lids.start + half, half, 0);
  g.addGroup(sides.start, sides.count, 1);
  return g;
}

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
  const sk = useMemo(() => SKINS[id](), [id]);
  const board = sk.board;
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const spineMesh = useRef<THREE.Mesh>(null);
  const foldGroup = useRef<THREE.Group>(null);
  const leaf = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const lift = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });
  const drag = useRef<null | { x0: number; dir: -1 | 1; from: number; moved: boolean }>(null);
  const justDragged = useRef(false);
  const { gl } = useThree();

  const k = useMemo(() => {
    const bevel = Math.min(0.003, board * 0.25);
    const coverGeo = splitCaps(slab(w, h, board, sk.corner, bevel));
    const backGeo = splitCaps(slab(w, h, board, sk.corner, bevel));
    if (!top) {
      normaliseUV(coverGeo, w, h);
      // Seen from behind, the back board's print runs the other way.
      normaliseUV(backGeo, w, h, true);
    }
    // The pages sit between the boards, a little in from the fore edge (and under the coil, for the top-bound one).
    const pw = top ? w - 0.05 : w - board - 0.01;
    const ph = top ? h - 0.012 : h - 0.03;
    const pt = t - board * 2 - 0.002;
    const blockGeo = new RoundedBoxGeometry(pw, ph, pt, 2, 0.004);
    const spine = top ? null : new RoundedBoxGeometry(board * 1.25, h, t, 4, board * 0.45);
    // Pages are printed edge to edge on the boards (the reference's full-bleed spreads).
    const pageW = top ? w - 0.004 : w - board / 2;
    const pageH = top ? h - 0.014 : h - 0.004;
    const pageGeo = new THREE.PlaneGeometry(pageW, pageH);
    const page = () => {
      const m = printed();
      m.transparent = true;
      return m;
    };
    return {
      coverGeo,
      backGeo,
      // Material 0 the front board's outside, 1 the boards' edges, 2 the inside.
      coverMats: [sk.coverFront, sk.coverEdge, sk.coverInside],
      backMats: [sk.coverEdge, sk.coverEdge, sk.backCover],
      blockGeo,
      blockMats: [sk.pageEdge, sk.pageEdge, sk.pageEdge, sk.pageEdge, sk.pageFace, sk.pageFace],
      spine,
      spineMats: top ? null : [sk.coverEdge, sk.spine ?? sk.coverEdge, sk.coverEdge, sk.coverEdge, sk.coverEdge, sk.coverEdge],
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
  }, [sk, w, h, t, top, board]);

  const shown = useRef({ left: "", right: "", front: "", back: "" });
  const setMap = (m: THREE.MeshBasicMaterial, slot: keyof typeof shown.current, index: number, side: Side) => {
    const key = `${index}:${side}`;
    // Remembered on the material itself, not on the component: if the materials are rebuilt (a hot reload, a new skin) the
    // new ones start empty and must be given their page again, or they stay white.
    if (shown.current[slot] === key && m.map && m.userData.pageKey === key) return;
    shown.current[slot] = key;
    m.userData.pageKey = key;
    const tex = pageTexture(id, index, side);
    m.map = tex;
    // Rebuild the material and re-upload the page, so a turning leaf never shows a stale or empty page (it flashed white).
    m.needsUpdate = true;
    tex.needsUpdate = true;
  };

  const q = useMemo(() => ({ quat: new THREE.Quaternion(), euler: new THREE.Euler(), pivot: new THREE.Vector3(), off: new THREE.Vector3() }), []);
  const pageZ = k.pt / 2 + 0.004;
  // The printed pages run right up to the fold (the hinge, half a board in from the spine's outer edge), so no strip of cover
  // or page edge shows as a line down the middle of the spread.
  const pageX = top ? 0 : -w / 2 + board / 2 + k.pageW / 2;

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

    // Open, the spine shows as a line down the middle of the spread: it narrows to a hairline as the cover swings open.
    if (foldGroup.current) foldGroup.current.rotation.y = -Math.PI * p.fold;
    if (spineMesh.current) {
      spineMesh.current.scale.x = Math.max(0.02, 1 - THREE.MathUtils.smoothstep(open, 0.15, 0.7));
      spineMesh.current.visible = open < 0.97;
    }
    if (hinge.current) {
      if (top) {
        // Up and over the coil, then down behind the pad (where a real spiral book's cover lies, out of sight): it swings up
        // to stand straight, then folds over the top and drops, and ends a little back from the back board so the two never
        // share a surface.
        const g = hinge.current;
        g.rotation.x = -Math.PI * THREE.MathUtils.smoothstep(open, 0, 0.5);
        g.scale.y = Math.cos(Math.PI * THREE.MathUtils.smoothstep(open, 0.5, 0.85));
        g.position.z = PG_COIL.z - 0.026 * THREE.MathUtils.smoothstep(open, 0.5, 1);
      }
      else {
        hinge.current.rotation.y = -Math.PI * open;
        // Open flat, the board's hinge-side edge would stand in the fold as a line: tuck it back behind the pages.
        hinge.current.position.z = t / 2 - board / 2 - (board + 0.004) * THREE.MathUtils.smoothstep(open, 0.6, 1);
      }
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
        if (!top && !pages.leaf.drag) {
          // Under the leaf, the page it will land on is put in place while the leaf still covers it (once it lies nearly flat over
          // the left page, or nearly flat again over the right), so when the leaf settles nothing underneath changes.
          if (pages.leaf.fwd) {
            if (pages.leaf.t > 0.93) pages.left = pages.leaf.back;
          } else if (pages.leaf.t < 0.07) pages.right = pages.leaf.front;
        }
        if (top) {
          setMap(k.leafFront, "front", pages.leaf.front, "single");
          setMap(k.leafBack, "back", pages.leaf.back, "blank");
          // The same way over the coil and down behind the pad.
          l.rotation.x = -Math.PI * THREE.MathUtils.smoothstep(pages.leaf.t, 0, 0.5);
          l.scale.y = Math.cos(Math.PI * THREE.MathUtils.smoothstep(pages.leaf.t, 0.5, 0.85));
          l.position.z = pageZ + 0.003 - 0.1 * THREE.MathUtils.smoothstep(pages.leaf.t, 0.5, 1);
        } else {
          setMap(k.leafFront, "front", pages.leaf.front, "right");
          setMap(k.leafBack, "back", pages.leaf.back, "left");
          l.rotation.y = -a;
          // Lifted a touch off the page as it goes over, so it never cuts through the spread.
          // And it ends up in front of the left page (which stands out from the block by the boards' thickness), not
          // behind it, so lying flat over it nothing of the page under it can show.
          const onLeft = THREE.MathUtils.smoothstep(a / Math.PI, 0.35, 0.95);
          const leftFront = t / 2 + 0.007;
          l.position.z = pageZ + 0.004 + (leftFront - (pageZ + 0.004)) * onLeft + Math.sin(a) * 0.01;
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
        Object.assign(pages.leaf, { on: true, drag: true, fwd: d.dir > 0, front: d.dir > 0 ? d.from : to, back: d.dir > 0 ? to : d.from, t: d.dir > 0 ? 0 : 1 });
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
      // Past the middle: it carries on over; short of it: it falls back.
      const done = d.dir > 0 ? pages.leaf.t > 0.5 : pages.leaf.t < 0.5;
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

  // Full colour like the closed book (no drawing lines round it).
  const ink = { ink: "color" };

  return (
    <group ref={root} {...events}>
      {/* The right-hand stack (back board, pages): it folds over onto the left when the book is closed by its back. */}
      <group ref={foldGroup} position={top ? [0, 0, 0] : [-w / 2 + board / 2, 0, 0]}>
        <group position={top ? [0, 0, 0] : [w / 2 - board / 2, 0, 0]}>
      {/* Back board. */}
      <mesh geometry={k.backGeo} material={k.backMats} position={[0, h / 2, -t / 2 + board / 2]} castShadow receiveShadow userData={ink} />
      {/* Page block, and the right-hand page printed on it, edge to edge. */}
      <mesh
        geometry={k.blockGeo}
        material={k.blockMats}
        position={top ? [0, (h - 0.006) / 2, 0] : [-w / 2 + board + k.pw / 2, h / 2, 0]}
        castShadow
        receiveShadow
        userData={ink}
      />
      <mesh geometry={k.pageGeo} material={k.right} position={[pageX, top ? h - 0.01 - k.pageH / 2 : h / 2, pageZ]} userData={{ ink: "skip" }} />
        </group>
      </group>
      {k.spine && <mesh ref={spineMesh} geometry={k.spine} material={k.spineMats!} position={[-w / 2 + board * 0.62, h / 2, 0]} castShadow receiveShadow userData={ink} />}
      {/* Whatever else the book has: the Playground's wire coil, the About book's staples. */}
      {sk.extras?.({ drawn: false })}
      {top ? (
        // Top-bound: the cover hangs from the coil and flips up and over it.
        <group ref={hinge} position={[0, PG_COIL.y, PG_COIL.z]}>
          <mesh geometry={k.coverGeo} material={k.coverMats} position={[0, h / 2 - PG_COIL.y, t / 2 - board / 2 - PG_COIL.z]} castShadow receiveShadow userData={ink} />
        </group>
      ) : (
        // Side-bound: the cover swings open about the spine; its inside carries the left page.
        <group ref={hinge} position={[-w / 2 + board / 2, h / 2, t / 2 - board / 2]}>
          <mesh geometry={k.coverGeo} material={k.coverMats} position={[w / 2 - board / 2, 0, 0]} castShadow receiveShadow userData={ink} />
          <mesh geometry={k.pageGeo} material={k.left} position={[k.pageW / 2, 0, -board / 2 - 0.003]} rotation={[0, Math.PI, 0]} userData={{ ink: "skip" }} />
        </group>
      )}
      {/* The page that turns. */}
      {top ? (
        <group ref={leaf} position={[0, h - 0.01, pageZ + 0.003]} visible={false}>
          <mesh geometry={k.pageGeo} material={k.leafFront} position={[0, -k.pageH / 2, 0.0015]} userData={{ ink: "skip" }} />
          <mesh geometry={k.pageGeo} material={k.leafBack} position={[0, -k.pageH / 2, -0.0015]} rotation={[0, Math.PI, 0]} userData={{ ink: "skip" }} />
        </group>
      ) : (
        <group ref={leaf} position={[-w / 2 + board / 2, h / 2, pageZ + 0.004]} visible={false}>
          <mesh geometry={k.pageGeo} material={k.leafFront} position={[k.pageW / 2, 0, 0.0015]} userData={{ ink: "skip" }} />
          <mesh geometry={k.pageGeo} material={k.leafBack} position={[k.pageW / 2, 0, -0.0015]} rotation={[0, Math.PI, 0]} userData={{ ink: "skip" }} />
        </group>
      )}
    </group>
  );
}
