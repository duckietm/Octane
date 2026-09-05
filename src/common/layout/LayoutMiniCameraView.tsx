import { GetRoomEngine, OctaneTexture } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { blitRoomCanvasToViewfinder, getViewfinderRoomFrame, LocalizeText, PlaySound, SoundNames } from '../../api';
import { DraggableWindow } from '../draggable-window';

interface LayoutMiniCameraViewProps {
    roomId: number;
    textureReceiver: (texture: OctaneTexture) => Promise<void>;
    onClose: () => void;
    isSaving?: boolean;
}

export const LayoutMiniCameraView: FC<LayoutMiniCameraViewProps> = (props) => {
    const { roomId = -1, textureReceiver = null, onClose = null, isSaving = false } = props;
    const elementRef = useRef<HTMLCanvasElement>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        let frame = 0;
        let last = 0;
        const tick = (now: number) => {
            if (now - last >= 1000 / 24) {
                last = now;
                blitRoomCanvasToViewfinder(elementRef.current, 110, 110);
            }
            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(frame);
    }, []);

    const takePicture = async () => {
        if (isCapturing || isSaving) return;

        const frame = getViewfinderRoomFrame(elementRef.current, 110, 110);

        if (!frame) return;

        setIsCapturing(true);
        PlaySound(SoundNames.CAMERA_SHUTTER);

        try {
            await textureReceiver(GetRoomEngine().createTextureFromRoom(roomId, 1, frame));
        } finally {
            setIsCapturing(false);
        }
    };

    const isBusy = isCapturing || isSaving;

    return (
        <DraggableWindow handleSelector=".octane-room-thumbnail-camera">
            <div
                className="octane-room-thumbnail-camera w-[132px] h-[192px] bg-[url('@/assets/images/room-widgets/thumbnail-widget/thumbnail-camera-spritesheet.png')] px-2"
                role="dialog"
                aria-label={LocalizeText('navigator.thumbnail.camera.title')}
                aria-busy={isBusy}
            >
                <div
                    style={{
                        position: 'relative',
                        paddingBottom: '192px' // Matches the space needed to position buttons as per the design
                    }}
                >
                    <canvas
                        ref={elementRef}
                        className="octane-camera-viewfinder absolute mt-[30px] ml-[3px] w-[110px] h-[110px] pointer-events-none"
                        width={110}
                        height={110}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '10px',
                            right: '10px',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}
                    >
                        <button type="button" className="btn btn-sm btn-danger" style={{ width: '52px' }} disabled={isBusy} onClick={onClose}>
                            {LocalizeText('cancel')}
                        </button>
                        <button type="button" className="btn btn-sm btn-success" style={{ width: '52px' }} disabled={isBusy} onClick={takePicture}>
                            {LocalizeText('navigator.thumbeditor.save')}
                        </button>
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
