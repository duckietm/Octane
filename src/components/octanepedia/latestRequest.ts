/**
 * Keeps only the newest of a series of requests: starting one aborts the one before. Two help pages opened one after
 * the other used to race, and whichever answered last was shown, not the one asked for last.
 */
export const createLatestRequest = () => {
    let current: AbortController | null = null;

    return {
        start(): AbortSignal {
            current?.abort();
            current = new AbortController();

            return current.signal;
        },
        abort(): void {
            current?.abort();
            current = null;
        }
    };
};
