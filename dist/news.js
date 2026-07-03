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
/**
 * Turn articles into `SitemapUrl[]` with a `news` annotation, filtered to the freshness
 * window and sorted newest-first. Articles with an unparseable `publicationDate` are dropped.
 */
export function newsUrls(articles, opts) {
    const nowMs = opts.now == null ? Date.now() : new Date(opts.now).getTime();
    const windowH = opts.freshnessHours ?? 48;
    const cutoff = windowH > 0 ? nowMs - windowH * 3_600_000 : -Infinity;
    const fresh = articles
        .map((a) => ({ a, t: new Date(a.publicationDate).getTime() }))
        .filter(({ t }) => !Number.isNaN(t) && t >= cutoff)
        .sort((x, y) => y.t - x.t); // newest first
    const chosen = opts.max != null ? fresh.slice(0, opts.max) : fresh;
    return chosen.map(({ a }) => {
        const news = {
            publicationName: opts.publicationName,
            publicationLanguage: opts.publicationLanguage,
            publicationDate: a.publicationDate,
            title: a.title,
            keywords: a.keywords,
        };
        const url = { loc: a.loc, news };
        if (a.lastmod != null)
            url.lastmod = a.lastmod;
        if (a.images)
            url.images = a.images;
        return url;
    });
}
