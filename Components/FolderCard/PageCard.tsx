"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import type { CaseStudy } from "../lib/caseStudies"

interface PageCardProps {
  study: CaseStudy
  originRect: DOMRect
  onDismiss: () => void
}

export function PageCard({ study, originRect, onDismiss }: PageCardProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const targetW = Math.min(window.innerWidth * 0.82, 720)
  const targetH = Math.min(window.innerHeight * 0.78, 560)
  const targetX = (window.innerWidth - targetW) / 2
  const targetY = (window.innerHeight - targetH) / 2

  useEffect(() => {
    if (!cardRef.current || !overlayRef.current) return

    // Start from origin (page position)
    gsap.set(cardRef.current, {
      position: "fixed",
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
      borderRadius: 12,
      opacity: 1,
    })

    gsap.set(overlayRef.current, { opacity: 0 })

    const tl = gsap.timeline()
    tl.to(overlayRef.current, { opacity: 1, duration: 0.2 })
      .to(cardRef.current, {
        left: targetX,
        top: targetY,
        width: targetW,
        height: targetH,
        borderRadius: 20,
        duration: 0.5,
        ease: "power3.out",
      }, "<0.05")
  }, [])

  function dismiss() {
    if (!cardRef.current || !overlayRef.current) return
    const tl = gsap.timeline({ onComplete: onDismiss })
    tl.to(cardRef.current, {
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
      borderRadius: 12,
      duration: 0.4,
      ease: "power3.in",
    })
      .to(overlayRef.current, { opacity: 0, duration: 0.2 }, "<0.1")
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,9,18,0.35)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === overlayRef.current) dismiss() }}
    >
      <div
        ref={cardRef}
        style={{
          position: "fixed",
          background: "#FCFEFF",
          boxShadow: "0 24px 80px rgba(102,189,255,0.25), inset 4px 4px 100px 16px rgba(170,227,255,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 28px 16px",
          borderBottom: "1px solid rgba(108,216,255,0.2)",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#66BDFF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {study.year} · {study.tags}
            </p>
            <h2 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 700, color: "#000912" }}>
              {study.name}
            </h2>
          </div>
          <button
            onClick={dismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              color: "#666",
              fontSize: 20,
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", overflowY: "auto", height: "calc(100% - 90px)" }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "#333" }}>
            {study.description}
          </p>
        </div>
      </div>
    </div>
  )
}
