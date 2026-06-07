"use client";

import { type CSSProperties, useEffect, useId, useState } from "react";
import { ShaderDisplacementGenerator, fragmentShaders } from "./shader-utils";
import { displacementMap } from "./utils";

const W = 913;
const H = 987;

const generateShaderMap = (w: number, h: number) => {
  const gen = new ShaderDisplacementGenerator({ width: w, height: h, fragment: fragmentShaders.liquidGlass });
  const url = gen.updateShader();
  gen.destroy();
  return url;
};

interface PurpleFileCardProps {
  displacementScale?: number;
  aberrationIntensity?: number;
  blurAmount?: number;
  className?: string;
  style?: CSSProperties;
}

export function PurpleFileCard({
  displacementScale = 25,
  aberrationIntensity = 2,
  blurAmount = 0,
  className = "",
  style,
}: PurpleFileCardProps) {
  const rawId = useId();
  const filterId = rawId.replace(/:/g, "f");
  const [shaderUrl, setShaderUrl] = useState("");

  useEffect(() => {
    setShaderUrl(generateShaderMap(W, H));
  }, []);

  const mapHref = shaderUrl || displacementMap;
  const scale = displacementScale;

  return (
    <div
      className={className}
      style={{ position: "relative", width: W, height: H, ...style }}
    >
      {/* ── Displacement filter definition ───────────────────────────────── */}
      <svg
        aria-hidden
        style={{ position: "absolute", width: W, height: H, top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
      >
        <defs>
          <filter id={filterId} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            <feImage x="0" y="0" width="100%" height="100%" result="MAP" href={mapHref} preserveAspectRatio="xMidYMid slice" />
            <feColorMatrix in="MAP" type="matrix"
              values="0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0 0 0 1 0"
              result="EDGE_INT" />
            <feComponentTransfer in="EDGE_INT" result="EDGE_MASK">
              <feFuncA type="discrete" tableValues={`0 ${aberrationIntensity * 0.05} 1`} />
            </feComponentTransfer>
            <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER" />
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-scale} xChannelSelector="R" yChannelSelector="B" result="RED_D" />
            <feColorMatrix in="RED_D" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="RED_C" />
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-scale - aberrationIntensity * 0.05} xChannelSelector="R" yChannelSelector="B" result="GREEN_D" />
            <feColorMatrix in="GREEN_D" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="GREEN_C" />
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-scale - aberrationIntensity * 0.1} xChannelSelector="R" yChannelSelector="B" result="BLUE_D" />
            <feColorMatrix in="BLUE_D" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="BLUE_C" />
            <feBlend in="GREEN_C" in2="BLUE_C" mode="screen" result="GB" />
            <feBlend in="RED_C" in2="GB" mode="screen" result="RGB" />
            <feGaussianBlur in="RGB" stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)} result="ABERRATED" />
            <feComposite in="ABERRATED" in2="EDGE_MASK" operator="in" result="EDGE_AB" />
            <feComponentTransfer in="EDGE_MASK" result="INV_MASK">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feComposite in="CENTER" in2="INV_MASK" operator="in" result="CENTER_CLEAN" />
            <feComposite in="EDGE_AB" in2="CENTER_CLEAN" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* ── BACK COVER ───────────────────────────────────────────────────────
          rect y=287.549 w=612 h=792 rx=12 rotate(-28.0246 0 287.549)        */}
      <div
        style={{
          position: "absolute",
          top: 287.549,
          left: 0,
          width: 612,
          height: 792,
          borderRadius: 12,
          transformOrigin: "0% 0%",
          transform: "rotate(-28.0246deg)",
          backdropFilter: `blur(${8 + blurAmount}px) saturate(185%)`,
          filter: `url(#${filterId})`,
          background: "rgba(170, 126, 242, 0.18)",
          zIndex: 0,
        }}
      />

      {/* ── PAPER 3 — rotated -25.5928° (z=1) ───────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 279.451,
          left: 66.8395,
          width: 538.035,
          height: 726.011,
          borderRadius: 20,
          background: "#FDFEFF",
          boxShadow: "-3px 3px 12px rgba(0,0,0,0.16)",
          transformOrigin: "0% 0%",
          transform: "rotate(-25.5928deg)",
          zIndex: 1,
        }}
      />

      {/* ── PAPER 2 — rotated -30.059° (z=2) ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 314.505,
          left: 41.4548,
          width: 538.035,
          height: 726.011,
          borderRadius: 20,
          background: "#FDFEFF",
          boxShadow: "-3px 3px 12px rgba(0,0,0,0.16)",
          transformOrigin: "0% 0%",
          transform: "rotate(-30.059deg)",
          zIndex: 2,
        }}
      />

      {/* ── PAPER 1 — rotated -27.2364° (z=3) ───────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 283.938,
          left: 36.5801,
          width: 538.035,
          height: 726.011,
          borderRadius: 20,
          background: "#FDFEFF",
          boxShadow: "-3px 3px 12px rgba(0,0,0,0.16)",
          transformOrigin: "0% 0%",
          transform: "rotate(-27.2364deg)",
          zIndex: 3,
        }}
      />

      {/* ── FRONT COVER ──────────────────────────────────────────────────────
          Centered on SVG path centroid (507.68, 600.74), 612×564, rx:32/12  */}
      <div
        style={{
          position: "absolute",
          left: 201.68,
          top: 318.74,
          width: 612,
          height: 564,
          borderRadius: "32px 32px 12px 12px",
          transformOrigin: "50% 50%",
          transform: "rotate(-28.02deg)",
          backdropFilter: `blur(${12 + blurAmount}px) saturate(200%)`,
          filter: `url(#${filterId})`,
          background: "rgba(170, 126, 242, 0.22)",
          zIndex: 10,
        }}
      />
    </div>
  );
}
