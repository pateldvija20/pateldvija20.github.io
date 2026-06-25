"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const ROLES = [
  "Design Engineer",
  "Product Designer",
  "Visual Designer",
  "UX Researcher",
  "UI Designer",
];

export default function BookCover() {
  const [roleIndex, setRoleIndex] = useState(0);
  const roleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const el = roleRef.current;
      if (!el) return;
      gsap.to(el, {
        opacity: 0,
        y: -12,
        duration: 0.3,
        ease: "power1.inOut",
        onComplete: () => {
          setRoleIndex((prev) => (prev + 1) % ROLES.length);
          gsap.fromTo(
            el,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.3, ease: "power1.out" }
          );
        },
      });
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: 577,
        height: 763,
        borderRadius: "16px 40px 40px 16px",
        overflow: "hidden",
        display: "block",
        flexShrink: 0,
      }}
    >
      {/* Full cover PNG as background (gradient + portrait) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "url(/about_cover.png?v=4) no-repeat center/cover",
        }}
      />

      {/* White bottom panel — exact user-provided structure */}
      <div
        style={{
          position: "absolute",
          width: 577,
          height: 447,
          left: 0,
          top: 316,
          background: "rgb(255, 255, 255)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "15px 16px",
        }}
      >
        {/* Frame 70: Top row — Hello + Location */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 0,
            gap: 10,
            width: 545,
            height: 64,
            flex: "0 0 auto",
            order: 0,
            alignSelf: "stretch",
          }}
        >
          <span
            style={{
              width: 274,
              height: 64,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: 35,
              lineHeight: "160%",
              color: "rgb(0, 0, 0)",
              flex: "0 0 auto",
              order: 0,
              padding: "0 0 0 20px",
            }}
          >
            Hello! I&rsquo;m Dvija
          </span>
        </div>

        {/* Role text — direct child of outer container */}
        <span
          style={{
            width: 333,
            height: 64,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontStyle: "normal",
            fontWeight: 500,
            fontSize: 35,
            lineHeight: "160%",
            color: "rgb(0, 0, 0)",
            flex: "0 0 auto",
            order: 0,
            overflow: "hidden",
            paddingLeft: 0,
            alignSelf: "flex-end",
            textAlign: "right",
          }}
        >
          <span
            ref={roleRef}
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
            }}
          >
            {ROLES[roleIndex]}
          </span>
        </span>

        {/* Frame 71: Bottom row — Experience text */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            padding: "0 0 0 20px",
            gap: 10,
            width: 545,
            height: 64,
            flex: "0 0 auto",
            order: 1,
            alignSelf: "stretch",
          }}
        >
          <span
            style={{
              width: 304,
              height: 34,
              fontFamily: "'Atkinson Hyperlegible Mono', monospace",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: 14,
              lineHeight: "120%",
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: "rgb(0, 0, 0)",
              flex: "0 0 auto",
              order: 2,
            }}
          >
            3+ Year of Design Experience specializing in UX and visual design
          </span>
        </div>
      </div>
    </div>
  );
}
