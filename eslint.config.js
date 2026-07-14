import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Tell ESLint to ignore your compiled production files
  {
    ignores: ["dist/", "node_modules/", "server.js"],
  },

  // Use recommended JS rules
  js.configs.recommended,

  // Use recommended TypeScript rules
  ...tseslint.configs.recommended,

  // Custom project rule overrides
  {
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": "off", // Stops it from yelling at 'any' types while debugging
    },
  },
];
