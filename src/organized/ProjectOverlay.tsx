import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { BackControl } from "../pieces/BackControl";
import { CaseStudy } from "../pieces/CaseStudy";
import { sectionsFor } from "../pieces/caseStudySections";
import type { Theme } from "../pieces/Piece";
import type { Project } from "../pieces/projects";

/**
 * A case study opened from the Work grid.
 *
 * Same choreography as the folder's: the card's own rect grows into the page
 * while `chrome` unfolds the rail and body around a hero that never moves or
 * swaps — so it reads as one object opening rather than a modal appearing.
 *
 * With one deliberate difference. The folder sits at the centre of a fixed
 * scene, so growing from its rect barely moves vertically. A Work card can be
 * anywhere down a 6,700px page, and tweening `top` from wherever it happens to
 * be would fling the page up or down by thousands of pixels. So `top` is set
 * to its final value immediately and never animated: the card widens and grows
 * in place. Only `left`, `width` and `height` are tweened.
 */
const EXPAND_INSET = 12;
const EXPAND_DUR = 0.62;
const EXPAND_EASE = "power3.inOut";
/** The rail and body unfold over the last of the grow, so the page finishes
 *  exactly as the box lands — and fold away over the first of the shrink. */
const CROSSFADE = 0.55;

export function ProjectOverlay({
  project,
  theme,
  from,
  onClose,
}: {
  project: Project;
  theme: Theme;
  /** The clicked card, used as the box the page grows out of. */
  from: HTMLElement | null;
  onClose: () => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [chrome, setChrome] = useState(0);
  const chromeRef = useRef({ v: 0 });
  const closingRef = useRef(false);
  const originRef = useRef<DOMRect | null>(null);

  const viewportBox = () => ({
    left: EXPAND_INSET,
    top: EXPAND_INSET,
    width: window.innerWidth - EXPAND_INSET * 2,
    height: window.innerHeight - EXPAND_INSET * 2,
  });

  useLayoutEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const target = viewportBox();
    const r = from?.getBoundingClientRect() ?? null;
    originRef.current = r;

    if (!r || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, target);
      chromeRef.current.v = 1;
      setChrome(1);
      return;
    }

    // `top` is set, never tweened — see the note above.
    gsap.set(el, { top: target.top });
    gsap.fromTo(
      el,
      { left: r.left, width: r.width, height: r.height },
      { left: target.left, width: target.width, height: target.height, duration: EXPAND_DUR, ease: EXPAND_EASE },
    );
    gsap.to(chromeRef.current, {
      v: 1,
      duration: EXPAND_DUR * CROSSFADE,
      delay: EXPAND_DUR * (1 - CROSSFADE),
      ease: "none",
      onUpdate: () => setChrome(chromeRef.current.v),
    });
  }, [from]);

  const shrink = useCallback(() => {
    const el = pageRef.current;
    if (!el || closingRef.current) return;
    closingRef.current = true;

    const r = originRef.current;
    if (!r || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    gsap.to(chromeRef.current, {
      v: 0,
      duration: EXPAND_DUR * CROSSFADE,
      ease: "none",
      onUpdate: () => setChrome(chromeRef.current.v),
    });
    gsap.to(el, {
      left: r.left,
      width: r.width,
      height: r.height,
      duration: EXPAND_DUR,
      ease: EXPAND_EASE,
      onComplete: onClose,
    });
  }, [onClose]);

  // Lock the page behind the overlay, exactly as the folder does — same flag,
  // so the existing `body[data-project-open]` rule applies here too.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.projectOpen = "true";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.projectOpen;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") shrink();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shrink]);

  return createPortal(
    <div
      ref={pageRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.name} case study`}
      data-project-overlay
      className="z-[100] overflow-hidden"
      style={{
        position: "fixed",
        top: EXPAND_INSET,
        left: EXPAND_INSET,
        background: "#fdfeff",
        border: "2px solid #2f2f2f",
        borderRadius: 24,
        boxSizing: "border-box",
      }}
    >
      <div className="h-full w-full">
        <CaseStudy project={project} theme={theme} chrome={chrome} sections={sectionsFor(project.slug)} />
      </div>

      <BackControl
        onClick={shrink}
        aria-label={`Back To Home — close ${project.name} case study`}
      />
    </div>,
    document.body,
  );
}
