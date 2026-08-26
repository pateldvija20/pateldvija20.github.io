import { useLayoutEffect, useRef, useState } from "react";

/**
 * The HackSVIT 2022 event site (Figma `Final portfolio design` 339-665),
 * rebuilt at the file's own design width so every measurement below is the
 * Figma number rather than a re-guessed approximation. `HacksvitSiteEmbed`
 * then scales that fixed-width page to whatever column it's dropped into and
 * clips it to a fixed-height frame, so the case study shows the site as a
 * scrollable preview instead of running 4800px down the page.
 *
 * The hero's frames, wordmark and mascots are the real exported SVGs
 * (`/assets/projects/hacksvit/site`) — the earlier pass drew them as CSS
 * blobs, which lost the identity the section exists to show.
 */

/** `Desktop - 1` 339:665 — the whole page is authored against this width. */
const DESIGN_W = 868.984;
/** How much of the site the preview frame shows before clipping. */
const FRAME_H = 660;

const ART = "/assets/projects/hacksvit/site";

/* Design tokens, all from the file ------------------------------------- */
/** "Main white" — the one light the design ever uses. */
const WHITE = "#f8f8f8";
const BG = "#0a0a0a";
const CARD = "#151517";
const BLUE = "#0083ff";
const PURPLE = "#6f54ff";
const ORANGE = "#ffa02e";
const PINK = "#ff5ca8";

/** `Frame 168`'s own padding and gap — the page's whole vertical rhythm. */
const PAD = 37.239;
const GAP = 29.791;

const MONO = "'Space Mono', ui-monospace, monospace";
const SANS = "'Poppins', 'DM Sans', sans-serif";

/** `About` 339:767 vs `Meet the Judges` 339:1111 — the file runs two heading
 *  sizes, the larger one only on the first two sections. */
const H1 = 39.721;
const H2 = 31.78;
/** Body copy, `339:769`. */
const BODY = 17.378;
/** The mono line above/below the wordmark, `339:736`. */
const META = 14.895;

const NAV = [
  { id: "about", label: "About" },
  { id: "themes", label: "Themes" },
  { id: "jury", label: "Jury" },
  { id: "event-details", label: "Event Details" },
  { id: "schedule", label: "Schedule" },
  { id: "faq", label: "FAQ" },
];

function Mono({
  children,
  size = META,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: size, ...style }}>
      {children}
    </span>
  );
}

function SectionTitle({ children, size = H2 }: { children: React.ReactNode; size?: number; }) {
  return (
    <h3
      style={{
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: size,
        color: WHITE,
        lineHeight: "normal",
      }}
    >
      {children}
    </h3>
  );
}

/** `Primary CTA` 339:752 — a pill, not a rounded rect. */
function Cta({
  children,
  background,
  onClick,
}: {
  children: React.ReactNode;
  background: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer transition-transform hover:-translate-y-[1px]"
      style={{
        background,
        borderRadius: 100,
        padding: "7.448px 19.861px",
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 12,
        color: WHITE,
      }}
    >
      {children}
    </button>
  );
}

/** Photo stand-in — the file's own portraits aren't ours to ship. */
function Portrait({ tone = "#2b2b2e" }: { tone?: string; }) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: "1 / 1.06",
        background: `linear-gradient(165deg, ${tone} 0%, #19191b 78%)`,
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          left: "50%", top: "26%", width: "34%", aspectRatio: "1",
          transform: "translateX(-50%)", background: "rgba(255,255,255,0.10)",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "50%", top: "62%", width: "62%", height: "55%",
          transform: "translateX(-50%)", borderRadius: "50% 50% 0 0",
          background: "rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}

/* --- Theme-card props, built as divs rather than shipped as art ---------- */
/* The theme cards each scatter a motif behind their mascot — mortarboards for
   Ed-Tech, coins for Fin-Tech, and so on. These are CSS shapes on purpose:
   they're decorative filler, and the only real art the file gives us for
   these cards is the mascot itself. */

type PropStyle = React.CSSProperties;

/** Mortarboard: a perspective-tilted board over its band, with a tassel. */
function GradCap({ size, style }: { size: number; style: PropStyle; }) {
  return (
    <div className="absolute" style={{ width: size, height: size * 0.66, ...style }}>
      <div
        className="absolute"
        style={{
          left: 0, top: size * 0.06, width: size, height: size * 0.40,
          background: "#141414", borderRadius: 3,
          transform: "perspective(46px) rotateX(40deg)",
        }}
      />
      <div
        className="absolute"
        style={{
          left: size * 0.30, top: size * 0.30, width: size * 0.40, height: size * 0.22,
          background: "#242424", borderRadius: "0 0 4px 4px",
        }}
      />
      <div
        className="absolute"
        style={{ right: size * 0.08, top: size * 0.18, width: 2, height: size * 0.30, background: "#f2c230" }}
      />
      <div
        className="absolute"
        style={{
          right: size * 0.02, top: size * 0.44, width: size * 0.12, height: size * 0.17,
          background: "#f2c230", borderRadius: 2,
        }}
      />
    </div>
  );
}

/** A single coin seen near-edge-on; `stack` piles three of them. */
function Coin({ size, style, stack = false }: { size: number; style: PropStyle; stack?: boolean; }) {
  const disc = (top: number) => (
    <div className="absolute" style={{ left: 0, top, width: size, height: size * 0.30 }}>
      <div className="absolute inset-0" style={{ background: "#e8b833", borderRadius: "50%" }} />
      <div
        className="absolute"
        style={{
          left: size * 0.10, top: size * 0.04, width: size * 0.80, height: size * 0.20,
          background: "#ffdd7a", borderRadius: "50%",
        }}
      />
    </div>
  );
  return (
    <div className="absolute" style={{ width: size, height: size * (stack ? 0.72 : 0.30), ...style }}>
      {stack ? (
        <>
          {disc(size * 0.42)}
          {disc(size * 0.21)}
          {disc(0)}
        </>
      ) : (
        disc(0)
      )}
    </div>
  );
}

/** Isometric cube — three clip-path faces sharing one silhouette. */
function Cube({ size, style }: { size: number; style: PropStyle; }) {
  const face = (clip: string, background: string) => (
    <div className="absolute inset-0" style={{ clipPath: clip, background }} />
  );
  return (
    <div className="absolute" style={{ width: size, height: size, ...style }}>
      {face("polygon(50% 0%, 100% 25%, 50% 50%, 0% 25%)", "#5aa0ff")}
      {face("polygon(0% 25%, 50% 50%, 50% 100%, 0% 75%)", "#0b57d0")}
      {face("polygon(50% 50%, 100% 25%, 100% 75%, 50% 100%)", "#1e6fff")}
    </div>
  );
}

/** Light bulb: glass over a grey screw base. */
function Bulb({ size, style }: { size: number; style: PropStyle; }) {
  return (
    <div className="absolute" style={{ width: size, height: size * 1.38, ...style }}>
      <div
        className="absolute"
        style={{
          left: 0, top: 0, width: size, height: size * 1.05,
          background: "#ffd34d", borderRadius: "50% 50% 46% 54% / 54% 54% 46% 46%",
        }}
      />
      <div
        className="absolute"
        style={{
          left: size * 0.30, top: size * 0.94, width: size * 0.40, height: size * 0.38,
          background: "#9a9a9a", borderRadius: "2px 2px 4px 4px",
        }}
      />
    </div>
  );
}

/** The earth, as a blue disc with a couple of green land masses. */
function Globe({ size, style }: { size: number; style: PropStyle; }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{ width: size, height: size, borderRadius: "50%", background: "#1e88e5", ...style }}
    >
      <div
        className="absolute"
        style={{
          left: "12%", top: "16%", width: "44%", height: "38%",
          background: "#7cc47f", borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "46%", top: "52%", width: "38%", height: "40%",
          background: "#7cc47f", borderRadius: "45% 55% 40% 60% / 55% 45% 55% 45%",
        }}
      />
      <div
        className="absolute"
        style={{
          left: "62%", top: "10%", width: "26%", height: "24%",
          background: "#7cc47f", borderRadius: "50%",
        }}
      />
    </div>
  );
}

/** Broken heart — two lobes and a point, split by a dark seam. */
function BrokenHeart({ size, style }: { size: number; style: PropStyle; }) {
  return (
    <div className="absolute" style={{ width: size, height: size, ...style }}>
      <div
        className="absolute inset-0"
        style={{
          background: "#1e6fff",
          clipPath:
            "path('M50 92 L12 54 A22 22 0 0 1 50 22 A22 22 0 0 1 88 54 Z')",
          transform: `scale(${size / 100})`,
          transformOrigin: "top left",
          width: 100,
          height: 100,
        }}
      />
      <div
        className="absolute"
        style={{
          left: "48%", top: "18%", width: 2.5, height: "62%",
          background: "#3d3d3d", transform: "rotate(6deg)",
        }}
      />
    </div>
  );
}

/** `Frame 112` 339:1113 — portrait over a coloured name bar. */
function PersonCard({ bar, tone }: { bar: string; tone: string; }) {
  return (
    <div className="overflow-hidden" style={{ background: CARD, borderRadius: 8 }}>
      <Portrait tone={tone} />
      <div style={{ background: bar, padding: "10px 12px" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, color: WHITE }}>
          Speaker name
        </div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, color: "rgba(255,255,255,0.72)" }}>
          About
        </div>
      </div>
    </div>
  );
}

/** One absolutely-placed hero asset. Positions are percentages of the hero
 *  box so the whole composition survives the embed's scaling. */
function HeroArt({
  src, left, top, width, deg = 0, z = 0,
}: {
  src: string; left: string; top: string; width: number; deg?: number; z?: number;
}) {
  return (
    <img
      src={`${ART}/${src}`}
      alt=""
      draggable={false}
      className="pointer-events-none absolute block max-w-none select-none"
      style={{ left, top, width, transform: `rotate(${deg}deg)`, zIndex: z }}
    />
  );
}

/* ----------------------------------------------------------------- nav */

/** `Frame 3` 339:666. */
const NAV_H = 80.291;

/**
 * The top bar, kept as its own component because the embed has to mount it
 * *outside* the scaled wrapper — `position: sticky` resolves against the
 * nearest scrolling ancestor, and a `transform` on an ancestor takes that
 * ancestor over as the containing block, which left the bar drifting down
 * the page instead of pinning to the top of the frame.
 *
 * It finds its own scroller rather than being handed one, so it works
 * whether it's mounted inside the page or hoisted into the frame.
 */
function SiteNav({ scale = 1 }: { scale?: number; }) {
  const ref = useRef<HTMLElement>(null);

  /** Scroll the embed's own frame — never the case study, and never the desk
   *  page behind it. */
  const go = (id: string) => {
    const scroller = ref.current?.closest<HTMLElement>("[data-site-scroller]");
    const target = scroller?.querySelector<HTMLElement>(`[data-site-section="${id}"]`);
    if (!scroller || !target) return;
    scroller.scrollTo({
      top:
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        NAV_H * scale,
      behavior: "smooth",
    });
  };

  return (
    <nav
      ref={ref}
      className="flex items-center justify-between"
      style={{
        width: DESIGN_W,
        height: NAV_H,
        paddingLeft: 24.826,
        paddingRight: 24.826,
        background: "rgba(10,10,10,0.9)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        type="button"
        onClick={() => go("top")}
        className="flex cursor-pointer items-center"
        aria-label="Back to top"
      >
        <img src={`${ART}/logo.svg`} alt="HackSVIT" width={26.226} draggable={false} className="select-none" />
      </button>
      <div className="flex items-center" style={{ gap: 24.826 }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            className="cursor-pointer transition-opacity hover:opacity-100"
            style={{ fontFamily: MONO, fontWeight: 700, fontSize: META, color: WHITE, opacity: 0.85 }}
          >
            {n.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- page */

export function HacksvitSite() {
  const [openFaq, setOpenFaq] = useState<number | null>(3);

  /* Each card: the motif behind, then the mascot, then the label. Mascot
     placement is per-card because the file crops each one differently
     against the card edge. */
  const themes: {
    label: string;
    mascot: string;
    mascotStyle: React.CSSProperties;
    props: React.ReactNode;
  }[] = [
    {
      label: "Ed-Tech",
      mascot: "mascot-pink.svg",
      mascotStyle: { left: "-6%", bottom: "-4%", width: "62%" },
      props: (
        <>
          <GradCap size={62} style={{ left: "-8%", top: "-4%", transform: "rotate(-8deg)" }} />
          <GradCap size={50} style={{ right: "6%", top: "14%", transform: "rotate(10deg)" }} />
          <GradCap size={70} style={{ left: "22%", top: "34%", transform: "rotate(-4deg)" }} />
        </>
      ),
    },
    {
      label: "Fin-Tech",
      mascot: "mascot-orange.svg",
      mascotStyle: { right: "-14%", top: "26%", width: "68%" },
      props: (
        <>
          <Coin size={44} stack style={{ left: "34%", top: "10%" }} />
          <Coin size={40} style={{ left: "6%", top: "46%", transform: "rotate(-14deg)" }} />
          <Coin size={36} style={{ left: "16%", bottom: "16%", transform: "rotate(8deg)" }} />
          <Coin size={30} style={{ left: "2%", bottom: "30%", transform: "rotate(-6deg)" }} />
        </>
      ),
    },
    {
      label: "Climatecrisis",
      mascot: "mascot-blue.svg",
      mascotStyle: { left: "26%", top: "40%", width: "42%" },
      props: (
        <>
          <Globe size={104} style={{ left: "-16%", top: "-12%" }} />
          <BrokenHeart size={34} style={{ right: "10%", top: "14%", transform: "rotate(12deg)" }} />
          <BrokenHeart size={30} style={{ left: "8%", bottom: "14%", transform: "rotate(-10deg)" }} />
        </>
      ),
    },
    {
      label: "Blockchain",
      mascot: "mascot-yellow.svg",
      mascotStyle: { left: "30%", top: "30%", width: "34%" },
      props: (
        <>
          <Cube size={46} style={{ left: "4%", top: "6%" }} />
          <Cube size={72} style={{ right: "-14%", top: "16%" }} />
          <Cube size={34} style={{ left: "-6%", top: "44%" }} />
          <Cube size={30} style={{ left: "6%", bottom: "10%" }} />
          <Cube size={40} style={{ right: "6%", bottom: "6%" }} />
        </>
      ),
    },
    {
      label: "Open Innovation",
      mascot: "mascot-purple.svg",
      mascotStyle: { left: "6%", bottom: "-2%", width: "34%" },
      props: (
        <>
          <Bulb size={26} style={{ left: "12%", top: "6%" }} />
          <Bulb size={34} style={{ right: "18%", top: "-4%", transform: "rotate(14deg)" }} />
          <Bulb size={24} style={{ left: "40%", top: "22%", transform: "rotate(-10deg)" }} />
          <Bulb size={30} style={{ right: "6%", top: "26%", transform: "rotate(8deg)" }} />
          <Bulb size={22} style={{ left: "62%", top: "46%", transform: "rotate(-6deg)" }} />
        </>
      ),
    },
  ];

  const schedule = [
    ["8:30 AM", "Check-In and Breakfast", false],
    ["9:30 AM", "Lunch", false],
    ["10:00 AM", "Lunch", true],
    ["1:00 PM", "Lunch", false],
    ["2:00 PM", "Opening Ceremony", false],
    ["4:00 PM", "Opening Ceremony", false],
    ["5:00 PM", "Opening Ceremony", false],
    ["7:15 PM", "Lunch", false],
    ["7:30 PM", "Talks and Workshop (5)", false],
    ["8:30 PM", "Lunch", false],
    ["9:30 PM", "Lunch", false],
    ["10:30 PM", "Lunch", false],
  ] as const;

  /* `Card` 339:1136 — white type on the brand colour, a black date chip
     top-right, and the cut-out portrait bottom-right. Only the third card
     carries a category tag. */
  /* `Card` 339:1136 / 339:1158 / 339:1180, exported whole. These are posters
     rather than layouts — the type is set tight against a cut-out photo, so
     rebuilding them in DOM only ever approximated them. */
  const speakers = [
    { src: "card-1.png", alt: "Nail your interviews — Regina Phalange, Senior Product Manager, Polygon" },
    { src: "card-2.png", alt: "Getting started with three.js — Celine dionne, Lead Developer, Acma" },
    { src: "card-3.png", alt: "Build products efficiently — Scott Beth, Product Manager, Ezumi" },
  ];

  const faqs = [
    "Who can participate?",
    "How does the application process work?",
    "Can we apply as a team?",
    "When will the applications close?",
  ];

  /** Every section shares the file's padding and heading-to-body gap. */
  const section = (id: string, extra?: React.CSSProperties): React.CSSProperties => ({
    paddingLeft: PAD,
    paddingRight: PAD,
    paddingBottom: GAP * 2,
    ...extra,
  });

  return (
    <div style={{ width: DESIGN_W, background: BG, color: WHITE, fontFamily: SANS }}>
      {/* ----------------------------------------------------------- hero
          Runs the full height the nav used to share with it (0 → 624.9 in
          `Desktop - 1`): the bar is now an overlay the embed pins, so the
          art sits at its own Figma offset rather than after a nav in flow. */}
      <div data-site-section="top" className="relative overflow-hidden" style={{ height: 624.907 }}>
        {/* `Group 14710` 339:679 — wider than the page on purpose, so the art
            runs off both edges and the frame clips it. */}
        <div className="absolute" style={{ left: 20.379, top: 59.353, width: 904.145, height: 554.126 }}>
          {/* Outlined frames, back to front. */}
          <HeroArt src="frame-outer.svg" left="7%" top="-1%" width={733} deg={6.77} />
          <HeroArt src="frame-inner.svg" left="9.5%" top="4%" width={670} deg={1.4} />
          {/* Bottom-left: filled black card under its own outline. */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: "2.5%", top: "58%", width: 214, height: 152,
              background: "#050505", borderRadius: 6, transform: "rotate(-28.88deg)",
            }}
          />
          <HeroArt src="frame-corner.svg" left="1%" top="60%" width={218} deg={-28.88} />
          {/* Right-hand black shape, and the handle marks at the top. */}
          <HeroArt src="shape-black.svg" left="80%" top="45%" width={193} deg={169.72} />
          <HeroArt src="handles.svg" left="70.5%" top="1.5%" width={166} deg={-3.26} />
          {/* Mascots. */}
          <HeroArt src="mascot-orange.svg" left="2.5%" top="12%" width={108} z={2} />
          <HeroArt src="mascot-blue.svg" left="78.5%" top="4.5%" width={55} z={3} />
          <HeroArt src="mascot-pink.svg" left="80.5%" top="26%" width={100} z={2} />
          <HeroArt src="mascot-yellow.svg" left="74%" top="71%" width={61} z={2} />
          <HeroArt src="mascot-purple.svg" left="5.5%" top="78%" width={63} z={3} />

          {/* `Frame 48095904` 339:735 — the centred stack. */}
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              gap: GAP,
              zIndex: 4,
            }}
          >
            <Mono>12/05/2022 - 15/05/2022</Mono>
            <img
              src={`${ART}/wordmark.svg`}
              alt="HACK SVIT 2022"
              width={357.853}
              draggable={false}
              className="block max-w-none select-none"
            />
            <div className="flex items-start" style={{ gap: 6.206 }}>
              <span style={{ fontSize: 18.619 }}>📍</span>
              <Mono>Vadodara, Gujarat</Mono>
            </div>
            <div className="flex items-start justify-center" style={{ gap: GAP }}>
              <Cta background={BLUE}>Register now</Cta>
              <Cta background={PURPLE}>Join Discord</Cta>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- about */}
      <div data-site-section="about" style={section("about")}>
        <div className="flex flex-col" style={{ gap: GAP }}>
          <SectionTitle size={H1}>About</SectionTitle>
          <div className="flex items-start" style={{ gap: PAD }}>
            <p
              className="min-w-px flex-1"
              style={{ fontFamily: MONO, fontWeight: 700, fontSize: BODY, lineHeight: "normal", color: WHITE }}
            >
              HackSVIT is going to be an in-person hackathon at Sardar
              Vallabhbhai Patel Institute of Technology (Vasad). It will be a 36-
              hour long joy ride where students will go build awesome projects,
              attend workshops, mentoring sessions, networking sessions &amp; fun
              mini-events.
            </p>
            <img
              src={`${ART}/mascot-about.svg`}
              alt=""
              width={181.043}
              draggable={false}
              className="block max-w-none shrink-0 select-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex" style={{ gap: 9.93 }}>
              {["Instagram", "Twitter", "LinkedIn"].map((s) => (
                <span
                  key={s}
                  className="flex items-center justify-center rounded-full"
                  style={{
                    height: 52.134, width: 52.134,
                    border: "1px solid rgba(248,248,248,0.25)",
                    fontFamily: MONO, fontWeight: 700, fontSize: 11, color: WHITE,
                  }}
                >
                  {s.slice(0, 2).toLowerCase()}
                </span>
              ))}
            </div>
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                height: 52.134, width: 52.134, background: PURPLE,
                fontFamily: MONO, fontWeight: 700, fontSize: 11, color: WHITE,
              }}
            >
              dc
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- themes */}
      <div data-site-section="themes" style={{ paddingBottom: GAP * 2 }}>
        <div style={{ paddingLeft: PAD, paddingRight: PAD }}>
          <SectionTitle size={H1}>Themes</SectionTitle>
        </div>
        <div
          className="no-scrollbar flex overflow-x-auto"
          style={{ gap: 14.7, paddingLeft: PAD, paddingRight: PAD, marginTop: GAP }}
        >
          {themes.map((t) => (
            <div
              key={t.label}
              className="relative shrink-0 overflow-hidden"
              style={{ width: 181.04, height: 229.79, background: "#3d3d3d", borderRadius: 10 }}
            >
              {t.props}
              <img
                src={`${ART}/${t.mascot}`}
                alt=""
                draggable={false}
                className="pointer-events-none absolute block max-w-none select-none"
                style={t.mascotStyle}
              />
              <div
                className="absolute text-right"
                style={{
                  right: 12, bottom: 10, maxWidth: "62%",
                  fontFamily: MONO, fontWeight: 700, fontSize: 12,
                  lineHeight: 1.25, color: WHITE,
                }}
              >
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- jury */}
      <div data-site-section="jury" style={section("jury")}>
        <div className="flex flex-col" style={{ gap: GAP }}>
          <SectionTitle>Meet the Judges</SectionTitle>
          <div className="grid grid-cols-4" style={{ gap: 23.45 }}>
            {["#3a3a40", "#2e2e33", "#34343a", "#2a2a2f"].map((tone, i) => (
              <PersonCard key={i} bar={PURPLE} tone={tone} />
            ))}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- speakers */}
      <div data-site-section="event-details" style={section("event-details")}>
        <div className="flex flex-col" style={{ gap: GAP }}>
          <SectionTitle>Speakers</SectionTitle>
          <div className="grid grid-cols-3" style={{ gap: 16.99 }}>
            {speakers.map((s) => (
              <img
                key={s.src}
                src={`${ART}/${s.src}`}
                alt={s.alt}
                draggable={false}
                className="block w-full select-none"
                style={{ borderRadius: 10.611 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- schedule */}
      <div data-site-section="schedule" style={section("schedule")}>
        <div className="flex flex-col" style={{ gap: GAP }}>
          <SectionTitle>Schedule</SectionTitle>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 23.83, color: WHITE }}>
            Day 1 : 15 May 2023
          </div>
          <div className="grid" style={{ gridTemplateColumns: "420.79fr 306.69fr", gap: 67 }}>
            <div className="flex flex-col">
              {schedule.map(([time, ev, hot], i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{
                    gap: 14.9,
                    height: 38.94,
                    paddingLeft: 11.47,
                    paddingRight: 11.47,
                    borderRadius: 4,
                    background: hot ? "#f2f2f2" : "transparent",
                    color: hot ? "#111" : WHITE,
                  }}
                >
                  <Mono size={13} style={{ width: 74 }}>{time}</Mono>
                  <Mono size={13} style={{ opacity: 0.5 }}>:</Mono>
                  <Mono size={13}>{ev}</Mono>
                </div>
              ))}
            </div>
            <div className="flex flex-col" style={{ gap: 42.82 }}>
              {[BLUE, PINK].map((badge, i) => (
                <div key={i} className="flex" style={{ gap: 24.83 }}>
                  <Mono size={13} style={{ paddingTop: 2, whiteSpace: "nowrap" }}>10:00 AM</Mono>
                  <div>
                    <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, lineHeight: 1.5, color: WHITE }}>
                      Providing on-chain liquidity for the decentralised economy
                    </p>
                    <span
                      className="mt-[12px] inline-block"
                      style={{
                        background: badge, borderRadius: 4, padding: "7px 20px",
                        fontFamily: MONO, fontWeight: 700, fontSize: 11,
                        letterSpacing: "0.08em", color: WHITE,
                      }}
                    >
                      WORKSHOP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- teams */}
      <div data-site-section="teams" style={section("teams")}>
        <div className="flex flex-col" style={{ gap: GAP }}>
          <SectionTitle>Teams</SectionTitle>
          <div className="grid grid-cols-4" style={{ gap: 31.82 }}>
            {["#33333a", "#2c2c31", "#38383e", "#2f2f35"].map((tone, i) => (
              <PersonCard key={i} bar={ORANGE} tone={tone} />
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- faq */}
      <div data-site-section="faq" style={section("faq")}>
        <div className="flex flex-col" style={{ gap: GAP }}>
          <SectionTitle>FAQ</SectionTitle>
          <div className="flex flex-col" style={{ gap: 14.9 }}>
            {faqs.map((q, i) => {
              const open = openFaq === i;
              return (
                <div key={i} style={{ background: CARD, borderRadius: 6 }}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full cursor-pointer items-center text-left"
                    style={{ gap: 10, padding: "14.9px" }}
                    aria-expanded={open}
                  >
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: BODY, color: WHITE }}>
                      {open ? "−" : "+"}
                    </span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: BODY, color: WHITE }}>
                      {q}
                    </span>
                  </button>
                  {open ? (
                    <p
                      style={{
                        padding: "0 14.9px 16px 40px",
                        fontFamily: MONO, fontWeight: 400, fontSize: 13,
                        lineHeight: 1.7, color: "rgba(248,248,248,0.65)",
                      }}
                    >
                      Applications close a week before the event. Keep an eye on
                      the Discord server for the exact date and rolling
                      acceptances.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="w-full cursor-pointer transition-transform hover:-translate-y-[1px]"
            style={{
              background: BLUE, borderRadius: 6, padding: "14.9px",
              fontFamily: MONO, fontWeight: 700, fontSize: BODY, color: WHITE,
            }}
          >
            MORE FAQ -&gt;
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- footer */}
      <footer style={{ paddingLeft: PAD, paddingRight: PAD, paddingBottom: 49.65 }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "366.22fr 366.22fr",
            gap: 62.06,
            borderTop: "1px solid rgba(248,248,248,0.12)",
            paddingTop: 68.27,
          }}
        >
          <div>
            <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: 23.83, lineHeight: 1.4, color: WHITE }}>
              Feel free to email us with any questions or queries.
            </p>
            <form
              className="flex items-center justify-between"
              style={{
                marginTop: 36.9, borderRadius: 100,
                border: "1px solid rgba(248,248,248,0.25)",
                padding: "14.9px 24.83px",
              }}
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="ENTER EMAIL"
                aria-label="Email address"
                className="w-full bg-transparent outline-none"
                style={{
                  fontFamily: MONO, fontWeight: 700, fontSize: META,
                  color: WHITE, letterSpacing: "0.04em",
                }}
              />
              <span style={{ fontSize: 16, color: WHITE }}>→</span>
            </form>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 6.2 }}>
            {[
              { head: "HELP", items: ["CONTACT US", "ABOUT US", "FAQS"] },
              { head: "SOCIAL", items: ["INSTAGRAM", "FACEBOOK", "TWITTER"] },
            ].map((col) => (
              <div key={col.head} className="flex flex-col" style={{ gap: 14.9 }}>
                <Mono style={{ color: WHITE }}>{col.head}</Mono>
                {col.items.map((l) => (
                  <Mono key={l} style={{ color: "rgba(248,248,248,0.7)" }}>{l}</Mono>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 62.06 }}>
          <div className="flex" style={{ gap: 37.24 }}>
            <Mono size={12.4} style={{ color: "rgba(248,248,248,0.55)" }}>Privacy policy</Mono>
            <Mono size={12.4} style={{ color: "rgba(248,248,248,0.55)" }}>Terms of service</Mono>
          </div>
          <Mono size={12.4} style={{ color: "rgba(248,248,248,0.55)" }}>+2019 TO 2022</Mono>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------------- embed */

/**
 * The site as the case study shows it: scaled from its 869px design width to
 * the column, then clipped to a fixed frame that scrolls on its own.
 * `overscroll-contain` keeps a scroll that reaches the frame's end from
 * chaining out into the case study behind it.
 */
export function HacksvitSiteEmbed() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [siteH, setSiteH] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const site = siteRef.current;
    if (!wrap || !site) return;
    const measure = () => {
      setScale(wrap.clientWidth / DESIGN_W);
      // Transforms don't affect layout, so this is the unscaled height.
      setSiteH(site.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(site);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden"
      style={{ borderRadius: 16, border: "1px solid #232326", background: BG }}
    >
      {/* Browser chrome, so the frame reads as a site rather than as a panel
          the case study forgot to finish. */}
      <div
        className="flex items-center"
        style={{ gap: 6, padding: "10px 14px", borderBottom: "1px solid #232326", background: "#141416" }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} className="block rounded-full" style={{ height: 9, width: 9, background: c }} />
        ))}
        <span
          className="ml-[10px] rounded-[6px]"
          style={{
            padding: "3px 10px", background: "#0a0a0a",
            fontFamily: MONO, fontWeight: 700, fontSize: 10, color: "#8a8a92",
          }}
        >
          hacksvit.tech
        </span>
      </div>

      <div
        data-site-scroller
        data-no-track-drag
        className="no-scrollbar relative overflow-y-auto overscroll-contain"
        style={{ height: FRAME_H }}
      >
        {/* The bar pins here rather than inside the page: sticky needs an
            ancestor chain to the scroller with no transform on it, and the
            page below is scaled. Zero height so the hero still starts at the
            top of the frame and the bar overlays it, as the file has it. */}
        <div className="sticky top-0 z-30" style={{ height: 0 }}>
          <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
            <SiteNav scale={scale} />
          </div>
        </div>
        <div className="relative" style={{ height: siteH * scale }}>
          <div
            ref={siteRef}
            className="absolute left-0 top-0 origin-top-left"
            style={{ transform: `scale(${scale})` }}
          >
            <HacksvitSite />
          </div>
        </div>
      </div>
    </div>
  );
}
