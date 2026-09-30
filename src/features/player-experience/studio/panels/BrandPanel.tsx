import { Moon, Sun } from "lucide-react";
import { ctaTextColor } from "../../domain/contrast";
import type { ThemeTokens } from "../../domain/types";
import { ColorField } from "../fields/ColorField";
import { Field, inputClass } from "../fields/Field";
import { IconPicker } from "../fields/IconPicker";
import { ImageField } from "../fields/ImageField";
import { LocalizedTextField } from "../fields/LocalizedTextField";
import { NumberField } from "../fields/NumberField";
import { SegmentedControl } from "../fields/SegmentedControl";
import { useStudio } from "../StudioContext";
import {
  PanelBody,
  PanelHeader,
  PanelIssues,
  PanelSection,
} from "./PanelLayout";
import { useTextLocale } from "./useTextLocale";

// Brand (plan §9.2): name, tagline, logo, the five colors, dark or light, background,
// corners and font. Each change shows at once in the preview (D22). The colors that carry
// text say whether it stays readable, and the theme's design issues are listed right here.

type ColorKey = keyof ThemeTokens["colors"];

const BACKGROUNDS = [
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "mesh", label: "Mesh" },
  { value: "dots", label: "Dots" },
  { value: "image", label: "Image" },
] as const;

export function BrandPanel() {
  const theme = useStudio((state) => state.config.theme);
  const brand = useStudio((state) => state.config.brand);
  const updateTheme = useStudio((state) => state.updateTheme);
  const updateBrand = useStudio((state) => state.updateBrand);
  const textLocale = useTextLocale();

  const setColor = (key: ColorKey) => (value: string) =>
    updateTheme({ colors: { ...theme.colors, [key]: value } });
  const setBackground = (patch: Partial<ThemeTokens["background"]>) =>
    updateTheme({ background: { ...theme.background, ...patch } });

  // What each color carries, to rate its contrast (the runtime uses the same pairs).
  const pairs: Record<ColorKey, [string, string] | undefined> = {
    primary: [ctaTextColor(theme), "Button text"],
    secondary: undefined,
    accent: undefined,
    surface: [theme.colors.text, "Text"],
    text: [theme.colors.surface, "Background"],
  };
  const COLORS: { key: ColorKey; label: string }[] = [
    { key: "primary", label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "accent", label: "Accent" },
    { key: "surface", label: "Background" },
    { key: "text", label: "Text" },
  ];

  return (
    <>
      <PanelHeader
        title="Brand Identity"
        description="Your name, logo and colors, on every screen."
      />
      <PanelBody>
        <PanelSection title="Identity">
          <Field label="Brand name" path="brand.name">
            {(id) => (
              <input
                id={id}
                dir="auto"
                value={brand.name}
                maxLength={40}
                placeholder="Zeta Market"
                onChange={(event) => updateBrand({ name: event.target.value })}
                className={inputClass}
              />
            )}
          </Field>
          <LocalizedTextField
            label="Tagline"
            path="brand.tagline"
            value={brand.tagline}
            onChange={(tagline) => updateBrand({ tagline })}
            maxChars={60}
            {...textLocale}
          />
          <ImageField
            label="Logo"
            path="brand.logo"
            purpose="logo"
            value={brand.logo}
            onChange={(logo) => updateBrand({ logo })}
            hint="PNG or SVG with a transparent background looks best."
          />
          <IconPicker
            label={
              brand.logo
                ? "Icon (when the logo cannot load)"
                : "Icon instead of a logo"
            }
            path="brand.logoIcon"
            value={brand.logoIcon}
            onChange={(logoIcon) => logoIcon && updateBrand({ logoIcon })}
          />
        </PanelSection>

        <PanelSection
          title="Colors"
          description="Buttons, highlights, the game and the page."
        >
          <PanelIssues prefixes={["theme.colors"]} />
          <SegmentedControl
            label="Mode"
            path="theme.mode"
            value={theme.mode}
            onChange={(mode) => updateTheme({ mode })}
            options={[
              {
                value: "dark",
                label: "Dark",
                icon: <Moon className="size-3.5" aria-hidden />,
              },
              {
                value: "light",
                label: "Light",
                icon: <Sun className="size-3.5" aria-hidden />,
              },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {COLORS.map(({ key, label }) => (
              <ColorField
                key={key}
                label={label}
                path={`theme.colors.${key}`}
                value={theme.colors[key]}
                onChange={setColor(key)}
                contrastWith={pairs[key]?.[0]}
                contrastLabel={pairs[key]?.[1]}
              />
            ))}
          </div>
        </PanelSection>

        <PanelSection title="Background">
          <PanelIssues prefixes={["theme.background"]} />
          <SegmentedControl
            label="Style"
            path="theme.background.kind"
            value={theme.background.kind}
            onChange={(kind) => setBackground({ kind })}
            options={BACKGROUNDS}
          />
          {theme.background.kind === "image" && (
            <>
              <ImageField
                label="Photo"
                path="theme.background.image"
                purpose="background"
                value={theme.background.image}
                onChange={(image) => setBackground({ image })}
                focus={theme.background.focus}
                onFocusChange={(focus) => setBackground({ focus })}
                hint="Without a photo, the page falls back to its color."
              />
              <NumberField
                label="Veil over the photo"
                path="theme.background.overlayOpacity"
                value={Math.round(theme.background.overlayOpacity * 100)}
                onChange={(percent) =>
                  setBackground({ overlayOpacity: percent / 100 })
                }
                min={0}
                max={100}
                step={5}
                unit="%"
                slider
                hint="Keeps the texts readable over a busy photo."
              />
            </>
          )}
        </PanelSection>

        <PanelSection title="Shape and type">
          <SegmentedControl
            label="Corners"
            path="theme.radius"
            value={theme.radius}
            onChange={(radius) => updateTheme({ radius })}
            options={[
              { value: "sharp", label: "Sharp" },
              { value: "rounded", label: "Rounded" },
              { value: "pill", label: "Pill" },
            ]}
          />
          <SegmentedControl
            label="Font (Latin)"
            path="theme.font"
            value={theme.font}
            onChange={(font) => updateTheme({ font })}
            options={[
              { value: "poppins", label: "Poppins" },
              { value: "plus-jakarta", label: "Plus Jakarta Sans" },
            ]}
          />
          <p className="text-xs text-brand-text-muted">
            Arabic always uses Noto Sans Arabic.
          </p>
        </PanelSection>
      </PanelBody>
    </>
  );
}
