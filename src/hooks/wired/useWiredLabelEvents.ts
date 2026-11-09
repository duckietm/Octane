import {
    RoomEngineEvent,
    RoomId,
    RoomObjectCategory,
    RoomSessionEvent,
    WiredLabelsEvent,
    WiredLabelsUpdateEvent
} from '@octane/renderer';
import { useFurniRemovedEvent, useObjectRollOutEvent, useObjectRollOverEvent, useObjectSelectedEvent } from '../rooms/engine';
import { useMessageEvent, useOctaneEvent } from '../events';
import { useWiredLabelStore } from './wiredLabelStore';

/**
 * Feeds the label store from the two server packets, and opens a label when its furni is clicked
 * or shows it faded while the mouse is over it, as the official client does.
 */
export const useWiredLabelEvents = () => {
    const replace = useWiredLabelStore((state) => state.replace);
    const update = useWiredLabelStore((state) => state.update);
    const toggle = useWiredLabelStore((state) => state.toggle);
    const setHovered = useWiredLabelStore((state) => state.setHovered);
    const clear = useWiredLabelStore((state) => state.clear);

    useMessageEvent<WiredLabelsEvent>(WiredLabelsEvent, (event) => {
        const parser = event.getParser();

        if (parser) replace(parser.labels);
    });

    useMessageEvent<WiredLabelsUpdateEvent>(WiredLabelsUpdateEvent, (event) => {
        const parser = event.getParser();

        if (parser) update(parser.changed, parser.removedIds);
    });

    useObjectSelectedEvent((event) => {
        if (event.category === RoomObjectCategory.FLOOR) toggle(event.id);
    });

    useObjectRollOverEvent((event) => {
        if (event.category === RoomObjectCategory.FLOOR) setHovered(event.id, true);
    });

    useObjectRollOutEvent((event) => {
        if (event.category === RoomObjectCategory.FLOOR) setHovered(event.id, false);
    });

    useFurniRemovedEvent(true, (event) => {
        if (event.category === RoomObjectCategory.FLOOR) update([], [event.id]);
    });

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => clear());
    // A closed inventory/catalog preview disposes its own room; only the real room clears.
    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, (event) => {
        if (!RoomId.isRoomPreviewerId(event.roomId)) clear();
    });
};
