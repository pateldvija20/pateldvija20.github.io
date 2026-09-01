import { useCallback, useRef, useState } from "react";
import { ABOUT, ABOUT_PHOTOS } from "./content";
import { Section } from "./Section";

/* Polaroid geometry, Figma 456:18898. */
const FRAME_W = 483.862;
const FRAME_H = 557.933;
const FRAME_PAD = 30.782;
const FRAME_FOOT = 115.434;
const FRAME_RADIUS = 11.543;

/**
 * Resting pose per depth in the deck, front first. Figma's three rotations,
 * plus a small offset each so the ones behind peek out and the stack reads as
 * separate objects rather than one card.
 */
const DEPTHS = [
  { deg: 2.05, x: 0, y: 0 },
  { deg: -3.13, x: -10, y: 12 },
  { deg: 5.25, x: 8, y: 24 },
];
/** Where a card sits once it is past the visible part of the stack. */
const BURIED = { deg: 5.25, x: 8, y: 24 };
/** The flick: where the departing card travels before it drops to the back. */
const FLICK = { deg: -16, x: 150, y: -54 };
const DEAL_MS = 300;

function Polaroid({
  src,
  depth,
  dealing,
}: {
  src: string;
  /** 0 is the front of the deck. */
  depth: number;
  /** This card is currently being thrown to the back. */
  dealing: boolean;
}) {
  const pose = dealing ? FLICK : (DEPTHS[depth] ?? BURIED);
  const hidden = !dealing && depth >= DEPTHS.length;

  return (
    <div
      className="absolute left-1/2 top-1/2 origin-center"
      style={{
        width: FRAME_W,
        height: FRAME_H,
        transform: `translate(-50%, -50%) translate(${pose.x}px, ${pose.y}px) rotate(${pose.deg}deg)`,
        // A card in flight rides above everything; otherwise depth decides.
        zIndex: dealing ? 50 : DEPTHS.length - depth,
        // Cards past the visible three are parked at the back pose with no
        // opacity, so the one arriving into view fades up as it advances
        // rather than popping into existence.
        opacity: hidden ? 0 : 1,
        transition: `transform ${DEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${DEAL_MS}ms ease-out`,
        pointerEvents: "none",
      }}
    >
      <div
        className="flex h-full w-full flex-col items-start"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--edge)",
          borderRadius: FRAME_RADIUS,
          paddingTop: FRAME_PAD,
          paddingLeft: FRAME_PAD,
          paddingRight: FRAME_PAD,
          paddingBottom: FRAME_FOOT,
          boxShadow: depth === 0 && !dealing ? "0 10px 30px rgba(0,0,0,0.18)" : undefined,
        }}
      >
        <div
          className="relative min-h-0 w-full flex-1 overflow-hidden"
          style={{ border: "1px solid var(--edge)", borderRadius: FRAME_RADIUS }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-cover"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * About (Figma 456:18890).
 *
 * The photo stack is a real deck of physical cards. Clicking it throws the
 * front polaroid out and around to the back, and the one behind comes forward
 * to take its place.
 *
 * Each photo owns a DOM node for the life of the section, keyed by its own
 * source — so what animates is the *frame* travelling between depths. Keying
 * by slot instead would keep three fixed frames and swap the pictures inside
 * them, which reads as a slideshow, not a shuffle.
 *
 * Text and stack sit side by side only at the full 1512 frame. Between 1025
 * and 1511 the sidebar has already taken 250px out of the row, and Figma's
 * 478px text column plus a 503px stack cannot fit in what is left, so they
 * stack instead of being squeezed.
 */
export function AboutSection() {
  const [order, setOrder] = useState(ABOUT_PHOTOS);
  const [dealing, setDealing] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const deal = useCallback(() => {
    // Ignore clicks mid-throw, or the card in flight would be reordered out
    // from under its own animation.
    if (dealing) return;
    const front = order[0];
    setDealing(front);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      // Rotating the array moves the thrown card to the last depth. Its node
      // is keyed by src, so it stays mounted and glides from the flick pose
      // to the back of the deck instead of cutting.
      setOrder((o) => [...o.slice(1), o[0]]);
      setDealing(null);
    }, DEAL_MS);
  }, [dealing, order]);

  return (
    <Section id="about" title="About" centred>
      <div className="flex flex-col gap-[60px] xl:flex-row xl:items-center xl:gap-[80px]">
        <div className="flex flex-col gap-6 xl:max-w-[478px]">
          <h2 className="font-slab text-section" style={{ color: "var(--content)" }}>
            {ABOUT.heading}
          </h2>
          {ABOUT.paragraphs.map((p) => (
            <p key={p} className="text-2xl font-medium text-muted">
              {p}
            </p>
          ))}
        </div>

        {/* The stack is one composed object — the frames' rotations only read
            correctly at their design proportions — so it is scaled as a whole
            rather than re-laid-out. Figma sizes it 503 wide on desktop and
            tablet, 320 on the phone; those are the two scales. */}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={deal}
            aria-label="Shuffle to the next photo"
            className="relative h-[369px] w-[320px] cursor-pointer border-0 bg-transparent p-0 [--stack:0.661] focus-visible:outline-2 focus-visible:outline-offset-8 md:h-[581px] md:w-[503px] md:[--stack:1.0406]"
            style={{ outlineColor: "var(--content)" }}
          >
            <span
              className="absolute left-1/2 top-1/2 block"
              style={{
                width: FRAME_W,
                height: FRAME_H,
                transform: "translate(-50%, -50%) scale(var(--stack))",
              }}
            >
              {order.map((src, depth) => (
                <Polaroid key={src} src={src} depth={depth} dealing={dealing === src} />
              ))}
            </span>
          </button>
        </div>
      </div>
    </Section>
  );
}
