import {
    ColorConverter,
    GetDesiredResolution,
    GetRenderer,
    GetRoomEngine,
    GetStage,
    HanditemBlockStateMessageEvent,
    IRoomSession,
    OctaneAdjustmentFilter,
    OctaneSprite,
    OctaneTexture,
    RoomBackgroundColorEvent,
    RoomEngineEvent,
    RoomEngineObjectEvent,
    RoomGeometry,
    RoomId,
    RoomObjectCategory,
    RoomObjectHSLColorEnabledEvent,
    RoomObjectOperationType,
    RoomSessionEvent,
    RoomVariableEnum,
    Vector3d
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    CanManipulateFurniture,
    DispatchUiEvent,
    GetRoomSession,
    IsFurnitureSelectionDisabled,
    ProcessRoomObjectOperation,
    RoomWidgetUpdateBackgroundColorPreviewEvent,
    RoomWidgetUpdateRoomObjectEvent,
    SetActiveRoomId,
    StartRoomSession
} from '../../api';
import { useMessageEvent, useOctaneEvent, useUiEvent } from '../events';
import { useWiredFurniOpacity } from './useWiredFurniOpacity';

const getViewportSize = () => {
    const viewport = window.visualViewport;

    return {
        width: Math.max(1, Math.floor(viewport?.width ?? window.innerWidth)),
        height: Math.max(1, Math.floor(viewport?.height ?? window.innerHeight))
    };
};

const useRoomState = () => {
    const [roomSession, setRoomSession] = useState<IRoomSession>(null);
    const [isHandItemBlocked, setIsHandItemBlocked] = useState(false);
    const [roomBackground, setRoomBackground] = useState<OctaneSprite>(null);
    const [roomFilter, setRoomFilter] = useState<OctaneAdjustmentFilter>(null);
    const [originalRoomBackgroundColor, setOriginalRoomBackgroundColor] = useState(0);

    useWiredFurniOpacity(roomSession?.roomId ?? 0);

    const updateRoomBackgroundColor = (hue: number, saturation: number, lightness: number, original: boolean = false) => {
        if (!roomBackground) return;

        const newColor = ColorConverter.hslToRGB(((hue & 0xff) << 16) + ((saturation & 0xff) << 8) + (lightness & 0xff));

        if (original) setOriginalRoomBackgroundColor(newColor);

        if (!hue && !saturation && !lightness) {
            roomBackground.tint = 0;
        } else {
            roomBackground.tint = newColor;
        }
    };

    const updateRoomFilter = (color: number) => {
        if (!roomFilter) return;

        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;

        roomFilter.red = r / 255;
        roomFilter.green = g / 255;
        roomFilter.blue = b / 255;
    };

    useUiEvent<RoomWidgetUpdateBackgroundColorPreviewEvent>(RoomWidgetUpdateBackgroundColorPreviewEvent.PREVIEW, (event) =>
        updateRoomBackgroundColor(event.hue, event.saturation, event.lightness)
    );

    useUiEvent<RoomWidgetUpdateBackgroundColorPreviewEvent>(RoomWidgetUpdateBackgroundColorPreviewEvent.CLEAR_PREVIEW, (event) => {
        if (!roomBackground) return;

        roomBackground.tint = originalRoomBackgroundColor;
    });

    useOctaneEvent<RoomObjectHSLColorEnabledEvent>(RoomObjectHSLColorEnabledEvent.ROOM_BACKGROUND_COLOR, (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        if (event.enable) updateRoomBackgroundColor(event.hue, event.saturation, event.lightness, true);
        else updateRoomBackgroundColor(0, 0, 0, true);
    });

    useOctaneEvent<RoomBackgroundColorEvent>(RoomBackgroundColorEvent.ROOM_COLOR, (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        let color = 0x000000;
        let brightness = 0xff;

        if (!event.bgOnly) {
            color = event.color;
            brightness = event.brightness;
        }

        updateRoomFilter(ColorConverter.hslToRGB((ColorConverter.rgbToHSL(color) & 0xffff00) + brightness));
    });

    useOctaneEvent<RoomEngineEvent>([RoomEngineEvent.INITIALIZED, RoomEngineEvent.DISPOSED], (event) => {
        if (RoomId.isRoomPreviewerId(event.roomId)) return;

        const session = GetRoomSession();

        if (!session) return;

        switch (event.type) {
            case RoomEngineEvent.INITIALIZED:
                SetActiveRoomId(event.roomId);
                setRoomSession(session);
                setIsHandItemBlocked(false);
                return;
            case RoomEngineEvent.DISPOSED:
                setRoomSession(null);
                setIsHandItemBlocked(false);
                return;
        }
    });

    useOctaneEvent<RoomSessionEvent>([RoomSessionEvent.CREATED, RoomSessionEvent.ENDED], (event) => {
        switch (event.type) {
            case RoomSessionEvent.CREATED:
                StartRoomSession(event.session);
                return;
            case RoomSessionEvent.ENDED:
                setRoomSession(null);
                setIsHandItemBlocked(false);
                return;
        }
    });

    useMessageEvent<HanditemBlockStateMessageEvent>(HanditemBlockStateMessageEvent, (event) => {
        const parser = event.getParser();
        const session = roomSession || GetRoomSession();

        if (!parser || !session) return;
        if (parser.stateData.roomId !== session.roomId) return;

        setIsHandItemBlocked(parser.stateData.blocked);
    });

    useOctaneEvent<RoomEngineObjectEvent>(
        [
            RoomEngineObjectEvent.SELECTED,
            RoomEngineObjectEvent.DESELECTED,
            RoomEngineObjectEvent.ADDED,
            RoomEngineObjectEvent.REMOVED,
            RoomEngineObjectEvent.PLACED,
            RoomEngineObjectEvent.REQUEST_MOVE,
            RoomEngineObjectEvent.REQUEST_ROTATE,
            RoomEngineObjectEvent.MOUSE_ENTER,
            RoomEngineObjectEvent.MOUSE_LEAVE,
            RoomEngineObjectEvent.DOUBLE_CLICK
        ],
        (event) => {
            if (RoomId.isRoomPreviewerId(event.roomId)) return;

            let updateEvent: RoomWidgetUpdateRoomObjectEvent = null;

            switch (event.type) {
                case RoomEngineObjectEvent.SELECTED:
                    if (!IsFurnitureSelectionDisabled(event))
                        updateEvent = new RoomWidgetUpdateRoomObjectEvent(
                            RoomWidgetUpdateRoomObjectEvent.OBJECT_SELECTED,
                            event.objectId,
                            event.category,
                            event.roomId
                        );
                    break;
                case RoomEngineObjectEvent.DESELECTED:
                    updateEvent = new RoomWidgetUpdateRoomObjectEvent(
                        RoomWidgetUpdateRoomObjectEvent.OBJECT_DESELECTED,
                        event.objectId,
                        event.category,
                        event.roomId
                    );
                    break;
                case RoomEngineObjectEvent.ADDED: {
                    let addedEventType: string = null;

                    switch (event.category) {
                        case RoomObjectCategory.FLOOR:
                        case RoomObjectCategory.WALL:
                            addedEventType = RoomWidgetUpdateRoomObjectEvent.FURNI_ADDED;
                            break;
                        case RoomObjectCategory.UNIT:
                            addedEventType = RoomWidgetUpdateRoomObjectEvent.USER_ADDED;
                            break;
                    }

                    if (addedEventType) updateEvent = new RoomWidgetUpdateRoomObjectEvent(addedEventType, event.objectId, event.category, event.roomId);
                    break;
                }
                case RoomEngineObjectEvent.REMOVED: {
                    let removedEventType: string = null;

                    switch (event.category) {
                        case RoomObjectCategory.FLOOR:
                        case RoomObjectCategory.WALL:
                            removedEventType = RoomWidgetUpdateRoomObjectEvent.FURNI_REMOVED;
                            break;
                        case RoomObjectCategory.UNIT:
                            removedEventType = RoomWidgetUpdateRoomObjectEvent.USER_REMOVED;
                            break;
                    }

                    if (removedEventType) updateEvent = new RoomWidgetUpdateRoomObjectEvent(removedEventType, event.objectId, event.category, event.roomId);
                    break;
                }
                case RoomEngineObjectEvent.REQUEST_MOVE:
                    if (CanManipulateFurniture(roomSession, event.objectId, event.category))
                        ProcessRoomObjectOperation(event.objectId, event.category, RoomObjectOperationType.OBJECT_MOVE);
                    break;
                case RoomEngineObjectEvent.REQUEST_ROTATE:
                    if (CanManipulateFurniture(roomSession, event.objectId, event.category))
                        ProcessRoomObjectOperation(event.objectId, event.category, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                    break;
                case RoomEngineObjectEvent.MOUSE_ENTER:
                    updateEvent = new RoomWidgetUpdateRoomObjectEvent(
                        RoomWidgetUpdateRoomObjectEvent.OBJECT_ROLL_OVER,
                        event.objectId,
                        event.category,
                        event.roomId
                    );
                    break;
                case RoomEngineObjectEvent.MOUSE_LEAVE:
                    updateEvent = new RoomWidgetUpdateRoomObjectEvent(
                        RoomWidgetUpdateRoomObjectEvent.OBJECT_ROLL_OUT,
                        event.objectId,
                        event.category,
                        event.roomId
                    );
                    break;
                case RoomEngineObjectEvent.DOUBLE_CLICK:
                    updateEvent = new RoomWidgetUpdateRoomObjectEvent(
                        RoomWidgetUpdateRoomObjectEvent.OBJECT_DOUBLE_CLICKED,
                        event.objectId,
                        event.category,
                        event.roomId
                    );
                    break;
            }

            if (updateEvent) DispatchUiEvent(updateEvent);
        }
    );

    useEffect(() => {
        if (!roomSession) return;

        const roomEngine = GetRoomEngine();
        const roomId = roomSession.roomId;
        const canvasId = 1;
        const { width, height } = getViewportSize();
        const renderer = GetRenderer();

        if (renderer) renderer.resize(width, height);

        const displayObject = roomEngine.getRoomInstanceDisplay(roomId, canvasId, width, height, RoomGeometry.SCALE_ZOOMED_IN);
        const canvas = GetRoomEngine().getRoomInstanceRenderingCanvas(roomId, canvasId);

        if (!displayObject || !canvas) return;

        const background = new OctaneSprite(OctaneTexture.WHITE);
        const filter = new OctaneAdjustmentFilter();
        const master = canvas.master;

        background.tint = 0;
        background.width = width;
        background.height = height;

        master.addChildAt(background, 0);
        master.filters = [filter];

        setRoomBackground(background);
        setRoomFilter(filter);

        const geometry = roomEngine.getRoomInstanceGeometry(roomId, canvasId) as RoomGeometry;

        if (geometry) {
            const minX = roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MIN_X) || 0;
            const maxX = roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MAX_X) || 0;
            const minY = roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MIN_Y) || 0;
            const maxY = roomEngine.getRoomInstanceVariable<number>(roomId, RoomVariableEnum.ROOM_MAX_Y) || 0;

            let x = (minX + maxX) / 2;
            let y = (minY + maxY) / 2;

            const offset = 20;

            x = x + (offset - 1);
            y = y + (offset - 1);

            const z = Math.sqrt(offset * offset + offset * offset) * Math.tan((30 / 180) * Math.PI);

            geometry.location = new Vector3d(x, y, z);
        }

        GetStage().addChild(displayObject);

        SetActiveRoomId(roomSession.roomId);

        const resize = () => {
            const { width: newWidth, height: newHeight } = getViewportSize();

            const offsetX = canvas.screenOffsetX - (newWidth - canvas.width) / 2;
            const offsetY = canvas.screenOffsetY - (newHeight - canvas.height) / 2;

            renderer.resize(newWidth, newHeight, GetDesiredResolution());

            background.width = newWidth;
            background.height = newHeight;

            canvas.initialize(newWidth, newHeight);
            canvas.screenOffsetX = ~~offsetX;
            canvas.screenOffsetY = ~~offsetY;
        };

        const viewport = window.visualViewport;

        window.addEventListener('resize', resize);
        viewport?.addEventListener('resize', resize);
        viewport?.addEventListener('scroll', resize);

        return () => {
            setRoomBackground(null);
            setRoomFilter(null);
            setOriginalRoomBackgroundColor(0);

            window.removeEventListener('resize', resize);
            viewport?.removeEventListener('resize', resize);
            viewport?.removeEventListener('scroll', resize);
        };
    }, [roomSession]);

    return { roomSession, isHandItemBlocked };
};

export const useRoom = () => useSharedHook(useRoomState);

registerSharedHook(useRoomState);
