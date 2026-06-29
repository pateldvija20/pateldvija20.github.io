"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import type { CaseStudy } from "@/lib/projects"

// Sticker SVG is 398×144 — display at ~70% scale
const STICKER_W = 279
const STICKER_H = 101

interface ProjectStickerProps {
  study:       CaseStudy
  index:       number
  flapWidth:   number
  flapHeight:  number
  onHover:     (hovered: boolean) => void
  onClick:     (rect: DOMRect) => void
}

export function ProjectSticker({ study, index, flapWidth, flapHeight, onHover, onClick }: ProjectStickerProps) {
  const [pos, setPos]   = useState({ x: 20 + index * 24, y: 20 + index * 24 })
  
  // Deterministic tilt based on study ID to avoid client/server hydration mismatch
  const tilt = (() => {
    let hash = 0;
    const str = study.id;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const val = (Math.abs(hash) % 2000) / 100 - 10;
    return parseFloat(val.toFixed(2));
  })();

  const dragging    = useRef(false)
  const hasDragged  = useRef(false)
  const dragStart   = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current   = true
    hasDragged.current = false
    dragStart.current  = { mouseX: e.clientX, mouseY: e.clientY, posX: pos.x, posY: pos.y }
  }, [pos])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      hasDragged.current = true
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      setPos({
        x: Math.max(0, Math.min(flapWidth  - STICKER_W, dragStart.current.posX + dx)),
        y: Math.max(0, Math.min(flapHeight - STICKER_H, dragStart.current.posY + dy)),
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

  if (!study.sticker) return null

  return (
    <div
      data-no-deck-drag
      onMouseDown={onMouseDown}
      onMouseEnter={() => onHover(true)}
      onClick={(e) => { if (!hasDragged.current) onClick(e.currentTarget.getBoundingClientRect()) }}
      style={{
        position:      "absolute",
        left:          pos.x,
        top:           pos.y,
        width:         STICKER_W,
        height:        STICKER_H,
        cursor:        "grab",
        userSelect:    "none",
        zIndex:        20,
        transform:     `rotate(${tilt}deg)`,
        pointerEvents: "auto",
      }}
    >
      <img
        src={study.sticker}
        alt={study.name}
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
      />
    </div>
  )
}
