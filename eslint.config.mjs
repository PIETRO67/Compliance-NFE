import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "out/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
