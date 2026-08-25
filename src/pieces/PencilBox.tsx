import { Pencil, type PencilColor } from "./Pencil";
import { SvgPiece, type Theme } from "./Piece";
import { useElementScale } from "./useElementScale";

const ALL_SLOTS: PencilColor[] = [
  "yellow", "orange", "red", "pink", "purple", "blue",
  "darkblue", "cyan", "green", "darkgreen", "black", "grey",
];

/** The pencils Scattered lays loose on the desk, so their wells sit empty. */
const DEFAULT_LOOSE: PencilColor[] = ["yellow", "darkblue", "darkgreen", "black"];

const BASE_WIDTH = 910;
const BASE_HEIGHT = 911;

export function PencilBox({
  theme,
  full = false,
  omit,
  className,
}: {
  theme: Theme;
  full?: boolean;
  /** Colours to leave out, for scenes that lay those pencils on the desk
   *  instead — otherwise the same pencil shows up twice. */
  omit?: readonly PencilColor[];
  className?: string;
}) {
  const missing = new Set<PencilColor>(omit ?? (full ? [] : DEFAULT_LOOSE));
  const { containerRef, scale } = useElementScale(BASE_WIDTH, BASE_HEIGHT);

  return (
    <div ref={containerRef} className={`relative h-full flex items-center justify-center ${className ?? ""}`}>
      <div
        className="relative"
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {/* Empty-well box art — the pencils are real <Pencil> elements
            overlaid below, so the filled variant would double them up. */}
        <SvgPiece
          src={`/assets/pencilbox_empty_${theme}.svg`}
          className="absolute inset-0 h-full w-full"
          alt="Pencil box"
        />
        <div className="absolute left-[32px] top-[34px] flex h-[842.562px] w-[846.277px] items-center justify-between gap-[16px]">
          {ALL_SLOTS.map((color, i) => (
            <div key={i} className="relative h-[842.562px] w-[55.523px]">
              {!missing.has(color) && (
                <Pencil
                  color={color}
                  theme={theme}
                  className="absolute left-1/2 top-1/2 h-[822.446px] w-[42.219px] -translate-x-1/2 -translate-y-1/2"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}