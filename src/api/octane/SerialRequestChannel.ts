/**
 * Request/reply pairs over a packet that carries no request id, kept apart by order: one request is in flight at a
 * time, so a reply belongs to the oldest one waiting, and requests leave at least `intervalMs` apart, so the server's
 * rate limit never drops one (a dropped request would leave its reply to the next request).
 *
 * A request whose signal was aborted before it left is skipped. Once sent, its reply is still waited for - an
 * abandoned reply would otherwise land on the next request.
 */
export class SerialRequestChannel {
    private tail: Promise<unknown> = Promise.resolve();
    private lastSent = Number.NEGATIVE_INFINITY;

    constructor(
        private readonly intervalMs: number,
        private readonly now: () => number = () => Date.now(),
        private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    ) {}

    public run<R>(send: () => void, awaitReply: () => Promise<R>, signal?: AbortSignal): Promise<R> {
        const task = async (): Promise<R> => {
            if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

            const wait = this.lastSent + this.intervalMs - this.now();

            if (wait > 0) await this.sleep(wait);

            if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

            const reply = awaitReply();

            send();
            this.lastSent = this.now();

            return reply;
        };

        const result = this.tail.then(task, task);

        this.tail = result.catch(() => undefined);

        return result;
    }
}
