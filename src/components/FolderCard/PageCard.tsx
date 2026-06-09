"use client"

import { useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import gsap from "gsap"

const MARGIN_X_RATIO = 160 / 1440
const MARGIN_Y_RATIO = 60  / 1024

function getTargetRect() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const mx = Math.max(24, vw * MARGIN_X_RATIO)
  const my = Math.max(24, vh * MARGIN_Y_RATIO)
  return { left: mx, top: my, width: vw - mx * 2, height: vh - my * 2 }
}

interface PageCardProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  originRect: DOMRect
  onDismiss: () => void
}

export function PageCard({ title, subtitle, children, originRect, onDismiss }: PageCardProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cardRef.current || !overlayRef.current) return
    const target = getTargetRect()

    gsap.set(cardRef.current, {
      position:     "fixed",
      left:         originRect.left,
      top:          originRect.top,
      width:        originRect.width,
      height:       originRect.height,
      borderRadius: 12,
      opacity:      1,
    })
    gsap.set(overlayRef.current, { opacity: 0 })

    const tl = gsap.timeline()
    tl.to(overlayRef.current, { opacity: 1, duration: 0.2 })
      .to(cardRef.current, {
        left:         target.left,
        top:          target.top,
        width:        target.width,
        height:       target.height,
        borderRadius: 20,
        duration:     0.5,
        ease:         "power3.out",
      }, "<0.05")
  }, [])

  function dismiss() {
    if (!cardRef.current || !overlayRef.current) return
    const tl = gsap.timeline({ onComplete: onDismiss })
    tl.to(cardRef.current, {
      left:         originRect.left,
      top:          originRect.top,
      width:        originRect.width,
      height:       originRect.height,
      borderRadius: 12,
      duration:     0.4,
      ease:         "power3.in",
    })
      .to(overlayRef.current, { opacity: 0, duration: 0.2 }, "<0.1")
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100]"
      onClick={(e) => { if (e.target === overlayRef.current) dismiss() }}
    >
      <div
        ref={cardRef}
        className="fixed flex flex-col bg-[#FCFEFF] overflow-hidden shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-black/5 shrink-0">
          <div>
            {subtitle && (
              <p className="m-0 text-[11px] tracking-widest uppercase text-[#888]">
                {subtitle}
              </p>
            )}
            <h2 className="mt-1.5 mb-0 text-[22px] font-bold text-[#000912]">
              {title}
            </h2>
          </div>
          <button
            onClick={dismiss}
            className="p-2 rounded-lg text-[#666] text-xl leading-none bg-transparent border-none cursor-pointer hover:bg-black/5 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
