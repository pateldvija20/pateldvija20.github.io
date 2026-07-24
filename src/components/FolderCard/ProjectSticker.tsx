"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import type { CaseStudy } from "@/lib/projects"
import { useGlobalCursor, type HotzoneTestResult } from "../GlobalCursor"

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
  const stickerRef  = useRef<HTMLDivElement>(null)

  const { registerHotzone, unregisterHotzone } = useGlobalCursor()
  useEffect(() => {
    const id = `project-sticker-${study.id}`
    const testFn = (clientX: number, clientY: number): HotzoneTestResult => {
      const rect = stickerRef.current?.getBoundingClientRect()
      if (!rect) return { active: false }
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        return { active: false }
      }
      return { active: true, pct: 1.0, chevron: "none", hoverType: "expand-invert", icon: "drag" }
    }
    registerHotzone(id, testFn, 30)
    return () => unregisterHotzone(id)
  }, [registerHotzone, unregisterHotzone, study.id])

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

  return (
    <div
      ref={stickerRef}
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
        userSelect:    "none",
        zIndex:        20,
        transform:     `rotate(${tilt}deg)`,
        pointerEvents: "auto",
      }}
    >
      {study.sticker ? (
        <img
          src={study.sticker}
          alt={study.name}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
        />
      ) : (
        // No bespoke art yet (e.g. a project added purely through Sanity) —
        // a plain paper-tag stand-in so it's still visible & clickable.
        <div
          style={{
            width:         "100%",
            height:        "100%",
            display:       "flex",
            alignItems:    "center",
            justifyContent: "center",
            padding:       "0 14px",
            textAlign:     "center",
            background:    "#FFFFFF",
            border:        "1.5px dashed rgba(0,9,18,0.25)",
            borderRadius:  8,
            boxShadow:     "2px 3px 10px rgba(0,0,0,0.12)",
            pointerEvents: "none",
          }}
        >
          <span style={{
            fontSize:      13,
            fontWeight:    600,
            color:         "#000912",
            lineHeight:    1.3,
            overflow:      "hidden",
            display:       "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {study.name}
          </span>
        </div>
      )}
    </div>
  )
}
