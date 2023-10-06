import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    clean: true,
    dts: { resolve: true },
    format: ["esm"],
    treeshake: true,
  },
  { entry: ["src/index.node.ts"], format: ["esm", "cjs"], treeshake: true },
]);
