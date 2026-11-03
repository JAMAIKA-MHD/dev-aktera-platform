import type { IconName } from "../../../domain/types";

// The two pictures of Spot the Difference, built from the brand's icons: picture A is a grid of
// icons, picture B is picture A with N changes. Pure and deterministic given its random source,
// so it can be tested, and carries no information about prizes.

export type Tone = 0 | 1 | 2; // an index into the theme's three accent tones
export type ChangeKind = "icon" | "tone" | "missing";

export interface SceneCell {
  icon: IconName;
  tone: Tone;
  tilt: number; // degrees, a little life for the picture; the same in both pictures
}

export interface SceneDifference {
  cell: number;
  kind: ChangeKind;
}

export interface Scene {
  cols: number;
  rows: number;
  a: SceneCell[];
  b: (SceneCell | null)[]; // null = the cell is empty in picture B
  differences: SceneDifference[];
}

export type RandomSource = () => number;

const pick = <T>(items: readonly T[], random: RandomSource): T =>
  items[Math.floor(random() * items.length)];

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildScene(
  icons: readonly IconName[],
  differences: number,
  cols: number,
  rows: number,
  random: RandomSource = Math.random,
): Scene {
  const pool: readonly IconName[] = icons.length > 0 ? icons : ["star"];
  const count = cols * rows;
  const a: SceneCell[] = Array.from({ length: count }, () => ({
    icon: pick(pool, random),
    tone: Math.floor(random() * 3) as Tone,
    tilt: Math.round((random() - 0.5) * 24),
  }));
  const b: (SceneCell | null)[] = a.map((cell) => ({ ...cell }));

  const changed: SceneDifference[] = [];
  const cells = shuffled(
    Array.from({ length: count }, (_, i) => i),
    random,
  ).slice(0, Math.min(differences, count));
  // Kinds rotate, so a picture with three differences shows three different kinds.
  const kinds = shuffled<ChangeKind>(["icon", "tone", "missing"], random);
  cells.forEach((cell, index) => {
    const kind = kinds[index % kinds.length];
    const original = a[cell];
    if (kind === "missing") {
      b[cell] = null;
    } else if (kind === "tone") {
      b[cell] = { ...original, tone: ((original.tone + 1) % 3) as Tone };
    } else {
      const others = pool.filter((icon) => icon !== original.icon);
      // A palette of one icon cannot swap it: the tone changes instead.
      b[cell] =
        others.length > 0
          ? { ...original, icon: pick(others, random) }
          : { ...original, tone: ((original.tone + 1) % 3) as Tone };
    }
    changed.push({ cell, kind });
  });
  return { cols, rows, a, b, differences: changed };
}
