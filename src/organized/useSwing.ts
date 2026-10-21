import { useEffect, useRef } from "react";

/**
 * Makes an SVG group hang and swing like the thing it draws.
 *
 * A damped pendulum about `pivot` (in the drawing's own units), integrated per
 * frame and written straight to the group's `transform` attribute — no React
 * render per frame. Three ways to move it:
 *
 *   brush   moving the pointer across it pushes it the way the pointer is
 *           going, harder the faster it goes. The push is a force that
 *           builds and fades over ~0.1s rather than a kick, so it eases into
 *           the swing instead of jumping, and it also bobs the thing a little
 *           on its cord, which springs back
 *   drag    press and drag sideways to hold it at an angle; let go and it
 *           swings back through
 *   pull    (`pull` set) dragging down stretches it down its cord, and on
 *           release it springs back up with a bounce. A pull past
 *           `pull.threshold`, or a plain click, calls `pull.onPull` — the lamp
 *           is a pull-cord light switch
 *
 * The swing is a real pendulum's (restoring force on sin θ, so wide swings
 * slow at the ends), lightly damped so it carries on a few times before it
 * settles, and past `maxAngle` it meets a soft stop that springs it back
 * rather than a wall.
 *
 * Reduced motion: no swinging or bouncing at all; a click still calls
 * `onPull`, so the switch keeps working.
 */
type Options = {
  pivot: { x: number; y: number };
  /** Stiffness: higher swings faster. Period is about 2π/√stiffness s. */
  stiffness: number;
  /** Damping: higher settles sooner. */
  damping: number;
  /** Where the soft stop starts, degrees either way. */
  maxAngle?: number;
  /** How much a brush bobs it on its cord. 0 for none. */
  bob?: number;
  /** Called every frame with the SVG rotation (degrees, clockwise) and the
   *  pull, so something attached can follow — the lamp's light cone. */
  onFrame?: (deg: number, dy: number) => void;
  pull?: {
    /** Furthest it stretches, in drawing units. */
    max: number;
    /** How far counts as a pull, in drawing units. */
    threshold: number;
    onPull: () => void;
  };
};

const RAD = 180 / Math.PI;
/** Push force (deg/s²) added per (drawing unit / ms) of pointer speed, per
 *  move event, after smoothing. A brisk pass across the lamp swings it ~6°. */
const PUSH_GAIN = 26;
/** How long a push keeps acting, as a decay time constant. Long enough that
 *  a pass reads as one push rather than a burst of taps. */
const PUSH_TAU = 0.16;
/** Pointer speed is smoothed across move events (exponential average), so
 *  uneven event timing cannot jolt the swing. */
const VX_SMOOTH = 0.35;
const PUSH_MAX = 1200;
/** The soft stop past `maxAngle`: extra stiffness, as a multiple. */
const STOP_STIFFNESS = 6;
/** The vertical spring a pulled or brushed lamp bobs on. Under-damped, so it
 *  overshoots and settles in a couple of bounces. */
const Y_STIFFNESS = 220;
const Y_DAMPING = 7;
/** Movement under this, in screen px, is a click rather than a drag. */
const CLICK_SLOP = 4;

export function useSwing<T extends SVGGraphicsElement>(opts: Options) {
  const ref = useRef<T>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { pivot } = optsRef.current;

    let angle = 0;
    let spin = 0; // deg/s
    let y = 0;
    let fall = 0; // units/s
    let push = 0; // deg/s², decaying
    let raf = 0;
    let last = 0;
    let drag: null | {
      id: number;
      x0: number;
      y0: number;
      /** Distance from the pivot to where it was grabbed, in drawing units. */
      arm: number;
      moved: boolean;
      prevAngle: number;
      prevT: number;
    } = null;

    // The short run of cord that only shows while the lamp is pulled down.
    const cordExt = el.querySelector<SVGElement>("[data-cord-ext]");
    const write = () => {
      cordExt?.setAttribute("opacity", y > 0.3 ? "1" : "0");
      optsRef.current.onFrame?.(-angle, y);
      el.setAttribute(
        "transform",
        // SVG's positive rotation is clockwise, which swings a hanging thing's
        // bottom to the left; `angle` is positive to the right, as the
        // pointer pushes, so it goes in negated.
        `translate(0 ${y.toFixed(2)}) rotate(${(-angle).toFixed(3)} ${pivot.x} ${pivot.y})`,
      );
    };

    /** Screen px per drawing unit, for converting pointer movement. */
    const unit = () => el.ownerSVGElement?.getScreenCTM()?.a || 1;

    const step = (t: number) => {
      const dt = Math.min(0.032, (t - (last || t)) / 1000);
      last = t;
      const o = optsRef.current;
      const max = o.maxAngle ?? 16;
      if (!drag) {
        const over = Math.max(0, Math.abs(angle) - max) * Math.sign(angle);
        const force =
          -o.stiffness * Math.sin(angle / RAD) * RAD - o.stiffness * STOP_STIFFNESS * over - o.damping * spin + push;
        spin += force * dt;
        angle += spin * dt;
        push *= Math.exp(-dt / PUSH_TAU);
        fall += (-Y_STIFFNESS * y - Y_DAMPING * fall) * dt;
        y += fall * dt;
      }
      // A hard limit well past the soft stop, only for a wild flick.
      angle = Math.max(-max * 1.6, Math.min(max * 1.6, angle));
      write();
      const resting =
        !drag &&
        Math.abs(angle) < 0.02 &&
        Math.abs(spin) < 0.05 &&
        Math.abs(push) < 0.5 &&
        Math.abs(y) < 0.05 &&
        Math.abs(fall) < 0.05;
      if (resting) {
        angle = spin = y = fall = push = 0;
        write();
        raf = 0;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(step);
    };
    const wake = () => {
      if (!raf && !reduced) raf = requestAnimationFrame(step);
    };

    let brush: { x: number; t: number; vx: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (reduced) return;
      if (drag && e.pointerId === drag.id) {
        const u = unit();
        const dx = (e.clientX - drag.x0) / u;
        const dy = (e.clientY - drag.y0) / u;
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > CLICK_SLOP) drag.moved = true;
        const o = optsRef.current;
        // Held at the angle the pointer makes with the pivot. The swing it
        // will carry on release is however fast that angle was changing.
        angle = Math.atan2(dx, drag.arm) * RAD;
        const now = performance.now();
        spin = ((angle - drag.prevAngle) / Math.max(1, now - drag.prevT)) * 1000;
        drag.prevAngle = angle;
        drag.prevT = now;
        if (o.pull) {
          // Down only, and harder the further it goes, like a cord.
          const d = Math.max(0, dy);
          y = o.pull.max * (1 - Math.exp(-d / o.pull.max));
        }
        wake();
        return;
      }
      const now = performance.now();
      if (brush) {
        const raw = (e.clientX - brush.x) / unit() / Math.max(8, now - brush.t);
        const vx = brush.vx + (raw - brush.vx) * VX_SMOOTH;
        push = Math.max(-PUSH_MAX, Math.min(PUSH_MAX, push + vx * PUSH_GAIN));
        fall += Math.abs(vx) * (optsRef.current.bob ?? 2);
        brush = { x: e.clientX, t: now, vx };
        wake();
        return;
      }
      brush = { x: e.clientX, t: now, vx: 0 };
    };
    const onLeave = () => {
      brush = null;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const box = el.getBBox();
      // Grabbed at the pointer's height below the pivot, measured in the
      // drawing's own units through the screen transform.
      const ctm = el.ownerSVGElement?.getScreenCTM();
      const py = ctm ? (e.clientY - ctm.f) / ctm.d : box.y + box.height / 2;
      drag = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        arm: Math.max(60, py - pivot.y),
        moved: false,
        prevAngle: angle,
        prevT: performance.now(),
      };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const o = optsRef.current;
      const click = !drag.moved;
      drag = null;
      if (o.pull && (click || y >= o.pull.threshold)) {
        o.pull.onPull();
        // A click gets the same tug a pull would have given.
        if (click && !reduced) fall = 420;
      }
      wake();
    };
    const onKey = (e: KeyboardEvent) => {
      const o = optsRef.current;
      if (!o.pull || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      o.pull.onPull();
      if (!reduced) {
        fall = 420;
        wake();
      }
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  return ref;
}
