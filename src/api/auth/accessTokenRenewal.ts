import { GetConfiguration } from '@octane/renderer';
import { getAccessToken, getAccessTokenExpiresAt, persistAccessTokenFromPayload } from './accessToken';

// Renewed this long before it expires, so a request in flight never carries a token that just ran out.
const RENEW_BEFORE_SECONDS = 120;

/** Whether the access token expires within the renewal window; a token without an expiry never needs it. */
export const accessTokenRenewalDue = (now: number = Math.floor(Date.now() / 1000)): boolean => {
    const expiresAt = getAccessTokenExpiresAt();

    return !!getAccessToken() && expiresAt > 0 && expiresAt - RENEW_BEFORE_SECONDS <= now;
};

/**
 * Renews the access token while the user is in the hotel. Without "remember me" nothing renewed it, so every HTTP
 * feature stopped once it expired until the next login. The server answers only for a valid token of a user who is
 * online; a refusal leaves the token as it is.
 */
export const renewAccessTokenIfDue = async (fetchImpl: typeof fetch = fetch): Promise<boolean> => {
    if (!accessTokenRenewalDue()) return false;

    try {
        const rawEndpoint = GetConfiguration().getValue<string>('login.token-renew.endpoint', '${api.url}/api/auth/token/renew');
        const endpoint = GetConfiguration().interpolate(rawEndpoint);
        const response = await fetchImpl(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${getAccessToken()}`,
                'X-Requested-With': 'OctaneTokenRenew'
            },
            body: '{}'
        });

        if (!response.ok) return false;

        const payload = await response.json().catch(() => null);

        if (!payload) return false;

        persistAccessTokenFromPayload(payload as Record<string, unknown>);

        return true;
    } catch {
        return false;
    }
};
