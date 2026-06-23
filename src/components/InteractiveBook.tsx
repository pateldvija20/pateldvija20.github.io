"use client";

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import BookCover from "../imports/Frame31-1/Frame31-6-430";

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
  const creaseRef = useRef<HTMLDivElement>(null);
  const rightCoverBackingRef = useRef<HTMLDivElement>(null);
  const spineHingeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const cover = coverWrapperRef.current;
    const leftPage = leftPageRef.current;
    const rightPage = rightPageRef.current;
    const pagesStack = pagesStackRef.current;
    const crease = creaseRef.current;
    const rightBacking = rightCoverBackingRef.current;
    const spineHinge = spineHingeRef.current;

    if (!cover) return;

    if (state === "closed") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, crease, rightBacking, spineHinge]);
      // Center the card when closed (shift left by half card width)
      if (container) {
        gsap.to(container, {
          x: -288.5,
          duration: 0.6,
          ease: "power2.out",
        });
      }
      // Return cover to resting angle
      gsap.to(cover, {
        rotateY: -20,
        x: -22,
        duration: 0.6,
        ease: "power2.out",
      });
      // Hide open pages, crease, backings
      if (leftPage) gsap.to(leftPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (rightPage) gsap.to(rightPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (crease) gsap.to(crease, { opacity: 0, duration: 0.3 });
      if (rightBacking) gsap.to(rightBacking, { opacity: 0, duration: 0.3 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 0, duration: 0.3 });
      // Fade stack back in
      if (pagesStack) gsap.to(pagesStack, { opacity: 1, duration: 0.4 });
    } else if (state === "hover") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, crease, rightBacking, spineHinge]);
      // Keep card centered
      if (container) {
        gsap.to(container, {
          x: -288.5,
          duration: 0.6,
          ease: "power2.out",
        });
      }
      // Swing cover slightly more open
      gsap.to(cover, {
        rotateY: -38,
        x: -28,
        duration: 0.6,
        ease: "power2.out",
      });
      if (leftPage) gsap.to(leftPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (rightPage) gsap.to(rightPage, { opacity: 0, scaleX: 0, pointerEvents: "none", duration: 0.3 });
      if (crease) gsap.to(crease, { opacity: 0, duration: 0.3 });
      if (rightBacking) gsap.to(rightBacking, { opacity: 0, duration: 0.3 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 0, duration: 0.3 });
      if (pagesStack) gsap.to(pagesStack, { opacity: 1, duration: 0.4 });
    } else if (state === "open") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, crease, rightBacking, spineHinge]);
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
      if (crease) gsap.to(crease, { opacity: 1, duration: 0.5, delay: 0.45 });
    }
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
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Red Back Cover Sheet */}
        <div
          className="absolute shadow-[rgba(0,0,0,0.25)_1px_0px_5px_0px]"
          style={{
            left: 577,
            top: 4,
            width: 574,
            height: 754,
            backgroundColor: "rgb(209, 82, 73)",
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
          backgroundColor: "rgb(209, 82, 73)",
          borderRadius: "4px 40px 40px 4px",
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
          backgroundColor: "#440011", // Maroon-brown matching cover spine
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.3), inset 1px 0 3px rgba(0,0,0,0.3)",
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
          transform: "rotateY(-20deg) translateX(-22px)",
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
          }}
        >
          {/* Cover SVG Graphic */}
          <BookCover />

          {/* Crease Shader Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "rgba(255, 255, 255, 0.5) -2px 0px 2px 0px inset",
              borderRadius: "4px 40px 40px 4px",
            }}
          />

          {/* Crease Ridge Overlay */}
          <div
            className="absolute inset-0 pointer-events-none flex"
            style={{
              boxShadow:
                "rgba(0, 0, 0, 0.16) 0.301094px 0.602187px 1.21188px -0.5px, rgba(0, 0, 0, 0.196) 1.14427px 2.28853px 4.60558px -1px, rgba(0, 0, 0, 0.35) 5px 10px 20.1246px -1.5px",
              borderRadius: "4px 40px 40px 4px",
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
            backgroundColor: "rgb(209, 82, 73)",
            borderRadius: "40px 4px 4px 40px",
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

      {/* Left Page (About Text + Graphic) */}
      <div
        ref={leftPageRef}
        className="absolute flex flex-col justify-between"
        style={{
          left: 10,
          top: 10,
          width: cardW - 20,
          height: cardH - 20,
          background: isDark
            ? "linear-gradient(to right, #1f2023 0%, #17181a 86%, #0d0d0e 100%)"
            : "linear-gradient(to right, #fdfbfa 0%, #f6f3eb 86%, #d3cebf 100%)",
          color: isDark ? "#e2e8f0" : "#000912",
          borderRadius: "16px 4px 4px 16px",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: isDark
            ? "0 8px 24px rgba(0,0,0,0.5)"
            : "-8px 10px 24px rgba(0,0,0,0.16), -2px 2px 6px rgba(0,0,0,0.06)",
          padding: "48px 40px 40px 54px",
          opacity: 0,
          transformOrigin: "right center",
          transform: "scaleX(0)",
          pointerEvents: "none",
          zIndex: 30,
        }}
      >
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-[10px] tracking-[0.2em] font-mono uppercase opacity-55">
              Biography
            </span>
            <h2 className="text-[36px] font-bold leading-tight font-serif mt-1">
              About Me
            </h2>
            <div className="w-12 h-[2px] bg-red-500/60 mt-3" />
          </div>

          <div className="flex flex-col gap-4 font-sans text-[14px] leading-relaxed opacity-85 max-w-[420px]">
            <p>
              Hi, I’m <strong>Aum</strong>, a Design Engineer dedicated to crafting
              digital environments that nurture human life and connection.
            </p>
            <p>
              I explore the intersection of design, UI engineering, and product psychology
              to build high-fidelity interactive experiences.
            </p>
            <p>
              Bridging design systems and frontend code, my mission is to make websites
              feel organic, tactile, and responsive.
            </p>
          </div>
        </div>

        {/* Vintage sketch illustration loaded from public */}
        <div
          className="relative overflow-hidden border border-black/5 rounded-lg max-w-[340px]"
          style={{
            aspectRatio: "1.4",
            backgroundColor: isDark ? "#282a2d" : "#faf6f0",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.03)",
          }}
        >
          <img
            src="/about_me_illustration.png"
            alt="Design Engineer sketching at desk"
            className="w-full h-full object-cover filter mix-blend-multiply opacity-90 contrast-[1.05]"
            style={{
              filter: isDark ? "invert(0.9) hue-rotate(180deg)" : "none",
            }}
          />
        </div>
      </div>

      {/* Right Page (Skills & Close Bookmark Ribbon) */}
      <div
        ref={rightPageRef}
        className="absolute flex flex-col justify-between"
        style={{
          left: 577 + 10,
          top: 10,
          width: cardW - 20,
          height: cardH - 20,
          background: isDark
            ? "linear-gradient(to left, #1f2023 0%, #17181a 86%, #0d0d0e 100%)"
            : "linear-gradient(to left, #fdfbfa 0%, #f6f3eb 86%, #d3cebf 100%)",
          color: isDark ? "#e2e8f0" : "#000912",
          borderRadius: "4px 16px 16px 4px",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: isDark
            ? "0 8px 24px rgba(0,0,0,0.5)"
            : "8px 10px 24px rgba(0,0,0,0.16), 2px 2px 6px rgba(0,0,0,0.06)",
          padding: "48px 54px 40px 40px",
          opacity: 0,
          transformOrigin: "left center",
          transform: "scaleX(0)",
          pointerEvents: "none",
          zIndex: 30,
        }}
      >
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-[10px] tracking-[0.2em] font-mono uppercase opacity-55">
              Tools & Stack
            </span>
            <h2 className="text-[36px] font-bold leading-tight font-serif mt-1">
              Core Expertise
            </h2>
            <div className="w-12 h-[2px] bg-red-500/60 mt-3" />
          </div>

          <div className="flex flex-col gap-5">
            {/* Frontend */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[12px] font-mono uppercase tracking-wider text-red-500/80 font-bold">
                Frontend Engineering
              </h4>
              <div className="flex flex-wrap gap-2">
                {["Next.js", "React", "TypeScript", "TailwindCSS", "HTML5/CSS3"].map(
                  (skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-[12px] font-mono border border-black/10 rounded bg-black/[0.02]"
                      style={{
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Motion & Interaction */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[12px] font-mono uppercase tracking-wider text-red-500/80 font-bold">
                Motion & Interaction
              </h4>
              <div className="flex flex-wrap gap-2">
                {["GSAP", "Three.js", "WebGL", "Framer Motion", "SVG Animation"].map(
                  (skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-[12px] font-mono border border-black/10 rounded bg-black/[0.02]"
                      style={{
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Design & Research */}
            <div className="flex flex-col gap-2">
              <h4 className="text-[12px] font-mono uppercase tracking-wider text-red-500/80 font-bold">
                Design & Architecture
              </h4>
              <div className="flex flex-wrap gap-2">
                {["Figma", "UI/UX Architecture", "Design Systems", "Prototyping"].map(
                  (skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 text-[12px] font-mono border border-black/10 rounded bg-black/[0.02]"
                      style={{
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      }}
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Philosophy Quote + Close Ribbon Button */}
        <div className="flex items-end justify-between border-t border-black/5 pt-5">
          <div className="max-w-[280px]">
            <p className="italic text-[13px] opacity-60 font-serif leading-normal">
              "Simplicity is about subtracting the obvious and adding the meaningful."
            </p>
          </div>

          {/* Vintage style ribbon bookmark for close action */}
          {onToggleOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleOpen();
              }}
              className="group relative cursor-pointer outline-none border-none p-0 flex flex-col items-center"
              style={{ height: 90, width: 36, backgroundColor: "transparent" }}
              aria-label="Close Book"
            >
              {/* Ribbon Body */}
              <div
                className="w-7 bg-red-600/90 shadow-md group-hover:h-[62px] transition-all duration-300 relative"
                style={{ height: 55 }}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-mono font-bold tracking-widest rotate-90 select-none uppercase opacity-85"
                  style={{ top: -5 }}
                >
                  Close
                </span>
                {/* Triangular Ribbon Cut at Bottom */}
                <div
                  className="absolute left-0 bottom-[-10px] w-0 h-0 border-l-[14px] border-l-red-600/90 border-r-[14px] border-r-red-600/90 border-b-[10px] border-b-transparent"
                />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Crease shadow vertical gutter in the middle */}
      <div
        ref={creaseRef}
        className="absolute pointer-events-none"
        style={{
          left: 577 - 20,
          top: 10,
          width: 40,
          height: cardH - 20,
          background: isDark
            ? "linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.2) 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.7))"
            : "linear-gradient(to right, rgba(0,0,0,0.24), rgba(0,0,0,0.06) 30%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.24))",
          opacity: 0,
          zIndex: 40,
        }}
      />
    </div>
  );
}
