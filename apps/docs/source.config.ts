import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import { remarkAutoTypeTable, createGenerator } from "fumadocs-typescript"

const generator = createGenerator()

export const docs = defineDocs({
  dir: "content/docs"
})

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkAutoTypeTable, { generator }]]
  }
})
