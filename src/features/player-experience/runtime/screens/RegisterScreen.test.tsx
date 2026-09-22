import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { PlayerExperience } from "../PlayerExperience";
import { caretAfter } from "./form/FormField";

// The registration screen, played like a player would (user-event), inside the real journey.

function setup(
  options: {
    locale?: Locale;
    customize?: (config: ExperienceConfig) => void;
  } = {},
) {
  const campaign = createDemoCampaign("lucky_wheel");
  const config = createDefaultExperience({
    gameType: "lucky_wheel",
    campaign,
  });
  options.customize?.(config);
  const services = createLocalServices({ participation: "scripted", campaign });
  const track = vi.spyOn(services.analytics, "track");
  const draw = vi.spyOn(services.participation, "draw");
  render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale={options.locale ?? "fr"}
        allowedGatewayModes={["scripted"]}
        initialScreen="register"
      />
    </ServicesProvider>,
  );
  return { user: userEvent.setup(), track, draw };
}

const cta = () =>
  screen.getByText("Participer").closest("button") as HTMLButtonElement;
const name = () => screen.getByLabelText("Nom complet");
const phone = () =>
  screen.getByLabelText("Numéro de téléphone") as HTMLInputElement;
const consent = () => screen.getByRole("checkbox");
const onPlay = () => screen.queryByText("Tournez la roue !") !== null;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("RegisterScreen", () => {
  it("never ticks the consent in advance, and keeps the CTA disabled until all is valid (Law 18-07)", async () => {
    const { user } = setup();
    expect((consent() as HTMLInputElement).checked).toBe(false);
    expect(cta().disabled).toBe(true);
    await user.type(name(), "Amina Benali");
    await user.type(phone(), "0555123456");
    expect(cta().disabled).toBe(true); // no consent yet
    await user.click(consent());
    expect(cta().disabled).toBe(false);
    await user.click(consent()); // taken back
    expect(cta().disabled).toBe(true);
    expect(onPlay()).toBe(false);
  });

  it.each([
    ["0555123456", "0555 12 34 56"],
    ["+213555123456", "+213 555 12 34 56"],
  ])(
    "accepts %s, grouped as it is typed, and sends the participation",
    async (typed, shown) => {
      const { user } = setup();
      await user.type(name(), "Amina Benali");
      await user.type(phone(), typed);
      expect(phone().value).toBe(shown);
      await user.click(consent());
      await user.click(cta());
      expect(onPlay()).toBe(true);
    },
  );

  it("never lets an invalid phone through, and says how to fix it", async () => {
    const { user } = setup();
    await user.type(name(), "Amina Benali");
    await user.type(phone(), "0212345678");
    await user.click(consent());
    expect(cta().disabled).toBe(true);
    const error = "Numéro invalide : 10 chiffres commençant par 05, 06 ou 07.";
    expect(screen.getByText(error)).toBeTruthy(); // the phone was left for the box
    expect(phone().getAttribute("aria-invalid")).toBe("true");
    expect(phone().getAttribute("aria-describedby")).toBe(
      screen.getByText(error).id,
    );
  });

  it("shows an error once a field is left, then follows the typing, with a check once valid", async () => {
    const { user } = setup();
    await user.click(name());
    expect(name().getAttribute("aria-invalid")).toBeNull(); // not while typing
    await user.tab();
    expect(name().getAttribute("aria-invalid")).toBe("true");
    const error = document.getElementById(
      name().getAttribute("aria-describedby") ?? "",
    );
    expect(error?.textContent).toBe("Ce champ est obligatoire.");
    expect(screen.queryByRole("img", { name: "Valide" })).toBeNull();
    await user.type(name(), "Amina");
    expect(name().getAttribute("aria-invalid")).toBeNull();
    expect(error?.textContent).toBe("");
    expect(screen.getByRole("img", { name: "Valide" })).toBeTruthy();
  });

  it("shows every error at once when the form is sent with Enter, and reports it", async () => {
    const { user, track } = setup();
    await user.type(name(), "{Enter}");
    // The name and the phone are required, the consent is missing.
    expect(screen.getAllByText("Ce champ est obligatoire.")).toHaveLength(2);
    expect(screen.getByText("Cochez la case pour participer.")).toBeTruthy();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ name: "form_invalid" }),
    );
    // Once valid, Enter sends it.
    await user.type(name(), "Amina");
    await user.type(phone(), "0555123456");
    await user.click(consent());
    await user.type(phone(), "{Enter}");
    expect(onPlay()).toBe(true);
  });

  it("offers the 58 wilayas and sends the code of the one chosen", async () => {
    const { user, draw } = setup();
    const wilaya = screen.getByLabelText("Wilaya (facultatif)");
    expect(within(wilaya).getAllByRole("option")).toHaveLength(59); // + the placeholder
    await user.selectOptions(wilaya, "16");
    expect(screen.getByRole("option", { name: "16 - Alger" })).toBeTruthy();
    await user.type(name(), "Amina Benali");
    await user.type(phone(), "0555123456");
    await user.click(consent());
    await user.click(cta());
    await user.click(screen.getByText("Tourner la roue"));
    await vi.waitFor(() => expect(draw).toHaveBeenCalledOnce());
    expect(draw.mock.calls[0][0].participant).toEqual({
      phone: "0555123456",
      fullName: "Amina Benali",
      wilaya: "16",
    });
  });

  it("marks the optional fields, and always asks for the phone", () => {
    setup({
      customize: (config) => {
        for (const field of config.form.fields) field.enabled = false;
      },
    });
    expect(screen.queryByLabelText("Nom complet")).toBeNull();
    expect(phone()).toBeTruthy(); // it is the anti-duplicate key (N4)
    expect(phone().required).toBe(true);
  });

  it("checks the email when the brand asks for it, with the keyboard of each field", async () => {
    const { user } = setup({
      customize: (config) => {
        const email = config.form.fields.find((field) => field.key === "email");
        if (email) email.enabled = true;
      },
    });
    const email = screen.getByLabelText("Adresse email (facultatif)");
    expect(email.getAttribute("type")).toBe("email");
    expect(email.getAttribute("autocomplete")).toBe("email");
    expect(phone().getAttribute("inputmode")).toBe("tel");
    expect(phone().getAttribute("autocomplete")).toBe("tel");
    expect(name().getAttribute("autocomplete")).toBe("name");
    await user.type(email, "amina@");
    await user.tab();
    expect(
      screen.getByText("Adresse email invalide, par exemple nom@exemple.com."),
    ).toBeTruthy();
  });

  it("opens the legal sheet from the consent, and reports it", async () => {
    const { user, track } = setup();
    await user.click(screen.getByText("Lire le règlement"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ name: "consent_opened", screen: "register" }),
    );
  });

  it("draws the eye to the consent when it is the only thing left", async () => {
    const { user } = setup();
    const box = () => consent().nextElementSibling as HTMLElement;
    expect(box().querySelector(".xp-ping")).toBeNull();
    await user.type(name(), "Amina");
    await user.type(phone(), "0555123456");
    expect(box().querySelector(".xp-ping")).toBeTruthy();
    await user.click(consent());
    expect(box().querySelector(".xp-ping")).toBeNull();
  });

  it("brings a field into view when it gets the focus", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    setup();
    fireEvent.focus(phone());
    fireEvent.focus(consent());
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it("reads Arabic right to left, with the phone still left to right", () => {
    setup({ locale: "ar" });
    const field = screen.getByLabelText("رقم الهاتف") as HTMLInputElement;
    expect(field.getAttribute("dir")).toBe("ltr");
    expect(field.style.textAlign).toBe("right");
    expect(screen.getByText("شارك")).toBeTruthy();
    expect(screen.getByText("(اختياري)", { exact: false })).toBeTruthy();
  });
});

describe("caretAfter", () => {
  it("puts the caret after as many digits as it followed", () => {
    expect(caretAfter("0555 12 34 56", 0)).toBe(0);
    expect(caretAfter("0555 12 34 56", 4)).toBe(4);
    expect(caretAfter("0555 12 34 56", 5)).toBe(6); // past the space
    expect(caretAfter("+213 555", 4)).toBe(4);
    expect(caretAfter("0555", 9)).toBe(4); // never past the end
  });
});
