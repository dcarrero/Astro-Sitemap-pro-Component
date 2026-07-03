// sitemap-pro · IndexNow (edge-safe)
// Notify Bing & Yandex the instant your content changes — the freshness signal
// Bing recommends. A single POST propagates to every IndexNow participant. Prefer
// DRIP submissions (only the URLs that actually changed) over bulk re-sends, which
// look like spam. Built on web standards (fetch / crypto / Response), so it runs
// from a Node deploy script or an edge runtime unchanged.
//
// Three steps (straight from the SEO/GEO checklist §3):
//   1. const key = generateKey()            // 32 hex chars — PUBLIC by design
//   2. serve it at https://host/<key>.txt   // keyFileHandler(key)
//   3. after each deploy, submit only what changed:
//        await submitFreshByLastmod(urls, { host, key, since, dryRun: !isCI() })
//
// submitUrls / submitFreshByLastmod NEVER throw — a failed ping must never break a
// deploy; the error comes back in the result instead.

import type { SitemapUrl } from "./core";

const ENDPOINT = "https://api.indexnow.org/indexnow";
// IndexNow accepts at most 10,000 URLs per request; larger lists are chunked.
const MAX_PER_REQUEST = 10000;

/** Generate a random IndexNow key (hex). It is public by design — publish it at /<key>.txt. */
export function generateKey(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** GET handler that serves the key file as text/plain. Mount it at /<key>.txt. */
export function keyFileHandler(key: string): () => Response {
  return () => new Response(key, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

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
export async function submitUrls(urls: string[], opts: SubmitOptions): Promise<SubmitResult> {
  const list = [...new Set(urls.filter(Boolean))];
  if (list.length === 0) return { ok: true, count: 0, skipped: true };
  if (opts.dryRun) return { ok: true, count: list.length, skipped: true };

  const doFetch = opts.fetch ?? globalThis.fetch;
  const endpoint = opts.endpoint ?? ENDPOINT;
  const keyLocation = opts.keyLocation ?? `https://${opts.host}/${opts.key}.txt`;

  try {
    let lastStatus = 0;
    for (let i = 0; i < list.length; i += MAX_PER_REQUEST) {
      const res = await doFetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: opts.host,
          key: opts.key,
          keyLocation,
          urlList: list.slice(i, i + MAX_PER_REQUEST),
        }),
      });
      lastStatus = res.status;
      if (!res.ok) {
        return { ok: false, count: list.length, status: res.status, error: `IndexNow responded ${res.status}` };
      }
    }
    return { ok: true, count: list.length, status: lastStatus };
  } catch (err) {
    return { ok: false, count: list.length, error: err instanceof Error ? err.message : String(err) };
  }
}

export type FreshOptions = {
  /** Only URLs whose lastmod is >= this instant (Date or ISO-8601 string). */
  since: Date | string;
};

/**
 * The absolute <loc>s whose lastmod falls within the window — the drip subset to
 * submit after a deploy. URLs without a lastmod are skipped (nothing says they
 * changed). Assumes ISO-8601/UTC timestamps, which sort lexicographically.
 */
export function freshUrls(urls: SitemapUrl[], opts: FreshOptions): string[] {
  const since = typeof opts.since === "string" ? opts.since : opts.since.toISOString();
  const out: string[] = [];
  for (const u of urls) {
    if (u.lastmod == null) continue;
    const lm = typeof u.lastmod === "string" ? u.lastmod : u.lastmod.toISOString();
    if (lm >= since) out.push(u.loc);
  }
  return out;
}

/** Convenience: pick the URLs changed since `since` and submit only those. Never throws. */
export async function submitFreshByLastmod(
  urls: SitemapUrl[],
  opts: SubmitOptions & FreshOptions,
): Promise<SubmitResult> {
  return submitUrls(freshUrls(urls, opts), opts);
}

/** True in a CI environment (guarded, edge-safe). Handy to gate real submits: `dryRun: !isCI()`. */
export function isCI(): boolean {
  const p = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return Boolean(p?.env?.CI);
}
