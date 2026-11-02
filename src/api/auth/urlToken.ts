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

/** A room or friend id from the address: a positive whole number, or 0 (a value such as ?room=abc used to become NaN). */
export const positiveIdFromSearch = (value: string | null): number => {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : 0;
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

/** The question asked before a link signs in a browser that remembers no login, naming the account when it can. */
export const signInFromLinkQuestion = (subject: number | null): string =>
    subject !== null ? `This link signs you in as account #${subject}. Sign in with the link?` : 'This link signs you in to an account. Sign in with the link?';

/**
 * Whether a login secret from the address (a CMS token or an SSO ticket) may be used. A browser that remembers no
 * login used to take it at once, so a link built with the sender's own token signed the reader in to the sender's
 * account (login CSRF): it is asked first. A browser with a remembered login is not asked here.
 */
export const confirmSignInFromLink = (
    subject: number | null,
    confirmSignIn: (question: string) => boolean = (question) => window.confirm(question)
): boolean => (GetRememberLogin() ? true : confirmSignIn(signInFromLinkQuestion(subject)));

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

    if (!confirmSignInFromLink(incoming, confirmSwitch)) return false;
    if (remembered !== null && incoming !== null && remembered !== incoming && !confirmSwitch(SWITCH_ACCOUNT_QUESTION)) return false;

    ClearRememberLogin();
    clearAccessToken();
    SetRememberLogin(urlToken);

    return true;
};
