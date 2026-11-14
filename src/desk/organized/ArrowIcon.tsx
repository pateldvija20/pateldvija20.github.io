/**
 * The outbound arrow (↗) used by the writing cards and the résumé's social
 * links. Drawn here rather than exported: it is a two-stroke glyph at a single
 * size, and keeping it as markup lets it inherit `currentColor` and animate
 * on hover with the link it belongs to.
 *
 * 26.85px is Figma's size (456:18353).
 */
export function ArrowIcon({ size = 26.85 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </svg>
  );
}
