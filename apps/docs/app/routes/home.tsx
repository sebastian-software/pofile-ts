import type { Route } from "./+types/home"
import { HomeLayout } from "fumadocs-ui/layouts/home"
import { Link } from "react-router"
import { baseOptions } from "@/lib/layout.shared"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "pofile-ts — Fast PO File Toolkit for JavaScript" },
    {
      name: "description",
      content:
        "The fast, modern PO file toolkit for JavaScript. Parse, serialize, and transform GNU gettext files with CLDR plural rules and ICU conversion."
    }
  ]
}

export default function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-fuchsia-500/5" />
          <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] animate-pulse rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 blur-3xl [animation-delay:1s]" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-20 text-center md:py-24">
          {/* Logo */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
          >
            <img
              src="/pofile-ts/logo.svg"
              alt="pofile-ts logo"
              className="h-28 w-28 drop-shadow-xl transition-transform duration-300 hover:scale-105 md:h-32 md:w-32"
            />
          </div>

          {/* Title and tagline */}
          <div
            className="flex max-w-3xl flex-col items-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
          >
            <h1 className="bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
              pofile-ts
            </h1>
            <p className="text-xl leading-relaxed text-fd-muted-foreground md:text-2xl">
              The fast, modern PO file toolkit for JavaScript
            </p>
          </div>

          {/* CTA buttons */}
          <div
            className="flex flex-wrap justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
          >
            <Link
              to="/docs"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 px-8 py-4 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
            >
              <span className="relative z-10">Get Started</span>
              <ArrowIcon />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
            <a
              href="https://github.com/sebastian-software/pofile-ts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-fd-border bg-fd-background/50 px-8 py-4 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-purple-500/50 hover:bg-fd-card"
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>
        </main>
      </div>

      {/* Install Section */}
      <section className="border-t border-fd-border bg-fd-muted/30 px-6 py-12">
        <div className="mx-auto max-w-xl">
          <div className="group relative overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg">
            <div className="flex items-center justify-between border-b border-fd-border bg-fd-muted/50 px-4 py-2">
              <span className="text-sm font-medium text-fd-muted-foreground">Installation</span>
              <button
                onClick={() => navigator.clipboard.writeText("npm install pofile-ts")}
                className="rounded-md p-1.5 text-fd-muted-foreground transition-all hover:bg-fd-muted hover:text-fd-foreground"
                title="Copy to clipboard"
              >
                <CopyIcon />
              </button>
            </div>
            <div className="px-5 py-4 font-mono text-sm">
              <span className="text-fd-muted-foreground select-none">$ </span>
              <span className="text-purple-600 dark:text-purple-400">npm</span> install pofile-ts
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-fd-muted-foreground">
            <span>Zero dependencies</span>
            <span className="text-fd-border">•</span>
            <span>~11KB gzipped</span>
            <span className="text-fd-border">•</span>
            <span>Tree-shakeable</span>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Why pofile-ts?</h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-lg text-fd-muted-foreground">
            A complete solution for working with GNU gettext PO files in modern JavaScript and
            TypeScript projects
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<SpeedIcon />}
              title="8× Faster Parsing"
              description="Hand-optimized for performance. No regex soup, no unnecessary allocations — just fast parsing and serialization."
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<GlobeIcon />}
              title="Complete i18n Toolkit"
              description="Not just a parser: includes CLDR 48 plural rules, ICU MessageFormat conversion, and workflow helpers."
              gradient="from-purple-500 to-fuchsia-500"
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="Battle-tested"
              description="Handles edge cases, malformed files, and complex escape sequences that break other parsers."
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<BoxIcon />}
              title="Runs Everywhere"
              description="Works in Node.js, browsers, edge runtimes, and build tools like Vite or webpack. CSP-safe."
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard
              icon={<TypeScriptIcon />}
              title="TypeScript First"
              description="Written in TypeScript with full type definitions for excellent IDE support and type safety."
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={<FeatherIcon />}
              title="Lightweight"
              description="Zero dependencies. Full library is ~11KB gzipped, tree-shakes down to ~5KB for basic usage."
              gradient="from-rose-500 to-pink-500"
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-fd-border bg-fd-muted/20 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Use Cases</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-fd-muted-foreground">
            From build tools to translation management
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <UseCase title="Translation pipelines">
              Read PO files from translators, merge with source strings, write back
            </UseCase>
            <UseCase title="Build tool plugins">
              Parse PO files in Vite, webpack, or Rollup plugins
            </UseCase>
            <UseCase title="Message extraction">
              Generate PO files from source code for translation
            </UseCase>
            <UseCase title="Format conversion">
              Convert legacy Gettext projects to modern ICU MessageFormat
            </UseCase>
            <UseCase title="Translation management">
              Build custom TMS integrations or translation workflows
            </UseCase>
            <UseCase title="Plural validation">
              Verify translations have correct plural forms for target locales
            </UseCase>
          </div>
        </div>
      </section>

      {/* Code example */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Simple API</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-fd-muted-foreground">
            Parse, modify, and serialize PO files in just a few lines
          </p>

          <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-sm text-fd-muted-foreground">example.ts</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
              <code>
                <span className="text-purple-600 dark:text-purple-400">import</span>
                {" { parsePo, stringifyPo } "}
                <span className="text-purple-600 dark:text-purple-400">from</span>{" "}
                <span className="text-emerald-600 dark:text-emerald-400">"pofile-ts"</span>
                {"\n\n"}
                <span className="text-purple-600 dark:text-purple-400">const</span>
                {" po = "}
                <span className="text-blue-600 dark:text-blue-400">parsePo</span>
                {"(`\n"}
                <span className="text-emerald-600 dark:text-emerald-400">{'msgid "Hello"'}</span>
                {"\n"}
                <span className="text-emerald-600 dark:text-emerald-400">{'msgstr "Hallo"'}</span>
                {"\n`)\n\n"}
                {"console."}
                <span className="text-blue-600 dark:text-blue-400">log</span>
                {"(po.items[0].msgid)   "}
                <span className="text-fd-muted-foreground">{'// "Hello"'}</span>
                {"\n"}
                {"console."}
                <span className="text-blue-600 dark:text-blue-400">log</span>
                {"(po.items[0].msgstr)  "}
                <span className="text-fd-muted-foreground">{'// ["Hallo"]'}</span>
                {"\n\n"}
                {"console."}
                <span className="text-blue-600 dark:text-blue-400">log</span>
                {"("}
                <span className="text-blue-600 dark:text-blue-400">stringifyPo</span>
                {"(po))"}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-fd-border bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-fuchsia-500/5 px-6 py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Ready to get started?</h2>
          <p className="text-fd-muted-foreground">
            Check out the documentation for the full API reference, i18n helpers, and migration
            guide
          </p>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 px-8 py-4 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            Read the Docs
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </HomeLayout>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  gradient
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-fd-border bg-fd-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-xl">
      <div
        className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-3 text-white shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-fd-muted-foreground">{description}</p>
      <div className="pointer-events-none absolute -bottom-1/2 -right-1/2 h-40 w-40 rounded-full bg-purple-500/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  )
}

function UseCase({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-4">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-fd-muted-foreground">{children}</p>
    </div>
  )
}

// Icons
function ArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
      />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  )
}

function SpeedIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  )
}

function TypeScriptIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v18H3V3zm10.71 14.86c.5.98 1.51 1.73 3.09 1.73 1.6 0 2.8-.83 2.8-2.36 0-1.41-.81-2.04-2.25-2.66l-.42-.18c-.73-.31-1.04-.52-1.04-1.02 0-.41.31-.73.81-.73.48 0 .8.21 1.09.73l1.31-.87c-.55-.96-1.33-1.33-2.4-1.33-1.51 0-2.48.96-2.48 2.23 0 1.38.81 2.03 2.03 2.55l.42.18c.78.34 1.24.55 1.24 1.13 0 .48-.45.83-1.15.83-.83 0-1.31-.43-1.67-1.03l-1.38.8zM14 11.92V10H8v1.92h2.06v6.95h2V11.92H14z" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  )
}

function FeatherIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8L2 22M17.5 15H9" />
    </svg>
  )
}
