"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { CaseStudy } from "@/lib/caseStudies"

const NOTE_W = 187
const NOTE_H = 378

interface StickyNoteProps {
  studies:     CaseStudy[]
  flapWidth:   number
  flapHeight:  number
  onHoverItem: (index: number | null) => void
}

export function StickyNote({ studies, flapWidth, flapHeight, onHoverItem }: StickyNoteProps) {
  const [pos, setPos]             = useState({ x: 20, y: 20 })
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)

  const dragging  = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

  // Drag only initiates from the background shell, not from list items
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.listItem) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = true
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      setPos({
        x: Math.max(0, Math.min(flapWidth  - NOTE_W, dragStart.current.posX + dx)),
        y: Math.max(0, Math.min(flapHeight - NOTE_H, dragStart.current.posY + dy)),
      })
    }
    function onMouseUp() { dragging.current = false }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
  }, [flapWidth, flapHeight])

  function handleEnter(i: number) { setHoveredItem(i); onHoverItem(i) }
  function handleLeave()          { setHoveredItem(null); onHoverItem(null) }

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position:      "absolute",
        left:          pos.x,
        top:           pos.y,
        width:         NOTE_W,
        height:        NOTE_H,
        pointerEvents: "auto",
        cursor:        "grab",
        userSelect:    "none",
        zIndex:        20,
      }}
    >
      {/* ── Structural SVG shell (background + border rect + blue footer, no text) ── */}
      <svg
        width="187"
        height="378"
        viewBox="0 0 187 378"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {/* Cream background */}
        <rect width="187" height="378" rx="5.41021" fill="#FFFBF1" />
        {/* Inner border rectangle with tab notch */}
        <path
          d="M120.521 21.6436H151.632C152.857 21.6437 153.928 22.466 154.245 23.6484L155.275 27.4932C155.719 29.1487 157.219 30.2997 158.933 30.2998H166.567C168.061 30.3001 169.272 31.5111 169.272 33.0049V358.261C169.272 359.754 168.061 360.966 166.567 360.966H20.4907C18.9969 360.966 17.7859 359.755 17.7856 358.261V33.0049C17.7857 31.511 18.9968 30.2998 20.4907 30.2998H113.219C114.933 30.2998 116.434 29.1487 116.877 27.4932L117.908 23.6484C118.225 22.4658 119.297 21.6436 120.521 21.6436Z"
          fill="#FFFBF1"
          stroke="#0051E7"
          strokeWidth="1.08204"
        />
        {/* Blue footer bar */}
        <path
          d="M65.229 337.16C66.6493 337.16 67.9417 337.954 68.5894 339.2L68.7095 339.455L68.7251 339.492L68.7358 339.53L69.5747 342.718C69.8875 343.906 70.9622 344.734 72.1909 344.734H170.719C173.304 344.734 175.129 347.267 174.312 349.719L171.066 359.458C170.55 361.004 169.103 362.047 167.473 362.047H19.5845C17.9545 362.047 16.5073 361.004 15.9917 359.458L12.7456 349.719C11.9285 347.267 13.7536 344.734 16.3384 344.734H26.4546C27.6833 344.734 28.758 343.906 29.0708 342.718L29.9097 339.53L29.9194 339.492L29.9351 339.455C30.5319 338.063 31.9017 337.16 33.4165 337.16H65.229Z"
          fill="#0051E7"
          stroke="#0051E7"
          strokeWidth="1.08204"
        />
      </svg>

      {/* ── CASE STUDIES label ── */}
      <p style={{
        position:      "absolute",
        left:          20.49,
        top:           16.77,
        margin:        0,
        fontFamily:    "'Atkinson Hyperlegible Mono', monospace",
        fontWeight:    700,
        fontSize:      6.49,
        lineHeight:    "8px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color:         "#0051E7",
        pointerEvents: "none",
      }}>
        Case Studies
      </p>

      {/* ── Dynamic list ── */}
      <div style={{
        position:      "absolute",
        left:          28.83,
        top:           42,
        width:         129,
        pointerEvents: "auto",
      }}>
        {studies.map((study, i) => (
          <p
            key={i}
            data-list-item="true"
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            style={{
              margin:         0,
              fontFamily:     "'Figma Hand', 'Edu AU VIC WA NT Hand', cursive",
              fontStyle:      "normal",
              fontWeight:     700,
              fontSize:       12,
              lineHeight:     "43px",
              color:          "#000912",
              cursor:         "pointer",
              textDecoration: hoveredItem === i ? "underline" : "none",
              pointerEvents:  "auto",
            }}
          >
            {study.name}
          </p>
        ))}
      </div>
    </div>
  )
}
