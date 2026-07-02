// sitemap-pro · endpoint factories
// Return web-standard GET handlers that work unchanged as Astro endpoints
// (`export const GET = ...`) or Next.js route handlers (`export function GET`).
// Getters may be sync or async (e.g. Astro's getCollection) — the handler awaits them.
import {
  renderIndex,
  renderUrlset,
  xmlResponse,
  type RenderOptions,
  type SitemapUrl,
  type SubSitemap,
} from "./core";
import { buildStylesheet, type StylesheetOptions } from "./stylesheet";

type MaybePromise<T> = T | Promise<T>;
type Handler = () => Promise<Response>;

/** GET handler for the sitemap index. Pass a function so data is read at request/build time. */
export function sitemapIndexHandler(
  getSubs: () => MaybePromise<SubSitemap[]>,
  opts?: RenderOptions,
): Handler {
  return async () => xmlResponse(renderIndex(await getSubs(), opts));
}

/** GET handler for one sub-sitemap (<urlset>). */
export function urlsetHandler(
  getUrls: () => MaybePromise<SitemapUrl[]>,
  opts?: RenderOptions,
): Handler {
  return async () => xmlResponse(renderUrlset(await getUrls(), opts));
}

/** GET handler that serves the XSL stylesheet (content-type text/xsl). */
export function stylesheetHandler(opts?: StylesheetOptions): Handler {
  return async () =>
    new Response(buildStylesheet(opts), {
      headers: { "content-type": "text/xsl; charset=utf-8" },
    });
}
