"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import BookCover from "../imports/Frame31-1/Frame31-6-430";
import { useGlobalCursor, type HotzoneTestResult } from "./GlobalCursor";

interface InteractiveBookProps {
  state?: "closed" | "hover" | "open";
  className?: string;
  onToggleOpen?: () => void;
  isDark?: boolean;
}

export function InteractiveBook({
  state = "closed",
  className = "",
  onToggleOpen,
  isDark = false,
}: InteractiveBookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const coverWrapperRef = useRef<HTMLDivElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const pagesStackRef = useRef<HTMLDivElement>(null);
  const rightCoverBackingRef = useRef<HTMLDivElement>(null);
  const spineHingeRef = useRef<HTMLDivElement>(null);

  const words = ["meaningful", "bold", "intuitive", "empathetic", "functional"];
  const [wordIndex, setWordIndex] = useState(0);
  const rotatingWordRef = useRef<HTMLSpanElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSkillIndex, setExpandedSkillIndex] = useState<number | null>(null);
  const [hoveredSymbolIndex, setHoveredSymbolIndex] = useState<number | null>(null);
  const isFlippingRef = useRef(false);

  // Reset expanded skill and hover when page changes
  useEffect(() => {
    setExpandedSkillIndex(null);
    setHoveredSymbolIndex(null);
  }, [currentPage]);

  const [hoverZone, setHoverZone] = useState<"none" | "next" | "back">("none");
  const { registerHotzone, unregisterHotzone } = useGlobalCursor();

  // ── Hotzone test function: given viewport coords, check if inside a book page-turn zone ──
  const hotzoneTestFn = useCallback(
    (clientX: number, clientY: number): HotzoneTestResult => {
      if (state !== "open" || isFlippingRef.current) return { active: false };
      const container = containerRef.current;
      if (!container) return { active: false };

      const rect = container.getBoundingClientRect();
      const scaleX = rect.width / 1154;
      const scaleY = rect.height / 763;

      const x = (clientX - rect.left) / (scaleX || 1);
      const y = (clientY - rect.top) / (scaleY || 1);

      // Only test if inside the book bounds
      if (x < 0 || x > 1154 || y < 0 || y > 763) return { active: false };

      if (currentPage === 1) {
        if (x >= 860.5 && x <= 1144) {
          const pct = Math.min(Math.max((x - 860.5) / (1144 - 860.5), 0), 1);
          return { active: true, pct, chevron: "next" };
        }
      } else if (currentPage === 2) {
        // Check if cursor is over any of the plus/minus buttons on page 3
        const buttons = document.querySelectorAll(".skill-plus-minus-btn");
        for (let i = 0; i < buttons.length; i++) {
          const btnRect = buttons[i].getBoundingClientRect();
          if (
            clientX >= btnRect.left &&
            clientX <= btnRect.right &&
            clientY >= btnRect.top &&
            clientY <= btnRect.bottom
          ) {
            const isExpanded = expandedSkillIndex === i;
            return {
              active: true,
              pct: 1.0,
              chevron: "none",
              hoverType: "expand-invert",
              symbol: isExpanded ? "−" : "+",
            } as any;
          }
        }

        if (x >= 10 && x <= 293.5) {
          const pct = Math.min(Math.max((293.5 - x) / (293.5 - 10), 0), 1);
          return { active: true, pct, chevron: "back" };
        }
      }

      return { active: false };
    },
    [state, currentPage, expandedSkillIndex]
  );

  // Register / unregister the hotzone with the global cursor
  useEffect(() => {
    registerHotzone("interactive-book", hotzoneTestFn);
    return () => unregisterHotzone("interactive-book");
  }, [registerHotzone, unregisterHotzone, hotzoneTestFn]);

  // ── Track hoverZone for click handling (lightweight — only sets state on zone change) ──
  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state !== "open" || isFlippingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / 1154;
    const x = (e.clientX - rect.left) / (scaleX || 1);

    let currentZone: "none" | "next" | "back" = "none";
    if (currentPage === 1 && x >= 860.5 && x <= 1144) currentZone = "next";
    else if (currentPage === 2 && x >= 10 && x <= 293.5) currentZone = "back";

    if (currentZone !== hoverZone) setHoverZone(currentZone);
  };

  const handleContainerMouseLeave = () => {
    if (hoverZone !== "none") setHoverZone("none");
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state !== "open" || isFlippingRef.current) return;
    if (hoverZone === "next") {
      flipToPage(2, e);
      setHoverZone("none");
    } else if (hoverZone === "back") {
      flipToPage(1, e);
      setHoverZone("none");
    }
  };

  const flipToPage = (newPage: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFlippingRef.current || newPage === currentPage) return;
    isFlippingRef.current = true;

    const leftPage = leftPageRef.current;
    const rightPage = rightPageRef.current;
    if (!leftPage || !rightPage) {
      setCurrentPage(newPage);
      isFlippingRef.current = false;
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        isFlippingRef.current = false;
      },
    });

    if (newPage > currentPage) {
      gsap.set(rightPage, { transformOrigin: "left center" });
      tl.to(rightPage, {
        scaleX: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setCurrentPage(newPage);
          gsap.set(rightPage, { scaleX: 1, opacity: 0, pointerEvents: "auto" });
          gsap.set(leftPage, { transformOrigin: "right center", scaleX: 0, opacity: 0 });
        },
      });
      tl.to(leftPage, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      }, 0);

      tl.to(leftPage, {
        scaleX: 1,
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      tl.to(rightPage, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      }, "<");
    } else {
      gsap.set(leftPage, { transformOrigin: "right center" });
      tl.to(leftPage, {
        scaleX: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setCurrentPage(newPage);
          gsap.set(leftPage, { scaleX: 1, opacity: 0, pointerEvents: "auto" });
          gsap.set(rightPage, { transformOrigin: "left center", scaleX: 0, opacity: 0 });
        },
      });
      tl.to(rightPage, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      }, 0);

      tl.to(rightPage, {
        scaleX: 1,
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      tl.to(leftPage, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      }, "<");
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const cover = coverWrapperRef.current;
    const leftPage = leftPageRef.current;
    const rightPage = rightPageRef.current;
    const pagesStack = pagesStackRef.current;
    const rightBacking = rightCoverBackingRef.current;
    const spineHinge = spineHingeRef.current;

    const leftBgSheets = container?.querySelectorAll(".left-page-bg-sheet");
    const rightBgSheets = container?.querySelectorAll(".right-page-bg-sheet");

    if (!cover) return;

    if (state === "closed") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, rightBacking, spineHinge]);
      if (leftBgSheets) gsap.killTweensOf(leftBgSheets);
      if (rightBgSheets) gsap.killTweensOf(rightBgSheets);

      // Center the card when closed (shift left by half card width)
      if (container) {
        gsap.to(container, {
          x: -288.5,
          duration: 0.6,
          ease: "power2.out",
        });
      }
      // Return cover to resting angle (flat rectangle)
      gsap.to(cover, {
        rotateY: 0,
        x: 0,
        duration: 0.6,
        ease: "power2.out",
      });
      // Hide open pages, backings
      if (leftPage) gsap.to(leftPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (rightPage) gsap.to(rightPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (leftBgSheets) gsap.to(leftBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBgSheets) gsap.to(rightBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBacking) gsap.to(rightBacking, { opacity: 0, duration: 0.3 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 0, duration: 0.3 });
      // Keep thickness deck hidden to avoid faint white borders
      if (pagesStack) gsap.to(pagesStack, { opacity: 0, duration: 0.4 });
      setCurrentPage(1);
    } else if (state === "hover") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, rightBacking, spineHinge]);
      if (leftBgSheets) gsap.killTweensOf(leftBgSheets);
      if (rightBgSheets) gsap.killTweensOf(rightBgSheets);

      // Keep card centered
      if (container) {
        gsap.to(container, {
          x: -288.5,
          duration: 0.6,
          ease: "power2.out",
        });
      }
      // Keep cover flat in hover state to maintain rectangular shape
      gsap.to(cover, {
        rotateY: 0,
        x: 0,
        duration: 0.6,
        ease: "power2.out",
      });
      if (leftPage) gsap.to(leftPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (rightPage) gsap.to(rightPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (leftBgSheets) gsap.to(leftBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBgSheets) gsap.to(rightBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBacking) gsap.to(rightBacking, { opacity: 0, duration: 0.3 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 0, duration: 0.3 });
      if (pagesStack) gsap.to(pagesStack, { opacity: 0, duration: 0.4 });
      setCurrentPage(1);
    } else if (state === "open") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, rightBacking, spineHinge]);
      if (leftBgSheets) gsap.killTweensOf(leftBgSheets);
      if (rightBgSheets) gsap.killTweensOf(rightBgSheets);

      // Align open book layout center to mat center (reset x shift)
      if (container) {
        gsap.to(container, {
          x: 0,
          duration: 0.85,
          ease: "power2.inOut",
        });
      }
      // Swing cover fully open (180deg) to the left
      gsap.to(cover, {
        rotateY: -180,
        x: 0,
        duration: 0.85,
        ease: "power2.inOut",
      });
      // Fade stack out
      if (pagesStack) gsap.to(pagesStack, { opacity: 0, duration: 0.3 });

      // Fade in inside backings and spine hinge earlier (at delay 0.2s)
      if (rightBacking) gsap.to(rightBacking, { opacity: 1, duration: 0.4, delay: 0.2 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 1, duration: 0.4, delay: 0.2 });

      // Unfold the inside pages after cover swings past 90deg (delay 0.45s)
      if (leftPage) {
        gsap.set(leftPage, { transformOrigin: "right center" });
        gsap.to(leftPage, {
          opacity: 1,
          scaleX: 1,
          pointerEvents: "auto",
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
      if (leftBgSheets) {
        gsap.set(leftBgSheets, { transformOrigin: "right center" });
        gsap.to(leftBgSheets, {
          opacity: 1,
          scaleX: 1,
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
      if (rightPage) {
        gsap.set(rightPage, { transformOrigin: "left center" });
        gsap.to(rightPage, {
          opacity: 1,
          scaleX: 1,
          pointerEvents: "auto",
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
      if (rightBgSheets) {
        gsap.set(rightBgSheets, { transformOrigin: "left center" });
        gsap.to(rightBgSheets, {
          opacity: 1,
          scaleX: 1,
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
    }
  }, [state]);

  useEffect(() => {
    if (state !== "open") return;
    const interval = setInterval(() => {
      const el = rotatingWordRef.current;
      if (!el) return;
      gsap.to(el, {
        opacity: 0,
        y: -15,
        duration: 0.35,
        ease: "power1.inOut",
        onComplete: () => {
          setWordIndex((prev) => (prev + 1) % words.length);
          gsap.fromTo(
            el,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.35, ease: "power1.out" }
          );
        },
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [state]);

  const cardW = 577;
  const cardH = 763;

  // Staggered sheet widths to build stacked page thickness peeking out
  const stackOffsets = [
    { w: 570, t: 7, l: 577 },
    { w: 567, t: 7, l: 577 },
    { w: 564, t: 7, l: 577 },
    { w: 561, t: 7, l: 577 },
    { w: 558, t: 7, l: 577 },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      onClick={handleContainerClick}
      className={`relative select-none ${className}`}
      style={{
        width: cardW * 2, // 1154px (Full double-page width)
        height: cardH,
        perspective: 2000,
        transformStyle: "preserve-3d",
      }}
    >
      {/* ── [1] STACKED PAGES DECK (Thickness effect under cover when closed) ── */}
      <div
        ref={pagesStackRef}
        className="absolute inset-0 pointer-events-none"
        style={{ transformStyle: "preserve-3d", opacity: 0 }}
      >
        {/* Red Back Cover Sheet */}
        <div
          className="absolute shadow-[rgba(0,0,0,0.25)_1px_0px_5px_0px]"
          style={{
            left: 577,
            top: 4,
            width: 574,
            height: 754,
            backgroundColor: "#DCCCFF",
            borderRadius: "0px 36px 36px 0px",
            transform: "translateZ(-6px)",
          }}
        />
        {/* White Staggered Sheets */}
        {stackOffsets.map((offset, i) => (
          <div
            key={i}
            className="absolute border border-[rgb(197,197,197)]"
            style={{
              left: offset.l,
              top: offset.t,
              width: offset.w,
              height: cardH - 14,
              backgroundColor: isDark ? "#282a2d" : "rgb(220, 220, 220)",
              borderRadius: "0px 36px 36px 0px",
              transform: `translateZ(${-1 - i}px)`,
            }}
          />
        ))}
      </div>

      {/* ── [1.5] OPEN BOOK COVER BACKINGS & HINGE (Only visible when opened) ── */}
      {/* Right Cover Backing */}
      <div
        ref={rightCoverBackingRef}
        className="absolute"
        style={{
          left: 577,
          top: 0,
          width: cardW,
          height: cardH,
          backgroundColor: "#DCCCFF",
          borderRadius: "16px 40px 40px 16px",
          opacity: 0,
          zIndex: 20,
        }}
      >
        {/* Right Inside Lining Paper */}
        <div
          className="shadow-inner absolute"
          style={{
            left: 16,
            top: 16,
            width: cardW - 32,
            height: cardH - 32,
            backgroundColor: isDark ? "#1f2022" : "#fbf9f3",
            borderRadius: "4px 24px 24px 4px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        />
      </div>

      {/* Spine Hinge vertical bar connecting flaps */}
      <div
        ref={spineHingeRef}
        className="absolute"
        style={{
          left: 577 - 25, // Centered on middle crease
          top: 0,
          width: 50,
          height: cardH,
          backgroundColor: "#DCCCFF",
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.15), inset 1px 0 3px rgba(0,0,0,0.15)",
          opacity: 0,
          zIndex: 22,
        }}
      />

      {/* ── [2] DOUBLE SIDE COVER WRAPPER (Swings Y from 0 to -180deg) ── */}
      <div
        ref={coverWrapperRef}
        className="absolute"
        style={{
          left: 577,
          top: 0,
          width: cardW,
          height: cardH,
          transformOrigin: "left center",
          transformStyle: "preserve-3d",
          transform: "rotateY(0deg) translateX(0px)",
          zIndex: 20,
        }}
      >
        {/* Front Cover Side */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
            transformStyle: "preserve-3d",
            borderRadius: "16px 40px 40px 16px",
            overflow: "hidden",
          }}
        >
          {/* Cover SVG Graphic */}
          <BookCover isClosed={state !== "open"} />

          {/* Crease Shader Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "rgba(255, 255, 255, 0.5) -2px 0px 2px 0px inset",
              borderRadius: "16px 40px 40px 16px",
            }}
          />

          {/* Crease Ridge Overlay */}
          <div
            className="absolute inset-0 pointer-events-none flex"
            style={{
              boxShadow:
                "rgba(0, 0, 0, 0.16) 0.301094px 0.602187px 1.21188px -0.5px, rgba(0, 0, 0, 0.196) 1.14427px 2.28853px 4.60558px -1px, rgba(0, 0, 0, 0.35) 5px 10px 20.1246px -1.5px",
              borderRadius: "16px 40px 40px 16px",
            }}
          >
            {/* Spine Highlight Padding */}
            <div
              style={{
                width: 19,
                height: "100%",
                borderRadius: "0px 20px 20px 0px",
              }}
            />
            {/* Creed Gradient shading */}
            <div
              style={{
                flex: 1,
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0.41327%, rgba(255, 255, 255, 0.1) 0.639719%, rgba(0, 36, 121, 0) 8.20629%, rgba(0, 36, 121, 0) 98%, rgba(255, 255, 255, 0.1) 100%)",
                borderRadius: "0px 8px 8px 0px",
              }}
            />
          </div>
        </div>

        {/* Back Cover Lining (Inside Left flap when open) */}
        <div
          className="absolute inset-0 flex items-center justify-center border-l-2 border-black/10"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "#DCCCFF",
            borderRadius: "40px 16px 16px 40px",
          }}
        >
          {/* Lining Paper */}
          <div
            className="shadow-inner"
            style={{
              width: cardW - 32,
              height: cardH - 32,
              backgroundColor: isDark ? "#1f2022" : "#fbf9f3",
              borderRadius: "24px 4px 4px 24px",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          />
        </div>
      </div>

      {/* ── [3] OPENED DOUBLE-PAGE CONTENT (Fades in when open) ── */}

      {/* Left Page Background Sheets (Page Stack Thickness) */}
      {[1, 2, 3].map((num) => {
        const offset = num * 3; // 3px, 6px, 9px offset
        return (
          <div
            key={`left-sheet-${num}`}
            className="left-page-bg-sheet absolute"
            style={{
              left: 10 + offset,
              top: 10,
              width: cardW - 10 - offset,
              height: cardH - 20,
              backgroundColor: "#f5f3eb",
              borderRadius: "24px 0px 0px 24px",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "-4px 6px 12px rgba(0,0,0,0.1)",
              opacity: 0,
              transformOrigin: "right center",
              transform: "scaleX(0)",
              pointerEvents: "none",
              zIndex: 30 - num,
            }}
          />
        );
      })}

      {/* Left Page (Typography & Dynamic Word or Skills list) */}
      <div
        ref={leftPageRef}
        className="absolute flex flex-col"
        style={{
          left: 10,
          top: 10,
          width: cardW - 10, // 567px (Ends at 577px crease)
          height: cardH - 20,
          backgroundColor: currentPage === 2 ? "#DCCCFF" : "#FCFEFF",
          color: "#000000",
          borderRadius: "24px 0px 0px 24px", // Meets flush at right edge
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "-8px 10px 24px rgba(0,0,0,0.16), -2px 2px 6px rgba(0,0,0,0.06)",
          padding: currentPage === 2 ? "0px" : "32px",
          overflow: "hidden",
          opacity: 0,
          transformOrigin: "right center",
          transform: "scaleX(0)",
          pointerEvents: "none",
          zIndex: 30,
        }}
      >
        {currentPage === 1 ? (
          <div className="flex-1 flex flex-col justify-end">
            <div
              style={{
                width: "100%",
                maxWidth: "483px",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontStyle: "normal",
                fontWeight: 500,
                fontSize: "40px",
                lineHeight: "160%",
                color: "#000000",
              }}
            >
              I create{" "}
              <span
                ref={rotatingWordRef}
                style={{
                  display: "inline-block",
                  fontWeight: 500,
                }}
              >
                {words[wordIndex]}
              </span>
              <br />
              experience that adapt to
              <br />
              shifting systems and
              <br />
              feel human.
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {/* Background Image */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "url(/about_cover.png?v=4) no-repeat center/cover",
                pointerEvents: "none",
                borderRadius: "24px 0px 0px 24px",
              }}
            />

            {/* Layout container */}
            <div style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              left: 0,
              top: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "50px",
              gap: "28px",
              zIndex: 10,
              boxSizing: "border-box",
            }}>
              <div style={{
                width: "100%",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 500,
                fontSize: "22px",
                lineHeight: "160%",
                color: "#000000",
                opacity: 0.8,
              }}>
                Things I am good at
              </div>
              
              {/* Skills items */}
              {(() => {
                const SKILLS_DATA = [
                  {
                    title: "Experience Design",
                    description: "User experience, User interface design, Wire-framing, Usability testing, Physical & digital prototyping, Inclusive design, Double Diamond process, Design systems, Web & mobile design"
                  },
                  {
                    title: "UX Research",
                    description: "User research, User interviews, User personas, Interview synthesis, Data visualization, A/B testing, Information architecture, Competitive analysis"
                  },
                  {
                    title: "Visual Design",
                    description: "Brand identity, Design systems, Typography, Iconography, Custom illustration"
                  },
                  {
                    title: "Software",
                    description: "Figma, Unity, Miro, Adobe suite(Illustrator, Photoshop, Indesign), Framer, Blender, spline, Notion, Procreate"
                  },
                  {
                    title: "AI Tools",
                    description: "Claude code, Codex, Mid-journey, fuser studio"
                  }
                ];

                return SKILLS_DATA.map((skill, index) => {
                  const isExpanded = expandedSkillIndex === index;
                  // Dynamic height based on expanded state specifications:
                  // Exp Design: 168px, UX Research: 149px, Vis Design: 130px, Software: 149px, AI: 111px
                  let expandedHeight = 149;
                  if (index === 0) expandedHeight = 168;
                  else if (index === 2) expandedHeight = 130;
                  else if (index === 4) expandedHeight = 111;

                  return (
                    <div
                      key={index}
                      style={{
                        boxSizing: "border-box",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        alignItems: "stretch",
                        width: "100%",
                        height: isExpanded ? expandedHeight : 64,
                        borderBottom: "1px solid #000000",
                        overflow: "hidden",
                        transition: "height 0.3s ease-in-out",
                      }}
                    >
                      {/* Header Row */}
                      <div style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        height: 64,
                        flexShrink: 0,
                      }}>
                        <span style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontWeight: 500,
                          fontSize: "36px", // adjusted to 36px per design specs
                          lineHeight: "160%",
                          color: "#000000",
                          display: "flex",
                          alignItems: "center",
                        }}>
                          {skill.title}
                        </span>
                        <span
                          data-index={index}
                          onMouseEnter={() => setHoveredSymbolIndex(index)}
                          onMouseLeave={() => setHoveredSymbolIndex(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSkillIndex(isExpanded ? null : index);
                          }}
                          className="skill-plus-minus-btn"
                          style={{
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                            fontWeight: 500,
                            fontSize: "36px",
                            lineHeight: "160%",
                            // Hide the original text by making it transparent when hovered
                            color: hoveredSymbolIndex === index
                              ? "transparent"
                              : "#000000",
                            display: "flex",
                            alignItems: "center",
                            width: 32, // larger click target area
                            justifyContent: "center",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          {isExpanded ? "−" : "+"}
                        </span>
                      </div>

                      {/* Description Row */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          justifyContent: "flex-end",
                          alignItems: "flex-start",
                          width: "100%",
                          boxSizing: "border-box",
                          opacity: isExpanded ? 1 : 0,
                          transition: "opacity 0.25s ease-in-out",
                          pointerEvents: isExpanded ? "auto" : "none",
                        }}
                      >
                        <span style={{
                          width: 392, // matching design spec width
                          fontFamily: "'Atkinson Hyperlegible Mono', monospace",
                          fontStyle: "normal",
                          fontWeight: 500,
                          fontSize: "12px",
                          lineHeight: "160%",
                          letterSpacing: "-0.04em",
                          textTransform: "capitalize",
                          color: "#000000",
                          textAlign: "right",
                        }}>
                          {skill.description}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

          </div>
        )}
      </div>

      {/* Right Page Background Sheets (Page Stack Thickness) */}
      {[1, 2, 3].map((num) => {
        const offset = num * 3; // 3px, 6px, 9px offset
        return (
          <div
            key={`right-sheet-${num}`}
            className="right-page-bg-sheet absolute"
            style={{
              left: 577,
              top: 10,
              width: cardW - 10 - offset,
              height: cardH - 20,
              backgroundColor: "#f5f3eb",
              borderRadius: "0px 24px 24px 0px",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "4px 6px 12px rgba(0,0,0,0.1)",
              opacity: 0,
              transformOrigin: "left center",
              transform: "scaleX(0)",
              pointerEvents: "none",
              zIndex: 30 - num,
            }}
          />
        );
      })}

      {/* Right Page (Portrait Image & Next Page Flip Button) */}
      <div
        ref={rightPageRef}
        className="absolute flex flex-col justify-between"
        style={{
          left: 577, // Starts exactly at 577px crease
          top: 10,
          width: cardW - 10, // 567px (Ends at 1144px, leaving 10px cover border)
          height: cardH - 20,
          background: currentPage === 1 
            ? "url(/about_portrait.png?v=3) no-repeat center/cover"
            : "#FCFEFF", // page 4 remains white always
          color: "#000000",
          padding: currentPage === 2 ? "25px" : "0px",
          filter: (isDark && currentPage === 1) ? "brightness(0.85)" : "none", // only dim portrait image
          borderRadius: "0px 24px 24px 0px", // Meets flush at left edge
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "8px 10px 24px rgba(0,0,0,0.16), 2px 2px 6px rgba(0,0,0,0.06)",
          opacity: 0,
          transformOrigin: "left center",
          transform: "scaleX(0)",
          pointerEvents: "none",
          zIndex: 30,
        }}
      >
        {currentPage === 2 && (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {/* Frame 61 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "24px",
                gap: "28px",
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Things I have done */}
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 500,
                  fontSize: "20px",
                  lineHeight: "160%",
                  color: "#000000",
                }}
              >
                Things I have done
              </div>

              {/* Experience Section */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "20px",
                  alignSelf: "stretch",
                }}
              >
                {/* Frame 78 (Experience Header) */}
                <div
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingBottom: "8px",
                    width: "100%",
                    borderBottom: "1px solid #000000",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: "20px",
                      lineHeight: "160%",
                      textTransform: "uppercase",
                      color: "#000000",
                    }}
                  >
                    Experience
                  </span>
                </div>

                {/* Frame 86 (Experience List) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "14px",
                    alignSelf: "stretch",
                  }}
                >
                  {/* Item 1: INVT.RSVP */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2026
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      INVT.RSVP — UI/UX Designer
                    </span>
                  </div>

                  {/* Item 2: UC DAAP */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2025
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      University of Cincinnati DAAP — Graphic Designer
                    </span>
                  </div>

                  {/* Item 3: Livewell Collaborative */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2025
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      The Livewell Collaborative — UX Researcher
                    </span>
                  </div>

                  {/* Item 4: UC Graduate College */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2025
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      University of Cincinnati Graduate College — Graphic Designer
                    </span>
                  </div>

                  {/* Item 5: Bluelearn */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2023
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      Bluelearn.in — Visual Designer
                    </span>
                  </div>
                </div>
              </div>

              {/* Education Section */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "20px",
                  alignSelf: "stretch",
                }}
              >
                {/* Frame 79 (Education Header) */}
                <div
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingBottom: "8px",
                    width: "100%",
                    borderBottom: "1px solid #000000",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: "20px",
                      lineHeight: "160%",
                      textTransform: "uppercase",
                      color: "#000000",
                    }}
                  >
                    Education
                  </span>
                </div>

                {/* Frame 87 (Education List) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "14px",
                    alignSelf: "stretch",
                  }}
                >
                  {/* Item 1: UC Master of Design */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2026
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      University of Cincinnati — Master of Design
                    </span>
                  </div>

                  {/* Item 2: Gujarat Technological University */}
                  <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>
                      2023
                    </span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>
                      Gujarat Technological University — Bachelor of Computer Engineering
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
