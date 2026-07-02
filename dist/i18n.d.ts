import type { Alternate, ChangeFreq, SitemapUrl } from "./core";
/** One language version of a page. */
export type LangUrl = {
    lang: string;
    loc: string;
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
export declare function clusterAlternates(cluster: UrlCluster, opts?: LangOptions): Alternate[];
/**
 * Project translation clusters onto ONE language: one <url> per cluster that has
 * that language, with loc = that version and the full reciprocal hreflang set.
 * Feed the result to `renderUrlset`.
 */
export declare function urlsForLang(clusters: UrlCluster[], lang: string, opts?: LangOptions): SitemapUrl[];
/**
 * Expand clusters into ONE urlset containing EVERY language version, each with the
 * full reciprocal hreflang set — Yoast-style "split by type, not by language".
 * Single-language clusters get no alternates (self-referencing hreflang is noise).
 * Feed the result to `renderUrlset`.
 */
export declare function urlsForAllLangs(clusters: UrlCluster[], opts?: LangOptions): SitemapUrl[];
/** Distinct languages present across all clusters (stable order of first appearance). */
export declare function languagesOf(clusters: UrlCluster[]): string[];
