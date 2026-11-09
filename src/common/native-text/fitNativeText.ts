const ELLIPSIS = '...';

/**
 * The text shortened to fit a width, ending in "..." as a clipped AIR TextField does: what CSS `text-overflow: ellipsis` asks for,
 * which a raster cannot do itself. Text that fits comes back as it is; when not even the dots fit, the dots alone.
 */
export const fitNativeText = (text: string, width: number, measure: (text: string) => number): string => {
    if (measure(text) <= width) return text;

    let low = 0;
    let high = text.length - 1;

    // The longest start of the text that fits together with the dots.
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);

        if (measure(text.slice(0, middle).trimEnd() + ELLIPSIS) <= width) low = middle;
        else high = middle - 1;
    }

    return text.slice(0, low).trimEnd() + ELLIPSIS;
};
