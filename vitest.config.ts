import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    pool: "forks",
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    server: {
      deps: {
        inline: ["@page-speed/router"]
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
    },
  },
});
