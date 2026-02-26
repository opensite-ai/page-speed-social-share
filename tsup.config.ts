import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "utils/index": "src/utils/index.ts",
    "types/index": "src/types/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom"],
});
