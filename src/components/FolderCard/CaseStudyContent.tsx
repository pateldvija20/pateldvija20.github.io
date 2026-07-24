"use client"

import { useEffect, useRef, useState } from "react"
import { PortableText } from "@portabletext/react"
import gsap from "gsap"
import type { CaseStudySection } from "@/lib/sanity"

const portableTextComponents = {
  block: {
    h1: ({ children }: any) => <h1 className="text-[20px] font-bold mt-6 mb-3 text-[#000912]">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-[17px] font-semibold mt-5 mb-2 text-[#000912]">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-[15px] font-semibold mt-4 mb-2 text-[#000912]">{children}</h3>,
    normal: ({ children }: any) => <p className="text-[15px] leading-7 text-[#333] mb-4">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-[#5BAEFF] pl-4 my-4 text-[#555] italic text-[15px]">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="ml-5 mb-4 list-disc">{children}</ul>,
    number: ({ children }: any) => <ol className="ml-5 mb-4 list-decimal">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: any) => <li className="text-[15px] leading-7 text-[#333]">{children}</li>,
    number: ({ children }: any) => <li className="text-[15px] leading-7 text-[#333]">{children}</li>,
  },
  marks: {
    strong: ({ children }: any) => <strong>{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    code: ({ children }: any) => <code className="bg-black/5 px-1 rounded text-[13px]">{children}</code>,
    link: ({ value, children }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="underline text-[#3B82F6]">
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }: any) => (
      <figure className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value?.asset?.url} alt={value?.alt ?? ""} className="w-full rounded-xl object-cover" />
        {value?.caption && (
          <figcaption className="text-[12px] text-[#888] text-center mt-2">{value.caption}</figcaption>
        )}
      </figure>
    ),
  },
}

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
  sections: CaseStudySection[]
  loading?: boolean
}

export function CaseStudyContent({ sections, loading = false }: CaseStudyContentProps) {
  const rootRef       = useRef<HTMLDivElement>(null)
  const navRef        = useRef<HTMLElement>(null)
  const indicatorRef  = useRef<HTMLDivElement>(null)
  const itemRefs      = useRef<Record<string, HTMLButtonElement | null>>({})
  const sectionRefs   = useRef<Record<string, HTMLElement | null>>({})
  const [activeKey, setActiveKey] = useState<string | null>(sections[0]?._key ?? null)

  // ── Scrollspy: highlight the TOC entry for whichever section is topmost
  // in the scroll container's "reading band" (a slice near the top). ──────────
  useEffect(() => {
    if (loading || sections.length === 0) return
    const root = findScrollRoot(rootRef.current)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        // Pick whichever intersecting section is closest to the top of the band.
        const topMost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        )
        const key = topMost.target.getAttribute("data-section-key")
        if (key) setActiveKey(key)
      },
      { root, rootMargin: "-12% 0px -70% 0px", threshold: 0 }
    )

    sections.forEach((s) => {
      const el = sectionRefs.current[s._key]
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections, loading])

  // ── Reveal-on-scroll: fade/slide each section up once, the first time it
  // enters the viewport. ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || sections.length === 0) return
    const root = findScrollRoot(rootRef.current)

    const revealed = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.getAttribute("data-section-key")
          if (!key || !entry.isIntersecting || revealed.has(key)) return
          revealed.add(key)
          gsap.fromTo(
            entry.target,
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
          )
          observer.unobserve(entry.target)
        })
      },
      { root, rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    )

    sections.forEach((s) => {
      const el = sectionRefs.current[s._key]
      if (el) {
        gsap.set(el, { opacity: 0, y: 18 }) // seed pre-reveal state
        observer.observe(el)
      }
    })
    return () => observer.disconnect()
  }, [sections, loading])

  // ── Slide the active-indicator bar next to whichever TOC item is active. ───
  useEffect(() => {
    if (!activeKey || !indicatorRef.current) return
    const item = itemRefs.current[activeKey]
    const nav = navRef.current
    if (!item || !nav) return
    const navRect = nav.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    gsap.to(indicatorRef.current, {
      y: itemRect.top - navRect.top,
      height: itemRect.height,
      opacity: 1,
      duration: 0.35,
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
        <div className="w-[168px] shrink-0 flex flex-col gap-5 pt-1">
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
    <div ref={rootRef} className="flex items-start gap-8">
      {/* ── Table of contents ── */}
      <nav
        ref={navRef}
        className="w-[168px] shrink-0 sticky top-0 self-start relative py-1"
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
                  className="text-left text-[14px] leading-snug bg-transparent border-none p-0 cursor-pointer transition-colors duration-300"
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

      {/* ── Separator ── */}
      <div className="w-px bg-black/10 self-stretch shrink-0" />

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        {sections.map((s, i) => (
          <section
            key={s._key}
            id={sectionId(s._key)}
            data-section-key={s._key}
            ref={(el) => { sectionRefs.current[s._key] = el }}
            className={i > 0 ? "pt-9 mt-9 border-t border-black/5" : ""}
          >
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#888] mb-3">
              {s.title}
            </h3>
            <PortableText value={s.content} components={portableTextComponents} />
          </section>
        ))}
      </div>
    </div>
  )
}
