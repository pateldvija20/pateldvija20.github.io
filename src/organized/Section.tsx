import type { ReactNode } from "react";

/**
 * One Organised-mode section.
 *
 * Owns the page gutter, the scroll-snap target and the rule that closes the
 * section off.
 *
 * The gutter steps 30 / 60 / 60 / 100 rather than Figma's 30 / 60 / 100,
 * because between 1025 and 1511 the 250px sidebar is already taking its width
 * out of the same row: at 1025 a 100px gutter would leave the content column
 * around 575px. The full 100 arrives with the full 1512 frame it was drawn
 * against.
 *
 * `centred` is for the two sections whose content is shorter than a viewport
 * (About, How I See Things) — Figma gives both a full 982px frame with the
 * content sitting in the middle of it.
 */
export function Section({
  id,
  label,
  title,
  centred = false,
  children,
}: {
  id: string;
  /** Accessible name. Defaults to `title` when one is given. */
  label?: string;
  /** Visible heading, rendered in Roboto Slab, Title Case. Every section has
   *  one, so the page reads as a sequence of named parts rather than a run of
   *  unlabelled blocks. */
  title?: string;
  centred?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={label ?? title}
      // scroll-mt keeps a smooth-scrolled section clear of the sticky top bar
      // at the two widths that have one; the desktop sidebar is beside the
      // content, not over it, so it needs none.
      className={`scroll-mt-[95px] px-[30px] py-[30px] md:scroll-mt-[107px] md:px-[60px] md:py-[60px] lg:scroll-mt-0 xl:px-[100px] xl:py-[100px] ${
        centred ? "flex min-h-[100svh] flex-col justify-center" : ""
      }`}
      style={{
        // Proximity, not mandatory: Work and Archive are both several
        // viewports tall, and mandatory snapping would make the middle of a
        // long section impossible to rest on.
        scrollSnapAlign: "start",
        borderBottom: "1px solid color-mix(in srgb, var(--edge) 18%, transparent)",
      }}
    >
      {title ? (
        <div className={centred ? "mb-[60px]" : "mb-[40px] xl:mb-[60px]"}>
          <SectionHeading>{title}</SectionHeading>
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Section heading — Roboto Slab 40 (Figma 456:18830). */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-slab text-page capitalize" style={{ color: "var(--content)" }}>
      {children}
    </h2>
  );
}
