import { localizeWithFallback } from './localizeWithFallback';

/**
 * The emulator's HTTP API (login, registration, account settings, custom badges) answers with English sentences.
 * Each known sentence has a text key, `api.message.<sentence as snake case>`, so the hotel can translate it; the
 * ones carrying a number are matched by pattern and keep the number as a placeholder. A sentence without a
 * translation is shown as the server sent it.
 */
const PATTERNS: { pattern: RegExp; key: string; params: string[] }[] = [
    { pattern: /^Too many requests\. Try again in (\d+)s\.$/, key: 'too_many_requests_retry_in', params: ['seconds'] },
    { pattern: /^Too many attempts\. Try again in (\d+)s\.$/, key: 'too_many_attempts_retry_in', params: ['seconds'] },
    { pattern: /^This IP has reached the maximum of (\d+) registered accounts\.$/, key: 'ip_account_limit', params: ['max'] },
    { pattern: /^You can rename again in (\d+) days?\.$/, key: 'rename_again_in_days', params: ['count'] },
    { pattern: /^You can rename again in (\d+) hours?\.$/, key: 'rename_again_in_hours', params: ['count'] },
    { pattern: /^You can rename again in less than an hour\.$/, key: 'rename_again_soon', params: [] }
];

export const getServerMessageKey = (message: string): { key: string; params: string[]; values: string[] } => {
    for (const { pattern, key, params } of PATTERNS) {
        const match = message.match(pattern);

        if (match) return { key: `api.message.${key}`, params, values: match.slice(1) };
    }

    const words = message.toLowerCase().match(/[a-z0-9]+/g) ?? [];

    return { key: `api.message.${words.slice(0, 10).join('_')}`, params: [], values: [] };
};

/** The hotel's text for a server sentence, the sentence itself without one, or `fallback` when there is none. */
export const localizeServerMessage = (message: unknown, fallback: string = ''): string => {
    if (typeof message !== 'string' || !message.trim()) return fallback;

    const { key, params, values } = getServerMessageKey(message.trim());

    return localizeWithFallback(key, message, params.length ? params : null, params.length ? values : null);
};
