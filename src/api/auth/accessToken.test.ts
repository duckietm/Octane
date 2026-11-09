/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAccessToken, getAccessToken, getAccessTokenExpiresAt, setAccessToken } from './accessToken';

describe('accessToken', () =>
{
    beforeEach(() => window.localStorage.clear());

    it('forgets the token and its expiry when it is cleared', () =>
    {
        setAccessToken('token-of-the-first-user', 4102444800);

        expect(getAccessToken()).toBe('token-of-the-first-user');

        clearAccessToken();

        expect(getAccessToken()).toBe('');
        expect(getAccessTokenExpiresAt()).toBe(0);
    });

    it('keeps the token out of storage, where any script on the origin could read it', () =>
    {
        setAccessToken('bearer-of-a-staff-member', 4102444800);

        expect(getAccessToken()).toBe('bearer-of-a-staff-member');
        expect(JSON.stringify({ ...window.localStorage })).not.toContain('bearer-of-a-staff-member');
        expect(JSON.stringify({ ...window.sessionStorage })).not.toContain('bearer-of-a-staff-member');
    });
});
