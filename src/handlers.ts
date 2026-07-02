// sitemap-pro · endpoint factories
// Return web-standard GET handlers that work unchanged as Astro endpoints
// (`export const GET = ...`) or Next.js route handlers (`export function GET`).
import {
  renderIndex,
  renderUrlset,
  xmlResponse,
  type RenderOptions,
  type SitemapUrl,
  type SubSitemap,
} from "./core";
import { buildStylesheet, type StylesheetOptions } from "./stylesheet";

type Handler = () => Response;

/** GET handler for the sitemap index. Pass a function so data is read at request/build time. */
export function sitemapIndexHandler(
  getSubs: () => SubSitemap[],
  opts?: RenderOptions,
): Handler {
  return () => xmlResponse(renderIndex(getSubs(), opts));
}

/** GET handler for one sub-sitemap (<urlset>). */
export function urlsetHandler(
  getUrls: () => SitemapUrl[],
  opts?: RenderOptions,
): Handler {
  return () => xmlResponse(renderUrlset(getUrls(), opts));
}

/** GET handler that serves the XSL stylesheet (content-type text/xsl). */
export function stylesheetHandler(opts?: StylesheetOptions): Handler {
  return () =>
    new Response(buildStylesheet(opts), {
      headers: { "content-type": "text/xsl; charset=utf-8" },
    });
}
