"use client";
/**
 * LiquidGlassWrapper
 * Applies the liquid-glass-react SVG displacement filter + backdrop blur + border
 * glow directly around its children. Unlike the original LiquidGlass component
 * this variant does NOT reposition or center its children — it wraps in-place.
 *
 * Source adapted from https://github.com/rdev/liquid-glass-react
 */

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { ShaderDisplacementGenerator, fragmentShaders } from "./shader-utils";
import { displacementMap } from "./utils";

const generateShaderMap = (w: number, h: number) => {
  const gen = new ShaderDisplacementGenerator({ width: w, height: h, fragment: fragmentShaders.liquidGlass });
  const url = gen.updateShader();
  gen.destroy();
  return url;
};

interface LiquidGlassWrapperProps {
  children: React.ReactNode;
  /** Border-radius in px — should match the child component's corners */
  cornerRadius?: number;
  /** How strong the edge lens distortion is (default 35) */
  displacementScale?: number;
  /** Chromatic aberration amount (default 2) */
  aberrationIntensity?: number;
  /** Extra backdrop blur in px added on top of the base 4 px (default 0) */
  blurAmount?: number;
  /** Backdrop saturation % (default 160) */
  saturation?: number;
  className?: string;
  style?: CSSProperties;
}

export function LiquidGlassWrapper({
  children,
  cornerRadius = 12,
  displacementScale = 35,
  aberrationIntensity = 2,
  blurAmount = 0,
  saturation = 160,
  className = "",
  style,
}: LiquidGlassWrapperProps) {
  const filterId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 612, height: 792 });
  const [shaderUrl, setShaderUrl] = useState<string>("");
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Measure the rendered size so the SVG filter covers exactly the right area
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Generate the shader displacement map once we know the size
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      setShaderUrl(generateShaderMap(size.width, size.height));
    }
  }, [size.width, size.height]);

  // Subtle mouse-tracking for the border shimmer
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMouseOffset({
        x: ((e.clientX - (rect.left + rect.width / 2)) / rect.width) * 100,
        y: ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * 100,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const mapHref = shaderUrl || displacementMap;
  const scale = displacementScale;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", display: "inline-block", ...style }}
    >
      {/* ── SVG displacement filter ─────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: size.width, height: size.height, pointerEvents: "none", top: 0, left: 0, zIndex: 1 }}
      >
        <defs>
          <radialGradient id={`${filterId}-edge-mask`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop offset={`${Math.max(30, 80 - aberrationIntensity * 2)}%`} stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </radialGradient>

          <filter id={filterId} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
            <feImage x="0" y="0" width="100%" height="100%" result="MAP" href={mapHref} preserveAspectRatio="xMidYMid slice" />

            {/* Edge intensity mask */}
            <feColorMatrix in="MAP" type="matrix"
              values="0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0.3 0.3 0.3 0 0  0 0 0 1 0"
              result="EDGE_INT" />
            <feComponentTransfer in="EDGE_INT" result="EDGE_MASK">
              <feFuncA type="discrete" tableValues={`0 ${aberrationIntensity * 0.05} 1`} />
            </feComponentTransfer>

            {/* Centre (undisplaced) */}
            <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER" />

            {/* R channel displaced */}
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-scale} xChannelSelector="R" yChannelSelector="B" result="RED_D" />
            <feColorMatrix in="RED_D" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="RED_C" />

            {/* G channel */}
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-scale - aberrationIntensity * 0.05} xChannelSelector="R" yChannelSelector="B" result="GREEN_D" />
            <feColorMatrix in="GREEN_D" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="GREEN_C" />

            {/* B channel */}
            <feDisplacementMap in="SourceGraphic" in2="MAP" scale={-scale - aberrationIntensity * 0.1} xChannelSelector="R" yChannelSelector="B" result="BLUE_D" />
            <feColorMatrix in="BLUE_D" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="BLUE_C" />

            <feBlend in="GREEN_C" in2="BLUE_C" mode="screen" result="GB" />
            <feBlend in="RED_C" in2="GB" mode="screen" result="RGB" />
            <feGaussianBlur in="RGB" stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)} result="ABERRATED" />

            {/* Apply to edges only */}
            <feComposite in="ABERRATED" in2="EDGE_MASK" operator="in" result="EDGE_AB" />
            <feComponentTransfer in="EDGE_MASK" result="INV_MASK">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feComposite in="CENTER" in2="INV_MASK" operator="in" result="CENTER_CLEAN" />
            <feComposite in="EDGE_AB" in2="CENTER_CLEAN" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* ── Glass backdrop (sits over the children, below border layers) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: `${cornerRadius}px`,
          backdropFilter: `blur(${4 + blurAmount}px) saturate(${saturation}%)`,
          filter: `url(#${filterId})`,
          zIndex: 2,
          pointerEvents: "none",
        } as CSSProperties}
      />

      {/* ── Children (sharp, on top of glass backdrop) ─────────────────── */}
      <div style={{ position: "relative", zIndex: 3 }}>
        {children}
      </div>

      {/* ── Border shimmer layer 1 (screen) ────────────────────────────── */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: `${cornerRadius}px`,
          pointerEvents: "none",
          zIndex: 4,
          mixBlendMode: "screen",
          opacity: 0.22,
          padding: "1.5px",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          boxShadow: "0 0 0 0.5px rgba(255,255,255,0.5) inset, 0 1px 3px rgba(255,255,255,0.25) inset",
          background: `linear-gradient(
            ${135 + mouseOffset.x * 1.2}deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,${0.12 + Math.abs(mouseOffset.x) * 0.008}) ${Math.max(10, 33 + mouseOffset.y * 0.3)}%,
            rgba(255,255,255,${0.4 + Math.abs(mouseOffset.x) * 0.012}) ${Math.min(90, 66 + mouseOffset.y * 0.4)}%,
            rgba(255,255,255,0) 100%
          )`,
        } as CSSProperties}
      />

      {/* ── Border shimmer layer 2 (overlay) ───────────────────────────── */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: `${cornerRadius}px`,
          pointerEvents: "none",
          zIndex: 4,
          mixBlendMode: "overlay",
          padding: "1.5px",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          boxShadow: "0 0 0 0.5px rgba(255,255,255,0.5) inset, 0 1px 3px rgba(255,255,255,0.25) inset, 0 1px 4px rgba(0,0,0,0.35)",
          background: `linear-gradient(
            ${135 + mouseOffset.x * 1.2}deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,${0.32 + Math.abs(mouseOffset.x) * 0.008}) ${Math.max(10, 33 + mouseOffset.y * 0.3)}%,
            rgba(255,255,255,${0.6 + Math.abs(mouseOffset.x) * 0.012}) ${Math.min(90, 66 + mouseOffset.y * 0.4)}%,
            rgba(255,255,255,0) 100%
          )`,
        } as CSSProperties}
      />
    </div>
  );
}
