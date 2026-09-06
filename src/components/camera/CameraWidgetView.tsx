import {
    AddLinkEventTracker,
    GetRoomEngine,
    GetSessionDataManager,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomGeometry,
    RoomSessionEvent
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../api';
import { useAchievements, useCamera, useOctaneEvent, useNotification, useRoom } from '../../hooks';
import { getCameraAchievementLevel } from './CameraAirUtilities';
import { CameraWidgetCaptureView } from './views/CameraWidgetCaptureView';
import { CameraWidgetCheckoutView } from './views/CameraWidgetCheckoutView';
import { CameraWidgetEditorView } from './views/editor/CameraWidgetEditorView';

const MODE_NONE: number = 0;
const MODE_CAPTURE: number = 1;
const MODE_EDITOR: number = 2;
const MODE_CHECKOUT: number = 3;
const CAMERA_CANVAS_ID = 1;
const DEFAULT_ROOM_ZOOM = 1;
const ROOM_ZOOM_EPSILON = 0.001;

const getLogicalRoomZoom = (roomId: number): number => {
    const roomEngine = GetRoomEngine();
    const displayScale = roomEngine.getRoomInstanceRenderingCanvasScale(roomId, CAMERA_CANVAS_ID);
    const geometry = roomEngine.getRoomInstanceGeometry(roomId, CAMERA_CANVAS_ID);
    const geometryScale = geometry?.scale ?? RoomGeometry.SCALE_ZOOMED_IN;

    return displayScale * (geometryScale / RoomGeometry.SCALE_ZOOMED_IN);
};

const isDefaultRoomZoom = (roomId: number): boolean => Math.abs(getLogicalRoomZoom(roomId) - DEFAULT_ROOM_ZOOM) <= ROOM_ZOOM_EPSILON;

export const CameraWidgetView: FC<{}> = (props) => {
    const [mode, setMode] = useState<number>(MODE_NONE);
    const [base64Url, setSavedPictureUrl] = useState<string>(null);
    const {
        availableEffects = [],
        selectedPictureIndex = -1,
        setSelectedPictureIndex = null,
        setActivePictureSlotIndex = null,
        cameraRoll = Array(5).fill(null),
        setCameraRoll = null,
        price = { credits: 0, duckets: 0, publishDucketPrice: 0 }
    } = useCamera();
    const { achievementCategories = [] } = useAchievements();
    const { simpleAlert = null } = useNotification();
    const { roomSession = null } = useRoom();

    const myLevel = useMemo(() => getCameraAchievementLevel(achievementCategories), [achievementCategories]);

    const openCamera = useCallback(() => {
        if (!roomSession) return;

        if (!isDefaultRoomZoom(roomSession.roomId)) {
            simpleAlert(LocalizeText('camera.zoom.missing.body'), null, null, null, LocalizeText('camera.zoom.missing.header'));
            return;
        }

        setSelectedPictureIndex(-1);
        setMode(MODE_CAPTURE);
    }, [roomSession, setSelectedPictureIndex, simpleAlert]);

    const processAction = (type: string) => {
        switch (type) {
            case 'close':
                setSelectedPictureIndex(-1);
                setMode(MODE_NONE);
                return;
            case 'edit':
                if (selectedPictureIndex < 0 || !cameraRoll[selectedPictureIndex]) return;

                if (!GetConfigurationValue<boolean>('camera.effects.enabled', true)) {
                    checkoutPictureUrl(cameraRoll[selectedPictureIndex].imageUrl);
                    return;
                }

                setMode(MODE_EDITOR);
                return;
            case 'delete':
                if (selectedPictureIndex < 0) return;

                cameraRoll[selectedPictureIndex]?.texture?.destroy?.(true);
                setCameraRoll((previous) => previous.map((picture, index) => (index === selectedPictureIndex ? null : picture)));
                setActivePictureSlotIndex(selectedPictureIndex);
                // AIR returns to the live viewfinder after deleting the selected
                // roll slot; it never previews whichever photo shifted into it.
                setSelectedPictureIndex(-1);
                return;
            case 'editor_cancel':
                openCamera();
                return;
        }
    };

    const checkoutPictureUrl = (pictureUrl: string) => {
        if (GetSessionDataManager().isSafetyLocked) {
            simpleAlert(LocalizeText('notifications.text.safety_locked'), null, null, null, LocalizeText('generic.alert.title'));

            // With effects disabled AIR enters the (headless) lab directly from
            // the viewfinder, then disposes it when the safety check refuses
            // checkout. There is no editor window to return to in that path.
            if (!GetConfigurationValue<boolean>('camera.effects.enabled', true)) {
                setSelectedPictureIndex(-1);
                setMode(MODE_NONE);
            }

            return;
        }

        setSavedPictureUrl(pictureUrl);
        setMode(MODE_CHECKOUT);
    };

    useOctaneEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, (event) => {
        setSelectedPictureIndex(-1);
        setMode(MODE_NONE);
    });

    useOctaneEvent<RoomEngineEvent>(RoomEngineEvent.ROOM_ZOOMED, (event) => {
        if (!roomSession || event.roomId !== roomSession.roomId || isDefaultRoomZoom(event.roomId)) return;

        setSelectedPictureIndex(-1);
        setMode(MODE_NONE);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        openCamera();
                        return;
                    case 'hide':
                        setSelectedPictureIndex(-1);
                        setMode(MODE_NONE);
                        return;
                    case 'toggle':
                        setSelectedPictureIndex(-1);

                        if (mode === MODE_NONE) openCamera();
                        else setMode(MODE_NONE);
                        return;
                }
            },
            eventUrlPrefix: 'camera/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [mode, openCamera, setSelectedPictureIndex]);

    if (mode === MODE_NONE) return null;

    return (
        <>
            {mode === MODE_CAPTURE && (
                <CameraWidgetCaptureView onClose={() => processAction('close')} onDelete={() => processAction('delete')} onEdit={() => processAction('edit')} />
            )}
            {mode === MODE_EDITOR && cameraRoll[selectedPictureIndex] && (
                <CameraWidgetEditorView
                    availableEffects={availableEffects}
                    myLevel={myLevel}
                    picture={cameraRoll[selectedPictureIndex]}
                    onCancel={() => processAction('editor_cancel')}
                    onCheckout={checkoutPictureUrl}
                    onClose={() => processAction('close')}
                />
            )}
            {mode === MODE_CHECKOUT && (
                <CameraWidgetCheckoutView
                    base64Url={base64Url}
                    price={price}
                    onCancelClick={() => processAction('editor_cancel')}
                    onCloseClick={() => processAction('editor_cancel')}
                ></CameraWidgetCheckoutView>
            )}
        </>
    );
};
