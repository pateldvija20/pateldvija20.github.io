"use client";

import { useEffect, useRef, useState } from "react";

const ROLES = [
  "Product Designer",
  "Design Engineer",
  "Visual Designer",
  "UX Researcher",
  "UI/UX Designer",
];

export default function BookCover({ isClosed = true }: { isClosed?: boolean }) {
  const [roleIndex, setRoleIndex] = useState(0);
  const [isRoleTitleHovered, setIsRoleTitleHovered] = useState(false);

  // Scramble text state
  const [displayText, setDisplayText] = useState(ROLES[0]);
  const displayTextRef = useRef(ROLES[0]);
  const scrambleRequestRef = useRef<number | null>(null);

  // Helper to trigger scramble transition to a target word
  const scrambleTo = (target: string) => {
    const chars = "!<>-_\\/[]{}—=+*^?#________";
    let frame = 0;
    const queue: Array<{
      from: string;
      to: string;
      start: number;
      end: number;
      char?: string;
    }> = [];

    const current = displayTextRef.current;
    const length = Math.max(current.length, target.length);

    for (let i = 0; i < length; i++) {
      const from = current[i] || "";
      const to = target[i] || "";
      const start = Math.floor(Math.random() * 5);
      const end = start + Math.floor(Math.random() * 6) + 6;
      queue.push({ from, to, start, end });
    }

    if (scrambleRequestRef.current) {
      cancelAnimationFrame(scrambleRequestRef.current);
    }

    const update = () => {
      let output = "";
      let complete = 0;
      for (let i = 0; i < queue.length; i++) {
        let { from, to, start, end, char } = queue[i];
        if (frame >= end) {
          complete++;
          output += to;
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = chars[Math.floor(Math.random() * chars.length)];
            queue[i].char = char;
          }
          output += char;
        } else {
          output += from;
        }
      }

      setDisplayText(output);
      displayTextRef.current = output;

      if (complete === queue.length) {
        scrambleRequestRef.current = null;
      } else {
        frame++;
        scrambleRequestRef.current = requestAnimationFrame(update);
      }
    };

    update();
  };

  // Role text rotation animation (only on role title hover)
  useEffect(() => {
    if (!isRoleTitleHovered) return;

    const advance = () => {
      setRoleIndex((prev) => {
        const next = (prev + 1) % ROLES.length;
        scrambleTo(ROLES[next]);
        return next;
      });
    };

    advance();
    const interval = setInterval(advance, 2800);

    return () => {
      clearInterval(interval);
    };
  }, [isRoleTitleHovered]);

  // Reset hover state when book is opened
  useEffect(() => {
    if (!isClosed) {
      setIsRoleTitleHovered(false);
    }
  }, [isClosed]);

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

      {/* White bottom panel — Frame 73 */}
      <div
        style={{
          position: "absolute",
          width: 577,
          height: 345,
          left: 0,
          top: 418,
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "15px 16px 15px 40px",
          boxSizing: "border-box",
        }}
      >
        {/* Frame 70 */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0px",
            gap: "60px",
            width: 521,
            height: 64,
            flex: "none",
            order: 0,
            alignSelf: "stretch",
            flexGrow: 0,
          }}
        >
          {/* Hello! I’m Dvija ✨ */}
          <span
            style={{
              width: 325,
              height: 64,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: "40px",
              lineHeight: "160%",
              color: "#000000",
              flex: "none",
              order: 0,
              flexGrow: 0,
            }}
          >
            Hello! I&rsquo;m Dvija ✨
          </span>
        </div>

        {/* Frame 88 */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0px",
            gap: "10px",
            width: 521,
            height: 42,
            flex: "none",
            order: 1,
            alignSelf: "stretch",
            flexGrow: 0,
          }}
        >
          {/* 3+ Year of Design Experience... */}
          <span
            style={{
              width: 211,
              height: 42,
              fontFamily: "'Atkinson Hyperlegible Mono', monospace",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: "12px",
              lineHeight: "120%",
              letterSpacing: "0em",
              textTransform: "uppercase",
              color: "#000000",
              flex: "none",
              order: 0,
              flexGrow: 0,
            }}
          >
            3+ Year of Design Experience specializing in UX and visual design
          </span>
        </div>

        {/* Frame 71 */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0px",
            gap: "10.13px",
            width: 521,
            height: 104,
            flex: "none",
            order: 2,
            alignSelf: "stretch",
            flexGrow: 0,
          }}
        >
          {/* Product Designer / Role Animation */}
          <span
            onMouseEnter={() => setIsRoleTitleHovered(true)}
            onMouseLeave={() => setIsRoleTitleHovered(false)}
            style={{
              // Was a hardcoded 537px — wider than this span's own 521px-wide
              // flex parent (Frame71 above), so longer role words ("Product
              // Designer", "Design Engineer") silently overflowed the cover's
              // own edge and got clipped. 100% matches the parent exactly.
              width: "100%",
              height: 104,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontStyle: "normal",
              fontWeight: 500,
              fontSize: "64.8453px",
              lineHeight: "160%",
              color: "#000000",
              flex: "none",
              order: 0,
              flexGrow: 0,
              overflow: "hidden",
              display: "block",
              textAlign: "right",
              cursor: "default",
            }}
          >
            <span
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
              }}
            >
              {displayText}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
