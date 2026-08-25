# 05 — Components

## Shell components (`src/App.tsx`)

| Component | Props | Role |
|-----------|-------|------|
| `App` (default) | — | Owns `theme`, `mode`, `clock`; renders shell |
| `ControlBar` | `theme, mode, onMode, onToggleTheme` | Fixed top-center segmented control + theme button |
| `DeskStage` | `mode, theme` | Renders `DeskScene`; pan/zoom for scattered, static for nodrag |
| `StackedDeck` | `theme` | Ring-stack of 5 cards from `DECK`; wheel + click |
| `Fitted` | `w, h, frameW, frameH, children` | Scales a fixed-size piece to fit a card frame |
| `FooterFit` | `theme, clock` | Scales the 1729-wide `Footer` to page width |
| `SunIcon` / `MoonIcon` | — | Inline SVG icons for the theme button |

`DECK` (in `App.tsx`) = ordered card data: `intro` (#4a9df0), `cv` (#fdfeff),
`about` (#ffd664), `stickers` (#7fc47a), `coffee` (#e9e9ea). Each `content()`
renders scene pieces inside a `Fitted`/positioned wrapper.

## Scene components (`src/scene.tsx`, all default-free named exports)

| Export | What it draws | Notable |
|--------|---------------|---------|
| `DeskScene` | The whole desk composition (positions every piece) | native 1729×1117 |
| `Footer` | Themed footer: CONNECT links + CURRENTLY clock | `theme`, `clock` props |
| `IntroCard` | Business card hero (name/role) | rendered at +8° in scene |
| `CvV1` | Résumé sheet | rendered at +38° in scene |
| `AboutBook` | Yellow book (radial-gradient cover + 3 Union SVGs, inner −4.73°) | |
| `File` | Blue folder | |
| `CoffeeCup` | Coffee mug | |
| `Coaster` | Tape-ring coaster | |
| `Cuttingmat` | Green self-heal cutting mat (backdrop) | |
| `Sticker1/2/3` | Die-cut stickers | |

(`GoldenratioMat` and other helpers are internal to `scene.tsx`.)

## Footer prop contract

```ts
type FooterProps = { className?: string; theme?: "light" | "dark"; clock?: string };
```
- `dark`: `bg-[#2f2f2f]`, white text.
- `light`: `.halftone` dot texture bg + translucent-white sidebar.
- `CONNECT_LINKS` (LinkedIn / GitHub / Twitter) are defined at the top of the file.

## ⚠️ The GDC "wrap to keep visuals" rule (critical)

Components ported from Figma's `get_design_context` use this pattern:

```tsx
function Piece({ className }: { className?: string }) {
  return <div className={className || "…root visual classes…"}> … </div>;
}
```

`className || default` means **passing any positioning className DROPS the root
visual classes** (background, border, `rounded`, `overflow-clip`). Symptoms:
gradients bleed, mats vanish, corners un-round.

**Correct usage:** render the piece with **no `className`** so it keeps its
defaults, and put position/rotation on a **wrapper div**:

```tsx
// ✅ visuals preserved
<div className="absolute left-… top-… flex items-center justify-center">
  <div className="rotate-[8deg]"><IntroCard /></div>
</div>

// ❌ drops the card's bg/border/rounded
<IntroCard className="absolute left-… rotate-[8deg]" />
```

`DeskScene` already follows this for `Cuttingmat`, `IntroCard`, `GoldenratioMat`,
and `CvV1`. Follow it for any newly placed piece.

## Asset & font notes
- Asset paths inside scene components are rewritten `./assets/` → `/assets/`
  (served from `public/assets/`).
- Font-family classes were stripped from ported markup; DM Sans is the body
  default (`index.css`). Set `fontVariationSettings: '"opsz" N'` where optical
  size matters (control bar uses `14`).
