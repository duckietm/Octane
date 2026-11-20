import { GetTicker, LatencyPingRequestMessageComposer, LatencyPingResponseEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../../../api';
import { useMessageEvent } from '../../../../hooks/events';
import { formatRoomStats, useRoomStatsStore } from '../../../../hooks/rooms/widgets/roomStatsStore';

/** How often the readout is rewritten, and how often the round trip to the server is timed. */
const REFRESH_MS = 1000;
const PING_INTERVAL_MS = 5000;
/** Ahead of and behind every other listener of the frame, so the two bracket the frame's work. */
const FIRST_IN_FRAME = 1000;
const LAST_IN_FRAME = -1000;

const RoomStatsReadout: FC = () => {
    const [text, setText] = useState('');
    const pingRef = useRef({ ms: -1, requestId: 0, sentAt: 0 });

    useMessageEvent<LatencyPingResponseEvent>(LatencyPingResponseEvent, (event) => {
        const ping = pingRef.current;

        if (event.getParser().requestId === ping.requestId && ping.sentAt > 0) ping.ms = performance.now() - ping.sentAt;
    });

    useEffect(() => {
        const requestPing = () => {
            const ping = pingRef.current;

            ping.requestId++;
            ping.sentAt = performance.now();
            SendMessageComposer(new LatencyPingRequestMessageComposer(ping.requestId));
        };

        requestPing();

        const timer = window.setInterval(requestPing, PING_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const ticker = GetTicker();
        let frames = 0;
        let workMs = 0;
        let frameStart = 0;
        let windowStart = performance.now();

        const onFrameStart = () => {
            frameStart = performance.now();
        };

        const onFrameEnd = () => {
            const now = performance.now();

            frames++;
            workMs += now - frameStart;

            if (now - windowStart < REFRESH_MS) return;

            setText(formatRoomStats({ pingMs: pingRef.current.ms, frameIntervalMs: (now - windowStart) / frames, frameTimeMs: workMs / frames }));
            frames = 0;
            workMs = 0;
            windowStart = now;
        };

        ticker.add(onFrameStart, null, FIRST_IN_FRAME);
        ticker.add(onFrameEnd, null, LAST_IN_FRAME);

        return () => {
            ticker.remove(onFrameStart, null);
            ticker.remove(onFrameEnd, null);
        };
    }, []);

    return <div className="octane-room-stats">{text}</div>;
};

/** The official room canvas statistics (`:showstats`): ping, frames per second and frame time, bottom right. */
export const RoomStatsView: FC = () => {
    const enabled = useRoomStatsStore((state) => state.enabled);

    return enabled ? <RoomStatsReadout /> : null;
};
