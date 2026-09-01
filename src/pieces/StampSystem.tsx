import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "./Piece";
import { InkPad, INKPAD_H, INKPAD_W, Stamp, StampImpression, STAMP_H, STAMP_W, type StampId } from "./Stamp";

/**
 * The ink pad and the two rubber stamps.
 *
 * State machine, in the order the visitor meets it:
 *
 *   idle ──click a stamp──▶ held ──click over the pad──▶ inked
 *   inked ──press and hold on the desk──▶ pressing ──release──▶ impression
 *   impression ──▶ held (uninked; the stamp must be re-inked for the next one)
 *
 * Two presses are told apart by *where* they land rather than by how long they
 * last: over the pad a press inks, anywhere else it stamps. That is what lets
 * one gesture do both without a mode switch.
 *
 * Pressure is duration, and duration drives opacity only — the brief is
 * explicit that the mark must not blur, spread or scale with it.
 */

/** Below this a press is a slip, not a stamp, and leaves nothing. */
const MIN_PRESS = 120;
/** Full-strength ink. Longer presses do not go darker. */
const MAX_PRESS = 1200;
const MIN_DENSITY = 0.22;

/** Impressions are transient, but a long session should not grow DOM without
 *  limit. Oldest fades out first, well past what exploring produces. */
const MAX_IMPRESSIONS = 60;

const INKPAD = { x: 3817, y: 2642 };
const STAMP_HOME: Record<StampId, { x: number; y: number }> = {
  1: { x: 4603, y: 2773 },
  2: { x: 4838, y: 2844 },
};

type Impression = { id: number; n: StampId; x: number; y: number; density: number };

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Duration → ink density, eased so the first moments of a press count for
 *  more than the last and the control feels responsive rather than linear. */
function densityFor(ms: number) {
  const t = Math.min(Math.max((ms - MIN_PRESS) / (MAX_PRESS - MIN_PRESS), 0), 1);
  return MIN_DENSITY + (1 - MIN_DENSITY) * easeOut(t);
}

export function StampSystem({
  theme,
  scale,
  enabled,
  z,
}: {
  theme: Theme;
  /** Canvas `fit` scale, so pointer positions convert to canvas units. */
  scale: number;
  enabled: boolean;
  /** Where the whole system sits in the desk's stacking order. */
  z: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<StampId | null>(null);
  const [inked, setInked] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [impressions, setImpressions] = useState<Impression[]>([]);
  /** Press start time, or null when not pressing. Also drives the live preview. */
  const [pressStart, setPressStart] = useState<number | null>(null);
  const [preview, setPreview] = useState(0);
  const nextId = useRef(1);

  /**
   * The interaction runs off refs, not state.
   *
   * These handlers live on `window`, and a real press-and-release is far
   * quicker than a React commit: `onDown` would set state, the effect would be
   * torn down and re-registered because that state was in its dependency list,
   * and the `pointerup` would meanwhile fire against the *previous* closure —
   * which still saw `pressStart === null` and bailed out. The press produced no
   * impression. (A synthetic test that waits between down and up never sees
   * this, because the wait gives React time to re-register.)
   *
   * Refs are always current, so the handlers can be registered once and read
   * the truth. State is kept alongside purely so rendering updates.
   */
  const heldRef = useRef<StampId | null>(null);
  const inkedRef = useRef(false);
  const pressRef = useRef<number | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const setHeldBoth = useCallback((v: StampId | null) => {
    heldRef.current = v;
    setHeld(v);
  }, []);
  const setInkedBoth = useCallback((v: boolean) => {
    inkedRef.current = v;
    setInked(v);
  }, []);
  const setPressBoth = useCallback((v: number | null) => {
    pressRef.current = v;
    setPressStart(v);
  }, []);
  const setPosBoth = useCallback((v: { x: number; y: number }) => {
    posRef.current = v;
    setPos(v);
  }, []);

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
    },
    [scale],
  );

  const overPad = useCallback(
    (p: { x: number; y: number }) =>
      p.x >= INKPAD.x && p.x <= INKPAD.x + INKPAD_W && p.y >= INKPAD.y && p.y <= INKPAD.y + INKPAD_H,
    [],
  );

  /**
   * The desk takes ink; controls and openable objects do not.
   *
   * Stated as "inside the canvas, and not on a control" rather than "on a
   * descendant of the canvas". Over bare desk `elementFromPoint` returns an
   * *ancestor* — the scrolling viewport — because nothing paints there, and a
   * containment test rejects that, which silently made most of the desk
   * unstampable.
   */
  const stampable = useCallback(
    (e: PointerEvent) => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return false;
      const p = toCanvas(e.clientX, e.clientY);
      if (p.x < 0 || p.y < 0 || p.x > r.width / scale || p.y > r.height / scale) return false;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (el?.closest("button, a, [role='dialog'], [data-no-stamp]")) return false;
      return true;
    },
    [toCanvas, scale],
  );

  // The held stamp tracks the pointer.
  useEffect(() => {
    if (!held) return;
    const onMove = (e: PointerEvent) => setPosBoth(toCanvas(e.clientX, e.clientY));
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [held, toCanvas, setPosBoth]);

  // While pressing, the preview darkens in step with the real curve, so what
  // the visitor watches is what they get when they let go.
  useEffect(() => {
    if (pressStart === null) return;
    let raf = 0;
    const tick = () => {
      setPreview(densityFor(performance.now() - pressStart));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pressStart]);

  useEffect(() => {
    if (!held) return;

    const onDown = (e: PointerEvent) => {
      // A press on a stamp belongs to that stamp's own handler, which swaps
      // what is in hand. Without this both run and cancel each other out.
      if ((e.target as HTMLElement | null)?.closest?.("[data-stamp]")) return;
      const p = toCanvas(e.clientX, e.clientY);
      setPosBoth(p);
      if (overPad(p)) {
        setInkedBoth(true);
        return;
      }
      if (!inkedRef.current) {
        // Nothing on the stamp and nowhere to put it — set it back down.
        setHeldBoth(null);
        return;
      }
      if (!stampable(e)) {
        // Not a surface that takes ink — put the stamp down rather than
        // leaving it stuck to the pointer with no way to release it.
        setHeldBoth(null);
        setInkedBoth(false);
        return;
      }
      setPressBoth(performance.now());
    };

    const onUp = () => {
      const started = pressRef.current;
      if (started === null) return;
      const elapsed = performance.now() - started;
      setPressBoth(null);
      setPreview(0);
      if (elapsed < MIN_PRESS) return; // a slip, not a stamp
      const n = heldRef.current;
      if (n === null) return;
      const at = posRef.current;
      const density = densityFor(elapsed);
      setImpressions((list) => {
        const next = [...list, { id: nextId.current++, n, x: at.x, y: at.y, density }];
        return next.length > MAX_IMPRESSIONS ? next.slice(next.length - MAX_IMPRESSIONS) : next;
      });
      setInkedBoth(false); // re-ink before every impression
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHeldBoth(null);
      setInkedBoth(false);
      setPressBoth(null);
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
    // Deliberately keyed on `held` alone: everything else is read from refs, so
    // the listeners survive an entire press instead of being swapped mid-gesture.
  }, [held, toCanvas, overPad, stampable, setHeldBoth, setInkedBoth, setPressBoth, setPosBoth]);

  const pickUp = (e: React.PointerEvent, n: StampId) => {
    if (!enabled || held === n) return;
    e.stopPropagation();
    // Swaps rather than refusing: after an impression the stamp stays in hand
    // (uninked, ready to be re-inked), so reaching for the other one has to
    // mean "take that one instead" or the second stamp is unreachable.
    setPosBoth(toCanvas(e.clientX, e.clientY));
    setHeldBoth(n);
    setInkedBoth(false);
    setPressBoth(null);
  };

  const pressing = pressStart !== null;

  return (
    // An explicit z-index here creates a stacking context, so the 1-40 used
    // below are private to the stamps and cannot collide with the desk's scale.
    <div ref={rootRef} className="pointer-events-none absolute inset-0" style={{ zIndex: z }}>
      {/* Impressions sit on the desk, under everything else. */}
      {impressions.map((im) => (
        <StampImpression
          key={im.id}
          n={im.n}
          className="pointer-events-none absolute"
          style={{
            left: im.x - STAMP_W / 2,
            top: im.y - STAMP_W / 2,
            width: STAMP_W,
            height: STAMP_W,
            opacity: im.density,
            zIndex: 1,
          }}
        />
      ))}

      <div className="pointer-events-none absolute" style={{ left: INKPAD.x, top: INKPAD.y, zIndex: 2 }}>
        <InkPad theme={theme} style={{ width: INKPAD_W, height: INKPAD_H }} />
      </div>

      {/* The live mark under a press, so the density is visible while it builds. */}
      {pressing && held ? (
        <StampImpression
          n={held}
          className="pointer-events-none absolute"
          style={{
            left: pos.x - STAMP_W / 2,
            top: pos.y - STAMP_W / 2,
            width: STAMP_W,
            height: STAMP_W,
            opacity: preview,
            zIndex: 3,
          }}
        />
      ) : null}

      {([1, 2] as StampId[]).map((n) => {
        const carried = held === n;
        const home = STAMP_HOME[n];
        return (
          <div
            key={n}
            data-stamp={n}
            onPointerDown={(e) => pickUp(e, n)}
            className="absolute"
            style={{
              left: carried ? pos.x - STAMP_W / 2 : home.x,
              // A carried stamp lifts off the desk; pressing sets it back down.
              top: (carried ? pos.y - STAMP_H / 2 : home.y) - (carried && !pressing ? 14 : 0),
              width: STAMP_W,
              height: STAMP_H,
              // A carried stamp must not intercept its own hit-testing, or the
              // desk beneath it can never be identified as stampable.
              pointerEvents: enabled && !carried ? "auto" : "none",
              cursor: enabled && !carried ? "grab" : undefined,
              zIndex: carried ? 40 : 4,
              filter: carried ? "drop-shadow(0 16px 20px rgba(0,0,0,0.34))" : undefined,
              transition: "top 120ms ease-out",
            }}
          >
            <Stamp n={n} theme={theme} style={{ width: STAMP_W, height: STAMP_H }} />
            {/* Ink on the face, so a loaded stamp reads as loaded. Hidden
                while pressing: the stamp is face-down against the desk then,
                and drawing its face ink as well as the impression underneath
                put two copies of the artwork on screen at once. */}
            {carried && inked && !pressing ? (
              <StampImpression
                n={n}
                className="pointer-events-none absolute left-0 top-0"
                style={{ width: STAMP_W, height: STAMP_W, opacity: 0.9 }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
