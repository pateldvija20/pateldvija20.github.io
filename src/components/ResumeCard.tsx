"use client"

import { useEffect, useRef } from "react"
import { useGlobalCursor, type HotzoneTestResult } from "./GlobalCursor"
import type { ResumeData } from "@/lib/resume"

const fontSans = "'DM Sans', sans-serif"

const PAGE_W = 760
const PAGE_H = 895

export function ResumeCard({ data }: { data: ResumeData | null }) {
  const downloadRef = useRef<HTMLButtonElement>(null)
  const { registerHotzone, unregisterHotzone } = useGlobalCursor()

  useEffect(() => {
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
    registerHotzone("resume-download-button", testFn, 35)
    return () => unregisterHotzone("resume-download-button")
  }, [registerHotzone, unregisterHotzone])

  const experiences = [
    {
      role: "UI/UX Designer",
      company: "INVT.RSVP Hifi Cincy LLC",
      date: "MAR 2026 – PRESENT",
      bullets: [
        "Led end-to-end Product Design in Figma for a 0-to-1 marketplace, shipping 40+ UI screens, refining User Experience (UX) with responsive design across web and mobile app for diverse user profiles.",
        "Crafted a unique brand identity, scalable design system, and component libraries, building high-fidelity design and interactive prototypes with Figma MCP and Claude Code for design-to-code handoff across a cross-functional team.",
        "Redesigned existing user flows and UI screens for homepage, profile page, event creation, event page, and map to improve event discovery, navigation, and clarity.",
        "Designed monetization and discovery features: ticketing, custom offers, payment flows, analytics dashboards, and an event-crawl that surfaces venues by type and dwell time to drive organic discovery."
      ]
    },
    {
      role: "UX Design Researcher",
      company: "The Livewell Collaborative",
      date: "MAY 2025 – AUG 2025",
      bullets: [
        "Led UX research across 17 pediatric hospital units to solve patient misidentification safety risks, executing 72 hours of ethnographic field observation, contextual inquiry, and clinician, patient, and family interviews.",
        "Synthesized qualitative findings via affinity mapping, journey mapping, and root-cause analysis into a research report and design requirements, securing cross-functional stakeholder approval to advance a hospital-wide ID band redesign.",
        "Conducted employee interviews, donor surveys, and 12+ contextual observations to map spatial pain points and address donor disengagement and poor way-finding in the Hoxworth Blood Center atrium.",
        "Delivered personas, journey maps, mood-boards, and 3 spatial concepts which directly earned Executive Director and CFO approval for a full atrium redesign serving donors and staff across a regional blood center."
      ]
    },
    {
      role: "Graphic Designer",
      company: "University of Cincinnati Graduate College",
      date: "SEPT 2024 – APR 2025",
      bullets: [
        "Designed creative campaigns for events organized by Graduate College, including Spring Orientation 2025, the 2nd Annual Graduate Student Mental Health Summit, GradNext, Grad Appreciation Week, 3-Minute Thesis, and ColabEX2024, by collaborating with copywriters and producers to deliver cohesive digital/print assets, increasing student engagement.",
        "Coordinated event logistics, including vendor communications and timeline management, ensuring seamless execution for 2,000+ attendees."
      ]
    },
    {
      role: "Visual Designer",
      company: "Bluelearn.in",
      date: "JUN 2022 – JUN 2023",
      bullets: [
        "Designed creative campaigns for events organized by Graduate College, including Spring Orientation 2025, the 2nd Annual Graduate Student Mental Health Summit, GradNext, Grad Appreciation Week, 3-Minute Thesis, and ColabEX2024, by collaborating with copywriters and producers to deliver cohesive digital/print assets, increasing student engagement.",
        "Coordinated event logistics, including vendor communications and timeline management, ensuring seamless execution for 2,000+ attendees."
      ]
    }
  ]

  const education = [
    {
      degree: "University of Cincinnati",
      date: "MAY '26",
      desc: "Master of Design, Human-Computer Interaction",
      isBold: true
    },
    {
      degree: "Gujarat Technological University",
      date: "JUN '23",
      desc: "Bachelor of Engineering, Computer Engineering",
      isBold: false
    }
  ]

  const skills = [
    { label: "Design", items: "UX/UI Design, User-Centered Design, Micro-Interaction, Visual Design, Information Architecture, Design System, UX Laws, Data-Driven Design, Strategy" },
    { label: "Tools", items: "Figma, Framer, Miro, Balsamiq, Zeplin, ProtoPie, Maze, Hotjar, Mixpanel, Notion, Jira, Slack, Photoshop, Illustrator" },
    { label: "Research", items: "Discovery, Journey Mapping, UX Research Methods, Design Thinking, Wireframing, Mockups, Rapid Prototyping, Storyboarding" },
    { label: "Technical", items: "HTML, CSS, JavaScript, Front-End Development, Design Handoff, AI Interfaces, AI Workflows, Prompt Engineering" }
  ]

  return (
    <div
      className="resume-print-page"
      style={{
        boxSizing: "border-box",
        position: "relative",
        width: PAGE_W,
        height: PAGE_H,
        backgroundColor: "#FFFFFF",
        border: "1.29053px solid #000000",
        borderRadius: "10.3242px",
        boxShadow: "0 10px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)",
        overflow: "visible",
        fontFamily: fontSans,
      }}
    >
      <div
        className="resume-print-area"
        data-no-wheel-cycle
        data-no-deck-drag
        style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "16px 30.9727px",
          gap: "8px",
          position: "absolute",
          width: PAGE_W,
          height: PAGE_H,
          left: 0,
          top: 0,
          overflow: "hidden",
        }}
      >
        {/* Contact Info Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: 0,
            width: "100%",
            flexShrink: 0,
          }}
        >
          {/* Name & Role */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "4px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: fontSans,
                fontWeight: 700,
                fontSize: "27px",
                lineHeight: "32px",
                color: "#020406",
              }}
            >
              Dvija Patel
            </h1>
            <h2
              style={{
                margin: 0,
                fontFamily: fontSans,
                fontWeight: 700,
                fontSize: "27px",
                lineHeight: "32px",
                color: "#767B7F",
              }}
            >
              UX Product Designer
            </h2>
          </div>

          {/* Contact Links & Download */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
            }}
          >
            <a
              href="mailto:pateldvija20@gmail.com"
              style={{
                fontFamily: fontSans,
                fontWeight: 400,
                fontSize: "13.5px",
                lineHeight: "16px",
                color: "#020406",
                textDecoration: "none",
              }}
            >
              pateldvija20@gmail.com
            </a>
            <span
              style={{
                fontFamily: fontSans,
                fontWeight: 400,
                fontSize: "13.5px",
                lineHeight: "16px",
                color: "#020406",
              }}
            >
              +1 (640) 204-9889
            </span>

            {/* Download Button inside resume below phone number */}
            <button
              ref={downloadRef}
              data-no-deck-drag
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); window.print(); }}
              className="mt-1 px-3 py-1 text-[11.5px] font-semibold tracking-wider uppercase rounded transition-all duration-200 border border-black text-[#020406] bg-transparent hover:bg-[#FF5C00] hover:border-[#FF5C00] hover:text-white cursor-pointer inline-flex items-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="stroke-current">
                <path d="M12 3V15M12 15L7 10M12 15L17 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 19H20" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Main Resume Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "12px",
            width: "100%",
            flexGrow: 1,
          }}
        >
          {/* Work Experience Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "6px",
              width: "100%",
            }}
          >
            <div
              style={{
                fontFamily: fontSans,
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "22px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#767B7F",
              }}
            >
              EXPERIENCE
            </div>

            {experiences.map((exp, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  width: "100%",
                  gap: "2px",
                }}
              >
                {/* Job Detail Header */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    height: "21px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fontSans,
                        fontWeight: 700,
                        fontSize: "12.5px",
                        lineHeight: "21px",
                        color: "#020406",
                      }}
                    >
                      {exp.role}
                    </span>
                    <span style={{ fontFamily: fontSans, fontSize: "12.5px", color: "#020406" }}>
                      |
                    </span>
                    <span
                      style={{
                        fontFamily: fontSans,
                        fontStyle: "italic",
                        fontWeight: 400,
                        fontSize: "12.5px",
                        lineHeight: "21px",
                        color: "#020406",
                      }}
                    >
                      {exp.company}
                    </span>
                  </div>

                  <span
                    style={{
                      fontFamily: fontSans,
                      fontWeight: 400,
                      fontSize: "12.5px",
                      lineHeight: "16px",
                      color: "#767B7F",
                    }}
                  >
                    {exp.date}
                  </span>
                </div>

                {/* Job Bullets */}
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {exp.bullets.map((bullet, bi) => (
                    <li
                      key={bi}
                      style={{
                        fontFamily: fontSans,
                        fontWeight: 400,
                        fontSize: "11px",
                        lineHeight: "148%",
                        color: "#646B71",
                      }}
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Education & Skills Side-by-Side Row */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: "36px",
              width: "100%",
              marginTop: "2px",
            }}
          >
            {/* Education Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "8px",
                width: "245px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: fontSans,
                  fontWeight: 700,
                  fontSize: "14px",
                  lineHeight: "22px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#767B7F",
                }}
              >
                EDUCATION
              </div>

              {education.map((edu, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: fontSans,
                        fontWeight: edu.isBold ? 800 : 700,
                        fontSize: "12.5px",
                        lineHeight: "21px",
                        color: "#020406",
                      }}
                    >
                      {edu.degree}
                    </span>
                    <span
                      style={{
                        fontFamily: fontSans,
                        fontWeight: 400,
                        fontSize: "12.5px",
                        lineHeight: "16px",
                        color: "#B0B7BD",
                      }}
                    >
                      {edu.date}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: fontSans,
                      fontWeight: 400,
                      fontSize: "12px",
                      lineHeight: "145%",
                      color: "#646B71",
                    }}
                  >
                    {edu.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Skills & Languages Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "6px",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontFamily: fontSans,
                  fontWeight: 700,
                  fontSize: "14px",
                  lineHeight: "22px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#767B7F",
                }}
              >
                SKILLS & LANGUAGES
              </div>

              {skills.map((skill, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: fontSans,
                    fontWeight: 400,
                    fontSize: "12px",
                    lineHeight: "145%",
                    color: "#020406",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#020406" }}>
                    {skill.label}:{" "}
                  </span>
                  <span style={{ fontWeight: 400, color: "#646B71" }}>
                    {skill.items}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
