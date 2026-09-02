import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "./Piece";
import { useLiveScale } from "./ScatteredFocus";
import {
  FACE_CX,
  FACE_CY,
  IMPRESSION_H,
  IMPRESSION_W,
  InkPad,
  INKPAD_H,
  INKPAD_W,
  Stamp,
  StampImpression,
  STAMP_H,
  STAMP_W,
} from "./Stamp";

/**
 * The ink pad and the rubber stamp.
 *
 * State machine, in the order the visitor meets it:
 *
 *   idle ──click the stamp──▶ held ──click over the pad──▶ inked
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

/**
 * Below this a press is a slip — a pointer that went down and up without the
 * visitor meaning it — and leaves nothing.
 *
 * Deliberately shorter than a click. This used to be 120ms, which is longer
 * than an ordinary mouse click (60-100ms): someone who clicked the desk the
 * way they click everything else got no mark, no feedback, and a stamp that
 * still looked inked, which is indistinguishable from the feature being
 * broken. The gesture is "press to stamp, hold to press harder" — so a plain
 * click has to leave the lightest mark rather than nothing at all.
 */
const MIN_PRESS = 45;
/** Full-strength ink. Longer presses do not go darker. */
const MAX_PRESS = 1200;
const MIN_DENSITY = 0.22;


/** Impressions are transient, but a long session should not grow DOM without
 *  limit. Oldest fades out first, well past what exploring produces. */
const MAX_IMPRESSIONS = 60;

/**
 * Placements from the Scattered frame (458:45201), in canvas units.
 *
 * The pad is square to the desk — `Frame 48096044`'s box has exactly the
 * pad's own 701:424 proportions, so there is no rotation in it. The two
 * stamps are tilted; each angle is solved from its box against the stamp's
 * 154x178 body. A stamp straightens as it is picked up, which is what the
 * `carried` branch below does by simply not applying the tilt.
 */
const INKPAD = { x: 1988.6, y: 1835.2 };
/**
 * Where the stamp rests, at the ink pad's top right.
 *
 * One stamp. The frame drew two and the export ships a single body, so the
 * second was the same block a second time — which read as a duplicate rather
 * than as a pair. With only one on the desk there is nothing to identify:
 * what is in hand is a boolean, not an index.
 */
const STAMP_HOME = { x: 2791.4, y: 1821.6, deg: -10.35 };

type Impression = { id: number; x: number; y: number; density: number };

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
  const [held, setHeld] = useState(false);
  const [inked, setInked] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [impressions, setImpressions] = useState<Impression[]>([]);
  /** Press start time, or null when not pressing. Also drives the live preview. */
  const [pressStart, setPressStart] = useState<number | null>(null);
  const [preview, setPreview] = useState(0);
  const nextId = useRef(1);
  /** Live, because a stamp can be carried while the camera is still moving —
   *  the settled `scale` prop is stale for the whole of a focus tween. */
  const liveScale = useLiveScale(scale);

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
  const heldRef = useRef(false);
  const inkedRef = useRef(false);
  const pressRef = useRef<number | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const setHeldBoth = useCallback((v: boolean) => {
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
      const s = liveScale();
      return { x: (clientX - r.left) / s, y: (clientY - r.top) / s };
    },
    [liveScale],
  );

  /** Where the inked face is, given where the pointer is. The block is
   *  centred on the pointer; its face is not centred on the block. */
  const faceAt = useCallback(
    (p: { x: number; y: number }) => ({
      x: p.x + STAMP_W * (FACE_CX - 0.5),
      y: p.y + STAMP_H * (FACE_CY - 0.5),
    }),
    [],
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
      const s = liveScale();
      if (p.x < 0 || p.y < 0 || p.x > r.width / s || p.y > r.height / s) return false;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (el?.closest("button, a, [role='dialog'], [data-no-stamp]")) return false;
      return true;
    },
    [toCanvas, liveScale],
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
        setHeldBoth(false);
        return;
      }
      if (!stampable(e)) {
        // Not a surface that takes ink. The stamp stays in hand: dropping it
        // here also threw the ink away, so a press that happened to land on a
        // control cost the visitor the whole set-up and looked like the stamp
        // had simply stopped working. Escape still puts it down.
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
      if (!heldRef.current) return;
      const at = faceAt(posRef.current);
      const density = densityFor(elapsed);
      setImpressions((list) => {
        const next = [...list, { id: nextId.current++, x: at.x, y: at.y, density }];
        return next.length > MAX_IMPRESSIONS ? next.slice(next.length - MAX_IMPRESSIONS) : next;
      });
      setInkedBoth(false); // re-ink before every impression
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setHeldBoth(false);
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
  }, [held, toCanvas, overPad, stampable, faceAt, setHeldBoth, setInkedBoth, setPressBoth, setPosBoth]);

  const pickUp = (e: React.PointerEvent) => {
    if (!enabled || held) return;
    e.stopPropagation();
    // Guarded on `held` rather than swapping: with one stamp on the desk,
    // a press while it is already in hand is a press *through* it at the desk
    // underneath, and picking it up again would reset the ink mid-gesture.
    setPosBoth(toCanvas(e.clientX, e.clientY));
    setHeldBoth(true);
    setInkedBoth(false);
    setPressBoth(null);
  };

  const pressing = pressStart !== null;

  return (
    // An explicit z-index here creates a stacking context, so the 1-40 used
    // below are private to the stamps and cannot collide with the desk's
    // scale: 1 pad, 2 impressions, 3 the live preview, 4 the stamps at rest,
    // 40 a carried stamp.
    <div ref={rootRef} className="pointer-events-none absolute inset-0" style={{ zIndex: z }}>
      {/* Marks sit on top of the pad, not under it: a press that lands on the
          pad is ink on the pad's face, and hiding it there made the pad look
          like it had swallowed the stamp. */}
      {impressions.map((im) => (
        <StampImpression
          key={im.id}
          theme={theme}
          className="pointer-events-none absolute"
          style={{
            left: im.x - IMPRESSION_W / 2,
            top: im.y - IMPRESSION_H / 2,
            width: IMPRESSION_W,
            height: IMPRESSION_H,
            opacity: im.density,
            zIndex: 2,
          }}
        />
      ))}

      {/* The pad is the floor of this context — everything the stamps do
          happens above it. */}
      <div className="pointer-events-none absolute" style={{ left: INKPAD.x, top: INKPAD.y, zIndex: 1 }}>
        <InkPad theme={theme} style={{ width: INKPAD_W, height: INKPAD_H }} />
      </div>

      {/* The live mark under a press, so the density is visible while it builds. */}
      {pressing && held ? (
        <StampImpression
          theme={theme}
          className="pointer-events-none absolute"
          style={{
            left: faceAt(pos).x - IMPRESSION_W / 2,
            top: faceAt(pos).y - IMPRESSION_H / 2,
            width: IMPRESSION_W,
            height: IMPRESSION_H,
            opacity: preview,
            zIndex: 3,
          }}
        />
      ) : null}

      {/* What to do with the thing now in your hand.
          The stamps carry no affordance of their own — a rubber stamp looks
          like a rubber stamp — so the two-step gesture (ink it, then press and
          hold) was something a visitor had to already know. It rides under the
          carried stamp and names whichever step is next. */}
      {held && !pressing ? (
        <div
          className="pointer-events-none absolute flex items-center whitespace-nowrap"
          style={{
            left: pos.x,
            top: pos.y + STAMP_H / 2 + 16,
            transform: "translate(-50%, 0)",
            padding: "7px 12px",
            borderRadius: 8,
            background: "rgba(24,25,26,0.9)",
            color: "#fdfeff",
            fontSize: 21,
            lineHeight: 1,
            fontWeight: 500,
            zIndex: 41,
          }}
        >
          {inked ? "Press and hold to stamp" : "Press the ink pad to load it"}
        </div>
      ) : null}

      <div
        data-stamp=""
        onPointerDown={pickUp}
        className="absolute"
        style={{
          left: held ? pos.x - STAMP_W / 2 : STAMP_HOME.x,
          // A carried stamp lifts off the desk; pressing sets it back down.
          top:
            (held ? pos.y - STAMP_H / 2 : STAMP_HOME.y) -
            (held && !pressing ? 14 : 0),
          width: STAMP_W,
          height: STAMP_H,
          // A carried stamp must not intercept its own hit-testing, or the
          // desk beneath it can never be identified as stampable.
          pointerEvents: enabled && !held ? "auto" : "none",
          cursor: enabled && !held ? "grab" : undefined,
          zIndex: held ? 40 : 4,
          // Square in the hand, tilted at rest: the frame lays the stamp
          // down at an angle, and a stamp you are holding over the desk is
          // one you have straightened up to press.
          transform: held ? undefined : `rotate(${STAMP_HOME.deg}deg)`,
          filter: held ? "drop-shadow(0 16px 20px rgba(0,0,0,0.34))" : undefined,
          transition: "top 120ms ease-out",
        }}
      >
        <Stamp theme={theme} style={{ width: STAMP_W, height: STAMP_H }} />
        {/* Ink on the face, so a loaded stamp reads as loaded. Hidden
            while pressing: the stamp is face-down against the desk then,
            and drawing its face ink as well as the impression underneath
            put two copies of the artwork on screen at once. */}
        {held && inked && !pressing ? (
          <StampImpression
            theme={theme}
            className="pointer-events-none absolute"
            style={{
              left: STAMP_W * FACE_CX - IMPRESSION_W / 2,
              top: STAMP_H * FACE_CY - IMPRESSION_H / 2,
              width: IMPRESSION_W,
              height: IMPRESSION_H,
              opacity: 0.9,
            }}
          />
        ) : null}
      </div>

    </div>
  );
}
