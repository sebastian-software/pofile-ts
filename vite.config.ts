import { defineConfig } from "vite"
import { resolve } from "node:path"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`
    },
    rollupOptions: {
      external: ["node:fs/promises"],
      output: {
        exports: "named"
      }
    },
    target: "ES2022",
    minify: false,
    sourcemap: true
  },
  plugins: [
    dts({
      rollupTypes: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"]
    })
  ]
})
