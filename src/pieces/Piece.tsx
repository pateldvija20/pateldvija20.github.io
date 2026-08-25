import { forwardRef } from "react";

export type Theme = "light" | "dark";

type SvgPieceProps = {
  src: string;
  className?: string;
  alt?: string;
  draggable?: boolean;
  style?: React.CSSProperties;
};

/**
 * Shared wrapper for every exported piece SVG. The caller always owns
 * positioning/sizing via `className`/`style` — the asset itself carries no
 * default layout classes, so there's no "className swallows the visuals"
 * footgun (see docs/05-components.md).
 */
export const SvgPiece = forwardRef<HTMLImageElement, SvgPieceProps>(function SvgPiece(
  { src, className, alt = "", draggable = false, style },
  ref,
) {
  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      draggable={draggable}
      className={`pointer-events-auto block max-w-none select-none ${className ?? ""}`}
      style={style}
    />
  );
});
