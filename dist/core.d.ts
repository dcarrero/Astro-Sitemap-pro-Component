export type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
/** hreflang alternate for an i18n URL (e.g. { hreflang: "en", href: "https://…/en/…" }). */
export type Alternate = {
    hreflang: string;
    href: string;
};
export type SitemapUrl = {
    loc: string;
    lastmod?: string | Date;
    changefreq?: ChangeFreq;
    priority?: number;
    /** hreflang alternates (multilingual sites). Include an "x-default" if you have one. */
    alternates?: Alternate[];
    /** Absolute image URLs to attach as <image:image> (Google image sitemaps). */
    images?: string[];
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
/** Render a <urlset> (one sub-sitemap). */
export declare function renderUrlset(urls: SitemapUrl[], opts?: RenderOptions): string;
/** Render the <sitemapindex> that links to every sub-sitemap. */
export declare function renderIndex(subs: SubSitemap[], opts?: RenderOptions): string;
/** Wrap an XML string in a web-standard Response (works in Astro & Next handlers). */
export declare function xmlResponse(xml: string): Response;
