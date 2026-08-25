import { SvgPiece, type Theme } from "./Piece";

const CONNECT_LINKS: { label: string; href: string }[] = [
  { label: "Linkedin", href: "https://www.linkedin.com/in/pateldvija" },
  { label: "Github", href: "https://github.com/pateldvija" },
  { label: "Twitter", href: "https://twitter.com/pateldvija" },
];

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
    </div>
  );
}
