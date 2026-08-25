# 02 — State model

All app-level state lives in `App()` (`src/App.tsx`). There is **no router, no
store, no URL/localStorage persistence** — state resets on reload.

## Global state (owned by `App`)

| State | Type | Default | Setter | Drives |
|-------|------|---------|--------|--------|
| `theme` | `"light" \| "dark"` | `"light"` | `setTheme` | page bg, control bar toggle icon/colors, footer theming, scattered hint chip |
| `mode` | `"scattered" \| "stacked" \| "nodrag"` | `"nodrag"` | `setMode` | which view renders (`StackedDeck` vs `DeskStage`) + pan/zoom behaviour |
| `clock` | `string` | `"Bay Area, 12:17PM"` | `useBayClock` interval | footer "CURRENTLY" line |

`pageBg = theme === "light" ? "#fdfeff" : "#2f2f2f"` is applied to the root div
with `transition-colors duration-500`.

### Render branch

```
mode === "stacked"  → <StackedDeck theme={theme} />
otherwise           → <DeskStage  mode={mode} theme={theme} />   // nodrag + scattered
<FooterFit theme clock />                                        // always mounted
```

So **No Drag and Scattered share one component** (`DeskStage`); the difference is
purely behavioural (see below). Stacked is a separate component.

## Local state

### `DeskStage` (`nodrag` + `scattered`)
| State | Default | Purpose |
|-------|---------|---------|
| `fit` | `1` | `clientWidth / 1729`, recomputed by `ResizeObserver` |
| `pan` | `{x:0,y:0}` | drag offset in px; **only mutated when `scattered`** |
| `grabbing` | `false` | swaps `cursor-grab`/`cursor-grabbing` |
| `drag` (ref) | `null` | in-flight pointer origin `{px,py,ox,oy}` |

- `scale = fit * (scattered ? 1.25 : 1)` — scattered is zoomed 125%.
- `useEffect` resets `pan` to `{0,0}` whenever `scattered` becomes false, so
  switching Scattered→No Drag re-centers the desk.

### `StackedDeck` (`stacked`)
| State | Default | Purpose |
|-------|---------|---------|
| `order` | `DECK.map(d => d.id)` = `["intro","cv","about","stickers","coffee"]` | ring order of the 5 cards; index 0 = top card |
| `lock` (ref) | `false` | wheel debounce (380 ms) so one scroll = one shuffle |

`order` is a **rotating ring**: `advance(1)` moves the front card to the back;
`advance(-1)` pulls the back card to the front. Content never changes, only order.

### `FooterFit`
| State | Default | Purpose |
|-------|---------|---------|
| `scale` | `1` | `clientWidth / 1729` via `ResizeObserver` |

## State diagram (conceptual)

```
theme:  light  ⇄  dark            (toggle button, symmetric)

mode:   nodrag ── setMode ──▶ scattered ──▶ stacked  (any → any via control bar)
          ▲__________________________________________|

stacked ring:  [A,B,C,D,E] ──advance(1)──▶ [B,C,D,E,A]
               [A,B,C,D,E] ◀─advance(-1)── [E,A,B,C,D]
```

## Invariants / gotchas for future edits

- Pan handlers early-return unless `scattered`; No Drag is intentionally inert.
- `pan` is clamped: `maxX = (1729*scale - clientWidth)/2 + 280`, `maxY = 280`.
- Theme is a **boolean-in-disguise** — every consumer branches on
  `theme === "light"`. Adding a third theme means auditing each call site.
- No piece has its own open/closed state today (see next note).

## Note on "book open/close"

The brief asks to document a book open/close state. In the **current build the
About book is a static illustration** (`AboutBook`) — there is no `open` state
wired yet. `06-state-transitions.md` specifies the intended open/close transition
so a model can implement it consistently with the rest of the system.
