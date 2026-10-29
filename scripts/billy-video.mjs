// Records the Billy & Buddy case study clips by playing the game with a drawn cursor.
// Usage: run the dev server, then `node scripts/billy-video.mjs <clip>`, where clip is
// loop, story, sort, feedback, checkout or all. BASE_URL defaults to localhost:3003.
// Output: public/assets/projects/billy-and-buddy/{hero/loop,clips/<clip>}.{mp4,webm,jpg}
//
// Same method as the Bind Desk recordings: PNG frames from a CDP screencast at 2x,
// each held for its real duration, the last state held, then a crossfade back to the
// first frame so the loop has no jump.
import puppeteer from 'puppeteer-core'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:3003/billy-and-buddy-game/'
// fileURLToPath, not .pathname: the project folder has spaces in its name
const ROOT = fileURLToPath(new URL('../public/assets/projects/billy-and-buddy/', import.meta.url))
const TMP = fileURLToPath(new URL('../.video-frames/', import.meta.url))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
// The game's stage is 1512 x 982; this keeps its shape with no letterbox.
const VIEW = { width: 1200, height: 779 }
const DPR = 2
const HOLD = 1.4
const XFADE = 0.5

// The zoo's needs, so the cursor picks the right basket.
const NEEDS = new Set(['Water bottle', 'Hat', 'Backpack', 'Chips', 'Sunglasses'])

const which = (process.argv[2] ?? 'all').toLowerCase()
const CLIPS = which === 'all' ? ['loop', 'story', 'sort', 'feedback', 'checkout'] : [which]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, defaultViewport: { ...VIEW, deviceScaleFactor: DPR } })
let page

const INIT = () => {
  window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div')
    c.innerHTML =
      '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2.5 19 12.6l-6.6 1.3 3.7 7.4-2.9 1.4-3.7-7.4L4.6 20Z" fill="#1c1c1c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(600px, 420px)' })
    document.body.appendChild(c)
    let x = 600
    let y = 420
    window.__moveCursor = (tx, ty, ms) =>
      new Promise((done) => {
        const sx = x
        const sy = y
        const t0 = performance.now()
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms)
          x = sx + (tx - sx) * ease(k)
          y = sy + (ty - sy) * ease(k)
          c.style.transform = `translate(${x - 5}px, ${y - 4}px)`
          if (k < 1) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      })
    window.__ripple = () => {
      const r = document.createElement('div')
      Object.assign(r.style, {
        position: 'fixed', left: `${x - 18}px`, top: `${y - 18}px`, width: '36px', height: '36px', borderRadius: '50%',
        border: '3px solid rgba(255,255,255,.85)', boxShadow: '0 0 0 2px rgba(0,0,0,.25)', zIndex: '2147483646', pointerEvents: 'none',
        transition: 'transform .45s ease-out, opacity .45s ease-out',
      })
      document.body.appendChild(r)
      requestAnimationFrame(() => {
        r.style.transform = 'scale(1.8)'
        r.style.opacity = '0'
      })
      setTimeout(() => r.remove(), 500)
    }
  })
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function click(selector, { pause = 900, ms = 650, index = 0 } = {}) {
  const els = await page.$$(selector)
  const el = els[index]
  if (!el) throw new Error(`No element for ${selector} [${index}]`)
  const box = await el.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.evaluate((x, y, ms) => window.__moveCursor(x, y, ms), x, y, ms)
  await wait(180)
  await page.evaluate(() => window.__ripple())
  await page.mouse.click(x, y)
  await wait(pause)
}

/** Waits for the next falling piece and returns its name. */
async function nextPiece() {
  await page.waitForFunction(() => document.querySelector('.piece .name'), { timeout: 20000 })
  await wait(350)
  return page.$eval('.piece .name', (n) => n.textContent)
}

/**
 * Steers the falling piece into the right basket, or the wrong one, by clicking
 * the basket under it (each click moves it one column), then drops it with space
 * unless `fall` lets gravity take it. Waits until the piece is gone.
 */
async function sort({ wrong = false, fall = false, pause = 1300 } = {}) {
  const name = await nextPiece()
  const need = NEEDS.has(name) !== wrong
  // Columns are 182 stage px wide; the left three are Needs, the right three Wants
  const col = await page.$eval('.piece', (p) => Math.round(new DOMMatrix(getComputedStyle(p).transform).m41 / (1092 / 6)))
  const target = need ? 1 : 4
  const dir = Math.sign(target - col)
  for (let i = 0; i < Math.abs(target - col); i++) {
    await click(dir < 0 ? '.basket.need' : '.basket.want', { pause: 260, ms: i ? 160 : 520 })
  }
  await wait(450)
  if (!fall) await page.keyboard.press('Space')
  await page.waitForFunction(() => !document.querySelector('.piece'), { timeout: 20000 })
  await wait(pause)
}

/** The checkout cart's buttons, by item name. */
const cartIndex = (name) => page.$$eval('.shelf li button', (bs, name) => bs.findIndex((b) => b.getAttribute('aria-label').startsWith(name + ',')), name)

/** Taps a cart item, which puts it on a free spot on the belt. */
async function pick(name, pause = 650) {
  await click('.shelf li button', { index: await cartIndex(name), pause, ms: 420 })
}

/** Drags a cart item onto the belt at a point given as fractions of the belt. */
async function drag(name, fx, fy, pause = 700) {
  const el = (await page.$$('.shelf li button'))[await cartIndex(name)]
  const a = await el.boundingBox()
  const belt = await (await page.$('.co-belt')).boundingBox()
  const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
  const to = { x: belt.x + belt.width * fx, y: belt.y + belt.height * fy }
  await page.evaluate((x, y) => window.__moveCursor(x, y, 480), from.x, from.y)
  await wait(150)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  const steps = 24
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    const x = from.x + (to.x - from.x) * e
    const y = from.y + (to.y - from.y) * e
    await page.mouse.move(x, y)
    await page.evaluate((x, y) => window.__moveCursor(x, y, 16), x, y)
    await wait(16)
  }
  await page.mouse.up()
  await wait(pause)
}

async function go(hash) {
  await page.evaluate((h) => (location.hash = h), hash)
  await wait(900)
}

const NEED_NAMES = ['Water bottle', 'Hat', 'Backpack', 'Chips', 'Sunglasses']

const SCENES = {
  // The hero: title screen, menu, the zoo intro and story, a few sorts with one
  // mistake, then pay and win.
  loop: {
    url: '?demo#intro',
    out: 'hero/loop',
    width: 1600,
    speed: 1.15,
    run: async (poster) => {
      await wait(1400)
      poster()
      await click('.intro-play', { pause: 1400 })
      await click('.menu-card', { pause: 1600 })
      await click('.btn-xl', { pause: 3200 })
      await page.waitForFunction(() => document.querySelector('.lines .bubble'), { timeout: 15000 })
      await wait(3600)
      await click('.skip', { pause: 1000 })
      await click('.rule-card button', { pause: 600 })
      await sort()
      await sort({ wrong: true, pause: 1900 })
      await sort()
      await go('#checkout/zoo')
      await drag('Water bottle', 0.3, 0.62, 500)
      for (const n of NEED_NAMES.slice(1)) await pick(n, 380)
      await pick('Lollipop', 900)
      await click('.pay', { pause: 4200 })
    },
  },
  // Billy walks in and the conversation plays on its own, then the first rules.
  story: {
    url: '?demo#story/zoo',
    out: 'clips/story',
    width: 1280,
    speed: 1.5,
    run: async (poster) => {
      await page.waitForFunction(() => document.querySelectorAll('.lines .bubble').length >= 2, { timeout: 20000 })
      await wait(1200)
      poster()
      await page.waitForFunction(() => document.querySelector('.rule-card'), { timeout: 40000 })
      await wait(1600)
      await click('.rule-card button', { pause: 1200 })
    },
  },
  // Items fall in random columns and are steered into Needs or Wants.
  sort: {
    url: '?demo#play/zoo',
    out: 'clips/sort',
    width: 1280,
    speed: 1.3,
    run: async (poster) => {
      await sort({ fall: true })
      await nextPiece()
      await wait(900)
      poster()
      await sort()
      await sort()
      await sort()
    },
  },
  // A wrong basket turns red, costs a life, and Billy explains with a hint.
  feedback: {
    url: '?demo#play/zoo',
    out: 'clips/feedback',
    width: 1280,
    speed: 1.2,
    run: async (poster) => {
      await sort({ pause: 900 })
      await sort({ wrong: true, pause: 0 })
      await wait(700)
      poster()
      await wait(1600)
      await sort({ pause: 1200 })
    },
  },
  // Needs dragged and tapped onto the belt, a want pushes it over budget,
  // it goes back, then pay: the belt slides away and the stars come in.
  checkout: {
    url: '?demo#checkout/zoo',
    out: 'clips/checkout',
    width: 1280,
    speed: 1.3,
    run: async (poster) => {
      await wait(900)
      await drag('Water bottle', 0.28, 0.6)
      await drag('Hat', 0.62, 0.72)
      for (const n of NEED_NAMES.slice(2)) await pick(n)
      await pick('Binoculars', 1700)
      poster()
      await pick('Binoculars', 1000)
      await pick('Lollipop', 1000)
      await click('.pay', { pause: 4600 })
    },
  },
}

for (const name of CLIPS) {
  const scene = SCENES[name]
  if (!scene) throw new Error(`Unknown clip "${name}". Use loop, story, sort, feedback, checkout or all.`)
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  page = await browser.newPage()
  await page.evaluateOnNewDocument(INIT)
  // A fresh origin state each run, so the menu's saved total starts at $0
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(`${BASE}${scene.url}`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await wait(900)

  const cdp = await page.createCDPSession()
  const frames = []
  let posterIndex = 0
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    writeFileSync(`${TMP}f${String(frames.length).padStart(5, '0')}.png`, Buffer.from(data, 'base64'))
    frames.push(metadata.timestamp)
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: VIEW.width * DPR, maxHeight: VIEW.height * DPR, everyNthFrame: 1 })
  await wait(600)
  await scene.run(() => (posterIndex = Math.max(0, frames.length - 1)))
  await wait(400)
  await cdp.send('Page.stopScreencast')
  await page.close()
  encode(name, scene, frames, posterIndex)
}
await browser.close()

function encode(name, scene, frames, posterIndex) {
  const SPEED = scene.speed ?? 1.3
  const lines = []
  for (let i = 0; i < frames.length; i++) {
    const dur = (i < frames.length - 1 ? frames[i + 1] - frames[i] : HOLD * SPEED) / SPEED
    lines.push(`file '${TMP}f${String(i).padStart(5, '0')}.png'`, `duration ${Math.max(0.001, dur).toFixed(4)}`)
  }
  lines.push(`file '${TMP}f${String(frames.length - 1).padStart(5, '0')}.png'`)
  writeFileSync(`${TMP}list.txt`, lines.join('\n'))
  const main = (frames.at(-1) - frames[0]) / SPEED + HOLD
  const prep = `fps=30,scale=${scene.width}:-2:flags=lanczos,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS`
  const graph = `[0:v]${prep}[a];[1:v]${prep}[b];[a][b]xfade=transition=fade:duration=${XFADE}:offset=${(main - XFADE).toFixed(3)}[v]`
  const inputs = ['-f', 'concat', '-safe', '0', '-i', `${TMP}list.txt`, '-loop', '1', '-t', String(XFADE + 0.1), '-i', `${TMP}f00000.png`]
  const base = `${ROOT}${scene.out}`
  mkdirSync(base.replace(/[^/]+$/, ''), { recursive: true })
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-tune', 'animation', '-movflags', '+faststart', '-an', `${base}.mp4`])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[v]', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', `${base}.webm`])
  const posterFile = `${TMP}f${String(posterIndex).padStart(5, '0')}.png`
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', posterFile, '-vf', `scale=${scene.width}:-2:flags=lanczos`, '-q:v', '3', `${base}.jpg`])
  rmSync(TMP, { recursive: true, force: true })
  console.log(`${name}: frames ${frames.length}, length ${main.toFixed(1)}s`)
}
