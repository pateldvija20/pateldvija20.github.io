"use client"

import { useState, useEffect, useRef } from "react"
import gsap from "gsap"
import { Page } from "./Page"
import { PageCard } from "./PageCard"
import { parseCSV, type CaseStudy } from "../lib/caseStudies"

// ─── Dimensions ─────────────────────────────────────────────────────────────────
// Reference (shahabkarimifar): folder 300×250, front 210px tall, perspective 800px
// Our folder: 887×710 — scale factor ≈ 2.84×
// Front cover: 710 × (210/250) ≈ 597px → starts at y = 710 − 597 = 113px
// Perspective: 800 × 2.84 ≈ 2200px
const W            = 887
const H            = 710
const BODY_TOP     = 60
const PAGE_GAP     = 40
const PAGE_SPACING = 30
const PAGE_TOP     = BODY_TOP + PAGE_GAP
const FRONT_TOP    = PAGE_TOP + PAGE_GAP

// ─── Colors ──────────────────────────────────────────────────────────────────────
const COLOR_BACK        = "#5BAEFF"   // flat solid — matches reference simplicity
const COLOR_FRONT_TOP   = "#6EC0FF"
const COLOR_FRONT_MID   = "#6CD8FF"
const COLOR_FRONT_BOT   = "#5BB8F5"

export function FolderCard() {
  const [studies, setStudies]           = useState<CaseStudy[]>([])
  const [isOpen, setIsOpen]                   = useState(false)
  const [pagesInteractive, setPagesInteractive] = useState(false)
  const [hoveredIndex, setHoveredIndex]         = useState<number | null>(null)
  const [clickedStudy, setClickedStudy]         = useState<CaseStudy | null>(null)
  const [clickedRect, setClickedRect]           = useState<DOMRect | null>(null)

  const frontRef     = useRef<HTMLDivElement>(null)
  const gateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/data/case_studies.csv")
      .then(r => r.text())
      .then(text => setStudies(parseCSV(text)))
      .catch(console.error)
  }, [])

  // Bottom edge is the fixed pivot — it never moves.
  // rotateX(-20deg) sweeps the top of the cover toward the viewer, opening the folder.
  useEffect(() => {
    if (!frontRef.current) return
    gsap.set(frontRef.current, { transformOrigin: "bottom center" })
    const frontTopHover = BODY_TOP + PAGE_GAP + (studies.length - 1) * PAGE_SPACING + PAGE_GAP
    gsap.to(frontRef.current, {
      top:      isOpen ? frontTopHover : FRONT_TOP,
      rotateX:  isOpen ? -20 : 0,
      scaleX:   isOpen ? 1.08 : 1,
      duration: 0.3,
      ease:     "power2.out",
    })
  }, [isOpen, studies.length])

  function handlePageClick(study: CaseStudy, el: HTMLDivElement) {
    setClickedStudy(study)
    setClickedRect(el.getBoundingClientRect())
  }

  return (
    <>
      <div
        onMouseEnter={() => {
          setIsOpen(true)
          setPagesInteractive(false)
          if (gateTimerRef.current) clearTimeout(gateTimerRef.current)
          gateTimerRef.current = setTimeout(() => setPagesInteractive(true), 450)
        }}
        onMouseLeave={() => {
          setIsOpen(false)
          setPagesInteractive(false)
          setHoveredIndex(null)
          if (gateTimerRef.current) clearTimeout(gateTimerRef.current)
        }}
        style={{
          position:    "relative",
          width:       W,
          height:      H,
          perspective: 2200,
        }}
        aria-label="Project folder"
      >
        {/* ── BACK: unified folder shape (body + tab) ────────────────────────── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 887 710"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M275.442 46.3246C278.164 54.4914 285.807 60 294.415 60H867C878.046 60 887 68.9543 887 80V690C887 701.046 878.046 710 867 710H20C8.95429 710 0 701.046 0 690V20C0 8.95432 8.95431 0 20 0H245.585C254.193 0 261.836 5.5086 264.558 13.6754L275.442 46.3246Z"
              fill={COLOR_BACK}
            />
          </svg>
        </div>

        {/* ── PAGES ──────────────────────────────────────────────────────────── */}
        {studies.map((study, i) => (
          <Page
            key={i}
            study={study}
            index={i}
            total={studies.length}
            pageTop={PAGE_TOP}
            isOpen={isOpen}
            isHovered={hoveredIndex === i}
            interactive={pagesInteractive}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={(el) => handlePageClick(study, el)}
          />
        ))}

        {/* ── FRONT COVER ────────────────────────────────────────────────────── */}
        <div
          ref={frontRef}
          style={{
            position:      "absolute",
            top:           FRONT_TOP,
            left:          0,
            right:         0,
            bottom:        0,
            borderRadius:  "8px 8px 20px 20px",
            background:    `linear-gradient(180deg, ${COLOR_FRONT_TOP} 0%, ${COLOR_FRONT_MID} 55%, ${COLOR_FRONT_BOT} 100%)`,
            boxShadow:     "0 8px 40px rgba(102,189,255,0.25), inset 0 1px 0 rgba(255,255,255,0.35)",
            pointerEvents: "none",
            zIndex:        10,
          }}
        />
      </div>

      {clickedStudy && clickedRect && (
        <PageCard
          study={clickedStudy}
          originRect={clickedRect}
          onDismiss={() => { setClickedStudy(null); setClickedRect(null) }}
        />
      )}
    </>
  )
}
