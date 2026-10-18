import { useEffect, useState } from "react";

/**
 * Organised mode's pages, after madhurima.me: each section is its own page
 * with its own URL rather than a stop on one long scroll.
 *
 *   /            Work — the hero and the project grid
 *   /play        Play
 *   /about       About
 *   /cv          CV
 *
 * /projects/<slug> stays on Work with that case study open over it, and the
 * old /work-experience link lands on the CV.
 *
 * Plain History API, no router dependency: four pages and one overlay do not
 * need one. `navigate` pushes an entry and announces it; `usePage` follows
 * both that announcement and Back/Forward.
 */
export type Page = "work" | "play" | "about" | "cv";

export const PAGE_PATHS: Record<Page, string> = {
  work: "/",
  play: "/play",
  about: "/about",
  cv: "/cv",
};

export function pageFromPath(path: string): Page {
  const first = path.split("/").filter(Boolean)[0] ?? "";
  if (first === "play") return "play";
  if (first === "about") return "about";
  if (first === "cv" || first === "work-experience") return "cv";
  return "work";
}

const EVENT = "dp:navigate";

export function navigate(page: Page) {
  const path = PAGE_PATHS[page];
  if (window.location.pathname !== path) history.pushState(null, "", path);
  window.dispatchEvent(new Event(EVENT));
}

export function usePage(): Page {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  useEffect(() => {
    const sync = () => setPage(pageFromPath(window.location.pathname));
    // The old /work-experience link becomes /cv, so the address bar names
    // the page it is on.
    if (window.location.pathname === "/work-experience") history.replaceState(null, "", "/cv");
    window.addEventListener("popstate", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return page;
}
