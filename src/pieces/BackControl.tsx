import { useLayoutEffect, useRef, useState } from "react";

/**
 * The close control that sits in an overlay's top-left corner: a square with a
 * back arrow that widens to reveal its label on hover or focus.
 *
 * Lifted out of `FileFolder` so the folder's case study, the Work grid's case
 * study and the Archive all close the same way. The folder's own copy is
 * unchanged — this is the same behaviour, not a reimplementation of it.
 */
const BACK_SIZE = 36;
const BACK_RADIUS = 12;

export function BackControl({
  onClick,
  label = "Back To Home",
  "aria-label": ariaLabel,
}: {
  onClick: () => void;
  label?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [labelW, setLabelW] = useState(0);

  useLayoutEffect(() => {
    if (labelRef.current) setLabelW(labelRef.current.scrollWidth);
  }, [label]);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      data-no-track-drag
      // The visible label is part of the accessible name (WCAG 2.5.3); callers
      // append what is being closed so the control still says so while
      // collapsed.
      aria-label={ariaLabel ?? label}
      className="absolute left-0 top-0 z-10 flex cursor-pointer items-center overflow-hidden border-0 p-0"
      style={{
        background: "#2f2f2f",
        color: "#fdfeff",
        height: BACK_SIZE,
        borderBottomRightRadius: BACK_RADIUS,
        transition: "width 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        width: BACK_SIZE + (open ? labelW : 0),
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: BACK_SIZE, height: BACK_SIZE }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M19 12H5m0 0 7-7m-7 7 7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {/* Measured rather than guessed: the button tweens to a real width, so
          the label can be any length without a magic number to keep in step
          (and `width: auto` cannot be transitioned). */}
      <span
        ref={labelRef}
        aria-hidden
        className="whitespace-nowrap pr-[14px] text-[15px] leading-none"
        style={{ opacity: open ? 1 : 0, transition: "opacity 0.2s ease" }}
      >
        {label}
      </span>
    </button>
  );
}
