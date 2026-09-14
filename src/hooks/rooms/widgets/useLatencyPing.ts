import { LatencyPingRequestMessageComposer, LatencyPingResponseEvent } from '@octane/renderer';
import { useCallback, useEffect } from 'react';
import { GetConfigurationValue, SendMessageComposer } from '../../../api';
import { createOctaneStore } from '../../../state/createOctaneStore';
import { useMessageEvent } from '../../events';

/**
 * Port of the official `LatencyTracker`: every `latencytest.interval`
 * milliseconds it sends a numbered ping (`LatencyPingRequest`, 295) and times
 * the echo (`LatencyPingResponse`, 10). `:ping` reads the last measurement -
 * the official `ChatInputWidgetHandler.as:293` shows `habboTracking.latencyPingMs`,
 * which is `-1` until the first round trip completes.
 */
interface LatencyPingStore {
    latencyMs: number;
    nextRequestId: number;
    pending: Map<number, number>;
}

const DEFAULT_INTERVAL_MS = 20000;

// The official tracker is driven by the room's update loop, so its first ping
// goes out a moment after entering rather than during construction. Keeping a
// short delay here mirrors that and leaves the first measurement ready well
// before anyone can type `:ping`.
const FIRST_PING_DELAY_MS = 1000;

// Requests older than this are dropped: without a cap a lost response would
// keep its timestamp around forever, and a much later id collision would then
// report a bogus multi-minute latency.
const REQUEST_TIMEOUT_MS = 60000;

const useLatencyPingStore = createOctaneStore<LatencyPingStore>()(() => ({
    latencyMs: -1,
    nextRequestId: 0,
    pending: new Map<number, number>()
}));

/** The latest round trip in milliseconds, or -1 while it is still measuring. */
export const getLatencyPingMs = () => useLatencyPingStore.getState().latencyMs;

export const sendLatencyPing = () => {
    const { nextRequestId, pending } = useLatencyPingStore.getState();
    const now = Date.now();

    for (const [id, sentAt] of pending) {
        if (now - sentAt > REQUEST_TIMEOUT_MS) pending.delete(id);
    }

    pending.set(nextRequestId, now);
    useLatencyPingStore.setState({ nextRequestId: nextRequestId + 1 });
    SendMessageComposer(new LatencyPingRequestMessageComposer(nextRequestId));
};

/**
 * Drives the measurement while a room session is mounted. The official client
 * runs the tracker for the whole session, but `:ping` is the only thing that
 * reads it and that command only exists in a room.
 */
export const useLatencyPing = () => {
    const onResponse = useCallback((event: LatencyPingResponseEvent) => {
        const parser = event.getParser();

        if (!parser) return;

        const { pending } = useLatencyPingStore.getState();
        const sentAt = pending.get(parser.requestId);

        if (sentAt === undefined) return;

        pending.delete(parser.requestId);
        useLatencyPingStore.setState({ latencyMs: Math.max(0, Date.now() - sentAt) });
    }, []);

    useMessageEvent<LatencyPingResponseEvent>(LatencyPingResponseEvent, onResponse);

    useEffect(() => {
        const interval = GetConfigurationValue<number>('latencytest.interval', DEFAULT_INTERVAL_MS);

        if (!interval || interval < 1) return;

        const first = window.setTimeout(sendLatencyPing, FIRST_PING_DELAY_MS);
        const timer = window.setInterval(sendLatencyPing, interval);

        return () => {
            window.clearTimeout(first);
            window.clearInterval(timer);
        };
    }, []);
};
