# Where everything is

A map of this portfolio's files, for whoever (or whichever AI) works on it
next. Updated 1 Nov 2026.

**The rule:** this GitHub repo holds only the files the live site is built
from. Everything else (docs, scripts, design exports, archived work, AI and
editor config) stays on the owner's Mac, listed in `.gitignore`. Don't commit
those files back, and don't import anything from them into `src/`, because a
fresh clone won't have them and the deploy would fail.

## The live site

- **URL**: https://pateldvija20-github-io.vercel.app
- **Host**: Vercel. Production deploys from the `main-v2` branch (the
  repo's default branch). Other branches get preview deploys.
- **Build**: `npm install`, then `vite build`, which outputs `dist/`.
  `vercel.json` rewrites routes to the right `index.html`.
- **Environment variables** (set in the Vercel project, never committed):
  `RESEND_API_KEY`, `CONTACT_TO_EMAIL` and `CONTACT_FROM_EMAIL`, for the
  contact form.

## On GitHub: the files the deploy needs

### Config and entry

| File | What it does |
|---|---|
| `index.html` | The page shell. Loads `src/main.tsx` |
| `package.json`, `package-lock.json` | Dependencies and scripts (React 19, Vite, Tailwind v4, GSAP, framer-motion) |
| `vite.config.ts` | Vite build. Also adds dev-only plugins: route rewrites for the prototypes, and the inspector's text-edit endpoint |
| `.figma/make/site.json` | Page title and meta tags. `vite.config.ts` imports it |
| `tsconfig.json` | TypeScript settings |
| `vercel.json` | Route rewrites for `/bind-desk/*`, `/billy-and-buddy-game` and the single-page app |
| `api/contact.ts` | A Vercel Edge Function behind the "Let's Talk" form. It sends the message by email through Resend |
| `.gitignore` | Keeps the local-only files below out of git |

### `src/`: the app

| Path | What it is |
|---|---|
| `src/main.tsx` | Entry. Mounts `App`, and lazy-loads `/room` and the dev inspector (dev only) |
| `src/App.tsx` | The main site: the desk (Scattered mode) and the switch to Organised mode |
| `src/index.css` | Global CSS, Tailwind import and the theme tokens for light, dark and Organised mode |
| `src/responsive.ts` | Breakpoints and scaling model |
| `src/organized/` | Organised mode, the linkable page version: hero, Work, Play, About, CV, Writing, Archive, sidebar, footer, router and `content.ts` (copy) |
| `src/pieces/` | The desk objects (pencils, file folder, keyboard, coaster, stamp, puzzle and so on) and the case studies |
| `src/pieces/projects.ts` | The project list. Each project's name, title, hero and card image |
| `src/pieces/CaseStudy.tsx` | The case-study page layout shared by every project |
| `src/pieces/bindDesk.tsx`, `billyAndBuddy.tsx`, `greenera.tsx`, `theFamilyTable.tsx` | Each case study's content |
| `src/pieces/caseStudySections.ts`, `caseStudyKit.tsx`, `caseStudyBits.tsx` | Section lists and building blocks for case studies |
| `src/pieces/tokens.ts` | Design tokens |
| `src/room/` | `/room`, an early page: the seasonal tree loader (`RoomLoader.tsx`, `SeasonTree.tsx`, `ambience.ts`, `room.css`) |
| `src/assets/sticker-sheet.svg` | Imported by `StickerSheet.tsx` |

### `public/`: copied as-is into the site

| Path | What it is |
|---|---|
| `public/assets/*.svg` | Desk illustrations, each in `_light` and `_dark` |
| `public/assets/projects/<project>/` | Case-study images and clips for bind-desk, billy-and-buddy, greenera and the-family-table, plus the card images |
| `public/assets/aboutme/`, `hero/`, `logos/`, `play/`, `puzzle/` | Images for those sections |
| `public/assets/room/loader/` | Start frames for the `/room` loader |
| `public/bind-desk/` | The Bind Desk prototype, **built output**. Its source is in another project (see below) |
| `public/billy-and-buddy-game/` | The Billy & Buddy game. Plain HTML, JS and CSS, edited here |
| `public/greenera/` | The Greenera prototype. Plain HTML, JS and CSS, edited here |
| `public/Dvija_Patel_Resume.pdf` | The résumé download |
| `public/favicon-light.svg`, `favicon-dark.svg` | Favicons |

## Only on the owner's Mac

All of these are in the project folder,
`/Users/dvijapatel/Projects/Portfolio - 2 /`, and listed in `.gitignore`.

| Path | What it is |
|---|---|
| `archive/` | Work not on the site. **Read `archive/info.md` first.** |
| `archive/full-repo-backup-2026-11-01.bundle` | The whole git repo before the cleanup: every old branch (`main`, `dev-v2`, `bind-desk-case-study`, `archive/nextjs-portfolio`, `main-v2`) with full history. Restore with `git clone <bundle> <folder>` |
| `archive/room-window-view/` | The next `/room` (three.js window view, pull-back into the room, Work book, case study), with steps to bring it back |
| `archive/nextjs-portfolio/` | The first portfolio, in Next.js with Sanity |
| `archive/projects/`, `archive/scripts/` | Case-study media and scripts taken out of the site |
| `docs/` | Design and engineering notes: overview, state model, interactions, animations, components, recruiter-mode handoff, UI vocabulary, Billy & Buddy plan |
| `scripts/` | Puppeteer scripts that recorded and screenshotted the prototypes for case-study media (`greenera-*`, `billy-*`, `room-start-frame.mjs`) |
| `exports/case-studies/` | PDF exports of the four case studies |
| `new_assets/` | Source SVGs from Figma (desk mats, keyboard, footer, polaroid, stamps, home page) before they were optimised into `public/assets/` |
| `assets-src/` | Full-resolution photo originals. Web-sized copies are in `public/assets/` |
| `.bind-desk-compare/` | Before and after screenshots of the Bind Desk case study at 1440 and 390 px |
| `src/dev/Inspector.tsx` | The dev-only UI inspector. Dev builds load it if it's present. Never ship it |
| `src/room/bench.html`, `src/room/kit.js` | The hairline room's object test bench (dev only) |
| `src/pieces/diagrams/` | Four service-design SVGs that nothing imports yet |
| `AGENTS.md`, `CLAUDE.md` | Instructions for AI agents |
| `.claude/`, `.agents/`, `skills-lock.json` | Claude Code settings, launch config and skills (including `hairline-room` for the room's style) |
| `.opencode/` | OpenCode editor config |
| `.env.example` | The contact form's environment variables, documented |

## Other projects that feed this one

These are on the Mac, next to this one in `/Users/dvijapatel/Projects/`:

- `bind-desk-prototype/`: the source of the Bind Desk prototype (Vite,
  `base: '/bind-desk/'`). Build it, then copy its `dist/` into
  `public/bind-desk/`.
- `Portfolio/`: the working folder of the first, Next.js portfolio. Its files
  are also archived in `archive/nextjs-portfolio/`.
- `portfolio-studio/`: the Sanity studio from the Next.js portfolio.

## When adding something

- **The site uses it** (imported by `src/`, served from `public/`, or read by
  the build): commit it, and add a row above.
- **It doesn't**: keep it local, add its path to `.gitignore`, and add a row
  under "Only on the owner's Mac".
- Tailwind skips everything in `.gitignore` when it scans for class names, so
  local files don't leak into the site's CSS.
