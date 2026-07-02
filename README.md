# astro-sitemap-pro-component

Repository: **https://github.com/dcarrero/Astro-Sitemap-pro-Component** · MIT

**Yoast/RankMath-style XML sitemaps** for Astro, Next.js, or any build. Instead of one giant
`sitemap.xml`, you get a **sitemap index** that splits into per-type **sub-sitemaps**
(`page-sitemap.xml`, `news-sitemap.xml`, …) — friendlier for Google Search Console (coverage by
type) and scalable past 50k URLs. Each URL carries **hreflang** alternates and `lastmod`, optional
**image** entries, and a **localized XSL stylesheet** so the sitemaps render as a clean branded
table in the browser.

Framework-agnostic core (pure strings, zero dependencies) with thin adapters. Built for
[especialmundial.com](https://especialmundial.com) and [Cloud Privado](https://cloudprivado.com);
extracted to be reusable — a sibling of
[astro-social-ai-component](https://github.com/dcarrero/Astro-Social-AI-Component).

## What it gives you

- **Sitemap index** → sub-sitemaps by content type. One line to add a type.
- **hreflang** (`es`/`en`/`x-default`/…) per URL — proper multilingual signals.
- **`lastmod`, `changefreq`, `priority`** per URL; **`<image:image>`** entries optional.
- **Localized XSL stylesheet** (en, es, fr, de, pt, it — extensible), themable (brand + accent).
- **One handler shape** that works as an Astro endpoint *and* a Next route handler (web `Response`).

## Install

Until it's on npm, add it as a local/git dependency, or copy `src/` into your project.

```jsonc
// package.json
"dependencies": { "astro-sitemap-pro-component": "file:../astro-sitemap-pro-component" }
```

## Core API

```ts
import { renderIndex, renderUrlset, xmlResponse, buildStylesheet } from "astro-sitemap-pro-component";

renderUrlset(urls, { stylesheetHref?: "/sitemap.xsl" | null })  // → <urlset> string
renderIndex(subs, { stylesheetHref? })                          // → <sitemapindex> string
buildStylesheet({ lang, brand, accent, ink, strings })          // → XSL string
```

`SitemapUrl = { loc, lastmod?, changefreq?, priority?, alternates?: {hreflang, href}[], images?: string[] }`
`SubSitemap = { loc, lastmod? }`

You build the URL lists (that's your site's data); the package renders the XML and the stylesheet.
i18n is data-driven: put your language alternates in `alternates`, and pick the stylesheet UI
language with `buildStylesheet({ lang })`.

## Usage — Astro

Create endpoints under `src/pages/` (static output writes real files):

```ts
// src/pages/sitemap.xml.ts
import { sitemapIndexHandler } from "astro-sitemap-pro-component/handlers";
export const GET = sitemapIndexHandler(() => [
  { loc: "https://site.com/page-sitemap.xml" },
  { loc: "https://site.com/news-sitemap.xml" },
]);
```

```ts
// src/pages/news-sitemap.xml.ts
import { urlsetHandler } from "astro-sitemap-pro-component/handlers";
export const GET = urlsetHandler(() => myNewsUrls());
```

```ts
// src/pages/sitemap.xsl.ts   (served at /sitemap.xsl)
import { stylesheetHandler } from "astro-sitemap-pro-component/handlers";
export const GET = stylesheetHandler({ lang: "es", brand: "My Site", accent: "#ff2e74" });
```

## Usage — Next.js (App Router)

Route handlers with the same factories (works with `output: "export"`; add the package to
`transpilePackages`):

```ts
// src/app/sitemap.xml/route.ts
import { sitemapIndexHandler } from "astro-sitemap-pro-component/handlers";
export const dynamic = "force-static";
export const GET = sitemapIndexHandler(() => mySubs());
```

```ts
// src/app/news-sitemap.xml/route.ts
import { urlsetHandler } from "astro-sitemap-pro-component/handlers";
export const dynamic = "force-static";
export const GET = urlsetHandler(() => myNewsUrls());
```

```ts
// next.config.ts
transpilePackages: ["astro-sitemap-pro-component"]
```

Point `robots.txt`'s `Sitemap:` at the index (`/sitemap.xml`) and submit that one to Search
Console — Google discovers the sub-sitemaps automatically.

## Theming / i18n the stylesheet

`buildStylesheet({ lang: "es", brand: "EspecialMundial", accent: "#ff2e74", ink: "#13201a" })`.
Override any label with `strings`. Add a language by extending `XSL_STRINGS` (from
`astro-sitemap-pro-component/stylesheet`) or passing `strings`.

## License

MIT © David Carrero Fernández-Baillo
