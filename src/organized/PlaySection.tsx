import { useRef, useState } from "react";
import { FadeImg } from "./FadeImg";
import { PLAY, type PlayItem } from "./content";
import { PlayLightbox } from "./PlayLightbox";
import { Section } from "./Section";
import { MASCOTS, MascotCard } from "../pieces/Mascots";
import { StickerSheet } from "../pieces/StickerSheet";

/**
 * Play: a two-column masonry of tiles, each a framed picture with a title and
 * a "type · tool" line under it. Columns rather than a grid, so tiles keep
 * their own heights and the two columns interleave.
 *
 * Clicking a tile opens it in the centre of the screen over a faded page
 * (after dwijaxo.com/playground), where anything interactive works: the
 * stickers wiggle and the mascots follow your pointer. In the grid those are
 * shown still, so the whole tile is one click target.
 *
 * The first tile is the door to the desk. On a screen wide enough for
 * Scattered mode it switches to it; below that it is a picture like the rest,
 * since the desk is not available there.
 *
 * Line drawings ship a light and a dark file; both are mounted and CSS shows
 * the one matching the theme (`.art-light` / `.art-dark` in index.css), so a
 * theme switch never waits on a fetch.
 */
function Preview({ item }: { item: PlayItem }) {
  if (item.kind === "stickers") return <StickerSheet interactive={false} />;
  if (item.kind === "mascots") {
    return (
      <div className="pointer-events-none flex w-full items-stretch gap-[8px]">
        {MASCOTS.map((m) => (
          <MascotCard key={m.role} m={m} />
        ))}
      </div>
    );
  }
  if (item.tall) {
    // A portrait poster at full column width runs 700px tall; here it is held
    // to 420px, centred in its frame.
    return (
      <FadeImg
        src={item.src}
        alt=""
        draggable={false}
        className="h-auto max-h-[420px] w-auto max-w-full select-none rounded-[8px] transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
      />
    );
  }
  return (
    <>
      <FadeImg
        src={item.src}
        alt=""
        draggable={false}
        className={`h-auto w-full select-none transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none ${item.srcDark ? "art-light" : ""}`}
      />
      {item.srcDark ? (
        <FadeImg
          src={item.srcDark}
          alt=""
          draggable={false}
          className="art-dark h-auto w-full select-none transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
        />
      ) : null}
    </>
  );
}

function Tile({ item, onOpen, onEnterPlayground }: { item: PlayItem; onOpen: (item: PlayItem, rect: DOMRect) => void; onEnterPlayground?: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const framed = item.kind === "stickers" || item.kind === "mascots";
  const picture = (
    <>
      <div
        ref={frame}
        className={`flex w-full items-center justify-center overflow-hidden rounded-[12px] ${item.bleed ? "" : "p-[24px]"}`}
        style={{
          border: "1px solid color-mix(in srgb, var(--rule) 45%, transparent)",
          // A picture that does not fill its frame sits on a soft grey (the
          // theme's `--tint`: #eeeeef in light, #333333 in dark), not on the page.
          background: item.bleed ? undefined : "var(--tint)",
        }}
      >
        <Preview item={item} />
      </div>
      <div className="flex flex-col gap-[2px] pt-[10px] text-left">
        <p className="text-[15px] leading-[1.4]" style={{ color: "var(--content)" }}>
          {item.title}
        </p>
        <p className="text-[13px] leading-[1.4]" style={{ color: "var(--quiet)" }}>
          {item.meta}
        </p>
      </div>
    </>
  );

  const shell = "group mb-[32px] flex w-full break-inside-avoid flex-col";
  const button = `${shell} cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4`;
  if (item.playground && onEnterPlayground) {
    return (
      <button type="button" onClick={onEnterPlayground} data-cursor="Open playground" className={button} style={{ outlineColor: "var(--content)" }}>
        {picture}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => frame.current && onOpen(item, frame.current.getBoundingClientRect())}
      data-cursor={framed ? "Play with it" : "Open"}
      className={button}
      style={{ outlineColor: "var(--content)" }}
    >
      {picture}
    </button>
  );
}

export function PlaySection({ onEnterPlayground }: { onEnterPlayground?: () => void }) {
  const [open, setOpen] = useState<{ item: PlayItem; rect: DOMRect } | null>(null);
  return (
    <Section id="play" title="Play">
      <div className="columns-1 gap-[16px] md:columns-2">
        {PLAY.map((item) => (
          <Tile key={item.title} item={item} onOpen={(i, rect) => setOpen({ item: i, rect })} onEnterPlayground={onEnterPlayground} />
        ))}
      </div>
      {open ? <PlayLightbox item={open.item} from={open.rect} onClose={() => setOpen(null)} /> : null}
    </Section>
  );
}
