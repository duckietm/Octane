import { GetConfiguration } from '@octane/renderer';
import { clearAccessToken, getAccessTokenExpiresAt, isAccessTokenFor, persistAccessTokenFromPayload } from './accessToken';

const EXPIRY_SLACK_SECONDS = 60;

const hasUsableAccessTokenFor = (ssoTicket: string): boolean => {
    if (!isAccessTokenFor(ssoTicket)) return false;
    const expiresAt = getAccessTokenExpiresAt();
    if (!expiresAt) return true;
    return expiresAt - EXPIRY_SLACK_SECONDS > Math.floor(Date.now() / 1000);
};

let exchangePromise: Promise<void> | null = null;
let exchangeTicket: string | null = null;

/**
 * Makes sure the stored access token belongs to the session of this SSO ticket. A token left by another session -
 * the last user of this browser who closed the tab without logging out - is dropped before the exchange, or the
 * HTTP features of the new user would run as the previous one.
 */
export const exchangeSsoTicketForAccessToken = (ssoTicket: string): Promise<void> => {
    if (!ssoTicket || hasUsableAccessTokenFor(ssoTicket)) return Promise.resolve();
    if (exchangePromise && exchangeTicket === ssoTicket) return exchangePromise;

    if (!isAccessTokenFor(ssoTicket)) clearAccessToken();
    exchangeTicket = ssoTicket;
    exchangePromise = (async () => {
        try {
            const rawEndpoint = GetConfiguration().getValue<string>('login.sso-token.endpoint', '${api.url}/api/auth/sso-token');
            const endpoint = GetConfiguration().interpolate(rawEndpoint);
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'OctaneSsoExchange'
                },
                body: JSON.stringify({ ssoTicket })
            });

            if (!response.ok) return;

            const payload = await response.json().catch(() => null);

            if (payload && exchangeTicket === ssoTicket) persistAccessTokenFromPayload(payload as Record<string, unknown>, ssoTicket);
        } catch {
            // Offline / misconfigured endpoint: the client still works, only the
            // token-gated HTTP features stay unavailable — same as before.
        } finally {
            if (exchangeTicket === ssoTicket) {
                exchangePromise = null;
                exchangeTicket = null;
            }
        }
    })();

    return exchangePromise;
};
