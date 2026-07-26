"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import BookCover from "../imports/Frame31-1/Frame31-6-430";
import { useGlobalCursor, type HotzoneTestResult } from "./GlobalCursor";

const CORNER_SIZE = 120; // px in book-space

// ───────────────────────── turn.js corner-fold geometry ─────────────────────────
// A page is folded by reflecting its grabbed corner across a moving crease line.
// We compute, for animation progress t∈[0,1]:
//   • outgoingClip — clip-path keeping the part of the page that stays flat
//   • flapClip / flapMatrix — the lifted corner: the folded region, reflected
//     across the crease so it appears peeled up over the page
//   • flapShadow — a gradient that darkens the flap toward the crease

type Pt = { x: number; y: number };
type Corner = "tl" | "tr" | "bl" | "br";

// Clip a convex polygon by the half-plane { (X - M)·N >= 0 } (Sutherland–Hodgman).
function clipHalfPlane(poly: Pt[], M: Pt, N: Pt): Pt[] {
  const inside = (p: Pt) => (p.x - M.x) * N.x + (p.y - M.y) * N.y >= 0;
  const intersect = (a: Pt, b: Pt): Pt => {
    const da = (a.x - M.x) * N.x + (a.y - M.y) * N.y;
    const db = (b.x - M.x) * N.x + (b.y - M.y) * N.y;
    const s = da / (da - db);
    return { x: a.x + s * (b.x - a.x), y: a.y + s * (b.y - a.y) };
  };
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

function toClipPath(poly: Pt[]): string {
  if (poly.length < 3) return "polygon(0 0, 0 0, 0 0)"; // empty → invisible
  return `polygon(${poly.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(", ")})`;
}

function computeCornerFold(
  t: number,
  corner: Corner,
  W: number,
  H: number
): { outgoingClip: string; flapClip: string; flapMatrix: string; flapShadow: string } {
  const rect: Pt[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];

  // Grabbed corner S is one of the 4 page corners and travels across the spine
  // to P (mirrored horizontally), arcing perpendicular to the travel so the
  // crease is diagonal. Right-side corners (tr/br) peel toward the spine on the
  // left (next); left-side corners (tl/bl) peel toward the spine on the right.
  const onRight = corner === "tr" || corner === "br"; // grabbed edge x = W
  const onBottom = corner === "bl" || corner === "br"; // grabbed edge y = H
  const S: Pt = { x: onRight ? W : 0, y: onBottom ? H : 0 };
  const tt = Math.max(t, 0.0001);
  const lift = Math.sin(Math.PI * tt) * H * 0.33; // arc so the crease is diagonal
  const liftDir = onBottom ? -1 : 1; // bottom corners arc up, top corners arc down
  const P: Pt = {
    x: onRight ? W - tt * 2 * W : tt * 2 * W,
    y: S.y + liftDir * lift,
  };

  // Crease = perpendicular bisector of S→P. N points from the folded (S) side
  // toward the flat (P) side, so { (X-M)·N >= 0 } is the part that stays flat.
  const M: Pt = { x: (S.x + P.x) / 2, y: (S.y + P.y) / 2 };
  const N: Pt = { x: P.x - S.x, y: P.y - S.y };
  const nlen = Math.hypot(N.x, N.y);
  if (nlen < 0.5) {
    return { outgoingClip: toClipPath(rect), flapClip: "polygon(0 0, 0 0, 0 0)", flapMatrix: "none", flapShadow: "none" };
  }

  const outgoing = clipHalfPlane(rect, M, N);
  const footprint = clipHalfPlane(rect, M, { x: -N.x, y: -N.y }); // folded (S) side

  // Reflection of the footprint across the crease (line through M, normal n̂).
  const nx = N.x / nlen;
  const ny = N.y / nlen;
  const a = 1 - 2 * nx * nx;
  const b = -2 * nx * ny;
  const c = -2 * nx * ny;
  const d = 1 - 2 * ny * ny;
  const e = M.x - (a * M.x + c * M.y);
  const f = M.y - (b * M.x + d * M.y);

  // ashadow: darken the flap toward the crease. Gradient runs along N
  // (crease → corner), so the dark edge sits at the crease.
  const angleDeg = (Math.atan2(N.y, N.x) * 180) / Math.PI;
  const flapShadow = `linear-gradient(${angleDeg.toFixed(1)}deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0) 60%)`;

  return {
    outgoingClip: toClipPath(outgoing),
    flapClip: toClipPath(footprint),
    flapMatrix: `matrix(${a.toFixed(5)}, ${b.toFixed(5)}, ${c.toFixed(5)}, ${d.toFixed(5)}, ${e.toFixed(2)}, ${f.toFixed(2)})`,
    flapShadow,
  };
}

interface InteractiveBookProps {
  state?: "closed" | "hover" | "open";
  className?: string;
  onToggleOpen?: () => void;
}

export function InteractiveBook({
  state = "closed",
  className = "",
  onToggleOpen,
}: InteractiveBookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const polaroidRef = useRef<HTMLDivElement>(null);
  const coverWrapperRef = useRef<HTMLDivElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const pagesStackRef = useRef<HTMLDivElement>(null);
  const rightCoverBackingRef = useRef<HTMLDivElement>(null);
  const spineHingeRef = useRef<HTMLDivElement>(null);

  const words = ["meaningful", "bold", "intuitive", "empathetic", "functional"];
  const [wordIndex, setWordIndex] = useState(0);
  const rotatingWordRef = useRef<HTMLSpanElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSkillIndex, setExpandedSkillIndex] = useState<number | null>(null);

  // Draggable polaroid state
  const [polaroidPos, setPolaroidPos] = useState({ x: 100, y: 160 });
  const polaroidDragRef = useRef<{ dragging: boolean; startX: number; startY: number; originX: number; originY: number }>({
    dragging: false, startX: 0, startY: 0, originX: 100, originY: 160,
  });
  const onPolaroidMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    polaroidDragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, originX: polaroidPos.x, originY: polaroidPos.y };
    const POLAROID_W = 313.56;
    const POLAROID_H = 376.76;
    const PAGE_W = 567;
    const PAGE_H = 743;
    const onMove = (ev: MouseEvent) => {
      if (!polaroidDragRef.current.dragging) return;
      ev.stopPropagation();
      const rawX = polaroidDragRef.current.originX + (ev.clientX - polaroidDragRef.current.startX);
      const rawY = polaroidDragRef.current.originY + (ev.clientY - polaroidDragRef.current.startY);
      setPolaroidPos({
        x: Math.max(0, Math.min(rawX, PAGE_W - POLAROID_W)),
        y: Math.max(0, Math.min(rawY, PAGE_H - POLAROID_H)),
      });
    };
    const onUp = (ev: MouseEvent) => {
      ev.stopPropagation();
      polaroidDragRef.current.dragging = false;
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      // Suppress the click that fires immediately after mouseup
      window.addEventListener("click", (ce) => ce.stopPropagation(), { capture: true, once: true });
    };
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
  };
  const [hoveredSymbolIndex, setHoveredSymbolIndex] = useState<number | null>(null);
  const isFlippingRef = useRef(false);

  // Reset expanded skill and hover when page changes
  useEffect(() => {
    setExpandedSkillIndex(null);
    setHoveredSymbolIndex(null);
  }, [currentPage]);

  const { registerHotzone, unregisterHotzone } = useGlobalCursor();

  // Skill +/- toggle: cursor grows into an inverted circle showing the symbol
  // it's about to become. Page-turn corners: cursor grows into a directional
  // arrow the closer the mouse gets to the actual page edge/corner.
  const hotzoneTestFn = useCallback(
    (clientX: number, clientY: number): HotzoneTestResult => {
      if (state !== "open") return { active: false };

      if (currentPage === 2) {
        const buttons = document.querySelectorAll(".skill-plus-minus-btn");
        for (let i = 0; i < buttons.length; i++) {
          const btnRect = buttons[i].getBoundingClientRect();
          if (
            clientX >= btnRect.left &&
            clientX <= btnRect.right &&
            clientY >= btnRect.top &&
            clientY <= btnRect.bottom
          ) {
            const isExpanded = expandedSkillIndex === i;
            return {
              active: true,
              pct: 1.0,
              chevron: "none",
              hoverType: "expand-invert",
              symbol: isExpanded ? "−" : "+",
            };
          }
        }
      }

      const corners = document.querySelectorAll("[data-book-corner]");
      for (let i = 0; i < corners.length; i++) {
        const el = corners[i];
        const corner = el.getAttribute("data-book-corner") as Corner | null;
        if (!corner || !cornerEnabled(corner)) continue;
        const rect = el.getBoundingClientRect();
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) continue;

        const onRight = corner === "tr" || corner === "br";
        const onBottom = corner === "bl" || corner === "br";
        const tipX = onRight ? rect.right : rect.left;
        const tipY = onBottom ? rect.bottom : rect.top;
        const dist = Math.hypot(clientX - tipX, clientY - tipY);
        const pct = Math.max(0, Math.min(1, 1 - dist / CORNER_SIZE));

        return {
          active: true,
          pct,
          chevron: onRight ? "next" : "back",
        };
      }

      return { active: false };
    },
    [state, currentPage, expandedSkillIndex] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    registerHotzone("interactive-book", hotzoneTestFn, 40);
    return () => unregisterHotzone("interactive-book");
  }, [registerHotzone, unregisterHotzone, hotzoneTestFn]);

  // Polaroid photo: draggable desk object → grip cursor
  const polaroidHotzoneTestFn = useCallback(
    (clientX: number, clientY: number): HotzoneTestResult => {
      if (state !== "open" || currentPage !== 1) return { active: false };
      const rect = polaroidRef.current?.getBoundingClientRect();
      if (!rect) return { active: false };
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) return { active: false };
      return { active: true, pct: 1.0, chevron: "none", hoverType: "expand-invert", icon: "drag" };
    },
    [state, currentPage]
  );

  useEffect(() => {
    registerHotzone("interactive-book-polaroid", polaroidHotzoneTestFn, 30);
    return () => unregisterHotzone("interactive-book-polaroid");
  }, [registerHotzone, unregisterHotzone, polaroidHotzoneTestFn]);

  const [isBookFullyOpen, setIsBookFullyOpen] = useState(false);

  // ── turn.js corner fold ──
  // Everything is drawn in an overlay on top of the live pages (the live pages
  // are never clipped, so the corner hit-zones can't clip themselves away):
  //   • an "incoming" layer reveals the next page's real content, clipped to the
  //     folded footprint (the triangle that lifts away)
  //   • a paper "flap" — the footprint reflected across the diagonal crease
  // The footprint/flap geometry is driven per-frame through CSS custom
  // properties on the container, so React re-renders can't clobber them.
  // mode: "peek" = small hover preview that holds; "turn" = full page flip;
  //       "retract" = animate the peek back to flat and unmount.
  const [flip, setFlip] = useState<{ from: number; to: number; corner: Corner; mode: "peek" | "turn" | "retract" } | null>(null);
  const foldTRef = useRef(0); // current fold progress, so peek→turn continues smoothly
  const PEEK_T = 0.12; // how far the hover preview lifts the corner

  useEffect(() => {
    if (state === "open") {
      const t = setTimeout(() => setIsBookFullyOpen(true), 900);
      return () => clearTimeout(t);
    } else {
      setIsBookFullyOpen(false);
    }
  }, [state]);

  const cornerTarget = (corner: Corner) => {
    const onRight = corner === "tr" || corner === "br";
    return onRight ? currentPage + 1 : currentPage - 1;
  };
  const cornerEnabled = (corner: Corner) => {
    const onRight = corner === "tr" || corner === "br";
    return onRight ? currentPage < 3 : currentPage > 1;
  };

  // Hover in: lift the corner a little (peek). Hover out: retract it.
  const peekCorner = (corner: Corner) => {
    if (isFlippingRef.current || !cornerEnabled(corner)) return;
    setFlip({ from: currentPage, to: cornerTarget(corner), corner, mode: "peek" });
  };
  const unpeekCorner = (corner: Corner) => {
    setFlip((f) => (f && f.mode === "peek" && f.corner === corner ? { ...f, mode: "retract" } : f));
  };
  // Click: run the full turn (continuing from wherever the peek left off).
  const turnCorner = (corner: Corner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isFlippingRef.current || !cornerEnabled(corner)) return;
    isFlippingRef.current = true;
    setFlip({ from: currentPage, to: cornerTarget(corner), corner, mode: "turn" });
  };

  // Drive the fold once the overlay layers exist in the DOM.
  useEffect(() => {
    if (!flip) return;
    const { to, corner, mode } = flip;
    const W = cardW - 10; // 567 — page width
    const H = cardH - 20; // 743 — page height
    const container = containerRef.current;
    if (!container) return;

    const apply = (t: number) => {
      const f = computeCornerFold(t, corner, W, H);
      container.style.setProperty("--fold-flap-clip", f.flapClip);
      container.style.setProperty("--fold-flap-mat", f.flapMatrix);
      container.style.setProperty("--fold-flap-shadow-op", String(Math.sin(Math.PI * t) * 0.45));
      container.style.setProperty("--fold-flap-shadow-bg", f.flapShadow);
      foldTRef.current = t;
    };
    apply(foldTRef.current);

    const obj = { t: foldTRef.current };
    let tween: gsap.core.Tween;
    if (mode === "peek") {
      tween = gsap.to(obj, { t: PEEK_T, duration: 0.22, ease: "power2.out", onUpdate: () => apply(obj.t) });
    } else if (mode === "retract") {
      tween = gsap.to(obj, {
        t: 0,
        duration: 0.18,
        ease: "power2.in",
        onUpdate: () => apply(obj.t),
        onComplete: () => { foldTRef.current = 0; setFlip(null); },
      });
    } else {
      let swapped = false;
      tween = gsap.to(obj, {
        t: 1,
        duration: 0.7,
        ease: "power2.inOut",
        onUpdate: () => {
          apply(obj.t);
          // Swap the live spread once the flap has swept past the crease.
          if (!swapped && obj.t >= 0.55) { swapped = true; setCurrentPage(to); }
        },
        onComplete: () => { foldTRef.current = 0; setFlip(null); isFlippingRef.current = false; },
      });
    }
    return () => { tween.kill(); };
  }, [flip]);

  useEffect(() => {
    const container = containerRef.current;
    const cover = coverWrapperRef.current;
    const leftPage = leftPageRef.current;
    const rightPage = rightPageRef.current;
    const pagesStack = pagesStackRef.current;
    const rightBacking = rightCoverBackingRef.current;
    const spineHinge = spineHingeRef.current;

    const leftBgSheets = container?.querySelectorAll(".left-page-bg-sheet");
    const rightBgSheets = container?.querySelectorAll(".right-page-bg-sheet");

    if (!cover) return;

    if (state === "closed") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, rightBacking, spineHinge]);
      if (leftBgSheets) gsap.killTweensOf(leftBgSheets);
      if (rightBgSheets) gsap.killTweensOf(rightBgSheets);

      // Center the card when closed (shift left by half card width)
      if (container) {
        gsap.to(container, {
          x: -288.5,
          duration: 0.6,
          ease: "power2.out",
          // Only the right half (the cover) is visible when closed — clip
          // away the left half's hit-box once the shift settles, so it
          // can't sit hoverable/clickable over whatever's behind it on the
          // desk. (pointer-events can't be used here — a parent layer-order
          // system force-sets this element's pointer-events to "auto" on
          // every layer update, regardless of anything set on it — clip-path
          // is the one restriction that isn't touched by that.)
          // We use safety margins of -40px on top, right, and bottom so shadows and rounded corners are not trimmed.
          onComplete: () => gsap.set(container, { clipPath: `inset(-40px -120px -40px ${cardW}px)` }),
        });
      }
      // Return cover to resting angle (flat rectangle)
      gsap.to(cover, {
        rotateY: 0,
        x: 0,
        duration: 0.6,
        ease: "power2.out",
      });
      // Hide open pages, backings
      if (leftPage) gsap.to(leftPage, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightPage) gsap.to(rightPage, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (leftBgSheets) gsap.to(leftBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBgSheets) gsap.to(rightBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBacking) gsap.to(rightBacking, { opacity: 0, duration: 0.3 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 0, duration: 0.3 });
      // Keep thickness deck hidden to avoid faint white borders
      if (pagesStack) gsap.to(pagesStack, { opacity: 0, duration: 0.4 });
      setCurrentPage(1);
    } else if (state === "hover") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, rightBacking, spineHinge]);
      if (leftBgSheets) gsap.killTweensOf(leftBgSheets);
      if (rightBgSheets) gsap.killTweensOf(rightBgSheets);

      // Keep card centered
      if (container) {
        gsap.to(container, {
          x: -288.5,
          duration: 0.6,
          ease: "power2.out",
          // Same phantom-hitbox fix as the closed state (see comment there).
          onComplete: () => gsap.set(container, { clipPath: `inset(-40px -120px -40px ${cardW}px)` }),
        });
      }
      // Keep cover flat in hover state to maintain rectangular shape
      gsap.to(cover, {
        rotateY: 0,
        x: 0,
        duration: 0.6,
        ease: "power2.out",
      });
      if (leftPage) gsap.to(leftPage, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightPage) gsap.to(rightPage, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (leftBgSheets) gsap.to(leftBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBgSheets) gsap.to(rightBgSheets, { opacity: 0, scaleX: 0, duration: 0.3 });
      if (rightBacking) gsap.to(rightBacking, { opacity: 0, duration: 0.3 });
      if (spineHinge) gsap.to(spineHinge, { opacity: 0, duration: 0.3 });
      if (pagesStack) gsap.to(pagesStack, { opacity: 0, duration: 0.4 });
      setCurrentPage(1);
    } else if (state === "open") {
      gsap.killTweensOf([container, cover, leftPage, rightPage, pagesStack, rightBacking, spineHinge]);
      if (leftBgSheets) gsap.killTweensOf(leftBgSheets);
      if (rightBgSheets) gsap.killTweensOf(rightBgSheets);

      // Align open book layout center to mat center (reset x shift)
      if (container) {
        gsap.set(container, { clipPath: "none" }); // restore the left half's hit-box before it swings into view
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
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
      if (leftBgSheets) {
        gsap.set(leftBgSheets, { transformOrigin: "right center" });
        gsap.to(leftBgSheets, {
          opacity: 1,
          scaleX: 1,
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
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
      if (rightBgSheets) {
        gsap.set(rightBgSheets, { transformOrigin: "left center" });
        gsap.to(rightBgSheets, {
          opacity: 1,
          scaleX: 1,
          duration: 0.45,
          delay: 0.45,
          ease: "power2.out",
        });
      }
    }
  }, [state]);

  useEffect(() => {
    if (state !== "open") return;
    const interval = setInterval(() => {
      const el = rotatingWordRef.current;
      if (!el) return;
      gsap.to(el, {
        opacity: 0,
        y: -15,
        duration: 0.35,
        ease: "power1.inOut",
        onComplete: () => {
          setWordIndex((prev) => (prev + 1) % words.length);
          gsap.fromTo(
            el,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.35, ease: "power1.out" }
          );
        },
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [state]);

  const cardW = 577;
  const cardH = 763;

  // Per-page background/padding so the live page and the fold's "incoming"
  // reveal layer stay visually identical.
  const rightPageBg = (pageNum: number) =>
    pageNum === 1 ? "url(/about_right_bg.png) no-repeat center/cover" : "#FCFEFF";
  const rightPagePad = (pageNum: number) => (pageNum === 1 ? "0px" : "40px");

  // ── Page content renderers (shared by the live page and the fold reveal) ──
  const renderLeftContent = (pageNum: number) =>
    pageNum >= 3 ? null : pageNum === 1 ? (
      <div className="flex-1 flex flex-col justify-between">
        {/* Top of page */}
        <div
          style={{
            width: "100%",
            maxWidth: "483px",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontStyle: "normal",
            fontWeight: 500,
            fontSize: "40px",
            lineHeight: "160%",
            color: "#000000",
          }}
        >
          I want to create
        </div>
        {/* Bottom of page */}
        <div
          style={{
            width: "100%",
            maxWidth: "483px",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontStyle: "normal",
            fontWeight: 500,
            fontSize: "40px",
            lineHeight: "160%",
            color: "#000000",
          }}
        >
          experience that feel humane and personal while also adapt to shifting system
        </div>
      </div>
    ) : (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Layout container */}
        <div style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "0px",
          gap: "28px",
          zIndex: 10,
          boxSizing: "border-box",
        }}>
          <div style={{
            width: "100%",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 500,
            fontSize: "22px",
            lineHeight: "160%",
            color: "#000000",
            opacity: 0.8,
          }}>
            Things I am good at
          </div>

          {/* Skills items */}
          {(() => {
            const SKILLS_DATA = [
              {
                title: "Experience Design",
                description: "User experience, User interface design, Wire-framing, Usability testing, Physical & digital prototyping, Inclusive design, Double Diamond process, Design systems, Web & mobile design"
              },
              {
                title: "UX Research",
                description: "User research, User interviews, User personas, Interview synthesis, Data visualization, A/B testing, Information architecture, Competitive analysis"
              },
              {
                title: "Visual Design",
                description: "Brand identity, Design systems, Typography, Iconography, Custom illustration"
              },
              {
                title: "Software",
                description: "Figma, Unity, Miro, Adobe suite(Illustrator, Photoshop, Indesign), Framer, Blender, spline, Notion, Procreate"
              },
              {
                title: "AI Tools",
                description: "Claude code, Codex, Mid-journey, fuser studio"
              }
            ];

            return SKILLS_DATA.map((skill, index) => {
              const isExpanded = expandedSkillIndex === index;
              let expandedHeight = 149;
              if (index === 0) expandedHeight = 168;
              else if (index === 2) expandedHeight = 130;
              else if (index === 4) expandedHeight = 111;

              return (
                <div
                  key={index}
                  style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    alignItems: "stretch",
                    width: "100%",
                    height: isExpanded ? expandedHeight : 64,
                    borderBottom: "1px solid #000000",
                    overflow: "hidden",
                    transition: "height 0.3s ease-in-out",
                  }}
                >
                  {/* Header Row */}
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    height: 64,
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 500,
                      fontSize: "36px",
                      lineHeight: "160%",
                      color: "#000000",
                      display: "flex",
                      alignItems: "center",
                    }}>
                      {skill.title}
                    </span>
                    <span
                      data-index={index}
                      onMouseEnter={() => setHoveredSymbolIndex(index)}
                      onMouseLeave={() => setHoveredSymbolIndex(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSkillIndex(isExpanded ? null : index);
                      }}
                      className="skill-plus-minus-btn"
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontWeight: 500,
                        fontSize: "36px",
                        lineHeight: "160%",
                        color: "#000000",
                        display: "flex",
                        alignItems: "center",
                        width: 32,
                        justifyContent: "center",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      {isExpanded ? "−" : "+"}
                    </span>
                  </div>

                  {/* Description Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      alignItems: "flex-start",
                      width: "100%",
                      boxSizing: "border-box",
                      opacity: isExpanded ? 1 : 0,
                      transition: "opacity 0.25s ease-in-out",
                      pointerEvents: isExpanded ? "auto" : "none",
                    }}
                  >
                    <span style={{
                      width: "80%",
                      fontFamily: "'Atkinson Hyperlegible Mono', monospace",
                      fontStyle: "normal",
                      fontWeight: 500,
                      fontSize: "12px",
                      lineHeight: "160%",
                      letterSpacing: "-0.04em",
                      textTransform: "capitalize",
                      color: "#000000",
                      textAlign: "left",
                    }}>
                      {skill.description}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    );

  const renderRightContent = (pageNum: number, interactive: boolean) => (
    <>
      {/* Polaroid — page 1 only */}
      {pageNum === 1 && (
        <div
          ref={interactive ? polaroidRef : undefined}
          data-no-deck-drag={interactive ? true : undefined}
          onMouseDown={interactive ? onPolaroidMouseDown : undefined}
          style={{
            position: "absolute",
            left: interactive ? polaroidPos.x : 100,
            top: interactive ? polaroidPos.y : 160,
            width: 313.56,
            height: 376.76,
            background: "#FFFFFF",
            borderRadius: 2.4307,
            transform: "rotate(-1.16deg)",
            cursor: interactive ? "grab" : "default",
            userSelect: "none",
            zIndex: 50,
            boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
          }}
        >
          <img
            src="/about_portrait.png?v=4"
            alt="Portrait"
            draggable={false}
            style={{
              position: "absolute",
              width: 269.81,
              height: 269.81,
              left: 22.31,
              top: 22.31,
              objectFit: "cover",
              borderRadius: 1,
              display: "block",
            }}
          />
        </div>
      )}

      {pageNum === 2 && (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "0px",
              gap: "28px",
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Things I have done */}
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "20px", lineHeight: "160%", color: "#000000" }}>
              Things I have done
            </div>

            {/* Experience Section */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "20px", alignSelf: "stretch" }}>
              <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "row", alignItems: "flex-start", paddingBottom: "8px", width: "100%", borderBottom: "1px solid #000000" }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: "20px", lineHeight: "160%", textTransform: "uppercase", color: "#000000" }}>
                  Experience
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "14px", alignSelf: "stretch" }}>
                {[
                  { y: "2026", t: "INVT.RSVP — UI/UX Designer" },
                  { y: "2025", t: "University of Cincinnati DAAP — Graphic Designer" },
                  { y: "2025", t: "The Livewell Collaborative — UX Researcher" },
                  { y: "2025", t: "University of Cincinnati Graduate College — Graphic Designer" },
                  { y: "2023", t: "Bluelearn.in — Visual Designer" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>{row.y}</span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>{row.t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Education Section */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "20px", alignSelf: "stretch" }}>
              <div style={{ boxSizing: "border-box", display: "flex", flexDirection: "row", alignItems: "flex-start", paddingBottom: "8px", width: "100%", borderBottom: "1px solid #000000" }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: "20px", lineHeight: "160%", textTransform: "uppercase", color: "#000000" }}>
                  Education
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "14px", alignSelf: "stretch" }}>
                {[
                  { y: "2026", t: "University of Cincinnati — Master of Design" },
                  { y: "2023", t: "Gujarat Technological University — Bachelor of Computer Engineering" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "24px", alignSelf: "stretch" }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "10px", lineHeight: "160%", color: "#96A1A0", width: "30px", flexShrink: 0 }}>{row.y}</span>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: "15px", lineHeight: "140%", color: "#000000" }}>{row.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

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
        flexShrink: 0,
        // NOTE: no perspective/transform-style:preserve-3d here — see the
        // inner wrapper below. A parent component (HomeInteractive's layer
        // z-order system) always force-sets THIS element's pointer-events
        // to "auto" via direct DOM mutation on every layer update,
        // regardless of anything set here — so pointer-events can't be used
        // to hide the invisible left half when closed/hover (see -288.5
        // translateX above). clip-path is the one restriction that survives
        // that override, but clip-path's reference-box resolution is
        // unreliable on an element that itself establishes a 3D rendering
        // context — hence pushing perspective/preserve-3d one level in.
      }}
    >
      {/* Perspective lives here, one level in, so clip-path on the outer
          container above (applied imperatively per closed/hover/open state)
          resolves against a plain 2D box instead of a 3D-context one. */}
      <div style={{ position: "absolute", inset: 0, perspective: 2000, transformStyle: "preserve-3d" }}>
      {/* ── [1] STACKED PAGES DECK (Thickness effect under cover when closed) ── */}
      <div
        ref={pagesStackRef}
        className="absolute inset-0 pointer-events-none"
        style={{ transformStyle: "preserve-3d", opacity: 0 }}
      >
        {/* Red Back Cover Sheet */}
        <div
          className="absolute shadow-[rgba(0,0,0,0.25)_1px_0px_5px_0px]"
          style={{
            left: 577,
            top: 4,
            width: 574,
            height: 754,
            backgroundColor: "#DCCCFF",
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
              backgroundColor: "rgb(220, 220, 220)",
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
          backgroundColor: "#DCCCFF",
          borderRadius: "16px 40px 40px 16px",
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
            backgroundColor: "#fbf9f3",
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
          backgroundColor: "#DCCCFF",
          boxShadow: "inset -1px 0 3px rgba(0,0,0,0.15), inset 1px 0 3px rgba(0,0,0,0.15)",
          opacity: 0,
          zIndex: 22,
        }}
      />

      {/* ── [2] DOUBLE SIDE COVER WRAPPER (Swings Y from 0 to -180deg) ── */}
      <div
        ref={coverWrapperRef}
        data-name="cover-wrapper"
        className="absolute"
        style={{
          left: 577,
          top: 0,
          width: cardW,
          height: cardH,
          transformOrigin: "left center",
          transformStyle: "preserve-3d",
          transform: "rotateY(0deg) translateX(0px)",
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
            borderRadius: "16px 40px 40px 16px",
            overflow: "hidden",
          }}
        >
          {/* Cover SVG Graphic */}
          <BookCover isClosed={state !== "open"} />

          {/* Crease Shader Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "rgba(255, 255, 255, 0.5) -2px 0px 2px 0px inset",
              borderRadius: "16px 40px 40px 16px",
            }}
          />

          {/* Crease Ridge Overlay */}
          <div
            className="absolute inset-0 pointer-events-none flex"
            style={{
              boxShadow:
                "rgba(0, 0, 0, 0.16) 0.301094px 0.602187px 1.21188px -0.5px, rgba(0, 0, 0, 0.196) 1.14427px 2.28853px 4.60558px -1px, rgba(0, 0, 0, 0.35) 5px 10px 20.1246px -1.5px",
              borderRadius: "16px 40px 40px 16px",
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
            backgroundColor: "#DCCCFF",
            borderRadius: "40px 16px 16px 40px",
          }}
        >
          {/* Lining Paper */}
          <div
            className="shadow-inner"
            style={{
              width: cardW - 32,
              height: cardH - 32,
              backgroundColor: "#fbf9f3",
              borderRadius: "24px 4px 4px 24px",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          />
        </div>
      </div>

      {/* ── [3] OPENED DOUBLE-PAGE CONTENT (Fades in when open) ── */}

      {/* Left Page Background Sheets (Page Stack Thickness) */}
      {[1, 2, 3].map((num) => {
        const offset = num * 3; // 3px, 6px, 9px offset
        return (
          <div
            key={`left-sheet-${num}`}
            className="left-page-bg-sheet absolute"
            style={{
              left: 10 + offset,
              top: 10,
              width: cardW - 10 - offset,
              height: cardH - 20,
              backgroundColor: "#f5f3eb",
              borderRadius: "24px 0px 0px 24px",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "-4px 6px 12px rgba(0,0,0,0.1)",
              opacity: 0,
              transformOrigin: "right center",
              transform: "scaleX(0)",
              pointerEvents: "none",
              zIndex: 30 - num,
            }}
          />
        );
      })}

      {/* Left Page (Typography & Dynamic Word or Skills list) */}
      <div
        ref={leftPageRef}
        className="absolute flex flex-col"
        style={{
          left: 10,
          top: 10,
          width: cardW - 10, // 567px (Ends at 577px crease)
          height: cardH - 20,
          backgroundColor: "#FCFEFF",
          color: "#000000",
          borderRadius: "24px 0px 0px 24px", // Meets flush at right edge
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "-8px 10px 24px rgba(0,0,0,0.16), -2px 2px 6px rgba(0,0,0,0.06)",
          padding: "40px",
          overflow: "hidden",
          opacity: 0,
          transformOrigin: "right center",
          transform: "scaleX(0)",
          pointerEvents: isBookFullyOpen ? "auto" : "none",
          zIndex: 30,
        }}
      >
        {/* Back corners (top-left + bottom-left): hover peeks, click turns back */}
        {isBookFullyOpen && currentPage > 1 && (
          <>
            <div
              data-no-deck-drag
              data-book-corner="tl"
              onMouseEnter={() => peekCorner("tl")}
              onMouseLeave={() => unpeekCorner("tl")}
              onClick={(e) => turnCorner("tl", e)}
              style={{ position: "absolute", left: 0, top: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: "default", zIndex: 99, clipPath: "polygon(0% 0%, 100% 0%, 0% 100%)" }}
            />
            {/* Permanent dog-ear shadow — keeps the fold affordance visible on blank/white pages */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: CORNER_SIZE,
                height: CORNER_SIZE,
                pointerEvents: "none",
                zIndex: 15,
                background: "radial-gradient(circle at 0% 100%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.07) 35%, rgba(0,0,0,0) 65%)",
              }}
            />
            <div
              data-no-deck-drag
              data-book-corner="bl"
              onMouseEnter={() => peekCorner("bl")}
              onMouseLeave={() => unpeekCorner("bl")}
              onClick={(e) => turnCorner("bl", e)}
              style={{ position: "absolute", left: 0, bottom: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: "default", zIndex: 99, clipPath: "polygon(0% 100%, 100% 100%, 0% 0%)" }}
            />
          </>
        )}
        {renderLeftContent(currentPage)}
      </div>

      {/* Right Page Background Sheets (Page Stack Thickness) */}
      {[1, 2, 3].map((num) => {
        const offset = num * 3; // 3px, 6px, 9px offset
        return (
          <div
            key={`right-sheet-${num}`}
            className="right-page-bg-sheet absolute"
            style={{
              left: 577,
              top: 10,
              width: cardW - 10 - offset,
              height: cardH - 20,
              backgroundColor: "#f5f3eb",
              borderRadius: "0px 24px 24px 0px",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "4px 6px 12px rgba(0,0,0,0.1)",
              opacity: 0,
              transformOrigin: "left center",
              transform: "scaleX(0)",
              pointerEvents: "none",
              zIndex: 30 - num,
            }}
          />
        );
      })}

      {/* Right Page (Portrait Image & Next Page Flip Button) */}
      <div
        ref={rightPageRef}
        className="absolute flex flex-col justify-between"
        style={{
          left: 577, // Starts exactly at 577px crease
          top: 10,
          width: cardW - 10, // 567px (Ends at 1144px, leaving 10px cover border)
          height: cardH - 20,
          background: currentPage === 1
            ? "url(/about_right_bg.png) no-repeat center/cover"
            : "#FCFEFF",

          color: "#000000",
          padding: currentPage === 1 ? "0px" : "40px",
          filter: "none",
          borderRadius: "0px 24px 24px 0px", // Meets flush at left edge
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "8px 10px 24px rgba(0,0,0,0.16), 2px 2px 6px rgba(0,0,0,0.06)",
          opacity: 0,
          transformOrigin: "left center",
          transform: "scaleX(0)",
          pointerEvents: isBookFullyOpen ? "auto" : "none",
          zIndex: 30,
        }}
      >
        {/* Next corners (top-right + bottom-right): hover peeks, click turns forward */}
        {isBookFullyOpen && currentPage < 3 && (
          <>
            {/* Permanent dog-ear shadow — keeps the fold affordance visible on blank/white pages */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: CORNER_SIZE,
                height: CORNER_SIZE,
                pointerEvents: "none",
                zIndex: 15,
                background: "radial-gradient(circle at 100% 0%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.07) 35%, rgba(0,0,0,0) 65%)",
              }}
            />
            <div
              data-no-deck-drag
              data-book-corner="tr"
              onMouseEnter={() => peekCorner("tr")}
              onMouseLeave={() => unpeekCorner("tr")}
              onClick={(e) => turnCorner("tr", e)}
              style={{ position: "absolute", right: 0, top: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: "default", zIndex: 99, clipPath: "polygon(0% 0%, 100% 0%, 100% 100%)" }}
            />
            <div
              data-no-deck-drag
              data-book-corner="br"
              onMouseEnter={() => peekCorner("br")}
              onMouseLeave={() => unpeekCorner("br")}
              onClick={(e) => turnCorner("br", e)}
              style={{ position: "absolute", right: 0, bottom: 0, width: CORNER_SIZE, height: CORNER_SIZE, cursor: "default", zIndex: 99, clipPath: "polygon(100% 100%, 0% 100%, 100% 0%)" }}
            />
          </>
        )}

        {renderRightContent(currentPage, true)}
      </div>

      {/* ── Turn.js corner fold overlay (incoming reveal + reflected paper flap) ── */}
      {flip && (() => {
        const isLeft = flip.corner === "tl" || flip.corner === "bl"; // turning the left page (back)
        const pageLeft = isLeft ? 10 : 577;
        const radius = isLeft ? "24px 0px 0px 24px" : "0px 24px 24px 0px";
        const bg = isLeft ? "#FCFEFF" : rightPageBg(flip.to);
        const pad = isLeft ? "40px" : rightPagePad(flip.to);
        return (
          <>
            {/* Incoming page — the next page's real content, revealed in the folded footprint */}
            <div
              style={{
                position: "absolute",
                left: pageLeft,
                top: 10,
                width: cardW - 10,
                height: cardH - 20,
                background: bg,
                padding: pad,
                color: "#000000",
                borderRadius: radius,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: isLeft ? "flex-start" : "space-between",
                clipPath: "var(--fold-flap-clip, polygon(0 0, 0 0, 0 0))",
                pointerEvents: "none",
                zIndex: 55,
              }}
            >
              {isLeft ? renderLeftContent(flip.to) : renderRightContent(flip.to, false)}
            </div>

            {/* Flap — paper back of the turning page, reflected across the crease */}
            <div
              style={{
                position: "absolute",
                left: pageLeft,
                top: 10,
                width: cardW - 10,
                height: cardH - 20,
                backgroundColor: "#FCFEFF",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: radius,
                overflow: "hidden",
                transformOrigin: "0px 0px", // matrix maps page-local coords directly
                transform: "var(--fold-flap-mat, none)", // reflection across the crease
                clipPath: "var(--fold-flap-clip, polygon(0 0, 0 0, 0 0))", // folded footprint
                boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
                pointerEvents: "none",
                zIndex: 60,
              }}
            >
              {/* ashadow — darkens the flap toward the crease */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: "var(--fold-flap-shadow-op, 0)",
                  background: "var(--fold-flap-shadow-bg, none)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </>
        );
      })()}

      </div>
    </div>
  );
}
