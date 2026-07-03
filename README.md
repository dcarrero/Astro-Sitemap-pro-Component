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
- **IndexNow** (`./indexnow`) — ping Bing/Yandex on deploy with only the URLs that changed.
- **Validation** (`./validate`) — lint a urlset for duplicate/non-canonical URLs and dishonest
  `lastmod`; the Astro integration also flags `noindex`/canonical drift in your built pages.

## Install

Until it's on npm, install straight from GitHub (works in CI — `dist/` is committed), add it as a
local dependency, or copy `src/` into your project.

```jsonc
// package.json — pin to a tag
"dependencies": { "astro-sitemap-pro-component": "github:dcarrero/Astro-Sitemap-pro-Component#v0.3.0" }
// or, for local development:
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

## Multilingual — split by language (`./i18n`)

Model each page as a **cluster** (its versions across languages) and project one sub-sitemap per
language. Every URL is listed with its own `<loc>` and the **full reciprocal hreflang** set — the
setup Google recommends.

```ts
import { urlsForLang } from "astro-sitemap-pro-component/i18n";
import { renderUrlset } from "astro-sitemap-pro-component";

const clusters = posts.map((p) => [
  { lang: "es", loc: `${SITE}/noticias/${p.es}`, changefreq: "weekly", priority: 0.6 },
  { lang: "en", loc: `${SITE}/en/news/${p.en}`, changefreq: "weekly", priority: 0.6 },
]);

// one file per language:
export const newsEs = () => urlsForLang(clusters, "es"); // → news-sitemap.xml
export const newsEn = () => urlsForLang(clusters, "en"); // → news-en-sitemap.xml
```

`urlsForLang(clusters, lang, { xDefaultLang? })` returns `SitemapUrl[]` ready for `renderUrlset`.
`x-default` defaults to the first language in each cluster (override with `xDefaultLang`). Prefer a
single bilingual entry instead? Just build `SitemapUrl` with `alternates` directly (see Core API).

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

Getters can be **async** (e.g. Astro's `getCollection()`): `urlsetHandler(async () => ...)`.

### Coverage verification (Astro, recommended)

Endpoint-based sitemaps can drift: someone adds a page type and forgets the sitemap. The
`sitemapCoverage` integration fails the build when that happens — after `astro build` it compares
every generated HTML page against the union of `<loc>` entries reachable from the sitemap index,
**and** runs SEO health checks on what's listed:

```js
// astro.config.mjs
import { sitemapCoverage } from "astro-sitemap-pro-component/astro";

export default defineConfig({
  integrations: [
    sitemapCoverage({
      // pathnames normalized without slashes; root = "". 404/500 are always ignored.
      ignore: (p) => p === "offline",
      strict: true,        // default — fail the build on ERROR-level issues
      checkNoindex: true,  // default — a listed page marked <meta robots noindex> is an error
      checkCanonical: true,// default — a listed page whose canonical points elsewhere is a warning
      lint: true,          // default — duplicate/non-absolute/tracking-param <loc>, uniform lastmod
    }),
  ],
});
```

What it reports, in one build-time summary (errors fail the build under `strict`; warnings only log):

- **MISSING** — a page was built but isn't in any sitemap.  **STALE** — a `<loc>` has no built page.
- **NOINDEX** — a listed page renders `<meta name="robots" content="noindex">` (shouldn't be listed).
- **CANONICAL** — a listed page's `<link rel="canonical">` points to a different URL.
- **Lint** — duplicate `<loc>` (within or across sub-sitemaps), non-absolute or tracking-param URLs,
  and a uniform `lastmod` across many URLs (the "`new Date()` on every build" antipattern).

`./astro` is Node-only (reads the build output); the rest of the package stays edge-safe.

### One file per type with all languages (`urlsForAllLangs`)

Prefer Yoast-style "split by **type**, not by language"? Expand clusters into a single urlset
where every language version carries the full reciprocal hreflang set:

```ts
import { urlsForAllLangs } from "astro-sitemap-pro-component/i18n";
export const GET = urlsetHandler(() => urlsForAllLangs(clusters, { xDefaultLang: "en" }));
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

## IndexNow — ping Bing/Yandex on deploy (`./indexnow`)

A sitemap is passive: engines re-crawl it on their own schedule. **IndexNow** is the push side —
one POST tells Bing and Yandex the instant a URL changes. Since this package already knows your
URLs and their `lastmod`, it can submit **only what changed** (drip, not bulk — bulk re-sends read
as spam). Edge-safe (web `fetch`/`crypto`), and the submit **never throws**, so a failed ping can't
break a deploy.

**1. Generate a key once** (it's public by design) and serve it at `/<key>.txt`:

```ts
import { generateKey } from "astro-sitemap-pro-component/indexnow";
console.log(generateKey()); // 32 hex chars → save it, e.g. INDEXNOW_KEY

// src/pages/[key].txt.ts  (or a static file) — served at /<key>.txt
import { keyFileHandler } from "astro-sitemap-pro-component/indexnow";
export const GET = keyFileHandler("788e9a6a…"); // the same key
```

**2. After each deploy, submit the fresh URLs** — gate real sends to CI so local/preview builds
don't ping:

```ts
import { submitFreshByLastmod, isCI } from "astro-sitemap-pro-component/indexnow";

const res = await submitFreshByLastmod(myUrls, {
  host: "tusitio.com",
  key: process.env.INDEXNOW_KEY!,
  since: "2026-07-01",          // a recent lastmod window = "what changed"
  dryRun: !isCI(),             // only really submit from CI/CD
});
console.log(res); // { ok, count, status?, skipped?, error? } — inspect, never throws
```

`submitUrls(urls, opts)` sends an explicit list; `freshUrls(urls, { since })` just returns the
windowed `<loc>`s if you want to submit them yourself.

## Validation (`./validate`)

`validateUrls(urls)` lints a urlset and returns issues — duplicate `<loc>`, non-absolute or
tracking-param URLs, and a uniform `lastmod` across many URLs. Pure (no I/O), so run it wherever:

```ts
import { validateUrls } from "astro-sitemap-pro-component/validate";
for (const i of validateUrls(myUrls)) console[i.level === "error" ? "error" : "warn"](i.message);
```

The Astro `sitemapCoverage` integration runs this for you at build time (see above).

## Theming / i18n the stylesheet

`buildStylesheet({ lang: "es", brand: "EspecialMundial", accent: "#ff2e74", ink: "#13201a" })`.
Override any label with `strings`. Add a language by extending `XSL_STRINGS` (from
`astro-sitemap-pro-component/stylesheet`) or passing `strings`.

## Roadmap (noted for later)

Not built yet — candidates from the SEO/GEO checklist:

- **Auto-chunk at the sitemaps.org limits** — split a `<urlset>` past 50,000 URLs / 50 MB into
  `-1`, `-2`… and emit the extra index entries, logging the split (no silent truncation).
- **Video sitemaps** (`<video:video>`) and richer image entries (title/caption).
- **`robots.txt` helper** that emits the `Sitemap:` line pointing at the index.
- **hreflang reciprocity / `x-default` validation** for clusters.

## License

MIT © David Carrero Fernández-Baillo
