import type { ImageInfo, SitemapUrl } from "./core.js";
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
export declare function newsUrls(articles: NewsArticle[], opts: NewsUrlsOptions): SitemapUrl[];
