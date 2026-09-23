#!/usr/bin/env node
// Resizing **while a game is being played** (plan §8.6, tasks.md T5.7): it must never reset
// the game, make it jump, or throw.
//
//   npm run xp:resize -- [<base url>]        (default: http://localhost:3000)
//
// Each mechanic is put in play through its own fixture, a signature of its state is read
// (the wheel's angle, the share of the card scratched, the quiz's counter, the hit count),
// the window is resized across the envelope, and the signature is read again. Console errors
// and the frame's own layout audit are collected along the way.
// Needs the app running (npm run dev) and Chrome: CHROME_PATH, or a standard install.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function findChrome() {
  return (
    [
      process.env.CHROME_PATH,
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
      process.env.LOCALAPPDATA &&
        join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
    ].find((path) => path && existsSync(path)) ?? null
  );
}

const CHROME = findChrome();
if (!CHROME) {
  console.error("xp:resize: Chrome not found, set CHROME_PATH");
  process.exit(2);
}
const ORIGIN = process.argv[2] ?? "http://localhost:3000";
const BASE = `${ORIGIN}/xp-frame?fixture=`;
const PORT = 9336;
// Kept short on purpose: the whole loop must fit inside a wheel spin (3.6 s), so the resize
// really happens while the game is running rather than after it has finished.
const WIDTHS = [280, 520, 900, 1366, 390];
const SETTLE_MS = 140;

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
  ],
  { stdio: "ignore" },
);

async function waitForCdp() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {
      // Not listening yet: try again.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Chrome never came up");
}

function rpc(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener("message", handler);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// What is read before and after the resize, per mechanic.
const SIGNATURES = {
  "wheel-spinning": `(() => {
    const stage = document.querySelector('[data-xp-game="lucky_wheel"]');
    const rotor = document.querySelector('[data-xp-wheel] svg > g');
    const angle = Number(/rotate\\(([-\\d.]+)deg\\)/.exec(rotor?.style.transform || '')?.[1] ?? 0);
    return JSON.stringify({ phase: stage?.dataset.xpPhase, angle: Math.round(angle) });
  })()`,
  "scratch-play": `(() => {
    const canvas = document.querySelector('[data-xp-scratch-cover]');
    const context = canvas?.getContext('2d');
    if (!context) return JSON.stringify({ scratched: null });
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 20) clear++;
    return JSON.stringify({ scratched: Math.round((clear / (data.length / 4)) * 100) });
  })()`,
  "quiz-play": `JSON.stringify({ counter: document.querySelector('[data-xp-quiz] span')?.textContent })`,
  "hit-it-play": `JSON.stringify({ score: document.querySelector('[data-xp-hit-score]')?.textContent })`,
};

// How a game is started and played a little, before the resize.
const PLAY = {
  // The fixture starts on the reveal: the wheel is already turning towards its segment.
  "wheel-spinning": async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  },
  "scratch-play": async (ws, next) => {
    // A real drag across the card, in page coordinates.
    const box = await rpc(ws, next(), "Runtime.evaluate", {
      expression: `(() => { const r = document.querySelector('[data-xp-scratch-cover]').getBoundingClientRect(); return JSON.stringify({x: r.x, y: r.y, w: r.width, h: r.height}); })()`,
      returnByValue: true,
    });
    const { x, y, w, h } = JSON.parse(box.result.value);
    const at = (px, py) => ({
      x: Math.round(x + px * w),
      y: Math.round(y + py * h),
    });
    const start = at(0.1, 0.5);
    await rpc(ws, next(), "Input.dispatchMouseEvent", {
      type: "mousePressed",
      button: "left",
      buttons: 1,
      clickCount: 1,
      ...start,
    });
    for (let step = 1; step <= 10; step++) {
      await rpc(ws, next(), "Input.dispatchMouseEvent", {
        type: "mouseMoved",
        button: "left",
        buttons: 1,
        ...at(0.1 + step * 0.07, 0.5),
      });
    }
    await rpc(ws, next(), "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      button: "left",
      buttons: 0,
      ...at(0.8, 0.5),
    });
  },
  "quiz-play": async (ws, next) => {
    await rpc(ws, next(), "Runtime.evaluate", {
      expression: `document.querySelectorAll('.xp-quiz-options button')[0]?.click()`,
    });
  },
  "hit-it-play": async (ws, next) => {
    await rpc(ws, next(), "Runtime.evaluate", {
      expression: `(() => { const field = document.querySelector('[data-xp-game="hit_it"] button'); for (let i = 0; i < 3; i++) field?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); })()`,
    });
  },
};

async function main() {
  await waitForCdp();
  let failures = 0;
  for (const fixture of Object.keys(SIGNATURES)) {
    const target = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
        method: "PUT",
      })
    ).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener("open", resolve));
    let id = 1;
    const next = () => id++;
    const errors = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (
        message.method === "Runtime.consoleAPICalled" &&
        message.params.type === "error"
      ) {
        errors.push(message.params.args.map((a) => a.value).join(" "));
      }
      if (message.method === "Runtime.exceptionThrown") {
        errors.push(message.params.exceptionDetails.text);
      }
    });
    await rpc(ws, next(), "Page.enable");
    await rpc(ws, next(), "Runtime.enable");
    await rpc(ws, next(), "Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await rpc(ws, next(), "Page.navigate", {
      url: `${BASE}${fixture}&locale=fr`,
    });
    await new Promise((resolve) => setTimeout(resolve, 1600));

    await PLAY[fixture](ws, next);
    const read = async () =>
      JSON.parse(
        (
          await rpc(ws, next(), "Runtime.evaluate", {
            expression: SIGNATURES[fixture],
            returnByValue: true,
          })
        ).result.value,
      );
    const before = await read();

    for (const width of WIDTHS) {
      await rpc(ws, next(), "Emulation.setDeviceMetricsOverride", {
        width,
        height: width < 500 ? 844 : 700,
        deviceScaleFactor: 1,
        mobile: width < 900,
      });
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    }
    const after = await read();
    const audit = await rpc(ws, next(), "Runtime.evaluate", {
      expression:
        "JSON.stringify(window.__xpLayoutAudit ? window.__xpLayoutAudit() : [])",
      returnByValue: true,
    });
    const issues = JSON.parse(audit.result.value);
    const kept =
      JSON.stringify(before) !== JSON.stringify({}) &&
      Object.entries(before).every(([key, value]) =>
        key === "angle" ? after[key] >= value : after[key] === value,
      );
    const ok = kept && errors.length === 0 && issues.length === 0;
    if (!ok) failures++;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${fixture} | before ${JSON.stringify(before)} → after ${JSON.stringify(after)} | console ${errors.length} | audit ${issues.length}`,
    );
    if (errors.length) console.log("      errors:", errors.slice(0, 3));
    if (issues.length)
      console.log("      issues:", JSON.stringify(issues.slice(0, 2)));
    ws.close();
  }
  chrome.kill();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  chrome.kill();
  process.exit(1);
});
