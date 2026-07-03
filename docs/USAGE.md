# Usage guide

The package renders the XML; **you** supply the URL lists (your site's data). Keep one module that
builds the lists per content type, then wire tiny endpoints/handlers.

## 1. Build your URL lists

> ⚠️ **Honest `lastmod`.** Don't stamp `new Date()` on every URL each build — engines distrust a
> sitemap where everything changed "today" and eventually ignore your `lastmod`. Use each page's
> real change date; a `Date` from the CMS/frontmatter, or a fixed date for static reference pages.
> (`validateUrls`/`sitemapCoverage` will warn if all URLs share one `lastmod`.)

```ts
// mysite/sitemap-data.ts
import type { SitemapUrl, SubSitemap } from "astro-sitemap-pro-component";
import { latestLastmod } from "astro-sitemap-pro-component";

const SITE = "https://mysite.com";

// helper: a URL with es/en alternates and its OWN real lastmod
function u(
  path: string,
  priority: number,
  changefreq: SitemapUrl["changefreq"],
  lastmod: string | Date, // the page's real change date, not build time
): SitemapUrl {
  const en = path === "/estadios" ? "/stadiums" : path; // your own segment translations
  return {
    loc: `${SITE}${path}`,
    lastmod,
    changefreq,
    priority,
    alternates: [
      { hreflang: "es", href: `${SITE}${path}` },
      { hreflang: "en", href: `${SITE}/en${en}` },
      { hreflang: "x-default", href: `${SITE}${path}` },
    ],
  };
}

// Dynamic pages (home, listings) legitimately change on each build → build date is fine.
const buildDate = new Date();
export const pageUrls = (): SitemapUrl[] => [u("/", 1, "daily", buildDate), u("/about", 0.6, "monthly", "2026-01-15")];
// Content items carry their own edit date.
export const newsUrls = (): SitemapUrl[] => myPosts.map((p) => u(`/blog/${p.slug}`, 0.6, "weekly", p.updated));

// Derive each sub-sitemap's lastmod from the URLs it lists (honest, no bookkeeping).
export const subs = (): SubSitemap[] => [
  { loc: `${SITE}/page-sitemap.xml`, lastmod: latestLastmod(pageUrls()) },
  { loc: `${SITE}/news-sitemap.xml`, lastmod: latestLastmod(newsUrls()) },
];
```

## 2a. Astro endpoints (`src/pages/`)

```ts
// src/pages/sitemap.xml.ts
import { sitemapIndexHandler } from "astro-sitemap-pro-component/handlers";
import { subs } from "../../sitemap-data";
export const GET = sitemapIndexHandler(subs);
```

```ts
// src/pages/page-sitemap.xml.ts
import { urlsetHandler } from "astro-sitemap-pro-component/handlers";
import { pageUrls } from "../../sitemap-data";
export const GET = urlsetHandler(pageUrls);
```

```ts
// src/pages/sitemap.xsl.ts
import { stylesheetHandler } from "astro-sitemap-pro-component/handlers";
export const GET = stylesheetHandler({ lang: "es", brand: "My Site", accent: "#ff2e74" });
```

With `output: 'static'` these write `dist/sitemap.xml`, `dist/page-sitemap.xml`, `dist/sitemap.xsl`.

## 2b. Next.js App Router (`src/app/`)

```ts
// src/app/sitemap.xml/route.ts
import { sitemapIndexHandler } from "astro-sitemap-pro-component/handlers";
import { subs } from "@/sitemap-data";
export const dynamic = "force-static";
export const GET = sitemapIndexHandler(subs);
```

```ts
// src/app/page-sitemap.xml/route.ts
import { urlsetHandler } from "astro-sitemap-pro-component/handlers";
import { pageUrls } from "@/sitemap-data";
export const dynamic = "force-static";
export const GET = urlsetHandler(pageUrls);
```

```ts
// src/app/sitemap.xsl/route.ts
import { stylesheetHandler } from "astro-sitemap-pro-component/handlers";
export const dynamic = "force-static";
export const GET = stylesheetHandler({ lang: "es", brand: "My Site", accent: "#ff2e74" });
```

Add `transpilePackages: ["astro-sitemap-pro-component"]` to `next.config.ts` so Next compiles the
package's TypeScript.

## 3. robots.txt

Point only at the **index**; Google finds the rest:

```
Sitemap: https://mysite.com/sitemap.xml
```

## Notes

- `stylesheetHref` defaults to `/sitemap.xsl`. Pass `null` to omit the stylesheet PI, or a custom
  path if you serve it elsewhere.
- `lastmod` accepts a `Date` or an ISO string.
- Keep each sub-sitemap under 50,000 URLs / 50 MB (split further if needed — just add more types).
- The XSL is for humans; crawlers read the raw XML regardless.

## 4. Coverage verification (Astro)

Endpoint-based sitemaps drift when a new page type ships without a sitemap entry. Add the
`sitemapCoverage` integration and the build fails (or warns with `strict: false`) listing
**MISSING** pages (built but unlisted) and **STALE** entries (listed but not built) — plus SEO
health checks: **NOINDEX** (a listed page marked `noindex`), **CANONICAL** (canonical points
elsewhere) and lint (duplicate/non-absolute/tracking-param `<loc>`, uniform `lastmod`):

```js
// astro.config.mjs
import { sitemapCoverage } from "astro-sitemap-pro-component/astro";
export default defineConfig({
  integrations: [sitemapCoverage({ ignore: (p) => p === "offline" })],
  // checkNoindex / checkCanonical / lint default to true; strict fails on errors, warns on the rest.
});
```

Pathnames passed to `ignore` are normalized without leading/trailing slashes (root = `""`),
and `404`/`500` are always skipped. `./astro` is Node-only; don't import it from edge code.

## 5. IndexNow — notify Bing/Yandex on deploy

Sitemaps are pulled on the engine's schedule; IndexNow pushes. After deploy, submit only the URLs
whose `lastmod` is recent (drip, not bulk) — the call never throws, so it can't break the deploy:

```ts
import { submitFreshByLastmod, isCI } from "astro-sitemap-pro-component/indexnow";
import { pageUrls, newsUrls } from "./sitemap-data";

await submitFreshByLastmod([...pageUrls(), ...newsUrls()], {
  host: "mysite.com",
  key: process.env.INDEXNOW_KEY!,   // also served at https://mysite.com/<key>.txt
  since: "2026-07-01",
  dryRun: !isCI(),                  // don't ping from local/preview builds
});
```

Generate the key once with `generateKey()` and serve it via `keyFileHandler(key)` at `/<key>.txt`.
Lint a urlset anytime with `validateUrls(urls)` from `astro-sitemap-pro-component/validate`.
