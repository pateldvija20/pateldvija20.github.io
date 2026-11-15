import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { anim } from "./anim";
import { CUP_SHAPE, PALETTE } from "./Bright";
import { CUP } from "./layout";
import { MACHINE } from "./design";
import { toy } from "./toy";

/**
 * The takeaway cup as a soft toy (frame 31's shape): a chunky body with a
 * rolled rim, and a lid that lifts while coffee pours from the group head's
 * two spouts, then drops back on. Base at y = 0, sitting on the drip tray.
 */

const COFFEE = "#6A3B22";

export default function ToyCup({ onPick }: { onPick?: () => void }) {
  const lid = useRef<THREE.Group>(null);
  const streams = useRef<THREE.Group>(null);
  const hover = useRef(false);
  const c = CUP_SHAPE;
  const k = useMemo(() => {
    const v = (pts: [number, number][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
    // Soft, rounded heel and a rolled rim: chunkier than a real cup.
    const body = new THREE.LatheGeometry(
      v([
        [0.0001, 0],
        [c.botR - 0.02, 0],
        [c.botR - 0.004, 0.006],
        [c.botR + 0.002, 0.024],
        [c.topR - 0.004, c.bodyH - 0.02],
        [c.topR + 0.006, c.bodyH - 0.006],
        [c.topR + 0.004, c.bodyH + 0.004],
        [c.topR - 0.012, c.bodyH + 0.004],
        [c.topR - 0.014, c.bodyH - 0.01],
        [0.0001, c.bodyH - 0.03],
      ]),
      96,
    );
    const lidGeo = new THREE.LatheGeometry(
      v([
        [c.topR - 0.012, c.rimY0 - 0.002],
        [c.rimR - 0.01, c.rimY0],
        [c.rimR + 0.002, c.rimY0 + 0.01],
        [c.rimR + 0.004, (c.rimY0 + c.rimY1) / 2],
        [c.rimR, c.rimY1 - 0.002],
        [c.rimR - 0.014, c.rimY1 + 0.004],
        [c.lidTopR + 0.014, c.h - 0.024],
        [c.lidTopR + 0.004, c.h - 0.004],
        [c.lidTopR - 0.01, c.h],
        [0.0001, c.h],
      ]),
      96,
    );
    // The coffee's surface, just under the rim, seen when the lid lifts.
    const surface = new THREE.CircleGeometry(c.topR - 0.016, 48);
    surface.rotateX(-Math.PI / 2);
    // Two streams from the group head's spouts, which sit just above the cup.
    const spoutY = MACHINE.lip.y0 - 0.032 - CUP.y;
    const streamLen = spoutY - (c.bodyH - 0.03);
    const stream = new THREE.CylinderGeometry(0.011, 0.013, streamLen, 16, 1, true);
    stream.translate(0, -streamLen / 2, 0);
    return {
      body,
      lidGeo,
      surface,
      stream,
      spoutY,
      spouts: MACHINE.spouts.map((x) => x - CUP.x),
      bodyMat: toy(PALETTE.cup, { roughness: 0.55 }),
      lidMat: toy("#FFFFFF", { roughness: 0.42, clearcoat: 0.5 }),
      coffee: toy(COFFEE, { roughness: 0.25, clearcoat: 0.8, sheen: 0 }),
    };
  }, [c]);

  useFrame(() => {
    const l = lid.current;
    if (l) {
      // Lifts and tips back, pivoting on its far edge.
      const a = anim.lid;
      l.position.set(0.05 * a, 0.17 * a, -0.03 * a);
      l.rotation.set(-0.15 * a, 0, -0.32 * a);
    }
    const s = streams.current;
    if (s) {
      s.visible = anim.pour > 0.001;
      s.scale.set(1, Math.max(0.001, anim.pour), 1);
    }
  });

  const events = onPick
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onPick();
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
      }
    : {};

  const ink = { ink: "decor" };
  return (
    <group {...events}>
      <mesh geometry={k.body} material={k.bodyMat} castShadow receiveShadow userData={ink} />
      <mesh geometry={k.surface} material={k.coffee} position={[0, c.bodyH - 0.03, 0]} userData={{ ink: "skip" }} />
      <group ref={lid}>
        <mesh geometry={k.lidGeo} material={k.lidMat} castShadow receiveShadow userData={ink} />
      </group>
      <group ref={streams} position={[0, k.spoutY, 0]} visible={false}>
        {k.spouts.map((x) => (
          <mesh key={x} geometry={k.stream} material={k.coffee} position={[x, 0, 0]} userData={{ ink: "skip" }} />
        ))}
      </group>
    </group>
  );
}
