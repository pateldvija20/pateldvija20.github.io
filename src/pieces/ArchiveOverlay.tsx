import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ARCHIVE_COLUMNS } from "../organized/content";
import { BackControl } from "./BackControl";

/**
 * The Archive, opened from the finished puzzle in Scattered mode.
 *
 * Shows the same content Organised mode does — the puzzle is a second route
 * to it, never the only one. Both read `ARCHIVE_COLUMNS`, so filling the
 * Archive in fills it in for both.
 */
export function ArchiveOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.projectOpen = "true";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.projectOpen;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Archive"
      data-project-overlay
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto w-full max-w-[1512px] px-[30px] py-[100px] md:px-[60px] lg:px-[100px]">
        <h2 className="mb-[60px] font-slab text-page" style={{ color: "var(--content)" }}>
          Archive
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {ARCHIVE_COLUMNS.map((column, ci) => (
            <div key={ci} className="flex flex-col gap-8">
              {column.map((height, ri) => (
                <div
                  key={ri}
                  className="w-full overflow-hidden rounded-xl bg-well"
                  style={{ height, border: "1px solid var(--edge)" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <BackControl onClick={onClose} label="Back" aria-label="Back — close the Archive" />
    </div>,
    document.body,
  );
}
