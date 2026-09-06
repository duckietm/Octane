import {
    GetRoomCameraWidgetManager,
    InitCameraMessageEvent,
    IRoomCameraWidgetEffect,
    RequestCameraConfigurationComposer,
    RoomCameraWidgetManagerEvent
} from '@octane/renderer';
import { useEffect, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { CameraPicture, SendMessageComposer } from '../../api';
import { useMessageEvent, useOctaneEvent } from '../events';

const useCameraState = () => {
    const [availableEffects, setAvailableEffects] = useState<IRoomCameraWidgetEffect[]>([]);
    // AIR keeps five stable slots for the lifetime of the camera. Empty slots
    // must remain addressable so a deleted photograph does not shift the
    // photographs to its right and the user can choose where the next shot goes.
    const [cameraRoll, setCameraRoll] = useState<Array<CameraPicture | null>>(() => Array(5).fill(null));
    const [selectedPictureIndex, setSelectedPictureIndex] = useState(-1);
    const [activePictureSlotIndex, setActivePictureSlotIndex] = useState(0);
    const [price, setPrice] = useState<{ credits: number; duckets: number; publishDucketPrice: number }>(null);

    useOctaneEvent<RoomCameraWidgetManagerEvent>(RoomCameraWidgetManagerEvent.INITIALIZED, (event) => {
        setAvailableEffects(Array.from(GetRoomCameraWidgetManager().effects.values()));
    });

    useMessageEvent<InitCameraMessageEvent>(InitCameraMessageEvent, (event) => {
        const parser = event.getParser();

        setPrice({ credits: parser.creditPrice, duckets: parser.ducketPrice, publishDucketPrice: parser.publishDucketPrice });
    });

    useEffect(() => {
        if (GetRoomCameraWidgetManager().isLoaded) return;

        GetRoomCameraWidgetManager().init();

        SendMessageComposer(new RequestCameraConfigurationComposer());
    }, []);

    return {
        availableEffects,
        cameraRoll,
        setCameraRoll,
        selectedPictureIndex,
        setSelectedPictureIndex,
        activePictureSlotIndex,
        setActivePictureSlotIndex,
        price
    };
};

export const useCamera = () => useSharedHook(useCameraState);

registerSharedHook(useCameraState);
