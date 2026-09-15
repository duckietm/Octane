import { afterEach, describe, expect, it } from 'vitest';
import {
    getInitialOwnAvatarMenuMode,
    OWN_AVATAR_MENU_MODE_CLUB_DANCES,
    OWN_AVATAR_MENU_MODE_MINIMIZED_LOOKS,
    OWN_AVATAR_MENU_MODE_MINIMIZED_NAME,
    OWN_AVATAR_MENU_MODE_NORMAL,
    readUseMinimizedOwnAvatarMenu,
    USE_MINIMIZED_OWN_AVATAR_MENU_KEY,
    writeUseMinimizedOwnAvatarMenu
} from './ownAvatarMenuPreference';

const base = { useMinimized: false, allowNameChange: false, isDancing: false, hasClub: false, hasActiveEffect: false };

afterEach(() => {
    window.localStorage.removeItem(USE_MINIMIZED_OWN_AVATAR_MENU_KEY);
});

describe('ownAvatarMenuPreference', () => {
    it('opens the full menu by default', () => {
        expect(getInitialOwnAvatarMenuMode(base)).toBe(OWN_AVATAR_MENU_MODE_NORMAL);
    });

    it('opens the minimized name or looks menu when the preference is set', () => {
        expect(getInitialOwnAvatarMenuMode({ ...base, useMinimized: true, allowNameChange: true })).toBe(OWN_AVATAR_MENU_MODE_MINIMIZED_NAME);
        expect(getInitialOwnAvatarMenuMode({ ...base, useMinimized: true })).toBe(OWN_AVATAR_MENU_MODE_MINIMIZED_LOOKS);
    });

    it('opens the dance sub menu for a dancing club member without an effect', () => {
        expect(getInitialOwnAvatarMenuMode({ ...base, isDancing: true, hasClub: true })).toBe(OWN_AVATAR_MENU_MODE_CLUB_DANCES);
        expect(getInitialOwnAvatarMenuMode({ ...base, isDancing: true, hasClub: true, hasActiveEffect: true })).toBe(OWN_AVATAR_MENU_MODE_NORMAL);
    });

    it('persists the preference in local storage', () => {
        expect(readUseMinimizedOwnAvatarMenu()).toBe(false);

        writeUseMinimizedOwnAvatarMenu(true);

        expect(readUseMinimizedOwnAvatarMenu()).toBe(true);

        writeUseMinimizedOwnAvatarMenu(false);

        expect(readUseMinimizedOwnAvatarMenu()).toBe(false);
    });
});
