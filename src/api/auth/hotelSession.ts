/** The channel a hotel website and the client's own tabs share: `{ type: 'logged-out' }` there ends the account's session everywhere. */
export const HOTEL_SESSION_CHANNEL = 'hotel-session';

export const HOTEL_SESSION_LOGGED_OUT = 'logged-out';

/** Tells the website and the other client tabs that this account logged out, as the website does when it logs out itself. */
export const PostHotelSessionLoggedOut = (): void => {
    if (typeof BroadcastChannel === 'undefined') return;

    try {
        const channel = new BroadcastChannel(HOTEL_SESSION_CHANNEL);

        channel.postMessage({ type: HOTEL_SESSION_LOGGED_OUT });
        channel.close();
    } catch {
        /* best-effort: a browser that blocks the channel still logs out locally */
    }
};
