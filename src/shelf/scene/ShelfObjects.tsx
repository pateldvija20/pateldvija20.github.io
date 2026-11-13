import type { ReactNode } from "react";
import { SHELF } from "./Room";
import { About, CaseStudies, Experiments, Notebooks, Resume } from "./objects/Books";
import { Pothos, SmilePilea, SnakePlant, WavyPilea } from "./objects/Plants";
import { Clock, Phone } from "./objects/Props";
import CoffeeCorner from "./CoffeeCorner";
import Model from "./Model";

/**
 * The main shelf's objects in Dvija's order (spec §5), left to right. The
 * coffee machine now lives in the coffee corner
 * (CoffeeCorner.tsx), after a gap at the right end. The bucket-hat lamp
 * figure was removed (Dvija, 10 Nov); `Lamp` is still in objects/Props.tsx. `width` is the
 * room each one takes on the shelf; they are laid out edge to edge with an
 * even gap and centred on the shelf.
 */
type Slot = { id: string; width: number; node: ReactNode };


/** The phone's red body in the approved pastel (colour table, 10 Nov). */
const PHONE_TINT = { red: "#E06F63", "red.001": "#E06F63" };

const SLOTS: Slot[] = [
  { id: "case-studies", width: 1.0, node: <CaseStudies /> },
  { id: "smile-pilea", width: 0.62, node: <SmilePilea /> },
  { id: "experiments", width: 1.16, node: <Experiments /> },
  { id: "about", width: 0.24, node: <About /> },
  { id: "snake-plant", width: 0.66, node: <SnakePlant /> },
  { id: "clock", width: 0.96, node: <Clock /> },
  { id: "resume", width: 0.94, node: <Resume /> },
  { id: "notebooks", width: 1.25, node: <Notebooks /> },
  { id: "pothos", width: 0.72, node: <Pothos /> },
  { id: "phone", width: 1.45, node: <Model src="/models/phone.glb" height={0.6} fallback={<Phone />} tint={PHONE_TINT} /> },
  { id: "wavy-pilea", width: 0.62, node: <WavyPilea /> },
];

/** Tight, as in the size references: objects nearly touch, like a real shelf. */
const GAP = 0.16;
const total = SLOTS.reduce((s, o) => s + o.width, 0) + GAP * (SLOTS.length - 1);

/** Where each object stands, centred on the shelf. Exported for the camera and labels. */
export const LAYOUT = (() => {
  let x = -total / 2;
  return SLOTS.map((o) => {
    const cx = x + o.width / 2;
    x += o.width + GAP;
    return { ...o, x: cx };
  });
})();

/** The middle of the shelf's depth, where objects stand. */
const STAND_Z = 0.38;

export default function ShelfObjects() {
  return (
    <group position={[0, SHELF.top, STAND_Z]}>
      {LAYOUT.map((o) => (
        <group key={o.id} position={[o.x, 0, 0]} name={o.id}>
          {o.node}
        </group>
      ))}
      <CoffeeCorner />
    </group>
  );
}
