// Renders the Greenera Outcome lineup from the prototype: the scan card expanded, then the
// tops of the product page, the score breakdown and the ingredient breakdown, four phones
// on the case study's green. Usage: run the dev server, then `node archive/scripts/greenera-lineup.mjs`.
// Output: archive/projects/greenera/outcome-lineup.png (1944 x 1200, 2x of 972 x 600)
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/greenera/index.html'
const OUT = fileURLToPath(new URL('../projects/greenera/outcome-lineup.png', import.meta.url))
const ASSETS = fileURLToPath(new URL('../../public/greenera/assets/', import.meta.url))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage()

// The scan card, expanded, as the prototype draws it
await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 })
await page.goto(`${BASE}?frame=0`, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)
await page.evaluate(() => (window.__greenera.scanNow(), window.__greenera.setOpen(true)))
await new Promise((r) => setTimeout(r, 1800))
const scan = (await page.screenshot({ encoding: 'base64' }))

const uri = (f, type) => `data:${type};base64,${readFileSync(ASSETS + f).toString('base64')}`
const shots = [
  `data:image/png;base64,${scan}`,
  uri('product.jpg', 'image/jpeg'),
  uri('breakdown.png', 'image/png'),
  uri('ingredients.png', 'image/png'),
]

await page.setViewport({ width: 972, height: 600, deviceScaleFactor: 2 })
await page.setContent(`<!doctype html><style>
  body { margin: 0; width: 972px; height: 600px; background: #E6F7E1; display: flex; align-items: center; justify-content: center; gap: 24px; }
  .phone { width: 196px; height: 425px; border-radius: 30px; padding: 6px; background: #121611; box-shadow: 0 18px 40px -18px rgba(19,25,16,.35); }
  .screen { width: 100%; height: 100%; border-radius: 25px; background-size: 100% auto; background-position: top center; background-repeat: no-repeat; }
</style>${shots.map((s) => `<div class="phone"><div class="screen" style="background-image:url(${s})"></div></div>`).join('')}`)
await page.evaluate(() => Promise.all([...document.querySelectorAll('.screen')].map(() => new Promise((r) => setTimeout(r, 200)))))
await page.screenshot({ path: OUT })
await browser.close()
console.log('outcome-lineup.png written')
