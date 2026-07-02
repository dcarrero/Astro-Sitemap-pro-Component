# Changelog

All notable changes to **astro-sitemap-pro-component**. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning [SemVer](https://semver.org/).

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
