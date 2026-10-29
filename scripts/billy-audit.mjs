// Audits the Billy & Buddy case study in headless Chrome. Usage, with the dev server on :3001:
//   node scripts/billy-audit.mjs <out dir> [width] [height]            every explorer stage
//   node scripts/billy-audit.mjs <out dir> [width] [height] sections   every section, plus sideways overflow
//
import puppeteer from 'puppeteer-core'
const OUT = process.argv[2]
const W = Number(process.argv[3] ?? 1280), H = Number(process.argv[4] ?? 832)
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, defaultViewport: { width: W, height: H, deviceScaleFactor: 1, isMobile: W < 768, hasTouch: W < 768 } })
const page = await b.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
await page.goto('http://localhost:3001/projects/billy-and-buddy', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))
if (process.argv[5] === 'sections') {
  // One screenshot per section, scrolled so its top sits at the top of the view.
  const ids = await page.$$eval('[id^="billy-and-buddy-"]', els => els.map(e => e.id))
  for (const id of ids) {
    await page.evaluate(id => {
      const el = document.getElementById(id), sc = el.closest('[data-cs-scroller]')
      sc.scrollBy({ top: el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8 })
    }, id)
    await new Promise(r => setTimeout(r, 900))
    await page.screenshot({ path: `${OUT}/sec${W}-${id.replace('billy-and-buddy-', '')}.png` })
  }
  const overflow = await page.evaluate(() => { const sc = document.querySelector('[data-cs-scroller]'); return sc.scrollWidth - sc.clientWidth })
  console.log('sideways overflow px:', overflow)
  await b.close()
  process.exit(0)
}
const n = await page.$$eval('[data-ui="Phase explorer"]', els => els.map(e => e.querySelectorAll('[role="tab"]').length))
for (let e = 0; e < n.length; e++) {
  for (let s = 0; s < n[e]; s++) {
    // Scroll the case study so this explorer sits on stage s, the way its own pills do.
    await page.evaluate((e, s, k) => {
      const el = document.querySelectorAll('[data-ui="Phase explorer"]')[e]
      const sc = el.closest('[data-cs-scroller]')
      const r = el.getBoundingClientRect(), top = sc.getBoundingClientRect().top, vh = sc.clientHeight
      const pin = parseFloat(el.firstElementChild.style.top) || 80
      const span = r.height - vh * 0.85
      sc.scrollBy({ top: r.top - top - pin + ((s + 0.5) / k) * span })
    }, e, s, n[e])
    await new Promise(r => setTimeout(r, Number(process.env.WAIT ?? 7000)))
    await page.screenshot({ path: `${OUT}/v${W}-e${e}s${s}.png` })
  }
}
await b.close()
