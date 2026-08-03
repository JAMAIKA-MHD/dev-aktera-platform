import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  // 1. Ignore build artifacts completely
  {
    ignores: ["dist", "build", "node_modules", ".next"],
  },

  // 2. Base setups
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Application rules tuned for MVP prototyping
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // Pull in baseline structures
      ...reactPlugin.configs.flat.recommended.rules,

      // 🛑 STFU Rules — Turning off the annoying micro-management
      "react/react-in-jsx-scope": "off", // Not needed in modern React
      "react/jsx-uses-react": "off", // Not needed in modern React
      "@typescript-eslint/no-explicit-any": "off", // Let me use 'any' when prototyping!
      "react/no-unescaped-entities": "off", // Let me type text/quotes naturally
      "prefer-const": "off", // Don't complain if I used 'let' instead of 'const'

      // ⚠️ Soft Warnings — Highlight but do NOT block builds
      "no-unused-vars": "off", // Handled by TS rule below
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ], // Unused variables just show as yellow squiggly lines now

      // ✅ Crucial MVP Checks — Keep these to catch real logical crashes
      "react/jsx-key": "error", // Warns if loops miss a key (breaks UI rendering)
      "no-undef": "error", // Catches real typos in variable names
    },
  },
];
