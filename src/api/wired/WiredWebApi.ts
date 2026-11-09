/**
 * The Variables Web API add-on (`wf_xtra_var_web_api`, layout code 128). String param
 * `readKey \t writeKey`, int params `[bulkDelete]`. The server mints the keys (packet 2819 / 59);
 * on save it only keeps a key it already holds or clears it.
 */

export const WEB_API_BOX_CLASSNAME = 'wf_xtra_var_web_api';

const KEY_SEPARATOR = '\t';

export interface WebApiBoxParams {
    readKey: string;
    writeKey: string;
    bulkDelete: boolean;
}

export const parseWebApiBoxParams = (stringData: string | null | undefined, intData: number[] | null | undefined): WebApiBoxParams => {
    const [readKey = '', writeKey = ''] = (stringData ?? '').split(KEY_SEPARATOR);

    return {
        readKey: readKey.trim(),
        writeKey: writeKey.trim(),
        bulkDelete: !!writeKey.trim() && intData?.length > 0 && intData[0] === 1
    };
};

/** Bulk delete rides on the write key; without one it is always off. */
export const canAllowBulkDelete = (writeKey: string): boolean => !!writeKey;

/** Kept keys go back as a marker, never as the key: the server keeps what it holds, and a save packet never carries a secret. */
export const KEPT_KEY_MARKER = '*';

const keyForSave = (key: string | null | undefined): string => (key ? KEPT_KEY_MARKER : '');

export const buildWebApiBoxParams = (params: WebApiBoxParams): { stringParam: string; intParams: number[] } => ({
    stringParam: [keyForSave(params.readKey), keyForSave(params.writeKey)].join(KEY_SEPARATOR),
    intParams: [params.bulkDelete && canAllowBulkDelete(params.writeKey) ? 1 : 0]
});

export const isWebApiBoxClassName = (className: string | null | undefined): boolean => (className ?? '').toLowerCase() === WEB_API_BOX_CLASSNAME;

/**
 * Hotel texts carry `\n` as two characters and may point at another text with `${key}`.
 * Unresolved references stay as they are.
 */
export const expandLocalizedText = (text: string, resolve: (key: string) => string | null): string =>
    (text ?? '')
        .replace(/\$\{([^}]+)\}/g, (match, key: string) => {
            const value = resolve(key);

            return value && value !== key ? value : match;
        })
        .replace(/\\n/g, '\n');

export interface WebApiHotel {
    name: string;
    url: string;
}

const trimTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

export const normalizeWebApiBaseUrl = (value: unknown): string | null => {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
        const url = new URL(value.trim());

        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (url.username || url.password) return null;

        return trimTrailingSlashes(`${url.origin}${url.pathname}`);
    } catch {
        return null;
    }
};

/** `ws(s)://host:port/...` to `http(s)://host:port`: the API shares the websocket's host and port. */
export const webApiBaseFromSocketUrl = (socketUrl: unknown): string | null => {
    if (typeof socketUrl !== 'string' || !socketUrl.trim()) return null;

    try {
        const url = new URL(socketUrl.trim());
        let protocol: string;

        switch (url.protocol) {
            case 'wss:':
            case 'https:':
                protocol = 'https:';
                break;
            case 'ws:':
            case 'http:':
                protocol = 'http:';
                break;
            default:
                return null;
        }

        return `${protocol}//${url.host}`;
    } catch {
        return null;
    }
};

/** `wired.webapi.hotels`, dropping entries without a usable http(s) url; falls back to the current hotel. */
export const resolveWebApiHotels = (configured: unknown, fallback: WebApiHotel | null): WebApiHotel[] => {
    const hotels: WebApiHotel[] = [];

    if (Array.isArray(configured)) {
        for (const entry of configured) {
            if (!entry || typeof entry !== 'object') continue;

            const url = normalizeWebApiBaseUrl((entry as { url?: unknown }).url);

            if (!url || hotels.some((hotel) => hotel.url === url)) continue;

            const name = (entry as { name?: unknown }).name;

            hotels.push({ name: typeof name === 'string' && name.trim() ? name.trim() : url, url });
        }
    }

    if (!hotels.length && fallback) {
        const url = normalizeWebApiBaseUrl(fallback.url);

        if (url) hotels.push({ name: fallback.name || url, url });
    }

    return hotels;
};

export const resolveWebApiDocsUrl = (configured: unknown, baseUrl: string | null): string => {
    const docs = normalizeWebApiBaseUrl(configured);

    if (docs) return typeof configured === 'string' && configured.trim().endsWith('/') ? `${docs}/` : docs;

    return baseUrl ? `${baseUrl}/api/public/api-docs/` : '';
};
