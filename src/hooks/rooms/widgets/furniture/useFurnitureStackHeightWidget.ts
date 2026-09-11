import {
    FurnitureStackHeightComposer,
    FurnitureStackHeightEvent,
    GetRoomEngine,
    GetSessionDataManager,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { CanManipulateFurniture, GetRoomSession, SendMessageComposer } from '../../../../api';
import { useMessageEvent, useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { composeMultiWalkStackHeight, isMultiWalkExtra, isWalkHeightClassName } from './stackHeight.helpers';

const MAX_HEIGHT: number = 40;
const WALK_HEIGHT_HELPER_MODEL_KEY = 'furniture_is_walk_height_helper';

const useFurnitureStackHeightWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [height, setHeight] = useState(0);
    const [pendingHeight, setPendingHeight] = useState(-1);
    const [isWalkHeightHelper, setIsWalkHeightHelper] = useState(false);
    const [isMultiWalkMode, setIsMultiWalkMode] = useState(false);

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setHeight(0);
        setPendingHeight(-1);
        setIsWalkHeightHelper(false);
        setIsMultiWalkMode(false);
    };

    const updateHeight = (height: number, server: boolean = false) => {
        if (!height) height = 0;

        height = Math.abs(height);

        if (!server) height > MAX_HEIGHT && (height = MAX_HEIGHT);

        setHeight(parseFloat(height.toFixed(2)));

        if (!server) setPendingHeight(height * 100);
    };

    // Official `CustomStackHeightWidget.onMultiWalkChange`: the checkbox sends the current height
    // together with the multi-walk flag.
    const updateMultiWalkMode = (enabled: boolean) => {
        if (objectId === -1) return;

        setIsMultiWalkMode(enabled);
        SendMessageComposer(composeMultiWalkStackHeight(objectId, ~~(height * 100), enabled));
    };

    useMessageEvent<FurnitureStackHeightEvent>(FurnitureStackHeightEvent, (event) => {
        const parser = event.getParser();

        if (objectId !== parser.furniId) return;

        updateHeight(parser.height, true);
    });

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_STACK_HEIGHT, (event) => {
        if (!CanManipulateFurniture(GetRoomSession(), event.objectId, event.category)) return;

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        // Official `class_3611.processEvent`: the walk variant is the `tile_walkmagic*` floor item
        // and the checkbox follows `furniture_extra == 1`.
        const typeId = roomObject.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? -1;
        const floorItemData = typeId > 0 ? GetSessionDataManager().getFloorItemData(typeId) : null;
        const isWalkVariant = isWalkHeightClassName(floorItemData?.className) || roomObject.model?.getValue<number>(WALK_HEIGHT_HELPER_MODEL_KEY) > 0;

        setObjectId(event.objectId);
        setCategory(event.category);
        setHeight(roomObject.getLocation().z);
        setPendingHeight(-1);
        setIsWalkHeightHelper(isWalkVariant);
        setIsMultiWalkMode(isWalkVariant && isMultiWalkExtra(roomObject.model?.getValue<string>(RoomObjectVariable.FURNITURE_EXTRAS)));
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

    return { objectId, height, maxHeight: MAX_HEIGHT, isWalkHeightHelper, isMultiWalkMode, onClose, updateHeight, updateMultiWalkMode };
};

export const useFurnitureStackHeightWidget = useFurnitureStackHeightWidgetState;
