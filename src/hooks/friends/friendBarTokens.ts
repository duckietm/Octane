/**
 * Friend bar notification tokens, after the official friendbar
 * (HabboFriendBarData.makeNotification + FriendEntityTab.addNotificationToken).
 *
 * The server sends FriendNotification(typeCode, avatarId, message); the bar
 * keeps at most one notification per type on each friend and shows it as a
 * small token icon on the friend's tab. The messenger token (-1) is raised
 * locally by an unread console message rather than by the packet.
 */

export const FriendNotificationType = {
    INSTANT_MESSAGE: -1,
    ROOM_EVENT: 0,
    ACHIEVEMENT: 1,
    QUEST: 2,
    GAME: 3,
    GAME_FINISHED: 4,
    GAME_INVITE: 5
} as const;

export type FriendNotificationTypeCode = (typeof FriendNotificationType)[keyof typeof FriendNotificationType];

export interface FriendNotification {
    typeCode: number;
    message: string;
    /** Official: dropped once the friend tab has been opened and closed again. */
    viewOnce: boolean;
}

export type FriendBarTokenTag = 'message' | 'notify' | 'game';

export interface FriendBarToken {
    typeCode: number;
    tag: FriendBarTokenTag;
    /** `friendbar.notify.*` key of the token title. */
    titleKey: string;
    message: string;
    viewOnce: boolean;
}

const TOKEN_DEFINITIONS: Record<number, { tag: FriendBarTokenTag; titleKey: string }> = {
    [FriendNotificationType.INSTANT_MESSAGE]: { tag: 'message', titleKey: 'friendbar.notify.messenger' },
    [FriendNotificationType.ROOM_EVENT]: { tag: 'notify', titleKey: 'friendbar.notify.event' },
    [FriendNotificationType.ACHIEVEMENT]: { tag: 'notify', titleKey: 'friendbar.notify.achievement' },
    [FriendNotificationType.QUEST]: { tag: 'notify', titleKey: 'friendbar.notify.quest' },
    [FriendNotificationType.GAME]: { tag: 'game', titleKey: 'friendbar.notify.game' },
    [FriendNotificationType.GAME_INVITE]: { tag: 'game', titleKey: 'friendbar.notify.game_invite' }
};

/**
 * HabboFriendBarData.onFriendNotification: a notification of the same type
 * replaces the previous one; "game finished" (4) only clears "playing" (3).
 * Everything except "playing a game" is view-once.
 */
export const applyFriendNotification = (
    notifications: readonly FriendNotification[],
    typeCode: number,
    message: string | null | undefined
): FriendNotification[] => {
    const remaining = notifications.filter((entry) => entry.typeCode !== typeCode);

    if (typeCode === FriendNotificationType.GAME_FINISHED) return remaining.filter((entry) => entry.typeCode !== FriendNotificationType.GAME);

    if (TOKEN_DEFINITIONS[typeCode] === undefined) return remaining;

    return [...remaining, { typeCode, message: message || '', viewOnce: typeCode !== FriendNotificationType.GAME }];
};

/** FriendEntityTab.deselect: view-once tokens go away once the tab closes. */
export const dropViewedFriendNotifications = (notifications: readonly FriendNotification[]): FriendNotification[] =>
    notifications.filter((entry) => !entry.viewOnce);

/**
 * Tokens to draw on one friend tab, newest first like the official
 * `addListItemAt(icon, 0)`. The messenger token comes from the unread count
 * of that friend's console thread and wins over a stale packet-driven one.
 */
export const resolveFriendBarTokens = (notifications: readonly FriendNotification[] | null | undefined, unreadMessageCount: number): FriendBarToken[] => {
    const tokens: FriendBarToken[] = [];
    const seen = new Set<number>();

    if (unreadMessageCount > 0) {
        const definition = TOKEN_DEFINITIONS[FriendNotificationType.INSTANT_MESSAGE];

        tokens.push({ typeCode: FriendNotificationType.INSTANT_MESSAGE, tag: definition.tag, titleKey: definition.titleKey, message: '', viewOnce: true });
        seen.add(FriendNotificationType.INSTANT_MESSAGE);
    }

    for (const entry of [...(notifications || [])].reverse()) {
        const definition = TOKEN_DEFINITIONS[entry.typeCode];

        if (!definition || seen.has(entry.typeCode)) continue;

        seen.add(entry.typeCode);
        tokens.push({ typeCode: entry.typeCode, tag: definition.tag, titleKey: definition.titleKey, message: entry.message || '', viewOnce: entry.viewOnce });
    }

    return tokens;
};
