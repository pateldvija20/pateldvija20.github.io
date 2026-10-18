import { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "../pieces/Piece";
import { PROJECTS } from "../pieces/projects";
import { AboutSection } from "./AboutSection";
import { Cursor } from "./Cursor";
import { HeroSection } from "./HeroSection";
import { PlaySection } from "./PlaySection";
import { ProjectOverlay } from "./ProjectOverlay";
import { ResumeSection } from "./ResumeSection";
import { usePage } from "./router";
import { Sidebar } from "./Sidebar";
import { SiteFooter } from "./SiteFooter";
import { WorkSection } from "./WorkSection";

/**
 * Organised mode: the directly linkable version of the portfolio.
 *
 * A set of pages, after madhurima.me — Work (with the hero), Play, About and
 * CV each at their own URL (see `router.ts`) — beside one persistent sidebar.
 * The page content fades in as it arrives, after rachelchen.tech: from
 * transparent and slightly blurred to sharp (`.page-fade` in index.css).
 *
 * The Writing and Archive sections are built but unpublished, so they have no
 * page yet.
 */
export function OrganizedPage({
  theme,
  initialSlug = null,
  onEnterPlayground,
  onToggleTheme,
  clock,
}: {
  theme: Theme;
  /** The light switch: the hanging lamp flips the theme. */
  onToggleTheme: () => void;
  /** "City, time" for the footer. */
  clock: string;
  /** Switches to the desk. Absent where the desk is unavailable. */
  onEnterPlayground?: () => void;
  /** Project a `/projects/<slug>` deep link should open. */
  initialSlug?: string | null;
}) {
  const page = usePage();
  const [openSlug, setOpenSlug] = useState<string | null>(initialSlug);
  /** The card the overlay should grow out of; null for a deep link, which has
   *  no card to come from and so opens without the grow. */
  const [openFrom, setOpenFrom] = useState<HTMLElement | null>(null);
  const open = openSlug ? (PROJECTS.find((p) => p.slug === openSlug) ?? null) : null;

  const openProject = useCallback((slug: string, el: HTMLElement) => {
    setOpenFrom(el);
    setOpenSlug(slug);
    // A case study is a place, so it gets a history entry — Back closes it.
    history.pushState(null, "", `/projects/${slug}`);
  }, []);

  const closeProject = useCallback(() => {
    setOpenSlug(null);
    setOpenFrom(null);
    if (window.location.pathname.startsWith("/projects/")) history.back();
  }, []);

  // Back/Forward drive the overlay rather than the other way round.
  useEffect(() => {
    const onPop = () => {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const slug = parts[0] === "projects" ? (parts[1] ?? null) : null;
      setOpenSlug(slug && PROJECTS.some((p) => p.slug === slug) ? slug : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // A new page starts at its top. Not on arrival, which is already there.
  const firstPage = useRef(page);
  useEffect(() => {
    if (page === firstPage.current) return;
    firstPage.current = page;
    window.scrollTo({ top: 0 });
  }, [page]);

  return (
    <>
      <div className="flex w-full flex-col lg:flex-row lg:items-start">
        <Sidebar page={page} theme={theme} onToggleTheme={onToggleTheme} />
        {/* At least a screen tall, so a short page keeps the footer below the
            fold instead of pulling it up beside the sidebar. */}
        <main key={page} className="page-fade flex min-h-screen min-w-0 flex-1 flex-col">
          {page === "work" ? (
            <>
              <HeroSection theme={theme} onToggleTheme={onToggleTheme} />
              <WorkSection onOpen={openProject} />
            </>
          ) : null}
          {page === "play" ? <PlaySection onEnterPlayground={onEnterPlayground} /> : null}
          {page === "about" ? <AboutSection /> : null}
          {page === "cv" ? <ResumeSection /> : null}
        </main>
      </div>

      {/* Under the sidebar and the page both, edge to edge. */}
      <SiteFooter theme={theme} clock={clock} />

      <Cursor />

      {open ? <ProjectOverlay project={open} theme={theme} from={openFrom} onClose={closeProject} /> : null}
    </>
  );
}
