import { GetConfiguration } from '@octane/renderer';
import { getAccessToken, getAccessTokenExpiresAt, persistAccessTokenFromPayload } from './accessToken';

const EXPIRY_SLACK_SECONDS = 60;

const hasUsableAccessToken = (): boolean => {
    if (!getAccessToken()) return false;
    const expiresAt = getAccessTokenExpiresAt();
    if (!expiresAt) return true;
    return (expiresAt - EXPIRY_SLACK_SECONDS) > Math.floor(Date.now() / 1000);
};

let exchangePromise: Promise<void> | null = null;

export const exchangeSsoTicketForAccessToken = (ssoTicket: string): Promise<void> => {
    if (!ssoTicket || hasUsableAccessToken()) return Promise.resolve();
    if (exchangePromise) return exchangePromise;

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

            if (payload) persistAccessTokenFromPayload(payload as Record<string, unknown>);
        } catch {
            // Offline / misconfigured endpoint: the client still works, only the
            // token-gated HTTP features stay unavailable — same as before.
        } finally {
            exchangePromise = null;
        }
    })();

    return exchangePromise;
};
