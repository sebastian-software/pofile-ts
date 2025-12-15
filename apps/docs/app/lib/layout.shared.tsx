import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/pofile-ts/logo.svg" alt="pofile-ts" className="h-7 w-7" />
      <span className="font-semibold tracking-tight">pofile-ts</span>
    </div>
  )
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo />
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
