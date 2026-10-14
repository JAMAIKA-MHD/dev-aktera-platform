import { z } from "zod";
import { DEFAULT_GAME_TYPE, createDefaultExperience } from "./defaults";
import type { GameType } from "./gameTypes";
import { ICON_NAMES } from "./icons";
import { migrateExperienceConfig } from "./migrations";
import type { ExperienceConfig } from "./types";

// Structural validation: can this configuration be loaded and rendered safely?
// Design rules ("publishable": contrast, 4+ wheel segments, consent text filled…) belong to
// validation.ts, so that the Studio can hold work-in-progress states without losing them.

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SAFE_LINK = /^(https:|mailto:|tel:)/i;

const localeSchema = z.enum(["fr", "ar", "en"]);
const gameTypeSchema = z.enum([
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
]);

const localizedTextSchema = z.object({
  fr: z.string().optional(),
  ar: z.string().optional(),
  en: z.string().optional(),
});

const colorSchema = z.string().regex(HEX_COLOR, "Expected a #rrggbb color");
const percentSchema = z.number().min(0).max(100);
const idSchema = z.string().min(1);
const iconNameSchema = z.enum(ICON_NAMES);

const assetRefSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("dataUrl"),
      url: z.string().startsWith("data:image/"),
    }),
    z.object({
      kind: z.literal("remote"),
      url: z.string().startsWith("https://"),
    }),
    z.object({
      kind: z.literal("storage"),
      bucket: z.string().min(1),
      path: z.string().min(1),
    }),
  ])
  .nullable();

const themeSchema = z.object({
  presetId: z.string().nullable(),
  mode: z.enum(["dark", "light"]),
  colors: z.object({
    primary: colorSchema,
    secondary: colorSchema,
    accent: colorSchema,
    surface: colorSchema,
    text: colorSchema,
  }),
  background: z.object({
    kind: z.enum(["solid", "gradient", "mesh", "dots", "image"]),
    image: assetRefSchema,
    overlayOpacity: z.number().min(0).max(1),
    focus: z.object({ x: percentSchema, y: percentSchema }),
  }),
  radius: z.enum(["sharp", "rounded", "pill"]),
  font: z.enum(["poppins", "plus-jakarta"]),
});

const screenContentSchema = z.object({
  showHeader: z.boolean(),
  hero: z.enum(["none", "badge", "trophy", "gift", "timer"]),
  title: localizedTextSchema,
  subtitle: localizedTextSchema,
  reinforcement: z.object({
    kind: z.enum(["none", "attempts", "timer", "progress", "hint"]),
    text: localizedTextSchema,
  }),
  primaryCta: localizedTextSchema,
  secondaryCta: localizedTextSchema.nullable(),
});

const sectionsSchema = z.object({
  jackpot: z.object({
    enabled: z.boolean(),
    eyebrow: localizedTextSchema,
    title: localizedTextSchema,
    badge: localizedTextSchema,
    icon: iconNameSchema,
  }),
  prizeChips: z.object({
    enabled: z.boolean(),
    items: z
      .array(
        z.object({
          id: idSchema,
          icon: iconNameSchema,
          value: localizedTextSchema,
          caption: localizedTextSchema,
          tone: z.enum(["primary", "secondary", "accent"]),
        }),
      )
      .min(1)
      .max(4),
  }),
});

const formSchema = z
  .object({
    fields: z.array(
      z.object({
        key: z.enum(["fullName", "phone", "email", "wilaya"]),
        enabled: z.boolean(),
        required: z.boolean(),
        label: localizedTextSchema,
        placeholder: localizedTextSchema,
      }),
    ),
    consent: z.object({
      text: localizedTextSchema,
      policyVersion: z.string().min(1),
    }),
  })
  .superRefine((form, ctx) => {
    const keys = form.fields.map((field) => field.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: "custom",
        path: ["fields"],
        message: "Each form field may appear only once",
      });
    }
    const phone = form.fields.find((field) => field.key === "phone");
    if (!phone) {
      ctx.addIssue({
        code: "custom",
        path: ["fields"],
        message: "The phone field must be present",
      });
    }
  });

const legalSchema = z.object({
  organizerName: z.string(),
  links: z.array(
    z.object({
      id: idSchema,
      kind: z.enum(["terms", "privacy", "support", "url"]),
      label: localizedTextSchema,
      url: z
        .string()
        .regex(SAFE_LINK, "Only https:, mailto: and tel: links are allowed")
        .optional(),
    }),
  ),
  // A design saved before the switch existed keeps its notice: shown by default.
  showLegalLine: z.boolean().default(true),
  legalLine: localizedTextSchema,
  termsBody: localizedTextSchema,
});

const gameSchema = z
  .object({
    type: gameTypeSchema,
    teaser: z.object({
      mode: z.enum(["attract", "static"]),
      caption: localizedTextSchema.nullable(),
    }),
    wheel: z
      .object({
        segments: z
          .array(
            z.object({
              id: idSchema,
              prizeId: idSchema.nullable(),
              label: localizedTextSchema,
              color: colorSchema.nullable(),
              icon: iconNameSchema.nullable(),
            }),
          )
          .min(2)
          .max(12),
        hubLabel: localizedTextSchema,
      })
      .optional(),
    scratch: z
      .object({
        coverImage: assetRefSchema,
        coverText: localizedTextSchema,
        revealThresholdPercent: z.number().min(1).max(100),
      })
      .optional(),
    boxes: z
      .object({
        count: z.literal(3),
        icon: iconNameSchema,
        color: colorSchema.nullable(),
      })
      .optional(),
    quiz: z
      .object({
        translations: z.record(
          z.string(),
          z.object({
            sourceHash: z.string().min(1),
            text: localizedTextSchema,
            options: z.array(localizedTextSchema),
          }),
        ),
      })
      .optional(),
    hitIt: z
      .object({ targetIcon: iconNameSchema, targetImage: assetRefSchema })
      .optional(),
  })
  .superRefine((game, ctx) => {
    const block = {
      lucky_wheel: game.wheel,
      scratch_card: game.scratch,
      mystery_box: game.boxes,
      quiz: game.quiz,
      hit_it: game.hitIt,
    }[game.type];
    if (!block) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: `Missing settings for the "${game.type}" game`,
      });
    }
  });

export const experienceConfigSchema = z.object({
  schemaVersion: z.literal(1),
  id: idSchema,
  campaignId: idSchema.nullable(),
  templateId: z.literal("eight-slot"),
  updatedAt: z.iso.datetime(),
  locales: z
    .object({
      default: localeSchema,
      enabled: z.array(localeSchema).min(1),
    })
    .superRefine((locales, ctx) => {
      if (!locales.enabled.includes(locales.default)) {
        ctx.addIssue({
          code: "custom",
          path: ["default"],
          message: "The default locale must be one of the enabled locales",
        });
      }
      if (new Set(locales.enabled).size !== locales.enabled.length) {
        ctx.addIssue({
          code: "custom",
          path: ["enabled"],
          message: "Each locale may be enabled only once",
        });
      }
    }),
  theme: themeSchema,
  brand: z.object({
    name: z.string(),
    logo: assetRefSchema,
    logoIcon: iconNameSchema,
    tagline: localizedTextSchema,
  }),
  screens: z.object({
    welcome: screenContentSchema,
    register: screenContentSchema,
    play: screenContentSchema,
    win: screenContentSchema,
    lose: screenContentSchema,
  }),
  sections: sectionsSchema,
  form: formSchema,
  legal: legalSchema,
  game: gameSchema,
  prizeDisplay: z.record(
    z.string(),
    z.object({
      label: localizedTextSchema,
      winMessage: localizedTextSchema,
      icon: iconNameSchema.nullable(),
      image: assetRefSchema,
    }),
  ),
  features: z.object({
    sound: z.boolean(),
    animations: z.boolean(),
    shareBonus: z.literal(false),
  }),
});
// Matches ExperienceConfig exactly: checked in strict mode by schema.strict-check.ts.

export interface ParseResult {
  config: ExperienceConfig;
  issues: string[]; // "path: message", in English
  recovered: boolean; // true when parts of the input were replaced by defaults
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join(".");
  return `${path || "(root)"}: ${issue.message}`;
}

// Keeps every valid part of `raw` and replaces each invalid part by the fallback.
// Objects are repaired field by field; records keep their valid entries; anything else
// (arrays, unions, leaves) is kept whole or replaced whole.
function repair(schema: z.ZodType, raw: unknown, fallback: unknown): unknown {
  if (schema.safeParse(raw).success) return raw;

  const base = schema instanceof z.ZodOptional ? schema.unwrap() : schema;

  if (
    base instanceof z.ZodObject &&
    isPlainObject(raw) &&
    isPlainObject(fallback)
  ) {
    const shape = base.shape as Record<string, z.ZodType>;
    const repaired: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(shape)) {
      repaired[key] = repair(child, raw[key], fallback[key]);
    }
    // An object-level rule (e.g. "default locale is enabled") may still fail.
    return base.safeParse(repaired).success ? repaired : fallback;
  }

  if (base instanceof z.ZodRecord && isPlainObject(raw)) {
    const valueSchema = base.valueType as z.ZodType;
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([, value]) => valueSchema.safeParse(value).success,
      ),
    );
  }

  return fallback;
}

function readGameType(raw: unknown): GameType | undefined {
  if (!isPlainObject(raw) || !isPlainObject(raw.game)) return undefined;
  const result = gameTypeSchema.safeParse(raw.game.type);
  return result.success ? result.data : undefined;
}

// Never throws. The input is first brought up to the current version (migrations.ts).
// A valid input is returned as is (unknown keys removed); anything else is
// repaired against a default configuration, and the problems are listed in `issues`.
export function parseExperienceConfig(
  raw: unknown,
  fallbackGameType?: GameType,
): ParseResult {
  const gameType = fallbackGameType ?? readGameType(raw) ?? DEFAULT_GAME_TYPE;
  try {
    // Older versions are upgraded first; a migrated configuration is not a "recovery".
    const migrated = migrateExperienceConfig(raw);
    const strict = experienceConfigSchema.safeParse(migrated);
    if (strict.success) {
      // The casts below are sound: the project tsconfig is not strict, and without strictNullChecks
      // zod infers every nullable key as optional. schema.strict-check.ts proves the exact match.
      return {
        config: strict.data as ExperienceConfig,
        issues: [],
        recovered: false,
      };
    }
    const fallback = createDefaultExperience({ gameType });
    const repaired = experienceConfigSchema.safeParse(
      repair(experienceConfigSchema, migrated, fallback),
    );
    return {
      config: repaired.success ? (repaired.data as ExperienceConfig) : fallback,
      issues: strict.error.issues.map(formatIssue),
      recovered: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      config: createDefaultExperience({ gameType }),
      issues: [`(root): unreadable configuration (${message})`],
      recovered: true,
    };
  }
}
