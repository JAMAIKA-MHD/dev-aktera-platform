import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { localized, type Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { defaultTermsBody } from "../../presets/contentDefaults";
import { TermsSheet } from "../legal/TermsSheet";
import { ExperienceFrame, type ExperienceFrameProps } from "./ExperienceFrame";
import { useIsStuck } from "./useIsStuck";

// Slots 5 to 8 and the legal sheet (T3.5), through the frame, as a screen uses them.

function zetaConfig(): ExperienceConfig {
  const config = createDefaultExperience({ gameType: "lucky_wheel" });
  config.brand.name = "Zeta Market";
  config.legal.organizerName = "Zeta Market";
  config.legal.termsBody = defaultTermsBody("Zeta Market");
  return config;
}

function renderFrame(
  props: Partial<ExperienceFrameProps> & { config?: ExperienceConfig } = {},
) {
  const config = props.config ?? zetaConfig();
  return render(
    <ExperienceFrame
      config={config}
      locale={"fr" as Locale}
      screenContent={config.screens.welcome}
      editPath="screens.welcome"
      cta={{ onPrimary: () => {} }}
      {...props}
    />,
  );
}

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-xp-slot="${name}"]`);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("slot 5 — game zone", () => {
  it("holds the caller's body, and points the Studio to the game panel", () => {
    const { container } = renderFrame({ children: <canvas /> });
    const zone = slot(container, "interaction");
    expect(zone?.querySelector("canvas")).not.toBeNull();
    expect(zone?.getAttribute("data-xp-edit")).toBe("game");
  });
});

describe("slot 6 — reinforcement", () => {
  it("shows the configured text, which wins over the game's live text", () => {
    const config = zetaConfig();
    config.screens.welcome.reinforcement = {
      kind: "timer",
      text: localized("Plus que 10 secondes"),
    };
    const { container } = renderFrame({
      config,
      reinforcement: { text: "8 s" },
    });
    const pill = slot(container, "reinforcement");
    expect(pill?.textContent).toBe("Plus que 10 secondes");
    expect(pill?.getAttribute("data-xp-edit")).toBe(
      "screens.welcome.reinforcement",
    );
  });

  it("shows the game's live text and progress when the configuration has none", () => {
    const config = zetaConfig();
    config.screens.welcome.reinforcement = { kind: "progress", text: {} };
    const { container } = renderFrame({
      config,
      reinforcement: { text: "2 / 3", progress: { current: 2, total: 3 } },
    });
    const pill = slot(container, "reinforcement");
    expect(pill?.textContent).toBe("2 / 3");
    const dots = pill?.querySelectorAll("[aria-hidden] > span");
    expect(dots).toHaveLength(3);
    // Done and current steps take the brand color; the current one is wider.
    expect((dots?.[1] as HTMLElement).style.width).toBe("1.25rem");
    expect((dots?.[2] as HTMLElement).style.backgroundColor).toContain(
      "color-mix",
    );
  });

  it("draws no dots for a single step or for too many, and nothing without a kind", () => {
    const config = zetaConfig();
    config.screens.welcome.reinforcement = { kind: "progress", text: {} };
    const { container, rerender } = renderFrame({
      config,
      reinforcement: { text: "12 / 20", progress: { current: 12, total: 20 } },
    });
    expect(
      slot(container, "reinforcement")?.querySelectorAll(
        "[aria-hidden] > span",
      ),
    ).toHaveLength(0);
    const none = zetaConfig();
    rerender(
      <ExperienceFrame
        config={none}
        locale="fr"
        screenContent={none.screens.welcome}
        reinforcement={{ text: "8 s", progress: { current: 1, total: 3 } }}
      />,
    );
    expect(slot(container, "reinforcement")).toBeNull(); // kind "none": the brand chose it
  });

  it("draws the progress alone when the game gives no text, with no Studio link on a public page", () => {
    const config = zetaConfig();
    config.screens.welcome.reinforcement = { kind: "progress", text: {} };
    const { container } = render(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
        reinforcement={{ progress: { current: 1, total: 4 } }}
      />,
    );
    const pill = slot(container, "reinforcement");
    expect(pill?.querySelectorAll("[aria-hidden] > span")).toHaveLength(4);
    expect(pill?.querySelector("p")).toBeNull(); // no empty text pill
    expect(pill?.hasAttribute("data-xp-edit")).toBe(false);
  });

  it("keeps Arabic text free of capitals and letter spacing", () => {
    const config = zetaConfig();
    config.screens.welcome.reinforcement = {
      kind: "attempts",
      text: localized("1 essai", "محاولة واحدة"),
    };
    const { container } = renderFrame({ config, locale: "ar" });
    const label = slot(container, "reinforcement")?.querySelector("span[dir]");
    expect(label?.className).not.toContain("uppercase");
  });
});

describe("slot 7 — CTA", () => {
  it("labels the buttons from the screen and emits the actions", () => {
    const config = zetaConfig();
    config.screens.welcome.secondaryCta = localized("Voir les lots");
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    renderFrame({ config, cta: { onPrimary, onSecondary } });
    const primary = screen.getByRole("button", { name: "Lancer le jeu" });
    expect(primary.className).toContain("min-h-[52px]");
    expect(primary.getAttribute("data-xp-edit")).toBe(
      "screens.welcome.primaryCta",
    );
    fireEvent.click(primary);
    fireEvent.click(screen.getByRole("button", { name: "Voir les lots" }));
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onSecondary).toHaveBeenCalledOnce();
  });

  it("shows at most one secondary button, only with a label and an action", () => {
    const config = zetaConfig();
    config.screens.welcome.secondaryCta = localized("Voir les lots");
    const { container, rerender } = renderFrame({ config });
    expect(slot(container, "cta")?.querySelectorAll("button")).toHaveLength(1); // no action
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
        cta={{ onPrimary: () => {}, onSecondary: () => {} }}
      />,
    );
    const secondary = screen.getByRole("button", { name: "Voir les lots" });
    // A plain link on a narrow phone (compact), a ghost button elsewhere.
    expect(secondary.className).toContain("compact:underline");
    expect(secondary.className).toContain("min-h-[44px]");
  });

  it("stays unavailable while the form is invalid", () => {
    const onPrimary = vi.fn();
    renderFrame({ cta: { onPrimary, disabled: true } });
    const primary = screen.getByRole("button", { name: "Lancer le jeu" });
    expect((primary as HTMLButtonElement).disabled).toBe(true);
    expect(primary.style.boxShadow).toBe("none");
    expect(primary.querySelector(".xp-shimmer")).toBeNull();
    fireEvent.click(primary);
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it("waits while loading: busy, focusable, in the player's language, never twice", () => {
    const onPrimary = vi.fn();
    renderFrame({ locale: "ar", cta: { onPrimary, loading: true } });
    const primary = screen.getByRole("button", { name: "جارٍ التحميل…" });
    expect((primary as HTMLButtonElement).disabled).toBe(false);
    expect(primary.getAttribute("aria-busy")).toBe("true");
    expect(primary.getAttribute("aria-disabled")).toBe("true");
    expect(primary.querySelector(".xp-spin")).not.toBeNull();
    expect(primary.className).not.toContain("uppercase"); // Arabic label
    fireEvent.click(primary);
    expect(onPrimary).not.toHaveBeenCalled();
  });

  it("measures nothing before its element exists", () => {
    const { result } = renderHook(() => useIsStuck<HTMLDivElement>());
    expect(result.current[1]).toBe(false);
  });

  it("knows when it is held at the bottom of the screen (glass dock)", async () => {
    const original = window.getComputedStyle;
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
      (element as HTMLElement).dataset?.xpSlot === "cta"
        ? ({ bottom: "8px" } as CSSStyleDeclaration)
        : original(element),
    );
    let bottom = 500;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ bottom }) as DOMRect,
    );
    const nextFrame = () =>
      act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });
    const { container } = renderFrame();
    await nextFrame();
    const cta = slot(container, "cta");
    expect(cta?.hasAttribute("data-xp-stuck")).toBe(false); // above the line: in its place
    bottom = window.innerHeight - 8; // held on the line by position: sticky
    fireEvent.scroll(window);
    await nextFrame();
    expect(cta?.hasAttribute("data-xp-stuck")).toBe(true);
  });
});

describe("slot 8 — footer", () => {
  function linksConfig() {
    const config = zetaConfig();
    config.legal.links.push(
      {
        id: "3b2f6c8e-6f55-4a5e-9f55-1b1f0f2c0001",
        kind: "url",
        label: localized("Site"),
        url: "https://zeta.dz/",
      },
      {
        id: "3b2f6c8e-6f55-4a5e-9f55-1b1f0f2c0002",
        kind: "support",
        label: localized("Écrire"),
        url: "mailto:contact@zeta.dz",
      },
      {
        id: "3b2f6c8e-6f55-4a5e-9f55-1b1f0f2c0003",
        kind: "url",
        label: localized("Piège"),
        url: "javascript:alert(1)",
      },
    );
    return config;
  }

  it("sends each link to its own target, and never renders an unsafe URL", () => {
    const { container } = renderFrame({ config: linksConfig() });
    const footer = slot(container, "footer");
    expect(footer?.tagName).toBe("FOOTER");
    expect(footer?.getAttribute("data-xp-edit")).toBe("legal");
    // Terms, privacy and support without a URL open the legal sheet.
    for (const name of ["Règlement", "Confidentialité", "Assistance"]) {
      expect(screen.getByRole("button", { name }).tagName).toBe("BUTTON");
    }
    const site = screen.getByRole("link", { name: "Site" });
    expect(site.getAttribute("href")).toBe("https://zeta.dz/");
    expect(site.getAttribute("target")).toBe("_blank");
    expect(site.getAttribute("rel")).toBe("noopener noreferrer");
    const mail = screen.getByRole("link", { name: "Écrire" });
    expect(mail.getAttribute("href")).toBe("mailto:contact@zeta.dz");
    expect(mail.hasAttribute("target")).toBe(false);
    expect(screen.queryByText("Piège")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
    // Touch targets of at least 44 px (RWD5).
    expect(site.className).toContain("min-h-[44px]");
  });

  it("names the organizer, and stays in place when the brand gave nothing", () => {
    const { container, rerender } = renderFrame({ locale: "en" });
    expect(slot(container, "footer")?.textContent).toContain(
      "Organized by Zeta Market",
    );
    const empty = zetaConfig();
    empty.legal = {
      ...empty.legal,
      organizerName: " ",
      links: [],
      legalLine: {},
    };
    rerender(
      <ExperienceFrame
        config={empty}
        locale="en"
        screenContent={empty.screens.welcome}
      />,
    );
    const footer = slot(container, "footer");
    expect(footer).not.toBeNull(); // never hidden
    expect(footer?.textContent).toBe("");
  });

  it("scrolls the legal line only when it is longer than the screen", () => {
    // Boxes measured by ResizeObserver: the band is 300 px wide, the text 900 px.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(
          private callback: ConstructorParameters<typeof ResizeObserver>[0],
        ) {}
        observe(element: Element) {
          const width = element.hasAttribute("data-xp-band")
            ? 300
            : element.classList.contains("xp-band-text")
              ? 900
              : 0;
          this.callback(
            [{ contentRect: { width, height: 16 } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
        }
        disconnect() {}
      },
    );
    const { container } = renderFrame({ locale: "ar" });
    const band = container.querySelector<HTMLElement>("[data-xp-band]");
    expect(band?.hasAttribute("data-xp-scrolling")).toBe(true);
    expect(band?.hasAttribute("data-xp-clamp")).toBe(true); // an intended cut
    // A second copy closes the loop, hidden from screen readers; RTL scrolls the other way.
    const copies = band?.querySelectorAll(".xp-band-text");
    expect(copies).toHaveLength(2);
    expect(copies?.[1].getAttribute("aria-hidden")).toBe("true");
    expect(band?.style.getPropertyValue("--xp-band-to")).toBe("50%");
    expect(band?.style.getPropertyValue("--xp-band-duration")).toBe("22.5s");
  });

  it("keeps a short legal line still, in one copy", () => {
    const { container } = renderFrame();
    const band = container.querySelector("[data-xp-band]");
    expect(band?.hasAttribute("data-xp-scrolling")).toBe(false);
    expect(band?.querySelectorAll(".xp-band-text")).toHaveLength(1);
  });
});

describe("legal sheet", () => {
  it("opens from the footer with the rules, the organizer and a list", () => {
    renderFrame();
    fireEvent.click(screen.getByRole("button", { name: "Règlement" }));
    const dialog = screen.getByRole("dialog", {
      name: "Règlement et mentions légales",
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("Organisé par Zeta Market");
    expect(dialog.querySelectorAll("p").length).toBeGreaterThan(1);
    expect(dialog.querySelectorAll("li")).toHaveLength(4);
    expect(dialog.textContent).not.toContain("•");
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("names no organizer when the brand gave none", () => {
    const config = zetaConfig();
    config.legal.organizerName = "";
    renderFrame({ config });
    fireEvent.click(screen.getByRole("button", { name: "Règlement" }));
    expect(screen.getByRole("dialog").textContent).not.toContain("Organisé");
  });

  it("draws the body in its order, one list per run of bullets, blank lines skipped", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    render(
      <TermsSheet
        title="Rules"
        organizer={null}
        body={"First.\n\n• One\n\n• Two\nLast."}
        closeLabel="Close"
        returnFocusTo={trigger}
        onClose={() => {}}
      />,
    );
    const sheet = screen.getByRole("dialog");
    expect(
      [...sheet.querySelectorAll("p, li")].map((node) => node.textContent),
    ).toEqual(["First.", "One", "Two", "Last."]);
    expect(sheet.querySelectorAll("ul")).toHaveLength(1); // one list, blank lines ignored
    trigger.remove();
  });

  it("opens from the legal line too", () => {
    const { container } = renderFrame();
    fireEvent.click(container.querySelector("[data-xp-band]") as Element);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes with Escape and gives the focus back to its opener", async () => {
    const user = userEvent.setup();
    renderFrame();
    const opener = screen.getByRole("button", { name: "Confidentialité" });
    await user.click(opener);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Fermer");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("gives the focus back to its trigger even when the tap did not focus it (Safari)", () => {
    renderFrame();
    const trigger = screen.getByRole("button", { name: "Assistance" });
    fireEvent.click(trigger); // a click event without focus, as on Safari
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Fermer");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on a tap outside, never on a tap inside", async () => {
    const user = userEvent.setup();
    const { container } = renderFrame();
    await user.click(screen.getByRole("button", { name: "Règlement" }));
    await user.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeNull();
    await user.click(container.querySelector("[data-xp-sheet]") as Element);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the focus inside while it is open", async () => {
    const user = userEvent.setup();
    renderFrame();
    await user.click(screen.getByRole("button", { name: "Règlement" }));
    const [close, bottom] = screen.getAllByRole("button", { name: "Fermer" });
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(document.activeElement).toBe(bottom);
    await user.tab(); // from the last one, back to the first
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true }); // and the other way round
    expect(document.activeElement).toBe(bottom);
    await user.click(bottom);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("keyboard", () => {
  it("reaches every action of the frame with Tab, in reading order", async () => {
    const user = userEvent.setup();
    const config = zetaConfig();
    config.screens.welcome.secondaryCta = localized("Voir les lots");
    renderFrame({
      config,
      cta: { onPrimary: () => {}, onSecondary: () => {} },
    });
    const reached: string[] = [];
    for (let step = 0; step < 6; step++) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? "");
    }
    expect(reached).toEqual([
      "Lancer le jeu",
      "Voir les lots",
      "Jeu gratuit sans obligation d'achat • Une participation par numéro",
      "Règlement",
      "Confidentialité",
      "Assistance",
    ]);
  });
});
