import { RefObject, useLayoutEffect, useRef, useState } from 'react';
import { HANDHELD_WINDOW_MARGIN, HandheldFrameFit, fitHandheldFrame, handheldUsableArea, readSafeInsets } from '../../api/handheld/handheldWindowFit';
import { useHandheldStore } from '../../state/handheldStore';

const sameFit = (a: HandheldFrameFit | null, b: HandheldFrameFit | null): boolean =>
    a === b || (!!a && !!b && a.scale === b.scale && a.width === b.width && a.height === b.height && a.panX === b.panX && a.panY === b.panY);

/**
 * For a fixed-layout frame that is not a DraggableWindow (an AIR modal dialog): how much smaller it is drawn on a
 * phone, never below `minScale`. Null on desktop, or when no minimum scale is given, so nothing changes there.
 * The frame is measured again when the screen turns or its content changes size.
 */
export const useHandheldFrameFit = (ref: RefObject<HTMLElement | null>, minScale?: number, maxScale = 1): HandheldFrameFit | null => {
    const active = useHandheldStore((state) => state.layout.active);
    const [fit, setFit] = useState<HandheldFrameFit | null>(null);
    const scaleRef = useRef(1);
    const enabled = active && minScale !== undefined && minScale > 0;

    useLayoutEffect(() => {
        const element = ref.current;

        if (!enabled || !element) {
            scaleRef.current = 1;
            setFit(null);
            return;
        }

        const measure = () => {
            const rect = element.getBoundingClientRect();
            // The drawn size is the scaled one; the frame's own size is that divided by the scale in use.
            const width = rect.width > 0 ? rect.width / scaleRef.current : element.offsetWidth;
            const height = rect.height > 0 ? rect.height / scaleRef.current : element.offsetHeight;
            const area = handheldUsableArea(window.innerWidth, window.innerHeight, readSafeInsets(document));
            const next = fitHandheldFrame(Math.round(width), Math.round(height), area, minScale, HANDHELD_WINDOW_MARGIN, maxScale);

            scaleRef.current = next.scale;
            setFit((previous) => (sameFit(previous, next) ? previous : next));
        };

        measure();
        window.addEventListener('resize', measure);

        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;

        observer?.observe(element);

        return () => {
            window.removeEventListener('resize', measure);
            observer?.disconnect();
        };
    }, [enabled, minScale, maxScale, ref]);

    return enabled ? fit : null;
};
