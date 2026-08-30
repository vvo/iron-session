import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "neutral",
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // `cookie` and `iron-webcrypto` stay external, they are real runtime deps.
  deps: { neverBundle: ["cookie", "iron-webcrypto"] },
});
