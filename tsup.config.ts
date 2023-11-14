import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    clean: true,
    // this setting inlines the types from dependencies we use, like `cookie`
    dts: { resolve: true },
    format: ["esm", "cjs"],
    treeshake: true,
    sourcemap: true,
  },
]);
