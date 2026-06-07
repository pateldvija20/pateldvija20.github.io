"use client"

import { useEffect, useId, useRef, useState } from "react"
import gsap from "gsap"
import { ShaderDisplacementGenerator, fragmentShaders } from "../../Components/LiquidGlass/shader-utils"
import { displacementMap } from "../../Components/LiquidGlass/utils"

// ─── Dimensions — container hugs the back cover exactly ──────────────────────
const BACK_W     = 612
const BACK_H     = 792
const W          = BACK_W   // 612
const H          = BACK_H   // 792

// Back cover — flush to (0,0)
const BACK_TOP   = 0
const BACK_LEFT  = 0

// Papers — centred inside back cover
const PAPER_W    = 538.035
const PAPER_H    = 726.011
const PAPER_LEFT = (BACK_W - PAPER_W) / 2   // ~37
const PAPER_TOP  = (BACK_H - PAPER_H) / 2   // ~33

// Front cover — bottom-aligned with back cover
const FRONT_W    = 612
const FRONT_H    = 564
const FRONT_LEFT = 0
const FRONT_TOP  = BACK_H - FRONT_H         // 228

const generateShaderMap = (w: number, h: number): string => {
  const gen = new ShaderDisplacementGenerator({
    width: w, height: h, fragment: fragmentShaders.liquidGlass,
  })
  const url = gen.updateShader()
  gen.destroy()
  return url
}

export type FileState = "closed" | "hover" | "open"

interface PurpleFileProps {
  state?: FileState
  className?: string
}

export function PurpleFile({ state = "closed", className = "" }: PurpleFileProps) {
  const rawId   = useId()
  const filterId = rawId.replace(/:/g, "f")
  const [shaderUrl, setShaderUrl] = useState("")

  const frontRef  = useRef<HTMLDivElement>(null)
  const paper1Ref = useRef<HTMLDivElement>(null)
  const paper2Ref = useRef<HTMLDivElement>(null)
  const paper3Ref = useRef<HTMLDivElement>(null)

  // Generate shader displacement map once on mount
  useEffect(() => {
    setShaderUrl(generateShaderMap(W, H))
  }, [])

  // Initialise GSAP transform ownership on all animated elements
  useEffect(() => {
    const front = frontRef.current
    const p1    = paper1Ref.current
    const p2    = paper2Ref.current
    const p3    = paper3Ref.current

    if (front) gsap.set(front, {
      rotation:        0,
      transformOrigin: "bottom center",
    })
    if (p1) gsap.set(p1, { rotation: 0, transformOrigin: "0% 0%" })
    if (p2) gsap.set(p2, { rotation: 0, transformOrigin: "0% 0%" })
    if (p3) gsap.set(p3, { rotation: 0, transformOrigin: "0% 0%" })
  }, [])

  // ── GSAP state machine ────────────────────────────────────────────────────
  useEffect(() => {
    const front = frontRef.current
    const p1    = paper1Ref.current
    const p2    = paper2Ref.current
    const p3    = paper3Ref.current
    if (!front) return

    // closed + open both rest the papers back into the pocket
    if (state === "closed" || state === "open") {
      gsap.to(front, { y: 0, rotateX: 0, scaleX: 1, duration: 0.35, ease: "power2.out" })
      if (p1) gsap.to(p1, { y: 0, rotation: 0, duration: 0.35, ease: "power2.out" })
      if (p2) gsap.to(p2, { y: 0, rotation: 0, duration: 0.35, ease: "power2.out" })
      if (p3) gsap.to(p3, { y: 0, rotation: 0, duration: 0.35, ease: "power2.out" })
    }

    // hover: papers pull out upward — covers stay completely static
    if (state === "hover") {
      if (p1) gsap.to(p1, { y: -140, duration: 0.45, ease: "back.out(1.7)" })
      if (p2) gsap.to(p2, { y: -95,  duration: 0.45, ease: "back.out(1.7)", delay: 0.04 })
      if (p3) gsap.to(p3, { y: -55,  duration: 0.45, ease: "back.out(1.7)", delay: 0.08 })
    }
  }, [state])

  const mapHref   = shaderUrl || displacementMap
  const filterUrl = `url(#${filterId})`

  return (
    <div
      className={`relative ${className}`}
      style={{ width: W, height: H, perspective: 2200 }}
    >
      {/* ── Displacement filter (invisible infrastructure) ───────────────── */}
      <svg aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <defs>
          <filter id={filterId} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            <feImage x="0" y="0" width="100%" height="100%" result="MAP" href={mapHref} preserveAspectRatio="xMidYMid slice" />
            <feColorMatrix in="MAP" type="matrix"
              values="0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0 0 0 1 0"
              result="EDGE_INT" />
            <feComponentTransfer in="EDGE_INT" result="EDGE_MASK">
              <feFuncA type="discrete" tableValues="0 0.1 1" />
            </feComponentTransfer>
            <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER" />
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-25} xChannelSelector="R" yChannelSelector="B" result="RED_D" />
            <feColorMatrix in="RED_D" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="RED_C" />
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-25.1} xChannelSelector="R" yChannelSelector="B" result="GREEN_D" />
            <feColorMatrix in="GREEN_D" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="GREEN_C" />
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-25.2} xChannelSelector="R" yChannelSelector="B" result="BLUE_D" />
            <feColorMatrix in="BLUE_D" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="BLUE_C" />
            <feBlend in="GREEN_C" in2="BLUE_C" mode="screen" result="GB" />
            <feBlend in="RED_C" in2="GB" mode="screen" result="RGB" />
            <feGaussianBlur in="RGB" stdDeviation="0.3" result="ABERRATED" />
            <feComposite in="ABERRATED" in2="EDGE_MASK" operator="in" result="EDGE_AB" />
            <feComponentTransfer in="EDGE_MASK" result="INV_MASK">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feComposite in="CENTER" in2="INV_MASK" operator="in" result="CENTER_CLEAN" />
            <feComposite in="EDGE_AB" in2="CENTER_CLEAN" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* ── BACK COVER (not animated — GSAP doesn't touch this) ─────────── */}
      <div
        className="absolute"
        style={{
          top:             BACK_TOP,
          left:            BACK_LEFT,
          width:           BACK_W,
          height:          BACK_H,
          borderRadius:    12,
          transformOrigin: "0% 0%",
          transform:       "rotate(0deg)",
          backdropFilter:  "blur(8px) saturate(185%)",
          filter:          filterUrl,
          background:      "rgba(170, 126, 242, 0.18)",
          zIndex:          0,
        }}
      />

      {/* ── PAPER 3 — back-most (z=1) ────────────────────────────────────── */}
      <div
        ref={paper3Ref}
        className="absolute rounded-[20px] bg-[#FDFEFF] shadow-[-3px_3px_12px_rgba(0,0,0,0.16)]"
        style={{
          top:    PAPER_TOP + 8,
          left:   PAPER_LEFT + 8,
          width:  PAPER_W,
          height: PAPER_H,
          zIndex: 1,
        }}
      />

      {/* ── PAPER 2 (z=2) ────────────────────────────────────────────────── */}
      <div
        ref={paper2Ref}
        className="absolute rounded-[20px] bg-[#FDFEFF] shadow-[-3px_3px_12px_rgba(0,0,0,0.16)]"
        style={{
          top:    PAPER_TOP + 4,
          left:   PAPER_LEFT + 4,
          width:  PAPER_W,
          height: PAPER_H,
          zIndex: 2,
        }}
      />

      {/* ── PAPER 1 — front-most paper (z=3) ─────────────────────────────── */}
      <div
        ref={paper1Ref}
        className="absolute rounded-[20px] bg-[#FDFEFF] shadow-[-3px_3px_12px_rgba(0,0,0,0.16)]"
        style={{
          top:    PAPER_TOP,
          left:   PAPER_LEFT,
          width:  PAPER_W,
          height: PAPER_H,
          zIndex: 3,
        }}
      />

      {/* ── FRONT COVER (GSAP-animated) ──────────────────────────────────── */}
      <div
        ref={frontRef}
        className="absolute"
        style={{
          left:           FRONT_LEFT,
          top:            FRONT_TOP,
          width:          FRONT_W,
          height:         FRONT_H,
          borderRadius:   "32px 32px 12px 12px",
          backdropFilter: "blur(12px) saturate(200%)",
          filter:         filterUrl,
          background:     "rgba(170, 126, 242, 0.22)",
          zIndex:         10,
        }}
      />
    </div>
  )
}
