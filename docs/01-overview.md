# 01 — Overview

## Concept

A product-designer portfolio staged as a **top-down photo of a desk**. Instead of
scrolling sections, the visitor **re-arranges the desk** into three "organisation"
layouts and toggles a light/dark "studio lighting" theme. Each physical object is
a portfolio surface:

| Piece | Real-world object | Portfolio meaning |
|-------|-------------------|-------------------|
| Intro card | Business card (red→pink gradient) | Hero: name, tagline, role |
| CV V1 | Printed résumé sheet | Work experience / skills |
| About book | Yellow hard-cover book | About / bio (opens) |
| Stickers | Die-cut stickers | Playful brand marks |
| Coffee cup + Coaster | Mug + tape ring | Ambience / "currently" |
| File | Blue folder | Case-study container |
| Pencils + Pencil box | Colored pencils | Craft / tools |
| Cutting mat + Golden-ratio mat | Green self-heal mats | Backdrop / grid |
| Desk mat | Halftone-grey strip | Foreground surface (footer bleed) |

## Tech stack

- **React 19** + **TypeScript** (function components, hooks).
- **Vite 8** dev/build (`@` alias → `src`).
- **Tailwind CSS v4** via `@tailwindcss/vite` (no config file; theme in `index.css`).
- **DM Sans** (Google variable font, `opsz` axis) — `@import` in `index.css`.
- Illustrations are **local SVGs** in `public/assets/*.svg`, composed by absolute
  positioning inside each scene component.

## File map

```
src/
  main.tsx        # mounts <App/>, imports index.css
  App.tsx         # STATE + control bar + DeskStage + StackedDeck + FooterFit
  scene.tsx       # DeskScene + all illustrated piece components (exported)
  index.css       # font @import, tokens, .halftone texture
public/assets/    # ~150 SVG fragments that make up the pieces
docs/             # this handoff
```

## Coordinate system (important)

The Figma desk frame is authored at a fixed **1729 × 1117 px** ("desk") with a
separate **1729 × 552 px** footer. Every piece is absolutely positioned in that
1729-wide space.

- `src/App.tsx` constants: `SCENE_W = 1729`, `DESK_H = 1117`, `FOOTER_H = 552`.
- The stage/footer are rendered at native 1729 width and **scaled to fit** the
  viewport with `transform: scale(clientWidth / 1729)` (a `ResizeObserver`
  recomputes `fit` on resize). This preserves exact composition at any width.
- Because of this, **never convert piece coordinates to responsive units** —
  keep the 1729-space layout and let the wrapper scale it.

## Rotation note

Several pieces are rotated. Their Figma call sites only expose an **axis-aligned
bounding box** (the flex-centering wrapper), which is ambiguous between an angle θ
and its complement 90−θ. Resolved values in code:

- Intro card: **+8°** (clockwise; "Product Desiger" slopes down-right).
- CV V1: **+38°** (clockwise; header enters from top-left).
- About book: **−4.73°**; Pencil box: **+5.19°** (straight from GDC).
