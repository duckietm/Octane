import { GetCommunication, IMessageEvent } from '@octane/renderer';

export interface AwaitMessageEventInit<T extends IMessageEvent, R = T> {
    timeoutMs?: number;
    signal?: AbortSignal;
    accept?: (event: T) => boolean;
    /**
     * Synchronous mapper that runs INSIDE the subscribe callback, while
     * the parser is still valid. Whatever it returns is what the Promise
     * resolves to. **MUST** be used for any read of `event.getParser()` —
     * the renderer recycles parser instances (the `_parser` field is
     * nulled / repopulated for the next packet) so reading the parser
     * AFTER the await microtask gives back null fields. Snapshot the
     * data here, return a plain object/value, then your async code is
     * safe.
     */
    select?: (event: T) => R;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * One-shot Promise adapter over the renderer's CommunicationManager.subscribeMessage.
 * Resolves on the first matching event, rejects on timeout / abort / connection error.
 * Used by request-response patterns (e.g. housekeeping lookups) that need a Promise
 * facade over the underlying packet stream.
 *
 * **Read the parser inside `select`, not after the await.** See the
 * AwaitMessageEventInit.select javadoc — the renderer recycles parsers,
 * so post-await reads come back null.
 */
export const awaitMessageEvent = <T extends IMessageEvent, R = T>(
    eventCtor: new (callback: (event: T) => void) => T,
    init: AwaitMessageEventInit<T, R> = {}
): Promise<R> => {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, accept, select } = init;

    return new Promise<R>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('aborted', 'AbortError'));

            return;
        }

        const communication = GetCommunication();

        if (!communication || !communication.connection) {
            reject(new Error('no_connection'));

            return;
        }

        let settled = false;
        let unsubscribe: (() => void) | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let onAbort: (() => void) | null = null;

        const cleanup = () => {
            settled = true;
            if (unsubscribe) unsubscribe();
            unsubscribe = null;
            if (timer) clearTimeout(timer);
            timer = null;
            if (onAbort && signal) signal.removeEventListener('abort', onAbort);
            onAbort = null;
        };

        unsubscribe = communication.subscribeMessage(eventCtor, (event) => {
            if (settled) return;

            if (accept && !accept(event)) return;

            // Snapshot the data synchronously: post-await reads of the
            // event's parser come back null because the renderer recycles
            // parser instances between packets. If no select supplied,
            // resolve with the raw event for backwards-compat callers
            // that don't touch the parser.
            let snapshot: R;

            try {
                snapshot = select ? select(event) : (event as unknown as R);
            } catch (err) {
                cleanup();
                reject(err instanceof Error ? err : new Error(String(err)));

                return;
            }

            cleanup();
            resolve(snapshot);
        });

        timer = setTimeout(() => {
            if (settled) return;
            cleanup();
            reject(new Error('timeout'));
        }, timeoutMs);

        if (signal) {
            onAbort = () => {
                if (settled) return;
                cleanup();
                reject(new DOMException('aborted', 'AbortError'));
            };
            signal.addEventListener('abort', onAbort, { once: true });
        }
    });
};
