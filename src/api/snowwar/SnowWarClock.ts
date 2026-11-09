/**
 * Countdown clocks are derived from an absolute wall-clock deadline. Browser
 * timers and animation frames are deliberately not the source of truth:
 * background tabs may throttle or pause both.
 */
export const snowWarDeadlineFromSeconds = (nowMs: number, seconds: number): number =>
    nowMs + (Math.max(0, seconds) * 1000);

export const snowWarSecondsRemaining = (deadlineMs: number, nowMs: number): number =>
    Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
