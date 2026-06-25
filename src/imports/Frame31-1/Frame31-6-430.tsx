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

const COLS = 75;

export default function BookCover() {
  const [roleIndex, setRoleIndex] = useState(0);
  const roleRef = useRef<HTMLSpanElement>(null);

  // ASCII state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, targetX: -9999, targetY: -9999, active: false });
  
  // High-performance canvas data refs (bypasses React re-renders)
  const gridsRef = useRef<{
    rest: string[][];
    reveal: string[][];
    rows: number;
    cols: number;
  } | null>(null);
  const needsBaseRedrawRef = useRef(false);
  const [isASCIIReady, setIsASCIIReady] = useState(false); // only toggles once when ASCII starts

  // Role text rotation animation
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

  // Shared function to sample image/video and build character grids
  const sampleSource = (source: HTMLImageElement | HTMLVideoElement) => {
    const sampleCanvas = document.createElement("canvas");
    const sampleCtx = sampleCanvas.getContext("2d");
    if (!sampleCtx) return;

    const cols = COLS;
    const cellW = 558 / cols;
    const rows = Math.max(1, Math.round(763 / (cellW * 1.7)));

    sampleCanvas.width = cols;
    sampleCanvas.height = rows;

    const sw = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || source.width;
    const sh = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || source.height;
    const dw = cols;
    const dh = rows;

    if (!sw || !sh) return; // avoid drawing empty source

    const srcRatio = sw / sh;
    const dstRatio = 577 / 763;
    let cropW = sw;
    let cropH = sh;
    let cropX = 0;
    let cropY = 0;
    if (srcRatio > dstRatio) {
      cropW = sh * dstRatio;
      cropX = (sw - cropW) / 2;
    } else {
      cropH = sw / dstRatio;
      cropY = (sh - cropH) / 2;
    }

    // Crop out the left 19px spine crease before sampling
    const faceStartRatio = 19 / 577;
    const cropXOffset = cropX + cropW * faceStartRatio;
    const cropWAdjusted = cropW * (1 - faceStartRatio);
    
    sampleCtx.drawImage(source, cropXOffset, cropY, cropWAdjusted, cropH, 0, 0, dw, dh);

    const imageData = sampleCtx.getImageData(0, 0, cols, rows);
    const data = imageData.data;

    const grid: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 4;
        const a = data[i + 3];
        let b = 0;
        if (a < 8) {
          b = 1; // transparent -> treat as background
        } else {
          b = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        }
        row.push(b);
      }
      grid.push(row);
    }

    const RAMPS = {
      classic: ' .:-=+*#%@',
      blocks: ' ░▒▓█'
    };

    const rest: string[][] = grid.map(row =>
      row.map(b => {
        const idx = Math.min(RAMPS.blocks.length - 1, Math.max(0, Math.floor((1 - b) * (RAMPS.blocks.length - 1))));
        return RAMPS.blocks[idx];
      })
    );

    const reveal: string[][] = grid.map(row =>
      row.map(b => {
        const idx = Math.min(RAMPS.classic.length - 1, Math.max(0, Math.floor((1 - b) * (RAMPS.classic.length - 1))));
        return RAMPS.classic[idx];
      })
    );

    gridsRef.current = { rest, reveal, rows, cols };
    needsBaseRedrawRef.current = true;
    setIsASCIIReady(true);
  };

  // Sample about_cover.png or index.mp4 depending on video existence
  useEffect(() => {
    let videoEl: HTMLVideoElement | null = null;
    let videoTimer: NodeJS.Timeout | null = null;

    const setupImage = () => {
      const img = new Image();
      img.src = "/about_cover.png?v=4";
      img.onload = () => {
        sampleSource(img);
      };
    };

    const setupVideo = () => {
      videoEl = document.createElement("video");
      videoEl.src = "/api/ascii-video";
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.setAttribute("webkit-playsinline", "true");
      
      // Offscreen styles
      videoEl.style.position = "fixed";
      videoEl.style.top = "-9999px";
      videoEl.style.width = "2px";
      videoEl.style.height = "2px";
      videoEl.style.opacity = "0";
      videoEl.style.pointerEvents = "none";
      document.body.appendChild(videoEl);

      videoEl.onloadeddata = () => {
        if (!videoEl) return;
        sampleSource(videoEl);
        videoTimer = setInterval(() => {
          if (videoEl) sampleSource(videoEl);
        }, 80); // ~12fps keeps it smooth
        videoEl.play().catch(() => {});
      };

      videoEl.onerror = () => {
        // Fallback to image if video loading fails
        cleanupVideo();
        setupImage();
      };
    };

    const cleanupVideo = () => {
      if (videoTimer) {
        clearInterval(videoTimer);
        videoTimer = null;
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.remove();
        videoEl = null;
      }
    };

    // Check if the video exists via API Route
    fetch("/api/ascii-video", { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          setupVideo();
        } else {
          setupImage();
        }
      })
      .catch(() => {
        setupImage();
      });

    return () => {
      cleanupVideo();
    };
  }, []);

  // ASCII animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseCanvas = document.createElement("canvas");
    const baseCtx = baseCanvas.getContext("2d");
    if (!baseCtx) return;

    const width = 558;
    const height = 763;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    baseCanvas.width = width * dpr;
    baseCanvas.height = height * dpr;
    baseCtx.scale(dpr, dpr);

    let animId: number;
    const mouse = mouseRef.current;
    let revealStrength = 0;
    const radius = 150;

    interface FlickerCell {
      r: number;
      c: number;
      age: number;
      life: number;
    }
    let flickerCells: FlickerCell[] = [];

    const loop = () => {
      const grids = gridsRef.current;
      if (!grids) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const cellW = width / grids.cols;
      const cellH = height / grids.rows;
      const fontSize = cellH * 0.92;
      const fontStack = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

      // If grid has been updated (e.g. static loaded, or new video frame), redraw offscreen base canvas
      if (needsBaseRedrawRef.current) {
        baseCtx.clearRect(0, 0, width, height);
        baseCtx.font = `${fontSize}px ${fontStack}`;
        baseCtx.textAlign = 'center';
        baseCtx.textBaseline = 'middle';
        baseCtx.globalAlpha = 0.24;
        baseCtx.fillStyle = "#000000";

        for (let r = 0; r < grids.rows; r++) {
          for (let c = 0; c < grids.cols; c++) {
            const ch = grids.rest[r][c];
            if (ch === ' ' || !ch) continue;
            baseCtx.fillText(ch, (c + 0.5) * cellW, (r + 0.5) * cellH);
          }
        }
        baseCtx.globalAlpha = 1;
        needsBaseRedrawRef.current = false;
      }

      mouse.x += (mouse.targetX - mouse.x) * 0.18;
      mouse.y += (mouse.targetY - mouse.y) * 0.18;
      revealStrength += ((mouse.active ? 1 : 0) - revealStrength) * 0.12;

      ctx.clearRect(0, 0, width, height);

      // Draw base layer with breathing opacity
      const breathe = 0.85 + 0.15 * Math.sin(performance.now() / 2200);
      ctx.globalAlpha = breathe;
      ctx.drawImage(baseCanvas, 0, 0, width, height);
      ctx.globalAlpha = 1;

      // Ambient flicker loop
      if (grids.rest.length) {
        if (flickerCells.length < 14 && Math.random() < 0.12) {
          for (let attempt = 0; attempt < 6; attempt++) {
            const r = Math.floor(Math.random() * grids.rows);
            const c = Math.floor(Math.random() * grids.cols);
            if (grids.rest[r] && grids.rest[r][c] !== ' ') {
              flickerCells.push({ r, c, age: 0, life: 20 + Math.random() * 26 });
              break;
            }
          }
        }

        ctx.font = `${fontSize}px ${fontStack}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        flickerCells = flickerCells.filter(f => {
          f.age++;
          if (f.age >= f.life) return false;
          const progress = f.age / f.life;
          const t = Math.sin(progress * Math.PI) * 0.55;
          const ch = grids.rest[f.r] ? grids.rest[f.r][f.c] : null;
          if (ch && ch !== ' ') {
            const cx = (f.c + 0.5) * cellW;
            const cy = (f.r + 0.5) * cellH;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1 + 0.12 * t, 1 + 0.12 * t);
            ctx.globalAlpha = Math.min(1, 0.28 + t * 0.72);
            ctx.fillStyle = "#000000";
            ctx.fillText(ch, 0, 0);
            ctx.restore();
          }
          return true;
        });
      }

      // Draw the detailed reveal layer around mouse cursor
      if (revealStrength > 0.01 && grids.reveal.length) {
        const colRadius = Math.ceil(radius / cellW) + 1;
        const rowRadius = Math.ceil(radius / cellH) + 1;
        const centerCol = Math.floor(mouse.x / cellW);
        const centerRow = Math.floor(mouse.y / cellH);

        ctx.font = `${fontSize}px ${fontStack}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = Math.max(0, centerRow - rowRadius); r <= Math.min(grids.rows - 1, centerRow + rowRadius); r++) {
          for (let c = Math.max(0, centerCol - colRadius); c <= Math.min(grids.cols - 1, centerCol + colRadius); c++) {
            const ch = grids.reveal[r][c];
            if (ch === ' ' || !ch) continue;
            const cx = (c + 0.5) * cellW;
            const cy = (r + 0.5) * cellH;
            const dist = Math.hypot(cx - mouse.x, cy - mouse.y);
            if (dist >= radius) continue;
            const t = (1 - dist / radius) * revealStrength;
            if (t <= 0.02) continue;

            ctx.save();
            ctx.translate(cx, cy);
            const scale = 1 + 0.18 * t;
            ctx.scale(scale, scale);
            ctx.globalAlpha = Math.min(1, 0.35 + t * 0.85);
            ctx.fillStyle = "#000000";
            ctx.fillText(ch, 0, 0);
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isASCIIReady]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / 577;
    const scaleY = rect.height / 763;
    mouseRef.current.targetX = (e.clientX - rect.left) / scaleX - 19;
    mouseRef.current.targetY = (e.clientY - rect.top) / scaleY;
    mouseRef.current.active = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0];
    const scaleX = rect.width / 577;
    const scaleY = rect.height / 763;
    mouseRef.current.targetX = (t.clientX - rect.left) / scaleX - 19;
    mouseRef.current.targetY = (t.clientY - rect.top) / scaleY;
    mouseRef.current.active = true;
  };

  const handleTouchEnd = () => {
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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

      {/* Transparent ASCII Reveal canvas layer (shifted left: 19px to avoid bleeding onto spine) */}
      {isASCIIReady && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: "19px",
            top: 0,
            width: "558px",
            height: "763px",
            pointerEvents: "none",
          }}
        />
      )}

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
