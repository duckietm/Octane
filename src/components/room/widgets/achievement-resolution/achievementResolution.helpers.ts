import { localizeWithFallback } from '../../../../api';

/** `resolution.disabled.<state>`: why an achievement cannot be promised. Zero means it can. */
export const RESOLUTION_ENABLED = 0;
export const RESOLUTION_ALL_LEVELS_DONE = 1;
export const RESOLUTION_ALREADY_PROMISED = 2;

/** Seconds left, floored at zero, from the timestamp the hotel sends. */
export const secondsLeft = (endTime: number, now: number = Date.now()): number => Math.max(0, endTime - Math.floor(now / 1000));

/** The countdown the window shows: days and hours while there is a day left, else hours and minutes. */
export const formatTimeLeft = (seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds));
    const days = Math.floor(safe / 86400);
    const hours = Math.floor((safe % 86400) / 3600);
    const minutes = Math.floor((safe % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;

    return `${minutes}m`;
};

/** The reason a candidate is greyed out, empty when it can be picked. */
export const disabledReason = (state: number): string =>
    state === RESOLUTION_ENABLED
        ? ''
        : localizeWithFallback(
              `resolution.disabled.${state}`,
              state === RESOLUTION_ALL_LEVELS_DONE
                  ? 'You have already completed all levels in this achievement.'
                  : 'You already have an unfinished challenge for this achievement.'
          );

/** Progress as a percentage, clamped, for the bar in the progress window. */
export const progressPercent = (userProgress: number, totalProgress: number): number => {
    if (!totalProgress || totalProgress <= 0) return 0;

    return Math.max(0, Math.min(100, Math.round((userProgress / totalProgress) * 100)));
};
