import { Key, PointerEvent, RefObject, useEffect, useRef } from 'react';

const windowSizes = new Map<Key, Partial<Record<'width' | 'height', number>>>();

export const CardResizeHandle = ({
    elementRef,
    uniqueKey = null,
    resizeAxis = 'both'
}: {
    elementRef: RefObject<HTMLDivElement | null>;
    resizeAxis?: 'both' | 'vertical' | 'horizontal';
    uniqueKey?: Key;
}) => {
    useEffect(() => {
        const dimensions = uniqueKey !== null ? windowSizes.get(uniqueKey) : null;
        if (!dimensions || !elementRef.current) return;
        for (const [dimension, value] of Object.entries(dimensions)) {
            elementRef.current.style.setProperty(dimension, `${value}px`, 'important');
        }
    }, [elementRef, uniqueKey]);

    const resizeStart = useRef<{ pointerId: number; x: number; y: number; width: number; height: number; scaleX: number; scaleY: number } | null>(null);

    const onResizeStart = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !elementRef.current) return;

        event.preventDefault();
        event.stopPropagation();
        const element = elementRef.current;
        const bounds = element.getBoundingClientRect();
        resizeStart.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            width: element.offsetWidth,
            height: element.offsetHeight,
            scaleX: bounds.width / element.offsetWidth,
            scaleY: bounds.height / element.offsetHeight
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onResizeMove = (event: PointerEvent<HTMLDivElement>) => {
        const start = resizeStart.current;
        const element = elementRef.current;
        if (!start || !element || start.pointerId !== event.pointerId) return;

        // CSS resolves percentage/viewport min/max sizes against the actual containing block.
        const resizeDimension = (dimension: 'width' | 'height', value: number) => {
            element.style.setProperty(dimension, `${Math.max(0, value)}px`, 'important');
            if (uniqueKey !== null) windowSizes.set(uniqueKey, { ...windowSizes.get(uniqueKey), [dimension]: Math.max(0, value) });
        };

        if (resizeAxis !== 'vertical') resizeDimension('width', start.width + (event.clientX - start.x) / start.scaleX);
        if (resizeAxis !== 'horizontal') resizeDimension('height', start.height + (event.clientY - start.y) / start.scaleY);
    };

    const onResizeEnd = () => {
        resizeStart.current = null;
    };

    return (
        <div
            aria-hidden="true"
            className={`octane-card-resize-handle is-${resizeAxis}`}
            onLostPointerCapture={onResizeEnd}
            onPointerCancel={onResizeEnd}
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
        />
    );
};
