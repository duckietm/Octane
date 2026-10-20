import { FurnitureAdjacentStackHeightComposer, FurnitureStackHeightComposer, FurnitureStackHeightEvent, GetRoomEngine, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { CanManipulateFurniture, GetRoomSession, IsPlayTestRestricted, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';

const MAX_HEIGHT: number = 40;
const WALK_HEIGHT_HELPER_MODEL_KEY = 'furniture_is_walk_height_helper';
// Official `CustomStackHeightWidgetHandler`: a walk tile is a furni whose class name starts with
// `tile_walkmagic`, and its multi-walk checkbox starts from `furniture_extra === 1`.
const WALK_MAGIC_CLASS_PREFIX = 'tile_walkmagic';

export const isWalkMagicType = (type: string): boolean => !!type && type.indexOf(WALK_MAGIC_CLASS_PREFIX) === 0;

export const readMultiWalk = (extras: unknown): boolean => Number(extras) === 1;

const useFurnitureStackHeightWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [height, setHeight] = useState(0);
    const [pendingHeight, setPendingHeight] = useState(-1);
    const [isWalkHeightHelper, setIsWalkHeightHelper] = useState(false);
    const [isWalkTile, setIsWalkTile] = useState(false);
    const [multiWalk, setMultiWalkState] = useState(false);

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setHeight(0);
        setPendingHeight(-1);
        setIsWalkHeightHelper(false);
        setIsWalkTile(false);
        setMultiWalkState(false);
    };

    // Official `button_move_up` / `button_move_down`: the server moves the helper to the adjacent height.
    const moveAdjacent = (moveDown: boolean) => {
        if (objectId === -1) return;

        setPendingHeight(-1);
        SendMessageComposer(new FurnitureAdjacentStackHeightComposer(objectId, moveDown));
    };

    // Official `onMultiWalkChange`: the checkbox resends the current height with the new multi-walk state.
    const setMultiWalk = (value: boolean) => {
        if (objectId === -1) return;

        setMultiWalkState(value);
        SendMessageComposer(new FurnitureStackHeightComposer(objectId, Math.round(height * 100), value));
    };

    const updateHeight = (height: number, server: boolean = false) => {
        if (!height) height = 0;

        height = Math.abs(height);

        if (!server) height > MAX_HEIGHT && (height = MAX_HEIGHT);

        setHeight(parseFloat(height.toFixed(2)));

        if (!server) setPendingHeight(height * 100);
    };

    useMessageEvent<FurnitureStackHeightEvent>(FurnitureStackHeightEvent, (event) => {
        const parser = event.getParser();

        if (objectId !== parser.furniId) return;

        updateHeight(parser.height, true);
    });

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_STACK_HEIGHT, (event) => {
        const roomSession = GetRoomSession();

        // Playtest keeps the helper's height (the hotel's own rule beyond AIR), as the server does.
        if (IsPlayTestRestricted(roomSession) || !CanManipulateFurniture(roomSession, event.objectId, event.category)) return;

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        setObjectId(event.objectId);
        setCategory(event.category);
        setHeight(roomObject.getLocation().z);
        setPendingHeight(-1);
        setIsWalkHeightHelper(roomObject.model?.getValue<number>(WALK_HEIGHT_HELPER_MODEL_KEY) > 0);
        setIsWalkTile(isWalkMagicType(roomObject.type));
        setMultiWalkState(readMultiWalk(roomObject.model?.getValue<string>(RoomObjectVariable.FURNITURE_EXTRAS)));
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    useEffect(() => {
        if (objectId === -1 || pendingHeight === -1) return;

        const timeout = setTimeout(() => SendMessageComposer(new FurnitureStackHeightComposer(objectId, ~~pendingHeight)), 10);

        return () => clearTimeout(timeout);
    }, [objectId, pendingHeight]);

    return { objectId, height, maxHeight: MAX_HEIGHT, isWalkHeightHelper: isWalkHeightHelper || isWalkTile, isWalkTile, multiWalk, onClose, updateHeight, moveAdjacent, setMultiWalk };
};

export const useFurnitureStackHeightWidget = useFurnitureStackHeightWidgetState;
