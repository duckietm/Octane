import {
    FC,
    HTMLAttributes,
    KeyboardEvent as ReactKeyboardEvent,
    ReactNode,
    PointerEvent as ReactPointerEvent,
    Ref,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState
} from 'react';
import { getClassicScrollbarMetrics } from './classicScrollbar.helpers';

interface ClassicScrollAreaViewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onScroll'> {
    children: ReactNode;
    contentClassName?: string;
    contentStyle?: HTMLAttributes<HTMLDivElement>['style'];
    scrollStep?: number;
    viewportClassName?: string;
    viewportRef?: Ref<HTMLDivElement>;
}

interface DragState {
    pointerId: number;
    startScrollTop: number;
    startY: number;
}

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
    if (!ref) return;
    if (typeof ref === 'function') ref(value);
    else ref.current = value;
};

export const ClassicScrollAreaView: FC<ClassicScrollAreaViewProps> = ({
    children,
    className = '',
    contentClassName = '',
    contentStyle,
    scrollStep = 24,
    viewportClassName = '',
    viewportRef: forwardedViewportRef,
    ...rest
}) => {
    const generatedViewportId = useId();
    const viewportId = rest.id ? `${rest.id}-viewport` : generatedViewportId;
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [metrics, setMetrics] = useState(() => getClassicScrollbarMetrics(0, 0, 0, 0));

    const setViewportRef = useCallback(
        (element: HTMLDivElement | null) => {
            viewportRef.current = element;
            assignRef(forwardedViewportRef, element);
        },
        [forwardedViewportRef]
    );

    const updateMetrics = useCallback(() => {
        const viewport = viewportRef.current;
        const track = trackRef.current;
        if (!viewport || !track) return;

        setMetrics(getClassicScrollbarMetrics(viewport.scrollHeight, viewport.clientHeight, track.clientHeight, viewport.scrollTop));
    }, []);

    useLayoutEffect(() => {
        updateMetrics();
        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(updateMetrics);
        const viewport = viewportRef.current;
        const content = contentRef.current;
        const track = trackRef.current;

        if (viewport) observer.observe(viewport);
        if (content) observer.observe(content);
        if (track) observer.observe(track);

        return () => observer.disconnect();
    }, [children, updateMetrics]);

    const scrollBy = useCallback((amount: number) => {
        viewportRef.current?.scrollBy({ top: amount, behavior: 'auto' });
    }, []);

    const handleTrackPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.target !== event.currentTarget) return;
            const viewport = viewportRef.current;
            const track = trackRef.current;
            if (!viewport || !track) return;

            const clickOffset = event.clientY - track.getBoundingClientRect().top;
            const thumbCenter = metrics.thumbOffset + metrics.thumbSize / 2;
            viewport.scrollBy({ top: clickOffset < thumbCenter ? -viewport.clientHeight : viewport.clientHeight, behavior: 'auto' });
        },
        [metrics.thumbOffset, metrics.thumbSize]
    );

    const handleThumbPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, startScrollTop: viewport.scrollTop, startY: event.clientY };
    }, []);

    const handleThumbPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            const viewport = viewportRef.current;
            const track = trackRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !viewport || !track) return;

            const availableTrack = track.clientHeight - metrics.thumbSize;
            const maxScroll = viewport.scrollHeight - viewport.clientHeight;
            if (availableTrack <= 0 || maxScroll <= 0) return;

            viewport.scrollTop = drag.startScrollTop + ((event.clientY - drag.startY) / availableTrack) * maxScroll;
        },
        [metrics.thumbSize]
    );

    const stopDragging = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }, []);

    const handleThumbKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLDivElement>) => {
            const viewport = viewportRef.current;
            if (!viewport) return;

            const commands: Partial<Record<string, number>> = {
                ArrowDown: scrollStep,
                ArrowUp: -scrollStep,
                PageDown: viewport.clientHeight,
                PageUp: -viewport.clientHeight
            };

            if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                viewport.scrollTop = event.key === 'Home' ? 0 : viewport.scrollHeight;
                return;
            }

            const amount = commands[event.key];
            if (amount === undefined) return;

            event.preventDefault();
            scrollBy(amount);
        },
        [scrollBy, scrollStep]
    );

    return (
        <div className={`octane-classic-scroll-area ${className}`.trim()} {...rest}>
            <div ref={setViewportRef} id={viewportId} className={`octane-classic-scroll-area-viewport ${viewportClassName}`.trim()} onScroll={updateMetrics}>
                <div ref={contentRef} className={contentClassName} style={contentStyle}>
                    {children}
                </div>
            </div>
            <div className="octane-classic-scrollbar" data-visible={metrics.overflow}>
                <button aria-label="Scroll up" className="octane-classic-scrollbar-button is-up" type="button" onClick={() => scrollBy(-scrollStep)} />
                <div ref={trackRef} className="octane-classic-scrollbar-track" onPointerDown={handleTrackPointerDown}>
                    <div
                        className="octane-classic-scrollbar-thumb"
                        role="scrollbar"
                        aria-controls={viewportId}
                        aria-orientation="vertical"
                        aria-valuemax={Math.max(0, (viewportRef.current?.scrollHeight ?? 0) - (viewportRef.current?.clientHeight ?? 0))}
                        aria-valuemin={0}
                        aria-valuenow={Math.round(viewportRef.current?.scrollTop ?? 0)}
                        style={{ height: metrics.thumbSize, transform: `translateY(${metrics.thumbOffset}px)` }}
                        tabIndex={0}
                        onKeyDown={handleThumbKeyDown}
                        onPointerCancel={stopDragging}
                        onPointerDown={handleThumbPointerDown}
                        onPointerMove={handleThumbPointerMove}
                        onPointerUp={stopDragging}
                    />
                </div>
                <button aria-label="Scroll down" className="octane-classic-scrollbar-button is-down" type="button" onClick={() => scrollBy(scrollStep)} />
            </div>
        </div>
    );
};
