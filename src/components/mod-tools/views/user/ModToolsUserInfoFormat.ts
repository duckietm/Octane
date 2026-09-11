/** Hours after which the last sanction stops being highlighted, as in the official client. */
export const SANCTION_HIGHLIGHT_HOURS = 48;

/** The server sends this in place of an e-mail address when the account has no identity behind it. */
export const NO_IDENTITY_EMAIL = 'No identity';

/**
 * The official client tints the last-sanction time red and lets it fade to black over
 * 48 hours: `255 * (48 - hours) / 48 << 16` is a pure red channel truncated to an int.
 * Returns null once the sanction is older than that so the text keeps its normal colour.
 */
export const getSanctionAgeColor = (sanctionAgeHours: number): string | null => {
    if (!Number.isFinite(sanctionAgeHours) || sanctionAgeHours > SANCTION_HIGHLIGHT_HOURS) return null;

    const hours = Math.max(0, sanctionAgeHours);
    const red = Math.floor((255 * (SANCTION_HIGHLIGHT_HOURS - hours)) / SANCTION_HIGHLIGHT_HOURS);

    return `rgb(${red}, 0, 0)`;
};

export interface UserInfoPermissions {
    chatlogsPermission?: boolean;
    alertPermission?: boolean;
    kickPermission?: boolean;
    banPermission?: boolean;
}

export interface UserInfoButtonState {
    chatlog: boolean;
    message: boolean;
    modAction: boolean;
}

/**
 * Which user-info buttons the moderator may use, as `UserInfoCtrl.prepare` decides from
 * the init message: chat logs need the chatlog right, messages need the alert right, and
 * the mod-action window needs any of alert / kick / ban. An account with no identity
 * cannot be sanctioned at all, so its mod-action button is off regardless of rights.
 * Until the init message arrives nothing is enabled: a click would only fail server-side.
 */
export const getUserInfoButtonState = (permissions: UserInfoPermissions | null, primaryEmailAddress: string): UserInfoButtonState => {
    if (!permissions) return { chatlog: false, message: false, modAction: false };

    const hasIdentity = primaryEmailAddress !== NO_IDENTITY_EMAIL;

    return {
        chatlog: !!permissions.chatlogsPermission,
        message: !!permissions.alertPermission,
        modAction: hasIdentity && !!(permissions.alertPermission || permissions.kickPermission || permissions.banPermission)
    };
};
