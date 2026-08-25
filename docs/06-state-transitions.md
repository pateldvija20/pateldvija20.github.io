# 06 — State transitions

Transition-by-transition spec: the trigger, the state change, what animates, and
the resulting UI. Use this when implementing or modifying any click→state→UI flow.

Legend: **[IMPLEMENTED]** exists in the current build · **[PLANNED]** documented
for a model to implement consistently (not yet wired).

---

## 1. Theme: light ⇄ dark  [IMPLEMENTED]

- **Trigger:** click the round button in `ControlBar`.
- **Handler:** `onToggleTheme` → `setTheme(t => t === "light" ? "dark" : "light")`.
- **State:** `theme` flips. Symmetric — the same button reverses it.
- **What changes:**
  - Page bg `#fdfeff ⇄ #2f2f2f` (`transition-colors 500ms`).
  - Toggle button colors invert; icon swaps **Sun (light) ⇄ Moon (dark)** (300 ms).
  - `Footer` re-renders: dark = solid `#2f2f2f`/white; light = halftone + translucent sidebar.
  - Scattered hint chip and stacked helper text flip their contrast colors.
- **Unaffected:** `mode`, `pan`, stacked `order`, clock. The desk composition and
  the control pill (always dark) do not change.

```
click toggle → setTheme → root bg + footer + chips recolor (fade) → done
```

---

## 2. Mode switch  [IMPLEMENTED]

Any mode → any mode via the three pills. `setMode(id)`; active pill styles update
(200 ms). The render branch (see `02`) decides the view.

### 2a. → No Drag
- Renders `DeskStage` with `scale = fit`, handlers inert.
- If coming **from Scattered**, a `useEffect` resets `pan → {0,0}`, so the desk
  eases back to center and zooms out from 125% to 100% (350 ms curve).

### 2b. → Scattered
- Renders `DeskStage` with `scale = fit * 1.25` (zoom-in animates via 350 ms curve).
- Hint chip appears; cursor becomes `grab`; pointer-drag panning enabled.

### 2c. → Stacked
- Swaps to `StackedDeck` (different component; `DeskStage` unmounts).
- `order` initializes to `["intro","cv","about","stickers","coffee"]`; cards mount
  in their depth-staggered stack.
- Switching **away** from Stacked unmounts it — `order` is **not persisted**
  (returns to default next time). Change to lifted/`App`-owned state if persistence
  is desired.

---

## 3. Stacked flip / shuffle  [IMPLEMENTED]

- **Trigger A:** click the top card → `advance(1)`.
- **Trigger B:** scroll → `advance(deltaY > 0 ? 1 : -1)` (debounced 380 ms via `lock`).
- **State:** `order` rotates (ring): `advance(1)` = `shift()` then `push()`;
  `advance(-1)` = `pop()` then `unshift()`.
- **What animates:** every card's `transform` (translateY 22·depth, translateX
  6·depth, rotate from `[0,-3.2,2.6,-1.8,3.4,-2.2]`, scale `1-0.05·depth`),
  `zIndex`, `boxShadow`, `filter` — all via `transition-all 420ms`. The old top
  card recedes to the back of the stack; the next card rises to front.
- **Invariant:** card content is fixed; only order/depth changes.

```
click top / scroll → advance(dir) → order ring rotates → all cards restack (420ms)
```

---

## 4. Desk pan (scattered)  [IMPLEMENTED]

- **Trigger:** pointer down → move → up on the stage (scattered only).
- **State:** `pan {x,y}` tracks the pointer delta from origin, clamped to
  `±maxX`/`±maxY` (maxY 280). `grabbing` toggles the cursor.
- **Animation:** during drag `transition: none` (1:1); on release the transition
  re-enables so any subsequent programmatic change eases (350 ms curve).
- **Reset:** leaving scattered clears `pan` (see 2a).

---

## 5. About book: open ⇄ closed  [PLANNED]

Not wired yet (`AboutBook` is static). Recommended implementation so it matches
the system:

- **State:** add `const [bookOpen, setBookOpen] = useState(false)` local to the
  About surface (or lift to `App` if other pieces need to know).
- **Trigger:** click the closed book cover → `setBookOpen(true)`; click again / a
  close affordance → `setBookOpen(false)`.
- **Transition (closed → open):**
  - Cover rotates open on its spine: animate the cover layer
    `transform: rotateY(0deg → -160deg)` with `transform-origin: left center` and a
    container `perspective: 1600` (reuse the deck's perspective value).
  - Reveal inner spread (bio text) with a short `opacity 0 → 1` fade, delayed until
    the cover is ~60% open.
  - Timing: **420 ms** `cubic-bezier(0.22,1,0.36,1)` to match desk motion.
- **Transition (open → closed):** reverse; fade the spread out first, then rotate
  the cover back to `0deg`.
- **Keep** the GDC wrap rule (`05`): the book's root visual classes must survive —
  animate a wrapper, not the piece's own className.

```
click cover → setBookOpen(true)  → cover rotateY -160° + spread fade-in (420ms)
click cover → setBookOpen(false) → spread fade-out → cover rotateY 0° (420ms)
```

---

## 6. Piece hover / pick-up in No Drag  [PLANNED]

Optional polish so No Drag isn't fully inert:

- **Trigger:** hover a piece.
- **Transition:** `transform: translateY(-6px) scale(1.02)` + stronger shadow,
  **200 ms** ease; revert on leave. No state needed (pure CSS `:hover`), or a
  `hoveredId` state if you need to raise `zIndex`.

---

## Summary matrix

| Transition | State touched | Trigger | Motion | Status |
|------------|---------------|---------|--------|--------|
| light⇄dark | `theme` | toggle click | 300–500 ms fades | ✅ |
| mode switch | `mode` (+`pan` reset, +`scale`) | pill click | 350 ms curve | ✅ |
| stack shuffle | `order` | click top / scroll | 420 ms restack | ✅ |
| desk pan | `pan`, `grabbing` | pointer drag | 1:1 → 350 ms settle | ✅ |
| book open/close | `bookOpen` | cover click | 420 ms rotateY + fade | 🔲 planned |
| piece hover | (`hoveredId`) | hover | 200 ms lift | 🔲 planned |
