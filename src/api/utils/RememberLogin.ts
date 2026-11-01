export interface RememberLoginData {
    token?: string;
    /** The server keeps the token in an HttpOnly cookie: this entry only says that a login is remembered. */
    cookie?: boolean;
    expiresAt: number;
    username?: string;
}

/** Whether this entry can log in again: with its token, or with the cookie the server holds. */
export const isRememberedLogin = (data: RememberLoginData | null | undefined): boolean => !!data && (!!data.token?.length || data.cookie === true);

/** The body of a remember or refresh call: the token, or a request to read it from the cookie. */
export const rememberRequestBody = (data: RememberLoginData): Record<string, unknown> =>
    data.token?.length ? { rememberToken: data.token } : { rememberCookie: true };

const REMEMBER_LOGIN_KEY = 'nitro.auth.remember';
const LEGACY_REMEMBER_LOGIN_KEY = 'nitro.remember.token';
const DEFAULT_REMEMBER_SECONDS = 30 * 24 * 60 * 60;

export const GetRememberLogin = (): RememberLoginData | null => {
    try {
        const data = JSON.parse(window.localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null') as (RememberLoginData & { ssoTicket?: string }) | null;

        if (!isRememberedLogin(data)) {
            // An entry with only an SSO ticket, written by older clients, can never log in again.
            if (data) ClearRememberLogin();
            return null;
        }
        if (data.expiresAt && data.expiresAt * 1000 <= Date.now()) {
            ClearRememberLogin();
            return null;
        }

        if (data.ssoTicket !== undefined) {
            // Older clients stored the SSO ticket too: a secret at rest that nothing reads. Drop it.
            const { ssoTicket: _dropped, ...rest } = data;
            SetRememberLogin(rest);
            return rest;
        }

        return data;
    } catch {
        try {
            const legacyToken = window.localStorage.getItem(LEGACY_REMEMBER_LOGIN_KEY) || '';

            if (!legacyToken.length) return null;

            const data: RememberLoginData = {
                token: legacyToken,
                expiresAt: Math.floor(Date.now() / 1000) + DEFAULT_REMEMBER_SECONDS
            };

            SetRememberLogin(data);

            return data;
        } catch {
            return null;
        }
    }
};

export const SetRememberLogin = (data: RememberLoginData): void => {
    if (!isRememberedLogin(data)) return;

    // A cookie entry never carries a token, whatever the caller passed.
    const entry: RememberLoginData = data.token?.length
        ? data
        : { cookie: true, expiresAt: data.expiresAt, ...(data.username !== undefined ? { username: data.username } : {}) };

    try {
        window.localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(entry));
    } catch {}
};

export const ClearRememberLogin = (): void => {
    try {
        window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
        window.localStorage.removeItem(LEGACY_REMEMBER_LOGIN_KEY);
    } catch {}
};

/**
 * Stores the remember token of a login, remember or refresh reply. A reply without one keeps the token already
 * remembered: a backend that only rotates the access token must not cost the user their remembered login.
 *
 * In cookie mode the server keeps the token in an HttpOnly cookie and the reply carries only its expiry: the entry
 * then records that a login is remembered, never a token. A server that does not know cookie mode answers with the
 * token in the reply, which is stored as before.
 */
export const StoreRememberLoginFromPayload = (payload: Record<string, unknown>, username?: string, cookieMode = false): void => {
    const replyToken = typeof payload.rememberToken === 'string' ? payload.rememberToken : '';
    const token = replyToken || (cookieMode ? '' : GetRememberLogin()?.token || '');
    const rawExpiresAt = payload.rememberExpiresAt ?? payload.expiresAt;
    const parsedExpiresAt = typeof rawExpiresAt === 'number' ? rawExpiresAt : Number(rawExpiresAt || 0);
    const expiresAt = Number.isFinite(parsedExpiresAt) && parsedExpiresAt > 0 ? parsedExpiresAt : Math.floor(Date.now() / 1000) + DEFAULT_REMEMBER_SECONDS;

    if (token.length) {
        SetRememberLogin({ token, expiresAt, username });
        return;
    }

    if (cookieMode && payload.rememberExpiresAt !== undefined) SetRememberLogin({ cookie: true, expiresAt, username });
};

/**
 * Whether the server turned the remembered login down for good: a bad request, an unknown or revoked token. A
 * network error, a 429 or a 5xx says nothing about the token, which stays for the next try.
 */
export const isRememberRejection = (status: number): boolean => status === 400 || status === 401 || status === 403;

/**
 * Clears the remembered login only if it still holds this token: another tab may have rotated it meanwhile. A cookie
 * entry has no token here, so it is cleared when it is still a cookie entry.
 */
export const ClearRememberLoginIfStill = (token: string | undefined): void => {
    if (GetRememberLogin()?.token === token) ClearRememberLogin();
};

/**
 * Runs a remember or refresh call under a lock shared by every tab of this origin. The server revokes the whole
 * token family when an older version comes back, so two tabs rotating the same token at once - a browser restoring
 * its tabs is enough - logged the user out. The task reads the stored token inside the lock, where it is the one the
 * previous tab just stored.
 */
export const withRememberLock = <T>(task: () => Promise<T>): Promise<T> => {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;

    if (!locks?.request) return task();

    return locks.request('octane-remember', task) as Promise<T>;
};
