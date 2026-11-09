import {
    GetRoomEngine,
    RoomControllerLevel,
    RoomEngineTriggerWidgetEvent,
    RoomId,
    RoomObjectVariable,
    RoomWidgetEnum,
    SetObjectDataMessageComposer
} from '@octane/renderer';
import { useRef, useState } from 'react';
import { IsAnyRoomController, SendMessageComposer } from '../../../../api';
import { useOctaneEvent } from '../../../events';
import { useFurniRemovedEvent } from '../../engine';
import { useRoom } from '../../useRoom';
import { readVimeoVideoId, sanitizeVimeoVideoIdInput, VIMEO_VIDEO_ID_KEY } from './useFurnitureVimeoWidget.helpers';

/**
 * The official Vimeo furni widget (`RWE_VIMEO`, handler `class_3348`): the furni's
 * OPEN_WIDGET opens the viewer on the `videoId` of its map stuff data, CLOSE_WIDGET
 * (the furni going away) closes it. Room rights holders can change the id; the
 * server's `InteractionVimeo` accepts it through the set-object-data packet.
 */
const useFurnitureVimeoWidgetState = () => {
    const [objectId, setObjectId] = useState(-1);
    const [category, setCategory] = useState(-1);
    const [videoId, setVideoId] = useState(0);
    const objectIdRef = useRef(-1);
    const { roomSession = null } = useRoom();

    const canEdit = !!roomSession && (roomSession.isRoomOwner || roomSession.controllerLevel >= RoomControllerLevel.GUEST || IsAnyRoomController());

    const onClose = () => {
        objectIdRef.current = -1;
        setObjectId(-1);
        setCategory(-1);
        setVideoId(0);
    };

    const saveVideoId = (value: string) => {
        if (objectIdRef.current === -1 || !canEdit) return;

        const digits = sanitizeVimeoVideoIdInput(value) || '0';
        const data = new Map<string, string>();

        data.set(VIMEO_VIDEO_ID_KEY, digits);
        SendMessageComposer(new SetObjectDataMessageComposer(objectIdRef.current, data));
        setVideoId(Number(digits));
    };

    useOctaneEvent<RoomEngineTriggerWidgetEvent>([RoomEngineTriggerWidgetEvent.OPEN_WIDGET, RoomEngineTriggerWidgetEvent.CLOSE_WIDGET], (event) => {
        if (event.widget !== RoomWidgetEnum.VIMEO || RoomId.isRoomPreviewerId(event.roomId)) return;

        if (event.type === RoomEngineTriggerWidgetEvent.CLOSE_WIDGET) {
            if (objectIdRef.current === event.objectId) onClose();

            return;
        }

        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        objectIdRef.current = event.objectId;
        setObjectId(event.objectId);
        setCategory(event.category);
        setVideoId(readVimeoVideoId(roomObject.model.getValue<unknown>(RoomObjectVariable.FURNITURE_DATA)));
    });

    useFurniRemovedEvent(objectId !== -1 && category !== -1, (event) => {
        if (event.id !== objectId || event.category !== category) return;

        onClose();
    });

    return { objectId, videoId, canEdit, onClose, saveVideoId };
};

export const useFurnitureVimeoWidget = useFurnitureVimeoWidgetState;
