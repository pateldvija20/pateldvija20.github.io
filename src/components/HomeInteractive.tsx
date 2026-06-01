"use client";

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';
import HomeImport from '../imports/Home-1/Home-1-1716';
import BookOpen from '../imports/Home-1/Frame35';
import BookCover from '../imports/Frame31-1/Frame31-6-430';
import BookHoverImg from '../imports/BookHover/BookHover';
import FileClosed from '../imports/Frame36/Frame36';
import FileOpen from '../imports/FilePurple/FilePurple';
import FileHoverImg from '../imports/FileHover/FileHover';
import FolderDefault from '../imports/FolderYellow-7/FolderYellow-6-1565';
import FolderHover from '../imports/FolderYellow-3/FolderYellow-6-1194';
import FolderOpenView from '../imports/FolderYellow-5/FolderYellow-6-1333';

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

const SCATTER_TRANSFORMS: Record<string, string> = {
  book:   'translate(462px,  590px)  rotate(-18deg)',
  file:   'translate(-637px, 750px)  rotate(12deg)',
  folder: 'translate(-989px, -116px) rotate(-8deg)',
  paper:  'translate(454px,  -680px) rotate(22deg)',
};

// ~40% of desktop values; rotations identical; all positions stay within the
// scaled scene (393×279px rendered on a 393px-wide viewport at scale 0.273)
const SCATTER_TRANSFORMS_MOBILE: Record<string, string> = {
  book:   'translate(185px,  236px)  rotate(-18deg)',
  file:   'translate(-255px, 300px)  rotate(12deg)',
  folder: 'translate(-396px, -46px)  rotate(-8deg)',
  paper:  'translate(182px,  -272px) rotate(22deg)',
};

const getScatterTransform = (layer: string): string => {
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return SCATTER_TRANSFORMS_MOBILE[layer] ?? '';
  }
  return SCATTER_TRANSFORMS[layer] ?? '';
};

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

const parseScatterTransform = (t: string): { x: number; y: number; rotation: number } => {
  const tr = t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
  const ro = t.match(/rotate\((-?[\d.]+)deg\)/);
  return {
    x: tr ? parseFloat(tr[1]) : 0,
    y: tr ? parseFloat(tr[2]) : 0,
    rotation: ro ? parseFloat(ro[1]) : 0,
  };
};

const SCATTER_ORDER = ['book', 'file', 'folder', 'paper'] as const;
const SCATTER_DURATION = 500;
const STAGGER_MS = 40;

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
  const wheelEnabledRef = useRef(false);
  const modeRef = useRef<'scatter' | 'stacked'>('scatter');
  const loaderHiddenRef = useRef(false);
  const hasScatteredRef = useRef(false);
  const activeDragRef = useRef<DragState | null>(null);
  const scaleRef = useRef<number>(1);
  // Stores the base (non-drag) transform for each layer so drag offset can be composed on top
  const baseTransformsRef = useRef<Record<string, string>>({
    book: LAYER_TILT['book'] ?? '',
    folder: LAYER_TILT['folder'] ?? '',
    file: LAYER_TILT['file'] ?? '',
    paper: LAYER_TILT['paper'] ?? '',
  });

  const [activeNav, setActiveNav] = useState<LayerKey>('book');
  const [mode, setMode] = useState<'scatter' | 'stacked'>('scatter');
  const [bookOpen, setBookOpen] = useState(false);
  const bookOpenRef = useRef(false);
  const [fileOpen, setFileOpen] = useState(false);
  const fileOpenRef = useRef(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const folderOpenRef = useRef(false);
  const [folderHovered, setFolderHovered] = useState(false);
  const [bookHovered, setBookHovered] = useState(false);
  const [fileHovered, setFileHovered] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  const selectedLayerRef = useRef<LayerKey | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const remainingShiftTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Stable helper: always reads latest DOM state
  const q = (name: LayerKey): HTMLElement | null =>
    (sceneRef.current?.querySelector(`[data-name="${name}"]`) as HTMLElement | null) ?? null;

  const hideLoader = useCallback(() => {
    loaderHiddenRef.current = true;
  }, []);

  // ─── Stable DOM helpers ───────────────────────────────────────────────────
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
      if (el) {
        el.style.zIndex = String(z);
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (layer === 'paper') {
          const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'auto';
            child.style.cursor = 'pointer';
          }
        }
      }
      if (cover) {
        cover.style.zIndex = String(z + 1);
        cover.style.pointerEvents = 'none';
        cover.style.cursor = 'default';
        const child = cover.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
      }
    });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStackPositions = useCallback((animate: boolean) => {
    const deck = deckRef.current;
    deck.forEach((layer, rank) => {
      const el = q(layer);
      const cover = coverOf(layer);
      const z = DECK_Z[rank];

      // Update z-indices and interactions immediately
      if (el) {
        el.style.zIndex = String(z);
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (layer === 'paper') {
          const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'auto';
            child.style.cursor = 'pointer';
          }
        }
      }
      if (cover) {
        cover.style.zIndex = String(z + 1);
        cover.style.pointerEvents = 'none';
        cover.style.cursor = 'default';
        const child = cover.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
      }

      const targetY = rank * 10;
      const targetScale = 1 - rank * 0.02;
      const elRot = parseTiltDeg(LAYER_TILT[layer] ?? '');
      const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[layer] ?? '');

      if (animate) {
        gsap.to(el, {
          x: 0,
          y: targetY,
          scale: targetScale,
          rotation: elRot,
          opacity: 1,
          duration: 0.7,
          ease: 'back.out(1.6)',
        });
        if (cover) {
          gsap.to(cover, {
            x: 0,
            y: targetY,
            scale: targetScale,
            rotation: coverRot,
            opacity: 1,
            duration: 0.7,
            ease: 'back.out(1.6)',
          });
        }
      } else {
        if (el) {
          gsap.set(el, { x: 0, y: targetY, scale: targetScale, rotation: elRot, opacity: 1 });
        }
        if (cover) {
          gsap.set(cover, { x: 0, y: targetY, scale: targetScale, rotation: coverRot, opacity: 1 });
        }
      }
    });
  }, [coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag helpers ─────────────────────────────────────────────────────────
  // Compose translate(drag) + baseTransform and apply to el + its cover ref
  const applyLayerTransform = useCallback((layerKey: string, el: HTMLElement | null, coverEl: HTMLDivElement | null) => {
    const { x, y } = dragOffsets[layerKey] ?? { x: 0, y: 0 };
    const base = baseTransformsRef.current[layerKey] ?? '';
    const coverBase = layerKey === 'book' ? COVER_INIT_TRANSFORMS['book']
      : layerKey === 'file' ? COVER_INIT_TRANSFORMS['file']
      : layerKey === 'folder' ? COVER_INIT_TRANSFORMS['folder']
      : COVER_INIT_TRANSFORMS[layerKey] ?? '';
    const parsedBase = parseScatterTransform(base);
    const scaleMatch = base.match(/scale\(([\d.]+)\)/);
    const baseScale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    const coverRot = parseTiltDeg(coverBase);
    if (el) gsap.set(el, { x: parsedBase.x + x, y: parsedBase.y + y, rotation: parsedBase.rotation, scale: baseScale });
    if (coverEl) gsap.set(coverEl, { x: parsedBase.x + x, y: parsedBase.y + y, rotation: parsedBase.rotation + coverRot, scale: baseScale });
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
      console.log('[drag] move', activeDragRef.current?.layer, 'isDragging:', isDraggingRef.current, 'delta:', e.clientX, e.clientY);
      if (!isDraggingRef.current) return;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const drag = activeDragRef.current;
      if (!drag) return;
      const dx = (e.clientX - drag.startMouseX) / scaleRef.current;
      const dy = (e.clientY - drag.startMouseY) / scaleRef.current;
      if (!drag.hasMoved && Math.hypot(dx, dy) < 4) return;
      drag.hasMoved = true;
      dragOffsets[drag.layer] = {
        x: drag.startOffsetX + dx,
        y: drag.startOffsetY + dy,
      };
      const el = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
      const coverEl = coverOf(drag.layer);
      applyLayerTransform(drag.layer, el, coverEl);
    };

    const onMouseUp = (e: MouseEvent) => {
      console.log('[drag] end', activeDragRef.current?.layer, 'pos:', e.clientX, e.clientY);
      const drag = activeDragRef.current;
      if (!drag) return;

      if (drag.hasMoved && modeRef.current === 'scatter') {
        const el = sceneRef.current?.querySelector(`[data-name="${drag.layer}"]`) as HTMLElement | null;
        const coverEl = coverOf(drag.layer);
        const { x: mouseX, y: mouseY } = lastMouseRef.current;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isDesktop = vw >= 1024;
        const dx = Math.abs(mouseX - vw / 2);
        const dy = Math.abs(mouseY - vh / 2);
        const snapCenter = isDesktop
          ? dx < 275 * scaleRef.current
          : Math.hypot(dx, dy) < 120;

        if (snapCenter) {
          // Rule 4 snap: become selected, raise z
          selectedLayerRef.current = drag.layer as LayerKey;
          setSelectedLayer(drag.layer as LayerKey);
          dragOffsets[drag.layer] = { x: 0, y: 0 };
          if (el) el.style.zIndex = '100';
          if (coverEl) coverEl.style.zIndex = '100';
          gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'back.out(1.7)', duration: 0.7 });
          if (coverEl) gsap.to(coverEl, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'back.out(1.7)', duration: 0.7 });
        } else {
          // Rule 4 non-snap: return to scatter, lower z
          if (drag.layer === 'book' && bookOpenRef.current) {
            bookOpenRef.current = false;
            setBookOpen(false);
          } else if (drag.layer === 'file' && fileOpenRef.current) {
            fileOpenRef.current = false;
            setFileOpen(false);
          } else if (drag.layer === 'folder' && folderOpenRef.current) {
            folderOpenRef.current = false;
            setFolderOpen(false);
          }
          if (el) el.style.zIndex = '30';
          if (coverEl) coverEl.style.zIndex = '30';
          const parsed = parseScatterTransform(getScatterTransform(drag.layer) ?? '');
          dragOffsets[drag.layer] = { x: parsed.x, y: parsed.y };
          gsap.to(el, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'back.out(1.2)', duration: 0.6 });
          if (coverEl) gsap.to(coverEl, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'back.out(1.2)', duration: 0.6 });
          dragOffsets[drag.layer] = { x: 0, y: 0 };
          if (selectedLayerRef.current === drag.layer) {
            selectedLayerRef.current = null;
            setSelectedLayer(null);
          }
        }
      } else if (!drag.hasMoved) {
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

  // ─── Book hover + click ───────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = bookCoverRef.current;
    if (!coverEl) return;

    const btn = document.querySelector('[data-name="Book"]') as HTMLElement;

    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (modeRef.current === 'stacked' && 'book' !== deckRef.current[0]) return;
      if (!bookOpenRef.current) {
        setBookHovered(true);
        gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onLeave = () => {
      if (modeRef.current === 'stacked' && 'book' !== deckRef.current[0]) return;
      if (!bookOpenRef.current) {
        setBookHovered(false);
        gsap.to(coverEl, { rotation: -5.31, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onClick = () => {
      if (modeRef.current === 'stacked' && 'book' !== deckRef.current[0]) return;
      const next = !bookOpenRef.current;
      bookOpenRef.current = next;
      setBookOpen(next);
      if (next) setBookHovered(false);
      if (btn) btn.style.opacity = next ? '0' : '1';
      // closeLayer for book fires via useEffect after cover remounts
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    activeEl.addEventListener('click', onClick);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
      activeEl.removeEventListener('click', onClick);
    };
  }, [bookOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── File hover + click ───────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = fileCoverRef.current;
    if (!coverEl) return;

    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (modeRef.current === 'stacked' && 'file' !== deckRef.current[0]) return;
      if (!fileOpenRef.current) {
        setFileHovered(true);
        gsap.to(coverEl, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onLeave = () => {
      if (modeRef.current === 'stacked' && 'file' !== deckRef.current[0]) return;
      if (!fileOpenRef.current) {
        setFileHovered(false);
        gsap.to(coverEl, { rotation: -28.02, scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onClick = (e: Event) => {
      if (modeRef.current === 'stacked' && 'file' !== deckRef.current[0]) return;
      (e as MouseEvent).stopPropagation?.();
      const next = !fileOpenRef.current;
      fileOpenRef.current = next;
      setFileOpen(next);
      if (next) setFileHovered(false);
      if (!next) closeLayer('file');
    };

    activeEl.addEventListener('mouseenter', onEnter);
    activeEl.addEventListener('mouseleave', onLeave);
    activeEl.addEventListener('click', onClick);
    return () => {
      activeEl.removeEventListener('mouseenter', onEnter);
      activeEl.removeEventListener('mouseleave', onLeave);
      activeEl.removeEventListener('click', onClick);
    };
  }, [fileOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Folder hover + click ─────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = folderCoverRef.current;
    if (!coverEl) return;

    const activeEl = coverEl.firstElementChild as HTMLElement | null;
    if (!activeEl) return;

    const onEnter = () => {
      if (modeRef.current === 'stacked' && 'folder' !== deckRef.current[0]) return;
      if (!folderOpenRef.current) {
        setFolderHovered(true);
        gsap.to(coverEl, { scale: 1.03, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onLeave = () => {
      if (modeRef.current === 'stacked' && 'folder' !== deckRef.current[0]) return;
      if (!folderOpenRef.current) {
        setFolderHovered(false);
        gsap.to(coverEl, { scale: 1, duration: 0.6, ease: 'back.out(1.7)' });
      }
    };
    const onClick = () => {
      if (modeRef.current === 'stacked' && 'folder' !== deckRef.current[0]) return;
      const next = !folderOpenRef.current;
      folderOpenRef.current = next;
      setFolderOpen(next);
      if (!next) {
        setFolderHovered(false);
        closeLayer('folder');
      }
    };

    coverEl.addEventListener('mouseenter', onEnter);
    coverEl.addEventListener('mouseleave', onLeave);
    coverEl.addEventListener('click', onClick);
    return () => {
      coverEl.removeEventListener('mouseenter', onEnter);
      coverEl.removeEventListener('mouseleave', onLeave);
      coverEl.removeEventListener('click', onClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        const child = bookCoverRef.current.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
      }
      if (layer === 'file' && fileCoverRef.current) {
        fileCoverRef.current.style.zIndex = String(Z_BASE['file'] + 1);
        fileCoverRef.current.style.pointerEvents = 'none';
        const child = fileCoverRef.current.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
      }
      if (layer === 'folder' && folderCoverRef.current) {
        folderCoverRef.current.style.zIndex = String(Z_BASE['folder'] + 1);
        folderCoverRef.current.style.pointerEvents = 'none';
        const child = folderCoverRef.current.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
      }
      el.style.pointerEvents = 'none';
      if (layer === 'paper') {
        const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
      }
    });

    // Hide the static nav from import — we render a reactive overlay
    const navEl = scene.querySelector('[data-name="ui-nav-container"]') as HTMLElement | null;
    if (navEl) navEl.style.visibility = 'hidden';

    // Hide the old inline book visual — BookCover overlay replaces it
    const oldBtn = scene.querySelector('[data-name="Book"]') as HTMLElement | null;
    if (oldBtn) oldBtn.style.visibility = 'hidden';

    // Hide the old inline file visual — FileClosed overlay replaces it
    const oldFile = scene.querySelector('[data-name="file-purple"]') as HTMLElement | null;
    if (oldFile) oldFile.style.visibility = 'hidden';

    // Hide the old inline folder visual — FolderDefault overlay replaces it
    const oldFolder = scene.querySelector('[data-name="folder-yellow"]') as HTMLElement | null;
    if (oldFolder) oldFolder.style.visibility = 'hidden';

    // Allow original layers inside mat-grid to render outside its bounds without clipping
    const matEl = scene.querySelector('[data-name="mat-grid"]') as HTMLElement | null;
    if (matEl) matEl.style.overflow = 'visible';

    // Center all covers on the mat (left:170 top:112 w:1100 h:800 in the 1440×1024 scene)
    const centerOnMat = (coverEl: HTMLDivElement | null) => {
      if (!coverEl) return;
      coverEl.style.position = 'absolute';
      coverEl.style.left = '170px';
      coverEl.style.top = '112px';
      coverEl.style.width = '1100px';
      coverEl.style.height = '800px';
      coverEl.style.display = 'flex';
      coverEl.style.alignItems = 'center';
      coverEl.style.justifyContent = 'center';
      coverEl.style.overflow = 'visible'; // Prevent clipping of rotated/scaled covers
    };

    centerOnMat(bookCoverRef.current);
    centerOnMat(fileCoverRef.current);

    const coverEl = folderCoverRef.current;
    centerOnMat(coverEl);
    if (coverEl) {
      coverEl.style.visibility = 'visible';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Wheel-driven deck cycle ──────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const onWheel = (e: WheelEvent) => {
      if (!wheelEnabledRef.current) return;
      e.preventDefault();
      if (isAnimatingRef.current) return;

      const deck = deckRef.current;

      if (e.deltaY > 0) {
        // Scroll Down: demote top card to bottom
        isAnimatingRef.current = true;
        setBookHovered(false);
        setFileHovered(false);
        setFolderHovered(false);

        const demoted = deck[0];
        const demotedEl = q(demoted);
        const demotedCover = coverOf(demoted);

        const targetY = 3 * 10;
        const targetScale = 1 - 3 * 0.02;
        const elRot = parseTiltDeg(LAYER_TILT[demoted] ?? '');
        const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[demoted] ?? '');

        // Symmetrical GSAP scroll down timeline
        const cycleTl = gsap.timeline({
          onComplete() {
            isAnimatingRef.current = false;
          }
        });

        // 1. Lift and slide the top card up (to be clear of the deck)
        cycleTl.to(demotedEl, {
          y: -180,
          scale: 1.04,
          rotation: elRot - 5,
          duration: 0.35,
          ease: 'power2.out',
        }, 0);
        if (demotedCover) {
          cycleTl.to(demotedCover, {
            y: -180,
            scale: 1.04,
            rotation: coverRot - 5,
            duration: 0.35,
            ease: 'power2.out',
          }, 0);
        }

        // 2. Simultaneously shift remaining cards up
        deck.slice(1).forEach((layer, index) => {
          const el = q(layer);
          const cover = coverOf(layer);
          const newRank = index;
          const targetY = newRank * 10;
          const targetScale = 1 - newRank * 0.02;

          cycleTl.to(el, {
            y: targetY,
            scale: targetScale,
            duration: 0.5,
            ease: 'power3.out',
          }, 0);
          if (cover) {
            cycleTl.to(cover, {
              y: targetY,
              scale: targetScale,
              duration: 0.5,
              ease: 'power3.out',
            }, 0);
          }
        });

        // 3. Midpoint depth swap: put demoted card behind the stack
        cycleTl.call(() => {
          deckRef.current = [...deck.slice(1), demoted];
          updateStackPositionsImmediateZ();
          setActiveNav(deckRef.current[0]);
        }, undefined, 0.35);

        // 4. Slide demoted card down into its resting slot behind the other cards
        cycleTl.to(demotedEl, {
          y: targetY,
          scale: targetScale,
          rotation: elRot,
          duration: 0.45,
          ease: 'back.out(1.5)',
        }, 0.35);
        if (demotedCover) {
          cycleTl.to(demotedCover, {
            y: targetY,
            scale: targetScale,
            rotation: coverRot,
            duration: 0.45,
            ease: 'back.out(1.5)',
          }, 0.35);
        }

      } else if (e.deltaY < 0) {
        // Scroll Up: promote bottom card to top
        isAnimatingRef.current = true;
        setBookHovered(false);
        setFileHovered(false);
        setFolderHovered(false);

        const promoted = deck[deck.length - 1];
        const promotedEl = q(promoted);
        const promotedCover = coverOf(promoted);

        const targetY = 0;
        const targetScale = 1.0;
        const elRot = parseTiltDeg(LAYER_TILT[promoted] ?? '');
        const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[promoted] ?? '');

        // Symmetrical GSAP scroll up timeline
        const cycleTl = gsap.timeline({
          onComplete() {
            isAnimatingRef.current = false;
          }
        });

        // 1. Slide the bottom card out downwards (behind the stack)
        cycleTl.to(promotedEl, {
          y: 180,
          scale: 0.94,
          rotation: elRot + 5,
          duration: 0.35,
          ease: 'power2.out',
        }, 0);
        if (promotedCover) {
          cycleTl.to(promotedCover, {
            y: 180,
            scale: 0.94,
            rotation: coverRot + 5,
            duration: 0.35,
            ease: 'power2.out',
          }, 0);
        }

        // 2. Shift remaining cards down simultaneously
        deck.slice(0, -1).forEach((layer, index) => {
          const el = q(layer);
          const cover = coverOf(layer);
          const newRank = index + 1;
          const targetY = newRank * 10;
          const targetScale = 1 - newRank * 0.02;

          cycleTl.to(el, {
            y: targetY,
            scale: targetScale,
            duration: 0.5,
            ease: 'power3.out',
          }, 0);
          if (cover) {
            cycleTl.to(cover, {
              y: targetY,
              scale: targetScale,
              duration: 0.5,
              ease: 'power3.out',
            }, 0);
          }
        });

        // 3. Midpoint depth swap: put promoted card on top of the stack
        cycleTl.call(() => {
          deckRef.current = [promoted, ...deck.slice(0, -1)];
          updateStackPositionsImmediateZ();
          setActiveNav(deckRef.current[0]);
        }, undefined, 0.35);

        // 4. Slide promoted card up onto the top resting slot (in front of other cards)
        cycleTl.to(promotedEl, {
          y: targetY,
          scale: targetScale,
          rotation: elRot,
          duration: 0.45,
          ease: 'back.out(1.5)',
        }, 0.35);
        if (promotedCover) {
          cycleTl.to(promotedCover, {
            y: targetY,
            scale: targetScale,
            rotation: coverRot,
            duration: 0.45,
            ease: 'back.out(1.5)',
          }, 0.35);
        }
      }
    };

    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!wheelEnabledRef.current) return;
      if (isAnimatingRef.current) return;
      const endY = e.changedTouches[0].clientY;
      if (touchStartY - endY > 30) {
        // Swipe up → scroll-down branch
        const syntheticDown = { deltaY: 1 } as WheelEvent;
        onWheel(syntheticDown);
      } else if (endY - touchStartY > 30) {
        // Swipe down → scroll-up branch
        const syntheticUp = { deltaY: -1 } as WheelEvent;
        onWheel(syntheticUp);
      }
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

  // ─── Layer selection ──────────────────────────────────────────────────────
  const selectLayer = useCallback((layer: LayerKey) => {
    setActiveNav(layer);
    ALL_LAYERS.forEach((l) => {
      const el = q(l);
      if (!el) return;
      const coverEl =
        l === 'book' ? bookCoverRef.current :
        l === 'file' ? fileCoverRef.current :
        l === 'folder' ? folderCoverRef.current : null;
      const initRot = COVER_INIT_TRANSFORMS[l] ?? '';

      const SCATTER_Z = 30;
      if (l === layer) {
        baseTransformsRef.current[l] = 'rotate(0deg) scale(1.04)';
        dragOffsets[l] = { x: 0, y: 0 };
        el.style.zIndex = '100';
        if (coverEl) coverEl.style.zIndex = '100';
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (l === 'paper') {
          const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'auto';
            child.style.cursor = 'pointer';
          }
        }
        gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, duration: 0.6, ease: 'back.out(1.7)' });
        if (coverEl) {
          coverEl.style.pointerEvents = 'none';
          const child = coverEl.firstElementChild as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'auto';
            child.style.cursor = 'pointer';
          }
          gsap.to(coverEl, { x: 0, y: 0, rotation: parseTiltDeg(initRot), scale: 1.04, duration: 0.6, ease: 'back.out(1.7)' });
        }
      } else {
        el.style.zIndex = String(SCATTER_Z);
        if (coverEl) coverEl.style.zIndex = String(SCATTER_Z);
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (l === 'paper') {
          const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'none';
            child.style.cursor = 'default';
          }
        }
        if (coverEl) {
          coverEl.style.pointerEvents = 'none';
          const child = coverEl.firstElementChild as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'none';
            child.style.cursor = 'default';
          }
        }
        if (hasScatteredRef.current && getScatterTransform(l)) {
          const sp = parseScatterTransform(getScatterTransform(l));
          baseTransformsRef.current[l] = getScatterTransform(l);
          gsap.to(el, { x: sp.x, y: sp.y, rotation: sp.rotation, scale: 1, duration: 0.5, ease: 'power3.inOut' });
          if (coverEl) gsap.to(coverEl, { x: sp.x, y: sp.y, rotation: sp.rotation + parseTiltDeg(initRot), scale: 1, duration: 0.5, ease: 'power3.inOut' });
        } else {
          const tiltRot = parseTiltDeg(LAYER_TILT[l] ?? '');
          baseTransformsRef.current[l] = LAYER_TILT[l] ?? '';
          gsap.to(el, { x: 0, y: 0, rotation: tiltRot, scale: 1, duration: 0.5, ease: 'power3.inOut' });
          if (coverEl) gsap.to(coverEl, { x: 0, y: 0, rotation: parseTiltDeg(initRot), scale: 1, duration: 0.5, ease: 'power3.inOut' });
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Restore position on close ────────────────────────────────────────────
  const closeLayer = useCallback((layer: LayerKey) => {
    const el = q(layer);
    const cover = coverOf(layer);
    if (!el) return;

    if (modeRef.current === 'scatter') {
      if (selectedLayerRef.current === layer) {
        gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'back.out(1.7)', duration: 0.6 });
        if (cover) gsap.to(cover, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'back.out(1.7)', duration: 0.6 });
      } else {
        const parsed = parseScatterTransform(getScatterTransform(layer));
        gsap.to(el, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'back.out(1.7)', duration: 0.6 });
        if (cover) gsap.to(cover, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'back.out(1.7)', duration: 0.6 });
      }
    } else {
      const tiltDeg = parseTiltDeg(LAYER_TILT[layer] ?? '');
      gsap.to(el, { x: 0, y: 0, rotation: tiltDeg, scale: 1, ease: 'back.out(1.7)', duration: 0.6 });
      if (cover) gsap.to(cover, { x: 0, y: 0, rotation: tiltDeg, scale: 1, ease: 'back.out(1.7)', duration: 0.6 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Book cover remounts when bookOpen goes false — restore position after mount
  useEffect(() => {
    if (!bookOpen) {
      requestAnimationFrame(() => closeLayer('book'));
    }
  }, [bookOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scatter ──────────────────────────────────────────────────────────────
  const triggerScatter = useCallback(() => {
    if (hasScatteredRef.current) return;
    const scene = sceneRef.current;
    if (!scene) return;
    selectedLayerRef.current = null;
    setSelectedLayer(null);
    hasScatteredRef.current = true;

    const SCATTER_Z = 30;

    SCATTER_ORDER.forEach((layerKey, i) => {
      const delay = i * STAGGER_MS / 1000;
      const sp = parseScatterTransform(getScatterTransform(layerKey));

      const el = scene.querySelector(`[data-name="${layerKey}"]`) as HTMLElement | null;
      if (el) {
        baseTransformsRef.current[layerKey] = getScatterTransform(layerKey);
        dragOffsets[layerKey] = { x: 0, y: 0 };
        el.style.zIndex = String(SCATTER_Z);
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (layerKey === 'paper') {
          const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'auto';
            child.style.cursor = 'pointer';
          }
        }
        gsap.to(el, { x: sp.x, y: sp.y, rotation: sp.rotation, duration: SCATTER_DURATION / 1000, ease: 'back.out(1.7)', delay });
      }

      const coverRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        book: bookCoverRef, file: fileCoverRef, folder: folderCoverRef,
      };
      const coverRef = coverRefMap[layerKey];
      if (coverRef?.current) {
        coverRef.current.style.zIndex = String(SCATTER_Z);
        coverRef.current.style.pointerEvents = 'none';
        const child = coverRef.current.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
        gsap.to(coverRef.current, { x: sp.x, y: sp.y, rotation: sp.rotation, duration: SCATTER_DURATION / 1000, ease: 'back.out(1.7)', delay });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scatter on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    triggerScatter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Restack (reverse scatter) ────────────────────────────────────────────
  const reStack = useCallback(() => {
    if (!hasScatteredRef.current) return;
    const scene = sceneRef.current;
    if (!scene) return;
    selectedLayerRef.current = null;
    setSelectedLayer(null);
    hasScatteredRef.current = false;

    SCATTER_ORDER.forEach((layerKey, i) => {
      const el = scene.querySelector(`[data-name="${layerKey}"]`) as HTMLElement | null;
      const tiltRot = parseTiltDeg(LAYER_TILT[layerKey] ?? '');
      if (el) {
        baseTransformsRef.current[layerKey] = LAYER_TILT[layerKey] ?? '';
        dragOffsets[layerKey] = { x: 0, y: 0 };
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (layerKey === 'paper') {
          const child = el.querySelector('[data-name="paper-white"]') as HTMLElement | null;
          if (child) {
            child.style.pointerEvents = 'auto';
            child.style.cursor = 'pointer';
          }
        }
        gsap.to(el, { x: 0, y: 0, rotation: tiltRot, scale: 1, ease: 'back.out(1.5)', duration: 0.7, delay: i * 0.04 });
      }

      const coverRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        book: bookCoverRef, file: fileCoverRef, folder: folderCoverRef,
      };
      const coverRef = coverRefMap[layerKey];
      if (coverRef?.current) {
        coverRef.current.style.pointerEvents = 'none';
        const child = coverRef.current.firstElementChild as HTMLElement | null;
        if (child) {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        }
        gsap.to(coverRef.current, { x: 0, y: 0, rotation: parseTiltDeg(COVER_INIT_TRANSFORMS[layerKey] ?? ''), scale: 1, ease: 'back.out(1.5)', duration: 0.7, delay: i * 0.04 });
      }
    });

    updateStackPositionsImmediateZ();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag start (native mousedown on scene layers) ───────────────────────
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
      // Find which draggable layer was hit
      const draggable = (['book', 'folder', 'file', 'paper'] as const).find((layer) => {
        const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
        const cover = coverOf(layer);
        const hitEl = el && el.contains(target);
        const hitCover = cover && cover.contains(target);
        return hitEl || hitCover;
      });
      if (!draggable) return;
      console.log('[drag] start', draggable, e.clientX, e.clientY);
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
      // Lift dragged layer above everything else
      const el = scene.querySelector(`[data-name="${draggable}"]`) as HTMLElement | null;
      const coverEl = coverOf(draggable);
      if (el) { el.style.zIndex = '200'; }
      if (coverEl) { coverEl.style.zIndex = '201'; }
    };

    scene.addEventListener('mousedown', onMouseDown);
    return () => scene.removeEventListener('mousedown', onMouseDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Promote layer to deck top (shared by scene click + nav click) ──────────
  const promoteLayerToTop = useCallback((layer: LayerKey) => {
    if (isAnimatingRef.current) return;
    const scene = sceneRef.current;
    if (!scene) return;
    isAnimatingRef.current = true;

    setBookHovered(false);
    setFileHovered(false);
    setFolderHovered(false);

    const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
    const cover = coverOf(layer);
    const deck = deckRef.current;
    const currentRank = deck.indexOf(layer);

    const elRot = parseTiltDeg(LAYER_TILT[layer] ?? '');
    const coverRot = parseTiltDeg(COVER_INIT_TRANSFORMS[layer] ?? '');

    // 1. Slide the clicked card out to the side
    const promoteTl = gsap.timeline({
      onComplete() {
        isAnimatingRef.current = false;
      }
    });

    promoteTl.to(el, {
      x: -220,
      y: -60,
      scale: 1.04,
      rotation: elRot - 5,
      duration: 0.35,
      ease: 'power2.out',
    }, 0);
    if (cover) {
      promoteTl.to(cover, {
        x: -220,
        y: -60,
        scale: 1.04,
        rotation: coverRot - 5,
        duration: 0.35,
        ease: 'power2.out',
      }, 0);
    }

    // 2. Simultaneously shift other cards down/scale down
    deck.forEach((l, rank) => {
      if (l === layer) return;
      const elOther = q(l);
      const coverOther = coverOf(l);
      
      const newRank = rank < currentRank ? rank + 1 : rank;
      const targetY = newRank * 10;
      const targetScale = 1 - newRank * 0.02;

      promoteTl.to(elOther, {
        y: targetY,
        scale: targetScale,
        duration: 0.5,
        ease: 'power3.out',
      }, 0);
      if (coverOther) {
        promoteTl.to(coverOther, {
          y: targetY,
          scale: targetScale,
          duration: 0.5,
          ease: 'power3.out',
        }, 0);
      }
    });

    // 3. Midpoint depth swap: put promoted card on top
    promoteTl.call(() => {
      deckRef.current = [layer, ...deck.filter((l) => l !== layer)];
      updateStackPositionsImmediateZ();
      setActiveNav(layer);
    }, undefined, 0.35);

    // 4. Slide promoted card back to the center on top of the deck
    promoteTl.to(el, {
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: elRot,
      duration: 0.45,
      ease: 'back.out(1.5)',
    }, 0.35);
    if (cover) {
      promoteTl.to(cover, {
        x: 0,
        y: 0,
        scale: 1.0,
        rotation: coverRot,
        duration: 0.45,
        ease: 'back.out(1.5)',
      }, 0.35);
    }
  }, [coverOf, updateStackPositionsImmediateZ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click handlers ───────────────────────────────────────────────────────
  const handleSceneClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeDragRef.current?.hasMoved) return;

      const target = e.target as HTMLElement;
      const scene = sceneRef.current;
      if (!scene) return;

      // Guard: distinguish genuine mat background clicks from layer/cover clicks
      const clickedLayer = (FLIP_ORDER as string[]).find((layer) => {
        const el = q(layer as LayerKey);
        return el && (e.target === el || el.contains(e.target as Node));
      });
      const coverClicked = [bookCoverRef, fileCoverRef, folderCoverRef].some(
        (ref) => ref.current && (e.target === ref.current || ref.current.contains(e.target as Node))
      );
      if (!clickedLayer && !coverClicked) {
        if (modeRef.current === 'stacked') {
          handleModeToggle(e);
        }
        // scatter mode: mat click does nothing
        return;
      }

      const findHitLayer = () =>
        (['book', 'folder', 'file', 'paper'] as const).find((layer) => {
          const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
          const cover = coverOf(layer);
          const hitEl = el && (target === el || el.contains(target));
          const hitCover = cover && (target === cover || cover.contains(target));
          return hitEl || hitCover;
        }) ?? null;

      // ── Stacked mode ────────────────────────────────────────────────────
      if (modeRef.current === 'stacked') {
        const hitLayer = findHitLayer();
        if (!hitLayer) return; // mat click — no-op

        if (hitLayer === deckRef.current[0]) {
          // Top card: open/close handled by existing element listeners
          return;
        }

        // Non-top card: promote to top
        promoteLayerToTop(hitLayer);
        return;
      }

      // ── Scatter mode ─────────────────────────────────────────────────────
      const hitLayer = findHitLayer();
      if (!hitLayer) return;

      // Rule 3: clicking already-selected component → open/close handled by element listeners
      if (selectedLayerRef.current === hitLayer) return;

      // Rule 2: deselect previous, restore to scatter position
      const prev = selectedLayerRef.current;
      if (prev && prev !== hitLayer) {
        const prevEl = (scene.querySelector(`[data-name="${prev}"]`) as HTMLElement | null);
        const prevCover = coverOf(prev);
        const parsed = parseScatterTransform(getScatterTransform(prev) ?? '');
        if (prevEl) prevEl.style.zIndex = '30';
        if (prevCover) prevCover.style.zIndex = '30';
        gsap.to(prevEl, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power3.inOut', duration: 0.6 });
        if (prevCover) gsap.to(prevCover, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power3.inOut', duration: 0.6 });
        dragOffsets[prev] = { x: parsed.x, y: parsed.y };
      }

      // Rule 2: fly clicked card to center, raise z
      selectedLayerRef.current = hitLayer;
      setSelectedLayer(hitLayer);
      setActiveNav(hitLayer);
      const el = (scene.querySelector(`[data-name="${hitLayer}"]`) as HTMLElement | null);
      const cover = coverOf(hitLayer);
      if (el) el.style.zIndex = '100';
      if (cover) cover.style.zIndex = '100';
      dragOffsets[hitLayer] = { x: 0, y: 0 };
      gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'back.out(1.7)', duration: 0.7 });
      if (cover) gsap.to(cover, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'back.out(1.7)', duration: 0.7 });
    },
    [coverOf, promoteLayerToTop], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleNavClick = useCallback(
    (layer: LayerKey, e: React.MouseEvent) => {
      e.stopPropagation();
      if (layer === 'mat-grid') {
        triggerScatter();
        setActiveNav('mat-grid');
        return;
      }

      setActiveNav(layer);

      if (modeRef.current === 'stacked') {
        const idx = deckRef.current.indexOf(layer);
        if (idx === 0) return;
        promoteLayerToTop(layer);
        return;
      }

      // Scatter mode
      if (!hasScatteredRef.current) {
        hasScatteredRef.current = false;
        triggerScatter();
        setTimeout(() => selectLayer(layer),
          SCATTER_DURATION + STAGGER_MS * (SCATTER_ORDER.length - 1));
      } else {
        selectLayer(layer);
      }
    },
    [triggerScatter, selectLayer, promoteLayerToTop], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Mode toggle ──────────────────────────────────────────────────────────
  const handleModeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (modeRef.current === 'scatter') {
      // Scatter → Stacked
      setBookOpen(false);
      bookOpenRef.current = false;
      setFileOpen(false);
      fileOpenRef.current = false;
      setFolderOpen(false);
      folderOpenRef.current = false;
      hasScatteredRef.current = false;
      selectedLayerRef.current = null;
      setSelectedLayer(null);

      updateStackPositions(true);
      wheelEnabledRef.current = true;
      modeRef.current = 'stacked';
      setMode('stacked');
    } else {
      // Stacked → Scatter
      selectedLayerRef.current = null;
      setSelectedLayer(null);
      setBookOpen(false);
      bookOpenRef.current = false;
      setFileOpen(false);
      fileOpenRef.current = false;
      setFolderOpen(false);
      folderOpenRef.current = false;
      hasScatteredRef.current = false;
      triggerScatter();
      wheelEnabledRef.current = false;
      modeRef.current = 'scatter';
      setMode('scatter');
    }
  }, [triggerScatter, coverOf]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="overflow-hidden">
      {/* Fixed-size 1440×1024 scene, centered in the viewport */}
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

          {/* ── Book cover overlay (replaces old inline book visual) ──────── */}
          {!bookOpen && (
            <div
              ref={bookCoverRef}
              className="absolute isolate pointer-events-none overflow-visible"
              style={{
                transform: LAYER_TILT['book'],
                transformOrigin: 'center center',
              }}
            >
              <div className="pointer-events-auto cursor-pointer">
                {bookHovered ? <BookHoverImg /> : <BookCover />}
              </div>
            </div>
          )}

          {bookOpen && (
            <div
              className="absolute cursor-pointer"
              style={{
                left: 144,
                top: 137,
                width: 1152,
                height: 747,
                zIndex: 200,
              }}
              onClick={() => {
                bookOpenRef.current = false;
                setBookOpen(false);
                const btn = document.querySelector('[data-name="Book"]') as HTMLElement;
                if (btn) btn.style.opacity = '1';
                // closeLayer fires via useEffect after cover remounts
              }}
            >
              <BookOpen />
            </div>
          )}

          {/* ── File overlay (always mounted — closed or open) ───────────── */}
          <div
            ref={fileCoverRef}
            className="absolute isolate pointer-events-none overflow-visible"
            style={{
              transform: LAYER_TILT['file'],
              transformOrigin: 'center center',
            }}
          >
            <div className="pointer-events-auto cursor-pointer">
              {fileOpen ? <FileOpen /> : fileHovered ? <FileHoverImg /> : <FileClosed />}
            </div>
          </div>

          {/* ── Folder overlay (default / hover / open) ───────────────────── */}
          {/* Position and visibility are set dynamically in initial setup useEffect */}
          <div
            ref={folderCoverRef}
            className="absolute isolate invisible pointer-events-none overflow-visible"
          >
            <div className="pointer-events-auto cursor-pointer">
              {folderOpen
                ? <FolderOpenView />
                : folderHovered
                ? <FolderHover />
                : <FolderDefault />}
            </div>
          </div>

          {/* ── Reactive nav overlay ──────────────────────────────────────── */}
          {/* Matches the import's nav: left:1304px, vertically centered */}
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
                  <>
                    <span>{label}</span>
                    <span>-</span>
                  </>
                ) : (
                  <span>{label}</span>
                )}
              </div>
            ))}
            {/* Mode toggle — desktop (viewport ≥ 1024px) */}
            <button
              onClick={handleModeToggle}
              className="mode-toggle-desktop font-['Bricolage_Grotesque',sans-serif] text-xs text-[#000912] bg-transparent border-none p-0 cursor-pointer select-none"
            >
              {mode === 'scatter' ? 'Stacked' : 'Scatter'}
            </button>
          </div>

          {/* Mode toggle — mobile (viewport < 1024px), top-left below date/time */}
          <button
            className="mode-toggle-mobile absolute font-['Bricolage_Grotesque',sans-serif] text-xs text-[#000912] bg-transparent border-none p-0 cursor-pointer select-none"
            onClick={handleModeToggle}
            style={{ top: '80px', left: '36px', zIndex: 600, fontWeight: 600 }}
          >
            {mode === 'scatter' ? 'Stacked' : 'Scatter'}
          </button>

          <style>{`
            @media (min-width: 1024px) { .mode-toggle-mobile { display: none; } }
            @media (max-width: 1023px) { .mode-toggle-desktop { display: none; } }
          `}</style>

      </div>
    </div>
  );
}
