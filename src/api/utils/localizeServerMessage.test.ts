import { describe, expect, it, vi } from 'vitest';

const texts: Record<string, string> = {
    'api.message.invalid_email_address': 'Adresse e-mail invalide.',
    'api.message.too_many_requests_retry_in': 'Trop de requêtes. Réessaie dans %seconds% s.'
};

vi.mock('./LocalizeText', () => ({
    LocalizeText: (key: string, params: string[] | null, values: string[] | null) => {
        let text = texts[key] ?? key;

        params?.forEach((param, index) => (text = text.replace(`%${param}%`, values[index])));

        return text;
    }
}));

const { getServerMessageKey, localizeServerMessage } = await import('./localizeServerMessage');

describe('localizeServerMessage', () => {
    it('keys a sentence by its words', () => {
        expect(getServerMessageKey('Invalid email address.').key).toBe('api.message.invalid_email_address');
        expect(getServerMessageKey('Rename already in progress — please wait.').key).toBe('api.message.rename_already_in_progress_please_wait');
    });

    it('translates a known sentence and keeps an unknown one', () => {
        expect(localizeServerMessage('Invalid email address.')).toBe('Adresse e-mail invalide.');
        expect(localizeServerMessage('Something new.')).toBe('Something new.');
    });

    it('keeps the number of a sentence matched by pattern', () => {
        expect(localizeServerMessage('Too many requests. Try again in 12s.')).toBe('Trop de requêtes. Réessaie dans 12 s.');
        expect(getServerMessageKey('You can rename again in 3 days.')).toEqual({ key: 'api.message.rename_again_in_days', params: ['count'], values: ['3'] });
    });

    it('uses the fallback without a message', () => {
        expect(localizeServerMessage(undefined, 'Unable to create your account.')).toBe('Unable to create your account.');
        expect(localizeServerMessage('   ', 'Fallback')).toBe('Fallback');
    });
});
