import { useCallback, useEffect, useRef, useState } from "react";
import SeasonTree, { seasonFor, type Season } from "./SeasonTree";
import { createAmbience, type Ambience } from "./ambience";

/**
 * The loading screen: lying under a tree, looking up at the sky through it,
 * with music and birds. Scrolling brings the visitor inside, into the room.
 *
 * The tree is in the season of the visitor's calendar: fall, winter, spring
 * or summer. `?season=` overrides it for previewing.
 *
 * The picture is a Higgsfield loop per season
 * (`/assets/room/loader/loop-<season>.*`), generated from a render of
 * <SeasonTree> as its start frame. Under it, always, is <SeasonTree> itself:
 * the fallback when the video is missing or motion is reduced, and the frame
 * the video cross-fades into on enter.
 *
 * Dark mode is dusk: a blue multiplied over the drawing and the video alike.
 */

const VIDEO = "/assets/room/loader/loop";

const SEASONS: Season[] = ["fall", "winter", "spring", "summer"];
const seasonFromUrl = (): Season => {
  const q = new URLSearchParams(window.location.search).get("season") as Season | null;
  return q && SEASONS.includes(q) ? q : seasonFor(new Date());
};
/** Shortest the loader stays up, so it never flashes on a warm cache. */
const MIN_SHOW = 1800;
/** Longest it waits on media before showing the prompt anyway. */
const MAX_WAIT = 6000;

type Phase = "loading" | "ready" | "entered";

export default function RoomLoader({ onEnter }: { onEnter?: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [videoOk, setVideoOk] = useState<boolean | null>(null);
  const [sound, setSound] = useState<"off" | "on" | "muted">("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambience = useRef<Ambience | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const [season] = useState(seasonFromUrl);
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    ambience.current = createAmbience();
    return () => ambience.current?.dispose();
  }, []);

  // Video: pick the format the browser plays, and settle on ok or not.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) {
      setVideoOk(false);
      return;
    }
    const onOk = () => setVideoOk(true);
    const onFail = () => setVideoOk(false);
    v.addEventListener("canplaythrough", onOk, { once: true });
    v.addEventListener("error", onFail, { once: true });
    v.src = `${VIDEO}-${season}.${v.canPlayType('video/webm; codecs="vp9"') ? "webm" : "mp4"}`;
    v.load();
    return () => {
      v.removeEventListener("canplaythrough", onOk);
      v.removeEventListener("error", onFail);
    };
  }, [reduced, season]);

  // Progress: time-based, held short of full until the media has settled.
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - t0;
      const settled = videoOk !== null;
      const target = settled ? Math.min(1, elapsed / MIN_SHOW) : Math.min(0.9, elapsed / MAX_WAIT);
      setProgress((p) => Math.max(p, target));
      if ((settled && elapsed >= MIN_SHOW) || elapsed >= MAX_WAIT) {
        setProgress(1);
        setPhase((p) => (p === "loading" ? "ready" : p));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoOk]);

  const startSound = useCallback(async () => {
    if (!ambience.current) return;
    if (await ambience.current.start()) setSound((s) => (s === "off" ? "on" : s));
  }, []);

  const enter = useCallback(() => {
    if (phaseRef.current !== "ready") return;
    setPhase("entered");
    onEnter?.();
  }, [onEnter]);

  // Scroll, swipe or key enters. Only a click, tap or key can start sound, so
  // those try it every time until it is playing; a wheel scroll just enters.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) enter();
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (touchY - e.touches[0].clientY > 24) enter();
    };
    const onGesture = (e: Event) => {
      // The sound button handles its own press.
      if ((e.target as Element | null)?.closest?.(".hl-sound")) return;
      void startSound();
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        void startSound();
        enter();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("touchend", onGesture);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchend", onGesture);
      window.removeEventListener("keydown", onKey);
    };
  }, [enter, startSound]);

  const toggleSound = async () => {
    if (sound === "off") return startSound();
    const next = sound === "on" ? "muted" : "on";
    ambience.current?.setMuted(next === "muted");
    setSound(next);
  };

  return (
    <div className="hl-loader" data-phase={phase} data-video={videoOk ? "on" : "off"}>
      <SeasonTree season={season} className="hl-loader-art" />
      <video ref={videoRef} className="hl-loader-video" muted loop autoPlay playsInline preload="auto" aria-hidden="true" />
      <div className="hl-dusk" />

      <div className="hl-loader-prompt" aria-live="polite">
        {phase === "loading" ? (
          <>
            <span className="hl-label">loading</span>
            <span className="hl-progress">
              <span style={{ transform: `scaleX(${progress})` }} />
            </span>
          </>
        ) : phase === "ready" ? (
          <button type="button" className="hl-label hl-scroll" onClick={() => enter()}>
            scroll
            <svg viewBox="0 0 12 8" aria-hidden="true">
              <path d="M1 1.5l5 5 5-5" />
            </svg>
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="hl-label hl-sound"
        onClick={(e) => {
          e.stopPropagation();
          void toggleSound();
        }}
        aria-pressed={sound === "on"}
      >
        {sound === "on" ? "sound on" : "sound off"}
      </button>
    </div>
  );
}
