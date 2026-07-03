import type { SitemapUrl } from "./core";
export type IssueLevel = "error" | "warn";
export type SitemapIssue = {
    level: IssueLevel;
    code: "duplicate-loc" | "non-absolute-loc" | "tracking-param" | "uniform-lastmod";
    message: string;
    /** The offending URL, when the issue is about a single entry. */
    loc?: string;
};
export type ValidateOptions = {
    /** Query-param names treated as tracking noise (matched case-insensitively by prefix). */
    trackingParams?: string[];
    /** Minimum URLs before a uniform lastmod is flagged. Default 3. */
    uniformLastmodMin?: number;
};
/**
 * Lint a urlset. Returns issues (empty array = clean). Pure: no I/O, no logging.
 * `error`-level issues are real defects; `warn`-level ones may be intentional
 * (e.g. a fixed lastmod is fine for static reference content).
 */
export declare function validateUrls(urls: SitemapUrl[], opts?: ValidateOptions): SitemapIssue[];
