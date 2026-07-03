// sitemap-pro · validation (pure, edge-safe)
// Lint SitemapUrl lists against the most common sitemap mistakes from the SEO/GEO
// checklist: duplicate <loc>, non-absolute or tracking-param URLs, and a uniform
// lastmod across many URLs — the "new Date() on every build" antipattern that
// makes Google/Bing distrust (and eventually ignore) your lastmod. Returns issues;
// never logs or throws — call it in dev/CI and print what you want. The Astro
// coverage integration runs this automatically on the built sitemaps.
// Unambiguous tracking parameters. Deliberately conservative — "ref" and friends
// are excluded because they are often legitimate application params.
const DEFAULT_TRACKING = ["utm_", "gclid", "fbclid", "msclkid", "yclid", "mc_eid", "mc_cid"];
const CHANGE_FREQS = new Set([
    "always", "hourly", "daily", "weekly", "monthly", "yearly", "never",
]);
// W3C datetime (sitemaps.org lastmod): a date, optionally with time and timezone.
const W3C_DATE = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?)?$/;
function iso(d) {
    if (d == null)
        return undefined;
    return typeof d === "string" ? d : d.toISOString();
}
/**
 * Lint a urlset. Returns issues (empty array = clean). Pure: no I/O, no logging.
 * `error`-level issues are real defects; `warn`-level ones may be intentional
 * (e.g. a fixed lastmod is fine for static reference content).
 */
export function validateUrls(urls, opts = {}) {
    const issues = [];
    const tracking = opts.trackingParams ?? DEFAULT_TRACKING;
    const uniformMin = opts.uniformLastmodMin ?? 3;
    const checkHreflang = opts.checkHreflang ?? true;
    const checkValues = opts.checkValues ?? true;
    // Duplicate <loc> — a content should map to exactly one canonical URL.
    const seen = new Set();
    for (const u of urls) {
        if (seen.has(u.loc)) {
            issues.push({ level: "error", code: "duplicate-loc", message: `Duplicate <loc>: ${u.loc}`, loc: u.loc });
        }
        seen.add(u.loc);
    }
    // Non-absolute / tracking-param locs — sitemaps must list clean, absolute canonicals.
    for (const u of urls) {
        let url = null;
        try {
            url = new URL(u.loc);
        }
        catch {
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
        const bad = [...url.searchParams.keys()].find((k) => tracking.some((t) => k.toLowerCase().startsWith(t)));
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
    const stamps = urls.map((u) => iso(u.lastmod)).filter((v) => v != null);
    if (stamps.length >= uniformMin && stamps.length === urls.length) {
        const first = stamps[0];
        if (stamps.every((s) => s === first)) {
            issues.push({
                level: "warn",
                code: "uniform-lastmod",
                message: `All ${urls.length} URLs share the same lastmod (${first}). ` +
                    `If that is a build-time timestamp, search engines will distrust it — ` +
                    `use each page's real change date (a fixed date is fine only for static reference content).`,
            });
        }
    }
    // Value / format checks: priority range, changefreq enum, lastmod format.
    if (checkValues) {
        for (const u of urls) {
            if (u.priority != null && (u.priority < 0 || u.priority > 1)) {
                issues.push({
                    level: "error",
                    code: "invalid-priority",
                    message: `priority must be between 0.0 and 1.0, got ${u.priority}: ${u.loc}`,
                    loc: u.loc,
                });
            }
            if (u.changefreq != null && !CHANGE_FREQS.has(u.changefreq)) {
                issues.push({
                    level: "error",
                    code: "invalid-changefreq",
                    message: `changefreq "${u.changefreq}" is not a valid value: ${u.loc}`,
                    loc: u.loc,
                });
            }
            if (typeof u.lastmod === "string" && !W3C_DATE.test(u.lastmod)) {
                issues.push({
                    level: "warn",
                    code: "invalid-lastmod",
                    message: `lastmod "${u.lastmod}" is not a W3C datetime (use e.g. 2026-07-03 or an ISO timestamp): ${u.loc}`,
                    loc: u.loc,
                });
            }
        }
    }
    // hreflang checks: duplicates, self-reference, x-default, and reciprocity within this set.
    if (checkHreflang) {
        const byLoc = new Map(urls.map((u) => [u.loc, u]));
        for (const u of urls) {
            const alts = u.alternates ?? [];
            if (alts.length === 0)
                continue;
            const langAlts = alts.filter((a) => a.hreflang !== "x-default");
            // Duplicate hreflang code within one URL's alternates.
            const langs = new Set();
            for (const a of alts) {
                if (langs.has(a.hreflang)) {
                    issues.push({
                        level: "error",
                        code: "hreflang-duplicate",
                        message: `Duplicate hreflang "${a.hreflang}" in alternates of ${u.loc}`,
                        loc: u.loc,
                    });
                }
                langs.add(a.hreflang);
            }
            // Missing self-reference — Google recommends each page list itself among its alternates.
            if (langAlts.length > 0 && !alts.some((a) => a.href === u.loc)) {
                issues.push({
                    level: "warn",
                    code: "hreflang-no-self",
                    message: `No self-referencing hreflang alternate for ${u.loc}`,
                    loc: u.loc,
                });
            }
            // Missing x-default when there are 2+ language versions.
            if (langAlts.length > 1 && !alts.some((a) => a.hreflang === "x-default")) {
                issues.push({
                    level: "warn",
                    code: "hreflang-no-x-default",
                    message: `No x-default hreflang for ${u.loc} (${langAlts.length} language versions)`,
                    loc: u.loc,
                });
            }
            // Reciprocity — only checkable for targets present in THIS urlset (split-by-language
            // sitemaps point at other files, which we skip rather than false-flag).
            for (const a of langAlts) {
                if (a.href === u.loc)
                    continue;
                const target = byLoc.get(a.href);
                if (!target)
                    continue;
                if (!(target.alternates ?? []).some((b) => b.href === u.loc)) {
                    issues.push({
                        level: "warn",
                        code: "hreflang-non-reciprocal",
                        message: `${u.loc} points to ${a.href} (${a.hreflang}) but it doesn't link back`,
                        loc: u.loc,
                    });
                }
            }
        }
    }
    return issues;
}
