import { FC, PointerEvent, useEffect, useRef, useState, WheelEvent } from 'react';
import {
    clampPlacement,
    drawProfileImage,
    encodeProfileImage,
    fillScale,
    fitScale,
    initialPlacement,
    localizeWithFallback,
    PROFILE_IMAGE_MAX_ZOOM,
    snapPixelScale,
    PROFILE_IMAGE_SIZE,
    ProfileImageKind,
    ProfileImagePlacement,
    zoomPlacement
} from '../../api';
import { Button, Slider } from '../../common';
import { Checkbox } from '../../common/Checkbox';

interface ProfileImageEditorViewProps {
    kind: ProfileImageKind;
    /** The decoded picture the user picked. */
    image: HTMLImageElement;
    /** Starts with sharp pixels on, for a gallery picture that is pixel art. */
    pixelArt?: boolean;
    busy?: boolean;
    onCancel: () => void;
    onSave: (bytes: Uint8Array) => void;
}

/** Places an uploaded picture in the banner or background frame: drag to move, zoom, fill, fit, centre. */
export const ProfileImageEditorView: FC<ProfileImageEditorViewProps> = ({ kind, image, pixelArt = false, busy = false, onCancel, onSave }) => {
    const frame = PROFILE_IMAGE_SIZE[kind];
    const size = { width: image.naturalWidth, height: image.naturalHeight };
    const minScale = fitScale(size, frame);
    const maxScale = fillScale(size, frame) * PROFILE_IMAGE_MAX_ZOOM;
    const canvas = useRef<HTMLCanvasElement>(null);
    const drag = useRef<{ x: number; y: number; placement: ProfileImagePlacement } | null>(null);
    // Pixel art, or a small picture (a sprite) that is usually meant to stay sharp when enlarged.
    const [pixelated, setPixelated] = useState(() => pixelArt || size.width * 2 <= frame.width || size.height * 2 <= frame.height);
    const [placement, setPlacement] = useState<ProfileImagePlacement>(() => {
        const start = initialPlacement(size, frame);

        return pixelated ? clampPlacement(size, frame, { ...start, scale: snapPixelScale(start.scale, minScale, maxScale) }) : start;
    });
    const [error, setError] = useState<string | null>(null);

    /** With sharp pixels on, every zoom lands on a scale that keeps the pixels even. */
    const sharpen = (scale: number) => (pixelated ? snapPixelScale(scale, minScale, maxScale) : scale);

    useEffect(() => {
        const context = canvas.current?.getContext('2d');

        if (!context) return;

        drawProfileImage(context, image, size, frame, placement, { pixelated });
    }, [image, placement, pixelated]);

    /** Frame pixels per screen pixel: the canvas is drawn at full size and shown smaller. */
    const frameRatio = () => {
        const bounds = canvas.current?.getBoundingClientRect();

        return bounds && bounds.width ? frame.width / bounds.width : 1;
    };

    const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, placement };
    };

    const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
        if (!drag.current) return;

        const ratio = frameRatio();
        const start = drag.current;

        setPlacement(
            clampPlacement(size, frame, {
                scale: start.placement.scale,
                centerX: start.placement.centerX + (event.clientX - start.x) * ratio,
                centerY: start.placement.centerY + (event.clientY - start.y) * ratio
            })
        );
    };

    const onPointerUp = () => {
        drag.current = null;
    };

    const onWheel = (event: WheelEvent<HTMLCanvasElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = frameRatio();
        const anchorX = (event.clientX - bounds.left) * ratio;
        const anchorY = (event.clientY - bounds.top) * ratio;

        setPlacement((current) => {
            // A sharp-pixel zoom steps from one whole scale to the next, so each wheel notch moves one step.
            const next = pixelated
                ? sharpen(event.deltaY < 0 ? (current.scale >= 1 ? current.scale + 1 : 1 / (Math.round(1 / current.scale) - 1)) : current.scale > 1 ? current.scale - 1 : 1 / (Math.round(1 / current.scale) + 1))
                : current.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1);

            return zoomPlacement(size, frame, current, next, anchorX, anchorY);
        });
    };

    const setScale = (scale: number) => setPlacement((current) => zoomPlacement(size, frame, current, sharpen(scale)));

    const togglePixelated = (checked: boolean) => {
        setPixelated(checked);

        if (checked) setPlacement((current) => zoomPlacement(size, frame, current, snapPixelScale(current.scale, minScale, maxScale)));
    };

    const save = async () => {
        if (!canvas.current) return;

        setError(null);

        const bytes = await encodeProfileImage(canvas.current);

        if (!bytes) {
            setError(localizeWithFallback('extendedprofile.customize.upload.too_large', 'This picture is too large, even after compressing it.'));

            return;
        }

        onSave(bytes);
    };

    // The slider is logarithmic, so the step from fit to fill feels as long as the step from fill to the maximum.
    const toSlider = (scale: number) => Math.round((Math.log(scale / minScale) / Math.log(maxScale / minScale)) * 1000);
    const fromSlider = (value: number) => minScale * Math.pow(maxScale / minScale, value / 1000);

    return (
        <div className={`octane-profile-image-editor octane-profile-image-editor--${kind}`}>
            <canvas
                ref={canvas}
                className={`octane-profile-image-editor__canvas${pixelated ? ' is-pixelated' : ''}`}
                width={frame.width}
                height={frame.height}
                aria-label={localizeWithFallback('extendedprofile.customize.upload.drag', 'Drag to move the picture')}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
            />
            <p className="octane-profile-image-editor__hint">{localizeWithFallback('extendedprofile.customize.upload.drag', 'Drag to move the picture')}</p>
            <div className="octane-profile-image-editor__zoom">
                <span>{localizeWithFallback('extendedprofile.customize.upload.zoom', 'Zoom')}</span>
                <Slider min={0} max={1000} step={1} value={toSlider(placement.scale)} onChange={(value: number) => setScale(fromSlider(value))} thumbAriaLabel={localizeWithFallback('extendedprofile.customize.upload.zoom', 'Zoom')} />
            </div>
            <div className="octane-profile-image-editor__actions">
                <Button variant="secondary" onClick={() => setScale(fillScale(size, frame))}>
                    {localizeWithFallback('extendedprofile.customize.upload.fill', 'Fill')}
                </Button>
                <Button variant="secondary" onClick={() => setScale(minScale)}>
                    {localizeWithFallback('extendedprofile.customize.upload.fit', 'Fit')}
                </Button>
                <Button variant="secondary" onClick={() => setPlacement((current) => clampPlacement(size, frame, { ...current, centerX: frame.width / 2, centerY: frame.height / 2 }))}>
                    {localizeWithFallback('extendedprofile.customize.upload.center', 'Centre')}
                </Button>
                <label className="octane-profile-image-editor__pixelated">
                    <Checkbox checked={pixelated} onCheckedChange={(checked: boolean) => togglePixelated(!!checked)} />
                    {localizeWithFallback('extendedprofile.customize.upload.pixelated', 'Sharp pixels')}
                </label>
            </div>
            {error && <p className="octane-profile-image-editor__error">{error}</p>}
            <div className="octane-profile-image-editor__footer">
                <Button variant="secondary" disabled={busy} onClick={onCancel}>
                    {localizeWithFallback('generic.cancel', 'Cancel')}
                </Button>
                <Button variant="success" disabled={busy} onClick={save}>
                    {localizeWithFallback('extendedprofile.customize.upload.save', 'Save')}
                </Button>
            </div>
        </div>
    );
};
