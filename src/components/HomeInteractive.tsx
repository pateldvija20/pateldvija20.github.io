"use client";

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

const FLIP_ORDER: LayerKey[] = ['book', 'file', 'folder', 'paper'];
const ALL_LAYERS: LayerKey[] = ['book', 'file', 'folder', 'paper', 'mat-grid'];

const Z_BASE: Record<LayerKey, number> = {
  book: 50,
  file: 40,
  folder: 30,
  paper: 20,
  'mat-grid': 10,
};

const SCATTER: Record<LayerKey, string> = {
  book: 'translate(-180px, -120px) rotate(-18deg)',
  file: 'translate(160px, -90px) rotate(12deg)',
  folder: 'translate(-140px, 140px) rotate(-8deg)',
  paper: 'translate(200px, 110px) rotate(22deg)',
  'mat-grid': '',
};

const SCATTER_TRANSFORMS: Record<string, string> = {
  book: 'translate(-180px,-120px) rotate(-18deg)',
  file: 'translate(160px,-90px) rotate(12deg)',
  folder: 'translate(-140px,140px) rotate(-8deg)',
  paper: 'translate(200px,110px) rotate(22deg)',
};

// perspective tilt: rotate around X axis while flying up
const FLIP_OUT = 'perspective(1200px) translateY(-120%) rotate(-8deg) rotateX(12deg)';
const FLIP_TIMING = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)';
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const NAV_ITEMS: Array<{ layer: LayerKey; label: string }> = [
  { layer: 'book', label: 'About' },
  { layer: 'folder', label: 'Work' },
  { layer: 'file', label: 'Writing' },
  { layer: 'paper', label: 'Resume' },
  { layer: 'mat-grid', label: 'Playground' },
];

export function HomeInteractive() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const bookCoverRef = useRef<HTMLDivElement>(null);
  const fileCoverRef = useRef<HTMLDivElement>(null);
  const folderCoverRef = useRef<HTMLDivElement>(null);
  const isScatteredRef = useRef(false);
  const flippedCountRef = useRef(0);
  const loaderHiddenRef = useRef(false);

  const [activeNav, setActiveNav] = useState<LayerKey>('book');
  const [bookOpen, setBookOpen] = useState(false);
  const bookOpenRef = useRef(false);
  const [fileOpen, setFileOpen] = useState(false);
  const fileOpenRef = useRef(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const folderOpenRef = useRef(false);
  const [folderHovered, setFolderHovered] = useState(false);
  const [bookHovered, setBookHovered] = useState(false);
  const [fileHovered, setFileHovered] = useState(false);

  // Stable helper: always reads latest DOM state
  const q = (name: LayerKey): HTMLElement | null =>
    (sceneRef.current?.querySelector(`[data-name="${name}"]`) as HTMLElement | null) ?? null;

  const hideLoader = useCallback(() => {
    loaderHiddenRef.current = true;
  }, []);

  // ─── Book hover + click ───────────────────────────────────────────────────
  useEffect(() => {
    const bookEl = q('book');
    if (!bookEl) return;

    const btn = bookEl.querySelector('[data-name="Book"]') as HTMLElement;

    const coverEl = bookCoverRef.current;

    const onEnter = () => {
      if (!bookOpenRef.current) {
        setBookHovered(true);
        if (coverEl) {
          coverEl.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1)';
          coverEl.style.transform = 'rotate(0deg) scale(1.02)';
        }
      }
    };
    const onLeave = () => {
      if (!bookOpenRef.current) {
        setBookHovered(false);
        if (coverEl) {
          coverEl.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1)';
          coverEl.style.transform = 'rotate(-5.31deg) scale(1)';
        }
      }
    };
    const onClick = () => {
      const next = !bookOpenRef.current;
      bookOpenRef.current = next;
      setBookOpen(next);
      if (next) setBookHovered(false);
      if (btn) btn.style.opacity = next ? '0' : '1';
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
      if (!fileOpenRef.current) {
        setFileHovered(true);
        coverEl.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1)';
        coverEl.style.transform = 'rotate(0deg) scale(1.02)';
      }
    };
    const onLeave = () => {
      if (!fileOpenRef.current) {
        setFileHovered(false);
        coverEl.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1)';
        coverEl.style.transform = 'rotate(-28.02deg) scale(1)';
      }
    };
    const onClick = (e: Event) => {
      (e as MouseEvent).stopPropagation?.();
      const next = !fileOpenRef.current;
      fileOpenRef.current = next;
      setFileOpen(next);
      if (next) setFileHovered(false);
      coverEl.style.transition = 'transform 300ms cubic-bezier(0.4,0,0.2,1)';
      coverEl.style.transform = next ? 'rotate(0deg) scale(1)' : 'rotate(-28.02deg) scale(1)';
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
      if (!folderOpenRef.current) setFolderHovered(true);
    };
    const onLeave = () => {
      if (!folderOpenRef.current) setFolderHovered(false);
    };
    const onClick = () => {
      const next = !folderOpenRef.current;
      folderOpenRef.current = next;
      setFolderOpen(next);
      if (!next) setFolderHovered(false);
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
      if (layer === 'file' && fileCoverRef.current) {
        fileCoverRef.current.style.zIndex = el.style.zIndex;
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

    // Position folder cover using hardcoded coords matching [data-name="folder"] in the 1440×1024 scene
    const coverEl = folderCoverRef.current;
    if (coverEl) {
      coverEl.style.position = 'absolute';
      coverEl.style.left = '273px';
      coverEl.style.top = '155px';
      coverEl.style.width = '894px';
      coverEl.style.height = '711px';
      coverEl.style.visibility = 'visible';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scroll-driven layer flip ─────────────────────────────────────────────
  useEffect(() => {
    // 5 scroll-heights of distance → 5 equal segments
    const TOTAL_SCROLL = window.innerHeight * 5;

    const onScroll = () => {
      if (window.scrollY > 5) hideLoader();
      if (isScatteredRef.current) return;

      const progress = Math.min(window.scrollY / TOTAL_SCROLL, 1);
      // Cap at 4 — scroll only flips book/file/folder/paper, never exposes mat-grid via scroll
      const targetCount = Math.min(Math.floor(progress * 5), 4);
      if (targetCount === flippedCountRef.current) return;

      setActiveNav(FLIP_ORDER[targetCount] ?? 'mat-grid');

      // Apply changed flips
      FLIP_ORDER.forEach((layer, i) => {
        const el = q(layer);
        if (!el) return;
        const shouldFlip = i < targetCount;
        const wasFlipped = i < flippedCountRef.current;
        if (shouldFlip !== wasFlipped) {
          el.style.transition = FLIP_TIMING;
          el.style.transform = shouldFlip ? FLIP_OUT : '';

          const coverEl =
            layer === 'book' ? bookCoverRef.current :
            layer === 'file' ? fileCoverRef.current :
            layer === 'folder' ? folderCoverRef.current : null;
          if (coverEl) {
            const initRot =
              layer === 'book' ? 'rotate(-5.31deg)' :
              layer === 'file' ? 'rotate(-28.02deg)' : '';
            coverEl.style.transition = FLIP_TIMING;
            coverEl.style.transform = shouldFlip ? FLIP_OUT : initRot;
          }
        }
        el.style.pointerEvents = 'none';
      });

      // Activate the new top layer
      const topLayer: LayerKey =
        targetCount < FLIP_ORDER.length ? FLIP_ORDER[targetCount] : 'mat-grid';
      const topEl = q(topLayer);
      if (topEl) topEl.style.pointerEvents = 'auto';

      const matEl = q('mat-grid');
      if (matEl) matEl.style.pointerEvents = topLayer === 'mat-grid' ? 'auto' : 'none';

      flippedCountRef.current = targetCount;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideLoader]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scatter ──────────────────────────────────────────────────────────────
  const triggerScatter = useCallback(() => {
    if (isScatteredRef.current) return;
    isScatteredRef.current = true;
    hideLoader();

    FLIP_ORDER.forEach((layer, i) => {
      const el = q(layer);
      if (!el) return;
      setTimeout(() => {
        el.style.transition = `transform 500ms ${SPRING}`;
        el.style.transform = SCATTER[layer];
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';

        const coverEl =
          layer === 'book' ? bookCoverRef.current :
          layer === 'file' ? fileCoverRef.current :
          layer === 'folder' ? folderCoverRef.current : null;
        if (coverEl) {
          const initRot =
            layer === 'book' ? 'rotate(-5.31deg)' :
            layer === 'file' ? 'rotate(-28.02deg)' : '';
          coverEl.style.transition = `transform 500ms ${SPRING}`;
          coverEl.style.transform = `${SCATTER[layer]} ${initRot}`.trim();
        }
      }, i * 40);
    });

    const matEl = q('mat-grid');
    if (matEl) {
      matEl.style.pointerEvents = 'auto';
      matEl.style.cursor = 'pointer';
    }
  }, [hideLoader]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const initRot =
        l === 'book' ? 'rotate(-5.31deg)' :
        l === 'file' ? 'rotate(-28.02deg)' : '';

      if (l === layer) {
        el.style.zIndex = '100';
        if (coverEl) coverEl.style.zIndex = el.style.zIndex;
        el.style.transition = 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.transform = 'translate(0px, 0px) rotate(0deg) scale(1.04)';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        if (coverEl) {
          coverEl.style.transition = 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)';
          coverEl.style.transform = `translate(0px, 0px) ${initRot} scale(1.04)`.trim();
        }
      } else {
        el.style.zIndex = String(Z_BASE[l]);
        if (coverEl) coverEl.style.zIndex = el.style.zIndex;
        el.style.transform = SCATTER_TRANSFORMS[l] ?? '';
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
        if (coverEl) {
          coverEl.style.transition = 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)';
          coverEl.style.transform = `${SCATTER_TRANSFORMS[l] ?? ''} ${initRot}`.trim();
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Click handlers ───────────────────────────────────────────────────────
  const handleSceneClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isScatteredRef.current) {
        triggerScatter();
        return;
      }

      // After scatter: resolve which layer was clicked via DOM containment
      const target = e.target as HTMLElement;
      const scene = sceneRef.current;
      if (!scene) return;

      const clicked = ALL_LAYERS.find((layer) => {
        const el = scene.querySelector(`[data-name="${layer}"]`) as HTMLElement | null;
        return el?.contains(target);
      });
      if (clicked) selectLayer(clicked);
    },
    [triggerScatter, selectLayer],
  );

  const handleNavClick = useCallback(
    (layer: LayerKey, e: React.MouseEvent) => {
      e.stopPropagation();
      if (layer === 'mat-grid') {
        triggerScatter();
        setActiveNav('mat-grid');
        return;
      }
      if (!isScatteredRef.current) {
        triggerScatter();
        // Allow scatter animation to start before centering
        setTimeout(() => selectLayer(layer), 60);
      } else {
        selectLayer(layer);
      }
    },
    [triggerScatter, selectLayer],
  );

  return (
    // Tall container gives scroll range for 5 segments
    <div style={{ minHeight: '600vh', position: 'relative' }}>
      {/* Sticky scene viewport — fills the screen while page scrolls */}
      <div style={{ position: 'sticky', top: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>
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
                left: 432,
                top: 139,
                width: 576,
                height: 743,
                zIndex: 51,
                pointerEvents: 'none',
                transform: 'rotate(-5.31deg) scale(1)',
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
              left: 414,
              top: 115,
              width: 612,
              height: 792,
              zIndex: 41,
              cursor: 'pointer',
              transform: 'rotate(-28.02deg) scale(1)',
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
          </div>

        </div>
      </div>
    </div>
  );
}
