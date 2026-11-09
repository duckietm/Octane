/** The official editor's action delay: 0 to 120 pulses of 0.5 s (up to 60 s). */
export const WIRED_ACTION_DELAY_MAX_PULSES = 120;
/** Precise mode: 0 to 1200 steps of 50 ms, sent as a negative number of milliseconds. */
export const WIRED_ACTION_DELAY_MAX_PRECISE_STEPS = 1200;
export const WIRED_ACTION_DELAY_PRECISE_STEP_MS = 50;

export const isPreciseWiredDelay = (encoded: number) => encoded < 0;

/** Pulses for a standard delay, 50 ms steps for a precise one. */
export const wiredDelayUnits = (encoded: number) => (encoded < 0 ? Math.round(-encoded / WIRED_ACTION_DELAY_PRECISE_STEP_MS) : Math.max(0, encoded));

export const encodeWiredDelay = (units: number, precise: boolean) => {
    if (precise) {
        const steps = Math.max(0, Math.min(WIRED_ACTION_DELAY_MAX_PRECISE_STEPS, Math.round(units)));

        return steps ? -(steps * WIRED_ACTION_DELAY_PRECISE_STEP_MS) : 0;
    }

    return Math.max(0, Math.min(WIRED_ACTION_DELAY_MAX_PULSES, Math.round(units)));
};

export const wiredDelayToSeconds = (encoded: number) => (encoded < 0 ? -encoded / 1000 : Math.max(0, encoded) / 2);

/** The delay in seconds as the editor shows it: 1.5, 0.05, 2. */
export const formatWiredDelaySeconds = (encoded: number) => {
    const seconds = wiredDelayToSeconds(encoded);

    return (Math.round(seconds * 100) / 100).toString();
};

/** Seconds typed into the field, as a delay of the given mode. */
export const wiredDelayFromSeconds = (seconds: number, precise: boolean) => {
    if (!Number.isFinite(seconds)) return 0;

    return encodeWiredDelay(precise ? (seconds * 1000) / WIRED_ACTION_DELAY_PRECISE_STEP_MS : seconds * 2, precise);
};
