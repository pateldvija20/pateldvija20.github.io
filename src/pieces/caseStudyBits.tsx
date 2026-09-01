import { useState, type ReactNode } from "react";
import { ProjectCard } from "./ProjectCard";
import { PROJECTS } from "./projects";

/**
 * The pieces every case study page is built from.
 *
 * These started as private helpers inside `greenera.tsx` and were copied into
 * each new project file, which is how the same six components ended up
 * written three times with the numbers drifting apart. They live here now so
 * a change to the body size or the divider colour lands on every case study
 * at once. `hacksvit.tsx` still carries its own variants — it was written
 * against these numbers but has since diverged, so folding it in is a
 * separate job.
 *
 * All the type and spacing numbers are the Figma file's own, which is why
 * the decimals are odd rather than rounded.
 */

/**
 * The type scale, expressed as clamps rather than the flat Figma pixel.
 *
 * Every case study is authored against a 1512-wide frame, and the page is now
 * reachable from the Work grid at phone and tablet widths. Held at 22.163 a
 * body paragraph runs four or five words to the line on a 375px phone, which
 * is what made the pages read as broken rather than as narrow. The `vw`
 * middle term is the Figma value over 1512, so the desktop rendering is
 * unchanged to the pixel and only the small end moves.
 */
export const BODY_FONT = "clamp(16px, 1.466vw, 22.163px)";
export const BODY_TRACK = 0.2216;
export const MUTED = "#626262";
export const INK = "#18191a";
export const DIVIDER = "#e3e5e8";
export const MONO = "'DM Mono', monospace";
/** The eyebrow size `CaseStudy` sets its own section headings in. */
export const LABEL_FONT = "clamp(13px, 1.099vw, 16.622px)";
/** Figure captions — a step under body copy at both ends. */
export const CAPTION_FONT = "clamp(12px, 1.058vw, 16px)";
/**
 * The gap a two-up block keeps between its halves, and the block padding a
 * ruled row carries. Both collapse toward the phone, where the two halves are
 * stacked (see the `[data-cs-body]` rule in `index.css`) and Figma's 40/28
 * would read as a gulf rather than as a pair.
 */
export const PAIR_GAP = "clamp(20px, 2.65vw, 40px)";
export const ROW_PAD = "clamp(18px, 1.85vw, 28px)";

/** A section's claim — the line that carries the argument. */
export function SectionLead({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-medium"
      style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}
    >
      {children}
    </p>
  );
}

/** Supporting copy under a claim. */
export function SectionBody({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: BODY_FONT,
        letterSpacing: BODY_TRACK,
        lineHeight: "normal",
        color: MUTED,
      }}
    >
      {children}
    </p>
  );
}

/** The small mono label that heads a group inside a section. */
export function Label({ children }: { children: ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{ fontFamily: MONO, fontWeight: 500, fontSize: LABEL_FONT, color: MUTED }}
    >
      {children}
    </p>
  );
}

/**
 * An image in its box. `ratio` is the art's own aspect unless a crop is
 * wanted — the fill is `object-cover`, so passing a ratio the asset does not
 * have will crop it.
 */
export function Figure({
  src,
  ratio,
  radius = 12,
  className = "",
  style,
  alt = "",
}: {
  src: string;
  ratio?: string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, borderRadius: radius, background: "#e9ecf0", ...style }}
    >
      {ok ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setOk(false)}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[#e9ecf0]" style={{ borderRadius: radius }} />
      )}
    </div>
  );
}

/**
 * A row of images that share a height, each taking the width its own aspect
 * asks for. `flexGrow: aspect` is what does it — a 2:1 screenshot next to a
 * 1:2 phone ends up four times as wide, and both stay uncropped.
 */
export function FigureRow({
  items,
  gap = 24,
  radius = 12,
}: {
  items: { src: string; alt: string; aspect: number }[];
  gap?: number;
  radius?: number;
}) {
  return (
    // `grid` below md, `flex` from md up. A column flexbox would have read the
    // children's `flexGrow` as a *height* ratio and stretched the tall ones;
    // in a grid container those declarations are simply inert.
    <div className="grid items-start md:flex" style={{ gap }}>
      {items.map((it) => (
        <div key={it.src} style={{ flexGrow: it.aspect, flexBasis: 0, minWidth: 0 }}>
          <Figure src={it.src} alt={it.alt} ratio={String(it.aspect)} radius={radius} />
        </div>
      ))}
    </div>
  );
}

/** A figure with the line that says what it is reading underneath it. */
export function Caption({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: CAPTION_FONT,
        letterSpacing: BODY_TRACK,
        lineHeight: "normal",
        color: MUTED,
      }}
    >
      {children}
    </p>
  );
}

/**
 * The 162x162 rounded tile the Goal and Reflection rows lead with. The
 * Figma files ship these as empty #ccdeff squares; they carry an emoji for
 * now until real icons are drawn.
 */
export function IconTile({ glyph }: { glyph: string }) {
  const size = "clamp(72px, 10.71vw, 162px)";
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        background: "#ccdeff",
        border: `0.727px solid ${DIVIDER}`,
        borderRadius: 17.438,
        fontSize: "clamp(30px, 4.23vw, 64px)",
        lineHeight: 1,
      }}
    >
      {glyph}
    </div>
  );
}

/** One [icon | header + body] row. */
export function IconRow({
  glyph,
  header,
  body,
}: {
  glyph: string;
  header: string;
  body: ReactNode;
}) {
  return (
    <div className="flex items-center" style={{ gap: PAIR_GAP }}>
      <IconTile glyph={glyph} />
      <div
        className="flex min-w-0 flex-1 flex-col gap-[12px]"
        style={{ fontSize: BODY_FONT, letterSpacing: BODY_TRACK, lineHeight: "normal" }}
      >
        <p className="w-full">{header}</p>
        <p className="w-full" style={{ color: MUTED }}>
          {body}
        </p>
      </div>
    </div>
  );
}

/** One [image | claim + body] card, image left. */
export function ImageCard({
  img,
  alt,
  header,
  body,
  columns,
  gap,
  radius,
  ratio = "1 / 1",
}: {
  img: string;
  alt: string;
  header: string;
  body: string;
  columns: string;
  gap: number;
  radius: number;
  ratio?: string;
}) {
  return (
    <div className="grid items-start" style={{ gridTemplateColumns: columns, gap }}>
      <Figure src={img} ratio={ratio} radius={radius} alt={alt} />
      <div className="flex flex-col gap-[12px]">
        <SectionLead>{header}</SectionLead>
        <SectionBody>{body}</SectionBody>
      </div>
    </div>
  );
}

/**
 * A row of short label/value pairs — the metadata strip under a header, or a
 * scope block. `bordered` gives it the rules that make it read as a strip
 * rather than as body copy.
 */
export function DefinitionGrid({
  items,
  bordered = false,
  muted = false,
}: {
  items: [string, string][];
  bordered?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className="grid"
      style={{
        // `auto-fit` rather than a fixed count: a four-up metadata strip is
        // one word per line on a phone, and the number of columns that fit is
        // exactly what should decide here. `min(100%, 190px)` keeps the track
        // from ever being wider than the column it sits in, which is what
        // stops a long value forcing a horizontal scroll.
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
        gap: PAIR_GAP,
        borderTop: bordered ? `1px solid ${DIVIDER}` : undefined,
        borderBottom: bordered ? `1px solid ${DIVIDER}` : undefined,
        paddingBlock: bordered ? 24 : undefined,
      }}
    >
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-[12px]">
          <Label>{label}</Label>
          <p
            style={{
              fontSize: "clamp(15px, 1.19vw, 18px)",
              letterSpacing: BODY_TRACK,
              lineHeight: "normal",
              color: muted ? MUTED : undefined,
            }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Divider-separated claim/body rows. Used wherever a section is a list of
 * positions rather than a single argument — trade-offs, validation signals,
 * before/after pairs.
 */
export function ClaimList({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-col">
      {items.map(([claim, body], i) => (
        <div
          key={claim}
          className="flex flex-col gap-[12px]"
          style={{
            paddingBlock: ROW_PAD,
            borderTop: `1px solid ${DIVIDER}`,
            borderBottom: i === items.length - 1 ? `1px solid ${DIVIDER}` : "none",
          }}
        >
          <SectionLead>{claim}</SectionLead>
          <SectionBody>{body}</SectionBody>
        </div>
      ))}
    </div>
  );
}

/** A line the page stops on — the reframe a section turns around. */
export function PullQuote({ children, attribution }: { children: ReactNode; attribution?: string }) {
  return (
    <div
      className="flex flex-col gap-[16px]"
      style={{
        borderLeft: `2.77px solid ${INK}`,
        paddingLeft: "clamp(18px, 2.12vw, 32px)",
        paddingBlock: 8,
      }}
    >
      <p
        className="font-medium"
        style={{ fontSize: "clamp(20px, 1.98vw, 30px)", letterSpacing: 0.3, lineHeight: 1.3 }}
      >
        {children}
      </p>
      {attribution ? <Label>{attribution}</Label> : null}
    </div>
  );
}

/**
 * The project cards that close a case study — the "Also checkout" section
 * every case study ends on. Links go to the project's own `/projects/<slug>`
 * deep link (the same URL the share button hands out), so a click is a real
 * navigation to that case study rather than a same-page anchor jump with
 * nowhere to land.
 */
export function RelatedProjects({ slugs }: { slugs: string[] }) {
  const related = slugs
    .map((slug) => PROJECTS.find((p) => p.slug === slug))
    .filter((p) => p !== undefined);
  return (
    <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 md:gap-[40px]">
      {related.map((p) => (
        // The same card the Work grid uses, in the sheet palette — a case
        // study stays paper-white in both themes, so its cards do too.
        <ProjectCard
          key={p.slug}
          project={p}
          tone="sheet"
          src={p.hero ?? p.thumb}
          href={`/projects/${p.slug}`}
        />
      ))}
    </div>
  );
}
