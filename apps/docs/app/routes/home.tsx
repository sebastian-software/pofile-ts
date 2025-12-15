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
      {/* Hero Section with gradient background */}
      <div className="relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-fuchsia-500/5" />
          <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] animate-pulse rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] animate-pulse rounded-full bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 blur-3xl [animation-delay:1s]" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-20 text-center md:py-28">
          {/* Logo with animation */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
          >
            <img
              src="/pofile-ts/logo.svg"
              alt="pofile-ts logo"
              className="h-28 w-28 drop-shadow-xl transition-transform duration-300 hover:scale-105 md:h-36 md:w-36"
            />
          </div>

          {/* Title and description */}
          <div
            className="flex max-w-2xl flex-col items-center gap-5 animate-fade-in-up"
            style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
          >
            <h1 className="bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
              pofile-ts
            </h1>
            <p className="text-xl leading-relaxed text-fd-muted-foreground md:text-2xl">
              A modern, focused library for GNU gettext PO files.
              <br className="hidden sm:block" />
              <span className="text-fd-foreground/80">Hand-optimized for speed</span>, runs
              everywhere.
            </p>
          </div>

          {/* Feature badges */}
          <div
            className="flex flex-wrap justify-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
          >
            <Badge color="blue">TypeScript 5.x</Badge>
            <Badge color="green">Browser Ready</Badge>
            <Badge color="amber">Zero Dependencies</Badge>
            <Badge color="purple">ESM + CJS</Badge>
          </div>

          {/* CTA buttons */}
          <div
            className="flex flex-wrap justify-center gap-4 animate-fade-in-up"
            style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
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
              View on GitHub
            </a>
          </div>

          {/* Install command */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
          >
            <div className="group relative rounded-xl border border-fd-border bg-fd-card/80 px-6 py-4 font-mono text-sm backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30">
              <span className="text-fd-muted-foreground">$</span>{" "}
              <span className="text-purple-600 dark:text-purple-400">npm</span> install pofile-ts
              <button
                onClick={() => navigator.clipboard.writeText("npm install pofile-ts")}
                className="ml-4 rounded-md p-1.5 text-fd-muted-foreground opacity-0 transition-all hover:bg-fd-muted hover:text-fd-foreground group-hover:opacity-100"
                title="Copy to clipboard"
              >
                <CopyIcon />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Features Section */}
      <section className="border-t border-fd-border bg-gradient-to-b from-fd-background to-fd-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2
            className="mb-4 text-center text-3xl font-bold animate-fade-in-up md:text-4xl"
            style={{ animationDelay: "500ms", animationFillMode: "backwards" }}
          >
            Why pofile-ts?
          </h2>
          <p
            className="mx-auto mb-14 max-w-2xl text-center text-lg text-fd-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "550ms", animationFillMode: "backwards" }}
          >
            Built from the ground up for modern JavaScript/TypeScript projects
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<SpeedIcon />}
              title="23× Faster"
              description="Hand-optimized parsing and blazing fast serialization. No regex-heavy parsing."
              delay={600}
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<CheckIcon />}
              title="Full PO Support"
              description="Headers, comments, flags, plurals, context, and references. The complete spec."
              delay={650}
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<GlobeIcon />}
              title="Universal"
              description="Works seamlessly in Node.js and browsers without polyfills or bundler config."
              delay={700}
              gradient="from-purple-500 to-fuchsia-500"
            />
            <FeatureCard
              icon={<TypeScriptIcon />}
              title="TypeScript First"
              description="Written in TypeScript with full type definitions for excellent IDE support."
              delay={750}
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={<WrenchIcon />}
              title="i18n Helpers"
              description="Catalog conversion, message ID generation, reference handling built-in."
              delay={800}
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard
              icon={<BoxIcon />}
              title="Zero Dependencies"
              description="No runtime dependencies means minimal bundle size and no supply chain risk."
              delay={850}
              gradient="from-rose-500 to-pink-500"
            />
          </div>
        </div>
      </section>

      {/* Code example section */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2
            className="mb-4 text-center text-3xl font-bold animate-fade-in-up md:text-4xl"
            style={{ animationDelay: "900ms", animationFillMode: "backwards" }}
          >
            Simple API
          </h2>
          <p
            className="mx-auto mb-10 max-w-2xl text-center text-lg text-fd-muted-foreground animate-fade-in-up"
            style={{ animationDelay: "950ms", animationFillMode: "backwards" }}
          >
            Parse, modify, and serialize PO files in just a few lines
          </p>

          <div
            className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl animate-fade-in-up"
            style={{ animationDelay: "1000ms", animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-sm text-fd-muted-foreground">example.ts</span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
              <code>
                <span className="text-purple-600 dark:text-purple-400">import</span>
                {" { PO } "}
                <span className="text-purple-600 dark:text-purple-400">from</span>{" "}
                <span className="text-emerald-600 dark:text-emerald-400">"pofile-ts"</span>
                {"\n\n"}
                <span className="text-fd-muted-foreground">{"// Parse a PO file"}</span>
                {"\n"}
                <span className="text-purple-600 dark:text-purple-400">const</span>
                {" po = PO."}
                <span className="text-blue-600 dark:text-blue-400">parse</span>
                {"(poFileContent)\n\n"}
                <span className="text-fd-muted-foreground">{"// Access translations"}</span>
                {"\n"}
                <span className="text-purple-600 dark:text-purple-400">for</span>
                {" ("}
                <span className="text-purple-600 dark:text-purple-400">const</span>
                {" item "}
                <span className="text-purple-600 dark:text-purple-400">of</span>
                {" po.items) {\n"}
                {"  console."}
                <span className="text-blue-600 dark:text-blue-400">log</span>
                {"(item.msgid, "}
                <span className="text-emerald-600 dark:text-emerald-400">"→"</span>
                {", item.msgstr)\n}\n\n"}
                <span className="text-fd-muted-foreground">{"// Serialize back to string"}</span>
                {"\n"}
                <span className="text-purple-600 dark:text-purple-400">const</span>
                {" output = po."}
                <span className="text-blue-600 dark:text-blue-400">toString</span>
                {"()"}
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
            Check out the documentation to learn more about pofile-ts
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

// Badge component
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
  }

  return (
    <span
      className={`rounded-full border px-4 py-1.5 text-sm font-medium ${colorClasses[color] || colorClasses.blue}`}
    >
      {children}
    </span>
  )
}

// Feature Card component
function FeatureCard({
  icon,
  title,
  description,
  delay,
  gradient
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
  gradient: string
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-fd-border bg-fd-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-xl animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div
        className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-3 text-white shadow-lg`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-fd-muted-foreground">{description}</p>
      {/* Hover glow effect */}
      <div className="pointer-events-none absolute -bottom-1/2 -right-1/2 h-40 w-40 rounded-full bg-purple-500/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
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

function CheckIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
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

function TypeScriptIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 3h18v18H3V3zm10.71 14.86c.5.98 1.51 1.73 3.09 1.73 1.6 0 2.8-.83 2.8-2.36 0-1.41-.81-2.04-2.25-2.66l-.42-.18c-.73-.31-1.04-.52-1.04-1.02 0-.41.31-.73.81-.73.48 0 .8.21 1.09.73l1.31-.87c-.55-.96-1.33-1.33-2.4-1.33-1.51 0-2.48.96-2.48 2.23 0 1.38.81 2.03 2.03 2.55l.42.18c.78.34 1.24.55 1.24 1.13 0 .48-.45.83-1.15.83-.83 0-1.31-.43-1.67-1.03l-1.38.8zM14 11.92V10H8v1.92h2.06v6.95h2V11.92H14z" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  )
}
