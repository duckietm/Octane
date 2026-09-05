import { GetRoomEngine, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { FC, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../common';

const PAD_W = 230;
const PAD_H = 150;
// How many offset units one pixel of drag represents.
const UNITS_PER_PX = 1.5;

interface Props {
    roomId: number;
    objectId: number;
    isWallItem: boolean;
    initialX: number;
    initialY: number;
    initialZ: number;
    initialScale: number;
    initialAlpha: number;
    onClose: () => void;
    onSave: (x: number, y: number, z: number, scale: number, alpha: number) => void;
}

export const ImagePositionEditorView: FC<Props> = (props) => {
    const { roomId, objectId, isWallItem, initialX, initialY, initialZ, initialScale, initialAlpha, onClose, onSave } = props;
    const [x, setX] = useState(initialX);
    const [y, setY] = useState(initialY);
    const [z, setZ] = useState(initialZ);
    const [scale, setScale] = useState(initialScale || 100);
    const [alpha, setAlpha] = useState(initialAlpha ?? 100);
    const padRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);

    const category = isWallItem ? RoomObjectCategory.WALL : RoomObjectCategory.FLOOR;

    // Local-only live preview: set the branding model values directly. The model
    // bumps its update counter so the visualization re-renders next frame.
    // Nothing is sent to the server until Save.
    const applyLive = useCallback(
        (nx: number, ny: number, nz: number, nScale: number, nAlpha: number) => {
            const roomObject = GetRoomEngine().getRoomObject(roomId, objectId, category);
            if (!roomObject?.model) return;

            roomObject.model.setValue(RoomObjectVariable.FURNITURE_BRANDING_OFFSET_X, nx);
            roomObject.model.setValue(RoomObjectVariable.FURNITURE_BRANDING_OFFSET_Y, ny);
            roomObject.model.setValue(RoomObjectVariable.FURNITURE_BRANDING_OFFSET_Z, nz);
            roomObject.model.setValue(RoomObjectVariable.FURNITURE_BRANDING_SCALE, nScale);
            roomObject.model.setValue(RoomObjectVariable.FURNITURE_BRANDING_ALPHA, nAlpha);
        },
        [roomId, objectId, category]
    );

    useEffect(() => {
        applyLive(x, y, z, scale, alpha);
    }, [x, y, z, scale, alpha, applyLive]);

    const setFromPointer = useCallback((clientX: number, clientY: number) => {
        const rect = padRef.current?.getBoundingClientRect();
        if (!rect) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        setX(Math.round((clientX - cx) * UNITS_PER_PX));
        setY(Math.round((clientY - cy) * UNITS_PER_PX));
    }, []);

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        draggingRef.current = true;
        padRef.current?.setPointerCapture(event.pointerId);
        setFromPointer(event.clientX, event.clientY);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (draggingRef.current) setFromPointer(event.clientX, event.clientY);
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        draggingRef.current = false;
        padRef.current?.releasePointerCapture?.(event.pointerId);
    };

    const cancel = () => {
        applyLive(initialX, initialY, initialZ, initialScale || 100, initialAlpha ?? 100);
        onClose();
    };

    const save = () => {
        onSave(x, y, z, scale, alpha);
        onClose();
    };

    const dotLeft = PAD_W / 2 + x / UNITS_PER_PX;
    const dotTop = PAD_H / 2 + y / UNITS_PER_PX;
    const clampedLeft = Math.max(0, Math.min(PAD_W, dotLeft));
    const clampedTop = Math.max(0, Math.min(PAD_H, dotTop));

    return (
        <OctaneCardView className="no-resize" uniqueKey="image-position-editor" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('image.position.editor.title')} onCloseClick={cancel} />
            <OctaneCardContentView>
                <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-black/60">{LocalizeText('image.position.editor.hint')}</span>
                    <div
                        ref={padRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        className="relative cursor-crosshair self-center rounded border border-black/30 bg-[#1b2733]"
                        style={{ width: PAD_W, height: PAD_H }}
                    >
                        {/* center crosshair */}
                        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
                        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />
                        {/* draggable dot */}
                        <div
                            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)] ring-2 ring-white/70"
                            style={{ left: clampedLeft, top: clampedTop }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="w-12 text-[11px] text-black/70">{LocalizeText('image.position.editor.scale')}</span>
                        <input
                            type="range"
                            min={10}
                            max={500}
                            step={1}
                            value={scale}
                            onChange={(e) => setScale(e.target.valueAsNumber || 100)}
                            className="grow"
                        />
                        <span className="w-12 text-right text-[11px] tabular-nums text-black/70">{(scale / 100).toFixed(2)}x</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="w-12 text-[11px] text-black/70">{LocalizeText('image.position.editor.opacity')}</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={alpha}
                            onChange={(e) => setAlpha(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 100)}
                            className="grow"
                        />
                        <span className="w-12 text-right text-[11px] tabular-nums text-black/70">{alpha}%</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <label className="flex flex-col gap-0.5 text-[11px] text-black/70">
                            {LocalizeText('image.position.editor.offsetx')}
                            <input type="number" value={x} onChange={(e) => setX(e.target.valueAsNumber || 0)} className="form-control form-control-sm" />
                        </label>
                        <label className="flex flex-col gap-0.5 text-[11px] text-black/70">
                            {LocalizeText('image.position.editor.offsety')}
                            <input type="number" value={y} onChange={(e) => setY(e.target.valueAsNumber || 0)} className="form-control form-control-sm" />
                        </label>
                        <label className="flex flex-col gap-0.5 text-[11px] text-black/70">
                            {LocalizeText('image.position.editor.offsetz')}
                            <input type="number" value={z} onChange={(e) => setZ(e.target.valueAsNumber || 0)} className="form-control form-control-sm" />
                        </label>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={cancel}>
                            {LocalizeText('image.position.editor.cancel')}
                        </Button>
                        <Button variant="success" onClick={save}>
                            {LocalizeText('save')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
