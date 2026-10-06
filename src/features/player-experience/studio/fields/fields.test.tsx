import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LocalizedText } from "../../domain/locale";
import type { AssetRef } from "../../domain/types";
import { createLocalServices } from "../../services/createLocalServices";
import type { AssetStorage } from "../../services/ports";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { ColorField, normalizeHex } from "./ColorField";
import { IconPicker } from "./IconPicker";
import { ImageField } from "./ImageField";
import { isHttpsUrl, nudge } from "./imageFocus";
import { ListEditor, moveItem } from "./ListEditor";
import { LocalizedTextField } from "./LocalizedTextField";
import { clampToStep, NumberField } from "./NumberField";
import { SegmentedControl } from "./SegmentedControl";
import { SelectField } from "./SelectField";
import { ToggleField } from "./ToggleField";

// Every field is controlled (value in, onChange out), labelled, and usable with a keyboard
// (tasks.md T6.3). Each test drives a field through a small stateful host, as a panel does.

function Controlled<T>({
  initial,
  children,
}: {
  initial: T;
  children: (value: T, set: (value: T) => void) => ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return <>{children(value, setValue)}</>;
}

describe("ToggleField", () => {
  it("is a labelled switch, and says why when it is locked", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ToggleField label="Show header" checked={false} onChange={onChange} />,
    );
    const toggle = screen.getByRole("switch", { name: "Show header" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <ToggleField
        label="Phone"
        checked
        onChange={onChange}
        disabled
        disabledReason="The phone number is the anti-duplicate key"
      />,
    );
    const locked = screen.getByRole("switch", { name: "Phone" });
    expect(locked).toHaveProperty("disabled", true);
    expect(locked.getAttribute("title")).toMatch(/anti-duplicate/);
  });
});

describe("SelectField and SegmentedControl", () => {
  it("selects through a labelled native select", () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Font"
        value="poppins"
        options={[
          { value: "poppins", label: "Poppins" },
          { value: "plus-jakarta", label: "Plus Jakarta Sans" },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Font"), {
      target: { value: "plus-jakarta" },
    });
    expect(onChange).toHaveBeenCalledWith("plus-jakarta");
  });

  it("moves the choice with the arrow keys, like radio buttons", () => {
    render(
      <Controlled initial="rounded">
        {(value, set) => (
          <SegmentedControl
            label="Corners"
            value={value}
            onChange={set}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "rounded", label: "Rounded" },
              { value: "pill", label: "Pill" },
            ]}
          />
        )}
      </Controlled>,
    );
    const group = screen.getByRole("radiogroup", { name: "Corners" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(
      screen.getByRole("radio", { name: "Pill" }).getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.keyDown(group, { key: "ArrowRight" }); // wraps around
    expect(
      screen.getByRole("radio", { name: "Sharp" }).getAttribute("aria-checked"),
    ).toBe("true");
    // Only the selected one is in the tab order.
    expect(screen.getByRole("radio", { name: "Pill" }).tabIndex).toBe(-1);
  });
});

describe("NumberField", () => {
  it("lets the brand type freely, then clamps to the bounds on leaving", () => {
    const onChange = vi.fn();
    render(
      <NumberField
        label="Overlay"
        value={50}
        min={0}
        max={100}
        step={5}
        unit="%"
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Overlay");
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "140" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(100);
    expect(clampToStep(42, 0, 100, 5)).toBe(40);
    expect(clampToStep(-3, 0, 1, 0.05)).toBe(0);
  });
});

describe("ColorField", () => {
  it("accepts a typed or pasted hex code, short or long, and ignores the rest", () => {
    expect(normalizeHex("#1E7A46")).toBe("#1e7a46");
    expect(normalizeHex("fa0")).toBe("#ffaa00");
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("red")).toBeNull();

    const onChange = vi.fn();
    render(<ColorField label="Primary" value="#000000" onChange={onChange} />);
    const input = screen.getByLabelText("Primary");
    fireEvent.change(input, { target: { value: "#12" } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "#f5ba41" } });
    expect(onChange).toHaveBeenCalledWith("#f5ba41");
  });

  it("rates the contrast of the text it carries", () => {
    const { rerender } = render(
      <ColorField
        label="Primary"
        value="#F5BA41"
        onChange={() => {}}
        contrastWith="#0B0F19"
      />,
    );
    expect(screen.getByText(/AA ·/)).toBeTruthy();
    rerender(
      <ColorField
        label="Primary"
        value="#777777"
        onChange={() => {}}
        contrastWith="#666666"
      />,
    );
    expect(screen.getByText(/Low contrast/)).toBeTruthy();
  });
});

describe("LocalizedTextField", () => {
  it("edits each language in its own tab, right-to-left for Arabic", () => {
    const changes: LocalizedText[] = [];
    render(
      <Controlled<LocalizedText> initial={{ fr: "Bonjour" }}>
        {(value, set) => (
          <LocalizedTextField
            label="Title"
            value={value}
            onChange={(next) => {
              changes.push(next);
              set(next);
            }}
            maxChars={60}
          />
        )}
      </Controlled>,
    );
    // Arabic and English are missing: their tabs say so.
    expect(
      screen.getByRole("tab", { name: "Arabic (missing translation)" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Arabic/ }));
    const input = screen.getByLabelText("Title");
    expect(input.getAttribute("dir")).toBe("auto");
    expect(input.getAttribute("lang")).toBe("ar");
    expect(screen.getByText(/Arabic missing/)).toBeTruthy();
    fireEvent.change(input, { target: { value: "مرحبا" } });
    expect(changes.at(-1)).toEqual({ fr: "Bonjour", ar: "مرحبا" });
    expect(screen.getByRole("tab", { name: "Arabic" })).toBeTruthy();
    expect(screen.getByText("5/60")).toBeTruthy();
  });

  it("removes an emptied language instead of keeping an empty string", () => {
    const onChange = vi.fn();
    render(
      <LocalizedTextField
        label="Subtitle"
        value={{ fr: "Texte", en: "Text" }}
        onChange={onChange}
        locale="en"
      />,
    );
    fireEvent.change(screen.getByLabelText("Subtitle"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith({ fr: "Texte" });
  });

  it("follows the language the panel gives, and only shows the enabled ones", () => {
    const onLocaleChange = vi.fn();
    render(
      <LocalizedTextField
        label="Title"
        value={{}}
        onChange={() => {}}
        locales={["fr", "ar"]}
        locale="ar"
        onLocaleChange={onLocaleChange}
      />,
    );
    expect(screen.queryByRole("tab", { name: /English/ })).toBeNull();
    expect(
      screen.getByRole("tab", { name: /Arabic/ }).getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: /French/ }));
    expect(onLocaleChange).toHaveBeenCalledWith("fr");
  });
});

describe("ListEditor", () => {
  it("adds, moves and removes within its bounds", () => {
    let next = 3;
    render(
      <Controlled initial={["a", "b"]}>
        {(items, set) => (
          <ListEditor
            label="Chips"
            items={items}
            onChange={set}
            createItem={() => String.fromCharCode(96 + next++)}
            renderItem={(item) => <span>item {item}</span>}
            itemLabel={(item) => `Chip ${item}`}
            getKey={(item) => item}
            min={1}
            max={3}
            addLabel="Add chip"
          />
        )}
      </Controlled>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add chip" }));
    expect(screen.getByText("item c")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Maximum 3" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByRole("button", { name: "Move Chip a up" }),
    ).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Move Chip a down" }));
    expect(
      screen.getAllByText(/^item /).map((element) => element.textContent),
    ).toEqual(["item b", "item a", "item c"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Chip b" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Chip a" }));
    // One left: the minimum. It cannot be removed.
    expect(
      screen.getByRole("button", { name: "Remove Chip c" }),
    ).toHaveProperty("disabled", true);
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
  });
});

describe("IconPicker", () => {
  it("opens the library and picks an icon", () => {
    const onChange = vi.fn();
    render(
      <IconPicker label="Jackpot icon" value="trophy" onChange={onChange} />,
    );
    const trigger = screen.getByLabelText("Jackpot icon");
    expect(trigger.textContent).toMatch(/trophy/);
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("radio", { name: "gift" }));
    expect(onChange).toHaveBeenCalledWith("gift");
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});

describe("ImageField", () => {
  function renderImage(
    assets: Partial<AssetStorage>,
    initial: AssetRef = null,
  ) {
    const services = { ...createLocalServices(), ...assets } as ReturnType<
      typeof createLocalServices
    >;
    services.assets = { ...services.assets, ...assets };
    const changes: AssetRef[] = [];
    render(
      <StudioProvider value={{ store: createStudioStore(), services }}>
        <Controlled initial={initial}>
          {(value, set) => (
            <ImageField
              label="Logo"
              purpose="logo"
              value={value}
              onChange={(next) => {
                changes.push(next);
                set(next);
              }}
            />
          )}
        </Controlled>
      </StudioProvider>,
    );
    return changes;
  }

  it("uploads through the asset storage, and shows its refusal", async () => {
    let refuse = true;
    const upload = vi.fn(async () =>
      refuse
        ? {
            ok: false as const,
            error: { code: "TOO_LARGE" as const, message: "Too large." },
          }
        : {
            ok: true as const,
            asset: {
              kind: "dataUrl" as const,
              url: "data:image/png;base64,AAAA",
            },
          },
    );
    const changes = renderImage({ upload });
    const file = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload logo"), {
      target: { files: [file] },
    });
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Too large.",
    );
    refuse = false;
    fireEvent.change(screen.getByLabelText("Upload logo"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(changes).toHaveLength(1));
    expect(upload).toHaveBeenCalledWith(file, "logo");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(changes.at(-1)).toBeNull();
  });

  it("accepts https links only", () => {
    expect(isHttpsUrl("https://cdn.example.com/logo.png")).toBe(true);
    expect(isHttpsUrl("http://cdn.example.com/logo.png")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);

    const changes = renderImage({});
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    const input = screen.getByLabelText("Logo link");
    fireEvent.change(input, { target: { value: "http://example.com/a.png" } });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(screen.getByRole("alert").textContent).toMatch(/https/);
    fireEvent.change(input, { target: { value: "https://example.com/a.png" } });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(changes).toEqual([
      { kind: "remote", url: "https://example.com/a.png" },
    ]);
  });

  it("moves the point of interest with the arrow keys, within the image", () => {
    expect(nudge({ x: 50, y: 50 }, "ArrowLeft", false)).toEqual({
      x: 48,
      y: 50,
    });
    expect(nudge({ x: 95, y: 3 }, "ArrowRight", true)).toEqual({
      x: 100,
      y: 3,
    });
    expect(nudge({ x: 5, y: 1 }, "ArrowUp", false)).toEqual({ x: 5, y: 0 });
    expect(nudge({ x: 5, y: 1 }, "Enter", false)).toBeNull();
  });
});
