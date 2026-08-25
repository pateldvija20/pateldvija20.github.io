# 04 — Animations & motion spec

All motion is **CSS transition-based** (no animation library). Values below are the
exact ones in `src/App.tsx`. Reproduce these precisely to keep the feel consistent.

## Timing / easing table

| What | Property | Duration | Easing |
|------|----------|----------|--------|
| Page background (theme) | `background` (`transition-colors`) | **500 ms** | Tailwind default (`ease`) |
| Theme toggle button colors | `border`/`bg`/`color` | **300 ms** | default |
| Mode pill active/hover | `color`/`bg` (`transition-colors`) | **200 ms** | default |
| Desk pan settle (scattered) | `transform` | **350 ms** | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Desk pan during drag | `transform` | **none** | — (1:1 with pointer) |
| Stacked card reposition | `transform`/all (`transition-all`) | **420 ms** | default `ease` |

`cubic-bezier(0.22,1,0.36,1)` is an "ease-out-back-ish" quint — quick start, soft
overshoot-free settle. Use it for any spatial move on the desk.

## Desk stage transform

```
transform: translate(-50%, 0)               // center horizontally
           translate(${pan.x}px, ${pan.y}px) // drag offset (scattered only)
           scale(${scale});                  // fit, ×1.25 when scattered
transform-origin: top center;
```
- `scale = fit` (No Drag) or `fit * 1.25` (Scattered).
- Switching modes animates `scale`/`pan` through the 350 ms curve (transition is
  active because `drag.current` is null when not dragging).

## Stacked deck geometry (per card, by depth `offset = min(depth,5)`)

```
transform: translate(-50%,-50%)
           translateY(${offset * 22}px)      // each card sinks 22px
           translateX(${offset * 6}px)       // and drifts 6px right
           rotate(${rot}deg)                  // rot from table below
           scale(${1 - offset * 0.05});       // each card 5% smaller
zIndex:   100 - depth;
boxShadow: active ? 0 40px 90px rgba(0,0,0,.35)
                  : 0 18px 40px rgba(0,0,0,.18);
filter:    active ? none : brightness(0.96);
```

Rotation offsets by depth: `[0, -3.2, 2.6, -1.8, 3.4, -2.2]` (degrees).
Container has `perspective: 1600`. Card size fixed **640 × 480**, `rounded-[34px]`,
2px `#2f2f2f` border.

Because only the `order` array changes on advance, React re-keys the same cards to
new depths and the 420 ms `transition-all` animates the whole shuffle — cards
scale, sink, rotate, and restack in one gesture.

## Clock

`useBayClock` — `setInterval` **15000 ms**; formats `America/Los_Angeles` time as
`Bay Area, h:mmAM/PM` (space removed). Not an animation, but a live-updating prop.

## Reduced motion

Not yet handled. A model adding motion should gate non-essential transforms behind
`@media (prefers-reduced-motion: reduce)` and keep only opacity/color fades.
