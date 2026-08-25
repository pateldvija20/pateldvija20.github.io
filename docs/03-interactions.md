# 03 — Interactions

Every user input and its result. Grouped by surface.

## Control bar (`ControlBar`, always visible, fixed top-center)

| Input | Element | Result |
|-------|---------|--------|
| Click a mode label | segmented pill (`Scattered` / `Stacked` / `No Drag`) | `onMode(id)` → sets `mode`; active pill turns `#fdfeff` bg / `#2f2f2f` text |
| Hover an inactive label | pill button | text goes `#fdfeff` → `#ffd664` (200 ms) |
| Click round button | theme toggle | flips `theme`; icon swaps Sun⇄Moon; button colors invert |

The pill is always dark (`#2f2f2f` bg, white border) regardless of theme — it is a
persistent floating control, not themed with the page.

## No Drag mode (`DeskStage`, `mode === "nodrag"`)

- **Static.** Pointer handlers early-return (`if (!scattered) return`).
- No pan, no zoom multiplier (`scale = fit`), no cursor change, no hint chip.
- Only reactive behaviour: `ResizeObserver` rescales `fit` on window resize.
- Purpose: a clean, "framed" presentation of the desk composition.

## Scattered mode (`DeskStage`, `mode === "scattered"`)

| Input | Result |
|-------|--------|
| Pointer down on stage | `setPointerCapture`; store origin; `grabbing = true`; cursor → `grabbing` |
| Pointer move (while down) | `pan` follows delta, **clamped** to `±maxX` / `±maxY` (`maxY = 280`) |
| Pointer up / leave | end drag; `grabbing = false`; cursor → `grab` |
| (passive) | desk is zoomed to **125%** (`scale = fit * 1.25`) so there's overflow to explore |
| (passive) | hint chip "drag anywhere to explore the desk ✦" shown at `top:100`, `pointer-events:none` |

Transform: `translate(-50%,0) translate(pan.x, pan.y) scale(scale)` with
`transform-origin: top center`. During an active drag `transition` is `none`
(1:1 tracking); on release it eases back with `0.35s cubic-bezier(0.22,1,0.36,1)`.

## Stacked mode (`StackedDeck`, `mode === "stacked"`)

| Input | Element | Result |
|-------|---------|--------|
| Click top card | front `<button>` (depth 0) | `advance(1)` — top card cycles to the back |
| Scroll down (`deltaY > 0`) | deck container `onWheel` | `advance(1)` |
| Scroll up (`deltaY < 0`) | deck container `onWheel` | `advance(-1)` |
| Rapid scroll | — | ignored while `lock` is true (380 ms cooldown) or `|deltaY| < 8` |

- Only the top card is clickable; cards at depth 0–2 have `pointer-events:auto`,
  depth > 2 are `pointer-events:none`.
- Helper line under the deck: "click the top piece to flip · scroll to shuffle the
  stack" (themed text color).

## Footer (`FooterFit` → `Footer`, always mounted)

| Input | Result |
|-------|--------|
| Click a CONNECT link | opens external URL (LinkedIn / GitHub / Twitter) — `CONNECT_LINKS` in `scene.tsx` |
| (passive) | "CURRENTLY" clock updates every 15 s via `useBayClock` |
| (passive) | re-themes with `theme` (dark: `#2f2f2f`; light: halftone + translucent sidebar) |

## Global / passive

| Input | Result |
|-------|--------|
| Window resize | `DeskStage.fit` and `FooterFit.scale` recompute (`ResizeObserver`) — composition rescales, never reflows |
| Page load | `theme=light`, `mode=nodrag`; clock ticks immediately then every 15 s |

## Not yet wired (candidates — see `06`)
- Hover-lift / pick-up on individual desk pieces in No Drag.
- Click a piece to open a detail (e.g. About book opening).
- Keyboard arrows for the stacked deck.
