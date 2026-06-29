"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const ROLES = [
  "Product Designer",
  "Design Engineer",
  "Visual Designer",
  "UX Researcher",
  "UI Designer",
];

const COLS = 93;

export default function BookCover({ isClosed = true }: { isClosed?: boolean }) {
  const [roleIndex, setRoleIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Scramble text state
  const [displayText, setDisplayText] = useState("Product Designer");
  const displayTextRef = useRef("Product Designer");
  const scrambleRequestRef = useRef<number | null>(null);

  // Generate random blob sectors and wobble phases on hover
  const blobSectorsRef = useRef<{ base: number; speed: number; phase: number }[]>([]);
  useEffect(() => {
    if (isHovered) {
      const sectors: { base: number; speed: number; phase: number }[] = [];
      const numSectors = 12;
      for (let i = 0; i < numSectors; i++) {
        sectors.push({
          base: 0.75 + Math.random() * 0.35,      // base scale: 0.75 to 1.10
          speed: 0.002 + Math.random() * 0.003,   // morph speed
          phase: Math.random() * Math.PI * 2,    // random phase
        });
      }
      blobSectorsRef.current = sectors;
    }
  }, [isHovered]);

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
      const start = Math.floor(Math.random() * 12);
      const end = start + Math.floor(Math.random() * 15) + 8;
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

  // Role text rotation animation (only on hover, resets to default on leave)
  useEffect(() => {
    if (!isHovered) {
      setRoleIndex(0);
      scrambleTo(ROLES[0]);
      return;
    }

    const interval = setInterval(() => {
      setRoleIndex((prev) => {
        const next = (prev + 1) % ROLES.length;
        scrambleTo(ROLES[next]);
        return next;
      });
    }, 2800);

    return () => {
      clearInterval(interval);
      if (scrambleRequestRef.current) {
        cancelAnimationFrame(scrambleRequestRef.current);
      }
    };
  }, [isHovered]);

  // Shared function to sample image/video and build character grids
  const sampleSource = (source: HTMLImageElement | HTMLVideoElement) => {
    const sampleCanvas = document.createElement("canvas");
    const sampleCtx = sampleCanvas.getContext("2d");
    if (!sampleCtx) return;

    const cols = COLS;
    const cellW = 577 / cols;
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

    sampleCtx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, dw, dh);

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
      blocks: ' ./*-+1743256980'
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
        videoEl.playbackRate = 0.75; // decrease video playback speed by 25%
        sampleSource(videoEl);
        videoTimer = setInterval(() => {
          if (videoEl) sampleSource(videoEl);
        }, 106); // decrease sampling rate by 25% (80ms -> 106ms)
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

    const width = 577; // flow to edge of book
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
    const radius = 100; // reduced spotlight size from 150 to 100

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

      // Draw base layer with breathing opacity (slowed down by 25%)
      const breathe = 0.85 + 0.15 * Math.sin(performance.now() / 2933);
      ctx.globalAlpha = breathe;
      ctx.drawImage(baseCanvas, 0, 0, width, height);
      ctx.globalAlpha = 1;

      // Ambient flicker loop (slowed down by 25%)
      if (grids.rest.length) {
        if (flickerCells.length < 14 && Math.random() < 0.09) {
          for (let attempt = 0; attempt < 6; attempt++) {
            const r = Math.floor(Math.random() * grids.rows);
            const c = Math.floor(Math.random() * grids.cols);
            if (grids.rest[r] && grids.rest[r][c] !== ' ') {
              flickerCells.push({ r, c, age: 0, life: 27 + Math.random() * 35 });
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

      // Draw the detailed reveal layer around mouse cursor (random blob shapes)
      if (revealStrength > 0.01 && grids.reveal.length) {
        const colRadius = Math.ceil(radius / cellW) + 1;
        const rowRadius = Math.ceil(radius / cellH) + 1;
        const centerCol = Math.floor(mouse.x / cellW);
        const centerRow = Math.floor(mouse.y / cellH);

        const getBlobRadius = (angle: number, baseRadius: number) => {
          const sectors = blobSectorsRef.current;
          if (!sectors || sectors.length === 0) return baseRadius;
          
          let normalizedAngle = angle;
          if (normalizedAngle < 0) {
            normalizedAngle += Math.PI * 2;
          }
          
          const numSectors = sectors.length;
          const sectorFloat = (normalizedAngle / (Math.PI * 2)) * numSectors;
          const index1 = Math.floor(sectorFloat) % numSectors;
          const index2 = (index1 + 1) % numSectors;
          const tSector = sectorFloat - Math.floor(sectorFloat);
          
          const now = performance.now();
          const s1 = sectors[index1];
          const s2 = sectors[index2];
          
          // Calculate dynamic scale for each sector using dynamic sine waves
          const scale1 = s1.base + 0.14 * Math.sin(now * s1.speed + s1.phase);
          const scale2 = s2.base + 0.14 * Math.sin(now * s2.speed + s2.phase);
          
          const rScale = scale1 * (1 - tSector) + scale2 * tSector;
          return baseRadius * rScale;
        };

        ctx.font = `${fontSize}px ${fontStack}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = Math.max(0, centerRow - rowRadius); r <= Math.min(grids.rows - 1, centerRow + rowRadius); r++) {
          for (let c = Math.max(0, centerCol - colRadius); c <= Math.min(grids.cols - 1, centerCol + colRadius); c++) {
            const ch = grids.reveal[r][c];
            if (ch === ' ' || !ch) continue;
            const cx = (c + 0.5) * cellW;
            const cy = (r + 0.5) * cellH;
            const dx = cx - mouse.x;
            const dy = cy - mouse.y;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const currentRadius = getBlobRadius(angle, radius);
            if (dist >= currentRadius) continue;
            const t = (1 - dist / currentRadius) * revealStrength;
            if (t <= 0.02) continue;

            ctx.save();
            ctx.translate(cx, cy);
            const scale = 1 + 0.18 * t;
            ctx.scale(scale, scale);
            // Increased contrast: peak opacity increased to 0.72 instead of 0.6
            ctx.globalAlpha = Math.min(0.72, 0.24 + t * 0.48);
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

  // Reset hover state when book is opened
  useEffect(() => {
    if (!isClosed) {
      mouseRef.current.active = false;
      setIsHovered(false);
    }
  }, [isClosed]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isClosed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / 577;
    const scaleY = rect.height / 763;
    mouseRef.current.targetX = (e.clientX - rect.left) / scaleX;
    mouseRef.current.targetY = (e.clientY - rect.top) / scaleY;
    mouseRef.current.active = true;
    if (!isHovered) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
    setIsHovered(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = e.touches[0];
    const scaleX = rect.width / 577;
    const scaleY = rect.height / 763;
    mouseRef.current.targetX = (t.clientX - rect.left) / scaleX;
    mouseRef.current.targetY = (t.clientY - rect.top) / scaleY;
    mouseRef.current.active = true;
    if (!isHovered) setIsHovered(true);
  };

  const handleTouchEnd = () => {
    mouseRef.current.active = false;
    setIsHovered(false);
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

      {/* Transparent ASCII Reveal canvas layer (flowing to edge of book) */}
      {isASCIIReady && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "577px",
            height: "763px",
            pointerEvents: "none",
          }}
        />
      )}

      {/* White bottom panel — Frame 68 */}
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
          padding: "15px 16px",
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
            width: 545,
            height: 64,
            flex: "none",
            order: 0,
            alignSelf: "stretch",
            flexGrow: 0,
          }}
        >
          {/* Hello! I’m Dvija */}
          <span
            style={{
              width: 274,
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
              paddingLeft: "10px",
              boxSizing: "border-box",
            }}
          >
            Hello! I&rsquo;m Dvija
          </span>

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
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              color: "#000000",
              flex: "none",
              order: 1,
              flexGrow: 1,
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
            width: 545,
            height: 104,
            flex: "none",
            order: 1,
            alignSelf: "stretch",
            flexGrow: 0,
          }}
        >
          {/* Product Designer / Role Animation */}
          <span
            style={{
              width: 537,
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
