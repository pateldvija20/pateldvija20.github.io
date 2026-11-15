import { useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cartoon physics for the scene (the user, 15 Nov: scene 2's objects slide in
 * from the right "with inertia… the object should bend on the top, more
 * animated, exaggerated motion style and physics"; the plant "should have
 * physics in its model").
 */

/** A damped spring: call step(target, dt) every frame; read value. */
export class Spring {
  value = 0;
  vel = 0;
  constructor(
    public stiffness = 120,
    public damping = 9,
  ) {}
  step(target: number, dt: number) {
    // Small fixed sub-steps keep it stable when a frame runs long.
    const steps = Math.max(1, Math.ceil(Math.min(dt, 0.1) / (1 / 240)));
    const h = Math.min(dt, 0.1) / steps;
    for (let i = 0; i < steps; i++) {
      const acc = (target - this.value) * this.stiffness - this.vel * this.damping;
      this.vel += acc * h;
      this.value += this.vel * h;
    }
    return this.value;
  }
}

/**
 * Watches a group's world-space movement each frame: its velocity and
 * acceleration along x and y, in scene units per second. Secondary motion
 * (a plant's leaves) reads these.
 */
export function useMotion(ref: RefObject<THREE.Object3D | null>) {
  const state = useRef({ vx: 0, vy: 0, ax: 0, ay: 0, last: new THREE.Vector3(), now: new THREE.Vector3(), started: false });
  useFrame((_, dt) => {
    const o = ref.current;
    if (!o || dt <= 0) return;
    const s = state.current;
    o.getWorldPosition(s.now);
    if (!s.started) {
      s.last.copy(s.now);
      s.started = true;
      return;
    }
    const vx = (s.now.x - s.last.x) / dt;
    const vy = (s.now.y - s.last.y) / dt;
    // Smoothed, so a single long frame doesn't kick everything.
    const k = 1 - Math.exp(-dt * 30);
    s.ax += ((vx - s.vx) / dt - s.ax) * k;
    s.ay += ((vy - s.vy) / dt - s.ay) * k;
    s.vx += (vx - s.vx) * k;
    s.vy += (vy - s.vy) * k;
    s.last.copy(s.now);
  });
  return state.current;
}

/**
 * Bends whatever is inside it at the top as it moves sideways, like jelly:
 * dragged along, the top lags behind; stopping, it swings past and wobbles
 * upright. A lean (shear) about the foot, plus a little squash on landing.
 * Children are in the object's own space: origin at its foot, y up.
 *
 * `amount`: how far the top lags per unit of speed. `stiffness`/`damping`
 * set the wobble.
 */
export function Jelly({ children, amount = 0.075, stiffness = 90, damping = 7, maxLean = 0.32 }: { children: ReactNode; amount?: number; stiffness?: number; damping?: number; maxLean?: number }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const motion = useMotion(outer);
  const lean = useRef(new Spring(stiffness, damping));
  const squash = useRef(new Spring(stiffness * 1.4, damping));
  const m = useRef(new THREE.Matrix4());
  useFrame((_, dt) => {
    const g = inner.current;
    if (!g) return;
    // Moving right, the top trails left (and the other way about).
    const k = THREE.MathUtils.clamp(lean.current.step(-motion.vx * amount, dt), -maxLean, maxLean);
    const sq = THREE.MathUtils.clamp(squash.current.step(Math.abs(motion.ax) * 0.0025, dt), -0.12, 0.12);
    // x += k·y (lean), y scaled down a touch as it lands (squash), x the other way (stretch).
    m.current.set(1 + sq * 0.5, k, 0, 0, 0, 1 - sq, 0, 0, 0, 0, 1 + sq * 0.5, 0, 0, 0, 0, 1);
    g.matrix.copy(m.current);
    g.matrixWorldNeedsUpdate = true;
  });
  return (
    <group ref={outer}>
      <group ref={inner} matrixAutoUpdate={false}>
        {children}
      </group>
    </group>
  );
}
