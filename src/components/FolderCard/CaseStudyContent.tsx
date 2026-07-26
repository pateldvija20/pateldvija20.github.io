"use client"

import { useEffect, useRef, useState } from "react"
import { PortableText } from "@portabletext/react"
import gsap from "gsap"
import type { CaseStudySection } from "@/lib/sanity"
import { portableTextComponents } from "@/components/portableTextComponents"

function sectionId(key: string) {
  return `case-study-section-${key}`
}

// Finds the nearest scrollable ancestor (rather than a hardcoded class name)
// so this component works both inside PageCard's modal body and as a plain
// full-page route — walks up until it finds an actual overflow:auto/scroll
// container, falling back to the document's own scrolling element.
function findScrollRoot(el: HTMLElement | null): Element {
  let node = el?.parentElement ?? null
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === "auto" || overflowY === "scroll") return node
    node = node.parentElement
  }
  return document.scrollingElement ?? document.documentElement
}

interface CaseStudyContentProps {
  study?: {
    name:        string
    description?: string
    year?:        string
    tags?:        string
    type?:        string
  }
  sections: CaseStudySection[]
  loading?: boolean
  onClose?: () => void
}

export function CaseStudyContent({ study, sections, loading = false, onClose }: CaseStudyContentProps) {
  const rootRef          = useRef<HTMLDivElement>(null)
  const navRef           = useRef<HTMLElement>(null)
  const indicatorRef     = useRef<HTMLDivElement>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const itemRefs         = useRef<Record<string, HTMLButtonElement | null>>({})
  const sectionRefs      = useRef<Record<string, HTMLElement | null>>({})
  const [activeKey, setActiveKey] = useState<string | null>(sections[0]?._key ?? null)

  // ── Scrollspy: 100% frame-perfect active section determination ──────────────
  useEffect(() => {
    if (loading || sections.length === 0) return
    const scrollContainer = contentScrollRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect()
      // Reading threshold: 140px down from container top
      const readingLine = containerRect.top + 140

      const { scrollTop, scrollHeight, clientHeight } = scrollContainer
      if (scrollTop + clientHeight >= scrollHeight - 30) {
        setActiveKey(sections[sections.length - 1]._key)
        return
      }

      let currentActive: string = sections[0]._key

      for (const s of sections) {
        const el = sectionRefs.current[s._key]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= readingLine) {
          currentActive = s._key
        }
      }

      setActiveKey(currentActive)
    }

    handleScroll()
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll, { passive: true })
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [sections, loading])

  // ── Slide the active-indicator bar next to whichever TOC item is active ────
  // Uses DOM offsetTop hierarchy which is 100% immune to 3D transforms & window scroll
  useEffect(() => {
    if (!activeKey || !indicatorRef.current) return
    const item = itemRefs.current[activeKey]
    const nav = navRef.current
    if (!item || !nav) return

    let targetY = item.offsetTop
    let parent = item.offsetParent as HTMLElement | null
    while (parent && parent !== nav && nav.contains(parent)) {
      targetY += parent.offsetTop
      parent = parent.offsetParent as HTMLElement | null
    }
    const targetH = item.offsetHeight

    gsap.to(indicatorRef.current, {
      y: targetY,
      height: targetH,
      opacity: 1,
      duration: 0.2,
      ease: "power2.out",
    })
  }, [activeKey])

  function scrollToSection(key: string) {
    const el = sectionRefs.current[key]
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (loading) {
    return (
      <div className="flex gap-8 animate-pulse" aria-busy="true">
        <div className="w-[163px] shrink-0 flex flex-col gap-5 pt-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-black/10" style={{ width: `${60 + (i % 3) * 15}%` }} />
          ))}
        </div>
        <div className="w-px bg-black/10 self-stretch" />
        <div className="flex-1 flex flex-col gap-4 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-1/3 rounded bg-black/10" />
              <div className="h-3 w-full rounded bg-black/5" />
              <div className="h-3 w-5/6 rounded bg-black/5" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className="py-16 text-center text-[13px] text-[#999]">
        This case study doesn&apos;t have any content yet.
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex items-start gap-8 w-full h-full min-h-0 overflow-hidden">
      {/* ── Sidebar (Back button + Table of contents) — 100% Static ── */}
      <div className="w-[163px] shrink-0 relative flex flex-col gap-6 py-6 select-none h-full overflow-hidden">
        {onClose && (
          <button
            data-no-deck-drag
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#7A7A7A] hover:text-[#000912] transition-colors bg-transparent border-none cursor-pointer p-0 text-left"
          >
            ← Back to work
          </button>
        )}
        <nav
          ref={navRef}
          className="w-full relative"
          aria-label="Case study sections"
        >
          {/* Sliding active-section indicator */}
          <div
            ref={indicatorRef}
            className="absolute left-0 w-[2.5px] rounded-full bg-[#000912] opacity-0"
            style={{ top: 0 }}
          />
          <ul className="flex flex-col gap-[18px] pl-4 list-none m-0">
            {sections.map((s) => {
              const isActive = s._key === activeKey
              return (
                <li key={s._key}>
                  <button
                    ref={(el) => { itemRefs.current[s._key] = el }}
                    data-no-deck-drag
                    onClick={() => scrollToSection(s._key)}
                    className="text-left text-[13px] leading-snug bg-transparent border-none p-0 cursor-pointer transition-colors duration-300"
                    style={{
                      color:      isActive ? "#000912" : "#9CA3AF",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {s.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* ── Separator ── */}
      <div className="w-px bg-black/10 self-stretch shrink-0" />

      {/* ── Scrollable Content Column ── */}
      <div ref={contentScrollRef} className="flex-1 min-w-0 overflow-y-auto h-full py-6 pr-4">
        {/* Main Header above section content */}
        {study && (
          <div className="mb-8 select-none">
            <div className="text-[16px] font-mono tracking-[0.08em] uppercase text-[#6B7280] flex items-center gap-2">
              {[
                study.name,
                study.tags || study.type,
                study.year
              ].filter((t): t is string => Boolean(t)).map((t) => t.toUpperCase()).join("  •  ")}
            </div>
            <h1 className="mt-2.5 mb-0 text-[40px] font-semibold leading-[1.22] text-[#000912] font-display">
              {study.description || study.name}
            </h1>
          </div>
        )}

        {sections.map((s, i) => (
          <section
            key={s._key}
            id={sectionId(s._key)}
            data-section-key={s._key}
            ref={(el) => { sectionRefs.current[s._key] = el }}
            className={i > 0 ? "pt-9 mt-9 border-t border-black/5" : ""}
          >
            <h3 className="text-[16px] font-semibold uppercase tracking-wider text-[#888] mb-3.5">
              {s.title}
            </h3>
            <PortableText value={s.content} components={portableTextComponents} />
          </section>
        ))}
      </div>
    </div>
  )
}
