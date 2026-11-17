import { useEffect, useState } from "react";

/**
 * The shelf's addresses (docs/storyboard-plan.md, "Addresses"):
 *
 *   /                              home: the shelf, books covers-out
 *   /work, /work/<case>            the Work book open at that case study's spread
 *   /work/<case>/read              that case study, expanded into a page
 *   /playground, /playground/<n>   the Playground book open at page n (1-based)
 *   /playground/all                every Playground piece, as a grid
 *   /about, /about/<n>             the About book open at spread n
 *   /contact                       the coffee view, with the contact links
 *
 * Books live under /work/ because /bind-desk/ and /greenera/ already serve
 * the live clickable prototypes from public/.
 *
 * Plain History API, no router library. `navigate` pushes an entry and
 * announces it; `useRoute` follows that announcement and Back/Forward.
 */

// Only the three deployed case studies for now (16 Nov); The Family Table comes back here (and in content.ts) when it ships.
export const CASES = ["bind-desk", "billy-and-buddy", "greenera"] as const;
export type Case = (typeof CASES)[number];

export type Route =
  | { kind: "home" }
  | { kind: "work"; case: Case; read: boolean }
  | { kind: "playground"; page: number | "all" }
  | { kind: "about"; page: number }
  | { kind: "contact" };

const isCase = (s: string): s is Case => (CASES as readonly string[]).includes(s);
/** A 1-based page in the address, as a 0-based index; anything else is the first page. */
const pageOf = (s: string) => {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : 0;
};

/** Read a path. Anything unrecognised is home. */
export function parseRoute(path: string): Route {
  const [first = "", second = "", third = ""] = path.split("/").filter(Boolean);
  if (first === "work") {
    const c = isCase(second) ? second : CASES[0];
    return { kind: "work", case: c, read: isCase(second) && third === "read" };
  }
  if (first === "playground") return { kind: "playground", page: second === "all" ? "all" : pageOf(second) };
  if (first === "about") return { kind: "about", page: pageOf(second) };
  if (first === "contact") return { kind: "contact" };
  return { kind: "home" };
}

export function routePath(route: Route): string {
  switch (route.kind) {
    case "home":
      return "/";
    case "work":
      return route.read ? `/work/${route.case}/read` : `/work/${route.case}`;
    case "playground":
      return route.page === "all" ? "/playground/all" : route.page === 0 ? "/playground" : `/playground/${route.page + 1}`;
    case "about":
      return route.page === 0 ? "/about" : `/about/${route.page + 1}`;
    case "contact":
      return "/contact";
  }
}

/**
 * Old addresses from the Organised/Scattered site, the room and the long
 * shelf, mapped to their new homes so links already shared keep working.
 */
export function legacyRedirect(path: string): string | null {
  const [first = "", second = ""] = path.split("/").filter(Boolean);
  if (first === "projects") return isCase(second) ? `/work/${second}/read` : "/work";
  // The résumé lives in the About book now.
  if (first === "cv" || first === "work-experience" || first === "resume") return "/about";
  if (first === "play") return "/playground";
  if (first === "room") return "/";
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
 * tidy any unknown address to the canonical path of what it shows. The query
 * string is kept (the look-dev page lives at /?lookdev).
 */
export function applyLegacyRedirect() {
  const path = window.location.pathname;
  const legacy = legacyRedirect(path);
  const target = legacy ?? routePath(parseRoute(path));
  if (target !== path) {
    // An address that is neither old nor valid: say so, instead of silently showing something else.
    const clean = path.replace(/\/+$/, "") || "/";
    if (!legacy && clean !== target) (window as unknown as { __shelfNotice?: string }).__shelfNotice = `There's nothing at ${clean}, so here's ${target === "/" ? "the shelf" : "the closest page"}.`;
    history.replaceState(null, "", target + window.location.search);
  }
}

/** The address's page title and description (also read by search results and the browser's history). */
export function metaFor(route: Route): { title: string; description: string } {
  const name = "Dvija Patel";
  switch (route.kind) {
    case "home":
      return { title: `${name} \u2014 Product Designer`, description: "Dvija Patel is a product designer. Case studies, experiments and a way to say hello, all on one shelf." };
    case "work":
      return route.read
        ? { title: `${route.case.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())} \u2014 Case study \u2014 ${name}`, description: `A product design case study by ${name}.` }
        : { title: `Work \u2014 ${name}`, description: `Case studies by ${name}, product designer.` };
    case "playground":
      return { title: `Playground \u2014 ${name}`, description: `Illustration, experiments and notes by ${name}.` };
    case "about":
      return { title: `About \u2014 ${name}`, description: `About ${name}, and her r\u00e9sum\u00e9.` };
    case "contact":
      return { title: `Say hello \u2014 ${name}`, description: `Get in touch with ${name}: a message, a coffee chat, GitHub, X or LinkedIn.` };
  }
}
