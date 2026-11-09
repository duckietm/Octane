import { describe, expect, it, vi } from 'vitest';
import { loginTokenSubject, positiveIdFromSearch, takeLoginTokenFromUrl } from './urlToken';

const jwtFor = (sub: number) => `e30.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.sig`;

const at = (search: string) => {
    const replaceState = vi.fn();

    return {
        location: { href: `https://hotel.example/client/${search}` } as Location,
        history: { state: null, replaceState } as unknown as History,
        replaceState
    };
};

describe('takeLoginTokenFromUrl', () => {
    it('returns the token and takes it and its expiry out of the address', () => {
        const { location, history, replaceState } = at('?token=abc&token_exp=4102444800&room=7');

        expect(takeLoginTokenFromUrl(location, history)).toEqual({ token: 'abc', expiresAt: 4102444800 });
        expect(replaceState).toHaveBeenCalledWith(null, '', 'https://hotel.example/client/?room=7');
    });

    it('defaults the expiry to thirty days when none is given', () => {
        const { location, history } = at('?token=abc');
        const result = takeLoginTokenFromUrl(location, history);

        expect(result?.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000) + 29 * 24 * 60 * 60);
    });

    it('leaves an address without a token untouched', () => {
        const { location, history, replaceState } = at('?room=7');

        expect(takeLoginTokenFromUrl(location, history)).toBeNull();
        expect(replaceState).not.toHaveBeenCalled();
    });
});

describe('loginTokenSubject', () => {
    it('reads the account a token belongs to', () => {
        expect(loginTokenSubject(jwtFor(42))).toBe(42);
        expect(loginTokenSubject('not-a-token')).toBeNull();
        expect(loginTokenSubject(undefined)).toBeNull();
    });

    it('reads a room or friend id only when it is a positive whole number', () => {
        expect(positiveIdFromSearch('42')).toBe(42);
        expect(positiveIdFromSearch('abc')).toBe(0);
        expect(positiveIdFromSearch('-3')).toBe(0);
        expect(positiveIdFromSearch('1.5')).toBe(0);
        expect(positiveIdFromSearch(null)).toBe(0);
    });
});
