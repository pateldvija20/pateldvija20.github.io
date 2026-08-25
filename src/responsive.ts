/**
 * Responsive model
 * ================
 *
 * FLUID ZONE (> TABLET_BP, i.e. 1729px design width down to 1025px)
 * ----------------------------------------------------------------
 * The desk is authored in a fixed 1729x1117 coordinate space and painted by a
 * single `transform: scale(fit)` on the stage. That already gives continuous,
 * proportional shrinking of every font, gap, padding and piece dimension with
 * no restructuring — which is what the fluid zone calls for.
 *
 * Deliberately NOT using per-property clamp()/vw inside the scene: it would
 * compose on top of the `fit` transform and double-scale, breaking the
 * Figma-exact geometry (positions and rotations are in 1729-space px).
 * clamp() is used only for the ControlBar, the one piece of chrome that lives
 * outside the scaled scene. Its curves interpolate linearly across the real
 * zone, hitting the exact Figma values at 1729px and their floors at 1025px.
 *
 * BREAKPOINTS
 * -----------
 *   TABLET_BP 1024px — iPad and below
 *   MOBILE_BP  430px — phones
 *
 * At and below TABLET_BP the app does not attempt a responsive layout at all:
 * `<SmallScreenBlock/>` blacks the screen out with a "still in progress"
 * notice. That is a deliberate stand-in for unfinished design work, not a
 * layout — so there is intentionally no mobile/iPad styling anywhere else in
 * the codebase, and MOBILE_BP is currently referenced only for messaging.
 */

/** The Figma design width the whole desk is authored against. */
export const DESIGN_W = 1729;

/** iPad breakpoint. At and below this the app blacks out (see below). */
export const TABLET_BP = 1024;

/** Phone breakpoint. Inside the blacked-out range; kept for when phone
 *  designs land and this range needs splitting. */
export const MOBILE_BP = 430;

/**
 * ⚠️  TODO: NOT PRODUCTION READY — mobile/iPad designs not authored yet.
 *
 * While this is true, `<SmallScreenBlock/>` fully covers the viewport at and
 * below TABLET_BP rather than shipping a half-finished responsive layout.
 *
 * Do not remove the blackout, this block, or this flag until the iPad and
 * phone breakpoint designs are explicitly signed off. Flipping this to
 * `false` is the single switch that retires the blackout — at which point
 * real breakpoint layouts must be built, because there are none today.
 */
export const WIP_BREAKPOINTS = true;
