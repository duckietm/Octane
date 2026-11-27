import { FC, PointerEvent as ReactPointerEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// scrollable_itemlist_vertical style 100, ported from the launcher scrollbar controller (class Lq) and measured on the native reward track:
// - the scroll position is a normalized offset in [0, 1] that every input adds to as a float; the list moves to trunc(offset * range),
//   while the lift sits on round(offset * (track - lift)), so three 75px wheel steps (224.99999999999997) rest on 224px with the lift on row 100;
// - the lift is trunc(track * visible / content) tall (visible / content clamped to 1) and the bar is hidden while everything fits;
// - one wheel event moves 75px, a press on the bare track pages once by visible - 15 towards the click (holding it does not repeat), a lift drag follows the
//   pointer from the first move after the press (that first move only sets the reference), no arrows, no keyboard.
const WHEEL_STEP = 75;
const PAGE_GAP = 15;

interface RewardTrackScrollListProps {
    className: string;
    contentClassName: string;
    height: number;
    children: ReactNode;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const RewardTrackScrollList: FC<RewardTrackScrollListProps> = ({ className, contentClassName, height, children }) =>
{
    const rootRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef(0);
    const dragRef = useRef<{ pointerId: number; startY: number | null; startOffset: number } | null>(null);
    const [offset, setOffsetState] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);

    const range = Math.max(0, contentHeight - height);
    const fraction = contentHeight > 0 ? Math.min(1, height / contentHeight) : 1;
    const liftHeight = Math.trunc(fraction * height);
    const travel = height - liftHeight;
    const overflow = range > 0;

    const setOffset = useCallback((value: number) =>
    {
        offsetRef.current = clamp(value);
        setOffsetState(offsetRef.current);
    }, []);

    useLayoutEffect(() =>
    {
        const content = contentRef.current;

        if (!content) return;

        const measure = () => setContentHeight(content.offsetHeight);

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(content);

        return () => observer.disconnect();
    }, []);

    // the content shrank or grew: the same offset fraction stays valid, a list that now fits goes back to the top
    useLayoutEffect(() =>
    {
        if (!overflow && offsetRef.current !== 0) setOffset(0);
    }, [overflow, setOffset]);

    useLayoutEffect(() =>
    {
        const viewport = viewportRef.current;

        if (viewport) viewport.scrollTop = Math.trunc(offset * range);
    }, [offset, range, contentHeight]);

    useEffect(() =>
    {
        const root = rootRef.current;

        if (!root) return;

        const onWheel = (event: WheelEvent) =>
        {
            if (!event.deltaY || !overflow) return;

            event.preventDefault();
            setOffset(offsetRef.current + (Math.sign(event.deltaY) * WHEEL_STEP) / range);
        };

        root.addEventListener('wheel', onWheel, { passive: false });

        return () => root.removeEventListener('wheel', onWheel);
    }, [overflow, range, setOffset]);

    const liftY = Math.round(offset * travel);

    const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) =>
    {
        if (event.target !== event.currentTarget || !overflow) return;

        const lift = event.currentTarget.getBoundingClientRect().top + liftY;
        const page = (height - PAGE_GAP) / range;

        if (event.clientY < lift) setOffset(offsetRef.current - page);
        else if (event.clientY > lift + liftHeight) setOffset(offsetRef.current + page);
    };

    const onLiftPointerDown = (event: ReactPointerEvent<HTMLDivElement>) =>
    {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, startY: null, startOffset: 0 };
    };

    const onLiftPointerMove = (event: ReactPointerEvent<HTMLDivElement>) =>
    {
        const drag = dragRef.current;

        if (!drag || drag.pointerId !== event.pointerId || travel <= 0) return;

        if (drag.startY === null)
        {
            drag.startY = event.clientY;
            drag.startOffset = offsetRef.current;

            return;
        }

        setOffset(drag.startOffset + (event.clientY - drag.startY) / travel);
    };

    const onLiftPointerUp = (event: ReactPointerEvent<HTMLDivElement>) =>
    {
        if (dragRef.current?.pointerId !== event.pointerId) return;

        dragRef.current = null;

        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    return (
        <div ref={rootRef} className={className}>
            <div ref={viewportRef} className="octane-reward-track-scroll-viewport">
                <div ref={contentRef} className={contentClassName}>
                    {children}
                </div>
            </div>
            {overflow && (
                <div className="octane-reward-track-scrollbar" onPointerDown={onTrackPointerDown}>
                    <div
                        className="octane-reward-track-scrollbar-lift"
                        style={{ height: liftHeight, transform: `translateY(${liftY}px)` }}
                        onPointerCancel={onLiftPointerUp}
                        onPointerDown={onLiftPointerDown}
                        onPointerMove={onLiftPointerMove}
                        onPointerUp={onLiftPointerUp}
                    />
                </div>
            )}
        </div>
    );
};
