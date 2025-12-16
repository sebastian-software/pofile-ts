import type { Route } from "./+types/home"
import { HomeLayout } from "fumadocs-ui/layouts/home"
import { Link } from "react-router"
import { baseOptions } from "@/lib/layout.shared"
import {
  WrenchIcon,
  GlobeIcon as GlobeUseCaseIcon,
  CircleCheckIcon,
  ZapIcon,
  SpeedIcon,
  GlobeFeatureIcon as GlobeIcon,
  ShieldIcon,
  TypeScriptIcon,
  BoxIcon,
  FeatherIcon,
  CompileIcon,
  ModernIcon,
  PaletteIcon,
  ArrowIcon,
  GitHubIcon,
  CopyIcon
} from "@/components/icons"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "pofile-ts — Parse, Compile & Transform PO Files 20× Faster" },
    {
      name: "description",
      content:
        "Modern PO file toolkit for JavaScript. 20× faster parsing, ICU compiler with 4× faster runtime than Lingui/FormatJS. Zero dependencies, TypeScript-first, ESM-native."
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
              Parse, compile & transform PO files —{" "}
              <span className="font-semibold text-fd-foreground">20× faster</span>
            </p>
            <p className="max-w-xl text-sm text-fd-muted-foreground md:text-base">
              Modern i18n toolkit with ICU compiler, native CLDR plurals, and format conversion.
              <br className="hidden md:block" />
              Zero dependencies. TypeScript-first. Built for Node 20+, Bun, and modern browsers.
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
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a
              href="https://codecov.io/gh/sebastian-software/pofile-ts"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://codecov.io/gh/sebastian-software/pofile-ts/graph/badge.svg"
                alt="Coverage"
                className="h-5"
              />
            </a>
            <a
              href="https://www.npmjs.com/package/pofile-ts"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.shields.io/npm/dm/pofile-ts.svg"
                alt="npm downloads"
                className="h-5"
              />
            </a>
            <a
              href="https://bundlephobia.com/package/pofile-ts"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://img.shields.io/bundlephobia/minzip/pofile-ts"
                alt="Bundle Size"
                className="h-5"
              />
            </a>
            <img
              src="https://img.shields.io/badge/dependencies-0-brightgreen"
              alt="Zero Dependencies"
              className="h-5"
            />
            <img
              src="https://img.shields.io/badge/format-ESM%20%26%20CJS-blue"
              alt="ESM & CJS"
              className="h-5"
            />
            <img
              src="https://img.shields.io/badge/node-20%2B-brightgreen"
              alt="Node 20+"
              className="h-5"
            />
            <a href="https://bun.sh/" target="_blank" rel="noopener noreferrer">
              <img
                src="https://img.shields.io/badge/bun-compatible-f472b6"
                alt="Bun compatible"
                className="h-5"
              />
            </a>
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Why pofile-ts?</h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-lg text-fd-muted-foreground">
            Not just a parser — a complete i18n toolkit that's faster, smaller, and more modern than
            the alternatives
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<SpeedIcon />}
              title="20× Faster Parsing"
              description="Hand-optimized with first-char dispatch and fast-paths. No regex soup — just raw performance for build tools and CI."
              gradient="from-blue-500 to-cyan-500"
            />
            <FeatureCard
              icon={<CompileIcon />}
              title="ICU Compiler"
              description="Compile ICU messages to JavaScript functions. 4× faster runtime than Lingui and FormatJS — no AST interpretation."
              gradient="from-purple-500 to-fuchsia-500"
            />
            <FeatureCard
              icon={<GlobeIcon />}
              title="Native CLDR Plurals"
              description="Uses Intl.PluralRules for all 100+ locales. Zero CLDR data in bundle — the runtime provides it."
              gradient="from-green-500 to-emerald-500"
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="CSP-Safe"
              description="No eval(), no new Function(). Works in strict CSP environments, edge runtimes, and security-conscious apps."
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard
              icon={<ModernIcon />}
              title="Modern-First"
              description="Built for Node 20+, ESM-native, tree-shakeable. No legacy polyfills — clean, modern JavaScript."
              gradient="from-blue-500 to-indigo-500"
            />
            <FeatureCard
              icon={<FeatherIcon />}
              title="Zero Dependencies"
              description="~11KB full, ~5KB tree-shaken. No transitive deps, no supply chain bloat. Just pofile-ts."
              gradient="from-rose-500 to-pink-500"
            />
            <FeatureCard
              icon={<BoxIcon />}
              title="Extended Intl Formatters"
              description="Lists, relative times, display names, and durations. Native Intl APIs — zero bundle cost."
              gradient="from-teal-500 to-cyan-500"
            />
            <FeatureCard
              icon={<PaletteIcon />}
              title="50+ Format Styles"
              description="Built-in styles like compact, percent, bytes, iso. Register custom Intl options. Dynamic currency at runtime."
              gradient="from-amber-500 to-orange-500"
            />
          </div>
        </div>
      </section>

      {/* Performance */}
      <section className="border-t border-fd-border bg-fd-muted/20 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Benchmarks</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-fd-muted-foreground">
            Measured on Apple M1 Ultra, Node.js 22. Relative performance is consistent across
            hardware.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* PO Parsing */}
            <div className="rounded-xl border border-fd-border bg-fd-card p-5">
              <h3 className="text-base font-semibold">PO Parsing</h3>
              <p className="mb-4 text-xs text-fd-muted-foreground">10K entries</p>
              <div className="space-y-3">
                <BenchmarkBar label="pofile-ts" value={100} ops="209/s" fastest />
                <BenchmarkBar label="gettext-parser" value={13} ops="28/s" />
                <BenchmarkBar label="pofile" value={4} ops="8/s" />
              </div>
              <p className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400">
                20× faster
              </p>
            </div>

            {/* PO Serialization */}
            <div className="rounded-xl border border-fd-border bg-fd-card p-5">
              <h3 className="text-base font-semibold">PO Stringify</h3>
              <p className="mb-4 text-xs text-fd-muted-foreground">10K entries</p>
              <div className="space-y-3">
                <BenchmarkBar label="pofile-ts" value={100} ops="256/s" fastest />
                <BenchmarkBar label="pofile" value={39} ops="100/s" />
                <BenchmarkBar label="gettext-parser" value={21} ops="54/s" />
              </div>
              <p className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400">
                5× faster
              </p>
            </div>

            {/* ICU Parsing */}
            <div className="rounded-xl border border-fd-border bg-fd-card p-5">
              <h3 className="text-base font-semibold">ICU Parsing</h3>
              <p className="mb-4 text-xs text-fd-muted-foreground">Plurals, selects, tags</p>
              <div className="space-y-3">
                <BenchmarkBar label="pofile-ts" value={100} ops="170k/s" fastest />
                <BenchmarkBar label="@formatjs" value={22} ops="38k/s" />
              </div>
              <p className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400">
                5× faster
              </p>
            </div>

            {/* ICU Runtime */}
            <div className="rounded-xl border border-fd-border bg-fd-card p-5">
              <h3 className="text-base font-semibold">ICU Runtime</h3>
              <p className="mb-4 text-xs text-fd-muted-foreground">Compiled functions</p>
              <div className="space-y-3">
                <BenchmarkBar label="pofile-ts" value={100} ops="815k/s" fastest />
                <BenchmarkBar label="intl-messageformat" value={30} ops="247k/s" />
                <BenchmarkBar label="@lingui" value={25} ops="204k/s" />
              </div>
              <p className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400">
                4× faster
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-fd-muted-foreground">
            ICU Runtime compiles to native JavaScript with template literals — no AST walking at
            runtime.
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-t border-fd-border bg-fd-muted/20 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Built For</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-fd-muted-foreground">
            Whether you're building tools or integrating with frameworks
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <UseCase title="Vite/Webpack Plugins" icon={<WrenchIcon />}>
              Parse and compile PO files at build time for zero runtime cost
            </UseCase>
            <UseCase title="TMS Pipelines" icon={<GlobeUseCaseIcon />}>
              Crowdin, Lokalise, Phrase — sync and transform translations
            </UseCase>
            <UseCase title="CI/CD Validation" icon={<CircleCheckIcon />}>
              Validate plural forms, variables, and syntax in PRs
            </UseCase>
            <UseCase title="Custom Tooling" icon={<ZapIcon />}>
              Low-level APIs for message extraction and code generation
            </UseCase>
          </div>
        </div>
      </section>

      {/* Code examples */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Clean, Functional API</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-fd-muted-foreground">
            No classes, no side effects — just pure functions that do one thing well
          </p>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* PO Example */}
            <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-sm text-fd-muted-foreground">parse-po.ts</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
                <code>
                  <span className="text-purple-600 dark:text-purple-400">import</span>
                  {" { parsePo } "}
                  <span className="text-purple-600 dark:text-purple-400">from</span>{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">"pofile-ts"</span>
                  {"\n\n"}
                  <span className="text-fd-muted-foreground">{"// Parse PO files"}</span>
                  {"\n"}
                  <span className="text-purple-600 dark:text-purple-400">const</span>
                  {" po = "}
                  <span className="text-blue-600 dark:text-blue-400">parsePo</span>
                  {"(content)\n\n"}
                  <span className="text-fd-muted-foreground">{"// Full support:"}</span>
                  {"\n"}
                  <span className="text-fd-muted-foreground">{"// plurals, context,"}</span>
                  {"\n"}
                  <span className="text-fd-muted-foreground">{"// flags, comments"}</span>
                </code>
              </pre>
            </div>

            {/* ICU Compiler Example */}
            <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-sm text-fd-muted-foreground">compile-icu.ts</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
                <code>
                  <span className="text-purple-600 dark:text-purple-400">import</span>
                  {" { compileIcu } "}
                  <span className="text-purple-600 dark:text-purple-400">from</span>{" "}
                  <span className="text-emerald-600 dark:text-emerald-400">"pofile-ts"</span>
                  {"\n\n"}
                  <span className="text-fd-muted-foreground">{"// Compile ICU"}</span>
                  {"\n"}
                  <span className="text-purple-600 dark:text-purple-400">const</span>
                  {" msg = "}
                  <span className="text-blue-600 dark:text-blue-400">compileIcu</span>
                  {"(\n  "}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    '"{"{"}n, plural, ...{"}"}"'
                  </span>
                  {"\n)\n\n"}
                  {"msg({ n: 5 }) "}
                  <span className="text-fd-muted-foreground">{'// "5 items"'}</span>
                </code>
              </pre>
            </div>

            {/* Extended Formatters Example */}
            <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/50 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-sm text-fd-muted-foreground">intl-formats.ts</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
                <code>
                  <span className="text-fd-muted-foreground">{"// Extended Intl"}</span>
                  {"\n"}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    "{"{"}authors, list{"}"}"
                  </span>
                  {"\n"}
                  <span className="text-fd-muted-foreground">{"→ Alice, Bob, and Charlie"}</span>
                  {"\n\n"}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    "{"{"}days, ago, day{"}"}"
                  </span>
                  {"\n"}
                  <span className="text-fd-muted-foreground">{"→ vor 2 Tagen"}</span>
                  {"\n\n"}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    "{"{"}lang, name, language{"}"}"
                  </span>
                  {"\n"}
                  <span className="text-fd-muted-foreground">{"→ Englisch"}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-fd-border bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-fuchsia-500/5 px-6 py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Drop-in replacement for pofile</h2>
          <p className="text-fd-muted-foreground">
            Same API patterns as the popular{" "}
            <code className="rounded bg-fd-muted px-1.5 py-0.5 text-sm">pofile</code> package, but
            20× faster with modern TypeScript.
            <br />
            Check out the migration guide if you're coming from pofile or gettext-parser.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/docs/quick-start"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-600 px-8 py-4 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              Quick Start
              <ArrowIcon />
            </Link>
            <Link
              to="/docs/migration"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-fd-border bg-fd-background/50 px-8 py-4 font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-purple-500/50"
            >
              Migration Guide
            </Link>
          </div>
          <p className="mt-4 text-xs text-fd-muted-foreground">
            Maintained by{" "}
            <a
              href="https://sebastian-software.de"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fd-foreground"
            >
              Sebastian Software
            </a>{" "}
            • MIT Licensed
          </p>
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

function UseCase({
  title,
  icon,
  children
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-fd-border bg-fd-card p-4 transition-all duration-200 hover:border-purple-500/30 hover:shadow-md">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        {icon && <span className="text-purple-600 dark:text-purple-400">{icon}</span>}
        {title}
      </h3>
      <p className="text-sm text-fd-muted-foreground">{children}</p>
    </div>
  )
}

function BenchmarkBar({
  label,
  value,
  ops,
  fastest
}: {
  label: string
  value: number
  ops: string
  fastest?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className={fastest ? "font-medium" : "text-fd-muted-foreground"}>{label}</span>
        <span
          className={
            fastest
              ? "font-semibold text-purple-600 dark:text-purple-400"
              : "text-fd-muted-foreground"
          }
        >
          {ops}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-fd-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
            fastest
              ? "bg-gradient-to-r from-purple-500 to-fuchsia-500"
              : "bg-fd-muted-foreground/30"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}
