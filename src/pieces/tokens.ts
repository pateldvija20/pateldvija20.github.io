/**
 * Design tokens, as the code uses them.
 *
 * Names follow design-system convention (category-role, as in the W3C design
 * tokens format and Material / Carbon / Polaris) and the scales are Tailwind's.
 * Colour, space, radius, border and weight are CSS variables defined for both
 * modes in `index.css`; type is a set of roles, defined here, because a role is
 * a size, a line height, a weight and a tracking together.
 *
 * The UI inspector (`src/dev/Inspector.tsx`) reads this file to say which token
 * a value is, so keep the two in step.
 */

/** Colour roles, as CSS variables (light and dark values live in index.css). */
export const COLOR = {
  surfacePage: "var(--color-surface-page)",
  surfaceRaised: "var(--color-surface-raised)",
  surfaceSunken: "var(--color-surface-sunken)",
  surfaceMedia: "var(--color-surface-media)",
  borderSubtle: "var(--color-border-subtle)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  actionBg: "var(--color-action-bg)",
  actionFg: "var(--color-action-fg)",
} as const;

/** The CSS variable behind each colour token, for the inspector. */
export const COLOR_VARS: Record<string, string> = {
  "surface-page": "--color-surface-page",
  "surface-raised": "--color-surface-raised",
  "surface-sunken": "--color-surface-sunken",
  "surface-media": "--color-surface-media",
  "border-subtle": "--color-border-subtle",
  "text-primary": "--color-text-primary",
  "text-secondary": "--color-text-secondary",
};

/** Space: Tailwind's scale on a 4px base. `space-N` is N x 4px. */
export const SPACE: Record<number, string> = {
  4: "space-1",
  8: "space-2",
  12: "space-3",
  16: "space-4",
  24: "space-6",
  32: "space-8",
  40: "space-10",
  48: "space-12",
  64: "space-16",
  128: "space-32",
};

export const RADIUS: Record<number, string> = { 4: "radius-sm", 12: "radius-lg", 9999: "radius-full" };

export const BORDER: Record<number, string> = { 1: "border-1", 2: "border-2" };

export const WEIGHT: Record<number, string> = { 400: "regular", 500: "medium", 600: "semibold" };

/**
 * Type roles, after Material's type scale. A role is size / line height /
 * weight. Classes are what components use; `TYPE_ROLES` is what the inspector
 * matches against.
 */
export const TYPE = {
  display: "font-['Roboto_Slab'] font-normal text-[28px] leading-[30.8px]",
  headline: "text-[22px] font-medium leading-[28.6px] tracking-[-0.2px]",
  title: "text-[18px] font-medium leading-[27px]",
  body: "text-[16px] leading-[22.4px]",
  bodySm: "text-[14px] leading-[19.6px]",
} as const;

/** Overline: the mono caps label above sections and blocks. */
export const OVERLINE = {
  fontFamily: "'DM Mono', monospace",
  fontWeight: 400,
  fontSize: 15,
  lineHeight: "18.4px",
  letterSpacing: "0.4px",
} as const;

export const TYPE_ROLES: { name: string; size: number; line: number }[] = [
  { name: "display", size: 28, line: 30.8 },
  { name: "headline", size: 22, line: 28.6 },
  { name: "title", size: 18, line: 27 },
  { name: "body", size: 16, line: 22.4 },
  { name: "overline", size: 15, line: 18.4 },
  { name: "body-sm", size: 14, line: 19.6 },
];
