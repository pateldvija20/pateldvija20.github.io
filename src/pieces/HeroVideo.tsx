import { useEffect, useRef, useState } from "react";

/**
 * Bind Desk's hero: a silent loop recorded from the prototype (`scripts/video.mjs
 * loop` in bind-desk-prototype), in the prototype's own browser window, centred on
 * the project's backdrop with an even margin all round.
 *
 * The recording is 1150 x 676, the window's own shape, so it fills the frame with
 * nothing cropped. It only plays while on screen, and with reduced motion it holds
 * on the poster.
 */

const DIR = "/assets/projects/bind-desk/hero";
const RATIO = 1150 / 676;

export function HeroVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const v = ref.current;
    if (!v || reduce) return;
    // React does not always set the muted property, and unmuted video may not autoplay.
    v.muted = true;
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()),
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div className={`relative h-full w-full select-none overflow-hidden ${className}`} style={{ containerType: "size" }} aria-hidden>
      {/* As wide as the box allows while keeping an 11% margin above and below. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
        style={{
          width: `min(80cqw, ${78 * RATIO}cqh)`,
          aspectRatio: `${RATIO}`,
          borderRadius: 8,
          boxShadow: "0 1px 0 rgba(24, 25, 26, 0.06), 0 18px 48px -16px rgba(83, 62, 20, 0.28)",
          outline: "1px solid rgba(24, 25, 26, 0.08)",
          background: "#fbfaf7",
        }}
      >
        <video
          ref={ref}
          className="block h-full w-full object-cover"
          poster={`${DIR}/loop.jpg`}
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src={`${DIR}/loop.webm`} type="video/webm" />
          <source src={`${DIR}/loop.mp4`} type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
