/** Who a hotel alert goes to: everyone, one online user, the users of one active room, or the staff. */
export const HOUSEKEEPING_ALERT_SCOPES = ['hotel', 'user', 'room', 'staff'] as const;

export type HousekeepingAlertScope = (typeof HOUSEKEEPING_ALERT_SCOPES)[number];

/**
 * The optional recipient the hotel alert packet carries: nothing for the whole hotel (so a
 * server that only knows the message still broadcasts), "staff", "user:<name>" or "room:<id>".
 * Null when a user or room scope has no usable target yet.
 */
export const buildHousekeepingAlertRecipient = (scope: HousekeepingAlertScope, target: string): string | undefined | null => {
    const value = target.trim();

    switch (scope) {
        case 'hotel':
            return undefined;
        case 'staff':
            return 'staff';
        case 'user':
            return value ? `user:${value}` : null;
        case 'room': {
            const roomId = Number(value);

            return Number.isInteger(roomId) && roomId > 0 ? `room:${roomId}` : null;
        }
    }
};

export type HousekeepingMaintenanceAction = 'status' | 'start' | 'cancel' | 'disable';

/** Countdown lengths offered in the panel, in minutes; the server takes 0 to 120. */
export const HOUSEKEEPING_MAINTENANCE_PRESETS = [1, 5, 10, 15, 30, 60] as const;

export const HOUSEKEEPING_MAINTENANCE_MAX_MINUTES = 120;

/** The server keeps up to 200 characters of the maintenance message. */
export const HOUSEKEEPING_MAINTENANCE_MESSAGE_MAX = 200;

/** Seconds left as "m:ss", or "h:mm:ss" from an hour up; never below 0:00. */
export const formatHousekeepingCountdown = (secondsLeft: number): string => {
    const total = Math.max(0, Math.floor(secondsLeft));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');

    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};

/** The wordfilter `replacement` column is varchar(16). */
export const HOUSEKEEPING_WORDFILTER_REPLACEMENT_MAX = 16;

/** Lengths offered for a temporary rank, in days; the server takes up to a year. */
export const HOUSEKEEPING_TEMP_RANK_DAYS = [1, 7, 30, 90] as const;

export const HOUSEKEEPING_TEMP_RANK_MAX_DAYS = 365;

/** Days as the seconds the rank change carries; 0 (a lasting rank) for anything outside 1..365. */
export const housekeepingTempRankSeconds = (days: number): number =>
    Number.isInteger(days) && days >= 1 && days <= HOUSEKEEPING_TEMP_RANK_MAX_DAYS ? days * 24 * 3600 : 0;
