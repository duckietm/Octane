import { getAccessToken } from '../auth/accessToken';

const trimSlash = (value: string) => value.replace(/\/$/, '');

const resolveBaseUrl = (): string => {
    const mode = (window as any).OctaneClientMode;

    if (mode && typeof mode.apiBaseUrl === 'string' && mode.apiBaseUrl.length) return trimSlash(mode.apiBaseUrl);

    const configured = (window as any).OctaneSecureApiUrl;

    if (typeof configured === 'string' && configured.length) return trimSlash(configured);

    return trimSlash(window.location.origin);
};

const buildUrl = (path: string): string => {
    const base = resolveBaseUrl();
    const normalized = path.startsWith('/') ? path : `/${path}`;

    return `${base}${normalized}`;
};

const authHeader = (): Record<string, string> => {
    const token = getAccessToken();

    return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface HousekeepingRequestInit {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
    signal?: AbortSignal;
}

const appendQuery = (url: string, query?: HousekeepingRequestInit['query']): string => {
    if (!query) return url;

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;

        params.set(key, String(value));
    }

    const qs = params.toString();

    return qs.length ? `${url}?${qs}` : url;
};

/**
 * Thin HTTP wrapper for the admin/housekeeping endpoints. Backed by the
 * same `apiBaseUrl` the secure-asset layer uses, with the user's
 * persisted access token attached as a bearer.
 *
 * Server is expected to expose REST endpoints under
 * `${apiBaseUrl}/api/housekeeping/...`. The shape mirrors what
 * Arcturus-style admin panels already publish, so a server-side
 * implementation is incremental rather than greenfield.
 */
export const housekeepingFetch = async <T = unknown>(path: string, init: HousekeepingRequestInit = {}): Promise<T> => {
    const { method = 'GET', body = undefined, query = undefined, signal = undefined } = init;
    const url = appendQuery(buildUrl(path), query);

    const response = await fetch(url, {
        method,
        signal,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...authHeader()
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'include'
    });

    if (!response.ok) {
        let detail = '';

        try {
            const text = await response.text();
            detail = text || '';
        } catch {}

        throw new HousekeepingHttpError(response.status, response.statusText, detail, url);
    }

    if (response.status === 204) return undefined;

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) return undefined;

    return await response.json();
};

export class HousekeepingHttpError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly detail: string;
    public readonly url: string;

    constructor(status: number, statusText: string, detail: string, url: string) {
        super(`HK HTTP ${status} ${statusText}: ${detail || url}`);
        this.name = 'HousekeepingHttpError';
        this.status = status;
        this.statusText = statusText;
        this.detail = detail;
        this.url = url;
    }
}
