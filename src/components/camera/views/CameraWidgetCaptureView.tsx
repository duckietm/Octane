import { GetRenderer, GetRoomEngine, OctaneTexture, TextureUtils } from '@octane/renderer';
import { FC, useEffect, useRef } from 'react';
import { blitRoomCanvasToViewfinder, CameraPicture, GetRoomSession, getViewfinderRoomFrame, LocalizeText, PlaySound, SoundNames } from '../../../api';
import { Button, Column, DraggableWindow } from '../../../common';
import { useCamera, useNotification } from '../../../hooks';
import { getNextEmptyCameraSlot, willFillLastCameraSlot } from '../CameraAirUtilities';

export interface CameraWidgetCaptureViewProps {
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const CAMERA_ROLL_LIMIT: number = 5;
const AIR_FALLBACK_FRAME_INTERVAL: number = 100;
const ROOM_STREAM_FRAME_RATE: number = 60;
let hasShownFullRollAlert: boolean = false;

export const CameraWidgetCaptureView: FC<CameraWidgetCaptureViewProps> = (props) => {
    const { onClose = null, onEdit = null, onDelete = null } = props;
    const {
        cameraRoll = Array(CAMERA_ROLL_LIMIT).fill(null),
        setCameraRoll = null,
        selectedPictureIndex = -1,
        setSelectedPictureIndex = null,
        activePictureSlotIndex = 0,
        setActivePictureSlotIndex = null
    } = useCamera();
    const { simpleAlert = null } = useNotification();
    const elementRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);
    const isTakingPictureRef = useRef(false);
    const isMountedRef = useRef(true);
    const pendingCapturedSlotRef = useRef(-1);
    const pendingShouldShowFullAlertRef = useRef(false);

    const selectedPicture = selectedPictureIndex > -1 ? cameraRoll[selectedPictureIndex] : null;

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (selectedPicture) return;

        const target = elementRef.current;
        const video = videoRef.current;
        const source = GetRenderer()?.canvas;

        if (!target || !video || !source) return;

        let frame = 0;
        let last = 0;
        let stream: MediaStream = null;
        let streamIsReady = false;
        let previousPosition = '';

        const markStreamReady = () => {
            streamIsReady = true;
            video.classList.add('octane-camera-viewfinder__stream--ready');
        };

        const markStreamUnavailable = () => {
            streamIsReady = false;
            video.classList.remove('octane-camera-viewfinder__stream--ready');
        };

        try {
            if (typeof source.captureStream === 'function') {
                stream = source.captureStream(ROOM_STREAM_FRAME_RATE);
                video.srcObject = stream;
                video.addEventListener('playing', markStreamReady);
                video.addEventListener('error', markStreamUnavailable);
                void video.play().catch(markStreamUnavailable);
            }
        } catch {
            stream = null;
        }

        const tick = (now: number) => {
            const sourceBounds = source.getBoundingClientRect();
            const targetBounds = target.getBoundingClientRect();

            if (sourceBounds.width > 0 && sourceBounds.height > 0 && targetBounds.width > 0 && targetBounds.height > 0) {
                const position = `${sourceBounds.left - targetBounds.left},${sourceBounds.top - targetBounds.top},${sourceBounds.width},${sourceBounds.height}`;

                if (position !== previousPosition) {
                    previousPosition = position;
                    video.style.width = `${sourceBounds.width}px`;
                    video.style.height = `${sourceBounds.height}px`;
                    video.style.transform = `translate3d(${sourceBounds.left - targetBounds.left}px, ${sourceBounds.top - targetBounds.top}px, 0)`;
                }
            }

            // AIR registers CameraViewFinder as a 100 ms update receiver. Keep
            // that cadence only for browsers where canvas.captureStream is not
            // available; the normal path stays entirely in the compositor.
            if (!streamIsReady && now - last >= AIR_FALLBACK_FRAME_INTERVAL) {
                last = now;
                blitRoomCanvasToViewfinder(target, 320, 320);
            }

            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(frame);
            video.removeEventListener('playing', markStreamReady);
            video.removeEventListener('error', markStreamUnavailable);
            video.pause();
            video.srcObject = null;
            video.classList.remove('octane-camera-viewfinder__stream--ready');
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [selectedPicture]);

    useEffect(() => {
        const capturedSlot = pendingCapturedSlotRef.current;

        if (capturedSlot < 0) return;

        pendingCapturedSlotRef.current = -1;

        const nextEmptySlot = getNextEmptyCameraSlot(cameraRoll);

        if (nextEmptySlot >= 0) {
            setActivePictureSlotIndex(nextEmptySlot);
            pendingShouldShowFullAlertRef.current = false;
            return;
        }

        setActivePictureSlotIndex(capturedSlot);

        if (pendingShouldShowFullAlertRef.current && !hasShownFullRollAlert) {
            hasShownFullRollAlert = true;
            simpleAlert(LocalizeText('camera.full.body'), null, null, null, LocalizeText('camera.full.header'));
        }

        pendingShouldShowFullAlertRef.current = false;
    }, [cameraRoll, setActivePictureSlotIndex, simpleAlert]);

    const takePicture = async () => {
        if (selectedPictureIndex > -1) {
            setSelectedPictureIndex(-1);
            return;
        }

        if (isTakingPictureRef.current) return;

        const frame = getViewfinderRoomFrame(elementRef.current, 320, 320);

        if (!frame) return;

        isTakingPictureRef.current = true;

        const targetSlot = activePictureSlotIndex >= 0 && activePictureSlotIndex < CAMERA_ROLL_LIMIT ? activePictureSlotIndex : 0;
        let texture: OctaneTexture = null;

        try {
            texture = GetRoomEngine().createTextureFromRoom(GetRoomSession().roomId, 1, frame);

            if (!texture) return;

            PlaySound(SoundNames.CAMERA_SHUTTER);
            flashRef.current?.classList.remove('octane-camera-capture__flash--active');
            // Restart the CSS flash even when two photographs are taken quickly.
            void flashRef.current?.offsetWidth;
            flashRef.current?.classList.add('octane-camera-capture__flash--active');

            const imageUrl = await TextureUtils.generateImageUrl(texture);

            if (!imageUrl || !isMountedRef.current) {
                texture?.destroy?.(true);
                texture = null;

                if (isMountedRef.current) {
                    simpleAlert(LocalizeText('camera.alert.too_much_stuff'), null, null, null, LocalizeText('generic.alert.title'));
                }

                return;
            }

            cameraRoll[targetSlot]?.texture?.destroy?.(true);

            const nextRoll = Array.from({ length: CAMERA_ROLL_LIMIT }, (_, index) => cameraRoll[index] ?? null);

            nextRoll[targetSlot] = new CameraPicture(texture, imageUrl);
            pendingCapturedSlotRef.current = targetSlot;
            pendingShouldShowFullAlertRef.current = !hasShownFullRollAlert && willFillLastCameraSlot(cameraRoll, targetSlot);
            texture = null;
            setCameraRoll(nextRoll);
        } catch {
            texture?.destroy?.(true);

            if (isMountedRef.current) {
                simpleAlert(LocalizeText('camera.alert.too_much_stuff'), null, null, null, LocalizeText('generic.alert.title'));
            }
        } finally {
            isTakingPictureRef.current = false;
        }
    };

    const activeSlotIndex = selectedPictureIndex > -1 ? selectedPictureIndex : activePictureSlotIndex;
    const hasPictures = cameraRoll.some((picture) => !!picture);

    return (
        <DraggableWindow>
            <Column center className="octane-camera-capture" gap={0}>
                <div className="octane-camera-capture__body drag-handler">
                    <div className="octane-camera-capture__title">{LocalizeText('camera.interface.title')}</div>
                    <button type="button" className="octane-camera-capture__close" aria-label={LocalizeText('generic.close')} onClick={onClose} />
                    <div className="octane-camera-viewfinder">
                        {!selectedPicture && (
                            <>
                                <canvas ref={elementRef} className="octane-camera-viewfinder__fallback" width={320} height={320} />
                                <video ref={videoRef} className="octane-camera-viewfinder__stream" aria-hidden="true" muted playsInline />
                            </>
                        )}
                        {selectedPicture && <img alt="" className="octane-camera-viewfinder__photo" src={selectedPicture.imageUrl} />}
                    </div>
                    {!selectedPicture && <div className="octane-camera-capture__crosshair" aria-hidden="true" />}
                    <div ref={flashRef} className="octane-camera-capture__flash" aria-hidden="true" />
                    {selectedPicture && (
                        <div className="octane-camera-capture__preview-actions">
                            <Button
                                className="octane-camera-capture__editor-button"
                                title={LocalizeText('camera.editor.button.tooltip')}
                                variant="success"
                                onClick={onEdit}
                            >
                                {LocalizeText('camera.editor.button.text')}
                            </Button>
                        </div>
                    )}
                    <button
                        type="button"
                        className="octane-camera-capture__shutter"
                        aria-label={LocalizeText('camera.take.photo.button.tooltip')}
                        title={LocalizeText('camera.take.photo.button.tooltip')}
                        onClick={takePicture}
                    />
                </div>
                <div className={`octane-camera-roll${hasPictures ? '' : ' octane-camera-roll--hidden'}`} aria-hidden={!hasPictures}>
                    {Array.from({ length: CAMERA_ROLL_LIMIT }, (_, index) => {
                        const picture = cameraRoll[index];
                        const isActive = index === activeSlotIndex;

                        return (
                            <div key={index} className={`octane-camera-roll__slot${isActive ? ' octane-camera-roll__slot--active' : ''}`}>
                                <button
                                    type="button"
                                    className="octane-camera-roll__slot-button"
                                    aria-label={picture ? LocalizeText('camera.editor.button.tooltip') : LocalizeText('camera.take.photo.button.tooltip')}
                                    onClick={() => {
                                        if (isTakingPictureRef.current) return;

                                        setActivePictureSlotIndex(index);
                                        setSelectedPictureIndex(picture ? index : -1);
                                    }}
                                >
                                    {picture && <img alt="" src={picture.imageUrl} />}
                                </button>
                                {picture && selectedPictureIndex === index && (
                                    <button
                                        type="button"
                                        className="octane-camera-roll__delete"
                                        aria-label={LocalizeText('camera.delete.button.text')}
                                        title={LocalizeText('camera.delete.button.text')}
                                        onClick={() => {
                                            if (!isTakingPictureRef.current) onDelete();
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </Column>
        </DraggableWindow>
    );
};
