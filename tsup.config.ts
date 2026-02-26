import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const USE_CLIENT_BANNER = '"use client";\n';

// Files that need "use client" directive (client components and hooks)
const CLIENT_FILES = [
  "dist/index.js",
  "dist/index.cjs",
  "dist/core/index.js",
  "dist/core/index.cjs",
  "dist/hooks/index.js",
  "dist/hooks/index.cjs",
];

function prependUseClient() {
  for (const file of CLIENT_FILES) {
    const filePath = join(process.cwd(), file);
    try {
      const content = readFileSync(filePath, "utf-8");
      if (!content.startsWith('"use client"')) {
        writeFileSync(filePath, USE_CLIENT_BANNER + content);
      }
    } catch {
      // File might not exist if build failed
    }
  }
}

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "core/index": "src/core/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "types/index": "src/types/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "@opensite/hooks"],
  onSuccess: async () => {
    prependUseClient();
  },
});
