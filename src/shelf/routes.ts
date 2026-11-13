import { useEffect, useState } from "react";

/**
 * The bookshelf's addresses.
 *
 *   /                            the shelf
 *   /work/<book>                 that case study, pulled out and open
 *   /work/<book>/<section>       that section's first spread
 *   /about  /resume  /contact    that object, open
 *
 * Books live under /work/ because /bind-desk/ and /greenera/ already serve
 * the live clickable prototypes from public/.
 *
 * Plain History API, no router library. `navigate` pushes an entry and
 * announces it; `useRoute` follows that announcement and Back/Forward.
 */

export const BOOKS = ["bind-desk", "billy-and-buddy", "greenera", "the-family-table"] as const;
export type Book = (typeof BOOKS)[number];

export const SECTIONS = ["problem", "research", "design", "outcome"] as const;
export type Section = (typeof SECTIONS)[number];

export type Route =
  | { kind: "shelf" }
  | { kind: "work"; book: Book; section: Section | null }
  | { kind: "about" }
  | { kind: "resume" }
  | { kind: "contact" };

const isBook = (s: string): s is Book => (BOOKS as readonly string[]).includes(s);
const isSection = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);

/** Read a path. Anything unrecognised is the shelf. */
export function parseRoute(path: string): Route {
  const [first = "", second = "", third = ""] = path.split("/").filter(Boolean);
  if (first === "work" && isBook(second)) {
    return { kind: "work", book: second, section: isSection(third) ? third : null };
  }
  if (first === "about") return { kind: "about" };
  if (first === "resume") return { kind: "resume" };
  if (first === "contact") return { kind: "contact" };
  return { kind: "shelf" };
}

export function routePath(route: Route): string {
  switch (route.kind) {
    case "shelf":
      return "/";
    case "work":
      return route.section ? `/work/${route.book}/${route.section}` : `/work/${route.book}`;
    default:
      return `/${route.kind}`;
  }
}

/**
 * Old addresses from the Organised/Scattered site and the room, mapped to
 * their new homes so links already shared keep working.
 */
export function legacyRedirect(path: string): string | null {
  const [first = "", second = ""] = path.split("/").filter(Boolean);
  if (first === "projects") return isBook(second) ? `/work/${second}` : "/";
  if (first === "cv" || first === "work-experience") return "/resume";
  if (first === "play" || first === "room") return "/";
  return null;
}

const EVENT = "shelf:navigate";

export function navigate(route: Route, { replace = false } = {}) {
  const path = routePath(route);
  if (window.location.pathname !== path) {
    if (replace) history.replaceState(null, "", path);
    else history.pushState(null, "", path);
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The current route, kept in step with navigate() and Back/Forward. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener(EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return route;
}

/**
 * Run once at startup: swap an old address for its new one, in place, and
 * tidy any unknown address to the canonical path of what it shows.
 */
export function applyLegacyRedirect() {
  const path = window.location.pathname;
  const target = legacyRedirect(path) ?? routePath(parseRoute(path));
  if (target !== path) history.replaceState(null, "", target);
}
