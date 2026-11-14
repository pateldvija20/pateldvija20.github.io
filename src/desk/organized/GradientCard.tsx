import { ArrowIcon } from "./ArrowIcon";
import type { WritingCard } from "./content";

/**
 * A writing card (Figma 456:18350).
 *
 * Shared deliberately: the Organised page's "How I See Things" row and the
 * About book's last spread show the same three cards, so this is built once
 * and used twice.
 *
 * The mesh gradient is an exported asset — a Figma mesh cannot be reproduced
 * faithfully in CSS — laid full-bleed under the card's own ember ground.
 * The 4px bottom rule is Figma's; it reads as the card's thickness.
 */
export function GradientCard({ card }: { card: WritingCard }) {
  const inner = (
    <>
      <img
        src={card.mesh}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      <div className="relative flex w-full items-end justify-between gap-4">
        {/* Ink, not the muted grey Figma shows. That grey is the placeholder
            colour used for unwritten copy throughout these frames, and on a
            bright mesh it is close to illegible — the card's own arrow, which
            was exported with its real colour, is this ink. */}
        <p className="flex-1 text-2xl font-medium" style={{ color: "var(--color-ink)" }}>
          {card.title}
        </p>
        <span style={{ color: "var(--color-ink)" }}>
          <ArrowIcon />
        </span>
      </div>
    </>
  );

  const shell =
    "relative flex aspect-square w-full flex-col justify-end overflow-hidden bg-ember p-[30px]";
  const edge = {
    borderRadius: 24,
    border: "1px solid var(--edge)",
    borderBottomWidth: 4,
  } as const;

  // No href yet on any of the three cards, so they render as tiles rather
  // than as links that go nowhere.
  if (!card.href) {
    return (
      <div className={shell} style={edge}>
        {inner}
      </div>
    );
  }

  return (
    <a
      href={card.href}
      target="_blank"
      rel="noreferrer"
      className={`${shell} transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transform-none motion-reduce:transition-none`}
      style={{ ...edge, outlineColor: "var(--content)" }}
    >
      {inner}
    </a>
  );
}
