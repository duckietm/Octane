import { beforeEach, describe, expect, it, vi } from 'vitest';

const texts: Record<string, string> = {};

vi.mock('../../../api', () => ({
    LocalizeText: (key: string, params: string[] | null, replacements: string[] | null) => {
        let value = texts[key] ?? key;

        params?.forEach((param, index) => (value = value.replace(`%${param}%`, replacements[index])));

        return value;
    }
}));

vi.mock('@octane/renderer', () => ({ GetConfiguration: () => ({ interpolate: (value: string) => value }) }));

const { tOrServer } = await import('./i18n');

describe('tOrServer', () => {
    beforeEach(() => {
        for (const key of Object.keys(texts)) delete texts[key];
    });

    it('prefers the hotel translation to the server message', () => {
        texts['nitro.login.register.success'] = 'Bienvenue à bord, %username% !';

        expect(tOrServer('nitro.login.register.success', 'Welcome aboard, Kim!', 'Welcome, %username%!', ['username'], ['Kim'])).toBe('Bienvenue à bord, Kim !');
    });

    it('uses the server message when the hotel has no text', () => {
        expect(tOrServer('nitro.login.register.success', 'Welcome aboard, Kim!', 'Welcome, %username%!', ['username'], ['Kim'])).toBe('Welcome aboard, Kim!');
    });

    it('falls back to the default text without either', () => {
        expect(tOrServer('nitro.login.register.success', undefined, 'Welcome, %username%!', ['username'], ['Kim'])).toBe('Welcome, Kim!');
    });
});
