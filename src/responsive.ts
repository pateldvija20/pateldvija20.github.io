/**
 * Responsive model
 * ================
 *
 * TWO SPATIAL MODELS, DELIBERATELY UNALIKE
 * ----------------------------------------
 * Organised is a document: real CSS layout, real breakpoints, a vertical
 * scroll. Its three authored widths are 1512 / 1024 / 440, and what changes
 * between them is column count and gutter — *not* type size. Figma sets the
 * nav link at 18px, the card meta at 18px and the card title at 24px at all
 * three widths, so the type scale is fixed and stepped rather than fluid.
 * clamp()-ing it would be engineering convenience overriding the design.
 *
 * Scattered is a composed illustration: a fixed 5313x3580 coordinate space
 * painted by one `transform: scale(fit)`. That gives proportional shrinking
 * of every font, gap and piece with no restructuring, which is right for a
 * drawing and wrong for a document. Piece coordinates must stay in canvas
 * px — never convert them to responsive units, and never let Organised
 * inherit the scaled space.
 *
 * BREAKPOINTS
 * -----------
 *   MOBILE   <= 767   single column, top nav
 *   TABLET   768-1024 two columns, top nav
 *   DESKTOP  >= 1025  sidebar nav, and the only range with Scattered
 *
 * 1024 belongs to the tablet experience, so Scattered starts at 1025. This
 * matches the boundary the retired blackout used (`min-[1025px]`).
 */

/** The Figma width the Organised page is authored against, and the cap past
 *  which its content centres instead of stretching. */
export const CONTENT_MAX_W = 1512;

/** Phone/tablet split. The one value not measured from a frame — it sits
 *  between the 1024 and 440 artboards and matches Tailwind's own `md`. */
export const MOBILE_BP = 767;

/** Tablet/desktop split. At and below this Scattered is unavailable. */
export const TABLET_BP = 1024;

/** Scattered mode requires a viewport strictly wider than TABLET_BP. */
export const SCATTER_MIN_W = TABLET_BP + 1;

/** True when the viewport can host Scattered mode at all. */
export const canScatter = (width: number) => width >= SCATTER_MIN_W;


/* ------------------------------------------------------------------ */
/* Scattered canvas                                                     */
/* ------------------------------------------------------------------ */

/** The window the Scattered canvas is scaled against (Figma's desk frame). */
export const DESIGN_W = 1729;

/* ------------------------------------------------------------------ */
/* Organised layout, per breakpoint — all measured from Figma            */
/* ------------------------------------------------------------------ */

export const ORGANISED = {
  desktop: { sidebar: 250, gutter: 100, work: 2, archive: 3, writing: 3 },
  tablet: { sidebar: 0, gutter: 60, work: 2, archive: 3, writing: 2 },
  mobile: { sidebar: 0, gutter: 30, work: 1, archive: 1, writing: 1 },
} as const;

/** Grid gutter between cards. 32 everywhere except the phone, which uses 30
 *  to match its page gutter. */
export const GRID_GAP = { desktop: 32, tablet: 32, mobile: 30 } as const;
