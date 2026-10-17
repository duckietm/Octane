import {
    RoomEngineEvent,
    RoomEntryInfoMessageEvent,
    RoomId,
    RoomSessionEvent,
    WiredLeaderboardChunkEvent,
    WiredLeaderboardSnapshotEvent,
    WiredLeaderboardSubscribeComposer
} from '@octane/renderer';
import { useEffect, useRef } from 'react';
import { SendMessageComposer } from '../../api';
import { LEADERBOARD_PAGE_SIZES, leaderboardDesiredChunks } from '../../api/wired/WiredLeaderboard';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useWiredLeaderboardStore } from './wiredLeaderboardStore';

const sendHello = () => SendMessageComposer(new WiredLeaderboardSubscribeComposer(0, 0, '0', []));

/**
 * Feeds the leaderboard store: the hello on entering a room (answered with the room's panels),
 * the snapshots and chunks, and the chunk subscriptions each panel's page needs.
 */
export const useWiredLeaderboardEvents = (roomId: number) => {
    const applySnapshot = useWiredLeaderboardStore((state) => state.applySnapshot);
    const applyChunk = useWiredLeaderboardStore((state) => state.applyChunk);
    const keepChunks = useWiredLeaderboardStore((state) => state.keepChunks);
    const clear = useWiredLeaderboardStore((state) => state.clear);
    const panels = useWiredLeaderboardStore((state) => state.panels);
    const snapshotSeq = useWiredLeaderboardStore((state) => state.snapshotSeq);
    const sent = useRef<Record<number, string>>({});

    useEffect(() => {
        if (!roomId) return;

        clear();
        sent.current = {};
        sendHello();
    }, [roomId, clear]);

    useMessageEvent<RoomEntryInfoMessageEvent>(RoomEntryInfoMessageEvent, () => {
        clear();
        sent.current = {};
        sendHello();
    });

    useMessageEvent<WiredLeaderboardSnapshotEvent>(WiredLeaderboardSnapshotEvent, (event) => {
        const parser = event.getParser();

        if (parser?.valid) applySnapshot(parser.descriptors);
    });

    useMessageEvent<WiredLeaderboardChunkEvent>(WiredLeaderboardChunkEvent, (event) => {
        const parser = event.getParser();

        if (parser) applyChunk(parser.overlayId, parser.revision, parser.variableId, parser.chunkIndex, parser.totalCount, parser.rows);
    });

    // Every snapshot may follow a hello that reset the server's subscriptions, so it sends them again;
    // the server ignores one it already holds.
    useEffect(() => {
        const next: Record<number, string> = {};

        for (const panel of Object.values(panels)) {
            if (!panel.variableId) continue;

            const entriesPerPage = LEADERBOARD_PAGE_SIZES[panel.descriptor.pageSizeOption] ?? 10;
            const chunks = leaderboardDesiredChunks(panel.page * entriesPerPage, entriesPerPage, panel.total, panel.movingForward);
            const key = `${snapshotSeq}|${panel.descriptor.revision}|${panel.variableId}|${chunks.join(',')}`;
            const overlayId = panel.descriptor.overlayId;

            next[overlayId] = key;

            if (sent.current[overlayId] === key) continue;

            SendMessageComposer(new WiredLeaderboardSubscribeComposer(overlayId, panel.descriptor.revision, panel.variableId, chunks));
            keepChunks(overlayId, chunks);
        }

        sent.current = next;
    }, [panels, snapshotSeq, keepChunks]);

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => clear());
    // A closed inventory/catalog preview disposes its own room; only the real room clears.
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, (event) => {
        if (!RoomId.isRoomPreviewerId(event.roomId)) clear();
    });
};
