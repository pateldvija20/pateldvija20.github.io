"use client";

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import HomeImport from '../imports/Home-1/Home-1-1716';
import BookOpen from '../imports/Home-1/Frame35';
import BookCover from '../imports/Frame31-1/Frame31-6-430';
import BookHoverImg from '../imports/BookHover/BookHover';
import { PurpleFile } from './PurpleFile';
import { FolderCard } from './FolderCard';
import { PageCard } from './FolderCard/PageCard';
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

const DECK_Z = [50, 40, 30, 20] as const;

// Scatter positions — offsets from scene centre (720, 512)
const SCATTER_TRANSFORMS: Record<string, { x: number; y: number; rotation: number }> = {
  book:   { x: -300, y: -180, rotation: -10 },
  folder: { x:  280, y: -200, rotation:   7 },
  file:   { x: -320, y:  160, rotation:  12 },
  paper:  { x:  290, y:  150, rotation:  -8 },
};

const randomTilt = (): number =>
  parseFloat(((Math.random() * 24) - 12).toFixed(2));

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
  { layer: 'book',     label: 'About' },
  { layer: 'folder',   label: 'Work' },
  { layer: 'file',     label: 'Notes' },
  { layer: 'paper',    label: 'Resume' },
  { layer: 'mat-grid', label: 'Playground' },
];

const isTouchDevice = () => typeof window !== 'undefined' && 'ontouchstart' in window;

export function HomeInteractive() {
  const sceneRef        = useRef<HTMLDivElement>(null);
  const bookCoverRef    = useRef<HTMLDivElement>(null);
  const fileCoverRef    = useRef<HTMLDivElement>(null);
  const folderCoverRef  = useRef<HTMLDivElement>(null);
  const deckRef         = useRef<LayerKey[]>([...FLIP_ORDER]);
  const isAnimatingRef  = useRef(false);
  const isDraggingRef   = useRef(false);
  const lastDragMovedRef = useRef(false);
  const stickyDraggingRef = useRef(false);
  const wheelEnabledRef   = useRef(true);
  const hasScatteredRef   = useRef(false);
  const isInitializedRef  = useRef(false);
  const activeDragRef   = useRef<DragState | null>(null);
  const scaleRef        = useRef<number>(1);
  const layerTiltRef    = useRef<Record<string, number>>({
    book: randomTilt(), folder: randomTilt(), file: randomTilt(), paper: randomTilt(),
  });
  const baseTransformsRef = useRef<Record<string, string>>({
    book:   `rotate(${layerTiltRef.current.book}deg)`,
    folder: `rotate(${layerTiltRef.current.folder}deg)`,
    file:   `rotate(${layerTiltRef.current.file}deg)`,
    paper:  `rotate(${layerTiltRef.current.paper}deg)`,
  });

  const [activeNav,   setActiveNav]   = useState<LayerKey>('book');
  const [topLayer,    setTopLayer]    = useState<LayerKey>('book');
  const [bookOpen,    setBookOpen]    = useState(false);
  const bookOpenRef   = useRef(false);
  const [fileOpen,       setFileOpen]       = useState(false);
  const fileOpenRef      = useRef(false);
  const [fileOriginRect, setFileOriginRect] = useState<DOMRect | null>(null);
  const [bookHovered, setBookHovered] = useState(false);
  const [fileHovered, setFileHovered] = useState(false);
  const [stickyDragging, setStickyDragging] = useState(false);

  // Nav layout + portrait detection
  const [navMobile,    setNavMobile]    = useState(false);
  const [portraitMode, setPortraitMode] = useState(false);
  useEffect(() => {
    const check = () => {
      setNavMobile(window.innerWidth < 1024);
      setPortraitMode(window.innerWidth < 1024 && window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const q = (name: LayerKey): HTMLElement | null =>
    (sceneRef.current?.querySelector(`[data-name="${name}"]`) as HTMLElement | null) ?? null;

  const coverOf = useCallback((layer: string): HTMLDivElement | null =>
    layer === 'book'   ? bookCoverRef.current :
    layer === 'file'   ? fileCoverRef.current :
    layer === 'folder' ? folderCoverRef.current : null
  , []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStackPositionsImmediateZ = useCallback(() => {
    const deck = deckRef.current;
    deck.forEach((layer, rank) => {
      const el    = q(layer);
      const cover = coverOf(layer);
      const z     = DECK_Z[rank];
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
      const el    = q(layer);
      const cover = coverOf(layer);
      const z     = DECK_Z[rank];

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

      const targetY     = rank * 10;
      const targetScale = 1 - rank * 0.02;
      const elRot       = layerTiltRef.current[layer] ?? 0;

      if (animate) {
        gsap.to(el, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' });
        if (cover) gsap.to(cover, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1, duration: 0.7, ease: 'back.out(1.6)' });
      } else {
        if (el) gsap.set(el, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1 });
        if (cover) gsap.set(cover, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1 });
      }
    });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag helpers ─────────────────────────────────────────────────────────
  const applyLayerTransform = useCallback((layerKey: string, el: HTMLElement | null, coverEl: HTMLDivElement | null) => {
    const { x, y } = dragOffsets[layerKey] ?? { x: 0, y: 0 };
    const base      = baseTransformsRef.current[layerKey] ?? '';
    const parsedBase = parseTransform(base);
    const scaleMatch = base.match(/scale\(([\d.]+)\)/);
    const baseScale  = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

    const appliedX   = parsedBase.x + x;
    const appliedY   = parsedBase.y + y;
    const appliedRot = parsedBase.rotation;

    if (el) gsap.set(el, { x: appliedX, y: appliedY, rotation: appliedRot, scale: baseScale });
    if (coverEl) gsap.set(coverEl, { x: appliedX, y: appliedY, rotation: appliedRot, scale: baseScale });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Global scroll lock ───────────────────────────────────────────────────
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
    document.body.style.width    = '100%';
    document.body.style.height   = '100%';
    return () => {
      document.documentElement.style.overflow = original.overflow;
      document.body.style.overflow            = original.bodyOverflow;
      document.body.style.position            = original.position;
      document.body.style.width               = '';
      document.body.style.height              = '';
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

  // ─── Drag event handlers (mouse + touch) ─────────────────────────────────
  useEffect(() => {
    const onMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const drag = activeDragRef.current;
      if (!drag) return;
      const dx = (clientX - drag.startMouseX) / scaleRef.current;
      const dy = (clientY - drag.startMouseY) / scaleRef.current;
      if (!drag.hasMoved && Math.hypot(dx, dy) < 4) return;
      drag.hasMoved = true;
      lastDragMovedRef.current = true;
      dragOffsets[drag.layer] = { x: drag.startOffsetX + dx, y: drag.startOffsetY + dy };
      const el      = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
      const coverEl = coverOf(drag.layer);
      applyLayerTransform(drag.layer, el, coverEl);
    };

    const onEnd = () => {
      const drag = activeDragRef.current;
      if (!drag) return;

      if (drag.hasMoved) {
        const el      = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
        const coverEl = coverOf(drag.layer);
        const base    = baseTransformsRef.current[drag.layer] ?? '';
        const parsedBase = parseTransform(base);
        let finalX = parsedBase.x + dragOffsets[drag.layer].x;
        let finalY = parsedBase.y + dragOffsets[drag.layer].y;

        // 30% visibility clamp
        const scene = sceneRef.current;
        if (scene && el) {
          const rect   = scene.getBoundingClientRect();
          const scale  = scaleRef.current;
          const elW    = el.offsetWidth  * scale;
          const elH    = el.offsetHeight * scale;
          const centerVPX = rect.left + (720 + finalX) * scale;
          const centerVPY = rect.top  + (512 + finalY) * scale;
          const clampedVPX = Math.max(-elW * 0.2, Math.min(window.innerWidth  + elW * 0.2, centerVPX));
          const clampedVPY = Math.max(-elH * 0.2, Math.min(window.innerHeight + elH * 0.2, centerVPY));
          finalX = (clampedVPX - rect.left) / scale - 720;
          finalY = (clampedVPY - rect.top)  / scale - 512;
        }

        if (drag.layer === 'book' && bookOpenRef.current) { bookOpenRef.current = false; setBookOpen(false); }
        else if (drag.layer === 'file' && fileOpenRef.current) { fileOpenRef.current = false; setFileOpen(false); }

        const rank = deckRef.current.indexOf(drag.layer as LayerKey);
        if (el) el.style.zIndex = String(DECK_Z[rank] ?? 30);
        if (coverEl) coverEl.style.zIndex = String((DECK_Z[rank] ?? 30) + 1);
        const newTilt = randomTilt();
        layerTiltRef.current[drag.layer] = newTilt;
        const customPos = `translate(${finalX}px, ${finalY}px) rotate(${newTilt}deg) scale(1)`;
        baseTransformsRef.current[drag.layer] = customPos;
        dragOffsets[drag.layer] = { x: 0, y: 0 };
        gsap.to(el, { x: finalX, y: finalY, rotation: newTilt, scale: 1, ease: 'back.out(1.2)', duration: 0.4 });
        if (coverEl) gsap.to(coverEl, { x: finalX, y: finalY, rotation: newTilt, scale: 1, ease: 'back.out(1.2)', duration: 0.4 });
      } else {
        dragOffsets[drag.layer] = { x: drag.startOffsetX, y: drag.startOffsetY };
      }

      isDraggingRef.current  = false;
      activeDragRef.current  = null;
      document.body.style.userSelect = '';
      document.body.style.cursor     = '';
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onMouseUp   = () => onEnd();
    const onTouchMove = (e: TouchEvent) => { if (isDraggingRef.current) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd  = () => onEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend',  onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend',  onTouchEnd);
    };
  }, [applyLayerTransform, coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Toggle callbacks ─────────────────────────────────────────────────────
  const toggleBook = useCallback(() => {
    const coverEl = bookCoverRef.current;
    const btn     = document.querySelector('[data-name="Book"]') as HTMLElement;
    const next    = !bookOpenRef.current;
    bookOpenRef.current = next;
    setBookOpen(next);
    if (next) setBookHovered(false);
    if (btn) btn.style.opacity = next ? '0' : '1';
    if (!next && coverEl) gsap.to(coverEl, { rotation: layerTiltRef.current.book, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFile = useCallback(() => {
    const next = !fileOpenRef.current;
    fileOpenRef.current = next;
    setFileOpen(next);
    if (next) {
      setFileHovered(false);
      setFileOriginRect(fileCoverRef.current?.getBoundingClientRect() ?? null);
    } else {
      closeLayer('file');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Book hover ───────────────────────────────────────────────────────────
  useEffect(() => {
    const coverEl  = bookCoverRef.current;
    if (!coverEl) return;
    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (stickyDraggingRef.current) return;
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
        gsap.to(coverEl, { rotation: layerTiltRef.current.book, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
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
    const coverEl  = fileCoverRef.current;
    if (!coverEl) return;
    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (stickyDraggingRef.current) return;
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
        gsap.to(coverEl, { rotation: layerTiltRef.current.file, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
    };
  }, [fileOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Folder hover ─────────────────────────────────────────────────────────
  useEffect(() => {
    const coverEl  = folderCoverRef.current;
    if (!coverEl) return;
    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (stickyDraggingRef.current) return;
      if (deckRef.current[0] !== 'folder') return;
      gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
    };
    const onLeave = () => {
      if (deckRef.current[0] !== 'folder') return;
      gsap.to(coverEl, { rotation: layerTiltRef.current.folder, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Paper hover ──────────────────────────────────────────────────────────
  useEffect(() => {
    const scene   = sceneRef.current;
    if (!scene) return;
    const paperEl  = scene.querySelector('[data-name="paper"]') as HTMLElement | null;
    const activeEl = paperEl?.querySelector('[data-name="paper-white"]') as HTMLElement | null;
    if (!paperEl || !activeEl) return;

    const onEnter = () => {
      if (stickyDraggingRef.current) return;
      if (deckRef.current[0] !== 'paper') return;
      gsap.to(paperEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
    };
    const onLeave = () => {
      if (deckRef.current[0] !== 'paper') return;
      gsap.to(paperEl, { rotation: layerTiltRef.current.paper, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Mobile hover: fire on topLayer change ────────────────────────────────
  useEffect(() => {
    if (!isTouchDevice() || !isInitializedRef.current) return;

    // Apply hover to the new top layer
    if (topLayer === 'book' && !bookOpenRef.current) {
      setBookHovered(true);
      const coverEl = bookCoverRef.current;
      if (coverEl) gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
    } else if (topLayer === 'file' && !fileOpenRef.current) {
      setFileHovered(true);
      const coverEl = fileCoverRef.current;
      if (coverEl) gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
    } else if (topLayer === 'folder') {
      const coverEl = folderCoverRef.current;
      if (coverEl) gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
    } else if (topLayer === 'paper') {
      const scene   = sceneRef.current;
      const paperEl = scene?.querySelector('[data-name="paper"]') as HTMLElement | null;
      if (paperEl) gsap.to(paperEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
    }

    // Clear hover on layers that are no longer on top
    const prevBook = topLayer !== 'book';
    const prevFile = topLayer !== 'file';
    const prevFolder = topLayer !== 'folder';
    const prevPaper = topLayer !== 'paper';

    if (prevBook && !bookOpenRef.current) {
      setBookHovered(false);
      const coverEl = bookCoverRef.current;
      if (coverEl) gsap.to(coverEl, { rotation: layerTiltRef.current.book, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
    if (prevFile && !fileOpenRef.current) {
      setFileHovered(false);
      const coverEl = fileCoverRef.current;
      if (coverEl) gsap.to(coverEl, { rotation: layerTiltRef.current.file, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
    if (prevFolder) {
      const coverEl = folderCoverRef.current;
      if (coverEl) gsap.to(coverEl, { rotation: layerTiltRef.current.folder, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
    if (prevPaper) {
      const scene   = sceneRef.current;
      const paperEl = scene?.querySelector('[data-name="paper"]') as HTMLElement | null;
      if (paperEl) gsap.to(paperEl, { rotation: layerTiltRef.current.paper, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
    }
  }, [topLayer]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const navEl    = scene.querySelector('[data-name="ui-nav-container"]') as HTMLElement | null;
    if (navEl) navEl.style.visibility = 'hidden';
    const oldBtn   = scene.querySelector('[data-name="Book"]') as HTMLElement | null;
    if (oldBtn) oldBtn.style.visibility = 'hidden';
    const oldFile  = scene.querySelector('[data-name="file-purple"]') as HTMLElement | null;
    if (oldFile) oldFile.style.visibility = 'hidden';
    const oldFolder = scene.querySelector('[data-name="folder-yellow"]') as HTMLElement | null;
    if (oldFolder) oldFolder.style.visibility = 'hidden';
    const matEl    = scene.querySelector('[data-name="mat-grid"]') as HTMLElement | null;
    if (matEl) matEl.style.overflow = 'visible';

    const centerOnMat = (coverEl: HTMLDivElement | null) => {
      if (!coverEl) return;
      coverEl.style.position       = 'absolute';
      coverEl.style.left           = '160px';
      coverEl.style.top            = '100px';
      coverEl.style.width          = '1120px';
      coverEl.style.height         = '824px';
      coverEl.style.display        = 'flex';
      coverEl.style.alignItems     = 'center';
      coverEl.style.justifyContent = 'center';
      coverEl.style.overflow       = 'visible';
    };

    centerOnMat(bookCoverRef.current);
    centerOnMat(fileCoverRef.current);
    const folderCover = folderCoverRef.current;
    centerOnMat(folderCover);
    if (folderCover) folderCover.style.visibility = 'visible';

    updateStackPositions(false);
    isInitializedRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Wheel + touch deck cycle ─────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let deltaAccumulator = 0;
    const DELTA_THRESHOLD = 60;

    const cycle = (direction: 1 | -1) => {
      if (!wheelEnabledRef.current || isAnimatingRef.current) return;
      const deck = deckRef.current;

      if (direction > 0) {
        isAnimatingRef.current = true;
        setBookHovered(false);
        setFileHovered(false);

        const demoted      = deck[0];
        const demotedEl    = q(demoted);
        const demotedCover = coverOf(demoted);
        const targetY      = 3 * 10;
        const targetScale  = 1 - 3 * 0.02;
        const elRot        = layerTiltRef.current[demoted] ?? 0;

        const cycleTl = gsap.timeline({ onComplete() { isAnimatingRef.current = false; } });
        cycleTl.to(demotedEl, { y: -180, scale: 1.04, rotation: elRot - 5, duration: 0.35, ease: 'power2.out' }, 0);
        if (demotedCover) cycleTl.to(demotedCover, { y: -180, scale: 1.04, rotation: elRot - 5, duration: 0.35, ease: 'power2.out' }, 0);

        deck.slice(1).forEach((layer, index) => {
          const el    = q(layer);
          const cover = coverOf(layer);
          const newRank = index;
          cycleTl.to(el, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
          if (cover) cycleTl.to(cover, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
        });

        cycleTl.call(() => {
          deckRef.current = [...deck.slice(1), demoted];
          updateStackPositionsImmediateZ();
          setActiveNav(deckRef.current[0]);
          setTopLayer(deckRef.current[0]);
        }, undefined, 0.35);

        cycleTl.to(demotedEl, { y: targetY, scale: targetScale, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
        if (demotedCover) cycleTl.to(demotedCover, { y: targetY, scale: targetScale, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);

      } else {
        isAnimatingRef.current = true;
        setBookHovered(false);
        setFileHovered(false);

        const promoted      = deck[deck.length - 1];
        const promotedEl    = q(promoted);
        const promotedCover = coverOf(promoted);
        const elRot         = layerTiltRef.current[promoted] ?? 0;

        const cycleTl = gsap.timeline({ onComplete() { isAnimatingRef.current = false; } });
        cycleTl.to(promotedEl, { y: 180, scale: 0.94, rotation: elRot + 5, duration: 0.35, ease: 'power2.out' }, 0);
        if (promotedCover) cycleTl.to(promotedCover, { y: 180, scale: 0.94, rotation: elRot + 5, duration: 0.35, ease: 'power2.out' }, 0);

        deck.slice(0, -1).forEach((layer, index) => {
          const el    = q(layer);
          const cover = coverOf(layer);
          const newRank = index + 1;
          cycleTl.to(el, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
          if (cover) cycleTl.to(cover, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
        });

        cycleTl.call(() => {
          deckRef.current = [promoted, ...deck.slice(0, -1)];
          updateStackPositionsImmediateZ();
          setActiveNav(deckRef.current[0]);
          setTopLayer(deckRef.current[0]);
        }, undefined, 0.35);

        cycleTl.to(promotedEl, { y: 0, scale: 1.0, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
        if (promotedCover) cycleTl.to(promotedCover, { y: 0, scale: 1.0, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      deltaAccumulator += e.deltaY;
      if (Math.abs(deltaAccumulator) < DELTA_THRESHOLD) return;
      const direction = deltaAccumulator > 0 ? 1 : -1;
      deltaAccumulator = 0;
      cycle(direction as 1 | -1);
    };

    let touchStartY = 0;
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const endX = e.changedTouches[0].clientX;
      const dy = endY - touchStartY;
      const dx = endX - touchStartX;
      // Vertical swipe: must be primarily vertical and exceed threshold
      if (Math.abs(dy) < 30 || Math.abs(dy) <= Math.abs(dx)) return;
      // Cancel any active drag so it doesn't also run to completion
      if (isDraggingRef.current) {
        const drag = activeDragRef.current;
        if (drag) {
          const el = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
          const cover = coverOf(drag.layer);
          // Snap card back to its pre-drag position
          gsap.to(el,    { x: drag.startOffsetX, y: drag.startOffsetY, duration: 0.15, ease: 'power2.out' });
          if (cover) gsap.to(cover, { x: drag.startOffsetX, y: drag.startOffsetY, duration: 0.15, ease: 'power2.out' });
          dragOffsets[drag.layer] = { x: drag.startOffsetX, y: drag.startOffsetY };
        }
        isDraggingRef.current   = false;
        activeDragRef.current   = null;
        lastDragMovedRef.current = false;
        document.body.style.userSelect = '';
      }
      if (dy < 0) cycle(1);
      else        cycle(-1);
    };

    scene.addEventListener('wheel',      onWheel,      { passive: false });
    scene.addEventListener('touchstart', onTouchStart, { passive: true });
    scene.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      scene.removeEventListener('wheel',      onWheel);
      scene.removeEventListener('touchstart', onTouchStart);
      scene.removeEventListener('touchend',   onTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Restore position on close ────────────────────────────────────────────
  const closeLayer = useCallback((layer: LayerKey) => {
    const el    = q(layer);
    const cover = coverOf(layer);
    if (!el) return;

    const rank        = deckRef.current.indexOf(layer);
    const targetY     = rank >= 0 ? rank * 10 : 0;
    const targetScale = rank >= 0 ? 1 - rank * 0.02 : 1;
    const elRot       = layerTiltRef.current[layer] ?? 0;

    baseTransformsRef.current[layer] = `rotate(${elRot}deg)`;
    dragOffsets[layer] = { x: 0, y: 0 };

    gsap.to(el, { x: 0, y: targetY, rotation: elRot, scale: targetScale, ease: 'back.out(1.7)', duration: 0.6 });
    if (cover) gsap.to(cover, { x: 0, y: targetY, rotation: elRot, scale: targetScale, ease: 'back.out(1.7)', duration: 0.6 });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bookOpen) closeLayer('book');
  }, [bookOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Book 3D opening animation ────────────────────────────────────────────
  useEffect(() => {
    const openEl = sceneRef.current?.querySelector('.book-open-container') as HTMLElement | null;
    if (!openEl) return;

    if (bookOpen) {
      openEl.style.display = 'block';
      gsap.fromTo(openEl,
        { scaleX: 0.1, rotationX: -20, opacity: 0, transformPerspective: 1200, transformOrigin: 'center center' },
        { scaleX: 1,   rotationX: 0,   opacity: 1, duration: 0.8, ease: 'back.out(1.3)' }
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

  const closeFilePage = useCallback(() => {
    fileOpenRef.current = false;
    setFileOpen(false);
    closeLayer('file');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag start (mouse + touch) ───────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const coverOf = (layer: string): HTMLDivElement | null =>
      layer === 'book'   ? bookCoverRef.current :
      layer === 'file'   ? fileCoverRef.current :
      layer === 'folder' ? folderCoverRef.current : null;

    const seedDrag = (target: HTMLElement, clientX: number, clientY: number) => {
      if (target.closest('[data-no-deck-drag]')) return;
      const draggable = (['book', 'folder', 'file', 'paper'] as const).find((layer) => {
        const el    = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
        const cover = coverOf(layer);
        return (el && el.contains(target)) || (cover && cover.contains(target));
      });
      if (!draggable) return;
      lastDragMovedRef.current = false;

      const el = scene.querySelector(`[data-name="${draggable}"]`) as HTMLElement | null;
      if (el) {
        dragOffsets[draggable] = {
          x: (gsap.getProperty(el, 'x') as number) || 0,
          y: (gsap.getProperty(el, 'y') as number) || 0,
        };
        const currentScale = (gsap.getProperty(el, 'scale') as number) || 1;
        const currentRot   = (gsap.getProperty(el, 'rotation') as number) || 0;
        baseTransformsRef.current[draggable] = `rotate(${currentRot}deg) scale(${currentScale})`;
      }

      const { x, y } = dragOffsets[draggable] ?? { x: 0, y: 0 };
      isDraggingRef.current = true;
      activeDragRef.current = {
        layer: draggable,
        startMouseX:  clientX,
        startMouseY:  clientY,
        startOffsetX: x,
        startOffsetY: y,
        hasMoved: false,
      };
      document.body.style.userSelect = 'none';

      const coverEl = coverOf(draggable);
      if (el) el.style.zIndex = '200';
      if (coverEl) coverEl.style.zIndex = '201';
    };

    const onMouseDown  = (e: MouseEvent) => { if (e.button === 0) seedDrag(e.target as HTMLElement, e.clientX, e.clientY); };
    const onTouchStart = (e: TouchEvent) => { seedDrag(e.touches[0].target as HTMLElement, e.touches[0].clientX, e.touches[0].clientY); };
    const preventNativeDrag = (e: Event) => e.preventDefault();

    scene.addEventListener('dragstart',  preventNativeDrag);
    scene.addEventListener('mousedown',  onMouseDown);
    scene.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      scene.removeEventListener('dragstart',  preventNativeDrag);
      scene.removeEventListener('mousedown',  onMouseDown);
      scene.removeEventListener('touchstart', onTouchStart);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scatter ──────────────────────────────────────────────────────────────
  const triggerScatter = useCallback(() => {
    if (hasScatteredRef.current) return;
    hasScatteredRef.current = true;
    wheelEnabledRef.current = false;

    const STAGGER = 80;
    FLIP_ORDER.forEach((layer, i) => {
      const el    = q(layer);
      const cover = coverOf(layer);
      const { x, y, rotation } = SCATTER_TRANSFORMS[layer];

      setTimeout(() => {
        const rank = deckRef.current.indexOf(layer);
        if (el) {
          el.style.zIndex      = String(DECK_Z[rank] ?? 30);
          el.style.pointerEvents = 'none';
          const child = el.firstElementChild as HTMLElement | null;
          if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
        }
        if (cover) {
          cover.style.zIndex       = String((DECK_Z[rank] ?? 30) + 1);
          cover.style.pointerEvents = 'none';
          const child = cover.firstElementChild as HTMLElement | null;
          if (child) { child.style.pointerEvents = 'auto'; child.style.cursor = 'pointer'; }
        }

        const tween = { x, y, rotation, scale: 1, duration: 0.7, ease: 'back.out(1.4)' };
        gsap.to(el,    tween);
        if (cover) gsap.to(cover, tween);

        baseTransformsRef.current[layer] = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(1)`;
        layerTiltRef.current[layer]      = rotation;
        dragOffsets[layer]               = { x: 0, y: 0 };
      }, i * STAGGER);
    });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Promote layer to deck top ────────────────────────────────────────────
  const promoteLayerToTop = useCallback((layer: LayerKey) => {
    if (isAnimatingRef.current) return;
    const scene = sceneRef.current;
    if (!scene) return;
    isAnimatingRef.current = true;
    setBookHovered(false);
    setFileHovered(false);

    const el    = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
    const cover = coverOf(layer);
    const deck  = deckRef.current;
    const currentRank = deck.indexOf(layer);
    const elRot = layerTiltRef.current[layer] ?? 0;

    const promoteTl = gsap.timeline({ onComplete() { isAnimatingRef.current = false; } });

    promoteTl.to(el,    { x: -220, y: -60, scale: 1.04, rotation: elRot - 5, duration: 0.35, ease: 'power2.out' }, 0);
    if (cover) promoteTl.to(cover, { x: -220, y: -60, scale: 1.04, rotation: elRot - 5, duration: 0.35, ease: 'power2.out' }, 0);

    deck.forEach((l, rank) => {
      if (l === layer) return;
      const elOther    = q(l);
      const coverOther = coverOf(l);
      const newRank    = rank < currentRank ? rank + 1 : rank;
      promoteTl.to(elOther, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
      if (coverOther) promoteTl.to(coverOther, { y: newRank * 10, scale: 1 - newRank * 0.02, duration: 0.5, ease: 'power3.out' }, 0);
    });

    promoteTl.call(() => {
      deckRef.current = [layer, ...deck.filter((l) => l !== layer)];
      updateStackPositionsImmediateZ();
      setActiveNav(layer);
      setTopLayer(layer);
    }, undefined, 0.35);

    promoteTl.to(el,    { x: 0, y: 0, scale: 1.0, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
    if (cover) promoteTl.to(cover, { x: 0, y: 0, scale: 1.0, rotation: elRot, duration: 0.45, ease: 'back.out(1.5)' }, 0.35);
  }, [coverOf, updateStackPositionsImmediateZ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click handlers ───────────────────────────────────────────────────────
  const handleSceneClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (lastDragMovedRef.current) return;

      const target = e.target as HTMLElement;
      const scene  = sceneRef.current;
      if (!scene) return;

      // Mat-grid click → scatter
      const matEl = scene.querySelector('[data-name="mat-grid"]') as HTMLElement | null;
      if (matEl && (target === matEl || matEl.contains(target))) {
        triggerScatter();
        return;
      }

      const clickedLayer = (FLIP_ORDER as string[]).find((layer) => {
        const el = q(layer as LayerKey);
        return el && (e.target === el || el.contains(e.target as Node));
      });
      const coverClicked = [bookCoverRef, fileCoverRef, folderCoverRef].some(
        (ref) => ref.current && (e.target === ref.current || ref.current.contains(e.target as Node))
      );
      if (!clickedLayer && !coverClicked) return;

      const hitLayer = (['book', 'folder', 'file', 'paper'] as const).find((layer) => {
        const el    = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
        const cover = coverOf(layer);
        return (el && (target === el || el.contains(target))) || (cover && (target === cover || cover.contains(target)));
      }) ?? null;
      if (!hitLayer) return;

      const triggerToggle = () => {
        if (hitLayer === 'book') toggleBook();
        else if (hitLayer === 'file') toggleFile();
      };

      if (hitLayer === deckRef.current[0]) {
        triggerToggle();
      } else {
        promoteLayerToTop(hitLayer);
      }
    },
    [coverOf, promoteLayerToTop, toggleBook, toggleFile, triggerScatter], // eslint-disable-line react-hooks/exhaustive-deps
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

  // ─── Nav style (desktop: right side vertical | mobile: top horizontal) ────
  const navStyle: React.CSSProperties = navMobile
    ? {
        position: 'absolute',
        top: '48px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '32px',
        zIndex: 600,
        whiteSpace: 'nowrap',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: '13px',
        fontWeight: 600,
        lineHeight: 'normal',
        color: '#000912',
      }
    : {
        position: 'absolute',
        top: '50%',
        left: '1304px',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        zIndex: 600,
        whiteSpace: 'nowrap',
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: 'normal',
        color: '#000912',
      };

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <div
        ref={sceneRef}
        onClick={handleSceneClick}
        style={{
          position: 'absolute',
          width: '1440px',
          height: '1024px',
          top: '50%',
          left: '50%',
          transform: portraitMode
            ? 'translate(-50%, -50%) scale(calc(100vh / 1024px))'
            : 'translate(-50%, -50%) scale(min(calc(100vw / 1440px), calc(100vh / 1024px)))',
          transformOrigin: 'center center',
        }}
      >
        <HomeImport />

        {/* ── Mat grid ───────────────────────────────────────────────────── */}
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

        {/* ── Sticky note ────────────────────────────────────────────────── */}
        <StickyNote scaleRef={scaleRef} onDragActiveChange={(active) => { stickyDraggingRef.current = active; setStickyDragging(active); }} />

        {/* ── Book cover overlay ─────────────────────────────────────────── */}
        <div
          ref={bookCoverRef}
          className="absolute isolate pointer-events-none overflow-visible"
          style={{
            transform: 'rotate(0deg)',
            transformOrigin: 'center center',
            display: 'flex',
            visibility: bookOpen ? 'hidden' : 'visible',
          }}
        >
          <div className="pointer-events-auto cursor-pointer">
            {bookHovered ? <BookHoverImg /> : <BookCover />}
          </div>
        </div>

        {/* ── Book open container ────────────────────────────────────────── */}
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

        {/* ── File overlay ───────────────────────────────────────────────── */}
        <div
          ref={fileCoverRef}
          className="absolute isolate pointer-events-none overflow-visible"
          style={{ transformOrigin: 'center center' }}
        >
          <PurpleFile
            state={fileOpen ? 'open' : fileHovered ? 'hover' : 'closed'}
            className="pointer-events-auto cursor-pointer"
          />
        </div>

        {/* ── Folder overlay ─────────────────────────────────────────────── */}
        <div
          ref={folderCoverRef}
          className="absolute isolate invisible pointer-events-none overflow-visible"
        >
          <div className="pointer-events-auto cursor-pointer">
            <FolderCard isActive={topLayer === 'folder' && !stickyDragging} />
          </div>
        </div>

        {/* ── Nav overlay ────────────────────────────────────────────────── */}
        <div style={navStyle}>
          {NAV_ITEMS.map(({ layer, label }) => (
            <div
              key={layer}
              onClick={(e) => handleNavClick(layer, e)}
              className="flex gap-2 items-start cursor-pointer select-none"
              style={{ display: 'inline-flex' }}
            >
              {activeNav === layer ? (
                <><span>{label}</span><span>-</span></>
              ) : (
                <span>{label}</span>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>

    {fileOpen && fileOriginRect && (
      <PageCard
        title="My Notes"
        subtitle="Notes"
        originRect={fileOriginRect}
        onDismiss={closeFilePage}
      />
    )}
    </>
  );
}
