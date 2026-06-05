"use client"

import { useState, useEffect, useRef } from "react"
import gsap from "gsap"
import { Page } from "./FolderCard/Page"
import { PageCard } from "./FolderCard/PageCard"
import { parseCSV, type CaseStudy } from "@/lib/caseStudies"

const TAB_PATH =
  "M0 20C0 8.9543 8.95431 0 20 0H260C271.046 0 280 8.95431 280 20V60H0V20Z"

const BODY_BORDER_PATH =
  "M0 60H867C878.046 60 887 68.9543 887 80V690C887 701.046 878.046 710 867 710H20C8.95429 710 0 701.046 0 690V60Z"

const FOLDER_FRONT_PATH =
  "M0 80C0 68.9543 8.9543 60 20 60H867C878.046 60 887 68.9543 887 80V690C887 701.046 878.046 710 867 710H20C8.95429 710 0 701.046 0 690V80Z"

export function FolderCard() {
  const [studies, setStudies] = useState<CaseStudy[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [clickedStudy, setClickedStudy] = useState<CaseStudy | null>(null)
  const [clickedRect, setClickedRect] = useState<DOMRect | null>(null)

  const folderFrontRef = useRef<SVGSVGElement>(null)
  const tabRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch("/data/case_studies.csv")
      .then((r) => r.text())
      .then((text) => setStudies(parseCSV(text)))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!folderFrontRef.current) return
    gsap.to(folderFrontRef.current, {
      y: isOpen ? 80 : 0,
      duration: 0.45,
      ease: "power2.out",
    })
  }, [isOpen])

  function handlePageClick(study: CaseStudy, el: HTMLDivElement) {
    setClickedStudy(study)
    setClickedRect(el.getBoundingClientRect())
  }

  const W = 887
  const H = 710

  return (
    <>
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => { setIsOpen(false); setHoveredIndex(null) }}
        style={{ position: "relative", width: W, height: H, display: "inline-block", cursor: "pointer" }}
        role="button"
        aria-label="Project folder"
      >
        {/* Body border — bottom layer */}
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none"
          style={{ position: "absolute", inset: 0 }} aria-hidden>
          <defs>
            <linearGradient id="fc-body-border" x1="887" y1="710" x2="2.12" y2="1.35" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6CD8FF" /><stop offset="1" stopColor="#6EC0FF" />
            </linearGradient>
            <linearGradient id="fc-folder-front" x1="0" y1="60" x2="812" y2="712" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6CD8FF" /><stop offset="1" stopColor="#66BDFF" />
            </linearGradient>
            <linearGradient id="fc-tab-gloss" x1="24" y1="-1.56" x2="55.7" y2="109.3" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FCFEFF" stopOpacity="0.5" /><stop offset="1" stopColor="#3EBFFF" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d={BODY_BORDER_PATH} fill="url(#fc-body-border)" />
        </svg>

        {/* Pages — middle layer */}
        {studies.map((study, i) => (
          <Page key={i} study={study} index={i} total={studies.length}
            isOpen={isOpen} isHovered={hoveredIndex === i}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={(el) => handlePageClick(study, el)}
          />
        ))}

        {/* Folder front — slides down on open */}
        <svg ref={folderFrontRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
          <path d={FOLDER_FRONT_PATH} fill="url(#fc-folder-front)" />
        </svg>

        {/* Tab — always fixed at top, never moves */}
        <svg ref={tabRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} fill="none"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
          <path d={TAB_PATH} fill="#66BDFF" />
          <path d={TAB_PATH} fill="url(#fc-tab-gloss)" fillOpacity={0.2} />
        </svg>
      </div>

      {clickedStudy && clickedRect && (
        <PageCard study={clickedStudy} originRect={clickedRect}
          onDismiss={() => { setClickedStudy(null); setClickedRect(null) }} />
      )}
    </>
  )
}
