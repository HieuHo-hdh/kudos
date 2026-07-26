import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
    globals: false,
    setupFiles: ["test/setup.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
})
