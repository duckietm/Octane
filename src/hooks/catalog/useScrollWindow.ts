import { RefObject, useLayoutEffect, useState } from 'react';

export interface ScrollWindow {
    scrollTop: number;
    viewportHeight: number;
}

const EMPTY: ScrollWindow = { scrollTop: 0, viewportHeight: 0 };

/**
 * Scroll offset and height of a scrolling element, updated once per animation frame; the
 * initial `measure()` (and any re-measure triggered by `resetKey`, e.g. a page change that
 * zeroes `scrollTop`/`scrollLeft` on the element) runs inside a layout effect, so it reads
 * the DOM and commits synchronously before the browser paints, rather than one frame later.
 */
export const useScrollWindow = (elementRef: RefObject<HTMLElement | null>, enabled: boolean, resetKey?: unknown): ScrollWindow => {
    const [scrollWindow, setScrollWindow] = useState<ScrollWindow>(EMPTY);

    useLayoutEffect(() => {
        const element = elementRef.current;
        if (!enabled || !element) {
            setScrollWindow(EMPTY);
            return;
        }

        let frame = 0;
        const measure = () => {
            frame = 0;
            setScrollWindow((prev) =>
                prev.scrollTop === element.scrollTop && prev.viewportHeight === element.clientHeight
                    ? prev
                    : { scrollTop: element.scrollTop, viewportHeight: element.clientHeight }
            );
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };

        measure();
        element.addEventListener('scroll', schedule, { passive: true });
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
        observer?.observe(element);

        return () => {
            if (frame) cancelAnimationFrame(frame);
            element.removeEventListener('scroll', schedule, { capture: false });
            observer?.disconnect();
        };
    }, [elementRef, enabled, resetKey]);

    return scrollWindow;
};
