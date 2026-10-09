import { IHousekeepingRoomSettingsInput } from './IHousekeepingTypes';

export const HousekeepingErrorKey = {
    NONE: 'none',
    EMPTY_USERNAME: 'empty_username',
    INVALID_USER_ID: 'invalid_user_id',
    INVALID_ROOM_ID: 'invalid_room_id',
    INVALID_AMOUNT: 'invalid_amount',
    AMOUNT_TOO_LARGE: 'amount_too_large',
    EMPTY_REASON: 'empty_reason',
    INVALID_HOURS: 'invalid_hours',
    INVALID_RANK: 'invalid_rank',
    INVALID_ROOM_NAME: 'invalid_room_name',
    INVALID_ROOM_DESCRIPTION: 'invalid_room_description',
    INVALID_MAX_USERS: 'invalid_max_users',
    INVALID_CATEGORY: 'invalid_category',
    INVALID_TRADE_MODE: 'invalid_trade_mode',
    INVALID_TAGS: 'invalid_tags'
} as const;

export type HousekeepingErrorKey = (typeof HousekeepingErrorKey)[keyof typeof HousekeepingErrorKey];

export const HK_MAX_GIVE_AMOUNT = 1_000_000_000;
export const HK_MAX_BAN_HOURS = 24 * 365 * 100;
export const HK_MIN_RANK = 1;
export const HK_MAX_RANK = 12;

export const validateUsername = (raw: string): HousekeepingErrorKey => {
    if (!raw || raw.trim().length === 0) return HousekeepingErrorKey.EMPTY_USERNAME;

    return HousekeepingErrorKey.NONE;
};

export const validatePositiveId = (raw: number, kind: 'user' | 'room'): HousekeepingErrorKey => {
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) {
        return kind === 'user' ? HousekeepingErrorKey.INVALID_USER_ID : HousekeepingErrorKey.INVALID_ROOM_ID;
    }

    return HousekeepingErrorKey.NONE;
};

export const validateAmount = (raw: number): HousekeepingErrorKey => {
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) return HousekeepingErrorKey.INVALID_AMOUNT;
    if (raw > HK_MAX_GIVE_AMOUNT) return HousekeepingErrorKey.AMOUNT_TOO_LARGE;

    return HousekeepingErrorKey.NONE;
};

export const validateReason = (raw: string): HousekeepingErrorKey => {
    if (!raw || raw.trim().length === 0) return HousekeepingErrorKey.EMPTY_REASON;

    return HousekeepingErrorKey.NONE;
};

export const validateBanHours = (raw: number): HousekeepingErrorKey => {
    if (!Number.isFinite(raw) || raw <= 0) return HousekeepingErrorKey.INVALID_HOURS;
    if (raw > HK_MAX_BAN_HOURS) return HousekeepingErrorKey.INVALID_HOURS;

    return HousekeepingErrorKey.NONE;
};

export const validateRank = (raw: number): HousekeepingErrorKey => {
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) return HousekeepingErrorKey.INVALID_RANK;
    if (raw < HK_MIN_RANK || raw > HK_MAX_RANK) return HousekeepingErrorKey.INVALID_RANK;

    return HousekeepingErrorKey.NONE;
};

// Room settings limits, matching what the emulator's HousekeepingRoomSettingsInput accepts.
export const HK_ROOM_NAME_MAX = 50;
export const HK_ROOM_DESCRIPTION_MAX = 250;
export const HK_ROOM_MIN_USERS = 1;
export const HK_ROOM_MAX_USERS = 200;
export const HK_ROOM_MAX_TAGS = 2;
export const HK_ROOM_TAG_MAX = 15;

/** Splits a free-text tag field ("a, b" or "a b") into the tags the server stores. */
export const parseRoomTags = (raw: string): string[] => {
    const tags: string[] = [];

    for (const part of (raw || '').split(/[,;\s]+/)) {
        const tag = part.trim();

        if (tag && !tags.includes(tag)) tags.push(tag);
    }

    return tags;
};

export const validateRoomSettings = (input: IHousekeepingRoomSettingsInput): HousekeepingErrorKey => {
    const name = (input.name || '').trim();

    if (!name || name.length > HK_ROOM_NAME_MAX) return HousekeepingErrorKey.INVALID_ROOM_NAME;
    if ((input.description || '').trim().length > HK_ROOM_DESCRIPTION_MAX) return HousekeepingErrorKey.INVALID_ROOM_DESCRIPTION;
    if (!Number.isInteger(input.maxUsers) || input.maxUsers < HK_ROOM_MIN_USERS || input.maxUsers > HK_ROOM_MAX_USERS)
        return HousekeepingErrorKey.INVALID_MAX_USERS;
    if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) return HousekeepingErrorKey.INVALID_CATEGORY;
    if (!Number.isInteger(input.tradeMode) || input.tradeMode < 0 || input.tradeMode > 2) return HousekeepingErrorKey.INVALID_TRADE_MODE;
    if (input.tags.length > HK_ROOM_MAX_TAGS || input.tags.some((tag) => tag.length > HK_ROOM_TAG_MAX)) return HousekeepingErrorKey.INVALID_TAGS;

    return HousekeepingErrorKey.NONE;
};

/** Whether the typed text matches the target a dangerous action asks for; case and outer spaces do not matter. */
export const matchesDangerConfirmation = (typed: string, expected: string): boolean =>
    !!expected && (typed || '').trim().toLowerCase() === expected.trim().toLowerCase();
