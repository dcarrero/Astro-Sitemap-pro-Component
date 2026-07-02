import { type RenderOptions, type SitemapUrl, type SubSitemap } from "./core";
import { type StylesheetOptions } from "./stylesheet";
type MaybePromise<T> = T | Promise<T>;
type Handler = () => Promise<Response>;
/** GET handler for the sitemap index. Pass a function so data is read at request/build time. */
export declare function sitemapIndexHandler(getSubs: () => MaybePromise<SubSitemap[]>, opts?: RenderOptions): Handler;
/** GET handler for one sub-sitemap (<urlset>). */
export declare function urlsetHandler(getUrls: () => MaybePromise<SitemapUrl[]>, opts?: RenderOptions): Handler;
/** GET handler that serves the XSL stylesheet (content-type text/xsl). */
export declare function stylesheetHandler(opts?: StylesheetOptions): Handler;
export {};
