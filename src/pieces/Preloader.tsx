import { useEffect, useState } from "react";
import type { Theme } from "./Piece";

/**
 * The preloader, per the Figma reference (node 449:17479 / 446:17461): a flat
 * ground in the theme's background colour, the count dead-centre in DM Mono
 * Medium, and a progress strip growing along the bottom edge from the left.
 * Content runs in the theme's ink — #2f2f2f on #fdfeff, or the reverse.
 */
export function Preloader({
  theme,
  onDone,
  duration = 1800,
}: {
  theme: Theme;
  onDone: () => void;
  /** Shorter on a mode switch than on the first-visit entrance. */
  duration?: number;
}) {
  const [pct, setPct] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const DURATION = duration;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Ease-out: quick to ~60, then a slower crawl to 100.
      const eased = 1 - Math.pow(1 - t, 2.2);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setLeaving(true);
        window.setTimeout(onDone, 550);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, duration]);

  const bg = theme === "light" ? "#fdfeff" : "#2f2f2f";
  const content = theme === "light" ? "#2f2f2f" : "#fdfeff";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[999] transition-opacity duration-500"
      style={{ background: bg, opacity: leaving ? 0 : 1 }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          color: content,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 500,
          fontSize: "24px",
          lineHeight: "normal",
        }}
      >
        {pct}%
      </div>
      {/* The strip hugs the bottom-left corner and fills across as the count
          climbs, hitting the full width exactly at 100%. */}
      <div
        className="absolute bottom-0 left-0"
        style={{ height: "18px", width: `${pct}%`, background: content }}
      />
    </div>
  );
}
