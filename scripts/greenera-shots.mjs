// Captures the stills for the Greenera case study's design breakdowns from the prototype
// in public/greenera/: two whole screens (the expanded scan card, the ingredient breakdown)
// and three cards cut from Calma's product page (price, score, certification).
// Usage: run the dev server, then `node scripts/greenera-shots.mjs`. BASE_URL defaults to localhost:3000.
// Output: public/assets/projects/greenera/breakdown/<shot>.png at 3x.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/greenera/index.html'
// fileURLToPath, not .pathname: the project folder has spaces in its name
const OUT = fileURLToPath(new URL('../public/assets/projects/greenera/breakdown/', import.meta.url))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()
// Room around the 393 x 852 stage, so the prototype draws it at scale 1
await page.setViewport({ width: 520, height: 1000, deviceScaleFactor: 3 })

const app = (fn, ...args) => page.evaluate((fn, args) => window.__greenera[fn](...args), fn, args)
const load = async () => {
  await page.goto(`${BASE}?frame=0`, { waitUntil: 'networkidle0' })
  await wait(600)
}
/** The stage's rect in page pixels. */
const stage = () => page.evaluate(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
const shoot = async (name, clip) => {
  await page.screenshot({ path: `${OUT}${name}.png`, clip })
  console.log(name, Math.round(clip.width), 'x', Math.round(clip.height))
}

/**
 * Scrolls Calma's page so `from` sits just under the fixed search header, then cuts the
 * stage's full width from the top of `from` to the bottom of `to`, with a margin.
 */
async function card(name, from, to, pad = 14) {
  const box = await page.evaluate(async (from, to, pad) => {
    const sec = document.querySelector('#product'), sc = sec.querySelector('.scroll')
    const head = sec.querySelector('.fixed-head').getBoundingClientRect().bottom
    sc.scrollTop += sec.querySelector(from).getBoundingClientRect().top - head - pad - 4
    await new Promise((r) => setTimeout(r, 400))
    const a = sec.querySelector(from).getBoundingClientRect(), b = sec.querySelector(to).getBoundingClientRect(), s = sec.getBoundingClientRect()
    return { x: s.x, y: a.top - pad, width: s.width, height: b.bottom - a.top + pad * 2 }
  }, from, to, pad)
  await shoot(name, box)
}

// The scan card, risen and expanded over the camera
await load()
await app('scanNow')
await wait(2200)
await app('setOpen', true)
await wait(1400)
await shoot('scan', await stage()) // converted to scan.jpg (a photo) after capture

// The ingredient breakdown, with Propylene Glycol (a use-with-care ingredient) open
await load()
await app('openBreakdown', 'calma')
await wait(2800)
await page.click('#ingredients li:nth-child(4) .ing-row')
await wait(1600)
await shoot('ingredients', await stage())

// Cards from Calma's own page
await load()
await app('go', 'product')
await wait(900)
await card('price', '.p-was', '.p-buy')
await card('score', '.p-glance', '.p-glance')
await card('certification', '.p-h.cert', '.p-cert:last-of-type')

await browser.close()
