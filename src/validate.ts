// sitemap-pro · validation (pure, edge-safe)
// Lint SitemapUrl lists against the most common sitemap mistakes from the SEO/GEO
// checklist: duplicate <loc>, non-absolute or tracking-param URLs, and a uniform
// lastmod across many URLs — the "new Date() on every build" antipattern that
// makes Google/Bing distrust (and eventually ignore) your lastmod. Returns issues;
// never logs or throws — call it in dev/CI and print what you want. The Astro
// coverage integration runs this automatically on the built sitemaps.

import type { SitemapUrl } from "./core";

export type IssueLevel = "error" | "warn";

export type SitemapIssue = {
  level: IssueLevel;
  code:
    | "duplicate-loc"
    | "non-absolute-loc"
    | "tracking-param"
    | "uniform-lastmod";
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

// Unambiguous tracking parameters. Deliberately conservative — "ref" and friends
// are excluded because they are often legitimate application params.
const DEFAULT_TRACKING = ["utm_", "gclid", "fbclid", "msclkid", "yclid", "mc_eid", "mc_cid"];

function iso(d: string | Date | undefined): string | undefined {
  if (d == null) return undefined;
  return typeof d === "string" ? d : d.toISOString();
}

/**
 * Lint a urlset. Returns issues (empty array = clean). Pure: no I/O, no logging.
 * `error`-level issues are real defects; `warn`-level ones may be intentional
 * (e.g. a fixed lastmod is fine for static reference content).
 */
export function validateUrls(urls: SitemapUrl[], opts: ValidateOptions = {}): SitemapIssue[] {
  const issues: SitemapIssue[] = [];
  const tracking = opts.trackingParams ?? DEFAULT_TRACKING;
  const uniformMin = opts.uniformLastmodMin ?? 3;

  // Duplicate <loc> — a content should map to exactly one canonical URL.
  const seen = new Set<string>();
  for (const u of urls) {
    if (seen.has(u.loc)) {
      issues.push({ level: "error", code: "duplicate-loc", message: `Duplicate <loc>: ${u.loc}`, loc: u.loc });
    }
    seen.add(u.loc);
  }

  // Non-absolute / tracking-param locs — sitemaps must list clean, absolute canonicals.
  for (const u of urls) {
    let url: URL | null = null;
    try {
      url = new URL(u.loc);
    } catch {
      url = null;
    }
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
      issues.push({
        level: "error",
        code: "non-absolute-loc",
        message: `<loc> is not an absolute http(s) URL: ${u.loc}`,
        loc: u.loc,
      });
      continue;
    }
    const bad = [...url.searchParams.keys()].find((k) =>
      tracking.some((t) => k.toLowerCase().startsWith(t)),
    );
    if (bad) {
      issues.push({
        level: "warn",
        code: "tracking-param",
        message: `<loc> carries a tracking param "${bad}" — list the canonical URL instead: ${u.loc}`,
        loc: u.loc,
      });
    }
  }

  // Uniform lastmod across many URLs — the #1 sitemap antipattern. Only a smell,
  // not a certain bug: a fixed date is correct for static reference content.
  const stamps = urls.map((u) => iso(u.lastmod)).filter((v): v is string => v != null);
  if (stamps.length >= uniformMin && stamps.length === urls.length) {
    const first = stamps[0];
    if (stamps.every((s) => s === first)) {
      issues.push({
        level: "warn",
        code: "uniform-lastmod",
        message:
          `All ${urls.length} URLs share the same lastmod (${first}). ` +
          `If that is a build-time timestamp, search engines will distrust it — ` +
          `use each page's real change date (a fixed date is fine only for static reference content).`,
      });
    }
  }

  return issues;
}
