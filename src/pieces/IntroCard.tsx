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

      {/*
        Placed, not stacked.

        The three blocks sit at the coordinates the export puts them at, read
        back out of `intro_card_dark.svg` by mounting it and measuring the ink:
        the greeting at 42,49; the aside at 290,148 in a 286-wide column; the
        role at 110,278. A padded flex column looked like the same card and
        was not — it spread the blocks to the edges evenly, losing the indent
        on the role and the way the aside hangs off to the right of centre,
        which is most of the card's character.
      */}
      <p
        className="absolute font-sans"
        style={{ left: 42, top: 47, fontSize: 30, fontWeight: 600, letterSpacing: 0.3, lineHeight: 1.1 }}
      >
        {INTRO.greeting}
      </p>

      <p
        className="absolute font-mono"
        style={{ left: 290, top: 145, width: 286, fontSize: 15, lineHeight: 1.53, letterSpacing: 0.15 }}
      >
        {INTRO.cardAside}
      </p>

      <p
        className="absolute font-slab"
        style={{ left: 110, top: 272, fontSize: 60, fontWeight: 400, letterSpacing: 0.4, lineHeight: 1.05 }}
      >
        {INTRO.role}
      </p>
    </div>
  );
}
