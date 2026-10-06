// Type-level proof, compiled by tsconfig.strict.json only (excluded from tsconfig.json):
// without strictNullChecks, zod infers nullable keys as optional and the check below would fail.
import type { z } from "zod";
import type { experienceConfigSchema } from "./schema";
import type { ExperienceConfig } from "./types";

type SchemaOutput = z.infer<typeof experienceConfigSchema>;
type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

export const schemaMatchesExperienceConfig: MutuallyAssignable<
  SchemaOutput,
  ExperienceConfig
> = true;
