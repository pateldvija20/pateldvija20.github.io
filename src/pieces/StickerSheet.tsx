import stickerSheetRaw from "../assets/sticker-sheet.svg?raw";

/**
 * The HACKSVIT sticker sheet: each sticker is its own group in the SVG, and
 * wiggles when the pointer is over it. `interactive={false}` draws it still,
 * for a preview that is only a doorway to the real thing.
 */
export function StickerSheet({ interactive = true }: { interactive?: boolean }) {
  return (
    <div
      className="sticker-sheet relative w-full overflow-hidden"
      style={{ borderRadius: 16, aspectRatio: "620 / 640", pointerEvents: interactive ? "auto" : "none" }}
    >
      <style>{`
        .sticker-sheet svg { width: 100%; height: 100%; display: block; }
        .sticker-sheet svg > g { transform-box: fill-box; transform-origin: center; }
        .sticker-sheet svg > g:hover { animation: sticker-wiggle 0.42s ease-in-out; cursor: pointer; }
        @keyframes sticker-wiggle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-1.4deg) translateY(-2px); }
          50% { transform: rotate(1.4deg) translateY(-1px); }
          75% { transform: rotate(-0.9deg) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sticker-sheet svg > g:hover { animation: none; }
        }
      `}</style>
      <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: stickerSheetRaw }} />
    </div>
  );
}
