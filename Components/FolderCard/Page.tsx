"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import type { CaseStudy } from "../lib/caseStudies"

export interface PageProps {
  study:        CaseStudy
  index:        number
  total:        number
  pageTop:      number
  isOpen:       boolean
  isHovered:    boolean
  interactive:  boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick:      (ref: HTMLDivElement) => void
}

// Pages fan downward into the folder body on open.
// index 0 = backmost (stays at base), index total-1 = frontmost (moves down most).
function getOpenY(index: number, _total: number): number {
  return index * 30
}

export function Page({
  study,
  index,
  total,
  pageTop,
  isOpen,
  isHovered,
  interactive,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: PageProps) {
  const ref      = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const openY  = getOpenY(index, total)
  const zIndex = index + 1
  const fromFront  = total - 1 - index
  const openScaleX = 1.03 - fromFront * 0.05

  useEffect(() => {
    if (!ref.current) return
    gsap.set(ref.current, { transformOrigin: "bottom center" })
  }, [])

  // ── Open / close ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return
    if (isOpen) {
      gsap.to(ref.current, {
        y:        openY,
        rotateX:  -20,
        scaleX:   openScaleX,
        duration: 0.4,
        ease:     "power2.out",
        delay:    (total - 1 - index) * 0.04,
      })
    } else {
      gsap.to(ref.current, {
        y:        0,
        rotateX:  0,
        scaleX:   1,
        duration: 0.35,
        ease:     "power2.inOut",
        delay:    index * 0.03,
      })
    }
  }, [isOpen])

  // ── Hover lift ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current || !labelRef.current) return
    if (isOpen && isHovered) {
      gsap.to(ref.current,      { y: openY - 280, duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
    } else if (isOpen) {
      gsap.to(ref.current,      { y: openY,       duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 0, y: 6, duration: 0.15 })
    }
  }, [isHovered, isOpen])

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => ref.current && onClick(ref.current)}
      style={{
        position:     "absolute",
        top:          pageTop,
        left:         "3%",
        right:        "3%",
        height:       450,
        zIndex,
        cursor:        interactive ? "pointer" : "default",
        pointerEvents: interactive ? "auto" : "none",
        borderRadius: 14,
        background:   "#FCFEFF",
        boxShadow:    "0 -4px 16px rgba(0,0,0,0.12)",
        willChange:   "transform",
      }}
    >
      {/* Label — slides in on hover */}
      <div
        ref={labelRef}
        style={{
          opacity:       0,
          transform:     "translateY(6px)",
          position:      "absolute",
          top:           "10%",
          left:          "8%",
          right:         "8%",
          pointerEvents: "none",
        }}
      >
        <p style={{
          margin:      0,
          marginBottom: 4,
          fontSize:    11,
          fontWeight:  600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:       "#66BDFF",
        }}>
          {study.year} · {study.tags}
        </p>
        <p style={{
          margin:     0,
          marginBottom: 8,
          fontSize:   20,
          fontWeight: 700,
          color:      "#000912",
          lineHeight: 1.2,
        }}>
          {study.name}
        </p>
        <p style={{
          margin:     0,
          fontSize:   13,
          color:      "#555",
          lineHeight: 1.55,
        }}>
          {study.description}
        </p>
      </div>
    </div>
  )
}
