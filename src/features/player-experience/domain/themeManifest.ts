import { z } from "zod";
import { TEMPLATE_IDS, type TemplateId } from "./templates";

// The contract of a theme.json (themes/<id>/theme.json): everything a template of the library
// looks like, as data — palette, fonts, radii, shadows, sizes, spacing, the panel, card, HUD,
// button and field styles, the 9-slice frames, the backgrounds, the wheel, the prize art and
// the sounds. theme/ turns it into CSS variables (--xp-panel-bg, --xp-btn-radius…) and the
// shell components (runtime/shell/) read nothing else: a new theme is a new folder, never a
// new component.
//
// Rules that decide a win never live here (rule 3): a theme only says how things look.

export const THEME_MANIFEST_VERSION = 1;

// The ids a theme.json may carry: every template but the classic one, which is styled by the
// brand's own theme presets (presets/themePresets.ts).
export const THEMED_TEMPLATE_IDS = TEMPLATE_IDS.filter(
  (id): id is Exclude<TemplateId, "eight-slot"> => id !== "eight-slot",
);
export type ThemedTemplateId = (typeof THEMED_TEMPLATE_IDS)[number];

// Colors a value may point to instead of repeating them: "@primary" follows the brand's own
// primary color when the brand changes it (only primary and accent can be changed, the rest
// is the theme's).
export const COLOR_ROLES = [
  "primary",
  "secondary",
  "accent",
  "surface",
  "text",
  "ink",
] as const;
// Shades of the primary color, worked out from whatever primary is in force: a gradient
// written with them still reads right on a brand's own color.
export const DERIVED_ROLES = ["primary-light", "primary-deep"] as const;
export type ColorRole =
  (typeof COLOR_ROLES)[number] | (typeof DERIVED_ROLES)[number];

const HEX = /^#[0-9a-f]{6}$/i;
const ROLE = new RegExp(
  `^@(?:${[...DERIVED_ROLES, ...COLOR_ROLES].join("|")})$`,
);
// A CSS value written by the theme: a length, a shadow, a gradient. It may name a role
// ("0 0.3em 0 @ink"). No url(), no declaration or rule break: a value never escapes its
// property, and images only come in through `assets/` paths.
const CSS_VALUE = /^[^;{}<>\\]*$/;

const hexSchema = z.string().regex(HEX, "Expected a #rrggbb color");
const colorSchema = z
  .string()
  .refine((value) => HEX.test(value) || ROLE.test(value), {
    message: "Expected a #rrggbb color or a role (@primary, @ink…)",
  });
const cssSchema = z
  .string()
  .max(240)
  .regex(CSS_VALUE, "Not a plain CSS value")
  .refine((value) => !/url\s*\(/i.test(value), {
    message: "Images come in through assets/ paths, never url()",
  });
// Paths inside the theme's own folder: the loader resolves them to bundled URLs.
const assetSchema = z
  .string()
  .regex(
    /^assets\/[a-z0-9/_.-]+\.(?:svg|png|webp|jpg|mp3)$/,
    "Expected a path under assets/",
  )
  .refine((value) => !value.includes(".."), { message: "No .. in a path" });

// A 9-slice frame: one small image stretched to any size (CSS border-image). `slice` is in
// the image's own pixels ("36", or "24 24 30 24"), `width` how thick the border is drawn.
const frameSchema = z.object({
  src: assetSchema,
  slice: z.string().regex(/^\d+(?: \d+){0,3}$/),
  width: cssSchema,
  outset: cssSchema.default("0"),
  // stretch: edges stretched. round: edges tiled whole (a ring of bulbs keeps its spacing).
  repeat: z.enum(["stretch", "round"]).default("stretch"),
  pixelated: z.boolean().default(false), // pixel art: scaled without smoothing
});

const buttonSchema = z.object({
  bg: cssSchema, // a color or a gradient
  text: colorSchema,
  border: colorSchema,
  borderWidth: cssSchema,
  shadow: cssSchema,
  shadowPressed: cssSchema,
  textShadow: cssSchema.optional(), // a pixel font's hard shadow under the label
  // The button drawn from a picture (a pixel sprite), stretched as a 9-slice: its `width` is
  // how thick the picture's edges are drawn. It replaces bg, border and shadow.
  frame: frameSchema.optional(),
});

const partialRecord = <K extends string, V extends z.ZodTypeAny>(
  keys: readonly [K, ...K[]],
  value: V,
) =>
  z
    .object(
      Object.fromEntries(keys.map((key) => [key, value.optional()])) as {
        [P in K]: z.ZodOptional<V>;
      },
    )
    .strict()
    .default({} as never);

// The screens of the journey (domain/flow.ts FlowScreen), for what a theme dresses per screen.
export const FLOW_SCREENS = [
  "welcome",
  "register",
  "play",
  "resolving",
  "revealing",
  "win",
  "lose",
  "duplicate",
  "closed",
  "error",
] as const;

const decorSchema = z.object({
  src: assetSchema,
  // Where it sits on the stage, sized on the screen (vmin, %), never in fixed pixels.
  left: cssSchema.optional(),
  right: cssSchema.optional(),
  top: cssSchema.optional(),
  bottom: cssSchema.optional(),
  width: cssSchema,
  height: cssSchema.optional(), // a tiled strip's own height
  rotate: z.number().min(-180).max(180).default(0),
  opacity: z.number().min(0).max(1).default(1),
  // A one-color SVG (drawn in currentColor) painted in this color, through a CSS mask.
  tint: colorSchema.optional(),
  motion: z.enum(["none", "float", "twinkle", "drift"]).default("none"),
  repeatX: z.boolean().default(false), // a strip (the ground) tiled across the width
  hideWhenLow: z.boolean().default(false), // dropped on low screens, where it would cover text
  // The screens it shows on (all when left out): a template may dress each screen its own way.
  screens: z.array(z.enum(FLOW_SCREENS)).min(1).optional(),
  // Drawn over the panel instead of behind it (a star overlapping the cloud's edge). Still
  // never in the way of a pointer.
  front: z.boolean().default(false),
});

// The panel's own shape (a cloud…): one image stretched behind the slots instead of the
// rectangle or the 9-slice frame, with the room it needs around the texts. A screen may take
// another picture of it (a dimmer cloud on a loss) or go without it (the game, on the stage).
const panelShapeSchema = z.object({
  src: assetSchema,
  shadow: cssSchema.default("none"), // a drop-shadow, following the shape ("1rem 1rem 0 #1A62AB")
  padInline: cssSchema, // from the texts to the shape's edge, sized on the screen
  padBlock: cssSchema,
  // In one column (a phone): a shape drawn for a wide screen, stretched that tall, would
  // pinch the texts at its top corners. The theme gives it a tall picture of its own (src,
  // and per screen), whole in the middle of the stage, or runs it past the screen's sides
  // (bleed), closer to the texts.
  stack: z
    .object({
      padInline: cssSchema,
      bleed: cssSchema.default("0px"),
      src: assetSchema.optional(),
      screens: partialRecord(FLOW_SCREENS, assetSchema),
    })
    .strict()
    .optional(),
  columnMax: cssSchema.default("30rem"), // the text column inside the shape
  screens: partialRecord(
    FLOW_SCREENS,
    z.object({ src: assetSchema.optional(), shadow: cssSchema.optional() }),
  ),
  hiddenOn: z.array(z.enum(FLOW_SCREENS)).default([]),
});

const GAME_KEYS = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
] as const;

export const PRIZE_ART_NAMES = [
  "gift",
  "ticket",
  "coin",
  "star",
  "gem",
  "trophy",
  "crown",
  "medal",
] as const;
export type PrizeArtName = (typeof PRIZE_ART_NAMES)[number];

export const THEME_SOUND_NAMES = [
  "click",
  "tick",
  "win",
  "lose",
  "reward",
] as const;
export type ThemeSoundName = (typeof THEME_SOUND_NAMES)[number];

export const themeManifestSchema = z
  .object({
    version: z.literal(THEME_MANIFEST_VERSION),
    id: z.enum(
      THEMED_TEMPLATE_IDS as [ThemedTemplateId, ...ThemedTemplateId[]],
    ),
    label: z.string().min(1).max(24),
    description: z.string().min(1).max(160),
    source: z.string().nullable(), // folder of src/templates/ it was adapted from
    credits: z.string().nullable().default(null), // file of the theme folder naming the authors

    // What the brand-level theme (ThemeTokens) starts from when the template is picked. The
    // design checks (contrast…) measure these: `surface` is the panel the texts sit on.
    mode: z.enum(["dark", "light"]),
    palette: z.object({
      primary: hexSchema,
      secondary: hexSchema,
      accent: hexSchema,
      surface: hexSchema,
      text: hexSchema,
      ink: hexSchema, // outlines, hard shadows, text on light buttons
    }),
    radius: z.enum(["sharp", "rounded", "pill"]),
    font: z.enum(["poppins", "plus-jakarta"]), // the body text's
    fonts: z.object({
      display: z.string().regex(/^[A-Za-z0-9 ]+$/), // titles, the main button, results
      ui: z.string().regex(/^[A-Za-z0-9 ]+$/), // labels, chips, the HUD
      stylesheet: z.string().startsWith("https://fonts.googleapis.com/"),
    }),

    tokens: z.object({
      radius: z.object({
        sm: cssSchema,
        md: cssSchema,
        lg: cssSchema,
        pill: cssSchema,
      }),
      space: z.object({
        xs: cssSchema,
        sm: cssSchema,
        md: cssSchema,
        lg: cssSchema,
      }),
      fontSize: z.object({
        display: cssSchema, // the result headline
        title: cssSchema, // multiplier of the title slot's fluid size ("1", "0.8")
        body: cssSchema,
        label: cssSchema,
      }),
      shadow: z.object({
        panel: cssSchema,
        card: cssSchema,
        pop: cssSchema, // a popup over the game
      }),
    }),

    panel: z.object({
      bg: cssSchema,
      text: colorSchema,
      border: colorSchema,
      borderWidth: cssSchema,
      frame: frameSchema.nullable(),
      shape: panelShapeSchema.nullable().default(null), // wins over the frame
      // The frame's own picture on some screens (red bulbs on a loss): same slice and width.
      frameScreens: partialRecord(FLOW_SCREENS, assetSchema),
      glow: cssSchema.optional(), // a drop-shadow around the framed panel
      // The room from the texts to the panel's edge, and the text column, when the panel is
      // much wider than its texts (a marquee board).
      room: z
        .object({ inline: cssSchema, block: cssSchema, columnMax: cssSchema })
        .strict()
        .optional(),
    }),
    card: z.object({
      bg: cssSchema,
      border: colorSchema,
      borderWidth: cssSchema,
      frame: frameSchema.nullable(),
    }),
    hud: z.object({ bg: cssSchema, text: colorSchema, border: colorSchema }),
    button: z.object({
      primary: buttonSchema,
      secondary: buttonSchema,
      // The main button's own look on some screens (a gold one on a win).
      screens: partialRecord(FLOW_SCREENS, buttonSchema.partial()),
      // Pixel corners cut off buttons, fields and the prize card ("0.5rem").
      notch: cssSchema.optional(),
    }),
    field: z.object({
      bg: cssSchema,
      text: colorSchema,
      border: colorSchema,
      borderWidth: cssSchema,
      shadow: cssSchema.default("none"), // a hard offset under the field
      label: colorSchema.optional(), // the label above it, else the panel's text
      labelFont: z.enum(["ui", "display"]).default("ui"),
      // Small capitals over the field; a display label is in the title's case already.
      labelCase: z.enum(["none", "uppercase"]).optional(),
      labelTracking: cssSchema.optional(),
    }),
    title: z.object({
      color: colorSchema,
      stroke: colorSchema.nullable(), // the cartoon outline around each letter
      strokeWidth: cssSchema.default("0"),
      shadow: cssSchema,
      transform: z.enum(["none", "uppercase"]),
      letterSpacing: cssSchema.default("normal"),
      // Display fonts often come in one weight (400); a variable one can be set bolder.
      weight: z.number().int().min(100).max(900).default(400),
      // Its own color on some screens: a yellow win, a red loss.
      screens: partialRecord(FLOW_SCREENS, colorSchema),
      // A shape behind the title on the screens where the panel is gone (a title cloud over
      // the game).
      // Its own glow or shadow on some screens (a gold glow on a win, a red one on a loss).
      shadows: partialRecord(FLOW_SCREENS, cssSchema),
      backdrop: z
        .object({
          src: assetSchema,
          screens: z.array(z.enum(FLOW_SCREENS)).min(1),
        })
        .nullable()
        .default(null),
    }),

    // How the 8 slots are arranged on a landscape screen: two panes (texts beside the game),
    // or one column in the middle of the stage (spotlight: a single cloud, the game alone in
    // the middle and its button beside it). The slots and their order never change.
    layout: z
      .object({
        kind: z.enum(["panes", "spotlight"]).default("panes"),
        // The welcome screen shows the game's teaser; a template may open on its texts alone.
        welcomeTeaser: z.boolean().default(true),
        // The game screen's CTA beside the game on a landscape screen: a round button, or the
        // theme's own block button.
        // round-below: the round button stays under the game, whatever the screen's shape.
        playCta: z.enum(["round", "block", "round-below"]).default("round"),
        // The prize's card on a win: flat on the panel, or the theme's card.
        rewardCard: z.enum(["flat", "card"]).default("flat"),
        // The characters of a result: over the title (slot 2), or in the screen's body.
        characters: z.enum(["hero", "body"]).default("hero"),
        // Room kept above the footer for the stage's ground, where the footer sits on a
        // landscape that has one ("calc(clamp(6rem, 23svh, 13rem) * 0.6)").
        footerGap: cssSchema.optional(),
      })
      .strict()
      .prefault({}),

    stage: z.object({
      color: hexSchema, // under the image, and while it loads
      overlay: colorSchema, // a veil over the image, darker on a loss
      overlayOpacity: z.number().min(0).max(1),
      // cover: the image fills the screen, cut at the edges. stretch: all of it is always in
      // view (a drawn border around the stage), stretched to the screen's shape.
      fit: z.enum(["cover", "stretch"]).default("cover"),
      // A brighter stage on a win, a dimmer one on a loss; off when the theme draws its own
      // background for those screens.
      moods: z.boolean().default(true),
      // The text written straight on the stage, where a screen has no panel.
      text: colorSchema.optional(),
      // The footer's text, written on the stage's own ground (the dark soil of a landscape).
      footerText: colorSchema.optional(),
      backgrounds: z.object({
        default: assetSchema,
        games: partialRecord(GAME_KEYS, assetSchema),
        screens: partialRecord(["win", "lose"], assetSchema),
      }),
      decor: z.array(decorSchema).max(48).default([]),
    }),

    wheel: z.object({
      segments: z.array(colorSchema).min(2).max(8), // prize slices, in turn
      blank: colorSchema, // a slice without a prize
      rim: colorSchema,
      rimInk: colorSchema,
      bulbs: colorSchema.nullable(), // lights around the rim
      bulbsPerSlice: z.number().int().min(1).max(3).default(2),
      // A rim in two colors, blocks in turn all round (an arcade wheel), over the rim color.
      rimStripes: colorSchema.nullable().default(null),
      bulbInk: colorSchema.nullable().default(null), // an outline around each light
      pointer: colorSchema,
      pointerInk: colorSchema,
      // The theme's own pointer, drawn above the rim and pointing down into the wheel (its
      // tip at the bottom of the picture), instead of the drawn triangle.
      pointerArt: assetSchema.nullable().default(null),
      // Its size in the wheel's own units (the disc's radius is 128), and how far its tip
      // reaches into the rim.
      pointerSize: z
        .object({
          width: z.number().positive().max(120),
          height: z.number().positive().max(120),
          overlap: z.number().min(0).max(60),
        })
        .strict()
        .default({ width: 35, height: 42.7, overlap: 24.7 }),
      hub: colorSchema,
      hubText: colorSchema,
      hubShine: z.boolean().default(true), // a lit gradient, or a flat cartoon fill
      bulbShape: z.enum(["round", "square"]).default("round"),
      hubShape: z.enum(["round", "square"]).default("round"),
      // A hard shadow under the whole wheel ("1.5cqmin 1.5cqmin 0 #1A62AB"), still while the
      // disc turns.
      shadow: cssSchema.default("none"),
    }),

    prizes: partialRecord(PRIZE_ART_NAMES, assetSchema),
    characters: partialRecord(["happy", "sad"], assetSchema),
    // The template's own picture above the title of a screen (a trophy over the login, a
    // sad face over a loss), drawn in slot 2 by a spotlight template: part of its design,
    // shown whatever the brand set there. Win and lose fall back on the characters.
    heroes: partialRecord(
      FLOW_SCREENS,
      z.object({ src: assetSchema, width: cssSchema }).strict(),
    ),
    // The line under the title (slot 4): its color, font, size and case, per screen if need
    // be, and a short rule under it.
    copy: z
      .object({
        color: colorSchema.optional(),
        font: z.enum(["body", "ui", "display"]).default("body"),
        size: cssSchema.optional(),
        transform: z.enum(["none", "uppercase"]).default("none"),
        rule: colorSchema.nullable().default(null),
        letterSpacing: cssSchema.optional(),
        screens: partialRecord(FLOW_SCREENS, colorSchema),
      })
      .strict()
      .prefault({}),
    sounds: partialRecord(THEME_SOUND_NAMES, assetSchema),
  })
  .strict();

export type ThemeManifest = z.infer<typeof themeManifestSchema>;
export type ThemeFrame = z.infer<typeof frameSchema>;
export type ThemeDecor = z.infer<typeof decorSchema>;
export type ThemePanelShape = z.infer<typeof panelShapeSchema>;
export type ThemeScreen = (typeof FLOW_SCREENS)[number];

// Every assets/ path a manifest names, to check each one exists (themes.test.ts).
export function manifestAssetPaths(manifest: ThemeManifest): string[] {
  const { stage, panel, card, prizes, characters, sounds } = manifest;
  return [
    stage.backgrounds.default,
    ...Object.values(stage.backgrounds.games),
    ...Object.values(stage.backgrounds.screens),
    ...stage.decor.map((decor) => decor.src),
    panel.frame?.src,
    ...Object.values(panel.frameScreens),
    panel.shape?.src,
    ...Object.values(panel.shape?.screens ?? {}).map((shape) => shape?.src),
    card.frame?.src,
    manifest.button.primary.frame?.src,
    manifest.button.secondary.frame?.src,
    manifest.title.backdrop?.src,
    manifest.wheel.pointerArt,
    ...Object.values(manifest.heroes).map((hero) => hero?.src),
    ...Object.values(prizes),
    ...Object.values(characters),
    ...Object.values(sounds),
  ].filter((path): path is string => typeof path === "string");
}
