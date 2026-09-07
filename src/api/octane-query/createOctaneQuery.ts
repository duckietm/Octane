import { GetCommunication, IMessageComposer, IMessageEvent, MessageEvent } from '@octane/renderer';
import { QueryKey, UseQueryOptions, UseQueryResult, useQuery } from '@tanstack/react-query';
import { SendMessageComposer } from '../octane/SendMessageComposer';

export interface OctaneQueryConfig<TParser extends IMessageEvent, TData> {
    /**
     * Stable key for caching/deduping. Convention:
     * `['octane', '<domain>', '<request>', ...args]`.
     */
    key: QueryKey;
    /**
     * Factory for the request composer. Called once per query execution.
     * `null` skips sending (useful when the server pushes the event
     * unprompted — you only want subscription, not a request).
     */
    request: (() => IMessageComposer<unknown[]>) | null;
    /**
     * The parser class to listen for as the response.
     */
    parser: typeof MessageEvent;
    /**
     * Maps the parser event to the data the component cares about.
     */
    select?: (event: TParser) => TData;
    /**
     * Optional predicate to ignore parser events that don't match this
     * query (typically used as a correlation-key filter on a globally
     * shared event stream — e.g. `e => e.getParser()?.roomId === roomId`).
     * When the predicate returns false, the listener stays registered
     * and keeps waiting; the timeout still applies.
     */
    accept?: (event: TParser) => boolean;
    /**
     * Max time to wait for the response before rejecting (default 15s).
     */
    timeoutMs?: number;
    /**
     * Forwarded to TanStack Query.
     */
    enabled?: boolean;
    staleTime?: number;
    refetchOnMount?: boolean | 'always';
}

/**
 * Wraps a Octane composer/parser request-response pair as a TanStack Query
 * `useQuery` call. The returned object is the standard TanStack result —
 * `{ data, isLoading, isError, error, refetch, ... }`.
 *
 * Behavior:
 * - On the first subscribe, registers the parser, sends the composer,
 *   resolves the Promise with the selected payload when the parser fires.
 * - Default `staleTime` is the QueryClient default (30s).
 * - Subsequent mounts within `staleTime` get the cached value immediately;
 *   the request is NOT re-sent.
 * - Identical concurrent calls (same `key`) are deduped.
 */
export const useOctaneQuery = <TParser extends IMessageEvent, TData = TParser>(config: OctaneQueryConfig<TParser, TData>): UseQueryResult<TData> => {
    const { key, request, parser, select, accept, timeoutMs = 15_000, enabled, staleTime, refetchOnMount } = config;

    const options: UseQueryOptions<TData, Error, TData> = {
        queryKey: key,
        queryFn: () => awaitOctaneResponse<TParser, TData>({ request, parser, select, accept, timeoutMs }),
        enabled,
        staleTime,
        refetchOnMount
    };

    return useQuery(options);
};

/**
 * Lower-level helper: send a composer (if any) and resolve with the next
 * matching parser event. Exposed so `queryClient.fetchQuery({...})` callers
 * can use the same plumbing imperatively.
 */
export const awaitOctaneResponse = <TParser extends IMessageEvent, TData>(
    config: Pick<OctaneQueryConfig<TParser, TData>, 'request' | 'parser' | 'select' | 'accept' | 'timeoutMs'>
): Promise<TData> =>
    new Promise<TData>((resolve, reject) => {
        const { request, parser: ParserCtor, select, accept, timeoutMs = 15_000 } = config;

        let settled = false;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        let listener: IMessageEvent | undefined = undefined;

        const cleanup = () => {
            if (timeoutHandle !== null) clearTimeout(timeoutHandle);
            if (listener) GetCommunication().removeMessageEvent(listener);
        };

        listener = new (ParserCtor as any)((event: TParser) => {
            if (settled) return;
            if (accept && !accept(event)) return;
            settled = true;

            try {
                // Removing a message event disposes it and clears its parser.
                // Read the response payload before cleanup so selectors such
                // as event.getParser() still receive the parsed message.
                const data = select ? select(event) : (event as unknown as TData);

                cleanup();
                resolve(data);
            } catch (err) {
                cleanup();
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        });

        GetCommunication().registerMessageEvent(listener);

        timeoutHandle = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error(`OctaneQuery timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        if (request) SendMessageComposer(request());
    });
