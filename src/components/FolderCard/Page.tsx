"use client"

import { useRef, useEffect, useState } from "react"
import gsap from "gsap"
import type { CaseStudy as ProjectCaseStudy } from "@/lib/projects"
import { type CaseStudySection, type CaseStudy as SanityCaseStudy } from "@/lib/sanity"
import { getCaseStudySectionsAction } from "@/lib/sanity-actions"
import { CaseStudyContent } from "./CaseStudyContent"

export interface PageProps {
  study: ProjectCaseStudy
  index: number
  total: number
  pageTop: number
  isOpen: boolean
  isHovered: boolean
  maxLift: number   // max px the page may travel upward without leaving the scene
  isZoomed?: boolean
  isZoomingOut?: boolean
  onZoomComplete?: () => void
  onZoomOutComplete?: () => void
  onClose?: () => void
}

// Pages fan downward into the folder body on open.
// index 0 = backmost (stays at base), index total-1 = frontmost (moves down most).
// 30px spacing matches PAGE_SPACING in FolderCard.
// 26.61px = W (887px) * 0.03 (3% margin)
// 833.78px = W (887px) * 0.94 (94% width)
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
  isZoomed = false,
  isZoomingOut = false,
  onZoomComplete,
  onZoomOutComplete,
  onClose,
}: PageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const [caseStudyDetail, setCaseStudyDetail] = useState<(SanityCaseStudy & { sections: CaseStudySection[] }) | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isZoomed && !caseStudyDetail && !loading) {
      setLoading(true)
      getCaseStudySectionsAction(study.slug)
        .then((res) => {
          setCaseStudyDetail(res)
          setLoading(false)
        })
        .catch((err) => {
          console.error("Failed to load case study sections:", err)
          setLoading(false)
        })
    }
  }, [isZoomed, study.slug, caseStudyDetail, loading])

  const openY = getOpenY(index, total)
  const zIndex = isZoomed ? 99999 : total - index
  const fromFront = total - 1 - index
  const openScaleX = 1.0 + (total - 1 - fromFront) * 0.008

  useEffect(() => {
    if (!ref.current) return
    gsap.set(ref.current, { transformOrigin: "bottom center" })
  }, [])

  // ── Open / close / zoom ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return

    if (isZoomed) {
      // Zoom animation: lift straight up out of folder first, then zoom to center
      gsap.killTweensOf(ref.current)
      const tl = gsap.timeline({
        onComplete: onZoomComplete
      })
      tl.set(ref.current, { zIndex: 99999 })
        .to(ref.current, {
          y: -240,
          rotateX: -10,
          duration: 0.35,
          ease: "power2.out"
        })
        .to(ref.current, {
          x: 0,
          y: 0,
          rotateX: 0,
          scaleX: 1,
          left: -316.5,
          top: -147,
          width: 1600,
          height: 1004,
          borderRadius: 0,
          duration: 0.65,
          ease: "power2.inOut"
        })
      return
    }

    if (isZoomingOut) {
      // Zoom-out sequence:
      // Step 1: Center to top (shrink to fanned size elevated above folder, zIndex 99999)
      // Step 2: Switch zIndex to total - index (< 10, behind front cover)
      // Step 3: Top to inside the open folder mouth
      gsap.killTweensOf(ref.current)
      const tl = gsap.timeline({
        onComplete: () => {
          onZoomOutComplete?.()
        }
      })

      // Step 1: Shrink from fullscreen to fanned size elevated above folder
      tl.set(ref.current, { zIndex: 99999 })
        .to(ref.current, {
          x: 0,
          y: -240, // elevated position above folder
          rotateX: -10,
          scaleX: openScaleX,
          left: 26.61, // fanned left
          top: pageTop,
          width: 833.78, // fanned width
          height: 450,
          borderRadius: 14,
          duration: 0.45,
          ease: "power2.inOut"
        })
        // Step 2: Drop zIndex behind the open front cover (total - index < 10)
        .set(ref.current, { zIndex: total - index })
        // Step 3: Slide down from top into the open folder mouth
        .to(ref.current, {
          y: openY,
          rotateX: -20,
          duration: 0.4,
          ease: "power2.in",
          clearProps: "left,top,width,height,borderRadius,zIndex"
        })
      return
    }

    // Normal open/close transitions when not zooming
    gsap.killTweensOf(ref.current)
    if (isOpen) {
      gsap.to(ref.current, {
        y: openY,
        rotateX: -20,
        scaleX: openScaleX,
        duration: 0.4,
        ease: "power2.out",
        delay: (total - 1 - index) * 0.04,
      })
    } else {
      gsap.to(ref.current, {
        y: 0,
        rotateX: 0,
        scaleX: 1,
        duration: 0.35,
        ease: "power2.inOut",
        delay: index * 0.03,
      })
    }
  }, [isOpen, isZoomed, isZoomingOut, index, openScaleX, openY, pageTop, total, onZoomComplete, onZoomOutComplete])

  // ── Hover lift ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current || !labelRef.current || isZoomed || isZoomingOut) return
    if (isOpen && isHovered) {
      gsap.to(ref.current, { y: openY - Math.min(280, maxLift), duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
    } else if (isOpen) {
      gsap.to(ref.current, { y: openY, duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 0, y: 6, duration: 0.15 })
    }
  }, [isHovered, isOpen, isZoomed, isZoomingOut, maxLift, openY])

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: pageTop,
        left: "3.5%",
        right: "3.5%",
        height: 450,
        zIndex,
        cursor: "default",
        pointerEvents: isZoomed ? "auto" : "none",
        borderRadius: 14,
        background: isZoomed ? "#FCFEFF" : (study.cardImage ? "#18181A" : "#FCFEFF"),
        boxShadow: "0 -4px 16px rgba(0,0,0,0.12)",
        willChange: "transform, left, top, width, height",
        overflow: "hidden",
      }}
    >
      {isZoomed ? (
        <div
          data-no-wheel-cycle
          data-no-deck-drag
          className="absolute inset-0 flex flex-col bg-[#FCFEFF] text-[#000912] z-[100]"
          style={{ pointerEvents: "auto" }}
        >
          {/* Scrollable Content Container */}
          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 py-8 min-h-0 w-full"
            style={{ overflowY: "auto" }}
          >
            {loading ? (
              <div className="w-full py-12">
                <CaseStudyContent study={study} sections={[]} loading={true} onClose={onClose} />
              </div>
            ) : caseStudyDetail ? (
              <div className="w-full">
                <CaseStudyContent study={study} sections={caseStudyDetail.sections} onClose={onClose} />
              </div>
            ) : (
              <div className="py-16 text-center text-[13px] text-[#999]">
                Could not load case study content.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Card image — fills the page when provided */}
          {study.cardImage && (
            <img
              src={study.cardImage}
              alt={study.name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                borderRadius: 14,
              }}
            />
          )}

          {/* Label — fades in on hover (sits on top of image) */}
          <div
            ref={labelRef}
            style={{
              opacity: 0,
              transform: "translateY(6px)",
              position: "absolute",
              bottom: "8%",
              left: "8%",
              right: "8%",
              pointerEvents: "none",
              background: study.cardImage ? "rgba(0,0,0,0.55)" : "transparent",
              backdropFilter: study.cardImage ? "blur(6px)" : "none",
              borderRadius: study.cardImage ? 10 : 0,
              padding: study.cardImage ? "12px 16px" : 0,
            }}
          >
            <p style={{
              margin: 0,
              marginBottom: 4,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: study.cardImage ? "#66BDFF" : "#66BDFF",
            }}>
              {study.year} · {study.tags}
            </p>
            <p style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 20,
              fontWeight: 700,
              color: study.cardImage ? "#FFFFFF" : "#000912",
              lineHeight: 1.2,
            }}>
              {study.name}
            </p>
            <p style={{
              margin: 0,
              fontSize: 13,
              color: study.cardImage ? "rgba(255,255,255,0.75)" : "#555",
              lineHeight: 1.55,
            }}>
              {study.description}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
