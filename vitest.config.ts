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
        include: [
          "src/features/player-experience/{domain,services,theme,runtime/layout,runtime/host,runtime/frame,runtime/legal,runtime/sections,runtime/feedback,runtime/hooks,runtime/screens}/**",
          // The root of the runtime: PlayerExperience and useExperienceFlow.
          "src/features/player-experience/runtime/*.{ts,tsx}",
        ],
        // Type-level proofs compiled by tsconfig.strict.json, and stylesheets: nothing to run.
        exclude: ["**/*.strict-check.ts", "**/*.css"],
      },
    },
  }),
);
