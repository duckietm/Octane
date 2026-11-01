import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from './accessToken';
import { accessTokenRenewalDue, renewAccessTokenIfDue } from './accessTokenRenewal';

vi.mock('@octane/renderer', () => ({
    GetConfiguration: () => ({
        getValue: (_key: string, fallback: string) => fallback,
        interpolate: (value: string) => value.replace('${api.url}', 'https://hotel.example')
    })
}));

// Without "remember me" nothing renewed the access token, so the HTTP features stopped once it expired.
describe('access token renewal', () => {
    const now = () => Math.floor(Date.now() / 1000);

    beforeEach(() => setAccessToken(null));

    it('is due only shortly before the token expires', () => {
        setAccessToken('token', now() + 3600);
        expect(accessTokenRenewalDue()).toBe(false);

        setAccessToken('token', now() + 60);
        expect(accessTokenRenewalDue()).toBe(true);

        setAccessToken('token');
        expect(accessTokenRenewalDue()).toBe(false);
    });

    it('keeps the renewed token', async () => {
        setAccessToken('old', now() + 30);
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ accessToken: 'new', accessTokenExpiresAt: now() + 3600 }), { status: 200 }));

        expect(await renewAccessTokenIfDue(fetchImpl as unknown as typeof fetch)).toBe(true);
        expect(getAccessToken()).toBe('new');
        expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe('https://hotel.example/api/auth/token/renew');
    });

    it('leaves the token alone when the server refuses', async () => {
        setAccessToken('old', now() + 30);
        const fetchImpl = vi.fn(async () => new Response('{}', { status: 401 }));

        expect(await renewAccessTokenIfDue(fetchImpl as unknown as typeof fetch)).toBe(false);
        expect(getAccessToken()).toBe('old');
    });

    it('runs from the session when no login is remembered', () => {
        expect(readFileSync('src/App.tsx', 'utf8')).toContain('window.setInterval(() => void renewAccessTokenIfDue(), 60 * 1000)');
    });
});
