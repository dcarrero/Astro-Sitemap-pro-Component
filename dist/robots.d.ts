export type RobotsOptions = {
    /** Absolute sitemap URL(s) — normally just your index, e.g. "https://site.com/sitemap.xml". */
    sitemaps?: string | string[];
    /** User-agent for the rule group. Default "*". */
    userAgent?: string;
    /** Allow paths. If neither allow nor disallow is given, defaults to `Allow: /`. */
    allow?: string[];
    /** Disallow paths (e.g. "/admin", "/*?utm_"). */
    disallow?: string[];
    /** Optional Host directive (Yandex). */
    host?: string;
    /** Raw lines appended verbatim (advanced multi-group rules, Crawl-delay, extra agents). */
    extra?: string;
};
/** Build a robots.txt string. Sitemap lines go last, independent of the rule group. */
export declare function buildRobotsTxt(opts?: RobotsOptions): string;
/** GET handler that serves robots.txt (text/plain). Mount at /robots.txt. */
export declare function robotsTxtHandler(opts?: RobotsOptions): () => Response;
