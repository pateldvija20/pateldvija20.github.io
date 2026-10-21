# Handoff: recruiter-mode redesign

Context for picking this work up in a new chat. Paste this file (or point the
new chat at it) before asking for the next change.

## The project

- Personal portfolio of Dvija Patel, product designer. React 19 + Vite 8 +
  Tailwind v4 + TypeScript, deployed on Vercel. Dev server: `npx vite`
  (launch config `portfolio-dev`, port 3000). Branch `dev-v2`; PRs go to
  `main`.
- Two modes, toggled in `src/App.tsx`:
  - **Scattered / playground / desk** — an illustrated desk you can play with
    (`src/pieces/*`). Mostly untouched in this work; keeps its own #2f2f2f
    palette and its own footer, contact form and paper-ball tooltip.
  - **Organized / recruiter** — the structured portfolio
    (`src/organized/*`). Everything below is about this mode.
- `<html data-layout="organized|scattered">` and `<html data-theme="light|dark">`
  are set in App.tsx; recruiter-only CSS is scoped to
  `:root[data-layout="organized"]` in `src/index.css`.

## Design references and direction

- Black-and-white line illustration with two accents. References:
  rachelchen.tech (cursor, spacing/negative space, page fade, Work grid,
  About), madhurima.me (separate pages, CV and Play layouts), isoglow.dev
  (later, for the playground).
- Current source of truth: Figma file `upMh7jI9OkJxE8jifVXMBH`, frames
  **2232:4847** (light homepage) and **2232:4729** (dark). The older file
  `JBI36oND5bAcesf1nxHjYT` is not readable through the Figma connector
  ("no edit access"; the account is on the Starter plan, which also has a
  very low connector-request limit). If Figma refuses, ask for screenshots
  or SVG exports.
- Hero art exports live in `new_assets/Home page/` (Frame 22 = furniture,
  Group 21 = lamp, Rectangle 49 = dark-mode light cone; `-1` = light).

## Palette (index.css tokens, organized only)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--surface` / `--paper` | #FDFEFF | #212121 | page |
| `--content` / `--ink` | #212121 | #FDFEFF | text, ink |
| `--quiet` | #888888 | #8A8A8A | secondary text (dark is lighter than Figma's #525252 for legibility) |
| `--rule` | #888888 | #525252 | rules, floor line, placeholders |
| `--art-ink/paper/grey` | #212121/#FDFEFF/#888888 | #FDFEFF/#212121/#525252 | hero drawing |
| `--art-bulb` | #888888 | #FFE884 | bulb off / lit |
| `--accent-yellow`, `--accent-blue` | #FFD104, #87DBFF | same | chair cushions, cone |
| `--tint` | #EEEEEF | #333333 | cursor hover fill behind items |
| `--pill` | #525252 | #525252 | cursor speech pill, phone menu button |
| `--cs-*` | (unset → file fallbacks) | #212121 face, #FDFEFF ink, #8A8A8A muted, greys for wells/cards/tiles | case studies in dark mode |

## Structure (recruiter mode)

- `router.ts` — pages `/` (Work: hero + grid), `/play`, `/about`, `/cv`;
  `/projects/<slug>` opens a case study over Work; `/work-experience` → `/cv`.
  Plain History API. Pages fade in (`.page-fade`), images fade in (`FadeImg`).
- `OrganizedPage.tsx` — sidebar + `<main>` keyed by page + full-width
  `SiteFooter` + `Cursor` + `ProjectOverlay`.
- `Sidebar.tsx` — desktop: 167px column, nav (DM Sans 16/21, 24 gap, active
  bold ink, rest grey) vertically centred; a `LampSwitch` hangs above it
  (always off Work; on Work it drops in once the hero lamp scrolls away,
  via `[data-lamp-sentinel]`). Tablet: top bar, links right. Phone: menu
  button (grey fill, white bars) + small lamp top-left.
- `HeroSection.tsx` + `HeroArt.tsx` — 1105x710 block (Figma "Frame 25") in
  the 1105px content column; copy positioned in block coordinates with
  container-query units. `HeroArt` is generated from the exports with
  colours as tokens; lamp and chair are separate swinging groups.
  - Dark mode: the cone is **recast every frame** from the lamp's angle
    (`coneAt`) so the light slides/stretches on the floor; it stops at the
    floor line but may run past the block's sides. A dark-ink copy of the
    greeting/tagline is clipped to the cone (`coneClip`, `.hero-lit`), so
    text is dark only where lit. The script line stays white.
  - The script "Product Designer" is outlined artwork used as a CSS mask
    (`/assets/hero/product-designer.svg`, `.hero-script`).
- `useSwing.ts` — damped pendulum (sin-based restoring force, soft stop,
  smoothed brush push that builds/decays over ~0.16s, small vertical bob,
  drag to hold, pull-down with spring bounce). `onFrame` drives the cone.
  The lamp is the **theme switch** (pull past threshold, click, or Enter).
- `LampSwitch.tsx` — small lamp switch used in sidebar, top bars, and the
  case-study rail.
- `Cursor.tsx` — custom cursor (fine pointer, >768px, organized only):
  circle at rest; small circle over links; caret over text; **grey speech
  pill** (13px DM Sans medium, 10px/5px padding, typed text + caret) for
  labelled things; soft **fill snapped behind** items marked
  `data-cursor-frame` (`pill` nav/footer links, `card` work cards with a 6px
  lift, `button` = CV button filled in the cursor's own ink colour with
  inverted label). Items lean slightly toward the pointer. Fills are CSS
  `::before` in index.css.
  - Confirmed cursor text, and nowhere else: project cards "View project",
    Play desk tile "Open playground", lamp "Pull me", chair "Push me",
    coming-soon cards "Coming soon" (currently hidden), footer Email
    "Hey, don't toss that idea away!".
- `WorkSection.tsx` — 2-col grid, 60px gaps, 522.5x339 images r12; caption
  = name · discipline · year (grey 14px) + title (Roboto Slab 24/36).
  Coming-soon projects are filtered out for now.
- `PlaySection.tsx`, `AboutSection.tsx` (copy + 4 captioned photos),
  `ResumeSection.tsx` (CV; contacts block removed; "Download resume").
- `Section.tsx` — 1105px column, 120px gutters on desktop, 160 above
  (120 after the hero), section labels Roboto Slab 20px grey.
- `SiteFooter.tsx` — full-width 101px inverted band: city/time · LinkedIn,
  Github, X, Email (opens `ContactModal`) · rights line. Links medium weight.
- Case studies: `ProjectOverlay.tsx` (full window, no border) →
  `pieces/CaseStudy.tsx` (rail = same nav style as the sidebar, current
  section bold; phone picker in the same type; lamp at the top of the rail;
  section titles +2px). Colours go through `--cs-*` tokens so dark mode
  works; the desk's case studies keep the light sheet.
- Tab icon: `public/favicon-light.svg` / `favicon-dark.svg` (the chair's
  cushion), switched by the browser's own light/dark theme in `index.html`.
- `overscroll-behavior-y: none` in organized mode (no rubber-band gap under
  the footer).
- Top-right layout toggle (to the playground) is hidden in organized mode
  for now. The Play page's desk tile still opens the playground.

## Working preferences (from this chat)

- Confirm interpretations before building anything ambiguous; ask open
  questions **one at a time**, preferably as a small visual widget with
  choices.
- Verify changes in a browser before reporting (headless Chrome via
  `puppeteer-core` scripts works well). Caveat: clipped puppeteer
  screenshots scroll the page and briefly drop hover states; use uncropped
  viewport screenshots when checking hovers.
- Don't commit unless asked. Leave untracked/staged files the user put
  there (`.claude/skills/`, `new_assets/...`) out of commits.

## Open work

1. **Contact modal redesign (not built yet).** Agreed so far:
   - A notepad drawn in the illustration style: a **yellow legal-pad sheet
     (#FFE884) with a black binding**, in both themes; no strokes; fields are
     solid black rectangles; grey backdrop.
   - Fields: **Name** (one field), Your email, Tell me about your project,
     When would you like to start?, How did you find me?
   - Under "Let's Talk": "Email me at pateldvija20@gmail.com, or fill out
     the form below" (mailto link). Remove "I'll get back to you within five
     business days".
   - **One sheet only; no flipping.** Pressing Send tears the sheet off the
     binding, and the sheet underneath shows a **short thank-you note with a
     Close button**.
   - Still to ask: **Q5** how to show the email (plain mailto vs lightly
     obfuscated vs an "Email me" link without the address — a widget was
     shown, no answer yet), **Q6** whether the desk's paper-ball contact
     form gets the notepad too or only recruiter mode.
   - Existing form logic: `src/pieces/ContactModal.tsx` + `api/contact.ts`.
2. Decide whether the Play desk tile should also be hidden while the
   playground is closed.
3. Texture for illustrations was discussed, not built: grain/noise or
   halftone (cheap, reversible); risograph edges, hatching or pencil lines
   (need new art).
4. Later: the playground (isometric-glow style, top-down workspace).

## Git state at handoff

- Last commit: `5435031` (small lamp clipping fix). Everything after that
  in `src/` is **uncommitted** (Figma redesign, cone, cursor pills, case-study
  dark mode, lamp in case study, etc.).
- Already staged, not by these changes: `.claude/skills/iso-glow/*`,
  `new_assets/Homepage-*.svg`, `new_assets/Property 1=footer_*.svg`.
  Untracked: `new_assets/Home page/` (the hero exports the code is built
  from — worth committing with the redesign).
