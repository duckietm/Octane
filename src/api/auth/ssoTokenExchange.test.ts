/* @vitest-environment jsdom */
import { GetConfiguration } from '@octane/renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAccessToken, getAccessToken, persistAccessTokenFromPayload, setAccessToken } from './accessToken';
import { exchangeSsoTicketForAccessToken } from './ssoTokenExchange';

const FAR_FUTURE = 4102444800;

const replyWith = (accessToken: string) => vi.fn(async () => new Response(JSON.stringify({ accessToken, accessTokenExpiresAt: FAR_FUTURE }), { status: 200 }));

describe('exchangeSsoTicketForAccessToken', () => {
    beforeEach(() => {
        window.localStorage.clear();
        clearAccessToken();
        vi.mocked(GetConfiguration).mockReturnValue({
            getValue: (_key: string, fallback: unknown) => fallback,
            interpolate: (value: string) => value
        } as never);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('drops a token left in storage by another session before exchanging the new ticket', async () => {
        setAccessToken('token-of-the-previous-user', FAR_FUTURE);
        const fetch = replyWith('token-of-the-new-user');
        vi.stubGlobal('fetch', fetch);

        await exchangeSsoTicketForAccessToken('ticket-of-the-new-user');

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(getAccessToken()).toBe('token-of-the-new-user');
    });

    it('keeps the token a login just stored for the same ticket, without asking again', async () => {
        persistAccessTokenFromPayload({ accessToken: 'token-from-the-login', accessTokenExpiresAt: FAR_FUTURE }, 'ticket-1');
        const fetch = replyWith('unused');
        vi.stubGlobal('fetch', fetch);

        await exchangeSsoTicketForAccessToken('ticket-1');

        expect(fetch).not.toHaveBeenCalled();
        expect(getAccessToken()).toBe('token-from-the-login');
    });

    it('does not keep the old token when the exchange for a new ticket fails', async () => {
        persistAccessTokenFromPayload({ accessToken: 'token-of-ticket-1', accessTokenExpiresAt: FAR_FUTURE }, 'ticket-1');
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('', { status: 401 }))
        );

        await exchangeSsoTicketForAccessToken('ticket-2');

        expect(getAccessToken()).toBe('');
    });
});
