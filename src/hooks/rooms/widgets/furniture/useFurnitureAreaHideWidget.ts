import {
    GetRoomEngine,
    RoomAreaSelectionManager,
    RoomEngineAreaHideStateEvent,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    SetObjectDataMessageComposer
} from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { CanManipulateFurniture, SendMessageComposer } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useRoom } from '../../useRoom';

const useFurnitureAreaHideWidgetState = () => {
    const [objectId, setObjectId] = useState<number>(-1);
    const [category, setCategory] = useState<number>(-1);
    const [isOn, setIsOn] = useState<boolean>(false);
    const [rootX, setRootX] = useState<number>(0);
    const [rootY, setRootY] = useState<number>(0);
    const [width, setWidth] = useState<number>(0);
    const [length, setLength] = useState<number>(0);
    const [invisibility, setInvisibility] = useState<boolean>(false);
    const [wallItems, setWallItems] = useState<boolean>(false);
    const [inverted, setInverted] = useState<boolean>(false);
    const { roomSession = null } = useRoom();

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setIsOn(false);
        setRootX(0);
        setRootY(0);
        setWidth(0);
        setLength(0);
        setInvisibility(false);
        setWallItems(false);
        setInverted(false);

        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const saveChanges = useCallback(() => {
        if (objectId === -1) return;

        const nextState = isOn ? 0 : 1;
        const data = new Map<string, string>();

        data.set('state', nextState.toString());
        data.set('rootX', rootX.toString());
        data.set('rootY', rootY.toString());
        data.set('width', width.toString());
        data.set('length', length.toString());
        data.set('invisibility', invisibility ? '1' : '0');
        data.set('wallItems', wallItems ? '1' : '0');
        data.set('invert', inverted ? '1' : '0');

        SendMessageComposer(new SetObjectDataMessageComposer(objectId, data));

        onClose();
    }, [objectId, isOn, rootX, rootY, width, length, invisibility, wallItems, inverted]);

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_AREA_HIDE, (event) => {
        if (!CanManipulateFurniture(roomSession, event.objectId, event.category)) return;

        setObjectId(event.objectId);
        setCategory(event.category);

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        const model = roomObject.model;
        const data = model.getValue<number[]>(RoomObjectVariable.FURNITURE_DATA) || [];

        setIsOn(roomObject.getState(0) === 1);
        setRootX(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_X) ?? data[1] ?? 0);
        setRootY(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_Y) ?? data[2] ?? 0);
        setWidth(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_WIDTH) ?? data[3] ?? 0);
        setLength(model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_LENGTH) ?? data[4] ?? 0);
        setInvisibility((model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_INVISIBILITY) ?? data[5] ?? 0) === 1);
        setWallItems((model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_WALL_ITEMS) ?? data[6] ?? 0) === 1);
        setInverted((model.getValue<number>(RoomObjectVariable.FURNITURE_AREA_HIDE_INVERT) ?? data[7] ?? 0) === 1);
    });

    useOctaneEvent<RoomEngineAreaHideStateEvent>(RoomEngineAreaHideStateEvent.UPDATE_STATE_AREA_HIDE, (event) => {
        if (objectId !== event.objectId) return;

        setCategory(event.category);
        setIsOn(event.isOn);
    });

    useEffect(() => {
        if (objectId === -1) return;

        if (!isOn) {
            const callback = (rootX: number, rootY: number, width: number, height: number) => {
                setRootX(rootX);
                setRootY(rootY);
                setWidth(width);
                setLength(height);
            };

            if (GetRoomEngine().areaSelectionManager.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_DARKEN)) {
                GetRoomEngine().areaSelectionManager.setHighlight(rootX, rootY, width, length);
            }
        } else {
            GetRoomEngine().areaSelectionManager.deactivate();
        }
    }, [objectId, isOn, rootX, rootY, width, length]);

    return {
        objectId,
        category,
        isOn,
        setIsOn,
        rootX,
        setRootX,
        rootY,
        setRootY,
        width,
        setWidth,
        length,
        setLength,
        invisibility,
        setInvisibility,
        wallItems,
        setWallItems,
        inverted,
        setInverted,
        saveChanges,
        onClose
    };
};

export const useFurnitureAreaHideWidget = useFurnitureAreaHideWidgetState;
