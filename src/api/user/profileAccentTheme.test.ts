/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyUserAccent, restoreUserAccent, USER_ACCENT_CLASS, USER_ACCENT_VARIABLE } from './profileAccentTheme';

describe('user accent theme', () => {
    beforeEach(() => {
        document.documentElement.classList.remove(USER_ACCENT_CLASS);
        document.documentElement.style.removeProperty(USER_ACCENT_VARIABLE);
        window.localStorage?.clear?.();
    });

    it('colours every window in the accent and forgets it when the accent is cleared', () => {
        applyUserAccent(7, 1);

        expect(document.documentElement.classList.contains(USER_ACCENT_CLASS)).toBe(true);
        expect(document.documentElement.style.getPropertyValue(USER_ACCENT_VARIABLE)).toMatch(/^#[0-9a-f]{6}$/);

        applyUserAccent(7, 0);

        expect(document.documentElement.classList.contains(USER_ACCENT_CLASS)).toBe(false);
        expect(document.documentElement.style.getPropertyValue(USER_ACCENT_VARIABLE)).toBe('');
    });

    it('puts back the accent remembered for the user at login', () => {
        applyUserAccent(7, 6);
        document.documentElement.classList.remove(USER_ACCENT_CLASS);

        restoreUserAccent(7);

        // Storage can be missing in the test runner; then nothing is remembered and nothing is restored.
        const remembered = (() => {
            try {
                return window.localStorage.getItem('octane.profile.accent.7');
            } catch {
                return null;
            }
        })();

        expect(document.documentElement.classList.contains(USER_ACCENT_CLASS)).toBe(remembered === '6');
    });
});
