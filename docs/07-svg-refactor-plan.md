# 07 — SVG Refactor & Delegation Plan

Handoff spec for a Sonnet session that will **replace the Figma-Make ported scene
components with the clean, exported SVGs** in `components - svg/`, then keep all
existing interactions and add the planned ones from `06-state-transitions.md`.

Read `01`–`06` first. This doc adds the "how we swap the visuals" layer.

---

## 0. Goal

Today `src/scene.tsx` is 2,433 lines of Figma-Make output that stitches ~150
hashed SVG fragments (`public/assets/<hash>.svg`) into big components with the
fragile "GDC wrap to keep visuals" rule (`05`).

The user has exported **one clean SVG per component variant** in
`components - svg/` (Figma variant naming: `Property 1=<piece>_<variant>.svg`).
We replace the fragmented markup with these single-file assets, split the scene
into a **modular `src/pieces/` directory**, and wire the previously-static pieces
to real state (book open, file open, hover lift).

Non-goals: changing coordinates, changing the state model, changing the modes.

## 1. Asset inventory (`components - svg/` → `public/assets/`)

Rename on move — drop the `Property 1=` prefix, keep the descriptive slug. Also
fix the two known naming issues:

| Source file | Destination path | Notes |
|-------------|------------------|-------|
| `Property 1=intro_card_{light,dark}.svg` | `public/assets/intro_card_{light,dark}.svg` | hero card |
| `CV V1.svg` | `public/assets/cv_v1.svg` | single variant (works in both themes) |
| `Property 1=aboutme_book_{closed,open}.svg` | `public/assets/aboutme_book_{closed,open}.svg` | two **states**, not themes |
| `Property 1=file_{close,open}_{light,dark}.svg` | `public/assets/file_{close,open}_{light,dark}.svg` | rename `close` → `closed` for consistency with book |
| `Property 1=coffee_cup_{light,dark}.svg` | `public/assets/coffee_cup_{light,dark}.svg` | |
| `Property 1=coaster_{light,dark}.svg` | `public/assets/coaster_{light,dark}.svg` | |
| `Property 1=cuttingmat_{light,dark}.svg` | `public/assets/cuttingmat_{light,dark}.svg` | |
| `Property 1=desk-mat_{light,dark}.svg` | `public/assets/desk_mat_{light,dark}.svg` | hyphen → underscore |
| `Property 1=goldenratio_mat_{light,dark}.svg` | `public/assets/goldenratio_mat_{light,dark}.svg` | |
| `Property 1=footer_{light,dark}.svg` | `public/assets/footer_{light,dark}.svg` | see §6 |
| `Property 1=peniclbox_{light,dark}.svg` | `public/assets/pencilbox_{light,dark}.svg` | **fix typo** `penicl` → `pencil` |
| `Property 1=pencil_<color>_{light,dark}.svg` | `public/assets/pencil_<color>_{light,dark}.svg` | 11 colors × 2 themes |
| `sticker1.svg` / `sticker2.svg` / `sticker3.svg` | `public/assets/sticker{1,2,3}.svg` | stickers are color, no theme variant |
| `pencil.svg` | skip — this is a raw template; use per-color variants |
| `organisation_menu.svg` | `public/assets/organisation_menu.svg` | reference for ControlBar visuals (see §7) |
| `Property 1=light.svg` / `Property 1=dark.svg` | `public/assets/theme_toggle_{light,dark}.svg` | 48×48 sun/moon; replaces inline `SunIcon`/`MoonIcon` |

After the copy, **delete the entire hashed asset set** (`public/assets/*.svg`
that don't match a name above) and the old `components - svg/` directory. Verify
`git status` shows only intended files touched.

## 2. Target file layout

```
src/
  App.tsx                # unchanged shape; imports pieces from src/pieces
  scene.tsx              # DELETE — replaced by index below
  pieces/
    index.ts             # re-exports every piece + DeskScene + Footer
    Piece.tsx            # tiny shared <SvgPiece/> helper (see §3)
    IntroCard.tsx
    CvV1.tsx
    AboutBook.tsx        # owns bookOpen state (see §5)
    FileFolder.tsx       # owns fileOpen state (rename from `File` to avoid DOM clash)
    CoffeeCup.tsx
    Coaster.tsx
    CuttingMat.tsx
    DeskMat.tsx
    GoldenRatioMat.tsx
    Pencil.tsx           # takes color + theme
    PencilBox.tsx        # composes pencils inside the box asset
    Sticker.tsx          # takes n=1|2|3
    Footer.tsx           # themed, keeps CONNECT + clock overlay (see §6)
    DeskScene.tsx        # composition — coords copied verbatim from current scene.tsx:2379+
  hooks/
    useTheme.ts          # optional: extract if the App gets larger
public/assets/           # only the clean named SVGs from §1
```

Each `src/pieces/*.tsx` file should stay **under ~80 lines**. If it grows past
that, split (e.g., `PencilBox` composition vs. layout).

## 3. The one shared helper

Every piece is now "wrap an `<img>` around an SVG file, sized/positioned by the
call site." One helper eliminates the GDC gotcha entirely:

```tsx
// src/pieces/Piece.tsx
type SvgPieceProps = {
  src: string;              // e.g. "/assets/intro_card_light.svg"
  className?: string;       // position + size — provided by caller
  alt?: string;
  draggable?: boolean;      // false by default (native drag interferes)
  style?: React.CSSProperties;
};

export function SvgPiece({ src, className, alt = "", draggable = false, style }: SvgPieceProps) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={draggable}
      className={`block max-w-none pointer-events-auto select-none ${className ?? ""}`}
      style={style}
    />
  );
}
```

Because the caller **always** owns positioning and the SVG file is a single
self-contained asset, the "className swallows the visuals" trap from
`05-components.md §GDC rule` is gone. Do **not** re-introduce a
`className || "default classes"` pattern in the new pieces.

## 4. Piece contracts (props)

Keep prop shapes tiny and predictable so `DeskScene` composition stays readable.

```tsx
type Theme = "light" | "dark";

// Themed, no internal state
<IntroCard theme />
<CvV1 />                              // single variant
<CoffeeCup theme />
<Coaster theme />
<CuttingMat theme />
<DeskMat theme />
<GoldenRatioMat theme />
<Sticker n={1|2|3} />                 // no theme
<Pencil color="red" theme />          // color ∈ 11 exports; picks pencil_<color>_<theme>.svg

// Themed + state
<AboutBook theme open onToggle />     // open: boolean; controlled by parent (App)
<FileFolder theme open onToggle />    // ditto — rename from `File` (browser has a global `File`)
<PencilBox theme />                   // composes 11 <Pencil/> inside pencilbox_<theme>.svg
```

Every piece internally just resolves the SVG path from its props and renders a
`<SvgPiece/>`. Example:

```tsx
export function IntroCard({ theme, className }: { theme: Theme; className?: string }) {
  return <SvgPiece src={`/assets/intro_card_${theme}.svg`} className={className} alt="Dvija Patel — Product Designer" />;
}
```

## 5. State to add (owned by `App`)

Lift the two per-piece states so mode switches don't lose them and so keyboard
shortcuts can drive them later.

| State | Type | Default | Setter | Consumer |
|-------|------|---------|--------|----------|
| `bookOpen` | `boolean` | `false` | `setBookOpen` | `<AboutBook/>` |
| `fileOpen` | `boolean` | `false` | `setFileOpen` | `<FileFolder/>` |
| `hoveredId` | `string \| null` | `null` | `setHoveredId` | any piece (raises z-index + lift, see §8) |

Pass `theme` and the relevant `{open, onToggle}` down. `DeskScene` receives all
three and threads them to the two stateful pieces.

## 6. Footer

The exported `footer_{light,dark}.svg` is a rendered snapshot including
non-interactive text. It's fine as the **background**, but CONNECT links and the
live clock must stay real DOM so they're clickable and update every 15 s.

Structure:

```tsx
<div className="relative h-[552px] w-[1729px]">
  <SvgPiece src={`/assets/footer_${theme}.svg`} className="absolute inset-0 h-full w-full" />
  {/* absolutely-positioned overlays for links + clock, positions taken from the SVG */}
  <div className="absolute left-[120px] top-[…] …">…CONNECT links…</div>
  <div className="absolute left-[120px] top-[…] …">…CURRENTLY {clock}…</div>
</div>
```

Coordinates for the overlays: open `footer_light.svg` in Figma (or hover-inspect
the raw SVG) to read the `<text>` node x/y. Match font (`DM Sans`) and size.

Keep `CONNECT_LINKS` where it lives (or move to `src/pieces/Footer.tsx`).

## 7. Control bar

`organisation_menu.svg` shows the finished pill. **Don't** blit it as an image —
it must stay buttons for accessibility and hover. Instead, use it as a spec:

- pull border-radius, padding, font size, and colors from the SVG
- keep the current `<button>` implementation in `App.tsx` (`03-interactions.md`
  covers behaviour); only tune styles to match
- replace inline `SunIcon`/`MoonIcon` with `<SvgPiece src={theme_toggle_${theme}.svg} />` (48×48)

## 8. New animations to wire (see `04-animations.md` for tokens)

Reuse the same easing/duration so nothing feels off-brand:
`420ms cubic-bezier(0.22,1,0.36,1)` for spatial moves; `200ms` for hover.

1. **Book open/close** (`06 §5`, PLANNED)
   - Two SVGs: `aboutme_book_closed.svg` (single frontal page) and
     `aboutme_book_open.svg` (spread — note the open one is ~1454×914, closed is
     ~671×900; the spread grows to the right).
   - Anchor both to the **spine (left edge of the closed cover)**. The open
     spread's left edge should share x/y with the closed cover's left edge so the
     spine stays fixed as content unfurls to the right.
   - Cross-fade between the two SVGs (opacity 420 ms). The width delta creates
     the visual "opening" without a rotateY hack — but if a more physical
     animation is wanted later, wrap the closed SVG in
     `transform: rotateY(0→-160deg)` on `transform-origin: left center` inside a
     `perspective: 1600` container and fade the spread in at ~60% progress.
   - Click cover to open, click spread (or outside) to close. Cursor: `pointer`.

2. **File open/close** (new, mirrors the book)
   - Same pattern with `file_{closed,open}_{theme}.svg`. Anchor to the folder's
     back-cover spine (left edge). Cross-fade 420 ms.

3. **Piece hover / pick-up** in No Drag (`06 §6`, PLANNED)
   - On `onPointerEnter`: `setHoveredId(id)` (only when `mode === "nodrag"`).
   - CSS: hovered piece gets `translateY(-6px) scale(1.02)` +
     `filter: drop-shadow(0 12px 24px rgba(0,0,0,.25))`, 200 ms ease, and
     `z-index: 50`. Revert on leave.
   - Skip while `mode !== "nodrag"` (Scattered is a drag surface, Stacked is a
     different component).

4. **Coffee steam** (optional, cheap win)
   - `coffee_cup_*.svg` — if the SVG contains a `<path>` for steam, target it via
     `mask-image` or a sibling animated element and add a slow rise/opacity
     loop (`@keyframes steam` 4 s infinite, 25 % opacity peak). Skip if the
     shape isn't there.

Everything else in `04-animations.md` stays as-is.

## 9. Order of work (delegate as discrete PRs)

Each step should compile and render on its own so the user can watch progress in
the Vite preview.

1. **Assets** — move + rename per §1, delete the old hashed set, verify the app
   still boots (it will render broken; that's OK — next step fixes it).
2. **Helper + one piece** — add `Piece.tsx` + rewrite `IntroCard` end-to-end as
   the pattern. Prove the pipeline (import, position, theme swap).
3. **All static pieces** — port CV, CoffeeCup, Coaster, mats, stickers, pencils,
   pencil box, footer bg. Rewrite `DeskScene.tsx` composition using coordinates
   copied verbatim from the current `scene.tsx:2379-2432` block.
4. **Footer overlays** — real DOM for CONNECT + clock over `footer_<theme>.svg`.
5. **State lift** — add `bookOpen` / `fileOpen` to `App`; make `AboutBook` and
   `FileFolder` controlled; wire cross-fade animation.
6. **Hover lift** — add `hoveredId` + CSS on every piece in No Drag.
7. **Control bar polish** — swap inline sun/moon for SVG assets; adjust pill
   metrics to match `organisation_menu.svg`.
8. **Delete `src/scene.tsx`** and any dead imports; `pnpm build` clean; visual
   diff against the three provided screenshots.

## 10. Acceptance checks (per PR)

- `pnpm build` passes.
- No `className || "…default…"` pattern anywhere in `src/pieces/`.
- No file in `src/pieces/` over ~120 lines.
- Every mode still works: No Drag static, Scattered pans + zooms 125 %, Stacked
  shuffles on click + wheel.
- Theme toggle re-swaps every SVG (light ↔ dark) with the 500 ms page fade.
- Book: click closed cover → spread; click spread → closed. File: same.
- Hover in No Drag lifts the hovered piece; other modes ignore hover.
- No visual regression vs. the three reference screenshots (Scattered, Stacked,
  No Drag) at desktop width.

## 11. What NOT to change

- The 1729-wide fixed coordinate system + scale-to-fit wrapper (`01 §Coordinate`).
- Mode/theme/clock state shape in `App.tsx` (only additions).
- Stacked deck ring semantics and easing (`06 §3`).
- CSS transition durations/easings — reuse the tokens in `04`.
- Vite/Tailwind/Font wiring in `index.css` and `vite.config.ts`.
