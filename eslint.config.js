import eslintJs from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "labb",
      "dist",
      "src-tauri/target",
      "src-tauri/gen",
      "test-results",
      "llkit/template",
      "playwright-report",
    ],
  },
  eslintJs.configs.recommended,
  ...tseslint.configs.strict,
  {
    // A hook that is called only sometimes changes the order of hooks and crashes the screen.
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error" },
  },
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 30, skipBlankLines: true, skipComments: true }],
      "max-params": ["error", 4],
      "max-depth": ["error", 3],
      complexity: ["error", 8],
      "id-length": ["error", { min: 3, exceptions: ["id", "to", "x", "y", "i", "j", "t"] }],
      "no-console": "error",
      "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "xxx"] }],
      "no-else-return": "error",
      "no-nested-ternary": "error",
      eqeqeq: "error",
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/ban-ts-comment": "error",
    },
  },
  {
    files: ["**/*.mjs", "**/*.js"],
    languageOptions: { globals: { process: "readonly", fetch: "readonly" } },
  },
  {
    files: ["tests/**/*.ts", "e2e/**/*.ts"],
    rules: { "max-lines-per-function": "off" },
  },
  // llkit is what any app is built on, so it never reaches into one app's own code.
  {
    files: ["llkit/**/*.ts", "llkit/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/src/**", "../src/*"], message: "llkit vet inget om appen." }] },
      ],
    },
  },
);
