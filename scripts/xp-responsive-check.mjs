#!/usr/bin/env node
// Responsive sweep of the Player Experience runtime (plan §13.1, tasks.md T3.8).
//
//   npm run xp:responsive -- <url> [<url>…] [--quick | --full] [--out <folder>]
//
// Drives a headless Chrome through the DevTools protocol (Node 22: native WebSocket, no
// dependency), sizes the page like the device mode of the DevTools, and runs the frame's
// own layout audit (window.__xpLayoutAudit, runtime/layout/layoutAudit.ts) at every size:
// the sweep and the Studio share one definition of a broken layout.
//
//   widths   280 → 2560 px, every 16 px (48 with --quick), at 640 and 900 px high
//   heights  320 → 1200 px, every 20 px (60 with --quick), at 360 and 1366 px wide
//   catalog  every device of presets/devices.json, portrait and landscape, with its pixel
//            density and touch emulated, and a screenshot of each
//   resize   280 → 1920 px without a reload: no console error, the game zone is never
//            remounted
//   locales  fr and ar (fr only with --quick, fr, ar and en with --full)
//
// The report (report.json, report.md, screenshots) goes to --out, or to a temporary
// folder. Exit code: 0 when every size is clean and the console has no error, 1 otherwise,
// 2 when the sweep cannot run (no Chrome, no audit on the page).
// Needs the app running (npm run dev) and Chrome: CHROME_PATH, or a standard install.

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEVICES = JSON.parse(
  readFileSync(
    join(ROOT, "src/features/player-experience/presets/devices.json"),
    "utf8",
  ),
);
// The supported envelope, read from its single source (RWD3): outside it, only sideways
// scroll counts.
const ENVELOPE = (() => {
  const source = readFileSync(
    join(ROOT, "src/features/player-experience/runtime/layout/breakpoints.ts"),
    "utf8",
  );
  const block = /export const ENVELOPE = \{([^}]*)\}/.exec(source)?.[1] ?? "";
  const read = (key) =>
    Number(new RegExp(`${key}:\\s*(\\d+)`).exec(block)?.[1]);
  const envelope = {
    minWidth: read("minWidth"),
    maxWidth: read("maxWidth"),
    minHeight: read("minHeight"),
    maxHeight: read("maxHeight"),
  };
  if (!Object.values(envelope).every(Number.isFinite)) {
    console.error(
      "xp:responsive: cannot read ENVELOPE in runtime/layout/breakpoints.ts",
    );
    process.exit(2);
  }
  return envelope;
})();

// ── Options ─────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const options = { urls: [], quick: false, full: false, out: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--quick") options.quick = true;
    else if (arg === "--full") options.full = true;
    else if (arg === "--out") options.out = argv[++index];
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else options.urls.push(arg);
  }
  if (options.urls.length === 0) {
    throw new Error(
      "Usage: npm run xp:responsive -- <url> [<url>…] [--quick | --full] [--out <folder>]",
    );
  }
  return options;
}

const range = (from, to, step) => {
  const values = [];
  for (let value = from; value <= to; value += step) values.push(value);
  if (values.at(-1) !== to) values.push(to);
  return values;
};

// ── Chrome and the DevTools protocol ────────────────────────────────────────────────

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA &&
      join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((path) => path && existsSync(path)) ?? null;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function launchChrome(path) {
  const profile = mkdtempSync(join(tmpdir(), "xp-responsive-chrome-"));
  const chrome = spawn(path, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--mute-audio",
    "about:blank",
  ]);
  // Chrome writes the port it picked in the profile folder.
  const portFile = join(profile, "DevToolsActivePort");
  let port = null;
  for (let attempt = 0; attempt < 100 && !port; attempt++) {
    // On Windows the file can still be locked while Chrome writes it (EBUSY): try again.
    try {
      if (existsSync(portFile))
        port = readFileSync(portFile, "utf8").split("\n")[0].trim();
    } catch (error) {
      if (error.code !== "EBUSY") throw error;
    }
    if (!port) await sleep(100);
  }
  if (!port) throw new Error("Chrome did not start its DevTools endpoint");
  let target = null;
  for (let attempt = 0; attempt < 50 && !target; attempt++) {
    try {
      const list = await (
        await fetch(`http://127.0.0.1:${port}/json/list`)
      ).json();
      target = list.find((entry) => entry.type === "page");
    } catch {
      // Not listening yet.
    }
    if (!target) await sleep(100);
  }
  if (!target) throw new Error("Chrome has no page to drive");
  const close = () => {
    chrome.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
  };
  return { url: target.webSocketDebuggerUrl, close };
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { done, fail, timer } = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);
      if (message.error) fail(new Error(message.error.message));
      else done(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  });
  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        fail(new Error(`${method} timed out`));
      }, 30_000);
      pending.set(id, { done, fail, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  return { send, listeners, close: () => socket.close() };
}

// ── The page ────────────────────────────────────────────────────────────────────────

// Two frames and a short pause: media queries, React renders and the sticky CTA settle.
const SETTLE =
  "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => done(true), 30))))";
// The frame is mounted once it exposes its audit (the route is loaded lazily).
const MOUNTED = `new Promise((done) => {
  const started = performance.now();
  const check = () => {
    if (typeof window.__xpLayoutAudit === "function") done(true);
    else if (performance.now() - started > 15000) done(false);
    else setTimeout(check, 50);
  };
  check();
})`;
// The staggered entrance of the slots is over: every finite animation has finished (the
// ambient ones loop forever). A page emulated at a high pixel density takes longer.
const ENTERED = `Promise.race([
  Promise.all(
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
      .map((animation) => animation.finished.catch(() => null)),
  ),
  new Promise((done) => setTimeout(done, 5000)),
]).then(() => true)`;
const AUDIT = `(() => {
  window.scrollTo(0, 0);
  return typeof window.__xpLayoutAudit === "function" ? window.__xpLayoutAudit() : null;
})()`;

function page(cdp) {
  // The dev server reloads the page when a file of the repository changes: the page then
  // loses its state, and for a moment its audit. Such a run proves nothing.
  let navigating = false;
  let reloaded = false;
  cdp.listeners.add((message) => {
    if (
      message.method === "Page.frameNavigated" &&
      !message.params.frame.parentId &&
      !navigating
    ) {
      reloaded = true;
    }
  });
  const evaluate = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const size = async ({
    width,
    height,
    dpr = 1,
    mobile = false,
    landscape = false,
  }) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: dpr,
      mobile,
      screenOrientation: landscape
        ? { type: "landscapePrimary", angle: 90 }
        : { type: "portraitPrimary", angle: 0 },
    });
  };
  const open = async (url) => {
    const loaded = new Promise((done) => {
      const listener = (message) => {
        if (message.method === "Page.loadEventFired") {
          cdp.listeners.delete(listener);
          done();
        }
      };
      cdp.listeners.add(listener);
    });
    navigating = true;
    await cdp.send("Page.navigate", { url });
    await loaded;
    navigating = false;
    if (!(await evaluate(MOUNTED))) {
      throw new Error(
        `${url} does not expose window.__xpLayoutAudit: is it an /xp-frame page?`,
      );
    }
    await evaluate("document.fonts.ready.then(() => true)");
    await evaluate(ENTERED);
  };
  // An audit that cannot run never passes for a clean layout.
  const audit = async () => {
    await evaluate(SETTLE);
    const issues = await evaluate(AUDIT);
    if (reloaded || !Array.isArray(issues)) {
      throw new Error(
        "the page reloaded during the sweep (a file changed under the dev server?): results discarded",
      );
    }
    return issues;
  };
  const screenshot = async (file) => {
    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
    });
    writeFileSync(file, Buffer.from(data, "base64"));
  };
  return { evaluate, size, open, audit, screenshot };
}

// Console errors and warnings of the page, and uncaught exceptions, until stop().
function watchConsole(cdp) {
  const entries = [];
  const listener = (message) => {
    if (message.method === "Runtime.consoleAPICalled") {
      const { type, args } = message.params;
      if (type === "error" || type === "warning") {
        entries.push({
          level: type === "error" ? "error" : "warning",
          text: args.map((a) => a.value ?? a.description ?? "").join(" "),
        });
      }
    } else if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      entries.push({
        level: "error",
        text: details.exception?.description ?? details.text,
      });
    } else if (message.method === "Log.entryAdded") {
      const { level, text } = message.params.entry;
      if (level === "error" || level === "warning")
        entries.push({ level, text });
    }
  };
  cdp.listeners.add(listener);
  return { entries, stop: () => cdp.listeners.delete(listener) };
}

// ── The sweep ───────────────────────────────────────────────────────────────────────

const inEnvelope = (width, height) =>
  width >= ENVELOPE.minWidth &&
  width <= ENVELOPE.maxWidth &&
  height >= ENVELOPE.minHeight &&
  height <= ENVELOPE.maxHeight;

// Outside the envelope the page may scroll vertically (plan §8.3): only sideways counts.
const relevant = (issues, width, height) =>
  inEnvelope(width, height)
    ? issues
    : issues.filter((issue) => issue.kind === "horizontal-overflow");

async function sweep(tab, url, options, out, label) {
  const results = [];
  const record = (phase, sizeLabel, issues) =>
    results.push({ phase, size: sizeLabel, issues });
  const widthStep = options.quick ? 48 : 16;
  const heightStep = options.quick ? 60 : 20;

  await tab.size({ width: 360, height: 800 });
  await tab.open(url);
  for (const height of [640, 900]) {
    for (const width of range(
      ENVELOPE.minWidth,
      ENVELOPE.maxWidth,
      widthStep,
    )) {
      await tab.size({ width, height });
      record("widths", `${width}x${height}`, await tab.audit());
    }
  }
  for (const width of [360, 1366]) {
    for (const height of range(ENVELOPE.minHeight, 1200, heightStep)) {
      await tab.size({ width, height });
      record("heights", `${width}x${height}`, await tab.audit());
    }
  }

  // The catalog: real device metrics, touch, and a reload so the mobile viewport applies.
  // Phones and tablets are listed in portrait and also tried rotated; a laptop, listed in
  // landscape, does not rotate.
  for (const device of DEVICES) {
    const laptop = device.group === "laptop";
    const orientations = laptop ? ["landscape"] : ["portrait", "landscape"];
    for (const orientation of orientations) {
      const landscape = orientation === "landscape";
      const rotated = landscape && !laptop;
      const width = rotated ? device.height : device.width;
      const height = rotated ? device.width : device.height;
      await tab.cdp.send("Emulation.setTouchEmulationEnabled", {
        enabled: device.touch,
        maxTouchPoints: device.touch ? 5 : 1,
      });
      await tab.size({
        width,
        height,
        dpr: device.dpr,
        mobile: device.touch,
        landscape,
      });
      await tab.open(url);
      record(
        "catalog",
        `${device.id} ${orientation} ${width}x${height}`,
        relevant(await tab.audit(), width, height),
      );
      await tab.screenshot(
        join(out, `${label}-${device.id}-${orientation}.png`),
      );
    }
  }
  await tab.cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });

  // Continuous resize without a reload: the game zone must survive every width.
  await tab.size({ width: 280, height: 700 });
  await tab.open(url);
  await tab.evaluate(
    'window.__xpSweepZone = document.querySelector("[data-xp-slot=interaction]"); true',
  );
  for (const width of range(280, 1920, 8)) {
    await tab.size({ width, height: 700 });
    await sleep(16);
    if (width % 64 === 0) record("resize", `${width}x700`, await tab.audit());
  }
  const remounted = await tab.evaluate(
    'window.__xpSweepZone !== null && window.__xpSweepZone !== document.querySelector("[data-xp-slot=interaction]")',
  );
  if (remounted) {
    record("resize", "280→1920x700", [
      {
        kind: "remounted",
        selector: '[data-xp-slot="interaction"]',
        editPath: null,
        detail: "the game zone was remounted during the resize",
      },
    ]);
  }
  return results;
}

// ── Report ──────────────────────────────────────────────────────────────────────────

function summarize(run) {
  const failing = run.results.filter((result) => result.issues.length > 0);
  // Group by defect: one line per kind and element, with the sizes where it happens.
  const groups = new Map();
  for (const { size, issues } of failing) {
    for (const issue of issues) {
      const key = `${issue.kind} ${issue.selector}`;
      const group = groups.get(key) ?? { ...issue, sizes: [] };
      group.sizes.push(size);
      groups.set(key, group);
    }
  }
  return {
    sizes: run.results.length,
    failing: failing.length,
    groups: [...groups.values()],
  };
}

function markdown(runs, { sizes: listSizes }) {
  const lines = ["# Player Experience — responsive sweep", ""];
  for (const run of runs) {
    const { sizes, failing, groups } = summarize(run);
    const errors = run.console.filter((entry) => entry.level === "error");
    const warnings = run.console.filter((entry) => entry.level === "warning");
    lines.push(`## ${run.url} (${run.locale})`, "");
    lines.push(`- Sizes tested: ${sizes} (${run.phases})`);
    lines.push(`- Sizes with defects: ${failing}`);
    lines.push(
      `- Console: ${errors.length} error(s), ${warnings.length} warning(s)`,
      "",
    );
    for (const group of groups) {
      const shown = group.sizes.slice(0, 6).join(", ");
      const more =
        group.sizes.length > 6 ? ` and ${group.sizes.length - 6} more` : "";
      lines.push(
        `- **${group.kind}** \`${group.selector}\`${group.editPath ? ` (field ${group.editPath})` : ""}: ${group.detail} — at ${shown}${more}`,
      );
    }
    for (const entry of [...errors, ...warnings])
      lines.push(`- console ${entry.level}: ${entry.text}`);
    lines.push("");
    if (!listSizes) continue;
    // Every size tested, phase by phase (folded: the full sweep has hundreds).
    const phases = Map.groupBy(run.results, (result) => result.phase);
    lines.push("<details><summary>Sizes tested</summary>", "");
    for (const [phase, results] of phases) {
      lines.push(
        `- ${phase} (${results.length}): ${results.map((result) => result.size).join(", ")}`,
      );
    }
    lines.push("", "</details>", "");
  }
  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chromePath = findChrome();
  if (!chromePath) throw new Error("Chrome not found: set CHROME_PATH");
  const out = options.out
    ? resolve(options.out)
    : mkdtempSync(join(tmpdir(), "xp-responsive-"));
  mkdirSync(out, { recursive: true });
  const locales = options.quick
    ? ["fr"]
    : options.full
      ? ["fr", "ar", "en"]
      : ["fr", "ar"];

  const chrome = await launchChrome(chromePath);
  const cdp = await connect(chrome.url);
  const runs = [];
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    const tab = { ...page(cdp), cdp };
    for (const [index, base] of options.urls.entries()) {
      for (const locale of locales) {
        const url = new URL(base);
        url.searchParams.set("locale", locale);
        const watcher = watchConsole(cdp); // each run watches its own console
        const consoleEntries = watcher.entries;
        const label = `${index + 1}-${url.searchParams.get("fixture") ?? "page"}-${locale}`;
        process.stdout.write(`Sweeping ${url.href} … `);
        const started = Date.now();
        const results = await sweep(tab, url.href, options, out, label);
        watcher.stop();
        const run = {
          url: url.href,
          locale,
          phases: options.quick
            ? "quick: widths every 48 px, heights every 60 px, catalog, resize"
            : "widths every 16 px, heights every 20 px, catalog, resize",
          results,
          console: consoleEntries,
        };
        runs.push(run);
        const { sizes, failing } = summarize(run);
        console.log(
          `${sizes} sizes, ${failing} with defects, ${consoleEntries.length} console message(s), ${Math.round((Date.now() - started) / 1000)} s`,
        );
      }
    }
  } finally {
    cdp.close();
    chrome.close();
  }

  writeFileSync(join(out, "report.json"), JSON.stringify(runs, null, 2));
  writeFileSync(join(out, "report.md"), markdown(runs, { sizes: true }));
  console.log(
    `\n${markdown(runs, { sizes: false })}\nReport and screenshots: ${out}`,
  );
  const broken = runs.some(
    (run) =>
      summarize(run).failing > 0 ||
      run.console.some((entry) => entry.level === "error"),
  );
  process.exitCode = broken ? 1 : 0;
}

main().catch((error) => {
  console.error(`xp:responsive: ${error.message}`);
  process.exitCode = 2;
});
