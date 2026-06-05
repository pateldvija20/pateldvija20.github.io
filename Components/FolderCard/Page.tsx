"use client"

import { useRef, useEffect } from "react"
import gsap from "gsap"
import type { CaseStudy } from "../lib/caseStudies"

export interface PageProps {
  study: CaseStudy
  index: number
  total: number
  isOpen: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: (ref: HTMLDivElement) => void
}

// Per-page fan config in open state
// Back pages fan more to the right, front pages stay more upright
function getFanStyle(index: number, total: number) {
  const fromBack = total - 1 - index // 0 = frontmost page
  const maxRotate = 10
  const maxTranslateX = 24
  const maxTranslateY = -60 // enough to fan visibly above folder-front

  return {
    rotate: fromBack * (maxRotate / Math.max(total - 1, 1)),
    translateX: fromBack * (maxTranslateX / Math.max(total - 1, 1)),
    translateY: fromBack * (maxTranslateY / Math.max(total - 1, 1)),
  }
}

export function Page({
  study,
  index,
  total,
  isOpen,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: PageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const fan = getFanStyle(index, total)
  // z-index: frontmost page (index = total-1) on top
  const zIndex = index + 1

  useEffect(() => {
    if (!ref.current) return
    if (isOpen) {
      gsap.to(ref.current, {
        rotate: fan.rotate,
        x: fan.translateX,
        y: fan.translateY,
        duration: 0.45,
        ease: "power2.out",
        delay: (total - 1 - index) * 0.04,
      })
    } else {
      gsap.to(ref.current, {
        rotate: 0,
        x: 0,
        y: 0,
        duration: 0.35,
        ease: "power2.inOut",
        delay: index * 0.03,
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (!ref.current || !labelRef.current) return
    if (isOpen && isHovered) {
      gsap.to(ref.current, { y: fan.translateY - 24, duration: 0.25, ease: "power2.out" })
      gsap.to(labelRef.current, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
    } else if (isOpen) {
      gsap.to(ref.current, { y: fan.translateY, duration: 0.25, ease: "power2.out" })
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
        position: "absolute",
        top: "6%",
        left: "3%",
        right: "3%",
        bottom: "4%",
        zIndex,
        cursor: isOpen ? "pointer" : "default",
        borderRadius: 12,
        background: "#FCFEFF",
        boxShadow: "inset 4px 4px 100px 16px rgba(170,227,255,0.5)",
        transformOrigin: "bottom center",
        willChange: "transform",
      }}
    >
      {/* Label — visible on hover */}
      <div
        ref={labelRef}
        style={{
          opacity: 0,
          transform: "translateY(6px)",
          position: "absolute",
          top: "12%",
          left: "8%",
          right: "8%",
          pointerEvents: "none",
        }}
      >
        <p style={{
          fontFamily: "inherit",
          fontSize: 18,
          fontWeight: 600,
          color: "#000912",
          margin: 0,
          marginBottom: 6,
        }}>
          {study.name}
        </p>
        <p style={{
          fontSize: 13,
          color: "#333",
          margin: 0,
          lineHeight: 1.5,
        }}>
          {study.description}
        </p>
      </div>
    </div>
  )
}
