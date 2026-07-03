// sitemap-pro · Astro integration: sitemap coverage + health verification
// Endpoint-based sitemaps (src/pages/sitemap.xml.ts, …) give you full control over
// per-type splitting, hreflang and lastmod — but they can silently drift when new
// page types are added, or list URLs that shouldn't be there. This integration
// closes the loop: after `astro build` it compares every generated HTML page
// against the union of <loc> entries reachable from the sitemap index, AND runs
// health checks on what's listed:
//
//   • MISSING / STALE   — built-but-unlisted pages and listed-but-unbuilt entries
//   • noindex           — a listed page carries <meta name="robots" content="noindex">
//   • canonical         — a listed page's <link rel="canonical"> points elsewhere
//   • lint              — duplicate/non-absolute/tracking-param <loc>, uniform lastmod
//
// Node-only (reads the build output from disk) — exported from "./astro", NOT from
// the package root, so the core stays usable in edge runtimes.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateUrls, type SitemapIssue } from "./validate.js";

export type CoverageOptions = {
  /** Filename of the sitemap index (or a single urlset) in the build output. Default "sitemap.xml". */
  index?: string;
  /**
   * Pathnames to skip, normalized without leading/trailing slashes (root = "").
   * Applied to both built pages and sitemap entries. E.g. `(p) => p === "offline"`.
   */
  ignore?: (pathname: string) => boolean;
  /** Throw (fail the build) on any ERROR-level issue. Default true; false only logs. */
  strict?: boolean;
  /** Flag listed pages that render as <meta name="robots" content="noindex">. Default true. */
  checkNoindex?: boolean;
  /** Flag listed pages whose <link rel="canonical"> points to a different URL. Default true. */
  checkCanonical?: boolean;
  /** Run validateUrls() on the parsed sitemap entries (per sub-sitemap). Default true. */
  lint?: boolean;
};

type Logger = { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
type BuildDoneParams = { dir: URL; pages: { pathname: string }[]; logger?: Logger };

/** Normalize a pathname for set comparison: decoded, no leading/trailing slashes ("" = root). */
function norm(pathname: string): string {
  let s = pathname.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* not URL-encoded — compare as-is */
  }
  return s.replace(/^\/+|\/+$/g, "");
}

/** Pages whose last segment has an extension are endpoints (robots.txt, *.xml…), not HTML pages. */
function isHtmlPage(pathname: string): boolean {
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  return !last.includes(".");
}

const DEFAULT_IGNORE = /^(404|500)$/;

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]!);
}

/** Parse <url> blocks into minimal entries for linting (loc + optional lastmod). */
function parseEntries(xml: string): { loc: string; lastmod?: string }[] {
  const out: { loc: string; lastmod?: string }[] = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const inner = block[1]!;
    const loc = inner.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
    if (!loc) continue;
    const lastmod = inner.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1];
    out.push(lastmod ? { loc, lastmod } : { loc });
  }
  return out;
}

/** Does the HTML mark itself noindex via a robots (or googlebot) meta tag? */
function hasNoindex(html: string): boolean {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  return metas.some(
    (t) => /name\s*=\s*["'](?:robots|googlebot)["']/i.test(t) && /\bnoindex\b/i.test(t),
  );
}

/** The <link rel="canonical"> href, if present. */
function extractCanonical(html: string): string | undefined {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = links.find((t) => /rel\s*=\s*["']canonical["']/i.test(t));
  return tag?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
}

const display = (p: string) => (p === "" ? "/" : `/${p}/`);

/**
 * Astro integration. After the build, verify that every generated HTML page is listed
 * in the sitemap (following the index into its sub-sitemaps) and vice versa, then run
 * SEO health checks on the listed URLs.
 *
 *   import { sitemapCoverage } from "astro-sitemap-pro-component/astro";
 *   export default defineConfig({ integrations: [sitemapCoverage({ ignore: (p) => p === "offline" })] });
 */
export function sitemapCoverage(opts: CoverageOptions = {}) {
  const indexName = opts.index ?? "sitemap.xml";
  const strict = opts.strict ?? true;
  const checkNoindex = opts.checkNoindex ?? true;
  const checkCanonical = opts.checkCanonical ?? true;
  const lint = opts.lint ?? true;
  const ignored = (p: string) => DEFAULT_IGNORE.test(p) || (opts.ignore?.(p) ?? false);

  return {
    name: "astro-sitemap-pro-component/coverage",
    hooks: {
      "astro:build:done": async ({ dir, pages, logger }: BuildDoneParams) => {
        const out = fileURLToPath(dir);
        const log: Logger = logger ?? console;
        const errors: string[] = [];
        const warnings: string[] = [];

        const readXml = async (name: string): Promise<string | null> => {
          try {
            return await readFile(join(out, name), "utf8");
          } catch {
            return null;
          }
        };
        // Locate a built HTML file for a pathname across Astro's build.format layouts.
        const readHtml = async (path: string): Promise<string | null> => {
          const candidates =
            path === ""
              ? ["index.html"]
              : [join(path, "index.html"), `${path}.html`];
          for (const c of candidates) {
            try {
              return await readFile(join(out, c), "utf8");
            } catch {
              /* try next */
            }
          }
          return null;
        };

        const indexXml = await readXml(indexName);
        if (indexXml == null) {
          const msg = `[sitemap-coverage] ${indexName} not found in build output (${out})`;
          if (strict) throw new Error(msg);
          log.warn(msg);
          return;
        }

        // Union of <loc> pathnames; when the entry file is a <sitemapindex>, follow each
        // sub-sitemap. We also keep per-sub parsed entries (for linting) and each listed
        // pathname's absolute loc (for the canonical check).
        const listed = new Set<string>();
        const locByPath = new Map<string, string>();
        const perSub: { name: string; entries: { loc: string; lastmod?: string }[] }[] = [];

        const ingest = (name: string, xml: string) => {
          const entries = parseEntries(xml);
          perSub.push({ name, entries });
          for (const e of entries) {
            const path = norm(new URL(e.loc).pathname);
            listed.add(path);
            if (!locByPath.has(path)) locByPath.set(path, e.loc);
          }
        };

        if (/<sitemapindex[\s>]/.test(indexXml)) {
          for (const loc of extractLocs(indexXml)) {
            const subName = norm(new URL(loc).pathname);
            const subXml = await readXml(subName);
            if (subXml == null) {
              errors.push(`sub-sitemap "${subName}" is listed in ${indexName} but was not built`);
              continue;
            }
            ingest(subName, subXml);
          }
        } else {
          ingest(indexName, indexXml);
        }

        const built = new Set<string>();
        for (const p of pages) {
          const path = norm(p.pathname);
          if (!isHtmlPage(path) || ignored(path)) continue;
          built.add(path);
        }

        // --- Coverage: built-but-unlisted (MISSING) and listed-but-unbuilt (STALE) ---
        for (const p of [...built].filter((p) => !listed.has(p)).sort()) {
          errors.push(`MISSING  ${display(p)} — built but not in any sitemap`);
        }
        for (const p of [...listed].filter((p) => !built.has(p) && !ignored(p)).sort()) {
          errors.push(`STALE    ${display(p)} — in a sitemap but not built`);
        }

        // --- Lint: per sub-sitemap (duplicate/non-absolute/tracking/uniform-lastmod) ---
        if (lint) {
          for (const sub of perSub) {
            for (const issue of validateUrls(sub.entries) as SitemapIssue[]) {
              const line = `${issue.code.toUpperCase()}  [${sub.name}] ${issue.message}`;
              (issue.level === "error" ? errors : warnings).push(line);
            }
          }
          // Cross-file duplicates: the same URL listed in more than one sub-sitemap.
          const counts = new Map<string, number>();
          for (const sub of perSub) for (const e of sub.entries) counts.set(e.loc, (counts.get(e.loc) ?? 0) + 1);
          for (const [loc, n] of counts) {
            if (n > 1) warnings.push(`DUPLICATE-ACROSS  ${loc} — listed in ${n} sub-sitemaps`);
          }
        }

        // --- Health: read the HTML of listed pages that were built (noindex / canonical) ---
        if (checkNoindex || checkCanonical) {
          const toCheck = [...listed].filter((p) => built.has(p)).sort();
          for (const path of toCheck) {
            const html = await readHtml(path);
            if (html == null) continue; // dynamic/SSR page or unusual layout — skip
            if (checkNoindex && hasNoindex(html)) {
              errors.push(`NOINDEX  ${display(path)} — listed in a sitemap but marked noindex`);
            }
            if (checkCanonical) {
              const href = extractCanonical(html);
              if (href) {
                let canonicalPath: string | null = null;
                try {
                  canonicalPath = norm(new URL(href, locByPath.get(path)).pathname);
                } catch {
                  canonicalPath = null;
                }
                if (canonicalPath != null && canonicalPath !== path) {
                  warnings.push(
                    `CANONICAL  ${display(path)} — canonical points to ${display(canonicalPath)}; a page shouldn't be in the sitemap if it canonicalizes elsewhere`,
                  );
                }
              }
            }
          }
        }

        // --- Report ---
        if (errors.length === 0 && warnings.length === 0) {
          log.info(
            `[sitemap-coverage] OK — ${built.size} pages, ${listed.size} sitemap URLs, full coverage & clean`,
          );
          return;
        }
        if (warnings.length) {
          log.warn(`[sitemap-coverage] ${warnings.length} warning(s):\n${warnings.map((w) => `  ${w}`).join("\n")}`);
        }
        if (errors.length) {
          const msg = `[sitemap-coverage] ${errors.length} error(s):\n${errors.map((e) => `  ${e}`).join("\n")}`;
          if (strict) throw new Error(msg);
          log.warn(msg);
        }
      },
    },
  };
}
