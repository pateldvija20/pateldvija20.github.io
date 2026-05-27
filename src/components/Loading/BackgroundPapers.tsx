"use client";

export default function BackgroundPapers() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/paper-gray-blue.png"
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: 506,
          height: 723,
          transform: "translate(-50px, 180px)",
          userSelect: "none",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/paper-olive-green.png"
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 508,
          height: 725,
          transform: "translate(50px, -280px)",
          userSelect: "none",
        }}
      />
    </div>
  );
}
