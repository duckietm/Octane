export const OWN_AVATAR_MENU_MODE_NORMAL = 0;
export const OWN_AVATAR_MENU_MODE_CLUB_DANCES = 1;
export const OWN_AVATAR_MENU_MODE_MINIMIZED_NAME = 2;
export const OWN_AVATAR_MENU_MODE_EXPRESSIONS = 3;
export const OWN_AVATAR_MENU_MODE_SIGNS = 4;
export const OWN_AVATAR_MENU_MODE_MINIMIZED_LOOKS = 5;

// The official client keeps `use_minimized_own_avatar_menu` in the user
// configuration (AvatarInfoWidget.as); we keep it in the browser.
export const USE_MINIMIZED_OWN_AVATAR_MENU_KEY = 'octane.use_minimized_own_avatar_menu';

export const readUseMinimizedOwnAvatarMenu = (): boolean => {
    try {
        return window.localStorage.getItem(USE_MINIMIZED_OWN_AVATAR_MENU_KEY) === '1';
    } catch {
        return false;
    }
};

export const writeUseMinimizedOwnAvatarMenu = (useMinimized: boolean): void => {
    try {
        window.localStorage.setItem(USE_MINIMIZED_OWN_AVATAR_MENU_KEY, useMinimized ? '1' : '0');
    } catch {
        // Storage may be unavailable; the menu still opens in the normal mode.
    }
};

export interface OwnAvatarMenuModeInput {
    useMinimized: boolean;
    allowNameChange: boolean;
    isDancing: boolean;
    hasClub: boolean;
    hasActiveEffect: boolean;
}

/**
 * Mirrors OwnAvatarMenuView.as: the minimized menu shows the name change
 * (or the wardrobe) plus a "more" row until the user asks for the full
 * menu; a dancing club member lands on the dance sub menu instead.
 */
export const getInitialOwnAvatarMenuMode = (input: OwnAvatarMenuModeInput): number => {
    if (input.useMinimized) return input.allowNameChange ? OWN_AVATAR_MENU_MODE_MINIMIZED_NAME : OWN_AVATAR_MENU_MODE_MINIMIZED_LOOKS;

    if (input.isDancing && input.hasClub && !input.hasActiveEffect) return OWN_AVATAR_MENU_MODE_CLUB_DANCES;

    return OWN_AVATAR_MENU_MODE_NORMAL;
};
