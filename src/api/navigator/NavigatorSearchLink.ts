/** The tab a search link opens when it names none. */
const DEFAULT_SEARCH_CODE = 'hotel_view';

/**
 * What a `navigator/search/...` link searches for: `[tab, text]`. A link that starts with a navigator tab
 * (`navigator/search/myworld_view`, `navigator/search/hotel_view/owner:Name`) opens that tab with the rest as its
 * text; any other link (`navigator/search/popular`) is a text search of the hotel view, as before. Without this the
 * tab's name was sent as the text, so "My rooms" searched the hotel for rooms called "myworld_view".
 */
export const parseNavigatorSearchLink = (segments: readonly string[]): { code: string; filter: string } => {
    const [first = '', ...rest] = segments;

    if (/^[a-z]+_view$/.test(first)) return { code: first, filter: rest.join('/') };

    return { code: DEFAULT_SEARCH_CODE, filter: segments.join('/') };
};
