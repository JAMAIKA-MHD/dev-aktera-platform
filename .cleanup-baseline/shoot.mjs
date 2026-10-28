// Baseline / after screenshots of every template x screen x viewport, plus the asset
// requests each page makes (404s, console errors, bytes transferred).
//   node .cleanup-baseline/shoot.mjs <base-url> <out-dir>
//   node .cleanup-baseline/shoot.mjs --compare <dir-a> <dir-b> [<report.json>]
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATES = ["eight-slot", "comic-burst", "pixel-quest", "arcade-night", "quiz-show"];
const SCREENS = [
  "wheel-welcome", "register", "wheel-play", "scratch-play", "boxes-play",
  "quiz-play", "hit-it-play", "flow-win", "flow-lose", "status-closed",
];
const VIEWPORTS = { desktop: { width: 1280, height: 720 }, mobile: { width: 390, height: 844 } };

async function shoot(base, out) {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  const report = [];
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "fr-FR",
    });
    for (const t of TEMPLATES) {
      for (const s of SCREENS) {
        const page = await context.newPage();
        const entry = { template: t, screen: s, viewport: vpName, errors: [], failed: [], requests: 0, bytes: 0 };
        page.on("console", (m) => m.type() === "error" && entry.errors.push(m.text()));
        page.on("pageerror", (e) => entry.errors.push(String(e)));
        page.on("requestfailed", (r) => entry.failed.push(`${r.failure()?.errorText} ${r.url()}`));
        page.on("response", async (r) => {
          entry.requests++;
          if (r.status() >= 400) entry.failed.push(`${r.status()} ${r.url()}`);
          try { entry.bytes += (await r.body()).length; } catch { /* redirect / aborted */ }
        });
        await page.goto(`${base}/xp-frame?fixture=${s}&template=${t}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: join(out, `${t}__${s}__${vpName}.png`), animations: "disabled" });
        report.push(entry);
        await page.close();
      }
    }
    await context.close();
  }
  await browser.close();
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  const bad = report.filter((e) => e.errors.length || e.failed.length);
  console.log(`${report.length} shots in ${out}; ${bad.length} with console errors or failed requests`);
}

// Pixel diff in the browser's own canvas: no image dependency.
async function compare(a, b, reportPath) {
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage();
  const files = readdirSync(a).filter((f) => f.endsWith(".png"));
  const results = [];
  for (const f of files) {
    let other;
    try { other = readFileSync(join(b, f)).toString("base64"); } catch { results.push({ file: f, missing: true }); continue; }
    const mine = readFileSync(join(a, f)).toString("base64");
    results.push({ file: f, ...(await page.evaluate(async ([x, y]) => {
      const load = (d) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${d}`; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: true };
      const px = (img) => { const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
      const da = px(ia), db = px(ib);
      let diff = 0, max = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
        if (d > 8) diff++;
        if (d > max) max = d;
      }
      return { diffPixels: diff, ratio: diff / (da.length / 4), maxChannelDelta: max };
    }, [mine, other])) });
  }
  await browser.close();
  if (reportPath) writeFileSync(reportPath, JSON.stringify(results, null, 2));
  const changed = results.filter((r) => r.missing || r.sizeMismatch || r.diffPixels > 0);
  console.log(`${results.length} compared, ${changed.length} differ`);
  for (const r of changed) console.log(`  ${r.file}: ${r.missing ? "missing" : r.sizeMismatch ? "size mismatch" : `${r.diffPixels}px (${(r.ratio * 100).toFixed(3)}%) max delta ${r.maxChannelDelta}`}`);
}

const args = process.argv.slice(2);
if (args[0] === "--compare") await compare(args[1], args[2], args[3]);
else await shoot(args[0], args[1]);
