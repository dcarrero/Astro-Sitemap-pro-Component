// sitemap-pro · endpoint factories
// Return web-standard GET handlers that work unchanged as Astro endpoints
// (`export const GET = ...`) or Next.js route handlers (`export function GET`).
// Getters may be sync or async (e.g. Astro's getCollection) — the handler awaits them.
import { renderIndex, renderUrlset, xmlResponse, } from "./core";
import { buildStylesheet } from "./stylesheet";
/** GET handler for the sitemap index. Pass a function so data is read at request/build time. */
export function sitemapIndexHandler(getSubs, opts) {
    return async () => xmlResponse(renderIndex(await getSubs(), opts));
}
/** GET handler for one sub-sitemap (<urlset>). */
export function urlsetHandler(getUrls, opts) {
    return async () => xmlResponse(renderUrlset(await getUrls(), opts));
}
/** GET handler that serves the XSL stylesheet (content-type text/xsl). */
export function stylesheetHandler(opts) {
    return async () => new Response(buildStylesheet(opts), {
        headers: { "content-type": "text/xsl; charset=utf-8" },
    });
}
