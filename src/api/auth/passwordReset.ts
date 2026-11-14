/**
 * The password reset link of a hotel that logs players in through this client. The mail carries a one-time token;
 * the client takes it out of the address at boot and asks for the new password.
 *
 * Two shapes are read: `?reset_token=<token>` anywhere (what the server mails by default), and
 * `…/reset-password?token=<token>` (the address a hotel may have configured). The second must be taken before the
 * login token is looked for, which also travels as `?token=`.
 */

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,128}$/;
const RESET_PATH = /\/reset-password\/?$/;

let pendingToken: string | null = null;

/** Takes a reset token out of the address (so it stays out of the history and of any Referer) and keeps it. */
export const takePasswordResetTokenFromUrl = (location: Location = window.location, history: History = window.history): string | null => {
    const url = new URL(location.href);
    const onResetPath = RESET_PATH.test(url.pathname);

    let token = url.searchParams.get('reset_token');

    if (token === null && onResetPath) token = url.searchParams.get('token');
    if (token === null) return null;

    url.searchParams.delete('reset_token');

    if (onResetPath) {
        url.searchParams.delete('token');
        url.pathname = url.pathname.replace(RESET_PATH, '/');
    }

    history.replaceState(history.state, '', url.toString());

    pendingToken = TOKEN_SHAPE.test(token) ? token : null;

    return pendingToken;
};

/** The reset token this page was opened with, until the reset is done or given up. */
export const getPendingPasswordResetToken = (): string | null => pendingToken;

export const clearPendingPasswordResetToken = (): void => {
    pendingToken = null;
};
