import {
    RoomEngineEvent,
    RoomId,
    RoomSessionEvent,
    WiredVariableFxConfigsEvent,
    WiredVariableFxConfigsRemovedEvent,
    WiredVariableFxStatusEvent,
    WiredVariableFxStatusRemovedEvent
} from '@octane/renderer';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useWiredVariableFxStore } from './wiredVariableFxStore';

/** Feeds the variable fx store from the four server packets and empties it with the room. */
export const useWiredVariableFxEvents = () => {
    const applyConfigs = useWiredVariableFxStore((state) => state.applyConfigs);
    const removeConfigs = useWiredVariableFxStore((state) => state.removeConfigs);
    const applyStatuses = useWiredVariableFxStore((state) => state.applyStatuses);
    const removeStatuses = useWiredVariableFxStore((state) => state.removeStatuses);
    const clear = useWiredVariableFxStore((state) => state.clear);

    useMessageEvent<WiredVariableFxConfigsEvent>(WiredVariableFxConfigsEvent, (event) => {
        const parser = event.getParser();

        if (parser) applyConfigs(parser.configs);
    });

    useMessageEvent<WiredVariableFxConfigsRemovedEvent>(WiredVariableFxConfigsRemovedEvent, (event) => {
        const parser = event.getParser();

        if (parser) removeConfigs(parser.configIds);
    });

    useMessageEvent<WiredVariableFxStatusEvent>(WiredVariableFxStatusEvent, (event) => {
        const parser = event.getParser();

        if (parser) applyStatuses(parser.initializeAll, parser.statuses);
    });

    useMessageEvent<WiredVariableFxStatusRemovedEvent>(WiredVariableFxStatusRemovedEvent, (event) => {
        const parser = event.getParser();

        if (parser) removeStatuses(parser.keys);
    });

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => clear());
    // A closed inventory/catalog preview disposes its own room; only the real room clears.
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, (event) => {
        if (!RoomId.isRoomPreviewerId(event.roomId)) clear();
    });
};
