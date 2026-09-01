import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { Theme } from "../pieces/Piece";
import { PROJECTS } from "../pieces/projects";
import { AboutSection } from "./AboutSection";
import { ArchiveSection } from "./ArchiveSection";
import type { SectionId } from "./content";
import { ProjectOverlay } from "./ProjectOverlay";
import { ResumeSection } from "./ResumeSection";
import { Sidebar } from "./Sidebar";
import { WorkSection } from "./WorkSection";
import { WritingSection } from "./WritingSection";

/**
 * Organised mode: the directly linkable version of the portfolio.
 *
 * A document, not a scene — real layout, real breakpoints, one vertical
 * scroll. It replaced a horizontal carousel of desk objects; the desk lives
 * only in Scattered now, and every piece of content reachable there has a
 * destination here.
 *
 * Above the 1512px Figma frame the content column stops growing and centres;
 * the background keeps going.
 */
export function OrganizedPage({
  theme,
  initialSection = null,
  initialSlug = null,
}: {
  theme: Theme;
  /** Section a deep link should land on. */
  initialSection?: SectionId | null;
  /** Project a `/projects/<slug>` deep link should open. */
  initialSlug?: string | null;
}) {
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

  // Land a deep link on its section. Layout effect and no smooth behaviour:
  // this is an arrival, not a navigation, so it should already be there on
  // the first paint rather than animating from the top.
  useLayoutEffect(() => {
    if (!initialSection) return;
    document.getElementById(initialSection)?.scrollIntoView({ block: "start" });
  }, [initialSection]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1512px] flex-col lg:flex-row lg:items-start">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <WorkSection onOpen={openProject} />
          <AboutSection />
          <WritingSection />
          <ResumeSection />
          <ArchiveSection />
        </main>
      </div>

      {open ? <ProjectOverlay project={open} theme={theme} from={openFrom} onClose={closeProject} /> : null}
    </>
  );
}
