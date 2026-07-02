# Usage guide

The package renders the XML; **you** supply the URL lists (your site's data). Keep one module that
builds the lists per content type, then wire tiny endpoints/handlers.

## 1. Build your URL lists

```ts
// mysite/sitemap-data.ts
import type { SitemapUrl, SubSitemap } from "astro-sitemap-pro-component";

const SITE = "https://mysite.com";
const now = new Date().toISOString();

// helper: a URL with es/en alternates
function u(path: string, priority: number, changefreq: SitemapUrl["changefreq"]): SitemapUrl {
  const en = path === "/estadios" ? "/stadiums" : path; // your own segment translations
  return {
    loc: `${SITE}${path}`,
    lastmod: now,
    changefreq,
    priority,
    alternates: [
      { hreflang: "es", href: `${SITE}${path}` },
      { hreflang: "en", href: `${SITE}/en${en}` },
      { hreflang: "x-default", href: `${SITE}${path}` },
    ],
  };
}

export const pageUrls = (): SitemapUrl[] => [u("/", 1, "daily"), u("/about", 0.6, "monthly")];
export const newsUrls = (): SitemapUrl[] => myPosts.map((p) => u(`/blog/${p.slug}`, 0.6, "weekly"));

export const subs = (): SubSitemap[] => [
  { loc: `${SITE}/page-sitemap.xml`, lastmod: now },
  { loc: `${SITE}/news-sitemap.xml`, lastmod: now },
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
**MISSING** pages (built but unlisted) and **STALE** entries (listed but not built):

```js
// astro.config.mjs
import { sitemapCoverage } from "astro-sitemap-pro-component/astro";
export default defineConfig({
  integrations: [sitemapCoverage({ ignore: (p) => p === "offline" })],
});
```

Pathnames passed to `ignore` are normalized without leading/trailing slashes (root = `""`),
and `404`/`500` are always skipped. `./astro` is Node-only; don't import it from edge code.
