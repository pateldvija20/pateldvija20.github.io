import Link from "next/link"
import { notFound } from "next/navigation"
import { getCaseStudyBySlug, getCaseStudies } from "@/lib/sanity"
import { CaseStudyContent } from "@/components/FolderCard/CaseStudyContent"
import { UnlockBodyScroll } from "./UnlockBodyScroll"

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

// Pre-render every known case study slug at build time.
export async function generateStaticParams() {
  const studies = await getCaseStudies()
  return studies.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { slug } = await params
  const study = await getCaseStudyBySlug(slug)
  if (!study) return { title: "Project not found" }
  return {
    title: `${study.name} — Portfolio`,
    description: study.description || undefined,
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const study = await getCaseStudyBySlug(slug)
  if (!study) notFound()

  return (
    <main className="min-h-screen bg-[#f2f0ea]">
      {/* Undo body-scroll lock the desk scene may have left behind when it
          unmounted during client-side navigation into this route. */}
      <UnlockBodyScroll />
      <div className="mx-auto max-w-[900px] px-6 py-10 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#000912] transition-colors no-underline mb-8"
        >
          ← Back to work
        </Link>

        {/* NOTE: no `overflow: hidden` on this wrapper — it'd clip the
            sticky TOC sidebar out of view as the page scrolls past. Sticky
            children can't extend beyond an overflow-hidden ancestor. */}
        <div className="bg-[#FCFEFF] rounded-[20px] shadow-xl">
          {/* Header */}
          <div className="px-7 pt-6 pb-4 border-b border-black/5">
            {(study.year || study.tags) && (
              <p className="m-0 text-[11px] tracking-widest uppercase text-[#888]">
                {[study.year, study.tags].filter(Boolean).join(" · ")}
              </p>
            )}
            <h1 className="mt-1.5 mb-0 text-[26px] font-bold text-[#000912]">
              {study.name}
            </h1>
          </div>

          {/* Body */}
          <div className="px-7 py-6">
            <CaseStudyContent sections={study.sections} />
          </div>
        </div>
      </div>
    </main>
  )
}
