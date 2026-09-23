import { useState } from "react";
import { SvgPiece, type Theme } from "./Piece";
import { PaperBall } from "./PaperBall";
import { ContactModal } from "./ContactModal";

/**
 * The legal line, in one place because the desk and phone footers are two
 * separate compositions rather than one responsive layout.
 *
 * A copyright claim and nothing else: the site sets no cookies beyond three
 * functional keys, runs no analytics, embeds no third-party script beyond
 * the contact form's own submit endpoint, so a privacy notice would mostly
 * be describing practices it does not have. Add one the day any of that
 * stops being true.
 */
const COPYRIGHT = `© ${new Date().getFullYear()} Dvija Patel. All rights reserved.`;

const CONNECT_LINKS: { label: string; href: string }[] = [
  { label: "Linkedin", href: "https://www.linkedin.com/in/pateldvija/" },
  { label: "Github", href: "https://github.com/pateldvija20" },
  { label: "X", href: "https://x.com/pateldvija20" },
];

/* The chair is baked into footer_*.svg (Figma's composite, with only the
 * CONNECT card and its text stripped out so they can be live HTML). These are
 * that composite's own coordinates, on its 1729x552 artboard. */
const CARD = { left: 131, top: 107, width: 264, height: 338 };
/** Where the paper ball rests on the chair's seat. */
const PAPER_BALL_POSITION = { left: 1363, top: 204 };

/**
 * The phone footer (Figma 458:33453) is not the desk footer scaled down.
 * Desktop and tablet both keep the 1729:552 ratio exactly (0.3193), so they
 * are one artwork scaled; the phone's is 0.626, drops the chair entirely, and
 * lays the CONNECT links in a row. Scaling the desk footer to 440px would put
 * this card at 25% and make it unreadable, so the phone gets its own.
 *
 * The chair (and its paper ball) don't fit this composition either, so the
 * phone footer gets a plain "connect" button that opens the same form.
 */
export function FooterMobile({ theme, clock }: { theme: Theme; clock: string }) {
  const isDark = theme === "dark";
  const [formOpen, setFormOpen] = useState(false);
  const surface = isDark
    ? "bg-[#2f2f2f] border-[#fdfeff] text-[#fdfeff]"
    : "bg-[rgba(253,254,255,0.85)] border-[#2f2f2f] text-[#2f2f2f]";

  return (
    <div
      className={`relative w-full px-[30px] py-[30px] ${isDark ? "bg-[#2f2f2f]" : "halftone"}`}
    >
      <div
        className={`flex w-full flex-col gap-8 rounded-[12px] border-2 border-solid p-6 leading-normal backdrop-blur-sm ${surface}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] font-medium uppercase tracking-wide opacity-60">connect:</p>
          <div className="flex flex-wrap gap-6 text-[18px] font-semibold capitalize">
            {CONNECT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition-opacity duration-200 hover:opacity-70"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-[14px] font-medium uppercase tracking-wide opacity-60">currently:</p>
          <p className="text-[18px] font-semibold capitalize">{clock}</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={`self-start rounded-full px-6 py-3 text-[15px] font-semibold transition-opacity hover:opacity-80 ${
            isDark ? "bg-[#fdfeff] text-[#2f2f2f]" : "bg-[#2f2f2f] text-[#fdfeff]"
          }`}
        >
          connect
        </button>
      </div>

      <p
        className={`mt-6 text-[13px] leading-normal opacity-55 ${isDark ? "text-[#fdfeff]" : "text-[#2f2f2f]"}`}
      >
        {COPYRIGHT}
      </p>

      {formOpen && <ContactModal theme={theme} onClose={() => setFormOpen(false)} />}
    </div>
  );
}

export function Footer({
  theme,
  clock,
  className,
}: {
  theme: Theme;
  clock: string;
  className?: string;
}) {
  const isDark = theme === "dark";
  const [formOpen, setFormOpen] = useState(false);
  const surface = isDark
    ? "bg-[#2f2f2f] border-[#fdfeff] text-[#fdfeff]"
    : "bg-[rgba(253,254,255,0.85)] border-[#2f2f2f] text-[#2f2f2f]";
  const comma = clock.indexOf(", ");
  const city = comma === -1 ? clock : clock.slice(0, comma);
  const time = comma === -1 ? "" : clock.slice(comma + 2);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ width: 1729, height: 552 }}>
      <SvgPiece src={`/assets/footer_${theme}.svg`} className="absolute inset-0 h-full w-full" alt="" />

      <PaperBall
        theme={theme}
        onOpen={() => setFormOpen(true)}
        className="absolute z-10"
        style={{ left: PAPER_BALL_POSITION.left, top: PAPER_BALL_POSITION.top }}
      />

      <div
        className={`absolute z-10 box-border flex w-max flex-col items-start gap-[65px] whitespace-nowrap rounded-[12px] border-2 border-solid px-[24px] pb-[26px] pt-[21px] leading-[20px] shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm ${surface}`}
        style={{ left: CARD.left, top: CARD.top, minWidth: CARD.width, minHeight: CARD.height }}
      >
        {/* Line heights and gaps are set from the composite's own text
            positions: labels 43px above their first line, links on a 47px
            pitch, 86px from the last link to CURRENTLY. */}
        <div className="flex w-full flex-col items-start gap-[24px]">
          <p className="text-[14px] font-medium uppercase tracking-wide opacity-60" style={{ fontVariationSettings: '"opsz" 14' }}>
            connect:
          </p>
          <div className="flex w-full flex-col items-start gap-[27px] text-[18px] font-semibold capitalize">
            {CONNECT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="relative shrink-0 transition-transform duration-200 after:absolute after:-bottom-[3px] after:left-0 after:h-[2px] after:w-0 after:bg-current after:transition-[width] after:duration-200 hover:translate-x-1 hover:opacity-70 hover:after:w-full"
                style={{ fontVariationSettings: '"opsz" 14' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-[24px]">
          <p className="text-[14px] font-medium uppercase tracking-wide opacity-60" style={{ fontVariationSettings: '"opsz" 14' }}>
            currently:
          </p>
          {/* Figma sets the city and the time on one line, the time pushed to
              the card's right edge. */}
          <p
            className="flex w-full justify-between gap-[24px] text-[18px] font-semibold"
            style={{ fontVariationSettings: '"opsz" 14' }}
          >
            <span>{city}</span>
            <span>{time}</span>
          </p>
        </div>
      </div>

      {/* On the artboard rather than in the card: the card is the contact
          block, and a copyright claim is a property of the page, not of the
          way to reach its author. Aligned to the card's own left edge so the
          footer keeps one left edge. */}
      <p
        style={{ left: CARD.left, fontVariationSettings: '"opsz" 14' }}
        className={`absolute bottom-[44px] whitespace-nowrap text-[14px] leading-normal opacity-55 ${isDark ? "text-[#fdfeff]" : "text-[#2f2f2f]"}`}
      >
        {COPYRIGHT}
      </p>

      {formOpen && <ContactModal theme={theme} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
