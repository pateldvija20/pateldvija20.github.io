"use client"

import { useEffect, useRef } from "react"
import { useGlobalCursor, type HotzoneTestResult } from "./GlobalCursor"
import type { ResumeData } from "@/lib/resume"

const headingFont = "'Bricolage Grotesque', sans-serif"
const bodyFont = "'Atkinson Hyperlegible Mono', monospace"

const PAGE_W = 620
const PAGE_H = 800
const HOLE_X = 26

function EntryRow({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
      <span>{left}</span>
      {right && <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul style={{ margin: "6px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
      {items.map((b, i) => (
        <li key={i} style={{ fontFamily: bodyFont, fontSize: 10.5, lineHeight: 1.5, color: "#333" }}>
          {b}
        </li>
      ))}
    </ul>
  )
}

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: headingFont,
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#000912",
  borderBottom: "1.5px solid #000912",
  paddingBottom: 5,
  marginBottom: 10,
}

/**
 * The physical "paper" desk object's own card — recreates the cream,
 * hole-punched page look (matching the underlying Figma visual it replaces)
 * with the resume content always laid out directly on it.
 */
export function ResumeCard({ data }: { data: ResumeData | null }) {
  const downloadRef = useRef<HTMLButtonElement>(null)
  const { registerHotzone, unregisterHotzone } = useGlobalCursor()

  useEffect(() => {
    if (!data) return
    const testFn = (clientX: number, clientY: number): HotzoneTestResult => {
      const rect = downloadRef.current?.getBoundingClientRect()
      if (
        rect &&
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom
      ) {
        return { active: true, pct: 1.0, chevron: "none", hoverType: "expand-invert", icon: "download" }
      }
      return { active: false }
    }
    // Priority 35: above the deck-wide "drag" catch-all (10), same tier as
    // other nested controls sitting on top of a draggable desk object.
    registerHotzone("resume-download-button", testFn, 35)
    return () => unregisterHotzone("resume-download-button")
  }, [registerHotzone, unregisterHotzone, data])

  return (
    <div
      className="resume-print-page"
      style={{
        position: "relative",
        width: PAGE_W,
        height: PAGE_H,
        background: "#FFFBEF",
        borderRadius: 10,
        boxShadow: "0 10px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Ring-binder holes */}
      {[0.12, 0.5, 0.88].map((f, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: HOLE_X,
            top: PAGE_H * f - 7,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: i === 0 ? "#8DD8E8" : "#B9B9B9",
          }}
        />
      ))}

      <div
        className="resume-print-area"
        data-no-wheel-cycle
        data-no-deck-drag
        style={{
          position: "absolute",
          inset: 0,
          left: 56,
          padding: "36px 32px 32px 0",
          overflowY: "auto",
        }}
      >
        {!data ? (
          <p style={{ fontFamily: bodyFont, fontSize: 12, color: "#999" }}>Resume unavailable.</p>
        ) : (
          <>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontFamily: headingFont, fontSize: 19, fontWeight: 700, color: "#000912" }}>{data.name}</div>
              <div style={{ fontFamily: bodyFont, fontSize: 9.5, color: "#666", marginTop: 3, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.contact.map((c, i) => (
                  <span key={i}>
                    {c.href ? (
                      <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6" }}>{c.label}</a>
                    ) : (
                      c.label
                    )}
                    {i < data.contact.length - 1 && <span style={{ marginLeft: 4, opacity: 0.5 }}>|</span>}
                  </span>
                ))}
              </div>
            </div>

            <button
              ref={downloadRef}
              data-no-deck-drag
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); window.print(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                margin: "14px 0 20px",
                padding: "6px 12px",
                border: "1.5px solid #000912",
                borderRadius: 7,
                background: "#FFFBEF",
                fontFamily: headingFont,
                fontSize: 11,
                fontWeight: 600,
                color: "#000912",
                cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 3V15M12 15L7 10M12 15L17 10" stroke="#000912" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 19H20" stroke="#000912" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Download
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {data.sections.map((section, si) => {
                const kind = section.heading.trim().toLowerCase()

                return (
                  <div key={si}>
                    <div style={sectionHeadingStyle}>{section.heading}</div>

                    {kind === "skill" && section.skillGroups && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {section.skillGroups.map((g, gi) => (
                          <div key={gi} style={{ fontFamily: bodyFont, fontSize: 10.5, lineHeight: 1.5, color: "#333" }}>
                            <span style={{ fontWeight: 700, color: "#000912" }}>{g.label}: </span>
                            {g.items}
                          </div>
                        ))}
                      </div>
                    )}

                    {(kind === "experience" || kind === "education") && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {section.entries.map((entry, ei) => {
                          const [mainTitle, company] = entry.title.split(" — ")
                          const metaParts = entry.meta.split(" · ").map((p) => p.trim())
                          const date = metaParts[0]
                          const secondLine = kind === "education" ? metaParts[1] : company
                          const location = kind === "education" ? metaParts[2] : metaParts[1]

                          return (
                            <div key={ei}>
                              <EntryRow
                                left={<span style={{ fontFamily: headingFont, fontSize: 12.5, fontWeight: 700, color: "#000912" }}>{mainTitle}</span>}
                                right={<span style={{ fontFamily: headingFont, fontSize: 10.5, fontWeight: 700, color: "#000912" }}>{date}</span>}
                              />
                              {(secondLine || location) && (
                                <EntryRow
                                  left={<span style={{ fontFamily: bodyFont, fontSize: 10, fontStyle: "italic", color: "#555" }}>{secondLine}</span>}
                                  right={<span style={{ fontFamily: bodyFont, fontSize: 10, fontStyle: "italic", color: "#555" }}>{location}</span>}
                                />
                              )}
                              <Bullets items={entry.bullets} />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {kind === "project" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {section.entries.map((entry, ei) => (
                          <div key={ei}>
                            <span style={{ fontFamily: headingFont, fontSize: 12.5, fontWeight: 700, color: "#000912" }}>
                              {entry.title}
                            </span>
                            {entry.meta && (
                              <span style={{ fontFamily: bodyFont, fontSize: 10, fontStyle: "italic", color: "#555" }}>
                                {"  |  "}{entry.meta}
                              </span>
                            )}
                            <Bullets items={entry.bullets} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
