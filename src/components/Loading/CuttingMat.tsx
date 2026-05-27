"use client";

import type { RefObject } from "react";

export const MAT_LEFT_VW = 10.8;
export const MAT_START_WIDTH_VW = 25.7;
export const MAT_FULL_WIDTH_VW = 78.3;
export const MAT_HEIGHT_VH = 82;
export const BACK_MAT_EXTRA_PX = 80;
export const BACK_MAT_OFFSET_X = 60;
export const BACK_MAT_OFFSET_Y = 15;

type CuttingMatProps = {
  frontClipRef: RefObject<HTMLDivElement | null>;
  backClipRef: RefObject<HTMLDivElement | null>;
};

export default function CuttingMat({ frontClipRef, backClipRef }: CuttingMatProps) {
  return (
    <>
      {/* Back mat */}
      <div
        ref={backClipRef}
        style={{
          position: "absolute",
          left: `calc(${MAT_LEFT_VW}vw + ${BACK_MAT_OFFSET_X}px)`,
          top: `calc(50% - ${MAT_HEIGHT_VH / 2}vh + ${BACK_MAT_OFFSET_Y}px)`,
          width: `calc(${MAT_START_WIDTH_VW}vw + ${BACK_MAT_EXTRA_PX}px)`,
          height: `${MAT_HEIGHT_VH}vh`,
          overflow: "hidden",
          borderRadius: "19px",
          transform: "rotate(-2deg)",
          filter: "brightness(0.92)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <img
          src="/cutting-mat.svg"
          alt=""
          draggable={false}
          style={{
            width: `${MAT_FULL_WIDTH_VW}vw`,
            height: "100%",
            objectFit: "cover",
            objectPosition: "left top",
            display: "block",
            userSelect: "none",
          }}
        />
      </div>

      {/* Front mat */}
      <div
        ref={frontClipRef}
        style={{
          position: "absolute",
          left: `${MAT_LEFT_VW}vw`,
          top: `calc(50% - ${MAT_HEIGHT_VH / 2}vh)`,
          width: `${MAT_START_WIDTH_VW}vw`,
          height: `${MAT_HEIGHT_VH}vh`,
          overflow: "hidden",
          borderRadius: "19px",
          transform: "rotate(-2deg)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <img
          src="/cutting-mat.svg"
          alt=""
          draggable={false}
          style={{
            width: `${MAT_FULL_WIDTH_VW}vw`,
            height: "100%",
            objectFit: "cover",
            objectPosition: "left top",
            display: "block",
            userSelect: "none",
          }}
        />
      </div>
    </>
  );
}
