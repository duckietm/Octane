import {
    FurnitureMultiStateComposer,
    GetRoomEngine,
    RoomAreaSelectionManager,
    RoomEngineAreaHideStateEvent,
    RoomEngineTriggerWidgetEvent,
    RoomObjectVariable,
    SetObjectDataMessageComposer
} from '@octane/renderer';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IsAnyRoomController, SendMessageComposer } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useRoom } from '../../useRoom';
import { AreaHideSettings, buildAreaHideValues, canOpenAreaHide } from './useFurnitureAreaHideWidget.helpers';

const EMPTY_SETTINGS: AreaHideSettings = {
    rootX: 0,
    rootY: 0,
    width: 0,
    length: 0,
    invisibility: false,
    wallItems: false,
    inverted: false
};

/**
 * AIR `AreaHideFurniWidget` (instant-apply build): every change of the area or of an option is
 * saved at once, without touching the on/off state; the on/off button uses the furni like a
 * double click on its switch, and the window stays open. While the area is hidden the settings
 * are locked and the room shows no area selection.
 */
const useFurnitureAreaHideWidgetState = () => {
    const [objectId, setObjectId] = useState<number>(-1);
    const [category, setCategory] = useState<number>(-1);
    const [isOn, setIsOn] = useState<boolean>(false);
    const [settings, setSettings] = useState<AreaHideSettings>(EMPTY_SETTINGS);
    const [selecting, setSelecting] = useState<boolean>(false);
    const [selectionActive, setSelectionActive] = useState<boolean>(false);
    const { roomSession = null } = useRoom();
    const latest = useRef({ objectId: -1, isOn: false, settings: EMPTY_SETTINGS });

    useLayoutEffect(() => {
        latest.current = { objectId, isOn, settings };
    }, [objectId, isOn, settings]);

    const onClose = () => {
        setObjectId(-1);
        setCategory(-1);
        setIsOn(false);
        setSettings(EMPTY_SETTINGS);
        setSelecting(false);
        setSelectionActive(false);

        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const saveSettings = (next: AreaHideSettings) => {
        const { objectId: currentId, isOn: currentOn } = latest.current;

        setSettings(next);
        latest.current = { ...latest.current, settings: next };

        if (currentId === -1 || currentOn) return;

        SendMessageComposer(new SetObjectDataMessageComposer(currentId, buildAreaHideValues(currentOn, next)));
    };

    const updateSetting = (change: Partial<AreaHideSettings>) => saveSettings({ ...latest.current.settings, ...change });

    const setInvisibility = (value: boolean) => updateSetting({ invisibility: value });
    const setWallItems = (value: boolean) => updateSetting({ wallItems: value });
    const setInverted = (value: boolean) => updateSetting({ inverted: value });

    const toggleOnOff = () => {
        if (objectId === -1) return;

        SendMessageComposer(new FurnitureMultiStateComposer(objectId));
    };

    const startSelecting = () => {
        if (isOn) return;

        setSelecting(true);
        GetRoomEngine().areaSelectionManager.startSelecting();
    };

    const clearSelection = () => {
        if (isOn) return;

        GetRoomEngine().areaSelectionManager.clearHighlight();
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_AREA_HIDE, (event) => {
        if (!roomSession || !canOpenAreaHide(roomSession.isRoomOwner, roomSession.controllerLevel, IsAnyRoomController())) return;

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject?.model) return;

        const model = roomObject.model;
        const data = model.getValue<number[]>(RoomObjectVariable.FURNITURE_DATA) || [];
        const read = (key: string, index: number) => model.getValue<number>(key) ?? data[index] ?? 0;

        setObjectId(event.objectId);
        setCategory(event.category);
        setIsOn(roomObject.getState(0) === 1);
        setSelecting(false);
        setSettings({
            rootX: read(RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_X, 1),
            rootY: read(RoomObjectVariable.FURNITURE_AREA_HIDE_ROOT_Y, 2),
            width: read(RoomObjectVariable.FURNITURE_AREA_HIDE_WIDTH, 3),
            length: read(RoomObjectVariable.FURNITURE_AREA_HIDE_LENGTH, 4),
            invisibility: read(RoomObjectVariable.FURNITURE_AREA_HIDE_INVISIBILITY, 5) === 1,
            wallItems: read(RoomObjectVariable.FURNITURE_AREA_HIDE_WALL_ITEMS, 6) === 1,
            inverted: read(RoomObjectVariable.FURNITURE_AREA_HIDE_INVERT, 7) === 1
        });
    });

    useOctaneEvent<RoomEngineAreaHideStateEvent>(RoomEngineAreaHideStateEvent.UPDATE_STATE_AREA_HIDE, (event) => {
        if (objectId !== event.objectId) return;

        setCategory(event.category);
        setIsOn(event.isOn);
    });

    // AIR updateAreaSelecting: the area selection is shown only while the area is not hidden.
    useEffect(() => {
        if (objectId === -1) return;

        const selection = GetRoomEngine().areaSelectionManager;

        if (isOn) {
            selection.deactivate();
            setSelectionActive(false);
            setSelecting(false);
            return;
        }

        const callback = (rootX: number, rootY: number, width: number, length: number) => {
            setSelecting(false);
            saveSettings({ ...latest.current.settings, rootX, rootY, width, length });
        };

        if (selection.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_DARKEN)) {
            const { rootX, rootY, width, length } = latest.current.settings;

            selection.setHighlight(rootX, rootY, width, length);
        }

        setSelectionActive(true);
    }, [objectId, isOn]);

    return {
        objectId,
        category,
        isOn,
        rootX: settings.rootX,
        rootY: settings.rootY,
        width: settings.width,
        length: settings.length,
        invisibility: settings.invisibility,
        setInvisibility,
        wallItems: settings.wallItems,
        setWallItems,
        inverted: settings.inverted,
        setInverted,
        selecting,
        selectionActive,
        startSelecting,
        clearSelection,
        toggleOnOff,
        onClose
    };
};

export const useFurnitureAreaHideWidget = useFurnitureAreaHideWidgetState;
