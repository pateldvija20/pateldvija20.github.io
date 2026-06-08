"use client";

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import HomeImport from '../imports/Home-1/Home-1-1716';
import BookOpen from '../imports/Home-1/Frame35';
import BookCover from '../imports/Frame31-1/Frame31-6-430';
import BookHoverImg from '../imports/BookHover/BookHover';
import { PurpleFile } from './PurpleFile';
import { FolderCard } from './FolderCard';
import { MatGrid } from '../../Components/MatGrid/MatGrid';
import { StickyNote } from '../../Components/StickyNote/StickyNote';

type LayerKey = 'book' | 'file' | 'folder' | 'paper' | 'mat-grid';

const FLIP_ORDER: LayerKey[] = ['book', 'folder', 'file', 'paper'];
const ALL_LAYERS: LayerKey[] = ['book', 'file', 'folder', 'paper', 'mat-grid'];

const Z_BASE: Record<LayerKey, number> = {
  book: 50,
  folder: 40,
  file: 30,
  paper: 20,
  'mat-grid': 10,
};

const LAYER_TILT: Record<string, string> = {
  book: 'rotate(-5.31deg)',
  folder: 'rotate(4.27deg)',
  file: 'rotate(-28.02deg)',
  paper: 'rotate(2.12deg)',
};

// z-index ranks for the 4-card deck, index 0 = top
const DECK_Z = [50, 40, 30, 20] as const;

const COVER_INIT_TRANSFORMS: Record<string, string> = {
  book:   'rotate(-5.31deg)',
  file:   'rotate(-28.02deg)',
  folder: 'rotate(0deg)',
  paper:  'rotate(0deg)',
};

const parseTiltDeg = (tilt: string): number => {
  const m = tilt.match(/rotate\((-?[\d.]+)deg\)/);
  return m ? parseFloat(m[1]) : 0;
};

const parseTransform = (t: string): { x: number; y: number; rotation: number } => {
  const tr = t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
  const ro = t.match(/rotate\((-?[\d.]+)deg\)/);
  return {
    x: tr ? parseFloat(tr[1]) : 0,
    y: tr ? parseFloat(tr[2]) : 0,
    rotation: ro ? parseFloat(ro[1]) : 0,
  };
};

// Per-layer accumulated drag offset (mutated in place — no re-renders)
const dragOffsets: Record<string, { x: number; y: number }> = {
  book:   { x: 0, y: 0 },
  file:   { x: 0, y: 0 },
  folder: { x: 0, y: 0 },
  paper:  { x: 0, y: 0 },
};

interface DragState {
  layer: string;
  startMouseX: number;
  startMouseY: number;
  startOffsetX: number;
  startOffsetY: number;
  hasMoved: boolean;
}

const NAV_ITEMS: Array<{ layer: LayerKey; label: string }> = [
  { layer: 'book', label: 'About' },
  { layer: 'folder', label: 'Work' },
  { layer: 'file', label: 'Notes' },
  { layer: 'paper', label: 'Resume' },
  { layer: 'mat-grid', label: 'Playground' },
];

export function HomeInteractive() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const bookCoverRef = useRef<HTMLDivElement>(null);
  const fileCoverRef = useRef<HTMLDivElement>(null);
  const folderCoverRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<LayerKey[]>([...FLIP_ORDER]);
  const isAnimatingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastDragMovedRef = useRef(false); // survives after activeDragRef is cleared
  const wheelEnabledRef = useRef(true);
  const loaderHiddenRef = useRef(false);
  const activeDragRef = useRef<DragState | null>(null);
  const scaleRef = useRef<number>(1);
  // Stores the base (non-drag) rotation for each layer so drag offset can be composed on top
  const baseTransformsRef = useRef<Record<string, string>>({
    book: LAYER_TILT['book'] ?? '',
    folder: LAYER_TILT['folder'] ?? '',
    file: LAYER_TILT['file'] ?? '',
    paper: LAYER_TILT['paper'] ?? '',
  });

  const [activeNav, setActiveNav] = useState<LayerKey>('book');
  const [topLayer, setTopLayer] = useState<LayerKey>('book');
  const [bookOpen, setBookOpen] = useState(false);
  const bookOpenRef = useRef(false);
  const [fileOpen, setFileOpen] = useState(false);
  const fileOpenRef = useRef(false);

  const filePageRef    = useRef<HTMLDivElement>(null);
  const fileBackdropRef = useRef<HTMLDivElement>(null);

  const [bookHovered, setBookHovered] = useState(false);
  const [fileHovered, setFileHovered] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  const selectedLayerRef = useRef<LayerKey | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const remainingShiftTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const q = (name: LayerKey): HTMLElement | null =>
    (sceneRef.current?.querySelector(`[data-name="${name}"]`) as HTMLElement | null) ?? null;

  const hideLoader = useCallback(() => {
    loaderHiddenRef.current = true;
  }, []);

  const coverOf = useCallback((layer: string): HTMLDivElement | null =>
    layer === 'book' ? bookCoverRef.current :
    layer === 'file' ? fileCoverRef.current :
    layer === 'folder' ? folderCoverRef.current : null
  , []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStackPositionsImmediateZ = useCallback(() => {
    const deck = deckRef.current;
    deck.forEach((layer, rank) => {
      const el = q(layer);
      const cover = coverOf(layer);
      const z = DECK_Z[rank];
      if (el) { el.style.zIndex = String(z); el.style.pointerEvents = 'none'; el.style.cursor = 'default'; }
      if (cover) {
        cover.style.zIndex = String(z + 1);
        cover.style.pointerEvents = 'none';
        const child = cover.firstElementChild as HTMLElement | null;
        if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
      }
      if (layer === 'paper') {
        const child = el?.querySelector('[data-name="paper-white"]') as HTMLElement | null;
        if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
      }
    });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStackPositions = useCallback((animate: boolean) => {
    const deck = deckRef.current;
    deck.forEach((layer, rank) => {
      const el = q(layer);
      const cover = coverOf(layer);
      const z = DECK_Z[rank];

      if (el) { el.style.zIndex = String(z); el.style.pointerEvents = 'none'; el.style.cursor = 'default'; }
      if (cover) {
        cover.style.zIndex = String(z + 1);
        cover.style.pointerEvents = 'none';
        const child = cover.firstElementChild as HTMLElement | null;
        if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
      }
      if (layer === 'paper') {
        const child = el?.querySelector('[data-name="paper-white"]') as HTMLElement | null;
        if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
      }

      const targetY = rank * 10;
      const targetScale = 1 - rank * 0.02;
      const elRot = parseTiltDeg(LAYER_TILT[layer] ?? '');
      const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[layer] ?? '');

      if (animate) {
        gsap.to(el, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' });
        if (cover) gsap.to(cover, { x: 0, y: targetY, scale: targetScale, rotation: coverRot, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' });
      } else {
        if (el) gsap.set(el, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1 });
        if (cover) gsap.set(cover, { x: 0, y: targetY, scale: targetScale, rotation: coverRot, opacity: 1 });
      }
    });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag helpers ─────────────────────────────────────────────────────────
  const applyLayerTransform = useCallback((layerKey: string, el: HTMLElement | null, coverEl: HTMLDivElement | null) => {
    const { x, y } = dragOffsets[layerKey] ?? { x: 0, y: 0 };
    const base = baseTransformsRef.current[layerKey] ?? '';
    const coverBase = layerKey === 'book' ? COVER_INIT_TRANSFORMS['book']
      : layerKey === 'file' ? COVER_INIT_TRANSFORMS['file']
      : layerKey === 'folder' ? COVER_INIT_TRANSFORMS['folder']
      : COVER_INIT_TRANSFORMS[layerKey] ?? '';
    const parsedBase = parseTransform(base);
    const scaleMatch = base.match(/scale\(([\d.]+)\)/);
    const baseScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    const coverRot = parseTiltDeg(coverBase);

    const appliedX = parsedBase.x + x;
    const appliedY = parsedBase.y + y;
    const appliedRot = parsedBase.rotation;

    if (el) gsap.set(el, { x: appliedX, y: appliedY, rotation: appliedRot, scale: baseScale });
    if (coverEl) gsap.set(coverEl, { x: appliedX, y: appliedY, rotation: appliedRot + coverRot, scale: baseScale });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scale tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('wheel', prevent, { passive: false });
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      document.removeEventListener('wheel', prevent);
      document.removeEventListener('touchmove', prevent);
    };
  }, []);

  useEffect(() => {
    const original = {
      overflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      position: document.body.style.position,
    };
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    return () => {
      document.documentElement.style.overflow = original.overflow;
      document.body.style.overflow = original.bodyOverflow;
      document.body.style.position = original.position;
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      scaleRef.current = scene.getBoundingClientRect().width / 1440;
    };
    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // ─── Drag event handlers ──────────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const drag = activeDragRef.current;
      if (!drag) return;
      const dx = (e.clientX - drag.startMouseX) / scaleRef.current;
      const dy = (e.clientY - drag.startMouseY) / scaleRef.current;
      if (!drag.hasMoved && Math.hypot(dx, dy) < 4) return;
      drag.hasMoved = true;
      lastDragMovedRef.current = true;
      dragOffsets[drag.layer] = {
        x: drag.startOffsetX + dx,
        y: drag.startOffsetY + dy,
      };
      const el = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
      const coverEl = coverOf(drag.layer);
      applyLayerTransform(drag.layer, el, coverEl);
    };

    const onMouseUp = (e: MouseEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;

      if (drag.hasMoved) {
        const el = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
        const coverEl = coverOf(drag.layer);

        const base = baseTransformsRef.current[drag.layer] ?? '';
        const parsedBase = parseTransform(base);
        let finalX = parsedBase.x + dragOffsets[drag.layer].x;
        let finalY = parsedBase.y + dragOffsets[drag.layer].y;

        // ── 30% viewport visibility clamp ──────────────────────────────────
        // Scene origin is at center of viewport; mat center is at scene (720, 512).
        // Element center in viewport = sceneRect.{left,top} + (720+finalX, 512+finalY) * scale
        const scene = sceneRef.current;
        if (scene && el) {
          const rect = scene.getBoundingClientRect();
          const scale = scaleRef.current;
          const elW = el.offsetWidth * scale;
          const elH = el.offsetHeight * scale;
          const centerVPX = rect.left + (720 + finalX) * scale;
          const centerVPY = rect.top  + (512 + finalY) * scale;
          // Center must stay within [-elDim*0.2, viewportDim + elDim*0.2] so 30% stays visible
          const clampedVPX = Math.max(-elW * 0.2, Math.min(window.innerWidth  + elW * 0.2, centerVPX));
          const clampedVPY = Math.max(-elH * 0.2, Math.min(window.innerHeight + elH * 0.2, centerVPY));
          finalX = (clampedVPX - rect.left) / scale - 720;
          finalY = (clampedVPY - rect.top)  / scale - 512;
        }

        // Free drop at clamped position
        if (drag.layer === 'book' && bookOpenRef.current) {
          bookOpenRef.current = false;
          setBookOpen(false);
        } else if (drag.layer === 'file' && fileOpenRef.current) {
          fileOpenRef.current = false;
          setFileOpen(false);
        }
        const rank = deckRef.current.indexOf(drag.layer as LayerKey);
        if (el) el.style.zIndex = String(DECK_Z[rank] ?? 30);
        if (coverEl) coverEl.style.zIndex = String((DECK_Z[rank] ?? 30) + 1);
        const customPos = `translate(${finalX}px, ${finalY}px) rotate(${parsedBase.rotation}deg) scale(1)`;
        baseTransformsRef.current[drag.layer] = customPos;
        dragOffsets[drag.layer] = { x: 0, y: 0 };
        gsap.to(el, { x: finalX, y: finalY, rotation: parsedBase.rotation, scale: 1, ease: 'back.out(1.2)', duration: 0.4 });
        if (coverEl) gsap.to(coverEl, { x: finalX, y: finalY, rotation: parsedBase.rotation + parseTiltDeg(COVER_INIT_TRANSFORMS[drag.layer] ?? ''), scale: 1, ease: 'back.out(1.2)', duration: 0.4 });
      } else {
        dragOffsets[drag.layer] = { x: drag.startOffsetX, y: drag.startOffsetY };
      }

      isDraggingRef.current = false;
      activeDragRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [applyLayerTransform, coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Standalone toggle callbacks (called from handleSceneClick too) ─────────
  const toggleBook = useCallback(() => {
    const coverEl = bookCoverRef.current;
    const btn = document.querySelector('[data-name="Book"]') as HTMLElement;
    const next = !bookOpenRef.current;
    bookOpenRef.current = next;
    setBookOpen(next);
    if (next) setBookHovered(false);
    if (btn) btn.style.opacity = next ? '0' : '1';
    if (!next && coverEl) gsap.to(coverEl, { rotation: -5.31, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFile = useCallback(() => {
    const next = !fileOpenRef.current;
    fileOpenRef.current = next;
    setFileOpen(next);
    if (next) setFileHovered(false);
    if (!next) closeLayer('file');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Book hover ───────────────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = bookCoverRef.current;
    if (!coverEl) return;
    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (deckRef.current[0] !== 'book') return;
      if (!bookOpenRef.current) {
        setBookHovered(true);
        gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onLeave = () => {
      if (deckRef.current[0] !== 'book') return;
      if (!bookOpenRef.current) {
        setBookHovered(false);
        gsap.to(coverEl, { rotation: -5.31, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
    };
  }, [bookOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── File hover ───────────────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = fileCoverRef.current;
    if (!coverEl) return;
    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (deckRef.current[0] !== 'file') return;
      if (!fileOpenRef.current) {
        setFileHovered(true);
        gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onLeave = () => {
      if (deckRef.current[0] !== 'file') return;
      if (!fileOpenRef.current) {
        setFileHovered(false);
        gsap.to(coverEl, { rotation: -28.02, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
    };
  }, [fileOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Initial setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    ALL_LAYERS.forEach((layer) => {
      const el = q(layer);
      if (!el) return;
      el.style.zIndex = String(Z_BASE[layer]);
      if (layer === 'book' && bookCoverRef.current) {
        bookCoverRef.current.style.zIndex = String(Z_BASE['book'] + 1);
        bookCoverRef.current.style.pointerEvents = 'none';
      }
      if (layer === 'file' && fileCoverRef.current) {
        fileCoverRef.current.style.zIndex = String(Z_BASE['file'] + 1);
        fileCoverRef.current.style.pointerEvents = 'none';
      }
      if (layer === 'folder' && folderCoverRef.current) {
        folderCoverRef.current.style.zIndex = String(Z_BASE['folder'] + 1);
        folderCoverRef.current.style.pointerEvents = 'none';
      }
      el.style.pointerEvents = 'none';
      if (layer === 'paper') {
        const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
        if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
      }
    });

    const navEl = scene.querySelector('[data-name="ui-nav-container"]') as HTMLElement | null;
    if (navEl) navEl.style.visibility = 'hidden';
    const oldBtn = scene.querySelector('[data-name="Book"]') as HTMLElement | null;
    if (oldBtn) oldBtn.style.visibility = 'hidden';
    const oldFile = scene.querySelector('[data-name="file-purple"]') as HTMLElement | null;
    if (oldFile) oldFile.style.visibility = 'hidden';
    const oldFolder = scene.querySelector('[data-name="folder-yellow"]') as HTMLElement | null;
    if (oldFolder) oldFolder.style.visibility = 'hidden';
    const matEl = scene.querySelector('[data-name="mat-grid"]') as HTMLElement | null;
    if (matEl) matEl.style.overflow = 'visible';

    const centerOnMat = (coverEl: HTMLDivElement | null) => {
      if (!coverEl) return;
      coverEl.style.position = 'absolute';
      coverEl.style.left = '160px';
      coverEl.style.top = '100px';
      coverEl.style.width = '1120px';
      coverEl.style.height = '824px';
      coverEl.style.display = 'flex';
      coverEl.style.alignItems = 'center';
      coverEl.style.justifyContent = 'center';
      coverEl.style.overflow = 'visible';
    };

    centerOnMat(bookCoverRef.current);
    centerOnMat(fileCoverRef.current);
    const coverEl = folderCoverRef.current;
    centerOnMat(coverEl);
    if (coverEl) coverEl.style.visibility = 'visible';

    // Start in stacked layout
    updateStackPositions(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Wheel-driven deck cycle ──────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let deltaAccumulator = 0;
    const DELTA_THRESHOLD = 60;

    const onWheel = (e: WheelEvent) => {
      if (!wheelEnabledRef.current) return;
      e.preventDefault();
      if (isAnimatingRef.current) return;

      deltaAccumulator += e.deltaY;
      if (Math.abs(deltaAccumulator) < DELTA_THRESHOLD) return;
      const direction = deltaAccumulator > 0 ? 1 : -1;
      deltaAccumulator = 0;

      const deck = deckRef.current;

      if (direction > 0) {
        isAnimatingRef.current = true;
        setBookHovered(false);
        setFileHovered(false);

        const demoted = deck[0];
        const demotedEl = q(demoted);
        const demotedCover = coverOf(demoted);
        const targetY = 3 * 10;
        const targetScale = 1 - 3 * 0.02;
        const elRot = parseTiltDeg(LAYER_TILT[demoted] ?? '');
        const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[demoted] ?? '');

        const cycleTl = gsap.timeline({ onComplete() { isAnimatingRef.current = false; } });

        cycleTl.to(demotedEl, { y: -180, scale: 1.04, rotation: elRot - 5, duration: 0.35, ease: 'power2.out' }, 0);
        if (demotedCover) cycleTl.to(demotedCover, { y: -180, scale: 1.04, rotation: coverRot - 5, duration: 0.35, ease: 'power2.out' }, 0);

        deck.slice(1).forEach((layer, index) => {
          const el = q(layer);
          const cover = coverOf(layer);
          const newRank = index;
          cycleTl.to(el, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
          if (cover) cycleTl.to(cover, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
        });

        cycleTl.call(() => {
          deckRef.current = [...deck.slice(1), demoted];
          updateStackPositionsImmediateZ();
          setActiveNav(deckRef.current[0]); setTopLayer(deckRef.current[0]);
        }, undefined, 0.35);

        cycleTl.to(demotedEl, { y: targetY, scale: targetScale, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
        if (demotedCover) cycleTl.to(demotedCover, { y: targetY, scale: targetScale, rotation: coverRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);

      } else if (direction < 0) {
        isAnimatingRef.current = true;
        setBookHovered(false);
        setFileHovered(false);

        const promoted = deck[deck.length - 1];
        const promotedEl = q(promoted);
        const promotedCover = coverOf(promoted);
        const elRot = parseTiltDeg(LAYER_TILT[promoted] ?? '');
        const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[promoted] ?? '');

        const cycleTl = gsap.timeline({ onComplete() { isAnimatingRef.current = false; } });

        cycleTl.to(promotedEl, { y: 180, scale: 0.94, rotation: elRot + 5, duration: 0.35, ease: 'power2.out' }, 0);
        if (promotedCover) cycleTl.to(promotedCover, { y: 180, scale: 0.94, rotation: coverRot + 5, duration: 0.35, ease: 'power2.out' }, 0);

        deck.slice(0, -1).forEach((layer, index) => {
          const el = q(layer);
          const cover = coverOf(layer);
          const newRank = index + 1;
          cycleTl.to(el, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
          if (cover) cycleTl.to(cover, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
        });

        cycleTl.call(() => {
          deckRef.current = [promoted, ...deck.slice(0, -1)];
          updateStackPositionsImmediateZ();
          setActiveNav(deckRef.current[0]); setTopLayer(deckRef.current[0]);
        }, undefined, 0.35);

        cycleTl.to(promotedEl, { y: 0, scale: 1.0, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
        if (promotedCover) cycleTl.to(promotedCover, { y: 0, scale: 1.0, rotation: coverRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (!wheelEnabledRef.current || isAnimatingRef.current) return;
      const endY = e.changedTouches[0].clientY;
      if (touchStartY - endY > 30) onWheel({ deltaY: 1 } as WheelEvent);
      else if (endY - touchStartY > 30) onWheel({ deltaY: -1 } as WheelEvent);
    };

    scene.addEventListener('wheel', onWheel, { passive: false });
    scene.addEventListener('touchstart', onTouchStart, { passive: true });
    scene.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      scene.removeEventListener('wheel', onWheel);
      scene.removeEventListener('touchstart', onTouchStart);
      scene.removeEventListener('touchend', onTouchEnd);
      remainingShiftTimersRef.current.forEach(clearTimeout);
      remainingShiftTimersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Restore position on close ────────────────────────────────────────────
  const closeLayer = useCallback((layer: LayerKey) => {
    const el = q(layer);
    const cover = coverOf(layer);
    if (!el) return;

    const rank = deckRef.current.indexOf(layer);
    const targetY = rank >= 0 ? rank * 10 : 0;
    const targetScale = rank >= 0 ? 1 - rank * 0.02 : 1;
    const elRot = parseTiltDeg(LAYER_TILT[layer] ?? '');
    const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[layer] ?? '');

    baseTransformsRef.current[layer] = LAYER_TILT[layer] ?? '';
    dragOffsets[layer] = { x: 0, y: 0 };

    gsap.to(el, { x: 0, y: targetY, rotation: elRot, scale: targetScale, ease: 'back.out(1.7)', duration: 0.6 });
    if (cover) gsap.to(cover, { x: 0, y: targetY, rotation: coverRot, scale: targetScale, ease: 'back.out(1.7)', duration: 0.6 });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bookOpen) closeLayer('book');
  }, [bookOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Book 3D opening animation ──────────────────────────────────────────
  useEffect(() => {
    const openEl = sceneRef.current?.querySelector('.book-open-container') as HTMLElement | null;
    if (!openEl) return;

    if (bookOpen) {
      openEl.style.display = 'block';
      gsap.fromTo(openEl,
        { scaleX: 0.1, rotationX: -20, opacity: 0, transformPerspective: 1200, transformOrigin: 'center center' },
        { scaleX: 1, rotationX: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.3)' }
      );
    } else {
      gsap.to(openEl, {
        scaleX: 0.1, rotationX: -20, opacity: 0,
        transformPerspective: 1200, transformOrigin: 'center center',
        duration: 0.6, ease: 'power3.in',
        onComplete() { openEl.style.display = 'none'; },
      });
    }
  }, [bookOpen]);

  // ─── File page expand / collapse ─────────────────────────────────────────
  const getFileRectInScene = useCallback((): { left: number; top: number; width: number; height: number } => {
    const cover = fileCoverRef.current;
    if (!cover) return { left: 560, top: 25, width: 913, height: 987 };
    const gx = (gsap.getProperty(cover, 'x') as number) || 0;
    const gy = (gsap.getProperty(cover, 'y') as number) || 0;
    const sc = (gsap.getProperty(cover, 'scale') as number) || 1;
    const fw = 612 * sc;
    const fh = 792 * sc;
    return { left: 720 + gx - fw / 2, top: 512 + gy - fh / 2, width: fw, height: fh };
  }, []);

  const closeFilePage = useCallback(() => {
    const page     = filePageRef.current;
    const backdrop = fileBackdropRef.current;
    if (!page) return;
    const { left, top, width, height } = getFileRectInScene();
    gsap.to(page, {
      left, top, width, height, opacity: 0, borderRadius: 32,
      duration: 0.5, ease: 'power3.inOut',
      onComplete() {
        page.style.display = 'none';
        if (backdrop) backdrop.style.display = 'none';
        fileOpenRef.current = false;
        setFileOpen(false);
        closeLayer('file');
      },
    });
    if (backdrop) gsap.to(backdrop, { opacity: 0, duration: 0.3 });
  }, [getFileRectInScene]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const page     = filePageRef.current;
    const backdrop = fileBackdropRef.current;
    if (!page || !fileOpen) return;
    const { left, top, width, height } = getFileRectInScene();
    page.style.display = 'flex';
    page.style.pointerEvents = 'auto';
    if (backdrop) backdrop.style.display = 'block';
    gsap.fromTo(page,
      { left, top, width, height, opacity: 0, borderRadius: 32 },
      { left: '11.11%', top: '11.72%', width: '77.78%', height: '88.28%', opacity: 1, borderRadius: 24, duration: 0.6, ease: 'power3.inOut' },
    );
    if (backdrop) gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  }, [fileOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag start ───────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const coverOf = (layer: string): HTMLDivElement | null =>
      layer === 'book' ? bookCoverRef.current :
      layer === 'file' ? fileCoverRef.current :
      layer === 'folder' ? folderCoverRef.current : null;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      const draggable = (['book', 'folder', 'file', 'paper'] as const).find((layer) => {
        const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
        const cover = coverOf(layer);
        return (el && el.contains(target)) || (cover && cover.contains(target));
      });
      if (!draggable) return;
      lastDragMovedRef.current = false; // reset before each drag

      // Seed dragOffsets and baseTransforms from current GSAP state
      const el = scene.querySelector(`[data-name="${draggable}"]`) as HTMLElement | null;
      if (el) {
        dragOffsets[draggable] = {
          x: (gsap.getProperty(el, 'x') as number) || 0,
          y: (gsap.getProperty(el, 'y') as number) || 0,
        };
        // Capture live scale/rotation so applyLayerTransform doesn't snap on first move
        const currentScale = (gsap.getProperty(el, 'scale') as number) || 1;
        const currentRot   = (gsap.getProperty(el, 'rotation') as number) || 0;
        baseTransformsRef.current[draggable] = `rotate(${currentRot}deg) scale(${currentScale})`;
      }

      const { x, y } = dragOffsets[draggable] ?? { x: 0, y: 0 };
      isDraggingRef.current = true;
      activeDragRef.current = {
        layer: draggable,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startOffsetX: x,
        startOffsetY: y,
        hasMoved: false,
      };
      document.body.style.userSelect = 'none';

      const coverEl = coverOf(draggable);
      if (el) el.style.zIndex = '200';
      if (coverEl) coverEl.style.zIndex = '201';
    };

    const preventNativeDrag = (e: Event) => e.preventDefault();
    scene.addEventListener('dragstart', preventNativeDrag);
    scene.addEventListener('mousedown', onMouseDown);
    return () => {
      scene.removeEventListener('dragstart', preventNativeDrag);
      scene.removeEventListener('mousedown', onMouseDown);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Promote layer to deck top ────────────────────────────────────────────
  const promoteLayerToTop = useCallback((layer: LayerKey) => {
    if (isAnimatingRef.current) return;
    const scene = sceneRef.current;
    if (!scene) return;
    isAnimatingRef.current = true;
    setBookHovered(false);
    setFileHovered(false);

    const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
    const cover = coverOf(layer);
    const deck = deckRef.current;
    const currentRank = deck.indexOf(layer);
    const elRot = parseTiltDeg(LAYER_TILT[layer] ?? '');
    const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[layer] ?? '');

    const promoteTl = gsap.timeline({ onComplete() { isAnimatingRef.current = false; } });

    promoteTl.to(el, { x: -220, y: -60, scale: 1.04, rotation: elRot - 5, duration: 0.35, ease: 'power2.out' }, 0);
    if (cover) promoteTl.to(cover, { x: -220, y: -60, scale: 1.04, rotation: coverRot - 5, duration: 0.35, ease: 'power2.out' }, 0);

    deck.forEach((l, rank) => {
      if (l === layer) return;
      const elOther = q(l);
      const coverOther = coverOf(l);
      const newRank = rank < currentRank ? rank + 1 : rank;
      promoteTl.to(elOther, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
      if (coverOther) promoteTl.to(coverOther, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
    });

    promoteTl.call(() => {
      deckRef.current = [layer, ...deck.filter((l) => l !== layer)];
      updateStackPositionsImmediateZ();
      setActiveNav(layer);
      setTopLayer(layer);
    }, undefined, 0.35);

    promoteTl.to(el, { x: 0, y: 0, scale: 1.0, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
    if (cover) promoteTl.to(cover, { x: 0, y: 0, scale: 1.0, rotation: coverRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
  }, [coverOf, updateStackPositionsImmediateZ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click handlers ───────────────────────────────────────────────────────
  const handleSceneClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (lastDragMovedRef.current) return;

      const target = e.target as HTMLElement;
      const scene = sceneRef.current;
      if (!scene) return;

      const clickedLayer = (FLIP_ORDER as string[]).find((layer) => {
        const el = q(layer as LayerKey);
        return el && (e.target === el || el.contains(e.target as Node));
      });
      const coverClicked = [bookCoverRef, fileCoverRef, folderCoverRef].some(
        (ref) => ref.current && (e.target === ref.current || ref.current.contains(e.target as Node))
      );
      if (!clickedLayer && !coverClicked) return;

      const hitLayer = (['book', 'folder', 'file', 'paper'] as const).find((layer) => {
        const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
        const cover = coverOf(layer);
        return (el && (target === el || el.contains(target))) || (cover && (target === cover || cover.contains(target)));
      }) ?? null;
      if (!hitLayer) return;

      const triggerToggle = () => {
        if (hitLayer === 'book') toggleBook();
        else if (hitLayer === 'file') toggleFile();
        // folder and paper: no open state yet
      };

      if (hitLayer === deckRef.current[0]) {
        // Already on top — toggle open/close
        triggerToggle();
      } else {
        // Not on top — just bring to front, no toggle
        promoteLayerToTop(hitLayer);
      }
    },
    [coverOf, promoteLayerToTop, toggleBook, toggleFile], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleNavClick = useCallback(
    (layer: LayerKey, e: React.MouseEvent) => {
      e.stopPropagation();
      if (layer === 'mat-grid') {
        setActiveNav('mat-grid');
        return;
      }
      setActiveNav(layer);
      const idx = deckRef.current.indexOf(layer);
      if (idx === 0) return;
      promoteLayerToTop(layer);
    },
    [promoteLayerToTop], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="overflow-hidden">
      <div
        ref={sceneRef}
        onClick={handleSceneClick}
        style={{
          position: 'absolute',
          width: '1440px',
          height: '1024px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(min(calc(100vw / 1440px), calc(100vh / 1024px)))',
          transformOrigin: 'center center',
        }}
      >
          <HomeImport />

          {/* ── Mat grid ─────────────────────────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              left: '160px',
              top: '100px',
              width: 'calc(100% - 320px)',
              height: 'calc(100% - 200px)',
              transform: 'rotate(-4deg)',
              transformOrigin: 'center center',
              zIndex: 10,
            }}
          >
            <MatGrid />
          </div>

          {/* ── Sticky note (date/time, draggable) ───────────────────────── */}
          <StickyNote scaleRef={scaleRef} />

          {/* ── Book cover overlay ────────────────────────────────────────── */}
          <div
            ref={bookCoverRef}
            className="absolute isolate pointer-events-none overflow-visible"
            style={{
              transform: LAYER_TILT['book'],
              transformOrigin: 'center center',
              display: 'flex',
              visibility: bookOpen ? 'hidden' : 'visible',
            }}
          >
            <div className="pointer-events-auto cursor-pointer">
              {bookHovered ? <BookHoverImg /> : <BookCover />}
            </div>
          </div>

          {/* ── Book open container ───────────────────────────────────────── */}
          <div
            className="book-open-container absolute cursor-pointer overflow-visible"
            style={{ left: 144, top: 137, width: 1152, height: 747, zIndex: 200, display: bookOpen ? 'block' : 'none' }}
            onClick={() => {
              bookOpenRef.current = false;
              setBookOpen(false);
              const btn = document.querySelector('[data-name="Book"]') as HTMLElement;
              if (btn) btn.style.opacity = '1';
            }}
          >
            <BookOpen />
          </div>

          {/* ── File overlay ─────────────────────────────────────────────── */}
          <div
            ref={fileCoverRef}
            className="absolute isolate pointer-events-none overflow-visible"
            style={{ transform: LAYER_TILT['file'], transformOrigin: 'center center' }}
          >
            <PurpleFile
              state={fileOpen ? 'open' : fileHovered ? 'hover' : 'closed'}
              className="pointer-events-auto cursor-pointer"
            />
          </div>

          {/* ── Folder overlay ────────────────────────────────────────────── */}
          <div
            ref={folderCoverRef}
            className="absolute isolate invisible pointer-events-none overflow-visible"
          >
            <div className="pointer-events-auto cursor-pointer">
              <FolderCard isActive={topLayer === 'folder'} />
            </div>
          </div>

          {/* ── Reactive nav overlay ──────────────────────────────────────── */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-end gap-2 whitespace-nowrap font-['Bricolage_Grotesque',sans-serif] text-xs leading-normal text-[#000912]"
            style={{ left: '1304px', zIndex: 600, fontWeight: 600 }}
          >
            {NAV_ITEMS.map(({ layer, label }) => (
              <div
                key={layer}
                onClick={(e) => handleNavClick(layer, e)}
                className="flex gap-2 items-start cursor-pointer select-none"
              >
                {activeNav === layer ? (
                  <><span>{label}</span><span>-</span></>
                ) : (
                  <span>{label}</span>
                )}
              </div>
            ))}
          </div>

          {/* ── File page backdrop ────────────────────────────────────────── */}
          <div
            ref={fileBackdropRef}
            onClick={closeFilePage}
            style={{ display: 'none', position: 'absolute', inset: 0, zIndex: 498, opacity: 0, cursor: 'default' }}
          />

          {/* ── File page overlay ─────────────────────────────────────────── */}
          <div
            ref={filePageRef}
            style={{
              display: 'none', position: 'absolute', background: '#ffffff',
              borderRadius: 24, zIndex: 499, opacity: 0, pointerEvents: 'none',
              overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.18)', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>Notes</p>
                <h2 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color: '#000912' }}>My Notes</h2>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); closeFilePage(); }}
                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#555', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }} />
          </div>

      </div>
    </div>
  );
}
