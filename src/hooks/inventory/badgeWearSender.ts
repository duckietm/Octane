/** How long a change to the worn badges waits for the next one before the set is sent. */
export const BADGE_WEAR_SEND_DELAY_MS = 300;

export interface TrailingSender<T> {
    /** Keeps the newest value and sends it once no other arrives within the delay. */
    push(value: T): void;
    /** Sends the waiting value now, if there is one. */
    flush(): void;
    isPending(): boolean;
}

/**
 * Sends only the last of a quick run of values. Wearing badges one click after another sent a packet per click, and
 * the server's flood guard dropped the later ones, so the final set was lost.
 */
export const createTrailingSender = <T>(send: (value: T) => void, delayMs = BADGE_WEAR_SEND_DELAY_MS): TrailingSender<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let waiting: { value: T } | null = null;

    const flush = () => {
        if (timer) clearTimeout(timer);
        timer = null;

        if (!waiting) return;

        const { value } = waiting;
        waiting = null;
        send(value);
    };

    return {
        push(value) {
            waiting = { value };

            if (timer) clearTimeout(timer);
            timer = setTimeout(flush, delayMs);
        },
        flush,
        isPending: () => waiting !== null
    };
};
