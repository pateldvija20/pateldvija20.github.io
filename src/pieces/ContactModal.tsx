import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { Theme } from "./Piece";

/**
 * The "Let's Talk" form (Figma reference), reached by unfolding the
 * crumpled-paper piece that sits on the footer's chair. A plain modal, not
 * the paper itself — the paper's job ends at the unfold; this is a clean
 * sheet, easier to read and to fill in than an animated one would be.
 *
 * Submissions post to `/api/contact`, a Vercel function that mails them via
 * Resend with a "[Portfolio Reachout]" subject tag — see api/contact.ts
 * for the one-time Gmail filter that turns that tag into a label.
 */

const HOW_FOUND_OPTIONS = [
  "LinkedIn",
  "Instagram",
  "Twitter / X",
  "Referral",
  "Google search",
  "A talk or event",
  "Something I built",
  "Other",
];

type Status = "idle" | "sending" | "sent" | "error";

export function ContactModal({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const isDark = theme === "dark";
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Sorry, that didn't send. Could you try again in a minute?");
    }
  }

  const surface = isDark
    ? "border-[#fdfeff] bg-[#2f2f2f] text-[#fdfeff]"
    : "border-[#2f2f2f] bg-[#fdfeff] text-[#2f2f2f]";
  const fieldSurface = isDark
    ? "bg-[#3a3a3a] border-[#fdfeff] text-[#fdfeff] placeholder:text-[#fdfeff]/40"
    : "bg-[#f5f6f7] border-[#2f2f2f] text-[#2f2f2f] placeholder:text-[#2f2f2f]/40";
  /** Send (and the thank-you Close): a rounded rectangle, not a pill, filled
   *  in the theme's ink with a stroke in the same colour as the fields'. */
  const primaryButton = `inline-flex h-[52px] min-w-[220px] items-center justify-center rounded-[10px] border-2 px-8 text-[18px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
    isDark
      ? "border-[#fdfeff] bg-[#fdfeff] text-[#2f2f2f]"
      : "border-[#2f2f2f] bg-[#2f2f2f] text-[#fdfeff]"
  }`;
  const label = "text-[15px] font-semibold";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Let's Talk"
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: "rgba(20,20,20,0.55)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Capped to the viewport (minus the overlay's 24px on every side) and
          scrolling inside itself. Centring a taller-than-viewport box in a
          scrolling flex overlay clips its top — the heading and the close
          button — out of reach. */}
      <div
        className={`relative flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-[20px] border-2 shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${surface}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-[18px] leading-none transition-opacity hover:opacity-70 ${
            isDark ? "border-[#fdfeff]" : "border-[#2f2f2f]"
          }`}
        >
          ×
        </button>

        <div className="overflow-y-auto overscroll-contain p-6 sm:px-10 sm:py-8">
          {status === "sent" ? (
            <div className="flex flex-col items-start gap-4 py-10">
              <h2 className="font-slab text-[40px] leading-tight">Thank you!</h2>
              <p className="text-[16px] opacity-70">
                I'm so glad you reached out. I'll get back to you within 5 business days.
              </p>
              <button type="button" onClick={onClose} className={`mt-4 ${primaryButton}`}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <h2 className="pr-12 font-slab text-[36px] leading-tight sm:text-[44px]">Let's Talk</h2>

              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-medium uppercase tracking-wide opacity-60">
                  Your name
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Field
                    id={`${formId}-first`}
                    name="firstName"
                    label="First name"
                    required
                    fieldSurface={fieldSurface}
                    labelClass={label}
                  />
                  <Field
                    id={`${formId}-last`}
                    name="lastName"
                    label="Last name"
                    required
                    fieldSurface={fieldSurface}
                    labelClass={label}
                  />
                </div>
              </div>

              <Field
                id={`${formId}-email`}
                name="email"
                type="email"
                label="Your email"
                required
                fieldSurface={fieldSurface}
                labelClass={label}
              />

              <div className="flex flex-col gap-2">
                <label htmlFor={`${formId}-project`} className={label}>
                  Tell me about your project
                </label>
                <p className="text-[13px] leading-snug opacity-60">
                  What are you building, who is it for, and what excites you about it? Links are
                  always welcome.
                </p>
                <textarea
                  id={`${formId}-project`}
                  name="project"
                  required
                  rows={3}
                  className={`w-full rounded-[10px] border-2 px-4 py-2.5 text-[15px] outline-none ${fieldSurface}`}
                />
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-4">
                <Field
                  id={`${formId}-timeline`}
                  name="timeline"
                  label="When would you like to start?"
                  required
                  fieldSurface={fieldSurface}
                  labelClass={label}
                />

                <div className="flex w-full flex-col gap-2">
                  <label htmlFor={`${formId}-source`} className={label}>
                    How did you find me?
                  </label>
                  <div className="relative">
                    <select
                      id={`${formId}-source`}
                      name="source"
                      required
                      defaultValue=""
                      className={`w-full appearance-none rounded-[10px] border-2 py-2.5 pl-4 pr-10 text-[15px] outline-none ${fieldSurface}`}
                    >
                      <option value="" disabled>
                        Select one
                      </option>
                      {HOW_FOUND_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3.5 6l4.5 4.5L12.5 6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button type="submit" disabled={status === "sending"} className={primaryButton}>
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
                <p className="text-[13px] leading-snug opacity-60">
                  I'll get back to you within 5 business days.
                </p>
              </div>

              {status === "error" && <p className="text-[13px] text-red-500">{errorMsg}</p>}
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  required,
  fieldSurface,
  labelClass,
}: {
  id: string;
  name: string;
  label: React.ReactNode;
  type?: string;
  required?: boolean;
  fieldSurface: string;
  labelClass: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        className={`w-full rounded-[10px] border-2 px-4 py-2.5 text-[15px] outline-none ${fieldSurface}`}
      />
    </div>
  );
}
