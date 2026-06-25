"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import type { CaseStudy } from "@/lib/projects"

export interface PageProps {
  study:       CaseStudy
  index:       number
  total:       number
  pageTop:     number
  isOpen:      boolean
  isHovered:   boolean
  maxLift:     number   // max px the page may travel upward without leaving the scene
}

// Pages fan downward into the folder body on open.
// index 0 = backmost (stays at base), index total-1 = frontmost (moves down most).
// 30px spacing matches PAGE_SPACING in FolderCard.
function getOpenY(index: number, _total: number): number {
  return index * 15   // backmost: 0px  →  frontmost: (n-1)*15px
}

export function Page({
  study,
  index,
  total,
  pageTop,
  isOpen,
  isHovered,
  maxLift,
}: PageProps) {
  const ref      = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const openY  = getOpenY(index, total)
  const zIndex = total - index - 0.5
  const fromFront = total - 1 - index
  const openScaleX = 1.0 + (total - 1 - fromFront) * 0.008

  useEffect(() => {
    if (!ref.current) return
    gsap.set(ref.current, { transformOrigin: "bottom center" })
  }, [])

  // ── Open / close ─────────────────────────────────────────────────────────────
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
      gsap.to(ref.current,      { y: openY - Math.min(280, maxLift), duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
    } else if (isOpen) {
      gsap.to(ref.current,      { y: openY,       duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 0, y: 6, duration: 0.15 })
    }
  }, [isHovered, isOpen])

  return (
    <div
      ref={ref}
      style={{
        position:     "absolute",
        top:          pageTop,
        left:         "3%",
        right:        "3%",
        height:       450,
        zIndex,
        cursor:        "default",
        pointerEvents: "none",
        borderRadius: 14,
        background:   study.cardImage ? "#18181A" : "#FCFEFF",
        boxShadow:    "0 -4px 16px rgba(0,0,0,0.12)",
        willChange:   "transform",
        overflow:     "hidden",
      }}
    >
      {/* Card image — fills the page when provided */}
      {study.cardImage && (
        <img
          src={study.cardImage}
          alt={study.name}
          style={{
            position:   "absolute",
            inset:      0,
            width:      "100%",
            height:     "100%",
            objectFit:  "cover",
            objectPosition: "center",
            borderRadius: 14,
          }}
        />
      )}

      {/* Label — fades in on hover (sits on top of image) */}
      <div
        ref={labelRef}
        style={{
          opacity:       0,
          transform:     "translateY(6px)",
          position:      "absolute",
          bottom:        "8%",
          left:          "8%",
          right:         "8%",
          pointerEvents: "none",
          background:    study.cardImage ? "rgba(0,0,0,0.55)" : "transparent",
          backdropFilter: study.cardImage ? "blur(6px)" : "none",
          borderRadius:  study.cardImage ? 10 : 0,
          padding:       study.cardImage ? "12px 16px" : 0,
        }}
      >
        <p style={{
          margin:        0,
          marginBottom:  4,
          fontSize:      11,
          fontWeight:    600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         study.cardImage ? "#66BDFF" : "#66BDFF",
        }}>
          {study.year} · {study.tags}
        </p>
        <p style={{
          margin:       0,
          marginBottom: 8,
          fontSize:     20,
          fontWeight:   700,
          color:        study.cardImage ? "#FFFFFF" : "#000912",
          lineHeight:   1.2,
        }}>
          {study.name}
        </p>
        <p style={{
          margin:     0,
          fontSize:   13,
          color:      study.cardImage ? "rgba(255,255,255,0.75)" : "#555",
          lineHeight: 1.55,
        }}>
          {study.description}
        </p>
      </div>
    </div>
  )
}
