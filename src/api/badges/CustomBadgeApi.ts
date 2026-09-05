import { GetConfiguration, GetLocalizationManager } from '@octane/renderer';
import { clearAccessToken, getAccessToken } from '../auth';

export interface CustomBadgeRecord {
    badgeId: string;
    badgeCode: string;
    name: string;
    description: string;
    dateCreated: number;
    dateEdit: number;
    url: string;
}

export interface CustomBadgeListResponse {
    badges: CustomBadgeRecord[];
    max: number;
    badgeWidth: number;
    badgeHeight: number;
    maxBadgeSizeBytes: number;
    priceBadge?: number;
    currencyType?: number;
}

export interface CustomBadgeError {
    error: string;
    code?: string;
}

const interpolate = (value: string): string => {
    try {
        return GetConfiguration().interpolate(value);
    } catch {
        return value;
    }
};

const getConfigUrl = (key: string, fallback: string): string => interpolate(GetConfiguration().getValue<string>(key, fallback));

const buildUrl = (key: string, fallback: string, badgeId?: string): string => {
    const template = getConfigUrl(key, fallback);
    if (!badgeId) return template;
    if (template.includes('%badgeId%')) return template.replace(/%badgeId%/g, encodeURIComponent(badgeId));
    return template + (template.endsWith('/') ? '' : '/') + encodeURIComponent(badgeId);
};

const authHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'OctaneCustomBadges'
    };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

const parseJson = async <T>(response: Response): Promise<T> => {
    const text = await response.text();
    if (!text) return {} as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error('Invalid response from server.');
    }
};

const throwOnError = async (response: Response): Promise<void> => {
    if (response.ok) return;
    if (response.status === 401) clearAccessToken();
    const payload = await parseJson<CustomBadgeError>(response);
    const message = payload?.error || `Request failed (${response.status}).`;
    const err = new Error(message) as Error & { status: number; code?: string };
    err.status = response.status;
    if (payload?.code) err.code = payload.code;
    throw err;
};

export const fetchCustomBadges = async (): Promise<CustomBadgeListResponse> => {
    const url = buildUrl('badges.custom.list.endpoint', '/api/badges/custom');
    const response = await fetch(url, { method: 'GET', credentials: 'include', headers: authHeaders() });
    await throwOnError(response);
    return parseJson<CustomBadgeListResponse>(response);
};

export const createCustomBadge = async (body: { name: string; description: string; image: string }): Promise<CustomBadgeRecord> => {
    const url = buildUrl('badges.custom.create.endpoint', '/api/badges/custom');
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    await throwOnError(response);
    return parseJson<CustomBadgeRecord>(response);
};

export const updateCustomBadge = async (badgeId: string, body: { name: string; description: string; image: string }): Promise<CustomBadgeRecord> => {
    const url = buildUrl('badges.custom.update.endpoint', '/api/badges/custom/%badgeId%', badgeId);
    const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    await throwOnError(response);
    return parseJson<CustomBadgeRecord>(response);
};

export const deleteCustomBadge = async (badgeId: string): Promise<void> => {
    const url = buildUrl('badges.custom.delete.endpoint', '/api/badges/custom/%badgeId%', badgeId);
    const response = await fetch(url, { method: 'DELETE', credentials: 'include', headers: authHeaders() });
    await throwOnError(response);
};

export const isCustomBadgeCode = (code: string | null | undefined): boolean => {
    if (!code) return false;
    return /^CUST[A-Z0-9]{5}-\d+$/.test(code);
};

let customBadgeTextsLoadPromise: Promise<void> | null = null;

const injectTextsIntoLocalization = (texts: Record<string, string> | null | undefined): void => {
    if (!texts) return;
    let manager: ReturnType<typeof GetLocalizationManager> | null = null;
    try {
        manager = GetLocalizationManager();
    } catch {
        return;
    }
    if (!manager || typeof manager.setValue !== 'function') return;
    for (const key of Object.keys(texts)) {
        const value = texts[key];
        if (typeof value === 'string') manager.setValue(key, value);
    }
};

export const ensureCustomBadgeTexts = (): Promise<void> => {
    if (customBadgeTextsLoadPromise) return customBadgeTextsLoadPromise;
    customBadgeTextsLoadPromise = (async () => {
        try {
            const url = buildUrl('badges.custom.texts.endpoint', '/api/badges/custom/texts');
            const response = await fetch(url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
            if (!response.ok) return;
            const payload = await parseJson<{ texts: Record<string, string> }>(response);
            injectTextsIntoLocalization(payload.texts);
        } catch {}
    })();
    return customBadgeTextsLoadPromise;
};

export const refreshCustomBadgeTexts = (): Promise<void> => {
    customBadgeTextsLoadPromise = null;
    return ensureCustomBadgeTexts();
};

export const setCustomBadgeText = (badgeId: string, name: string, description: string): void => {
    injectTextsIntoLocalization({
        [`badge_name_${badgeId}`]: name || badgeId,
        [`badge_desc_${badgeId}`]: description || ''
    });
};
