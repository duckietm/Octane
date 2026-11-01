/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { GetRememberLogin, isRememberedLogin, isRememberRejection, rememberRequestBody, SetRememberLogin, StoreRememberLoginFromPayload } from './RememberLogin';

const KEY = 'nitro.auth.remember';
const stored = () => JSON.parse(window.localStorage.getItem(KEY) || 'null');

describe('remembered login storage', () => {
    beforeEach(() => window.localStorage.clear());

    it('never stores the SSO ticket of the session', () => {
        StoreRememberLoginFromPayload({ rememberToken: 'remember-1', rememberExpiresAt: 4102444800, ssoTicket: 'ticket-1' }, 'alice');

        expect(stored()).toEqual({ token: 'remember-1', expiresAt: 4102444800, username: 'alice' });
    });

    it('keeps the remembered token when a reply comes without one', () => {
        SetRememberLogin({ token: 'remember-1', expiresAt: 4102444800, username: 'alice' });

        StoreRememberLoginFromPayload({ accessToken: 'access-2', rememberExpiresAt: 4102444900 }, 'alice');

        expect(stored()).toEqual({ token: 'remember-1', expiresAt: 4102444900, username: 'alice' });
    });

    it('drops the SSO ticket an older client left in storage', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ token: 'remember-1', ssoTicket: 'old-ticket', expiresAt: 4102444800 }));

        expect(GetRememberLogin()).toEqual({ token: 'remember-1', expiresAt: 4102444800 });
        expect(stored()).toEqual({ token: 'remember-1', expiresAt: 4102444800 });
    });

    it('forgets an entry that holds only an SSO ticket, which can never log in', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ ssoTicket: 'old-ticket', expiresAt: 4102444800 }));

        expect(GetRememberLogin()).toBeNull();
        expect(stored()).toBeNull();
    });

    it('in cookie mode stores that a login is remembered, never a token', () => {
        StoreRememberLoginFromPayload({ rememberExpiresAt: 4102444800, accessToken: 'access-1' }, 'alice', true);

        expect(stored()).toEqual({ cookie: true, expiresAt: 4102444800, username: 'alice' });
        expect(isRememberedLogin(GetRememberLogin())).toBe(true);
        expect(rememberRequestBody(GetRememberLogin()!)).toEqual({ rememberCookie: true });
    });

    it('in cookie mode keeps a token a server without cookie support sent back', () => {
        StoreRememberLoginFromPayload({ rememberToken: 'remember-1', rememberExpiresAt: 4102444800 }, 'alice', true);

        expect(stored()).toEqual({ token: 'remember-1', expiresAt: 4102444800, username: 'alice' });
        expect(rememberRequestBody(GetRememberLogin()!)).toEqual({ rememberToken: 'remember-1' });
    });

    it('a cookie entry never holds a token, whatever it is given', () => {
        SetRememberLogin({ cookie: true, expiresAt: 4102444800, username: 'alice' });

        expect(JSON.stringify(stored())).not.toContain('token');
    });

    it('in cookie mode a reply without an expiry stores nothing', () => {
        StoreRememberLoginFromPayload({ accessToken: 'access-1' }, 'alice', true);

        expect(stored()).toBeNull();
    });

    it('forgets the remembered login only when the server refuses the token', () => {
        for (const status of [400, 401, 403]) expect(isRememberRejection(status)).toBe(true);
        for (const status of [0, 429, 500, 502, 503]) expect(isRememberRejection(status)).toBe(false);
    });
});
