// Where earlier versions kept the token. It lives in memory now: anything running on this origin (an ads script,
// a plugin, injected HTML) could read localStorage and take the account over, staff accounts included.
const LEGACY_STORAGE_KEY = 'nitro.access.token';
const LEGACY_EXPIRES_KEY = 'nitro.access.token.exp';

let accessToken = '';
let accessTokenExpiresAt = 0;

// A token an earlier version left in storage is removed once; it was never trusted for a new session anyway.
const dropLegacyToken = (() => {
    let dropped = false;
    return (): void => {
        if (dropped) return;
        dropped = true;
        try {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
            window.localStorage.removeItem(LEGACY_EXPIRES_KEY);
        } catch {}
    };
})();

export const setAccessToken = (token: string | null | undefined, expiresAt?: number | null): void => {
    dropLegacyToken();
    if (token && typeof token === 'string') {
        accessToken = token;
        accessTokenExpiresAt = typeof expiresAt === 'number' && expiresAt > 0 ? expiresAt : 0;
    } else {
        accessToken = '';
        accessTokenExpiresAt = 0;
    }
};

export const getAccessToken = (): string => {
    dropLegacyToken();
    return accessToken;
};

export const getAccessTokenExpiresAt = (): number => accessTokenExpiresAt;

// The SSO ticket the token was issued with. Each tab exchanges its own ticket, so a tab never uses the token of
// another tab's session.
let tokenTicket: string | null = null;

export const clearAccessToken = (): void => {
    tokenTicket = null;
    setAccessToken(null);
};

/** Whether the token was issued for the session of this SSO ticket. */
export const isAccessTokenFor = (ssoTicket: string): boolean => !!ssoTicket && tokenTicket === ssoTicket && !!getAccessToken();

/**
 * Keeps the access token of a login, remember or refresh reply. Pass the SSO ticket of that session when the reply
 * came with one; a refresh keeps the session the token already belonged to.
 */
export const persistAccessTokenFromPayload = (payload: Record<string, unknown> | null | undefined, ssoTicket?: string): void => {
    if (!payload) return;
    const token = typeof payload.accessToken === 'string' ? payload.accessToken : '';
    const expiresAt = typeof payload.accessTokenExpiresAt === 'number' ? payload.accessTokenExpiresAt : null;
    if (!token) return;
    setAccessToken(token, expiresAt);
    if (ssoTicket) tokenTicket = ssoTicket;
};
