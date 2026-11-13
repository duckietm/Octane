/**
 * Whether a response body is a whole web page and not a help page. A single-page server answers a missing file
 * with its own index document and status 200, which would otherwise be shown as the help page.
 */
export const isWebDocument = (text: string): boolean => /^\s*(<!doctype\s+html|<html[\s>])/i.test(text);

/**
 * The text of the first of `links` that holds a help page, or null when none does. Empty links are skipped and a
 * link is only tried once.
 */
export const fetchHabboPage = async (links: ReadonlyArray<string | null>, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<string | null> => {
    const tried = new Set<string>();

    for (const link of links) {
        if (!link || tried.has(link)) continue;

        tried.add(link);

        try {
            const response = await fetcher(link, { signal });

            if (signal.aborted) return null;
            if (!response?.ok) continue;

            const text = await response.text();

            if (text && !isWebDocument(text)) return text;
        } catch (error) {
            if (signal.aborted) return null;
        }
    }

    return null;
};
