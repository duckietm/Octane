/**
 * Runs at most one task per interval and never loses the last one: a task asked for too soon waits for the end of
 * the interval, and a newer one replaces it. For requests the server rate-limits and silently drops - answering
 * none of a burst and then the first one, while the screen waits for the last.
 */
export class TrailingThrottle {
    private lastRun = Number.NEGATIVE_INFINITY;
    private timer: ReturnType<typeof setTimeout> = null;
    private pending: (() => void) | null = null;

    constructor(
        private readonly intervalMs: number,
        private readonly now: () => number = () => Date.now()
    ) {}

    public run(task: () => void): void {
        const wait = this.lastRun + this.intervalMs - this.now();

        if (wait <= 0 && !this.timer) {
            this.lastRun = this.now();
            task();
            return;
        }

        this.pending = task;

        if (this.timer) return;

        this.timer = setTimeout(
            () => {
                const next = this.pending;

                this.timer = null;
                this.pending = null;
                this.lastRun = this.now();
                next?.();
            },
            Math.max(0, wait)
        );
    }

    public cancel(): void {
        if (this.timer) clearTimeout(this.timer);

        this.timer = null;
        this.pending = null;
    }
}
