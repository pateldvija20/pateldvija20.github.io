// Renders the room loader's window-and-tree scene to 1920x1080 PNGs, one per
// palette: the start frames the Higgsfield loops are generated from.
// Light mode, motion paused, UI hidden. Needs the dev server running and
// Google Chrome installed.
//
//   node scripts/room-start-frame.mjs [url]
//   default url: http://localhost:8443/room

import puppeteer from "puppeteer-core";

const url = process.argv[2] ?? "http://localhost:8443/room";
const TONES = ["color", "grey"];

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([
  { name: "prefers-color-scheme", value: "light" },
  { name: "prefers-reduced-motion", value: "reduce" },
]);
for (const tone of TONES) {
  const out = decodeURIComponent(new URL(`../public/assets/room/loader/start-frame-${tone}.png`, import.meta.url).pathname);
  await page.goto(`${url}?tone=${tone}`, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: "#root > *:not(.hl-room), .hl-loader-prompt, .hl-sound { display: none !important }" });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
}
await browser.close();
