// sitemap-pro · robots.txt helper (edge-safe)
// Point crawlers at your sitemap index and set a sane crawl policy. `robots.txt`
// controls crawling (not indexing) — the important line for this package is
// `Sitemap:`, which should point at your index so Google/Bing discover every
// sub-sitemap. Build the string with `buildRobotsTxt` or serve it directly with
// `robotsTxtHandler` (same handler shape as the sitemap endpoints).

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
export function buildRobotsTxt(opts: RobotsOptions = {}): string {
  const lines: string[] = [`User-agent: ${opts.userAgent ?? "*"}`];

  const allow = opts.allow ?? [];
  const disallow = opts.disallow ?? [];
  if (allow.length === 0 && disallow.length === 0) {
    lines.push("Allow: /");
  } else {
    for (const a of allow) lines.push(`Allow: ${a}`);
    for (const d of disallow) lines.push(`Disallow: ${d}`);
  }
  if (opts.host) lines.push(`Host: ${opts.host}`);

  const sitemaps =
    opts.sitemaps == null ? [] : Array.isArray(opts.sitemaps) ? opts.sitemaps : [opts.sitemaps];
  if (sitemaps.length) {
    lines.push("");
    for (const s of sitemaps) lines.push(`Sitemap: ${s}`);
  }

  const extra = opts.extra ? `${opts.extra.trim()}\n` : "";
  return `${lines.join("\n")}\n${extra}`;
}

/** GET handler that serves robots.txt (text/plain). Mount at /robots.txt. */
export function robotsTxtHandler(opts?: RobotsOptions): () => Response {
  return () =>
    new Response(buildRobotsTxt(opts), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
}
