import { FC, RefObject } from 'react';
import { CameraPicture, LocalizeText, localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { DraggableWindow } from '../../../common/draggable-window';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../common/ToggleButton';

export interface HandheldCameraCaptureViewProps {
    /** The live viewfinder: the room is mirrored into it and the shutter captures exactly what lies under it. */
    canvasRef: RefObject<HTMLCanvasElement>;
    videoRef: RefObject<HTMLVideoElement>;
    flashRef: RefObject<HTMLDivElement>;
    /** The picture of the roll being looked at, or null for the live viewfinder. */
    selectedPicture: CameraPicture | null;
    cameraRoll: Array<CameraPicture | null>;
    rollLimit: number;
    /** The slot the next picture goes to, or the one being looked at. */
    activeSlotIndex: number;
    selectedPictureIndex: number;
    onClose: () => void;
    onHelp: () => void;
    onShutter: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSlot: (index: number) => void;
}

/** The side of the viewfinder in CSS px: the camera's 320 x 320 picture, never scaled (the capture is read from its place on screen). */
export const HANDHELD_CAMERA_VIEWFINDER_SIZE = 320;

/**
 * The camera on a phone, in the Octane handheld look (HandheldCamera.css). The capture view keeps the viewfinder, the
 * shutter and the roll logic; this only lays them out for a finger: a full-screen layer whose only clear part is the
 * 320 px viewfinder over the room (everything around it is dimmed and keeps the touches), the title, help and close at the
 * top, and the roll and the round shutter at the bottom (on its side: the roll at the left, the buttons at the right). A
 * finger dragged inside the viewfinder reaches the room below, so the shot is framed by moving the room.
 */
export const HandheldCameraCaptureView: FC<HandheldCameraCaptureViewProps> = (props) => {
    const {
        canvasRef,
        videoRef,
        flashRef,
        selectedPicture = null,
        cameraRoll = [],
        rollLimit,
        activeSlotIndex = 0,
        selectedPictureIndex = -1,
        onClose,
        onHelp,
        onShutter,
        onEdit,
        onDelete,
        onSlot
    } = props;
    const hasPictures = cameraRoll.some((picture) => !!picture);
    const shutterLabel = LocalizeText('camera.take.photo.button.tooltip');

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="camera-capture">
                <div className={`octane-handheld-camera${selectedPicture ? ' is-previewing' : ''}`}>
                    <header className="octane-handheld-camera__top">
                        <span aria-hidden="true" className="octane-handheld-camera__mark octane-icon icon-camera-small" />
                        <span className="octane-handheld-camera__title">{LocalizeText('camera.interface.title')}</span>
                        <BaseButton aria-label={LocalizeText('generic.help')} className="octane-handheld-camera__round is-help" onClick={onHelp}>
                            ?
                        </BaseButton>
                        <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-camera__round is-close" onClick={onClose}>
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M4 4 L12 12 M12 4 L4 12" />
                            </svg>
                        </BaseButton>
                    </header>

                    <div className="octane-handheld-camera__stage">
                        <div aria-hidden="true" className="octane-handheld-camera__shade is-top" />
                        <div aria-hidden="true" className="octane-handheld-camera__shade is-left" />
                        <div className="octane-handheld-camera__frame">
                            <div className="octane-camera-viewfinder">
                                {!selectedPicture && (
                                    <>
                                        <canvas
                                            ref={canvasRef}
                                            className="octane-camera-viewfinder__fallback"
                                            height={HANDHELD_CAMERA_VIEWFINDER_SIZE}
                                            width={HANDHELD_CAMERA_VIEWFINDER_SIZE}
                                        />
                                        <video ref={videoRef} aria-hidden="true" className="octane-camera-viewfinder__stream" muted playsInline />
                                    </>
                                )}
                                {selectedPicture && <img alt="" className="octane-camera-viewfinder__photo" src={selectedPicture.imageUrl} />}
                            </div>
                            <span aria-hidden="true" className="octane-handheld-camera__corners" />
                            <div ref={flashRef} aria-hidden="true" className="octane-camera-capture__flash" />
                        </div>
                        <div aria-hidden="true" className="octane-handheld-camera__shade is-right" />
                        <div aria-hidden="true" className="octane-handheld-camera__shade is-bottom" />
                    </div>

                    {/* Always on screen on a phone: the empty slots show where the next pictures go, and a tap picks the one. */}
                    <div
                        aria-label={localizeWithFallback('octane.handheld.camera.roll', 'Your pictures')}
                        className={`octane-handheld-camera__roll${hasPictures ? '' : ' is-empty'}`}
                        role="group"
                    >
                        {Array.from({ length: rollLimit }, (_, index) => {
                            const picture = cameraRoll[index] ?? null;

                            return (
                                <ToggleButton
                                    key={index}
                                    aria-label={
                                        picture
                                            ? localizeWithFallback('octane.handheld.camera.slot', 'Picture %number%', ['number'], [String(index + 1)])
                                            : localizeWithFallback('octane.handheld.camera.slot.free', 'Free slot %number%', ['number'], [String(index + 1)])
                                    }
                                    className={`octane-handheld-camera__slot${index === activeSlotIndex ? ' is-active' : ''}${picture ? '' : ' is-free'}`}
                                    pressed={picture !== null && selectedPictureIndex === index}
                                    onClick={() => onSlot(index)}
                                >
                                    {picture && <img alt="" draggable={false} src={picture.imageUrl} />}
                                </ToggleButton>
                            );
                        })}
                    </div>

                    <div className="octane-handheld-camera__actions">
                        <span className="octane-handheld-camera__side is-start">
                            {selectedPicture && (
                                <BaseButton className="octane-handheld-camera__pill is-delete" onClick={onDelete}>
                                    {LocalizeText('camera.delete.button.text')}
                                </BaseButton>
                            )}
                        </span>
                        <BaseButton aria-label={shutterLabel} className="octane-handheld-camera__shutter" onClick={onShutter}>
                            <span aria-hidden="true" className="octane-handheld-camera__shutter-core" />
                        </BaseButton>
                        <span className="octane-handheld-camera__side is-end">
                            {selectedPicture && (
                                <BaseButton
                                    aria-label={LocalizeText('camera.editor.button.tooltip')}
                                    className="octane-handheld-camera__pill is-edit"
                                    onClick={onEdit}
                                >
                                    {LocalizeText('camera.editor.button.text')}
                                </BaseButton>
                            )}
                        </span>
                    </div>
                </div>
            </DraggableWindow>
        </NativeTextTree>
    );
};
