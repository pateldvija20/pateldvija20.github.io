import { TABLET_BP, WIP_BREAKPOINTS } from "../responsive";

/**
 * ⚠️  TODO: NOT PRODUCTION READY — mobile/iPad designs not authored yet.
 *
 * Full blackout shown at <= 1024px instead of a half-finished responsive
 * layout. Covers everything, so nothing below the iPad breakpoint needs a
 * designed layout yet.
 *
 * Boundary is `min-[1025px]:hidden`, i.e. inclusive of 1024 — that width is
 * the iPad breakpoint itself, the very layout being flagged as unfinished.
 * (Tailwind's own `lg:` is min-width:1024px and would wrongly treat 1024 as
 * desktop.)
 *
 * Remove only when the iPad/phone designs are signed off — flip
 * WIP_BREAKPOINTS in src/responsive.ts.
 */
export function SmallScreenBlock() {
  if (!WIP_BREAKPOINTS) return null;

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-[#2f2f2f] px-8 text-center text-[#fdfeff] min-[1025px]:hidden"
    >
      <span className="text-[40px] leading-none" aria-hidden>
        ⚠️
      </span>
      <p className="max-w-[28ch] text-[18px] font-semibold leading-snug">
        Mobile &amp; iPad layouts are still in progress.
      </p>
      <p className="max-w-[32ch] text-[14px] leading-relaxed opacity-70">
        Please view this portfolio on a screen wider than {TABLET_BP}px.
      </p>
    </div>
  );
}
