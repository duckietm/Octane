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

const CAMERA_EFFECTS_LOAD_DELAY_MS = 10000;

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
        const manager = GetRoomCameraWidgetManager();
        let delayHandle: number | null = null;
        let idleHandle: number | null = null;

        if (manager.isLoaded) {
            setAvailableEffects(Array.from(manager.effects.values()));
        } else {
            // The effect textures are only needed in the photo editor, so they load once
            // the hotel has booted and the browser is idle (or when the editor opens first).
            const load = () => {
                idleHandle = null;

                if (!manager.isLoaded) void manager.init();
            };

            delayHandle = window.setTimeout(() => {
                delayHandle = null;
                idleHandle = window.requestIdleCallback ? window.requestIdleCallback(load, { timeout: 5000 }) : window.setTimeout(load, 0);
            }, CAMERA_EFFECTS_LOAD_DELAY_MS);
        }

        SendMessageComposer(new RequestCameraConfigurationComposer());

        return () => {
            if (delayHandle !== null) window.clearTimeout(delayHandle);

            if (idleHandle !== null) {
                if (window.cancelIdleCallback) window.cancelIdleCallback(idleHandle);
                else window.clearTimeout(idleHandle);
            }
        };
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
