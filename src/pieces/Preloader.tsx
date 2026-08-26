import { useEffect, useState } from "react";
import type { Theme } from "./Piece";

/**
 * The preloader: a quiet sheet with a counting percentage and a processing
 * strip, lifted straight from the reference frame. It owns the screen while
 * the desk warms up, counts to 100, then fades and hands over.
 *
 * Colours follow the site's two-tone rule — dark mode runs a #2f2f2f ground
 * with #fdfeff content, light mode the reverse.
 */
export function Preloader({ theme, onDone }: { theme: Theme; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const DURATION = 1800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // Ease-out: fast to ~60, then a slower crawl to 100.
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
  }, [onDone]);

  const bg = theme === "light" ? "#fdfeff" : "#2f2f2f";
  const content = theme === "light" ? "#2f2f2f" : "#fdfeff";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[999] flex items-center justify-center transition-opacity duration-500"
      style={{ background: bg, opacity: leaving ? 0 : 1 }}
    >
      {/* The sheet — the ground colour lifted one step toward the content
          colour, so it reads as a card without introducing a third tone. */}
      <div
        className="relative"
        style={{
          width: "min(78vw, 78vh * 1.45)",
          aspectRatio: "1.45 / 1",
          background: content,
          opacity: 0.05,
        }}
      >
        {/* Processing strip, flush with the sheet's bottom-left corner. */}
        <div
          className="absolute flex items-center"
          style={{ left: 0, bottom: 0, width: "29%", height: 12, background: content }}
        >
          <span
            className="whitespace-nowrap"
            style={{ color: bg, fontSize: 8, lineHeight: 1, paddingLeft: 2 }}
          >
            Processing request…
          </span>
        </div>
      </div>

      {/* The count — sitting just below the sheet's centre, as framed. */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: "56%",
          color: content,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: "clamp(80px, 9.5vw, 150px)",
          lineHeight: 1,
          letterSpacing: "0.01em",
        }}
      >
        {pct}%
      </div>
    </div>
  );
}
