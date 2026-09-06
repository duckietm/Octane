import { GetConfigurationValue } from '../../../../api';

/**
 * Length bounds for a warning. The official April tool set an impossible pair (minimum
 * above maximum) because it never meant to send anything; ours must, so the bounds come
 * from configuration with defaults a real moderator can meet.
 */
export const CONFIG_WARNING_MIN_LENGTH = 'modtools.warning.min.length';
export const CONFIG_WARNING_MAX_LENGTH = 'modtools.warning.max.length';
export const DEFAULT_WARNING_MIN_LENGTH = 10;
export const DEFAULT_WARNING_MAX_LENGTH = 250;

export const MIN_COIN_AMOUNT = 1;
export const MAX_COIN_AMOUNT = 99999;
export const MIN_FURNI_AMOUNT = 1;
export const MAX_FURNI_AMOUNT = 100;

export type WarningProblem = 'empty' | 'short' | 'long' | null;

export interface BanDuration {
    key: string;
    hours: number;
    fallbackLabel: string;
}

/** The durations in the official duration drop-down, longest last so "1 Month" is the default like the AS3 selection. */
export const BAN_DURATIONS: BanDuration[] = [
    { key: 'hour', hours: 1, fallbackLabel: '1 hour' },
    { key: 'day', hours: 24, fallbackLabel: '1 day' },
    { key: 'week', hours: 24 * 7, fallbackLabel: '1 week' },
    { key: 'month', hours: 24 * 30, fallbackLabel: '1 month' },
    { key: 'permanent', hours: 24 * 365 * 100, fallbackLabel: 'Permanent' }
];

/** Reads a whole number from configuration; anything unusable keeps the default. */
export const readIntegerConfig = (key: string, fallback: number): number => {
    const parsed = parseInt(GetConfigurationValue<string>(key, ''), 10);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** The warning bounds actually in force, with the maximum never below the minimum so validation can always pass. */
export const getWarningBounds = (): { min: number; max: number } => {
    const min = readIntegerConfig(CONFIG_WARNING_MIN_LENGTH, DEFAULT_WARNING_MIN_LENGTH);
    const max = Math.max(min, readIntegerConfig(CONFIG_WARNING_MAX_LENGTH, DEFAULT_WARNING_MAX_LENGTH));

    return { min, max };
};

/** Why a warning text cannot be sent, or null when it can; whitespace around it does not count. */
export const validateWarning = (text: string, min: number, max: number): WarningProblem => {
    const length = (text || '').trim().length;

    if (length === 0) return 'empty';
    if (length < min) return 'short';
    if (length > max) return 'long';

    return null;
};

/** Keeps a typed amount inside the tool's limits; garbage becomes the minimum. */
export const clampAmount = (value: number | string, min: number, max: number): number => {
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);

    if (!Number.isFinite(parsed)) return min;

    return Math.min(max, Math.max(min, Math.trunc(parsed)));
};

/** A furni can be named by its numeric id or by its class name; the caller resolves names through furnidata. */
export const parseFurniReference = (value: string): { itemId: number | null; className: string | null } => {
    const trimmed = (value || '').trim();

    if (!trimmed.length) return { itemId: null, className: null };

    if (/^\d+$/.test(trimmed)) return { itemId: parseInt(trimmed, 10), className: null };

    return { itemId: null, className: trimmed };
};
