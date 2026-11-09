/** Cloudflare's own endpoint; explicit rendering, since the widget mounts itself. */
export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** How long to wait for Cloudflare before giving up on the check. */
export const TURNSTILE_LOAD_TIMEOUT_MS = 10000;

let pending: Promise<boolean> | null = null;

/**
 * Loads the Turnstile script, once, and only when the login screen actually needs it.
 *
 * It used to be a plain `<script>` in index.html, so every visitor fetched and ran
 * Cloudflare's script on every page load whether or not the hotel has the check turned
 * on. The wait for it was an unbounded 100 ms poll, so with the script blocked - an ad
 * blocker is enough - the widget never appeared and the poll ran for as long as the
 * login screen was open.
 *
 * @returns whether the script is usable; false when it fails or does not arrive in time
 */
export const loadTurnstileScript = (timeoutMs: number = TURNSTILE_LOAD_TIMEOUT_MS): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(false);
    if (window.turnstile) return Promise.resolve(true);
    if (pending) return pending;

    pending = new Promise<boolean>((resolve) => {
        let settled = false;

        const settle = (loaded: boolean) => {
            if (settled) return;

            settled = true;
            window.clearTimeout(timer);

            // A failed load may be retried later; a successful one is kept. The failed element goes too: it never
            // fires again, so a retry that found it in the page waited the whole timeout and failed every time.
            if (!loaded) {
                pending = null;
                script.remove();
            }

            resolve(loaded);
        };

        const timer = window.setTimeout(() => settle(false), timeoutMs);

        // An element already in the page without window.turnstile is one whose load is over or lost: start afresh.
        document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_URL}"]`)?.remove();

        const script = document.createElement('script');

        script.addEventListener('load', () => settle(!!window.turnstile));
        script.addEventListener('error', () => settle(false));

        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    });

    return pending;
};

/** Visible for tests: forgets the in-flight load. */
export const resetTurnstileScriptForTests = (): void => {
    pending = null;
};
