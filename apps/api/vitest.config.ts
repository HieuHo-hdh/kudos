import { readFileSync } from "node:fs"
import { join } from "node:path"

import { defineConfig } from "vitest/config"

// Load .env.test for testing
try {
  const envTestPath = join(process.cwd(), "../../.env.test")
  const envContent = readFileSync(envTestPath, "utf-8")
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=")
      if (key) {
        process.env[key] = valueParts.join("=")
      }
    }
  })
} catch (error) {
  console.warn("Could not load .env.test file", error)
}

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: false,
    setupFiles: ["test/setup.ts"],
  },
})
