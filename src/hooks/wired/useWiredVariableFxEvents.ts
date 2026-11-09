import {
    RoomEngineEvent,
    RoomEngineObjectEvent,
    RoomId,
    RoomObjectCategory,
    RoomSessionEvent,
    WiredVariableFxConfigsEvent,
    WiredVariableFxConfigsRemovedEvent,
    WiredVariableFxStatusEvent,
    WiredVariableFxStatusRemovedEvent
} from '@octane/renderer';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useWiredVariableFxStore, wiredVariableFxHolderKey } from './wiredVariableFxStore';

/**
 * Feeds the variable fx store from the four server packets, tells it which avatar or floor furni the
 * cursor is over (AIR's holder hover, for the fx that also show on hover) and empties it with the room.
 */
export const useWiredVariableFxEvents = () => {
    const applyConfigs = useWiredVariableFxStore((state) => state.applyConfigs);
    const removeConfigs = useWiredVariableFxStore((state) => state.removeConfigs);
    const applyStatuses = useWiredVariableFxStore((state) => state.applyStatuses);
    const removeStatuses = useWiredVariableFxStore((state) => state.removeStatuses);
    const setHovered = useWiredVariableFxStore((state) => state.setHovered);
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

    useOctaneEvent<RoomEngineObjectEvent>([RoomEngineObjectEvent.MOUSE_ENTER, RoomEngineObjectEvent.MOUSE_LEAVE], (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;
        if (event.category !== RoomObjectCategory.UNIT && event.category !== RoomObjectCategory.FLOOR) return;

        setHovered(wiredVariableFxHolderKey(event.category === RoomObjectCategory.UNIT, event.objectId), event.type === RoomEngineObjectEvent.MOUSE_ENTER);
    });

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => clear());
    // A closed inventory/catalog preview disposes its own room; only the real room clears.
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, (event) => {
        if (!RoomId.isRoomPreviewerId(event.roomId)) clear();
    });
};
