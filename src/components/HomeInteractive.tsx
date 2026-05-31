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

  const syncZ = useCallback((deck: LayerKey[]) => {
    deck.forEach((layer, rank) => {
      const z = DECK_Z[rank];
      const el = (sceneRef.current?.querySelector(`[data-name="${layer}"]`) as HTMLElement | null) ?? null;
      const cover = coverOf(layer);
      if (el) {
        el.style.zIndex = String(z);
        el.style.pointerEvents = rank === 0 ? 'auto' : 'none';
        el.style.cursor = rank === 0 ? 'pointer' : 'default';
      }
      if (cover) cover.style.zIndex = String(z + 1);
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
          gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'power2.out', duration: 0.5 });
          if (coverEl) gsap.to(coverEl, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'power2.out', duration: 0.5 });
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
          gsap.to(el, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power2.in', duration: 0.4 });
          if (coverEl) gsap.to(coverEl, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power2.in', duration: 0.4 });
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
    const bookEl = q('book');
    if (!bookEl) return;

    const btn = bookEl.querySelector('[data-name="Book"]') as HTMLElement;

    const coverEl = bookCoverRef.current;

    const onEnter = () => {
      if (modeRef.current === 'stacked' && 'book' !== deckRef.current[0]) return;
      if (!bookOpenRef.current) setBookHovered(true);
    };
    const onLeave = () => {
      if (modeRef.current === 'stacked' && 'book' !== deckRef.current[0]) return;
      if (!bookOpenRef.current) setBookHovered(false);
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

    bookEl.addEventListener('mouseenter', onEnter);
    bookEl.addEventListener('mouseleave', onLeave);
    bookEl.addEventListener('click', onClick);
    return () => {
      bookEl.removeEventListener('mouseenter', onEnter);
      bookEl.removeEventListener('mouseleave', onLeave);
      bookEl.removeEventListener('click', onClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── File hover + click ───────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = fileCoverRef.current;
    if (!coverEl) return;

    const onEnter = () => {
      if (modeRef.current === 'stacked' && 'file' !== deckRef.current[0]) return;
      if (!fileOpenRef.current) {
        setFileHovered(true);
        gsap.to(coverEl, { rotation: 0, scale: 1.02, duration: 0.3, ease: 'power2.out' });
      }
    };
    const onLeave = () => {
      if (modeRef.current === 'stacked' && 'file' !== deckRef.current[0]) return;
      if (!fileOpenRef.current) {
        setFileHovered(false);
        gsap.to(coverEl, { rotation: -28.02, scale: 1, duration: 0.3, ease: 'power2.out' });
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

    coverEl.addEventListener('mouseenter', onEnter);
    coverEl.addEventListener('mouseleave', onLeave);
    coverEl.addEventListener('click', onClick);
    return () => {
      coverEl.removeEventListener('mouseenter', onEnter);
      coverEl.removeEventListener('mouseleave', onLeave);
      coverEl.removeEventListener('click', onClick);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Folder hover + click ─────────────────────────────────────────────────
  useEffect(() => {
    const coverEl = folderCoverRef.current;
    if (!coverEl) return;

    const onEnter = () => {
      if (modeRef.current === 'stacked' && 'folder' !== deckRef.current[0]) return;
      if (!folderOpenRef.current) setFolderHovered(true);
    };
    const onLeave = () => {
      if (modeRef.current === 'stacked' && 'folder' !== deckRef.current[0]) return;
      if (!folderOpenRef.current) setFolderHovered(false);
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
      }
      if (layer === 'file' && fileCoverRef.current) {
        fileCoverRef.current.style.zIndex = String(Z_BASE['file'] + 1);
      }
      if (layer === 'folder' && folderCoverRef.current) {
        folderCoverRef.current.style.zIndex = String(Z_BASE['folder'] + 1);
      }
      el.style.pointerEvents = layer === 'book' ? 'auto' : 'none';
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

    // Restore rounded-corner clipping on mat-grid — cover overlays are siblings
    // of HomeImport so they are unaffected by mat-grid's overflow property.
    const matEl = scene.querySelector('[data-name="mat-grid"]') as HTMLElement | null;
    if (matEl) matEl.style.overflow = 'hidden';

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
    };

    centerOnMat(bookCoverRef.current);
    centerOnMat(fileCoverRef.current);

    const coverEl = folderCoverRef.current;
    centerOnMat(coverEl);
    if (coverEl) {
      coverEl.style.overflow = 'visible';
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
        isAnimatingRef.current = true;
        const demoted = deck[0];
        const demotedEl = q(demoted);
        const demotedCover = coverOf(demoted);
        const tilt = LAYER_TILT[demoted] ?? '';
        const rotDeg = parseTiltDeg(tilt);

        // Exit behind stack (scale down + fade, short travel)
        gsap.to(demotedEl, {
          y: '60%',
          scale: 0.85,
          opacity: 0,
          rotation: rotDeg,
          duration: 0.7,
          ease: 'power1.inOut',
          onComplete() {
            deckRef.current = [...deck.slice(1), demoted];
            syncZ(deckRef.current);
            setActiveNav(deckRef.current[0]);

            // Snap below stack, then animate into resting bottom position
            gsap.set(demotedEl,    { y: '120%', scale: 1, opacity: 1, rotation: rotDeg });
            if (demotedCover) gsap.set(demotedCover, { y: '120%', scale: 1, opacity: 1, rotation: rotDeg });

            requestAnimationFrame(() => requestAnimationFrame(() => {
              baseTransformsRef.current[demoted] = `translateY(8px) scale(0.96) ${tilt}`.trim();
              dragOffsets[demoted] = { x: 0, y: 0 };
              gsap.to(demotedEl,    { y: 8, scale: 0.96, rotation: rotDeg, duration: 0.42, ease: 'back.out(1.7)' });
              if (demotedCover) gsap.to(demotedCover, { y: 8, scale: 0.96, rotation: rotDeg, duration: 0.42, ease: 'back.out(1.7)' });
            }));

            isAnimatingRef.current = false;
          },
        });
        if (demotedCover) {
          gsap.to(demotedCover, { y: '60%', scale: 0.85, opacity: 0, rotation: rotDeg, duration: 0.7, ease: 'power1.inOut' });
        }

        // Remaining layers shift visually — no deck state
        deck.slice(1).forEach((layer) => {
          const el = q(layer);
          const cover = coverOf(layer);
          const rot = parseTiltDeg(LAYER_TILT[layer] ?? '');
          gsap.to(el,    { y: 6, rotation: rot, duration: 0.55, ease: 'power1.inOut' });
          gsap.to(cover, { y: 6, rotation: rot, duration: 0.55, ease: 'power1.inOut' });
          const t = setTimeout(() => {
            baseTransformsRef.current[layer] = LAYER_TILT[layer] ?? '';
            dragOffsets[layer] = { x: 0, y: 0 };
            gsap.to(el,    { y: 0, rotation: rot, duration: 0.55, ease: 'power1.inOut' });
            gsap.to(cover, { y: 0, rotation: rot, duration: 0.55, ease: 'power1.inOut' });
          }, 200);
          remainingShiftTimersRef.current.push(t);
        });

      } else if (e.deltaY < 0) {
        isAnimatingRef.current = true;
        const promoted = deck[deck.length - 1];
        const promotedEl = q(promoted);
        const promotedCover = coverOf(promoted);
        const tilt = LAYER_TILT[promoted] ?? '';
        const rotDeg = parseTiltDeg(tilt);

        // Teleport above stack (invisible snap)
        gsap.set(promotedEl, { y: '-120%', rotation: rotDeg });
        if (promotedCover) gsap.set(promotedCover, { y: '-120%', rotation: rotDeg });

        // Immediately update deck state — not in a callback
        deckRef.current = [promoted, ...deck.slice(0, -1)];
        syncZ(deckRef.current);
        setActiveNav(promoted);

        requestAnimationFrame(() => requestAnimationFrame(() => {
          gsap.to(promotedEl, {
            y: 0,
            rotation: rotDeg,
            duration: 0.7,
            ease: 'power1.inOut',
            onComplete() {
              gsap.set(promotedEl, { clearProps: 'transform' });
              isAnimatingRef.current = false;
            },
          });
          if (promotedCover) {
            gsap.to(promotedCover, { y: 0, rotation: rotDeg, duration: 0.7, ease: 'power1.inOut',
              onComplete() { gsap.set(promotedCover, { clearProps: 'transform' }); },
            });
          }
        }));
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
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, duration: 0.35, ease: 'power2.out' });
        if (coverEl) {
          coverEl.style.pointerEvents = 'auto';
          gsap.to(coverEl, { x: 0, y: 0, rotation: parseTiltDeg(initRot), scale: 1.04, duration: 0.35, ease: 'power2.out' });
        }
      } else {
        el.style.zIndex = String(SCATTER_Z);
        if (coverEl) coverEl.style.zIndex = String(SCATTER_Z);
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (hasScatteredRef.current && getScatterTransform(l)) {
          const sp = parseScatterTransform(getScatterTransform(l));
          baseTransformsRef.current[l] = getScatterTransform(l);
          gsap.to(el, { x: sp.x, y: sp.y, rotation: sp.rotation, scale: 1, duration: 0.35, ease: 'power2.in' });
          if (coverEl) gsap.to(coverEl, { x: sp.x, y: sp.y, rotation: sp.rotation + parseTiltDeg(initRot), scale: 1, duration: 0.35, ease: 'power2.in' });
        } else {
          const tiltRot = parseTiltDeg(LAYER_TILT[l] ?? '');
          baseTransformsRef.current[l] = LAYER_TILT[l] ?? '';
          gsap.to(el, { x: 0, y: 0, rotation: tiltRot, scale: 1, duration: 0.35, ease: 'power2.in' });
          if (coverEl) gsap.to(coverEl, { x: 0, y: 0, rotation: parseTiltDeg(initRot), scale: 1, duration: 0.35, ease: 'power2.in' });
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
        gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'power2.out', duration: 0.3 });
        if (cover) gsap.to(cover, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'power2.out', duration: 0.3 });
      } else {
        const parsed = parseScatterTransform(getScatterTransform(layer));
        gsap.to(el, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power2.out', duration: 0.3 });
        if (cover) gsap.to(cover, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power2.out', duration: 0.3 });
      }
    } else {
      const tiltDeg = parseTiltDeg(LAYER_TILT[layer] ?? '');
      gsap.to(el, { x: 0, y: 0, rotation: tiltDeg, scale: 1, ease: 'power2.out', duration: 0.3 });
      if (cover) gsap.to(cover, { x: 0, y: 0, rotation: tiltDeg, scale: 1, ease: 'power2.out', duration: 0.3 });
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
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        gsap.to(el, { x: sp.x, y: sp.y, rotation: sp.rotation, duration: SCATTER_DURATION / 1000, ease: 'back.out(1.7)', delay });
      }

      const coverRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        book: bookCoverRef, file: fileCoverRef, folder: folderCoverRef,
      };
      const coverRef = coverRefMap[layerKey];
      if (coverRef?.current) {
        coverRef.current.style.zIndex = String(SCATTER_Z);
        gsap.to(coverRef.current, { x: sp.x, y: sp.y, rotation: sp.rotation, duration: SCATTER_DURATION / 1000, ease: 'back.out(1.7)', delay });
      }
    });

    // Covers must not intercept clicks while scattered
    if (bookCoverRef.current) bookCoverRef.current.style.pointerEvents = 'none';
    if (fileCoverRef.current) fileCoverRef.current.style.pointerEvents = 'none';
    if (folderCoverRef.current) folderCoverRef.current.style.pointerEvents = 'none';
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
        gsap.to(el, { x: 0, y: 0, rotation: tiltRot, scale: 1, ease: 'power2.out', duration: 0.6, delay: i * 0.04 });
      }

      const coverRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        book: bookCoverRef, file: fileCoverRef, folder: folderCoverRef,
      };
      const coverRef = coverRefMap[layerKey];
      if (coverRef?.current) {
        coverRef.current.style.pointerEvents = 'auto';
        gsap.to(coverRef.current, { x: 0, y: 0, rotation: parseTiltDeg(COVER_INIT_TRANSFORMS[layerKey] ?? ''), scale: 1, ease: 'power2.out', duration: 0.6, delay: i * 0.04 });
      }
    });

    syncZ(deckRef.current);

    // Restore top-of-deck pointer events
    const topEl = scene.querySelector(`[data-name="${deckRef.current[0]}"]`) as HTMLElement | null;
    if (topEl) { topEl.style.pointerEvents = 'auto'; topEl.style.cursor = 'pointer'; }

    setActiveNav(deckRef.current[0]);
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
        return el?.contains(target);
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
    const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
    const cover = coverOf(layer);
    const tilt = LAYER_TILT[layer] ?? '';
    const rotDeg = parseTiltDeg(tilt);
    const deck = deckRef.current;

    gsap.to(el, {
      y: -20,
      duration: 0.15,
      ease: 'power2.out',
      onComplete() {
        gsap.set(el, { y: '-120%', rotation: rotDeg });
        if (cover) gsap.set(cover, { y: '-120%', rotation: rotDeg });

        deckRef.current = [layer, ...deck.filter((l) => l !== layer)];
        syncZ(deckRef.current);
        setActiveNav(layer);

        requestAnimationFrame(() => requestAnimationFrame(() => {
          gsap.to(el, {
            y: 0,
            rotation: rotDeg,
            duration: 0.5,
            ease: 'power2.in',
            onComplete() {
              gsap.set(el, { clearProps: 'transform' });
              isAnimatingRef.current = false;
            },
          });
          if (cover) {
            gsap.to(cover, {
              y: 0,
              rotation: rotDeg,
              duration: 0.5,
              ease: 'power2.in',
              onComplete() { gsap.set(cover, { clearProps: 'transform' }); },
            });
          }
        }));
      },
    });
    if (cover) gsap.to(cover, { y: -20, duration: 0.15, ease: 'power2.out' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          return el?.contains(target);
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
        gsap.to(prevEl, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power2.in', duration: 0.4 });
        if (prevCover) gsap.to(prevCover, { x: parsed.x, y: parsed.y, rotation: parsed.rotation, scale: 1, ease: 'power2.in', duration: 0.4 });
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
      gsap.to(el, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'power2.out', duration: 0.5 });
      if (cover) gsap.to(cover, { x: 0, y: 0, rotation: 0, scale: 1.04, ease: 'power2.out', duration: 0.5 });
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

      (['book', 'folder', 'file', 'paper'] as const).forEach((layer, i) => {
        const el = q(layer);
        const cover = coverOf(layer);
        const rotation = parseTiltDeg(LAYER_TILT[layer] ?? '');
        const tweenProps = { x: 0, y: 0, rotation, scale: 1, ease: 'power2.out', duration: 0.6, delay: i * 0.04 };
        if (el) gsap.to(el, tweenProps);
        if (cover) gsap.to(cover, tweenProps);
      });

      syncZ(deckRef.current);
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
    <div style={{ overflow: 'hidden' }}>
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
              style={{
                position: 'absolute',
                isolation: 'isolate',
                pointerEvents: 'none',
                overflow: 'visible',
                transform: LAYER_TILT['book'],
                transformOrigin: 'center center',
              }}
            >
              {bookHovered ? <BookHoverImg /> : <BookCover />}
            </div>
          )}

          {bookOpen && (
            <div
              style={{
                position: 'absolute',
                left: 144,
                top: 137,
                width: 1152,
                height: 747,
                zIndex: 200,
                cursor: 'pointer',
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
            style={{
              position: 'absolute',
              isolation: 'isolate',
              cursor: 'pointer',
              overflow: 'visible',
              transform: LAYER_TILT['file'],
              transformOrigin: 'center center',
            }}
          >
            {fileOpen ? <FileOpen /> : fileHovered ? <FileHoverImg /> : <FileClosed />}
          </div>

          {/* ── Folder overlay (default / hover / open) ───────────────────── */}
          {/* Position and visibility are set dynamically in initial setup useEffect */}
          <div
            ref={folderCoverRef}
            style={{
              position: 'absolute',
              isolation: 'isolate',
              visibility: 'hidden',
              cursor: 'pointer',
              overflow: 'visible',
            }}
          >
            {folderOpen
              ? <FolderOpenView />
              : folderHovered
              ? <FolderHover />
              : <FolderDefault />}
          </div>

          {/* ── Reactive nav overlay ──────────────────────────────────────── */}
          {/* Matches the import's nav: left:1304px, vertically centered */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '1304px',
              transform: 'translateY(-50%)',
              zIndex: 600,
              fontFamily: "'Atkinson Hyperlegible Mono', monospace",
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: 'normal',
              color: '#000912',
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            {NAV_ITEMS.map(({ layer, label }) => (
              <div
                key={layer}
                onClick={(e) => handleNavClick(layer, e)}
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
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
              className="mode-toggle-desktop"
              onClick={handleModeToggle}
              style={{
                fontFamily: "'Atkinson Hyperlegible Mono', monospace",
                fontWeight: 500,
                fontSize: '12px',
                color: '#000912',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {mode === 'scatter' ? 'Stacked' : 'Scatter'}
            </button>
          </div>

          {/* Mode toggle — mobile (viewport < 1024px), top-left below date/time */}
          <button
            className="mode-toggle-mobile"
            onClick={handleModeToggle}
            style={{
              position: 'absolute',
              top: '80px',
              left: '36px',
              zIndex: 600,
              fontFamily: "'Atkinson Hyperlegible Mono', monospace",
              fontWeight: 500,
              fontSize: '12px',
              color: '#000912',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              userSelect: 'none',
            }}
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
