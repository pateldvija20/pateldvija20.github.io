# Portfolio — Handoff Docs (for Claude)

This folder is a handoff spec for an AI model (Claude) continuing work on the
**Dvija Patel product-design portfolio**. It describes the design as a **top-down
"designer's desk"** scene that can be re-arranged into three layouts and shown in
two themes, plus every interaction, animation, and state transition.

Read the files in this order:

| # | File | What it covers |
|---|------|----------------|
| 1 | [`01-overview.md`](./01-overview.md) | Product concept, tech stack, file map, coordinate system |
| 2 | [`02-state-model.md`](./02-state-model.md) | The full state machine: what state exists, defaults, where it lives |
| 3 | [`03-interactions.md`](./03-interactions.md) | Every input (click / drag / scroll / hover) and its result |
| 4 | [`04-animations.md`](./04-animations.md) | Timing, easing, transforms — the motion spec |
| 5 | [`05-components.md`](./05-components.md) | Component inventory, props, and the GDC "wrap to keep visuals" rule |
| 6 | [`06-state-transitions.md`](./06-state-transitions.md) | Transition-by-transition spec (theme, mode, book, stack flip) |

## The 30-second model

- The page renders one **desk scene** (`DeskScene`) of ~20 illustrated objects.
- Two global states drive everything: **`theme`** (`light` \| `dark`) and
  **`mode`** (`scattered` \| `stacked` \| `nodrag`).
- A top-center **control bar** switches `mode`; a round button switches `theme`.
- A **footer** (CONNECT links + live "CURRENTLY" clock) is always mounted and
  re-themes with the page.

## Source of truth

- `src/App.tsx` — the interactive shell (state, control bar, stage, deck, footer).
- `src/scene.tsx` — the illustrated desk components (ported from Figma GDC).
- `src/index.css` — DM Sans font wiring + `.halftone` desk texture.
- Figma frames: `1:1993` (original) and `2:7643` (current No Drag reference),
  file key `ctpEY8Oog7GQeIefix44M8`.

> Convention used throughout these docs: **CSS rotation is clockwise-positive**.
> State names are written in `code`. "Piece" = one illustrated desk object.
