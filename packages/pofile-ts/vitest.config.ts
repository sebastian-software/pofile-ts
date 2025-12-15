import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/fixtures/**",
        "src/index.ts",
        "src/types.ts",
        "src/icu/index.ts",
        "src/icu/types.ts"
      ]
    }
  }
})
