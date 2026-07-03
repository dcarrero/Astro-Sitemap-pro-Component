// sitemap-pro · Google News sitemaps (edge-safe)
// A News sitemap is a normal <urlset> where each <url> carries a <news:news> block.
// Google only indexes articles from roughly the last 48 hours and caps the file at
// 1,000 URLs, so `newsUrls` filters to a freshness window (newest first) and lets you
// cap the count. Feed the result to `renderUrlset` like any other sub-sitemap.
//
//   import { newsUrls } from "astro-sitemap-pro-component/news";
//   import { renderUrlset } from "astro-sitemap-pro-component";
//   const urls = newsUrls(articles, { publicationName: "EspecialMundial", publicationLanguage: "es" });
//   export const GET = urlsetHandler(() => urls);

import type { NewsInfo, ImageInfo, SitemapUrl } from "./core.js";

/** One article for a News sitemap. */
export type NewsArticle = {
  loc: string;
  title: string;
  /** Publication date (W3C datetime). Drives the freshness window and <news:publication_date>. */
  publicationDate: string | Date;
  lastmod?: string | Date;
  keywords?: string[] | string;
  images?: (string | ImageInfo)[];
};

export type NewsUrlsOptions = {
  /** Publication name (same for every article). */
  publicationName: string;
  /** Publication language (ISO 639, e.g. "es"). */
  publicationLanguage: string;
  /** Drop articles older than this many hours. Default 48 (Google's window); 0 disables filtering. */
  freshnessHours?: number;
  /** Reference "now" for the freshness window (Date or ISO string). Default: current time. */
  now?: Date | string;
  /** Cap output to the N freshest articles (Google's hard limit is 1000). Default: no cap. */
  max?: number;
};

/**
 * Turn articles into `SitemapUrl[]` with a `news` annotation, filtered to the freshness
 * window and sorted newest-first. Articles with an unparseable `publicationDate` are dropped.
 */
export function newsUrls(articles: NewsArticle[], opts: NewsUrlsOptions): SitemapUrl[] {
  const nowMs = opts.now == null ? Date.now() : new Date(opts.now).getTime();
  const windowH = opts.freshnessHours ?? 48;
  const cutoff = windowH > 0 ? nowMs - windowH * 3_600_000 : -Infinity;

  const fresh = articles
    .map((a) => ({ a, t: new Date(a.publicationDate).getTime() }))
    .filter(({ t }) => !Number.isNaN(t) && t >= cutoff)
    .sort((x, y) => y.t - x.t); // newest first

  const chosen = opts.max != null ? fresh.slice(0, opts.max) : fresh;

  return chosen.map(({ a }) => {
    const news: NewsInfo = {
      publicationName: opts.publicationName,
      publicationLanguage: opts.publicationLanguage,
      publicationDate: a.publicationDate,
      title: a.title,
      keywords: a.keywords,
    };
    const url: SitemapUrl = { loc: a.loc, news };
    if (a.lastmod != null) url.lastmod = a.lastmod;
    if (a.images) url.images = a.images;
    return url;
  });
}
