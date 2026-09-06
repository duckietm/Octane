/**
 * Scroll behaviour of the chat history tray, mirrored from the official
 * ChatHistoryScrollView: a new entry glides the list to the latest line in
 * 140 ms, but only when the reader was already at the bottom; after a wheel
 * scroll ends near the bottom the list springs back onto the latest line in
 * 180 ms so it never rests a few pixels short of it.
 */
export const AUTO_SCROLL_TO_LATEST_DURATION_MS = 140;
export const SPRINGBACK_DURATION_MS = 180;

// The browser gives no "wheel finished" event, so a wheel scroll counts as
// finished once this much time passes without another wheel tick.
export const WHEEL_SETTLE_DELAY_MS = 120;

// How far above the bottom a wheel scroll may end and still snap back onto
// the latest line. Anything further up counts as reading older history.
export const SPRINGBACK_SNAP_ZONE_PX = 24;

// Sub-pixel scroll positions and the odd rounding of scrollHeight would
// otherwise make "at the bottom" flicker between true and false.
const AT_BOTTOM_TOLERANCE_PX = 2;

export const easeOutCubic = (progress: number): number => 1 - (1 - Math.min(1, Math.max(0, progress))) ** 3;

export const getMaxScrollTop = (scrollHeight: number, clientHeight: number): number => Math.max(0, scrollHeight - clientHeight);

export const isPinnedToLatest = (scrollTop: number, scrollHeight: number, clientHeight: number): boolean =>
    scrollTop >= getMaxScrollTop(scrollHeight, clientHeight) - AT_BOTTOM_TOLERANCE_PX;

/**
 * Where a finished wheel scroll should settle, or null when the list may
 * stay where the reader left it.
 */
export const getSpringbackTarget = (scrollTop: number, scrollHeight: number, clientHeight: number): number | null => {
    const maxScrollTop = getMaxScrollTop(scrollHeight, clientHeight);

    if (Math.round(scrollTop) === Math.round(maxScrollTop)) return null;

    if (scrollTop < maxScrollTop - SPRINGBACK_SNAP_ZONE_PX) return null;

    return maxScrollTop;
};

export interface ScrollGlide {
    cancel: () => void;
}

/**
 * Animate `element.scrollTop` to `target` with the official ease-out curve.
 * Returns a handle so a newer glide can cancel the one still running.
 */
export const glideScrollTop = (
    element: HTMLElement,
    target: number,
    durationMs: number,
    requestFrame: (callback: (time: number) => void) => number = (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle: number) => void = (handle) => window.cancelAnimationFrame(handle)
): ScrollGlide => {
    const from = element.scrollTop;
    let startTime = -1;
    let frame = 0;
    let cancelled = false;

    if (Math.round(from) === Math.round(target)) return { cancel: () => undefined };

    const step = (time: number) => {
        if (cancelled) return;

        if (startTime < 0) startTime = time;

        const progress = Math.min(1, (time - startTime) / durationMs);

        element.scrollTop = Math.round(from + (target - from) * easeOutCubic(progress));

        if (progress < 1) frame = requestFrame(step);
    };

    frame = requestFrame(step);

    return {
        cancel: () => {
            cancelled = true;
            cancelFrame(frame);
        }
    };
};
