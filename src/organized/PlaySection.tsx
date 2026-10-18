import { PLAY, type PlayItem } from "./content";
import { Section } from "./Section";

/**
 * Play, after madhurima.me/play: a two-column masonry of tiles, each a framed
 * picture with a title and a "type · tool" line under it. Columns rather than
 * a grid, so tiles keep their own heights and the two columns interleave.
 *
 * The first tile is the door to the desk. On a screen wide enough for
 * Scattered mode it switches to it; below that it is a picture like the rest,
 * since the desk is not available there.
 *
 * Line drawings ship a light and a dark file; both are mounted and CSS shows
 * the one matching the theme (`.art-light` / `.art-dark` in index.css), so a
 * theme switch never waits on a fetch.
 */
function Tile({ item, onEnterPlayground }: { item: PlayItem; onEnterPlayground?: () => void }) {
  const picture = (
    <>
      <div
        className={`flex w-full items-center justify-center overflow-hidden rounded-[4px] ${item.bleed ? "" : "p-[24px]"}`}
        style={{ border: "1px solid color-mix(in srgb, var(--rule) 45%, transparent)" }}
      >
        <img
          src={item.src}
          alt=""
          draggable={false}
          className={`h-auto w-full select-none transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none ${item.srcDark ? "art-light" : ""}`}
        />
        {item.srcDark ? (
          <img
            src={item.srcDark}
            alt=""
            draggable={false}
            className="art-dark h-auto w-full select-none transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        ) : null}
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

  const shell = "group mb-[28px] flex w-full break-inside-avoid flex-col";
  if (item.playground && onEnterPlayground) {
    return (
      <button
        type="button"
        onClick={onEnterPlayground}
        data-cursor="Open playground"
        className={`${shell} cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4`}
        style={{ outlineColor: "var(--content)" }}
      >
        {picture}
      </button>
    );
  }
  return <div className={shell}>{picture}</div>;
}

export function PlaySection({ onEnterPlayground }: { onEnterPlayground?: () => void }) {
  return (
    <Section id="play" title="Play">
      <div className="columns-1 gap-[24px] md:columns-2">
        {PLAY.map((item) => (
          <Tile key={item.title} item={item} onEnterPlayground={onEnterPlayground} />
        ))}
      </div>
    </Section>
  );
}
