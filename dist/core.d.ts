export type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
/** hreflang alternate for an i18n URL (e.g. { hreflang: "en", href: "https://…/en/…" }). */
export type Alternate = {
    hreflang: string;
    href: string;
};
/**
 * An image entry for a URL. A bare string is shorthand for `{ loc }`.
 * NOTE: Google reads only `<image:loc>` (it deprecated title/caption in 2022); the
 * extra fields stay valid per the image sitemap protocol and are used by other engines.
 */
export type ImageInfo = {
    loc: string;
    title?: string;
    caption?: string;
};
/** Google News annotation for a URL — pairs with a News sitemap (`./news`). */
export type NewsInfo = {
    /** Publication name, e.g. "EspecialMundial". */
    publicationName: string;
    /** Publication language (ISO 639, e.g. "es", "en"). */
    publicationLanguage: string;
    /** Article publication date (W3C datetime). */
    publicationDate: string | Date;
    /** Article headline (must match the on-page title). */
    title: string;
    /** Optional comma-separated (or array) keywords. */
    keywords?: string[] | string;
};
export type SitemapUrl = {
    loc: string;
    lastmod?: string | Date;
    changefreq?: ChangeFreq;
    priority?: number;
    /** hreflang alternates (multilingual sites). Include an "x-default" if you have one. */
    alternates?: Alternate[];
    /** Images to attach as <image:image>. A string is shorthand for `{ loc }`. */
    images?: (string | ImageInfo)[];
    /** Google News annotation (<news:news>). Build these with `newsUrls` from `./news`. */
    news?: NewsInfo;
};
export type SubSitemap = {
    loc: string;
    lastmod?: string | Date;
};
export type RenderOptions = {
    /** Href of the XSL stylesheet, or null to omit the processing instruction. Default "/sitemap.xsl". */
    stylesheetHref?: string | null;
    /** Add the generator credit comment (component + sitemaps.org). Default true. */
    credit?: boolean;
};
export declare const REPO_URL = "https://github.com/dcarrero/Astro-Sitemap-pro-Component";
export declare function escapeXml(s: string): string;
/**
 * The most recent lastmod among items (ISO string), or undefined if none carry one.
 * Use it to derive an HONEST `<lastmod>` for a sub-sitemap in the index straight from
 * the URLs it lists — instead of hand-maintaining (and forgetting) it:
 *
 *   renderIndex([{ loc: "/news-sitemap.xml", lastmod: latestLastmod(newsUrls) }, …])
 *
 * Assumes ISO-8601/UTC timestamps, which sort lexicographically.
 */
export declare function latestLastmod(items: {
    lastmod?: string | Date;
}[]): string | undefined;
/** Render a <urlset> (one sub-sitemap). */
export declare function renderUrlset(urls: SitemapUrl[], opts?: RenderOptions): string;
/** Render the <sitemapindex> that links to every sub-sitemap. */
export declare function renderIndex(subs: SubSitemap[], opts?: RenderOptions): string;
/** Wrap an XML string in a web-standard Response (works in Astro & Next handlers). */
export declare function xmlResponse(xml: string): Response;
