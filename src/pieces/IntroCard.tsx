import type { Theme } from "./Piece";
import { INTRO } from "../organized/content";

/**
 * The gradient card the desk opens on.
 *
 * Built from real text rather than from `intro_card_<theme>.svg`, which is how
 * it used to be drawn. That export has its type converted to outlines, so the
 * words were unreachable — the card read "Product Desiger", and the only way to
 * fix a typo was to reopen Figma and re-export a 78KB asset. The copy is now
 * the same `INTRO` the Work section introduces itself with, so the desk and the
 * document cannot drift apart, and the card becomes selectable and legible to a
 * screen reader into the bargain.
 *
 * Only the background is still artwork: `intro_card_blob.svg`, the two blurred
 * gradient strokes the export was built on. It was already committed and
 * unused, and it stretches (`preserveAspectRatio="none"`), so it fills the card
 * at any size.
 *
 * The card does not invert with the desk. It is a printed gradient card and
 * keeps its own colours in both themes, exactly as the export did.
 */

/** Figma's card, in canvas units — the size `ScatteredScene` places it at. */
export const INTRO_CARD_W = 630;
export const INTRO_CARD_H = 386;

export function IntroCard({ theme, className }: { theme: Theme; className?: string }) {
  // Still taken, so the call site does not have to know that this particular
  // piece is the one that ignores it.
  void theme;
  return (
    <div
      className={`relative select-none overflow-hidden ${className ?? ""}`}
      style={{
        width: INTRO_CARD_W,
        height: INTRO_CARD_H,
        borderRadius: 24,
        // The ground the blurred strokes sit on, from the export's own palette.
        background: "#ff5a3d",
        color: "#fdfeff",
      }}
    >
      <img
        src="/assets/intro_card_blob.svg"
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      <div className="relative flex h-full w-full flex-col justify-between" style={{ padding: 44 }}>
        <p
          className="font-sans"
          style={{ fontSize: 30, fontWeight: 600, letterSpacing: 0.3, lineHeight: 1.1 }}
        >
          {INTRO.greeting}
        </p>

        {/* Indented and set in mono, as the export had it — the aside on the
            card rather than its headline. */}
        <p
          className="font-mono"
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            letterSpacing: 0.15,
            maxWidth: "62%",
            marginLeft: "auto",
            marginTop: -18,
          }}
        >
          {INTRO.cardAside}
        </p>

        <p
          className="font-slab"
          style={{ fontSize: 62, fontWeight: 400, letterSpacing: 0.5, lineHeight: 1 }}
        >
          {INTRO.role}
        </p>
      </div>
    </div>
  );
}
