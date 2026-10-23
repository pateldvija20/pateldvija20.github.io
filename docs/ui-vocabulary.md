# UI vocabulary

How to describe interface changes to an AI (or a developer) in terms the
industry already uses. The names come from Material Design, Carbon, Polaris,
Atlassian and Tailwind, so what you learn here carries to any team.

The in-app **UI inspector** (press `I` in development) shows these same names
when you hover a component. Click to copy its card, paste it into the chat, and
add what should change.

## The sentence to use

> **[Component] in [section], at [breakpoint] in [mode]: [property] is [now],
> make it [target].**

Examples:

- "Full-bleed section in The Problem, at desktop in dark: padding is `space-10`,
  make it `space-12`."
- "Card in Outcome, at mobile: radius is `radius-lg`, make it `radius-sm`."
- "Carousel item in Today's journey, at mobile: the inactive items should have no
  surface and no border."

Name the component, name where it is, name the breakpoint and mode, then change
one property. One property per sentence keeps the request unambiguous.

## Breakpoints and modes

| Name | Width |
| --- | --- |
| mobile | under 768px |
| tablet | 768 to 1023px |
| desktop | 1024px and up (the side navigation appears) |

Modes are **light** and **dark**. Colours are defined once per mode.

## Layout terms

| Term | Meaning |
| --- | --- |
| Container | A max-width box that holds content (the 800px reading column) |
| Section | A named, full-width part of a page |
| Full-bleed | Runs edge to edge, past the page padding |
| Stack | Children laid out in one direction with a fixed gap |
| Grid | Rows and columns (a Card grid is a Grid of Cards) |
| Gutter | The responsive padding at the page's left and right |
| Padding / Margin / Gap | Space inside an element / outside it / between children |
| Align / Justify | Position across / along the main axis |
| Sticky / Fixed | Stays put while scrolling within / over the viewport |
| Elevation vs Outline | A shadow that lifts a surface vs a 1px border |

## Components (what each thing is called)

| Name | What it is here |
| --- | --- |
| Hero | The large media block at the top of a page |
| Metadata | The small line under the hero (project, type, year) |
| Top app bar | The sticky bar on mobile and tablet |
| Side navigation | The list of sections on the left on desktop |
| Dropdown menu / Menu | The section picker and its open list |
| Icon button | The square arrow button that closes the case study |
| Button (filled / outlined) | The pill links "Open the prototype" and "Start the guided tour" |
| Section header | A headline with an optional supporting line |
| Full-bleed section | The TL;DR, The Problem and Pushback strips |
| Card | An outlined box with padding and a radius |
| Card grid | Cards laid out in columns |
| Media object | Text beside an image or video, alternating sides |
| Figure | An image or video with its frame |
| Carousel / Carousel item / Pagination | The swipeable journey on mobile and its dots |
| Timeline | The horizontal journey map with stages and markers |
| Bar chart / Bar | The mismatch and minutes charts |
| Data table | The stakeholder expectations table |
| Chip / Tag | A small pill (the AI disclosure is a Tag) |
| Divider | A 1px line separating content |

## Type roles

A type role is a size, line height, weight and tracking, named for its job.
Ask for a role, not a pixel size.

| Role | Size / line | Weight | Use |
| --- | --- | --- | --- |
| Display | 28 / 30.8, Roboto Slab | regular | Page title |
| Headline | 22 / 28.6 | medium | Section and block statements |
| Title | 18 / 27 | medium | Sub-section headings |
| Body | 16 / 22.4 | regular | Paragraphs, card headings (medium) |
| Body small | 14 / 19.6 | regular | Captions, table and card detail |
| Overline | 15 / 18.4, DM Mono, uppercase | regular | Section labels |

Weights: **regular** 400, **medium** 500 (headings, chips, buttons),
**semibold** 600 (inline emphasis only).

## Colour roles (semantic tokens, each with a light and a dark value)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `surface-page` | `#fdfeff` | `#212121` | The page |
| `surface-raised` | `#f6f7f9` | `#2c2c2c` | Cards and full-bleed sections |
| `surface-sunken` | `#e9ecf0` | `#333333` | Chart tracks, image wells |
| `surface-media` | `#525252` | `#525252` | Behind hero and tile media |
| `border-subtle` | `#e3e5e8` | `#3a3a3a` | Rings and dividers |
| `text-primary` | `#18191a` | `#fdfeff` | Main text, filled buttons |
| `text-secondary` | `#626262` | `#8a8a8a` | Supporting text |

Ask for a role ("use `text-secondary`"), never a hex.

## Space, radius and border scales

| Token | Value | | Token | Value |
| --- | --- | --- | --- | --- |
| `space-1` | 4 | | `space-10` | 40 |
| `space-2` | 8 | | `space-12` | 48 |
| `space-3` | 12 | | `space-16` | 64 |
| `space-4` | 16 | | `space-32` | 128 |
| `space-6` | 24 | | `radius-sm` / `radius-lg` / `radius-full` | 4 / 12 / pill |
| `space-8` | 32 | | `border-1` / `border-2` | 1px / 2px |

`space-N` is N x 4px. The spacing rhythm: 12 between a label and its content,
64 between blocks in a section, 128 between sections.

## States and variants

Default, hover, focus, pressed, selected (active), disabled. A **variant** is a
version of a component (Button: filled, outlined). A **state** is a moment of
it (Carousel item: active, inactive).

## Words for the change itself

- **Resize / Move / Reorder**: change layout, not looks.
- **Restyle / Retheme**: change colour, type, radius, border.
- **Swap token**: use a different value from the scale.
- **Collapse / Expand**: hide or show detail.
- **Truncate**: cut text with an ellipsis. **Wrap**: let it flow to the next line.
- **Align to**: line up with another element's edge.
- **Match**: copy another component's styling ("match the Outcome card").
