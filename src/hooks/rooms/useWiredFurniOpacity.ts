import { GetRoomEngine, RoomEngineObjectEvent, RoomObjectCategory, WiredFeatureCapabilitiesComposer, WiredFurniOpacityEvent } from '@octane/renderer';
import { useEffect, useRef } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';
import { WiredFurniOpacityController } from './WiredFurniOpacityController';

const WIRED_FEATURE_PROTOCOL_VERSION = 1;
const WIRED_FEATURE_OPACITY = 1;
const WIRED_FEATURE_MOVE_STYLE = 2;

export const useWiredFurniOpacity = (roomId: number): void => {
    const controllerRef = useRef<WiredFurniOpacityController>(null);

    if (!controllerRef.current) {
        controllerRef.current = new WiredFurniOpacityController(
            {
                getObject: (activeRoomId, itemId, category) => GetRoomEngine().getRoomObject(activeRoomId, itemId, category)
            },
            {
                now: () => performance.now(),
                request: (callback) => requestAnimationFrame(callback),
                cancel: (handle) => cancelAnimationFrame(handle)
            }
        );
    }

    useMessageEvent<WiredFurniOpacityEvent>(WiredFurniOpacityEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        controllerRef.current.apply(parser.roomId, parser.updates);
    });

    useOctaneEvent<RoomEngineObjectEvent>([RoomEngineObjectEvent.ADDED, RoomEngineObjectEvent.REMOVED], (event) => {
        if (event.category !== RoomObjectCategory.FLOOR && event.category !== RoomObjectCategory.WALL) return;

        if (event.type === RoomEngineObjectEvent.ADDED) {
            controllerRef.current.objectAdded(event.roomId, event.objectId, event.category);
        } else {
            controllerRef.current.objectRemoved(event.roomId, event.objectId, event.category);
        }
    });

    useEffect(() => {
        controllerRef.current.setRoom(roomId);

        if (roomId > 0) {
            SendMessageComposer(new WiredFeatureCapabilitiesComposer(WIRED_FEATURE_PROTOCOL_VERSION, WIRED_FEATURE_OPACITY | WIRED_FEATURE_MOVE_STYLE));
        }
    }, [roomId]);

    useEffect(() => () => controllerRef.current.dispose(), []);
};
