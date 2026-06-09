"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Day labels: Sun=0 … Sat=6
const DAY_LABELS = [
  { short: "S", full: "SUN" },
  { short: "M", full: "MON" },
  { short: "T", full: "TUE" },
  { short: "W", full: "WED" },
  { short: "TH", full: "THU" },
  { short: "F", full: "FRI" },
  { short: "S", full: "SAT" },
];

interface StickyNoteProps {
  /** Current scene scale (viewport px ÷ scene px) so drag deltas stay pixel-accurate */
  scaleRef: React.RefObject<number>;
  onDragActiveChange?: (active: boolean) => void;
}

export function StickyNote({ scaleRef, onDragActiveChange }: StickyNoteProps) {
  // ── Live clock ──────────────────────────────────────────────────────────────
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayIdx = now?.getDay() ?? -1; // 0=Sun
  const dateStr = now
    ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : "── ──────── ────";
  const timeStr = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : "──:── ──";

  // ── Drag state (scene coordinates) ──────────────────────────────────────────
  const [pos, setPos] = useState({ x: 1215.31, y: 25.32 });
  const [tilt, setTilt] = useState(4.44); // degrees
  const dragging = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const hasMoved = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
      hasMoved.current = false;
      dragging.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPosX: pos.x,
        startPosY: pos.y,
      };
      onDragActiveChange?.(true);
    },
    [pos, onDragActiveChange]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const scale = scaleRef.current ?? 1;
    const dx = (e.clientX - dragging.current.startClientX) / scale;
    const dy = (e.clientY - dragging.current.startClientY) / scale;
    setPos({
      x: dragging.current.startPosX + dx,
      y: dragging.current.startPosY + dy,
    });
    // Pick a new random tilt only once per drag gesture (on first actual movement)
    if (!hasMoved.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      hasMoved.current = true;
      setTilt(parseFloat((Math.random() * 10 - 5).toFixed(2)));
    }
  }, [scaleRef]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
    hasMoved.current = false;
    onDragActiveChange?.(false);
  }, [onDragActiveChange]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      data-no-deck-drag
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: "183.95px",
        height: "183.95px",
        background: "#FFF8A4",
        borderRadius: "3.24613px",
        transform: `rotate(${tilt}deg)`,
        transformOrigin: "center center",
        transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        cursor: "grab",
        userSelect: "none",
        zIndex: 600,
        boxShadow: "2px 3px 12px 0px rgba(0,0,0,0.18)",
      }}
    >
      {/* Frame 15 — main inner container */}
      <div
        style={{
          position: "absolute",
          left: "15.5px",
          top: "13.51px",
          width: "154.73px",
          height: "159.66px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        {/* Frame 14 — top row: DATE label + day-of-week chips */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "154.73px",
            height: "13px",
          }}
        >
          {/* "DATE:" label */}
          <span
            style={{
              fontFamily: "'Atkinson Hyperlegible Mono', monospace",
              fontWeight: 700,
              fontSize: "6.49225px",
              lineHeight: "8px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#0051E7",
            }}
          >
            DATE:
          </span>

          {/* Day-of-week indicators */}
          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            {DAY_LABELS.map((d, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Atkinson Hyperlegible Mono', monospace",
                  fontWeight: 700,
                  fontSize: i === todayIdx ? "7px" : "6.49225px",
                  lineHeight: "13px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: i === todayIdx ? "#0051E7" : "#0051E780",
                  textDecoration: i === todayIdx ? "underline" : "none",
                }}
              >
                {d.short}
              </span>
            ))}
          </div>
        </div>

        {/* Date + time — handwritten centre block */}
        <div
          style={{
            width: "154.73px",
            fontFamily: "'Gochi Hand', cursive",
            fontWeight: 400,
            fontSize: "22px",
            lineHeight: "160%",
            textAlign: "center",
            color: "#000912",
            whiteSpace: "pre-line",
          }}
        >
          {dateStr}
          {"\n"}
          {timeStr}
        </div>

        {/* "KEY:" label — bottom */}
        <div
          style={{
            width: "154.73px",
            fontFamily: "'Atkinson Hyperlegible Mono', monospace",
            fontWeight: 700,
            fontSize: "6.49225px",
            lineHeight: "8px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#0051E7",
            alignSelf: "stretch",
          }}
        >
          KEY:
        </div>
      </div>
    </div>
  );
}
