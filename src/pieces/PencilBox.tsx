import { Pencil, type PencilColor } from "./Pencil";
import { ALL_SLOTS } from "./pencilLayout";
import { SvgPiece, type Theme } from "./Piece";

/** The pencils Scattered lays loose on the desk, so their wells sit empty. */
const DEFAULT_LOOSE: PencilColor[] = ["yellow", "darkblue", "darkgreen", "black"];

const BASE_WIDTH = 910;
const BASE_HEIGHT = 911;

export function PencilBox({
  theme,
  full = false,
  omit,
  className,
  slots,
  onPencilPointerDown,
  onBoxPointerDown,
}: {
  theme: Theme;
  full?: boolean;
  /** Colours to leave out, for scenes that lay those pencils on the desk
   *  instead — otherwise the same pencil shows up twice. */
  omit?: readonly PencilColor[];
  className?: string;
  /** Explicit well occupancy, one entry per slot (null = empty). Overrides
   *  `full`/`omit`, which only ever describe the fixed default arrangement —
   *  scenes where pencils can be moved between wells pass this instead. */
  slots?: readonly (PencilColor | null)[];
  /** Set by scenes where a seated pencil can be pulled out of its well. */
  onPencilPointerDown?: (color: PencilColor, e: React.PointerEvent) => void;
  /** Set by scenes where the box itself can be picked up and moved. It hangs
   *  off the box's own footprint rather than the positioned wrapper, whose
   *  layout box runs ~100px wider than the art on every side — grabbing that
   *  margin would drag the box from empty desk. */
  onBoxPointerDown?: (e: React.PointerEvent) => void;
}) {
  const missing = new Set<PencilColor>(omit ?? (full ? [] : DEFAULT_LOOSE));
  const seated = slots ?? ALL_SLOTS.map((c) => (missing.has(c) ? null : c));

  return (
    <div className={`relative h-full flex items-center justify-center ${className ?? ""}`}>
      {/* Rendered at its authored size. The Scattered canvas already applies
          one `transform: scale(fit)` over the whole desk, so a piece that
          scales itself as well is scaled twice — which is what a
          since-removed `useElementScale` hook did here, shrinking this by
          (height - 200) / height for a 100px margin that means nothing
          inside a canvas. Every placement in `ScatteredScene` is solved
          against the authored size, so this stays 1:1. */}
      <div
        className="relative"
        data-pencil-box
        onPointerDown={onBoxPointerDown}
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          cursor: onBoxPointerDown ? "grab" : undefined,
          touchAction: onBoxPointerDown ? "none" : undefined,
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
          {ALL_SLOTS.map((_, i) => {
            const color = seated[i];
            return (
              <div
                key={i}
                data-pencil-slot={i}
                data-pencil-empty={color ? undefined : ""}
                className="relative h-[842.562px] w-[55.523px]"
              >
                {color && (
                  <Pencil
                    color={color}
                    theme={theme}
                    className="absolute left-1/2 top-1/2 h-[822.446px] w-[42.219px] -translate-x-1/2 -translate-y-1/2"
                    style={onPencilPointerDown ? { cursor: "grab", touchAction: "none" } : undefined}
                    onPointerDown={onPencilPointerDown && ((e) => onPencilPointerDown(color, e))}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
