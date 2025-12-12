import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "pofile-ts"
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/sebastian-software/pofile-ts",
        external: true
      },
      {
        text: "npm",
        url: "https://www.npmjs.com/package/pofile-ts",
        external: true
      }
    ]
  }
}
