# Changelog

All notable changes to **astro-sitemap-pro-component**. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning [SemVer](https://semver.org/).

## [0.5.0] — 2026-07-03

### Added
- **News sitemaps** (`./news`): `newsUrls(articles, opts)` builds a `<urlset>` where each `<url>`
  carries a `<news:news>` block (`publication` name/language, `publication_date`, `title`,
  optional `keywords`). It filters to Google's freshness window (default 48h, newest first) and
  can cap the count (Google's limit is 1000). Feed the result to `renderUrlset` like any sub-sitemap.
  `SitemapUrl` gained an optional `news` field and `renderUrlset` emits the `news:` namespace.
- **Richer image entries**: `SitemapUrl.images` now accepts `string | { loc, title?, caption? }`
  (a string stays shorthand for `{ loc }`). `renderUrlset` emits `<image:title>`/`<image:caption>`
  when present. (Google reads only `<image:loc>` since 2022; the extra fields remain valid in the
  image sitemap protocol and are used by other engines.)
- **`robots.txt` helper** (`./robots`): `buildRobotsTxt(opts)` / `robotsTxtHandler(opts)` emit a
  robots.txt with the `Sitemap:` line(s) pointing at your index, plus optional allow/disallow, host
  and raw extra lines. Same handler shape as the sitemap endpoints (Astro + Next).

### Changed
- **`validateUrls`** gained hreflang and value/format checks: `hreflang-duplicate`,
  `hreflang-no-self`, `hreflang-no-x-default`, `hreflang-non-reciprocal` (reciprocity is verified
  for targets present in the same urlset, so split-by-language sitemaps aren't false-flagged),
  plus `invalid-priority` (outside 0–1), `invalid-changefreq` (not a valid enum) and
  `invalid-lastmod` (not a W3C datetime). Toggle with `checkHreflang` / `checkValues` (default on).

## [0.4.0] — 2026-07-03

### Added
- **IndexNow** (`./indexnow`, edge-safe): notify Bing & Yandex the instant content changes —
  the freshness signal Bing recommends.
  - `generateKey(bytes?)` — a public IndexNow key (hex); `keyFileHandler(key)` serves it at
    `/<key>.txt` (same handler shape as the sitemap endpoints, Astro + Next).
  - `submitUrls(urls, opts)` — POST to IndexNow; **never throws** (a failed ping can't break a
    deploy — the error comes back in the result), dedupes, chunks past 10k, `dryRun` for
    local/preview, injectable `fetch`.
  - `freshUrls(urls, { since })` + `submitFreshByLastmod(urls, opts)` — **drip** submission:
    send only the URLs whose `lastmod` falls in a recent window, not bulk re-sends (which read
    as spam). `isCI()` helper to gate real submits (`dryRun: !isCI()`).
- **Sitemap validation** (`./validate`, edge-safe): `validateUrls(urls, opts?)` lints a urlset
  and returns issues — `duplicate-loc`, `non-absolute-loc`, `tracking-param`, and
  `uniform-lastmod` (the "`new Date()` on every build" antipattern that makes engines distrust
  your `lastmod`). Pure: no I/O, no logging.
- **`latestLastmod(items)`** (`./core`): derive an honest sub-sitemap `<lastmod>` for the index
  straight from the URLs it lists — `renderIndex([{ loc, lastmod: latestLastmod(urls) }, …])` —
  instead of hand-maintaining (and forgetting) it.

### Changed
- **`sitemapCoverage`** now runs SEO **health checks** alongside coverage, in one build-time
  report (errors fail the build under `strict`; warnings only log):
  - `checkNoindex` (default on) — a listed page that renders `<meta name="robots" …noindex…>`
    (error). `checkCanonical` (default on) — a listed page whose `<link rel="canonical">` points
    elsewhere (warning). `lint` (default on) — runs `validateUrls` per sub-sitemap plus a
    cross-file duplicate check.
  - The report now groups **errors** and **warnings** and lists them all at once instead of
    throwing on the first mismatch.



### Added
- **Sitemap coverage verification** (`./astro`, Node-only): `sitemapCoverage(opts?)` Astro
  integration. After `astro build` it compares every generated HTML page against the union of
  `<loc>` entries reachable from the sitemap index (following sub-sitemaps) and reports
  **MISSING** pages (built but not listed) and **STALE** entries (listed but not built).
  Options: `index` (default `"sitemap.xml"`), `ignore(pathname)`, `strict` (default `true`,
  fails the build on drift). This closes the classic gap of endpoint-based sitemaps: adding a
  new page type without adding it to the sitemap now breaks the build instead of silently
  hurting SEO.
- **`urlsForAllLangs(clusters, opts?)`** (`./i18n`): expand clusters into ONE urlset containing
  every language version with the full reciprocal hreflang set — Yoast-style "split by type,
  not by language" for multilingual sites that want a single file per content type.
- **Async getters**: `sitemapIndexHandler` / `urlsetHandler` now accept sync **or async**
  functions (e.g. Astro's `getCollection()`), and all handlers return `Promise<Response>`.

### Changed
- `dist/` is now **committed** — the package installs straight from a git URL
  (`github:dcarrero/Astro-Sitemap-pro-Component#v0.3.0`) with no build step, which CI/CD
  environments (Cloudflare Pages, GitHub Actions) need. `prepare` still rebuilds on install.

## [0.2.1] — 2026-07-02

### Added
- **Generator attribution** (Yoast-style). Each sitemap now carries a comment in the raw XML
  citing the component + repo + sitemaps.org, and the XSL view shows a localized "Generated by
  astro-sitemap-pro-component · … sitemaps.org" note (`poweredBy` string, 6 languages). Disable the
  XML comment with `renderUrlset(urls, { credit: false })` / `renderIndex(subs, { credit: false })`.

## [0.2.0] — 2026-07-02

### Added
- **Multilingual splitting** (`./i18n`): split your sitemap by type **and by language**.
  - `LangUrl` / `UrlCluster` types (a "cluster" = the same page across languages).
  - `urlsForLang(clusters, lang, opts?)` — emits one `<url>` per cluster for a given
    language, each with its own `<loc>` and the **full reciprocal hreflang set** (plus
    `x-default`). Feed the result to `renderUrlset`, one sub-sitemap per language.
  - `clusterAlternates()` and `languagesOf()` helpers. Works for any number of languages.

## [0.1.0] — 2026-07-02

### Added
- Initial release. Framework-agnostic core:
  - `renderIndex(subs, opts?)` — sitemap **index** linking to per-type sub-sitemaps.
  - `renderUrlset(urls, opts?)` — a sub-sitemap `<urlset>` with **hreflang** alternates,
    `lastmod`/`changefreq`/`priority`, and optional `<image:image>` entries.
  - `buildStylesheet(opts)` — localized, themable **XSL stylesheet** (en, es, fr, de, pt, it).
  - `xmlResponse()` and endpoint factories (`sitemapIndexHandler`, `urlsetHandler`,
    `stylesheetHandler`) that work as **Astro endpoints** and **Next.js route handlers**.
- Extracted from especialmundial.com. Zero runtime dependencies.
