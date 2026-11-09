import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/LocalizeText', () => ({
    LocalizeText: (key: string, parameters: string[] = null, replacements: string[] = null) => {
        const texts: Record<string, string> = { 'wiredfurni.error.usernames_count': 'At most %max_usernames% names!' };
        let text = texts[key] ?? key;

        (parameters ?? []).forEach((parameter, index) => (text = text.replace(`%${parameter}%`, replacements[index])));

        return text;
    }
}));

import { localizeWiredError } from './WiredErrorText';

describe('localizeWiredError', () => {
    it('fills the placeholders with the values the server sent', () => {
        expect(localizeWiredError('wiredfurni.error.usernames_count', [{ key: 'max_usernames', value: '20' }])).toBe('At most 20 names!');
    });

    it('leaves a placeholder the server sent no value for', () => {
        expect(localizeWiredError('wiredfurni.error.usernames_count')).toBe('At most %max_usernames% names!');
    });

    it('falls back to the English text for an untranslated key', () => {
        expect(localizeWiredError('wiredfurni.error.invalid_api_keys')).toBe('Invalid Web API keys');
    });
});
