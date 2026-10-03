export const HousekeepingActionType = {
    USER_ALERT: 'user.alert',
    USER_MESSAGE: 'user.message',
    USER_KICK: 'user.kick',
    USER_MUTE: 'user.mute',
    USER_BAN: 'user.ban',
    USER_TRADE_LOCK: 'user.trade_lock',
    USER_CHANGE_RANK: 'user.change_rank',
    USER_FORCE_DISCONNECT: 'user.force_disconnect',
    USER_RESET_PASSWORD: 'user.reset_password',
    USER_UNBAN: 'user.unban',
    ROOM_OPEN: 'room.open',
    ROOM_CLOSE: 'room.close',
    ROOM_KICK_ALL: 'room.kick_all',
    ROOM_TRANSFER_OWNERSHIP: 'room.transfer_ownership',
    ROOM_DELETE: 'room.delete',
    ROOM_MUTE: 'room.mute',
    ECONOMY_GIVE_CREDITS: 'economy.give_credits',
    ECONOMY_GIVE_DUCKETS: 'economy.give_duckets',
    ECONOMY_GIVE_DIAMONDS: 'economy.give_diamonds',
    ECONOMY_GRANT_ITEM: 'economy.grant_item',
    ECONOMY_SET_HC: 'economy.set_hc',
    ECONOMY_HOTEL_ALERT: 'economy.hotel_alert'
} as const;

export type HousekeepingActionType = (typeof HousekeepingActionType)[keyof typeof HousekeepingActionType];

export const HousekeepingTabId = {
    DASHBOARD: 'dashboard',
    /** Who is online and the rooms in use, right now. */
    LIVE: 'live',
    USERS: 'users',
    ROOMS: 'rooms',
    /** Kept for old links and stored tabs: economy now lives in the user page. */
    ECONOMY: 'economy',
    AUDIT: 'audit',
    SUPPORT: 'support',
    BANS: 'bans',
    HOTEL: 'hotel',
    /** Every permission against every rank. */
    PERMISSIONS: 'permissions',
    SOUNDBOARD: 'soundboard'
} as const;

export type HousekeepingTabId = (typeof HousekeepingTabId)[keyof typeof HousekeepingTabId];

/** Sub-pages of the user page. */
export const HousekeepingUserSection = {
    SANCTIONS: 'sanctions',
    ACTIVITY: 'activity',
    SECURITY: 'security',
    ECONOMY: 'economy',
    ACCOUNT: 'account',
    NOTES: 'notes',
    HISTORY: 'history'
} as const;

export type HousekeepingUserSection = (typeof HousekeepingUserSection)[keyof typeof HousekeepingUserSection];

/** Sub-pages of the room page. */
export const HousekeepingRoomSection = {
    SETTINGS: 'settings',
    MODERATION: 'moderation',
    ACTIVITY: 'activity',
    HISTORY: 'history'
} as const;

export type HousekeepingRoomSection = (typeof HousekeepingRoomSection)[keyof typeof HousekeepingRoomSection];

/** Hotel tables the panel can hot reload; each one runs the matching :update_* command on the server. */
export const HOUSEKEEPING_RELOAD_TARGETS = ['catalog', 'texts', 'permissions', 'items', 'navigator', 'config', 'wordfilter'] as const;

export type HousekeepingReloadTarget = (typeof HOUSEKEEPING_RELOAD_TARGETS)[number];
