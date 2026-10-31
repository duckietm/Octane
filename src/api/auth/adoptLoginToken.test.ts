/* @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetRememberLogin, SetRememberLogin } from '../utils/RememberLogin';
import { getAccessToken, setAccessToken } from './accessToken';
import { adoptLoginTokenFromUrl } from './urlToken';

const at = (search: string) => ({
    location: { href: `https://hotel.example/client/${search}` } as Location,
    history: { state: null, replaceState: vi.fn() } as unknown as History
});

describe('adoptLoginTokenFromUrl', () => {
    beforeEach(() => window.localStorage.clear());

    it('replaces what this browser remembered with the token the CMS just issued', () => {
        SetRememberLogin({ token: 'remember-of-the-previous-user', expiresAt: 4102444800, username: 'previous' });
        setAccessToken('access-of-the-previous-user', 4102444800);
        const { location, history } = at('?token=remember-of-the-new-user&token_exp=4102444800');

        expect(adoptLoginTokenFromUrl(location, history)).toBe(true);

        expect(GetRememberLogin()).toEqual({ token: 'remember-of-the-new-user', expiresAt: 4102444800 });
        expect(getAccessToken()).toBe('');
    });

    it('leaves the remembered login alone when the address carries no token', () => {
        SetRememberLogin({ token: 'remembered', expiresAt: 4102444800 });
        const { location, history } = at('?room=7');

        expect(adoptLoginTokenFromUrl(location, history)).toBe(false);
        expect(GetRememberLogin()?.token).toBe('remembered');
    });

    it('runs at boot, before the first fetch', () => {
        const source = readFileSync('src/bootstrap.ts', 'utf8');
        const adopt = source.indexOf('adoptLoginTokenFromUrl();');
        const ssoRemoved = source.indexOf("url.searchParams.delete('sso');");
        const firstFetch = source.indexOf('await loadClientMode();');

        expect(adopt).toBeGreaterThan(0);
        expect(ssoRemoved).toBeGreaterThan(0);
        expect(adopt).toBeLessThan(firstFetch);
        expect(ssoRemoved).toBeLessThan(firstFetch);
    });

    it('keeps the address out of the Referer', () => {
        expect(readFileSync('index.html', 'utf8')).toContain('<meta name="referrer" content="strict-origin" />');
    });

    // The server does not tie a remember token to the browser it was issued to: a link built with someone else's
    // token switched the account silently.
    const jwtFor = (sub: number) => `e30.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.sig`;

    it('adopts a token for the remembered account without asking', () => {
        SetRememberLogin({ token: jwtFor(7), expiresAt: 4102444800 });
        const confirmSwitch = vi.fn(() => false);
        const { location, history } = at(`?token=${jwtFor(7)}`);

        expect(adoptLoginTokenFromUrl(location, history, confirmSwitch)).toBe(true);
        expect(confirmSwitch).not.toHaveBeenCalled();
    });

    it('asks before switching to another account, and keeps the remembered one on no', () => {
        SetRememberLogin({ token: jwtFor(7), expiresAt: 4102444800 });
        const refuse = vi.fn(() => false);

        expect(adoptLoginTokenFromUrl(at(`?token=${jwtFor(8)}`).location, at('').history, refuse)).toBe(false);
        expect(refuse).toHaveBeenCalledTimes(1);
        expect(GetRememberLogin()?.token).toBe(jwtFor(7));

        expect(adoptLoginTokenFromUrl(at(`?token=${jwtFor(8)}`).location, at('').history, () => true)).toBe(true);
        expect(GetRememberLogin()?.token).toBe(jwtFor(8));
    });
});
