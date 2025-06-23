import js from "@eslint/js"
import tseslint from "typescript-eslint"
import prettierPlugin from "eslint-plugin-prettier"
import globals from "globals"

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "components/**",
      "apps/dashboard/components/**",
      "apps/streaming-test/components/**",
      "apps/example-app/components/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      // Migrated from .eslintignore
      ".next/**",
      ".vercel/**",
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "README.md",
    ],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        fetch: "readonly", // Node.js 18+ global
      },
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "no-async-promise-executor": "error",
      "prefer-const": "error",
    },
  },
]
