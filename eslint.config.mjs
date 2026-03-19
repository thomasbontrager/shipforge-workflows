import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const config = [
  { ignores: [".next/**", "coverage/**", "node_modules/**", "next-env.d.ts"] },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
  },
];

export default config;
