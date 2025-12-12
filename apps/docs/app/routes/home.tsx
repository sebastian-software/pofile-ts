import type { Route } from "./+types/home"
import { HomeLayout } from "fumadocs-ui/layouts/home"
import { Link } from "react-router"
import { baseOptions } from "@/lib/layout.shared"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "pofile-ts — Modern PO File Parser" },
    {
      name: "description",
      content: "A robust TypeScript library for reading and writing GNU gettext PO files"
    }
  ]
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold md:text-6xl">pofile-ts</h1>
          <p className="max-w-xl text-lg text-fd-muted-foreground">
            A modern, focused library for GNU gettext PO files. Hand-optimized for speed, runs
            everywhere — Node.js and browsers alike.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-500">
            TypeScript 5.x
          </span>
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-500">
            Browser Ready
          </span>
          <span className="rounded-full bg-fd-muted px-3 py-1 text-sm font-medium">
            📦 Zero Dependencies
          </span>
          <span className="rounded-full bg-fd-muted px-3 py-1 text-sm font-medium">
            ⚡ ESM + CJS
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/docs"
            className="rounded-lg bg-fd-primary px-6 py-3 font-semibold text-fd-primary-foreground transition hover:bg-fd-primary/90"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/sebastian-software/pofile-ts"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-fd-border bg-fd-background px-6 py-3 font-semibold transition hover:bg-fd-muted"
          >
            View on GitHub
          </a>
        </div>

        <div className="mt-4 rounded-lg border border-fd-border bg-fd-muted/50 px-6 py-3 font-mono text-sm">
          npm install pofile-ts
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="23× Faster"
            description="Hand-optimized parsing, blazing fast serialization"
          />
          <Feature
            title="Full PO Support"
            description="Headers, comments, flags, plurals, and context"
          />
          <Feature
            title="Universal"
            description="Works in Node.js and browsers without polyfills"
          />
          <Feature
            title="TypeScript First"
            description="Full type definitions for excellent IDE support"
          />
          <Feature title="i18n Helpers" description="Catalog conversion, message IDs, references" />
          <Feature
            title="Zero Dependencies"
            description="No runtime dependencies, minimal bundle size"
          />
        </div>
      </main>
    </HomeLayout>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-6 text-left transition hover:border-fd-primary/50">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-fd-muted-foreground">{description}</p>
    </div>
  )
}
