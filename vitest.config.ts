import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Reuse the app's Vite config (React plugin, "@" alias) so tests resolve modules exactly like the app.
export default defineConfig((env) =>
  mergeConfig(typeof viteConfig === "function" ? viteConfig(env) : viteConfig, {
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["src/features/player-experience/{domain,services}/**"],
        // Type-level proofs compiled by tsconfig.strict.json: nothing to run.
        exclude: ["**/*.strict-check.ts"],
      },
    },
  }),
);
