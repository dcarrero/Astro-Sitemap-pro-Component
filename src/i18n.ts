// sitemap-pro · multilingual helpers
// Turn "translation clusters" (the same page across languages) into per-language
// <urlset>s where each URL is listed with its own <loc> and the full, reciprocal
// hreflang set (Google's recommended i18n annotation). Works for any number of
// languages — split your sitemap by type AND by language.
import type { Alternate, ChangeFreq, SitemapUrl } from "./core";

/** One language version of a page. */
export type LangUrl = {
  lang: string; // hreflang code, e.g. "es", "en", "en-GB"
  loc: string; // absolute URL of this language version
  lastmod?: string | Date;
  changefreq?: ChangeFreq;
  priority?: number;
  images?: string[];
};

/** The same page in every language it exists in. */
export type UrlCluster = LangUrl[];

export type LangOptions = {
  /** hreflang used for x-default (defaults to the first entry in each cluster). */
  xDefaultLang?: string;
};

/** Build the hreflang alternates for a cluster (includes an x-default). */
export function clusterAlternates(cluster: UrlCluster, opts?: LangOptions): Alternate[] {
  const alts: Alternate[] = cluster.map((u) => ({ hreflang: u.lang, href: u.loc }));
  const xd = opts?.xDefaultLang
    ? cluster.find((u) => u.lang === opts.xDefaultLang)
    : cluster[0];
  if (xd) alts.push({ hreflang: "x-default", href: xd.loc });
  return alts;
}

/**
 * Project translation clusters onto ONE language: one <url> per cluster that has
 * that language, with loc = that version and the full reciprocal hreflang set.
 * Feed the result to `renderUrlset`.
 */
export function urlsForLang(
  clusters: UrlCluster[],
  lang: string,
  opts?: LangOptions,
): SitemapUrl[] {
  const out: SitemapUrl[] = [];
  for (const cluster of clusters) {
    const self = cluster.find((u) => u.lang === lang);
    if (!self) continue;
    out.push({
      loc: self.loc,
      lastmod: self.lastmod,
      changefreq: self.changefreq,
      priority: self.priority,
      images: self.images,
      alternates: clusterAlternates(cluster, opts),
    });
  }
  return out;
}

/** Distinct languages present across all clusters (stable order of first appearance). */
export function languagesOf(clusters: UrlCluster[]): string[] {
  const seen: string[] = [];
  for (const c of clusters) for (const u of c) if (!seen.includes(u.lang)) seen.push(u.lang);
  return seen;
}
