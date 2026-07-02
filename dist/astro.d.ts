export type CoverageOptions = {
    /** Filename of the sitemap index (or a single urlset) in the build output. Default "sitemap.xml". */
    index?: string;
    /**
     * Pathnames to skip, normalized without leading/trailing slashes (root = "").
     * Applied to both built pages and sitemap entries. E.g. `(p) => p === "offline"`.
     */
    ignore?: (pathname: string) => boolean;
    /** Throw (fail the build) on any mismatch. Default true; false only logs a warning. */
    strict?: boolean;
};
type Logger = {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
};
type BuildDoneParams = {
    dir: URL;
    pages: {
        pathname: string;
    }[];
    logger?: Logger;
};
/**
 * Astro integration. After the build, verify that every generated HTML page is listed
 * in the sitemap (following the index into its sub-sitemaps) and vice versa.
 *
 *   import { sitemapCoverage } from "astro-sitemap-pro-component/astro";
 *   export default defineConfig({ integrations: [sitemapCoverage({ ignore: (p) => p === "offline" })] });
 */
export declare function sitemapCoverage(opts?: CoverageOptions): {
    name: string;
    hooks: {
        "astro:build:done": ({ dir, pages, logger }: BuildDoneParams) => Promise<void>;
    };
};
export {};
