import type { SitemapUrl } from "./core";
/** Generate a random IndexNow key (hex). It is public by design — publish it at /<key>.txt. */
export declare function generateKey(bytes?: number): string;
/** GET handler that serves the key file as text/plain. Mount it at /<key>.txt. */
export declare function keyFileHandler(key: string): () => Response;
export type SubmitOptions = {
    /** Bare host, e.g. "tusitio.com" (no protocol, no path). */
    host: string;
    /** The key — must equal the /<key>.txt filename you publish. */
    key: string;
    /** Full URL of the key file. Default `https://<host>/<key>.txt`. */
    keyLocation?: string;
    /** API endpoint. Default IndexNow's shared endpoint (propagates to all engines). */
    endpoint?: string;
    /** Skip the actual POST and return `{ skipped: true }`. Use on local/preview builds. */
    dryRun?: boolean;
    /** Injectable fetch (tests / custom agents). Defaults to the global fetch. */
    fetch?: typeof fetch;
};
export type SubmitResult = {
    ok: boolean;
    /** Number of unique URLs considered for submission. */
    count: number;
    /** HTTP status of the last request (absent when skipped or on a network error). */
    status?: number;
    /** True when nothing was sent (empty list or dryRun). */
    skipped?: boolean;
    /** Error message when ok === false. */
    error?: string;
};
/**
 * Submit URLs to IndexNow. NEVER throws — a failed ping can't break your deploy;
 * inspect the returned result instead. Empty input and `dryRun` short-circuit as
 * a successful skip.
 */
export declare function submitUrls(urls: string[], opts: SubmitOptions): Promise<SubmitResult>;
export type FreshOptions = {
    /** Only URLs whose lastmod is >= this instant (Date or ISO-8601 string). */
    since: Date | string;
};
/**
 * The absolute <loc>s whose lastmod falls within the window — the drip subset to
 * submit after a deploy. URLs without a lastmod are skipped (nothing says they
 * changed). Assumes ISO-8601/UTC timestamps, which sort lexicographically.
 */
export declare function freshUrls(urls: SitemapUrl[], opts: FreshOptions): string[];
/** Convenience: pick the URLs changed since `since` and submit only those. Never throws. */
export declare function submitFreshByLastmod(urls: SitemapUrl[], opts: SubmitOptions & FreshOptions): Promise<SubmitResult>;
/** True in a CI environment (guarded, edge-safe). Handy to gate real submits: `dryRun: !isCI()`. */
export declare function isCI(): boolean;
