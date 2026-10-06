import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { layoutAudit, layoutReport } from "./layoutAudit";

// jsdom does not lay anything out: each fixture gives its elements the boxes and the
// scroll sizes a browser would measure.

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function place(element: Element, { left, top, width, height }: Box) {
  element.getBoundingClientRect = () =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

function measure(element: Element, sizes: Record<string, number>) {
  for (const [name, value] of Object.entries(sizes)) {
    Object.defineProperty(element, name, { value, configurable: true });
  }
}

function viewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
}

// A clean 360 x 640 welcome screen: header, title, game zone, CTA, footer.
function cleanFrame() {
  document.body.innerHTML = `
    <div class="xp-runtime" style="overflow-x: clip">
      <div class="xp-frame">
        <header data-xp-slot="header" data-xp-edit="brand"><p data-xp-clamp>Zeta Market</p></header>
        <h1 data-xp-slot="title" data-xp-edit="screens.welcome.title">Tentez votre chance</h1>
        <div data-xp-slot="interaction" data-xp-edit="game" style="--xp-game-min: 12.5rem"></div>
        <div data-xp-slot="cta"><button>Lancer le jeu</button></div>
        <footer data-xp-slot="footer" data-xp-edit="legal"><a>Règlement</a></footer>
      </div>
    </div>`;
  const $ = (selector: string) =>
    document.querySelector(selector) as HTMLElement;
  place($('[data-xp-slot="header"]'), {
    left: 0,
    top: 0,
    width: 360,
    height: 56,
  });
  place($('[data-xp-slot="header"] p'), {
    left: 60,
    top: 10,
    width: 200,
    height: 20,
  });
  place($('[data-xp-slot="title"]'), {
    left: 18,
    top: 76,
    width: 324,
    height: 52,
  });
  measure($('[data-xp-slot="title"]'), {
    scrollWidth: 324,
    clientWidth: 324,
    scrollHeight: 52,
    clientHeight: 52,
  });
  place($('[data-xp-slot="interaction"]'), {
    left: 18,
    top: 144,
    width: 324,
    height: 320,
  });
  place($('[data-xp-slot="cta"]'), {
    left: 18,
    top: 480,
    width: 324,
    height: 52,
  });
  place($('[data-xp-slot="cta"] button'), {
    left: 18,
    top: 480,
    width: 324,
    height: 52,
  });
  place($('[data-xp-slot="footer"]'), {
    left: 18,
    top: 548,
    width: 324,
    height: 80,
  });
  return { root: $(".xp-runtime"), $ };
}

beforeEach(() => viewport(360, 640));
afterEach(() => {
  document.body.innerHTML = "";
  viewport(1024, 768);
  Reflect.deleteProperty(document.documentElement, "scrollWidth");
});

describe("layoutAudit", () => {
  it("finds nothing on a clean layout", () => {
    expect(layoutAudit(cleanFrame().root)).toEqual([]);
  });

  it("flags a page that scrolls sideways", () => {
    const { root } = cleanFrame();
    measure(document.documentElement, { scrollWidth: 412 });
    expect(layoutAudit(root)).toEqual([
      {
        kind: "horizontal-overflow",
        selector: "html",
        editPath: null,
        detail: "the page is 412 px wide for a 360 px viewport",
      },
    ]);
  });

  it("flags an element leaving the viewport, even when the runtime root clips it", () => {
    const { root, $ } = cleanFrame();
    // The root's overflow-x: clip hides the page scroll: the element is still cut.
    place($('[data-xp-slot="footer"] a'), {
      left: 300,
      top: 560,
      width: 100,
      height: 44,
    });
    expect(layoutAudit(root)).toEqual([
      {
        kind: "horizontal-overflow",
        selector: '[data-xp-slot="footer"] a',
        editPath: "legal",
        detail: "spans 300 to 400 px in a 360 px viewport",
      },
    ]);
  });

  it("ignores what a parent clips on purpose (a scrolling banner, a light sweep)", () => {
    const { root, $ } = cleanFrame();
    const band = document.createElement("span");
    band.className = "xp-band";
    band.style.overflowX = "hidden";
    const track = document.createElement("span");
    track.className = "xp-band-track";
    band.appendChild(track);
    $('[data-xp-slot="footer"]').appendChild(band);
    place(band, { left: 18, top: 548, width: 324, height: 16 });
    place(track, { left: -400, top: 548, width: 1200, height: 16 });
    expect(layoutAudit(root)).toEqual([]);
  });

  it("flags a text cut outside the intended clamps, and names the field to fix", () => {
    const { root, $ } = cleanFrame();
    const title = $('[data-xp-slot="title"]');
    measure(title, { scrollHeight: 90 }); // three lines in a two-line box
    const issues = layoutAudit(root);
    expect(issues).toEqual([
      {
        kind: "text-clipped",
        selector: '[data-xp-slot="title"]',
        editPath: "screens.welcome.title",
        detail: '"Tentez votre chance" needs 324 x 90 px, has 324 x 52',
      },
    ]);
    title.setAttribute("data-xp-clamp", ""); // an intended cut
    expect(layoutAudit(root)).toEqual([]);
  });

  it("skips inline boxes, which have no size of their own", () => {
    const { root, $ } = cleanFrame();
    const inline = document.createElement("span");
    inline.textContent = "5 000 DA";
    $('[data-xp-slot="title"]').appendChild(inline);
    place(inline, { left: 18, top: 76, width: 80, height: 20 });
    measure(inline, {
      clientWidth: 0,
      clientHeight: 0,
      scrollWidth: 0,
      scrollHeight: 0,
    });
    expect(layoutAudit(root)).toEqual([]);
  });

  it("flags overlapping slots, but not a CTA held at the bottom", () => {
    const { root, $ } = cleanFrame();
    place($('[data-xp-slot="title"]'), {
      left: 18,
      top: 130,
      width: 324,
      height: 52,
    });
    expect(layoutAudit(root)).toEqual([
      {
        kind: "slot-overlap",
        selector: '[data-xp-slot="title"]',
        editPath: "screens.welcome.title",
        detail: "title and interaction overlap by 324 x 38 px",
      },
    ]);
    place($('[data-xp-slot="title"]'), {
      left: 18,
      top: 76,
      width: 324,
      height: 52,
    });
    const cta = $('[data-xp-slot="cta"]');
    place(cta, { left: 18, top: 400, width: 324, height: 52 }); // over the game
    place($('[data-xp-slot="cta"] button'), {
      left: 18,
      top: 400,
      width: 324,
      height: 52,
    });
    expect(layoutAudit(root).map((issue) => issue.kind)).toEqual([
      "slot-overlap",
    ]);
    cta.setAttribute("data-xp-stuck", "");
    expect(layoutAudit(root)).toEqual([]);
  });

  it("flags a main action under 44 px, and one out of reach", () => {
    const { root, $ } = cleanFrame();
    const button = $('[data-xp-slot="cta"] button');
    place(button, { left: 18, top: 480, width: 120, height: 40 });
    expect(layoutAudit(root)).toEqual([
      {
        kind: "cta-too-small",
        selector: '[data-xp-slot="cta"] button',
        editPath: null,
        detail: "120 x 40 px, under 44 x 44",
      },
    ]);
    place(button, { left: 18, top: 700, width: 324, height: 52 });
    expect(layoutAudit(root).map((issue) => issue.kind)).toEqual([
      "cta-unreachable",
    ]);
    $('[data-xp-slot="cta"]').style.position = "sticky"; // held at the bottom when needed
    expect(layoutAudit(root)).toEqual([]);
  });

  it("flags a game zone under its floor", () => {
    const { root, $ } = cleanFrame();
    const zone = $('[data-xp-slot="interaction"]');
    place(zone, { left: 18, top: 144, width: 324, height: 150 });
    expect(layoutAudit(root)).toEqual([
      {
        kind: "game-below-floor",
        selector: '[data-xp-slot="interaction"]',
        editPath: "game",
        detail: "150 px high, under the 200 px floor",
      },
    ]);
    zone.style.setProperty("--xp-game-min", "140px");
    expect(layoutAudit(root)).toEqual([]);
    zone.style.removeProperty("--xp-game-min"); // no floor known: nothing to compare
    expect(layoutAudit(root)).toEqual([]);
  });

  it("flags a wheel that is not square", () => {
    const { root, $ } = cleanFrame();
    const wheel = document.createElement("div");
    wheel.setAttribute("data-xp-wheel", "");
    $('[data-xp-slot="interaction"]').appendChild(wheel);
    place(wheel, { left: 30, top: 150, width: 300, height: 299 }); // within 1 px
    expect(layoutAudit(root)).toEqual([]);
    place(wheel, { left: 30, top: 150, width: 300, height: 296 });
    expect(layoutAudit(root)).toEqual([
      {
        kind: "wheel-not-square",
        selector: '[data-xp-slot="interaction"] div',
        editPath: "game",
        detail: "300 x 296 px",
      },
    ]);
  });

  it("follows nested clipping, and checks drawings (SVG) too", () => {
    const { root, $ } = cleanFrame();
    const outer = document.createElement("div");
    outer.style.overflowX = "hidden";
    const inner = document.createElement("div");
    inner.style.overflowX = "auto";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    outer.appendChild(inner);
    inner.appendChild(icon);
    $('[data-xp-slot="footer"]').appendChild(outer);
    place(outer, { left: 18, top: 560, width: 324, height: 40 });
    place(inner, { left: 300, top: 560, width: 200, height: 40 }); // wider than its parent
    place(icon, { left: 320, top: 560, width: 24, height: 24 });
    expect(layoutAudit(root)).toEqual([]); // seen through two clips: 320 to 342 px
    place(outer, { left: 18, top: 560, width: 380, height: 40 }); // the outer box leaves
    place(icon, { left: 370, top: 560, width: 24, height: 24 }); // and the icon with it
    expect(layoutAudit(root).map((issue) => issue.selector)).toEqual([
      '[data-xp-slot="footer"] div', // 18 to 398 px
      '[data-xp-slot="footer"] div', // 300 to 398 px, what the outer box shows of it
      '[data-xp-slot="footer"] svg', // 370 to 394 px
    ]);
  });

  it("names an element outside the slots by its runtime class", () => {
    const { root } = cleanFrame();
    const badge = document.createElement("span");
    badge.className = "rounded-full xp-badge";
    root.appendChild(badge);
    place(badge, { left: 330, top: 8, width: 60, height: 20 });
    expect(layoutAudit(root)[0].selector).toBe("span.xp-badge");
  });

  it("reads a floor in rem from the root font size", () => {
    const { root, $ } = cleanFrame();
    document.documentElement.style.fontSize = "10px";
    place($('[data-xp-slot="interaction"]'), {
      left: 18,
      top: 144,
      width: 324,
      height: 130,
    });
    expect(layoutAudit(root)).toEqual([]); // 12.5rem = 125 px here
    document.documentElement.style.fontSize = "";
  });

  it("audits a frame without a CTA or a game zone (the waiting screen has no CTA)", () => {
    const { root, $ } = cleanFrame();
    $('[data-xp-slot="cta"]').remove();
    $('[data-xp-slot="interaction"]').remove();
    expect(layoutAudit(root)).toEqual([]);
  });

  it("audits nothing outside a window", () => {
    const detached = document.implementation.createHTMLDocument("detached");
    expect(layoutAudit(detached.body)).toEqual([]);
  });
});

describe("layoutReport", () => {
  it("reports an empty size outside a window", () => {
    const detached = document.implementation.createHTMLDocument("detached");
    expect(layoutReport(detached.body)).toMatchObject({
      width: 0,
      height: 0,
      issues: [],
    });
  });

  it("gives the size, the layout mode and the issues", () => {
    viewport(844, 390);
    const { root } = cleanFrame();
    expect(layoutReport(root)).toEqual({
      width: 844,
      height: 390,
      mode: {
        arrangement: "split",
        density: "tight",
        compact: false,
        wide: true,
      },
      issues: [
        expect.objectContaining({ kind: "cta-unreachable" }), // 480 px down a 390 px screen
      ],
      truncated: [],
    });
  });

  // T6.10: a text cut on purpose is not a defect, but the Studio tells the brand when it is
  // actually cut at a size. Never part of the audit the sweep reads.
  it("lists the clamped texts that are actually cut, apart from the defects", () => {
    viewport(360, 640);
    document.body.innerHTML = `
      <div class="xp-runtime">
        <div data-xp-edit="screens.welcome.title"><h1 data-xp-clamp style="line-height: 26px">A very long title</h1></div>
        <p data-xp-clamp style="line-height: 26px">Fits, glyphs overflow a little</p>
        <button data-xp-clamp data-xp-band>A legal line that scrolls</button>
      </div>`;
    const root = document.querySelector<HTMLElement>(".xp-runtime")!;
    const [title, fits, band] =
      root.querySelectorAll<HTMLElement>("[data-xp-clamp]");
    for (const [element, scrollWidth, scrollHeight] of [
      [title, 300, 120],
      [fits, 300, 44], // 4 px of glyphs under a 26 px line: nothing is cut
      [band, 900, 40], // wider than its box: it scrolls, on purpose
    ] as const) {
      Object.defineProperties(element, {
        clientWidth: { configurable: true, value: 300 },
        clientHeight: { configurable: true, value: 40 },
        scrollWidth: { configurable: true, value: scrollWidth },
        scrollHeight: { configurable: true, value: scrollHeight },
      });
    }
    const report = layoutReport(root);
    expect(report.truncated).toEqual([
      expect.objectContaining({
        kind: "text-truncated",
        editPath: "screens.welcome.title",
      }),
    ]);
    expect(
      layoutAudit(root).some((issue) => issue.kind === "text-truncated"),
    ).toBe(false);
  });
});
