import { useState } from "react";
import { ContactModal } from "../pieces/ContactModal";
import type { Theme } from "../pieces/Piece";
import { CV } from "./content";

/**
 * Organised mode's footer, after rachelchen.tech: one quiet line, not an
 * illustration, running the full width of the window under the sidebar and
 * the page both, with a rule along its top.
 *
 *   left    where Dvija is and the time there
 *   centre  the social links, plus Email, which opens the contact form —
 *           the cursor turns into the paper ball's old line over it. All of
 *           them take the cursor's snapping fill, like the nav
 *   right   the rights line
 *
 * Three rows, centred, on the phone.
 */
const COPYRIGHT = `© ${new Date().getFullYear()} Dvija Patel. All rights reserved.`;
const LINK =
  "text-[15px] transition-colors duration-200 hover:text-[var(--content)] focus-visible:outline-2 focus-visible:outline-offset-4";

export function SiteFooter({ theme, clock }: { theme: Theme; clock: string }) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <footer
      className="relative z-10 px-[24px] py-[28px] md:px-[60px]"
      style={{ borderTop: "1px solid var(--rule)", background: "var(--surface)" }}
    >
      <div
        className="grid grid-cols-1 items-center justify-items-center gap-[12px] text-[15px] md:grid-cols-[1fr_auto_1fr] md:justify-items-stretch"
        style={{ color: "var(--quiet)" }}
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
              style={{ outlineColor: "var(--content)" }}
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
            style={{ outlineColor: "var(--content)" }}
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
