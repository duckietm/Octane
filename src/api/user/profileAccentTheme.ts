import { getProfileAccentColor, isLightProfileAccent } from './profileCustomization';

/** The class and variable that colour every window of the client in the user's own accent. */
export const USER_ACCENT_CLASS = 'octane-user-accent';
export const USER_ACCENT_VARIABLE = '--octane-user-accent';
/** Added with a light accent, so the window titles turn dark. */
export const USER_ACCENT_LIGHT_CLASS = 'octane-user-accent-light';

const storageKey = (userId: number) => `octane.profile.accent.${userId}`;

/**
 * Colours the title bars and selected tabs of every window in the accent the user picked for their
 * profile. It is remembered per user in this browser, so it is there from the next login on, before
 * the profile is opened again.
 */
export const applyUserAccent = (userId: number, accentId: number, root: HTMLElement = document.documentElement): void => {
    const color = getProfileAccentColor(accentId);

    if (color) {
        root.style.setProperty(USER_ACCENT_VARIABLE, color);
        root.classList.add(USER_ACCENT_CLASS);
        root.classList.toggle(USER_ACCENT_LIGHT_CLASS, isLightProfileAccent(accentId));
    } else {
        root.style.removeProperty(USER_ACCENT_VARIABLE);
        root.classList.remove(USER_ACCENT_CLASS, USER_ACCENT_LIGHT_CLASS);
    }

    if (!userId) return;

    try {
        if (accentId) window.localStorage.setItem(storageKey(userId), String(accentId));
        else window.localStorage.removeItem(storageKey(userId));
    } catch {
        // Storage can be off (private window); the accent then lasts until the page is closed.
    }
};

/** Puts back the accent this browser remembers for the user, at login. */
export const restoreUserAccent = (userId: number, root: HTMLElement = document.documentElement): void => {
    if (!userId) return;

    let accentId = 0;

    try {
        accentId = Number(window.localStorage.getItem(storageKey(userId))) || 0;
    } catch {
        accentId = 0;
    }

    applyUserAccent(0, accentId, root);
};
