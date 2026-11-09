/** The largest value that survives the wire as a signed int. */
const INT32_MAX = 2147483647;

/**
 * A trade-lock length in hours as the seconds `ModTradingLockMessageComposer` expects.
 *
 * The server adds this to the current time to get `sanctions.trade_locked_until`, an
 * absolute timestamp. Sending minutes made a one-week lock a date in 1970, so the next
 * login read the lock as expired and unlocked the user - and so did a permanent one.
 *
 * The "permanent" sanction is 876000 hours, which as seconds overflows a signed int, so
 * the value is clamped here; the server clamps the timestamp it derives the same way.
 */
export const tradeLockSeconds = (hours: number): number =>
    Math.min(Math.max(Math.round(hours), 1) * 3600, INT32_MAX);
