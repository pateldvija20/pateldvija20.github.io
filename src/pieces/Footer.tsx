import { SvgPiece, type Theme } from "./Piece";

/**
 * The legal line, in one place because the desk and phone footers are two
 * separate compositions rather than one responsive layout.
 *
 * A copyright claim and nothing else: the site sets no cookies beyond three
 * functional keys, runs no analytics, embeds no third-party script and has no
 * form that collects anything, so a privacy notice would be describing
 * practices it does not have. Add one the day any of that stops being true.
 */
const COPYRIGHT = `\u00a9 ${new Date().getFullYear()} Dvija Patel. All rights reserved.`;

const CONNECT_LINKS: { label: string; href: string }[] = [
  { label: "Linkedin", href: "https://www.linkedin.com/in/pateldvija" },
  { label: "Github", href: "https://github.com/pateldvija" },
  { label: "Twitter", href: "https://twitter.com/pateldvija" },
];

/**
 * The phone footer (Figma 458:33453) is not the desk footer scaled down.
 * Desktop and tablet both keep the 1729:552 ratio exactly (0.3193), so they
 * are one artwork scaled; the phone's is 0.626, drops the chair entirely, and
 * lays the CONNECT links in a row. Scaling the desk footer to 440px would put
 * this card at 25% and make it unreadable, so the phone gets its own.
 */
export function FooterMobile({ theme, clock }: { theme: Theme; clock: string }) {
  const isDark = theme === "dark";
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
      </div>

      <p
        className={`mt-6 text-[13px] leading-normal opacity-55 ${isDark ? "text-[#fdfeff]" : "text-[#2f2f2f]"}`}
      >
        {COPYRIGHT}
      </p>
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
  const surface = isDark
    ? "bg-[#2f2f2f] border-[#fdfeff] text-[#fdfeff]"
    : "bg-[rgba(253,254,255,0.85)] border-[#2f2f2f] text-[#2f2f2f]";

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ width: 1729, height: 552 }}>
      <SvgPiece src={`/assets/footer_${theme}.svg`} className="absolute inset-0 h-full w-full" alt="" />

      <div
        className={`absolute left-[78px] top-[84px] flex w-max flex-col items-start gap-[64px] whitespace-nowrap rounded-[12px] border-2 border-solid p-[24px] leading-normal shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm ${surface}`}
      >
        <div className="flex w-full flex-col items-start gap-[24px]">
          <p className="text-[14px] font-medium uppercase tracking-wide opacity-60" style={{ fontVariationSettings: '"opsz" 14' }}>
            connect:
          </p>
          <div className="flex w-full flex-col items-start gap-[24px] text-[18px] font-semibold capitalize">
            {CONNECT_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="relative shrink-0 transition-transform duration-200 after:block after:h-[2px] after:w-0 after:bg-current after:transition-[width] after:duration-200 hover:translate-x-1 hover:opacity-70 hover:after:w-full"
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
          <p className="text-[18px] font-semibold capitalize" style={{ fontVariationSettings: '"opsz" 14' }}>
            {clock}
          </p>
        </div>
      </div>

      {/* On the artboard rather than in the card: the card is the contact
          block, and a copyright claim is a property of the page, not of the
          way to reach its author. Aligned to the card's own 78px inset so the
          footer keeps one left edge. */}
      <p
        className={`absolute left-[78px] bottom-[44px] whitespace-nowrap text-[14px] leading-normal opacity-55 ${isDark ? "text-[#fdfeff]" : "text-[#2f2f2f]"}`}
        style={{ fontVariationSettings: '"opsz" 14' }}
      >
        {COPYRIGHT}
      </p>
    </div>
  );
}
