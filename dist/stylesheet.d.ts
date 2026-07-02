export type XslStrings = {
    title: string;
    subtitle: string;
    indexNote: string;
    urlsNote: string;
    colSitemap: string;
    colUrl: string;
    colFreq: string;
    colPriority: string;
    colLastmod: string;
    footer: string;
    /** Generator note (Yoast-style). Use {c} for the component link and {s} for the sitemaps.org link. */
    poweredBy: string;
};
export declare const XSL_STRINGS: Record<string, XslStrings>;
export type StylesheetOptions = {
    /** UI language (key in XSL_STRINGS). Default "en". */
    lang?: string;
    /** Brand name shown in the header (e.g. "EspecialMundial"). */
    brand?: string;
    /** Accent color (header underline, links). Default "#2563eb". */
    accent?: string;
    /** Ink (text) color. Default "#13201a". */
    ink?: string;
    /** Override any label. */
    strings?: Partial<XslStrings>;
};
/** Build the XSL stylesheet string. Serve with content-type "text/xsl". */
export declare function buildStylesheet(opts?: StylesheetOptions): string;
