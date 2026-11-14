import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { MASCOTS, MascotCard } from "../pieces/Mascots";
import { StickerSheet } from "../pieces/StickerSheet";
import type { PlayItem } from "./content";

/**
 * A Play item, opened. After dwijaxo.com/playground: the tile you clicked
 * grows to the centre of the screen over a faded page, with a close button at
 * the top right, and anything interactive inside it works there (the stickers
 * wiggle, the mascots follow your pointer).
 *
 * It grows from the tile's own rectangle, so it reads as that picture getting
 * bigger rather than a window appearing. Esc, the backdrop and the button all
 * close it, and focus goes back to the tile.
 */
export function PlayLightbox({ item, from, onClose }: { item: PlayItem; from: DOMRect; onClose: () => void }) {
  const backdrop = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The card's own transform that puts it back on top of the tile it came from.
  const toOrigin = () => {
    const el = card.current;
    if (!el) return { x: 0, y: 0, scale: 1 };
    gsap.set(el, { x: 0, y: 0, scale: 1 });
    const r = el.getBoundingClientRect();
    return {
      x: from.left + from.width / 2 - (r.left + r.width / 2),
      y: from.top + from.height / 2 - (r.top + r.height / 2),
      scale: Math.min(from.width / r.width, from.height / r.height, 1),
    };
  };

  useLayoutEffect(() => {
    if (reduce() || !card.current || !backdrop.current) return;
    gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    gsap.fromTo(card.current, { ...toOrigin(), opacity: 0.4 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.55, ease: "power3.out" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (reduce() || !card.current || !backdrop.current) return onClose();
    gsap.to(backdrop.current, { opacity: 0, duration: 0.3, ease: "power2.in" });
    gsap.to(card.current, { ...toOrigin(), opacity: 0, duration: 0.4, ease: "power3.in", onComplete: onClose });
  };

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={item.title} className="fixed inset-0 z-[95]" data-lightbox>
      <div
        ref={backdrop}
        onClick={close}
        className="absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--paper) 94%, transparent)", backdropFilter: "blur(8px)" }}
      />
      <button
        ref={closeBtn}
        type="button"
        onClick={close}
        aria-label="Close"
        data-cursor-frame="pill"
        className="absolute right-[16px] top-[16px] z-10 flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 md:right-[28px] md:top-[24px]"
        style={{ color: "var(--content)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto px-[16px] py-[72px] md:px-[60px]" onClick={close}>
        <div ref={card} onClick={(e) => e.stopPropagation()} className="flex max-w-full flex-col items-center gap-[16px]">
          <Piece item={item} />
          <div className="text-center">
            <p className="text-[15px] leading-[1.4]" style={{ color: "var(--content)" }}>
              {item.title}
            </p>
            <p className="text-[13px] leading-[1.4]" style={{ color: "var(--quiet)" }}>
              {item.meta}
              {item.kind === "stickers" ? " · Touch a sticker" : item.kind === "mascots" ? " · Hover a face" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** What is inside the lightbox: the live component, or the picture at full size. */
function Piece({ item }: { item: PlayItem }) {
  if (item.kind === "stickers") {
    return (
      <div className="w-[min(88vw,560px)]" style={{ maxHeight: "70vh" }}>
        <StickerSheet />
      </div>
    );
  }
  if (item.kind === "mascots") {
    return (
      <div className="w-[min(92vw,980px)] overflow-x-auto">
        <div className="flex min-w-[620px] items-stretch gap-[clamp(10px,1.6vw,22px)] md:min-w-0">
          {MASCOTS.map((m) => (
            <MascotCard key={m.role} m={m} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <img
      src={item.src}
      alt={item.title}
      draggable={false}
      className="block h-auto max-h-[72vh] w-auto max-w-[min(92vw,1000px)] select-none rounded-[12px] object-contain"
    />
  );
}
