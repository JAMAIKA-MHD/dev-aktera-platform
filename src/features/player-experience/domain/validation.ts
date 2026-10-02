import type { CampaignSnapshot } from "./campaign";
import { MIN_TEXT_CONTRAST, contrastRatio, ctaTextColor } from "./contrast";
import { MAX_WHEEL_SEGMENTS, MIN_WHEEL_SEGMENTS } from "./defaults";
import { quizSourceHash, resolvePrizeDisplay } from "./display";
import { GAME_LABELS } from "./gameTypes";
import {
  LOCALES,
  hasText,
  resolveText,
  type Locale,
  type LocalizedText,
} from "./locale";
import type { AssetRef, ExperienceConfig, ScreenKey } from "./types";

// Design checks shown in the Studio (plan §6.5). Errors block sharing, warnings inform.
// Messages are Studio labels, hence in English. `path` points at the field to open.
// The layout audit at each screen size is done by the Studio itself (T6.10).

export type IssueLevel = "error" | "warning";

export interface DesignIssue {
  id: string; // stable: rule + path
  level: IssueLevel;
  path: string; // dot path into ExperienceConfig, e.g. "form.consent.text"
  message: string;
}

export const TITLE_MAX_CHARS = 60;
export const TITLE_MAX_LINES = 2;
// Estimated characters per title line on the narrowest reference screen (320 px).
// An estimate only: the Studio's layout audit (T6.10) measures the real rendering.
export const TITLE_CHARS_PER_LINE_AT_320 = 22;
export const SEGMENT_LABEL_MAX_CHARS = 14;
export const MAX_IMAGE_BYTES = 400 * 1024;

const SCREEN_KEYS: readonly ScreenKey[] = [
  "welcome",
  "register",
  "play",
  "win",
  "lose",
];
const SAFE_LINK = /^(https:|mailto:|tel:)/i;

// Wording that promises a win. A heuristic, so only ever a warning.
const PROMISES: readonly RegExp[] = [
  /garanti/i,
  /guarantee/i,
  /مضمون/,
  /100\s?[%٪]/,
  /à coup sûr/i,
  /à tous les coups/i,
  /tout le monde gagne/i,
  /everyone wins/i,
  /sure win/i,
];

const length = (text: string) => [...text.trim()].length;
const quote = (text: string) =>
  length(text) > 40
    ? `"${[...text.trim()].slice(0, 39).join("")}…"`
    : `"${text.trim()}"`;
const hasAnyText = (text: LocalizedText) =>
  LOCALES.some((locale) => hasText(text, locale));

// Greedy word wrap: how many lines the text takes at `perLine` characters per line.
export function estimateLines(text: string, perLine: number): number {
  let lines = 0;
  let used = perLine; // forces a new line for the first word
  for (const word of text.trim().split(/\s+/)) {
    const size = [...word].length;
    if (used + 1 + size <= perLine) {
      used += 1 + size;
      continue;
    }
    const taken = Math.max(1, Math.ceil(size / perLine)); // a long word breaks
    lines += taken;
    used = size - (taken - 1) * perLine;
  }
  return lines;
}

interface TextEntry {
  path: string;
  text: LocalizedText;
}

// Every text the player may read, with its path.
function playerTexts(config: ExperienceConfig): TextEntry[] {
  const entries: TextEntry[] = [];
  const add = (path: string, text: LocalizedText | null) => {
    if (text) entries.push({ path, text });
  };
  for (const key of SCREEN_KEYS) {
    const screen = config.screens[key];
    add(`screens.${key}.title`, screen.title);
    add(`screens.${key}.subtitle`, screen.subtitle);
    add(`screens.${key}.primaryCta`, screen.primaryCta);
    add(`screens.${key}.secondaryCta`, screen.secondaryCta);
    if (screen.reinforcement.kind !== "none") {
      add(`screens.${key}.reinforcement.text`, screen.reinforcement.text);
    }
  }
  add("brand.tagline", config.brand.tagline);
  const { jackpot, prizeChips } = config.sections;
  if (jackpot.enabled) {
    add("sections.jackpot.eyebrow", jackpot.eyebrow);
    add("sections.jackpot.title", jackpot.title);
    add("sections.jackpot.badge", jackpot.badge);
  }
  if (prizeChips.enabled) {
    prizeChips.items.forEach((item, index) => {
      add(`sections.prizeChips.items.${index}.value`, item.value);
      add(`sections.prizeChips.items.${index}.caption`, item.caption);
    });
  }
  config.form.fields.forEach((field, index) => {
    if (!field.enabled) return;
    add(`form.fields.${index}.label`, field.label);
    add(`form.fields.${index}.placeholder`, field.placeholder);
  });
  add("form.consent.text", config.form.consent.text);
  add("legal.legalLine", config.legal.legalLine);
  add("legal.termsBody", config.legal.termsBody);
  config.legal.links.forEach((link, index) =>
    add(`legal.links.${index}.label`, link.label),
  );
  const { game } = config;
  add("game.teaser.caption", game.teaser.caption);
  if (game.type === "lucky_wheel" && game.wheel) {
    add("game.wheel.hubLabel", game.wheel.hubLabel);
    game.wheel.segments.forEach((segment, index) =>
      add(`game.wheel.segments.${index}.label`, segment.label),
    );
  }
  if (game.type === "scratch_card" && game.scratch) {
    add("game.scratch.coverText", game.scratch.coverText);
  }
  for (const [prizeId, display] of Object.entries(config.prizeDisplay)) {
    add(`prizeDisplay.${prizeId}.label`, display.label);
    add(`prizeDisplay.${prizeId}.winMessage`, display.winMessage);
  }
  return entries;
}

function checkContrast(config: ExperienceConfig, issues: DesignIssue[]) {
  const { colors } = config.theme;
  const text = contrastRatio(colors.text, colors.surface);
  // `!(x >= min)` also catches NaN, returned for an invalid color.
  if (!(text >= MIN_TEXT_CONTRAST)) {
    issues.push({
      id: "contrast-text",
      level: "error",
      path: "theme.colors.text",
      message: `Text on the background has a contrast of ${text}:1, below the 4.5:1 minimum (WCAG AA).`,
    });
  }
  const cta = contrastRatio(ctaTextColor(config.theme), colors.primary);
  if (!(cta >= MIN_TEXT_CONTRAST)) {
    issues.push({
      id: "contrast-cta",
      level: "error",
      path: "theme.colors.primary",
      message: `Button text on the primary color has a contrast of ${cta}:1, below the 4.5:1 minimum (WCAG AA).`,
    });
  }
}

function checkTexts(
  config: ExperienceConfig,
  entries: TextEntry[],
  issues: DesignIssue[],
) {
  const { enabled } = config.locales;
  for (const { path, text } of entries) {
    if (!hasAnyText(text)) continue;
    const missing = enabled.filter((locale) => !hasText(text, locale));
    if (missing.length > 0) {
      issues.push({
        id: `missing-translation:${path}`,
        level: "warning",
        path,
        message: `Not translated into ${missing.join(", ")}: players will see another language instead.`,
      });
    }
    const promise = LOCALES.map((locale) => text[locale] ?? "").find((value) =>
      PROMISES.some((pattern) => pattern.test(value)),
    );
    if (promise !== undefined) {
      const teaser = path === "game.teaser.caption";
      issues.push({
        id: teaser ? "teaser-promise" : `promise:${path}`,
        level: "warning",
        path,
        message: teaser
          ? `The teaser caption ${quote(promise)} promises a win: the teaser must show the game, never a result.`
          : `${quote(promise)} promises a win: only acceptable if every player wins (see the win probability in the campaign settings).`,
      });
    }
  }
}

function checkTitles(config: ExperienceConfig, issues: DesignIssue[]) {
  for (const key of SCREEN_KEYS) {
    const title = config.screens[key].title;
    const tooLong = config.locales.enabled.filter((locale) => {
      const value = title[locale] ?? ""; // a missing text is too short, never too long
      return (
        length(value) > TITLE_MAX_CHARS ||
        estimateLines(value, TITLE_CHARS_PER_LINE_AT_320) > TITLE_MAX_LINES
      );
    });
    if (tooLong.length > 0) {
      issues.push({
        id: `title-length:${key}`,
        level: "warning",
        path: `screens.${key}.title`,
        message: `The ${key} title is too long in ${tooLong.join(", ")}: keep it under ${TITLE_MAX_CHARS} characters and ${TITLE_MAX_LINES} lines on a small phone.`,
      });
    }
  }
}

function checkConsentAndLinks(config: ExperienceConfig, issues: DesignIssue[]) {
  if (!hasAnyText(config.form.consent.text)) {
    issues.push({
      id: "consent-empty",
      level: "error",
      path: "form.consent.text",
      message:
        "The consent text is empty: players must accept it before playing (Law 18-07).",
    });
  }
  config.legal.links.forEach((link, index) => {
    const path = `legal.links.${index}`;
    if (!hasAnyText(link.label)) {
      issues.push({
        id: `link-label:${index}`,
        level: "error",
        path: `${path}.label`,
        message: `Legal link ${index + 1} has no label.`,
      });
    }
    if (link.url !== undefined && !SAFE_LINK.test(link.url)) {
      issues.push({
        id: `link-url:${index}`,
        level: "error",
        path: `${path}.url`,
        message: `Legal link ${index + 1} must start with https:, mailto: or tel:.`,
      });
    }
    if (link.kind === "url" && !link.url) {
      issues.push({
        id: `link-url-missing:${index}`,
        level: "error",
        path: `${path}.url`,
        message: `Legal link ${index + 1} has no address.`,
      });
    }
  });
}

// What a segment shows in a language: its own label, or the label of its prize.
function segmentLabel(
  config: ExperienceConfig,
  campaign: CampaignSnapshot | null,
  label: LocalizedText,
  prizeId: string | null,
  locale: Locale,
): string {
  if (hasAnyText(label))
    return resolveText(label, locale, config.locales.default);
  if (!prizeId) return "";
  if (campaign)
    return resolvePrizeDisplay(prizeId, config, campaign, locale).label;
  // Without a campaign, only the brand's display label is known.
  return resolveText(
    config.prizeDisplay[prizeId]?.label,
    locale,
    config.locales.default,
  );
}

function checkWheel(
  config: ExperienceConfig,
  campaign: CampaignSnapshot | null,
  issues: DesignIssue[],
) {
  const wheel = config.game.wheel;
  if (config.game.type !== "lucky_wheel" || !wheel) return;
  const count = wheel.segments.length;
  if (count < MIN_WHEEL_SEGMENTS || count > MAX_WHEEL_SEGMENTS) {
    issues.push({
      id: "wheel-segment-count",
      level: "error",
      path: "game.wheel.segments",
      message: `The wheel has ${count} segments: it needs ${MIN_WHEEL_SEGMENTS} to ${MAX_WHEEL_SEGMENTS}.`,
    });
  }
  wheel.segments.forEach((segment, index) => {
    const long = config.locales.enabled
      .map((locale) =>
        segmentLabel(config, campaign, segment.label, segment.prizeId, locale),
      )
      .find((label) => length(label) > SEGMENT_LABEL_MAX_CHARS);
    if (long !== undefined) {
      issues.push({
        id: `segment-label:${index}`,
        level: "warning",
        path: `game.wheel.segments.${index}.label`,
        message: `Segment ${index + 1} label ${quote(long)} is longer than ${SEGMENT_LABEL_MAX_CHARS} characters: it may not fit on the wheel.`,
      });
    }
  });
  if (!campaign) return;
  const prizeIds = new Set(campaign.prizes.map((prize) => prize.id));
  const linked = new Set(wheel.segments.map((segment) => segment.prizeId));
  for (const prize of campaign.prizes) {
    if (!linked.has(prize.id)) {
      issues.push({
        id: `wheel-prize-missing:${prize.id}`,
        level: "error",
        path: "game.wheel.segments",
        message: `The prize ${quote(prize.name || prize.id)} has no segment on the wheel.`,
      });
    }
  }
  wheel.segments.forEach((segment, index) => {
    if (segment.prizeId !== null && !prizeIds.has(segment.prizeId)) {
      issues.push({
        id: `wheel-segment-orphan:${index}`,
        level: "error",
        path: `game.wheel.segments.${index}.prizeId`,
        message: `Segment ${index + 1} is linked to a prize that is no longer in the campaign.`,
      });
    }
  });
}

function checkQuiz(
  config: ExperienceConfig,
  campaign: CampaignSnapshot,
  issues: DesignIssue[],
) {
  if (config.game.type !== "quiz") return;
  if (campaign.quiz.length === 0) {
    issues.push({
      id: "quiz-no-question",
      level: "error",
      path: "game.quiz",
      message:
        "The quiz has no active question: add questions in the campaign settings.",
    });
  }
  // The database text is taken as written in the default language.
  const others = config.locales.enabled.filter(
    (locale) => locale !== config.locales.default,
  );
  for (const question of campaign.quiz) {
    const path = `game.quiz.translations.${question.id}`;
    const translation = config.game.quiz?.translations[question.id];
    if (
      translation &&
      (translation.sourceHash !== quizSourceHash(question) ||
        translation.options.length !== question.options.length)
    ) {
      issues.push({
        id: `quiz-translation-outdated:${question.id}`,
        level: "warning",
        path,
        message: `The translation of ${quote(question.text)} was made for an older version of the question: review it.`,
      });
      continue;
    }
    const missing = others.filter(
      (locale) =>
        !translation ||
        !hasText(translation.text, locale) ||
        translation.options.some((option) => !hasText(option, locale)),
    );
    if (missing.length > 0) {
      issues.push({
        id: `quiz-translation-missing:${question.id}`,
        level: "warning",
        path,
        message: `The question ${quote(question.text)} is not translated into ${missing.join(", ")}: players will see the original text.`,
      });
    }
  }
}

function checkCampaignLinks(
  config: ExperienceConfig,
  campaign: CampaignSnapshot,
  issues: DesignIssue[],
) {
  if (campaign.gameType !== config.game.type) {
    issues.push({
      id: "game-type-mismatch",
      level: "error",
      path: "game.type",
      message: `The campaign is now a ${GAME_LABELS[campaign.gameType]} game, but these settings are for ${GAME_LABELS[config.game.type]}: reset the game panel.`,
    });
  }
  const prizeIds = new Set(campaign.prizes.map((prize) => prize.id));
  for (const prizeId of Object.keys(config.prizeDisplay)) {
    if (!prizeIds.has(prizeId)) {
      issues.push({
        id: `prize-display-orphan:${prizeId}`,
        level: "warning",
        path: `prizeDisplay.${prizeId}`,
        message:
          "Display settings for a prize that is no longer in the campaign: they can be removed.",
      });
    }
  }
}

// Decoded size of a data URL, estimated from its length.
export function estimateDataUrlBytes(url: string): number {
  const comma = url.indexOf(",");
  const data = url.slice(comma + 1);
  if (!url.slice(0, comma).endsWith(";base64")) return data.length;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

function checkImages(config: ExperienceConfig, issues: DesignIssue[]) {
  const images: [string, AssetRef][] = [
    ["theme.background.image", config.theme.background.image],
    ["brand.logo", config.brand.logo],
  ];
  const { game } = config;
  if (game.type === "scratch_card" && game.scratch) {
    images.push(["game.scratch.coverImage", game.scratch.coverImage]);
  }
  if (game.type === "hit_it" && game.hitIt) {
    images.push(["game.hitIt.targetImage", game.hitIt.targetImage]);
  }
  for (const [prizeId, display] of Object.entries(config.prizeDisplay)) {
    images.push([`prizeDisplay.${prizeId}.image`, display.image]);
  }
  for (const [path, image] of images) {
    if (image?.kind !== "dataUrl") continue;
    const bytes = estimateDataUrlBytes(image.url);
    if (bytes > MAX_IMAGE_BYTES) {
      issues.push({
        id: `image-size:${path}`,
        level: "warning",
        path,
        message: `This image weighs ${Math.round(bytes / 1024)} KB: keep images under ${MAX_IMAGE_BYTES / 1024} KB so the page loads fast on mobile data.`,
      });
    }
  }
}

function checkPhone(config: ExperienceConfig, issues: DesignIssue[]): void {
  const phone = config.form.fields.find((field) => field.key === "phone");
  if (phone?.enabled && phone.required) return;
  issues.push({
    id: "phone-not-required",
    level: "warning",
    path: "form.fields",
    message:
      "The phone number is not shown and required: the server refuses a participation without it (one entry per phone number).",
  });
}

// Errors first, then warnings, each in the order of the checks.
export function validateExperience(
  config: ExperienceConfig,
  campaign?: CampaignSnapshot | null,
): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const texts = playerTexts(config);
  checkContrast(config, issues);
  checkConsentAndLinks(config, issues);
  checkPhone(config, issues);
  checkTitles(config, issues);
  checkTexts(config, texts, issues);
  checkWheel(config, campaign ?? null, issues);
  if (campaign) {
    checkCampaignLinks(config, campaign, issues);
    checkQuiz(config, campaign, issues);
  }
  checkImages(config, issues);
  return [
    ...issues.filter((issue) => issue.level === "error"),
    ...issues.filter((issue) => issue.level === "warning"),
  ];
}

// True when the Studio must refuse to share the experience.
export function hasBlockingIssues(issues: readonly DesignIssue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}
