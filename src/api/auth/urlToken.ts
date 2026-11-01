import { ClearRememberLogin, GetRememberLogin, SetRememberLogin } from '../utils/RememberLogin';
import { clearAccessToken } from './accessToken';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export interface UrlLoginToken {
    token: string;
    expiresAt: number;
}

/**
 * Reads the login token a CMS puts in the address (`?token=` and `?token_exp=`) and takes both out of it, so the
 * token does not stay in the address bar, the history or the logs of whatever serves the next request.
 */
export const takeLoginTokenFromUrl = (location: Location = window.location, history: History = window.history): UrlLoginToken | null => {
    const url = new URL(location.href);
    const token = url.searchParams.get('token');
    const expiry = Number(url.searchParams.get('token_exp') || 0);

    if (!url.searchParams.has('token') && !url.searchParams.has('token_exp')) return null;

    url.searchParams.delete('token');
    url.searchParams.delete('token_exp');
    history.replaceState(history.state, '', url.toString());

    if (!token) return null;

    return { token, expiresAt: Number.isFinite(expiry) && expiry > 0 ? expiry : Math.floor(Date.now() / 1000) + THIRTY_DAYS_SECONDS };
};

/** The account a remember token belongs to (its `sub`), or null when it is not a token this client can read. */
export const loginTokenSubject = (token: string | undefined): number | null => {
    const payload = token?.split('.')[1];

    if (!payload) return null;

    try {
        const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        const subject = Number(json?.sub);

        return Number.isInteger(subject) && subject > 0 ? subject : null;
    } catch {
        return null;
    }
};

const SWITCH_ACCOUNT_QUESTION = 'This link signs you in to a different account from the one this browser remembers. Sign in with the link?';

/**
 * Takes the CMS login token out of the address and makes it the remembered login. It wins over what this browser
 * remembered: the CMS just logged someone in, and keeping an older remember would enter the hotel as whoever was
 * remembered before. The server does not tie the token to the browser it was issued to, though, so a link built with
 * someone else's token would silently switch account: when both tokens name an account and they differ, the user is
 * asked first. Runs at boot, before the first fetch, so the token never reaches a Referer.
 */
export const adoptLoginTokenFromUrl = (
    location: Location = window.location,
    history: History = window.history,
    confirmSwitch: (question: string) => boolean = (question) => window.confirm(question)
): boolean => {
    const urlToken = takeLoginTokenFromUrl(location, history);

    if (!urlToken) return false;

    const remembered = loginTokenSubject(GetRememberLogin()?.token);
    const incoming = loginTokenSubject(urlToken.token);

    if (remembered !== null && incoming !== null && remembered !== incoming && !confirmSwitch(SWITCH_ACCOUNT_QUESTION)) return false;

    ClearRememberLogin();
    clearAccessToken();
    SetRememberLogin(urlToken);

    return true;
};
