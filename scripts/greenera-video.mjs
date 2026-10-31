// Records the Greenera case study clips from the prototype in public/greenera/, with a
// camera that moves in on what is being used and a finger dot that taps (scripts/greenera-rec.js).
// Usage: run the dev server, then `node scripts/greenera-video.mjs <clip>`, where clip is
// hero, score, ingredients, certification, pick or all. BASE_URL defaults to localhost:3000.
// Output: public/assets/projects/greenera/{hero/loop,clips/<clip>}.{mp4,webm,jpg}
//
// Same method as the Bind Desk and Billy & Buddy recordings, with JPEG frames so the
// screencast keeps up: frames from a CDP
// screencast at 2x, each held for its real duration, the last state held, then a
// crossfade back to the first frame so the loop has no jump.
import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/greenera/index.html'
// fileURLToPath, not .pathname: the project folder has spaces in its name
const ROOT = fileURLToPath(new URL('../public/assets/projects/greenera/', import.meta.url))
const TMP = fileURLToPath(new URL('../.video-frames/', import.meta.url))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DPR = 2
const HOLD = 1.4
const XFADE = 0.5

const which = (process.argv[2] ?? 'all').toLowerCase()
const CLIPS = which === 'all' ? ['hero', 'score', 'ingredients', 'certification', 'pick'] : [which]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
let page

// The camera and finger live in scripts/greenera-rec.js, injected after the page loads.
const REC = readFileSync(fileURLToPath(new URL('./greenera-rec.js', import.meta.url)), 'utf8')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
/** Calls one of the recording helpers (cam, touch, swipe, moveTo, hide) inside the page. */
const rec = (fn, ...args) => page.evaluate((fn, args) => window.__rec[fn](...args), fn, args)
const app = (fn, ...args) => page.evaluate((fn, args) => window.__greenera[fn](...args), fn, args)
const scrollTo = (screen, y) => page.evaluate((s, y) => (document.querySelector(`#${s} .scroll`).scrollTop = y), screen, y)

// Square clips sit beside a paragraph; the hero is landscape, on the case study's own green.
// Every clip opens on the whole phone, moves in close on what is being used, and comes
// back to the frame it started on, so the loop's crossfade is between two identical frames.
const SQUARE = { width: 900, height: 900 }

const SCENES = {
  // Camera, scan, the card rises and its ring fills, then it expands, the camera
  // leans in on the three categories, and it all closes back to the empty camera.
  // 1080 x 702 keeps the hero's 1440 x 936 shape at a frame size the screencast
  // can keep up with; at 1440 it dropped to a few frames a second.
  hero: {
    view: { width: 1080, height: 702 },
    bg: 'E6F7E1',
    out: 'hero/loop',
    width: 1600,
    run: async (poster) => {
      await wait(900)
      await rec('touch', '#shutter', 700)
      await wait(1900)
      await rec('touch', '#toggle', 700)
      await rec('cam', 196, 600, 1.35, 1000)
      poster()
      await wait(1800)
      await rec('cam', 196, 426, 1, 900)
      await rec('touch', '#toggle', 600)
      await wait(700)
      await rec('touch', '#close', 700)
      await rec('moveTo', 300, 640, 700)
      await wait(900)
    },
  },
  // The card already up: expand it and read the three categories up close, then
  // the product page's Show scoring criteria opens the breakdown, swiped down to
  // the two factors marked Not disclosed, and back to the card.
  score: {
    view: SQUARE,
    bg: 'FFF6CF',
    out: 'clips/score',
    width: 1000,
    setup: async () => {
      await app('scanNow')
      await wait(1400)
    },
    run: async (poster) => {
      await wait(700)
      await rec('touch', '#toggle')
      await rec('cam', 196, 520, 1.6, 1000)
      poster()
      await wait(1500)
      await rec('cam', 196, 426, 1, 800)
      await rec('touch', '#toProduct')
      await wait(400)
      await rec('swipe', 'product', 1156, 1300)
      await rec('touch', '#product [aria-label="Show scoring criteria"]')
      await wait(300)
      await rec('cam', 196, 470, 1.45, 900)
      await rec('swipe', 'breakdown', 420, 1700)
      await wait(1300)
      await rec('cam', 196, 426, 1, 800)
      await rec('touch', '#breakdown [data-back]')
      await wait(300)
      await rec('touch', '#product [data-back]')
      await wait(400)
      await rec('touch', '#toggle')
      await rec('moveTo', 300, 640, 600)
      await wait(700)
    },
  },
  // The expanded card: in close on the better pick, tap it, and Fern's own page
  // opens, down to its scores; then back to the card.
  pick: {
    view: SQUARE,
    bg: 'E3F4EC',
    out: 'clips/pick',
    width: 1000,
    setup: async () => {
      await app('scanNow')
      await wait(1300)
      await app('setOpen', true)
      await wait(900)
    },
    run: async (poster) => {
      await wait(800)
      await rec('cam', 196, 656, 1.9, 1000)
      poster()
      await wait(900)
      await rec('touch', '#toPick')
      await rec('cam', 196, 426, 1, 800)
      await wait(700)
      // Down to Fern's At a Glance card, now in the same layout as Calma's page
      await rec('swipe', 'pdp-fern', 1262, 1600)
      await rec('cam', 196, 420, 1.35, 900)
      await wait(1500)
      await rec('cam', 196, 426, 1, 800)
      await rec('touch', '#pdp-fern [data-back]')
      await rec('moveTo', 300, 640, 600)
      await wait(700)
    },
  },
  // The product page at its ingredients, Show All, then the breakdown loads: the
  // bottle fills layer by layer up close, moves onto its rail, the list rises in and
  // scrolls past it; then back.
  ingredients: {
    view: SQUARE,
    bg: 'E6F7E1',
    out: 'clips/ingredients',
    width: 1000,
    setup: async () => {
      await app('go', 'product')
      await wait(500)
      await scrollTo('product', 1739)
      await wait(300)
    },
    run: async (poster) => {
      await wait(700)
      await rec('cam', 196, 330, 1.5, 900)
      await wait(500)
      await rec('touch', '#product [aria-label^="Show all"]')
      await rec('hide')
      await rec('cam', 196, 420, 1.45, 600)
      await wait(1100)
      poster()
      await wait(400)
      await rec('cam', 196, 426, 1, 700)
      await wait(900)
      await rec('swipe', 'ingredients', 360, 1400)
      await rec('swipe', 'ingredients', 760, 1300)
      await wait(900)
      await rec('touch', '#ingredients [data-back]')
      await rec('moveTo', 300, 640, 600)
      await wait(700)
    },
  },
  // Down from the ingredients to the certification: in close on the claim tagged
  // Brand-reported, across the three certifications, then back up.
  certification: {
    view: SQUARE,
    bg: 'ECEBFF',
    out: 'clips/certification',
    width: 1000,
    setup: async () => {
      await app('go', 'product')
      await wait(500)
      await scrollTo('product', 1739)
      await wait(300)
    },
    run: async (poster) => {
      await wait(700)
      // The section heading sits at 2250; the fixed top bar covers the first 123
      await rec('swipe', 'product', 2111, 1500)
      await rec('cam', 196, 250, 1.7, 1000)
      poster()
      await wait(1500)
      await rec('cam', 196, 500, 1.35, 1100)
      await wait(1300)
      await rec('cam', 196, 426, 1, 800)
      await rec('moveTo', 300, 300, 500)
      // a swipe down, back to where the clip began
      const back = async () => page.evaluate(async () => {
        const sc = document.querySelector('#product .scroll')
        const from = sc.scrollTop
        const t0 = performance.now()
        await new Promise((done) => {
          const f = (now) => {
            const k = Math.min(1, (now - t0) / 1300)
            const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
            sc.scrollTop = from + (1739 - from) * e
            if (k < 1) requestAnimationFrame(f)
            else done()
          }
          requestAnimationFrame(f)
        })
      })
      await back()
      await rec('moveTo', 300, 640, 600)
      await wait(700)
    },
  },
}

for (const name of CLIPS) {
  const scene = SCENES[name]
  if (!scene) throw new Error(`Unknown clip "${name}". Use hero, score, ingredients, certification, pick or all.`)
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  page = await browser.newPage()
  await page.setViewport({ ...scene.view, deviceScaleFactor: DPR })
  await page.goto(`${BASE}?rec=1&bg=${scene.bg}`, { waitUntil: 'networkidle0' })
  await page.addScriptTag({ content: REC })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))
  await wait(600)
  if (scene.setup) await scene.setup()

  const cdp = await page.createCDPSession()
  const frames = []
  let posterIndex = 0
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    writeFileSync(`${TMP}f${String(frames.length).padStart(5, '0')}.jpg`, Buffer.from(data, 'base64'))
    frames.push(metadata.timestamp)
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: scene.view.width * DPR, maxHeight: scene.view.height * DPR, everyNthFrame: 1 })
  await wait(600)
  await scene.run(() => (posterIndex = Math.max(0, frames.length - 1)))
  await wait(400)
  await cdp.send('Page.stopScreencast')
  await page.close()
  encode(name, scene, frames, posterIndex)
}
await browser.close()

function encode(name, scene, frames, posterIndex) {
  const SPEED = scene.speed ?? 1
  const lines = []
  for (let i = 0; i < frames.length; i++) {
    const dur = (i < frames.length - 1 ? frames[i + 1] - frames[i] : HOLD * SPEED) / SPEED
    lines.push(`file '${TMP}f${String(i).padStart(5, '0')}.jpg'`, `duration ${Math.max(0.001, dur).toFixed(4)}`)
  }
  lines.push(`file '${TMP}f${String(frames.length - 1).padStart(5, '0')}.jpg'`)
  writeFileSync(`${TMP}list.txt`, lines.join('\n'))
  const main = (frames.at(-1) - frames[0]) / SPEED + HOLD
  const prep = `fps=30,scale=${scene.width}:-2:flags=lanczos,format=yuv420p,settb=AVTB,setpts=PTS-STARTPTS`
  const graph = `[0:v]${prep}[a];[1:v]${prep}[b];[a][b]xfade=transition=fade:duration=${XFADE}:offset=${(main - XFADE).toFixed(3)}[v]`
  const inputs = ['-f', 'concat', '-safe', '0', '-i', `${TMP}list.txt`, '-loop', '1', '-t', String(XFADE + 0.1), '-i', `${TMP}f00000.jpg`]
  const base = `${ROOT}${scene.out}`
  mkdirSync(base.replace(/[^/]+$/, ''), { recursive: true })
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', '-an', `${base}.mp4`])
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[v]', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', `${base}.webm`])
  const posterFile = `${TMP}f${String(posterIndex).padStart(5, '0')}.jpg`
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', posterFile, '-vf', `scale=${scene.width}:-2:flags=lanczos`, '-q:v', '3', `${base}.jpg`])
  rmSync(TMP, { recursive: true, force: true })
  console.log(`${name}: frames ${frames.length}, length ${main.toFixed(1)}s`)
}
