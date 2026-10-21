import { useState } from "react";
import { ContactModal } from "../pieces/ContactModal";
import type { Theme } from "../pieces/Piece";
import { CV } from "./content";

/**
 * Organised mode's footer (Figma Homepage 2232:4847 / 2232:4729): one line,
 * not an illustration, in a 101px band the full width of the window under the
 * sidebar and the page both. The band is the page inverted — ink with paper
 * type in light mode, paper with ink type in dark — so it closes the page off
 * without a rule.
 *
 *   left    where Dvija is and the time there
 *   centre  the social links, plus Email, which opens the contact form —
 *           the cursor turns into the paper ball's old line over it. All of
 *           them take the cursor's snapping fill, like the nav
 *   right   the rights line
 *
 * Three rows, centred, on the phone.
 */
const COPYRIGHT = `© ${new Date().getFullYear()} Dvija Patel. All Rights Reserved.`;
const LINK =
  "font-medium transition-colors duration-200 hover:text-[var(--footer-fg)] focus-visible:outline-2 focus-visible:outline-offset-4";

export function SiteFooter({ theme, clock }: { theme: Theme; clock: string }) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <footer
      className="relative z-10 px-[24px] py-[40px] md:px-[60px]"
      style={
        {
          background: "var(--content)",
          "--footer-fg": "var(--surface)",
          // The hover fill, re-tinted for the inverted band.
          "--tint": "color-mix(in srgb, var(--surface) 16%, transparent)",
        } as React.CSSProperties
      }
    >
      <div
        className="grid grid-cols-1 items-center justify-items-center gap-[12px] text-[14px] leading-[21px] md:grid-cols-[1fr_auto_1fr] md:justify-items-stretch"
        style={{ color: "color-mix(in srgb, var(--surface) 82%, var(--content))" }}
      >
        <p className="tabular-nums md:justify-self-start">{clock}</p>

        <div className="flex items-center gap-[24px]">
          {CV.contact.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              data-cursor-frame="pill"
              className={LINK}
              style={{ outlineColor: "var(--footer-fg)" }}
            >
              {c.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            data-cursor-bubble="Hey, don't toss that idea away!"
            data-cursor-frame="pill"
            className={`${LINK} cursor-pointer border-0 bg-transparent p-0`}
            style={{ outlineColor: "var(--footer-fg)" }}
          >
            Email
          </button>
        </div>

        <p className="md:justify-self-end md:text-right">{COPYRIGHT}</p>
      </div>

      {formOpen ? <ContactModal theme={theme} onClose={() => setFormOpen(false)} /> : null}
    </footer>
  );
}
