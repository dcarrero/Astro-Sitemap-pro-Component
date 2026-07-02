// sitemap-pro · Astro integration: sitemap coverage verification
// Endpoint-based sitemaps (src/pages/sitemap.xml.ts, …) give you full control over
// per-type splitting, hreflang and lastmod — but they can silently drift when new
// page types are added. This integration closes the loop: after `astro build` it
// compares every generated HTML page against the union of <loc> entries reachable
// from the sitemap index, and reports pages missing from the sitemaps (and stale
// sitemap entries pointing at pages that were not built).
//
// Node-only (reads the build output from disk) — exported from "./astro", NOT from
// the package root, so the core stays usable in edge runtimes.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
/** Normalize a pathname for set comparison: decoded, no leading/trailing slashes ("" = root). */
function norm(pathname) {
    let s = pathname.trim();
    try {
        s = decodeURIComponent(s);
    }
    catch {
        /* not URL-encoded — compare as-is */
    }
    return s.replace(/^\/+|\/+$/g, "");
}
/** Pages whose last segment has an extension are endpoints (robots.txt, *.xml…), not HTML pages. */
function isHtmlPage(pathname) {
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return !last.includes(".");
}
const DEFAULT_IGNORE = /^(404|500)$/;
function extractLocs(xml) {
    return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
}
const display = (p) => (p === "" ? "/" : `/${p}/`);
/**
 * Astro integration. After the build, verify that every generated HTML page is listed
 * in the sitemap (following the index into its sub-sitemaps) and vice versa.
 *
 *   import { sitemapCoverage } from "astro-sitemap-pro-component/astro";
 *   export default defineConfig({ integrations: [sitemapCoverage({ ignore: (p) => p === "offline" })] });
 */
export function sitemapCoverage(opts = {}) {
    const indexName = opts.index ?? "sitemap.xml";
    const strict = opts.strict ?? true;
    const ignored = (p) => DEFAULT_IGNORE.test(p) || (opts.ignore?.(p) ?? false);
    return {
        name: "astro-sitemap-pro-component/coverage",
        hooks: {
            "astro:build:done": async ({ dir, pages, logger }) => {
                const out = fileURLToPath(dir);
                const log = logger ?? console;
                const fail = (msg) => {
                    if (strict)
                        throw new Error(msg);
                    log.warn(msg);
                };
                const readXml = async (name) => {
                    try {
                        return await readFile(join(out, name), "utf8");
                    }
                    catch {
                        return null;
                    }
                };
                const indexXml = await readXml(indexName);
                if (indexXml == null) {
                    fail(`[sitemap-coverage] ${indexName} not found in build output (${out})`);
                    return;
                }
                // Union of <loc> pathnames; when the entry file is a <sitemapindex>, follow each sub-sitemap.
                const listed = new Set();
                if (/<sitemapindex[\s>]/.test(indexXml)) {
                    for (const loc of extractLocs(indexXml)) {
                        const subName = norm(new URL(loc).pathname);
                        const subXml = await readXml(subName);
                        if (subXml == null) {
                            fail(`[sitemap-coverage] sub-sitemap "${subName}" is listed in ${indexName} but was not built`);
                            continue;
                        }
                        for (const u of extractLocs(subXml))
                            listed.add(norm(new URL(u).pathname));
                    }
                }
                else {
                    for (const u of extractLocs(indexXml))
                        listed.add(norm(new URL(u).pathname));
                }
                const built = new Set();
                for (const p of pages) {
                    const path = norm(p.pathname);
                    if (!isHtmlPage(path) || ignored(path))
                        continue;
                    built.add(path);
                }
                const missing = [...built].filter((p) => !listed.has(p)).sort();
                const stale = [...listed].filter((p) => !built.has(p) && !ignored(p)).sort();
                if (missing.length === 0 && stale.length === 0) {
                    log.info(`[sitemap-coverage] OK — ${built.size} pages, ${listed.size} sitemap URLs, full coverage`);
                    return;
                }
                const lines = [
                    ...missing.map((p) => `  MISSING  ${display(p)} — built but not in any sitemap`),
                    ...stale.map((p) => `  STALE    ${display(p)} — in a sitemap but not built`),
                ];
                fail(`[sitemap-coverage] mismatch (${missing.length} missing, ${stale.length} stale):\n${lines.join("\n")}`);
            },
        },
    };
}
