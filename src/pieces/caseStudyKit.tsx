import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "./Button";
import { MONO } from "./caseStudyBits";
import { COLOR, OVERLINE, TYPE } from "./tokens";

/**
 * The Bind Desk case study's parts, made reusable: full-bleed bands, looping
 * clips, the first version / now switch, the facts row, next step cards and a
 * hero loop. A case study that follows the Bind Desk model builds its sections
 * from these, so every page shares one type scale and one set of surfaces.
 *
 * The page's text rules, top to bottom:
 *   section label  mono caps 15px (LABEL), 12px above the section's content
 *   page title     slab 28px (TITLE)
 *   subsection     sans 22px medium (STATEMENT), 32px above what it introduces
 *   lead statement sans 18px medium (H3), the opening line of a band
 *   item title     sans 16px medium (H4), a card's or row's name
 *   body           sans 16px (MD), paragraphs
 *   small          sans 14px (SM), captions, card text, facts
 *   item label     mono caps 12px (ITEM_LABEL), labels inside a section
 */

export const SURFACE = COLOR.surfaceRaised;
export const WELL = COLOR.surfaceSunken;
export const PAGE = COLOR.surfacePage;
export const INK = COLOR.textPrimary;
export const MUTED = COLOR.textSecondary;
export const DIVIDER = COLOR.borderSubtle;
export const YES = COLOR.statusPositive;
export const NO = COLOR.statusNegative;

export const MD = TYPE.body;
export const SM = TYPE.bodySm;
export const STATEMENT = TYPE.headline;
export const H3 = TYPE.title;
export const H4 = `${TYPE.body} font-medium`;
export const TITLE = TYPE.display;
export const LABEL = OVERLINE;
export const ITEM_LABEL = { ...OVERLINE, fontSize: 12 };

export const ink = { color: INK };
export const ink2 = { color: MUTED };
/** 24px padding, a soft 12px radius, no fill, held by a 1px ring. */
export const card = { background: "transparent", boxShadow: `0 0 0 1px ${DIVIDER}` };

const SRC = "src/pieces/caseStudyKit.tsx";

/** The small uppercase eyebrow, in the portfolio's mono. */
export function Eyebrow({ children, className = "", style, item = false }: { children: ReactNode; className?: string; style?: CSSProperties; item?: boolean }) {
  return (
    <p data-ui="Overline" data-src={`${SRC} › Eyebrow`} className={`uppercase ${className}`} style={{ ...(item ? ITEM_LABEL : LABEL), color: MUTED, ...style }}>
      {children}
    </p>
  );
}

/** A subsection's headline, 32px above what it introduces. */
export function SectionHead({ title }: { title: string }) {
  return (
    <h3 data-ui="Headline" data-src={`${SRC} › SectionHead`} className={`mb-8 max-w-3xl ${STATEMENT}`}>
      {title}
    </h3>
  );
}

export const P = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`${MD} ${className}`} style={ink2}>
    {children}
  </p>
);

export const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold" style={ink}>
    {children}
  </strong>
);

/** Copy with its key phrases marked `**like this**`: the phrases set bright and semibold, the rest left muted. */
export function Marked({ text }: { text: string }) {
  return <>{text.split("**").map((part, i) => (i % 2 === 1 ? <Strong key={i}>{part}</Strong> : part))}</>;
}

/**
 * A band that breaks the page's flow: it runs the full width of the scrolling
 * column, past the body's side padding, with its content back inside that
 * padding so the text still lines up with everything else.
 */
const BODY_PAD = "clamp(24px, 6vw, 110.816px)";
export function Band({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      data-ui="Full-bleed section"
      data-src={`${SRC} › Band`}
      className="py-10 md:py-12"
      style={{
        // `cqw` is the scroller's own width (CaseStudy makes it a size container).
        width: "100cqw",
        marginLeft: "calc(50% - 50cqw)",
        paddingInline: `max(${BODY_PAD}, calc(50cqw - 400px))`,
        background: SURFACE,
        borderBlock: `1px solid ${DIVIDER}`,
      }}
    >
      <p data-ui="Overline" data-src={`${SRC} › Band`} className="mb-3 uppercase" style={{ ...LABEL, color: MUTED }}>
        {label}
      </p>
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}

/** Opens a prototype in its own tab. It is a separate app, not a page of this one. */
export function PrototypeLink({ href, children, outline = false }: { href: string; children: ReactNode; outline?: boolean }) {
  return (
    <Button href={href} target="_blank" rel="noreferrer" variant={outline ? "outlined" : "filled"}>
      {children}
      <span className="sr-only">(opens in a new tab)</span>
    </Button>
  );
}

/** A gap only the author can fill, left visible on the page rather than written around. Greppable as `NEED`. */
export function Need({ children }: { children: ReactNode }) {
  return (
    <span data-ui="Gap marker" data-src={`${SRC} › Need`} className={`inline-block rounded-[6px] px-2 py-1 ${SM}`} style={{ fontFamily: MONO, color: INK, border: `1px dashed ${MUTED}` }}>
      [{children}]
    </span>
  );
}

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Plays a muted video only while it is on screen. With reduced motion it holds on its poster. */
function useOnScreenPlay(threshold: number) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
    // React does not always set the muted property, and unmuted video may not autoplay.
    el.muted = true;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? el.play().catch(() => {}) : el.pause()), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/** A silent looping clip, as a path stem with `.webm`, `.mp4` and a `.jpg` poster beside it. */
export function Clip({ src, label, ratio = "1440 / 900" }: { src: string; label: string; ratio?: string }) {
  const ref = useOnScreenPlay(0.35);
  return (
    <div data-ui="Video" data-src={`${SRC} › Clip`} className="overflow-hidden rounded-[12px]">
      <video ref={ref} muted loop playsInline preload="none" poster={`${src}.jpg`} aria-label={label} className="block w-full object-cover" style={{ aspectRatio: ratio }}>
        <source src={`${src}.webm`} type="video/webm" />
        <source src={`${src}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}

/** A clip and one paragraph side by side, centred on each other. On the phone they stack, clip first. */
export function ClipRow({ clip, label, text, ratio }: { clip: string; label: string; text: string; ratio?: string }) {
  return (
    <article data-ui="Media object" data-src={`${SRC} › ClipRow`}>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-10">
        <Clip src={clip} label={label} ratio={ratio} />
        <p className={MD} style={ink2}>
          <Marked text={text} />
        </p>
      </div>
    </article>
  );
}

export type Version = { src: string; alt: string; text: string; fit?: "cover" | "contain" };

/**
 * One decision, laid out as on Bind Desk: its title, the caption for the
 * version showing and the First version / Now switch on the left, the image
 * on the right. Both images stay mounted and cross-fade, and both captions
 * share one cell, so switching does not reflow the page.
 */
export function Decision({ title, ratio, before, after, inset }: { title: string; ratio: string; before: Version; after?: Version; inset?: string }) {
  const [now, setNow] = useState(false);
  // With no `after`, it is one image and its caption, and no switch
  const versions: [string, Version, boolean][] = after
    ? [
        ["First version", before, false],
        ["Now", after, true],
      ]
    : [["First version", before, false]];
  return (
    <figure data-ui="Decision" data-src={`${SRC} › Decision`} className="mx-0 mt-0 flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
      <div className="md:w-[36%] md:shrink-0">
        <h3 className={`mb-3 ${STATEMENT}`}>{title}</h3>
        <figcaption className={`mb-5 grid ${SM}`} style={ink2}>
          {versions.map(([label, v, isNow]) => (
            <span key={label} aria-hidden={now !== isNow} style={{ gridArea: "1 / 1", visibility: now === isNow ? "visible" : "hidden" }}>
              {v.text}
            </span>
          ))}
        </figcaption>
        {after && (
        <div role="tablist" aria-label="Version" className="inline-flex gap-1 rounded-full p-1" style={{ boxShadow: `0 0 0 1px ${DIVIDER}` }}>
          {versions.map(([label, , isNow]) => {
            const on = now === isNow;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setNow(isNow)}
                className="h-8 cursor-pointer rounded-full px-4 active:scale-[0.97]"
                style={{ ...ITEM_LABEL, textTransform: "uppercase", background: on ? INK : "transparent", color: on ? PAGE : MUTED, transition: "background-color 200ms ease, color 200ms ease, scale 160ms cubic-bezier(0.23, 1, 0.32, 1)" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        )}
      </div>
      <div className="relative w-full min-w-0 flex-1 overflow-hidden rounded-[12px]" style={{ border: `1px solid ${DIVIDER}`, background: WELL, aspectRatio: ratio }}>
        {versions.map(([label, v, isNow]) => (
          <img
            key={label}
            src={v.src}
            alt={v.alt}
            aria-hidden={now !== isNow}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 block h-full w-full transition-opacity duration-300 ${v.fit === "contain" ? "object-contain" : "object-cover object-left-top"}`}
            // `inset` shrinks the image inside a frame that still fills the column
            style={{ opacity: now === isNow ? 1 : 0, padding: inset }}
          />
        ))}
      </div>
    </figure>
  );
}

/** The hero's facts in a row: Timeline, Role, Scope. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl data-ui="Facts" data-src={`${SRC} › Facts`} className="mt-6 flex flex-wrap gap-x-12 gap-y-4">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="uppercase" style={{ ...ITEM_LABEL, color: MUTED }}>
            {k}
          </dt>
          <dd className={`m-0 mt-1 ${SM}`} style={ink}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Next steps, one card each. */
export function NextCards({ items }: { items: { label: string; text: string }[] }) {
  return (
    <ul data-ui="Card grid" data-src={`${SRC} › NextCards`} className="grid list-none gap-4 p-0 md:grid-cols-2">
      {items.map((n) => (
        <li key={n.label} data-ui="Card" data-src={`${SRC} › NextCards`} className="rounded-[12px] p-6" style={card}>
          <Eyebrow item>{n.label}</Eyebrow>
          <p className={`mt-2 ${SM}`} style={ink2}>
            <Marked text={n.text} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * A hero: a silent loop in its own window, centred on the project's backdrop
 * with an even margin all round. Recorded clips are a path stem with `.webm`,
 * `.mp4` and a `.jpg` poster beside it. With `chrome`, the window gets a
 * browser bar above the clip, a tab and an address, as Bind Desk's recording
 * has its own.
 */
export function heroLoop(stem: string, ratio: number, chrome?: { tab: string; url: string }) {
  // The browser bar's height as a share of the window's width (tabs, then the
  // address). Local, since projects.ts calls this while modules are still loading.
  const BAR = 0.075;
  // The whole window's shape, the bar included
  const shape = chrome ? 1 / (1 / ratio + BAR) : ratio;
  return function HeroLoop({ className = "" }: { className?: string }) {
    const ref = useOnScreenPlay(0.2);
    return (
      <div className={`relative h-full w-full select-none overflow-hidden ${className}`} style={{ containerType: "size" }} aria-hidden>
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden"
          style={{
            width: `min(80cqw, ${78 * shape}cqh)`,
            aspectRatio: `${shape}`,
            containerType: "inline-size",
            borderRadius: 8,
            boxShadow: "0 1px 0 rgba(24, 25, 26, 0.06), 0 18px 48px -16px rgba(20, 60, 58, 0.3)",
            outline: "1px solid rgba(24, 25, 26, 0.08)",
            background: "#fbfaf7",
          }}
        >
          {chrome ? (
            <div className="shrink-0" style={{ height: `${BAR * 100}cqw`, background: "#ECEBE8", borderBottom: "1px solid rgba(24, 25, 26, 0.08)" }}>
              <div className="flex items-end" style={{ height: "52%", gap: "1.2cqw", paddingInline: "1.6cqw" }}>
                <span className="flex self-center" style={{ gap: "0.7cqw" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="block rounded-full" style={{ width: "1cqw", height: "1cqw", background: "#C9C7C2" }} />
                  ))}
                </span>
                <span className="flex items-center truncate" style={{ height: "78%", paddingInline: "1.4cqw", borderRadius: "0.8cqw 0.8cqw 0 0", background: "#fbfaf7", fontSize: "1.45cqw", color: "#3b3b3b", width: "22cqw" }}>
                  {chrome.tab}
                </span>
              </div>
              <div className="flex items-center" style={{ height: "48%", background: "#fbfaf7", paddingInline: "1.6cqw" }}>
                <span className="flex w-full items-center" style={{ height: "68%", borderRadius: "1cqw", background: "#ECEBE8", paddingInline: "1.2cqw", fontSize: "1.35cqw", color: "#6b6b6b" }}>
                  {chrome.url}
                </span>
              </div>
            </div>
          ) : null}
          <video ref={ref} className="block min-h-0 w-full flex-1 object-cover" poster={`${stem}.jpg`} muted loop playsInline preload="metadata">
            <source src={`${stem}.webm`} type="video/webm" />
            <source src={`${stem}.mp4`} type="video/mp4" />
          </video>
        </div>
      </div>
    );
  };
}
