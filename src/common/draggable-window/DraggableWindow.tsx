import {
    CSSProperties,
    FC,
    Key,
    MouseEvent as ReactMouseEvent,
    ReactNode,
    TouchEvent as ReactTouchEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState
} from 'react';
import { createPortal } from 'react-dom';
import { GetLocalStorage, SetLocalStorage, WindowSaveOptions } from '../../api';
import { DraggableWindowPosition } from './DraggableWindowPosition';

const CURRENT_WINDOWS: HTMLElement[] = [];
const POS_MEMORY: Map<Key, { x: number; y: number }> = new Map();
const BOUNDS_THRESHOLD_TOP: number = 0;
const BOUNDS_THRESHOLD_LEFT: number = 0;
const DRAG_OUTSIDE_PERCENT: number = 0.8;
const DRAG_START_THRESHOLD_PX: number = 3;

export interface DraggableWindowProps {
    uniqueKey?: Key;
    handleSelector?: string;
    windowPosition?: string;
    disableDrag?: boolean;
    dragStyle?: CSSProperties;
    offsetLeft?: number;
    offsetTop?: number;
    /** An explicit start position (a window tracker places the window); the remembered position of `uniqueKey` is then not used. */
    initialPosition?: { x: number; y: number };
    /** The position is taken as given, without keeping the window inside the viewport. */
    unconstrainedPosition?: boolean;
    /** Told where the window was dropped after a drag (or where an explicit start position was moved to). */
    onPositionChange?: (position: { x: number; y: number }) => void;
    children?: ReactNode;
}

export const DraggableWindow: FC<DraggableWindowProps> = (props) => {
    const {
        uniqueKey = null,
        handleSelector = '.drag-handler',
        windowPosition = DraggableWindowPosition.CENTER,
        disableDrag = false,
        dragStyle = {},
        children = null,
        offsetLeft = 0,
        offsetTop = 0,
        initialPosition,
        unconstrainedPosition = false,
        onPositionChange
    } = props;
    const [delta, setDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isPositioned, setIsPositioned] = useState(false);
    const [dragHandler, setDragHandler] = useState<HTMLElement>(null);
    const elementRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef({ x: 0, y: 0 });
    const deltaRef = useRef({ x: 0, y: 0 });
    const dragRef = useRef<{ pointerId: number; startX: number; startY: number; active: boolean } | null>(null);
    const bringToTop = useCallback(() => {
        let zIndex = 400;
        for (const existingWindow of CURRENT_WINDOWS) {
            zIndex += 1;
            existingWindow.style.zIndex = zIndex.toString();
        }
    }, []);

    const moveCurrentWindow = useCallback(() => {
        const index = CURRENT_WINDOWS.indexOf(elementRef.current);
        if (index === -1) {
            CURRENT_WINDOWS.push(elementRef.current);
        } else if (index === CURRENT_WINDOWS.length - 1) return;
        else if (index >= 0) {
            CURRENT_WINDOWS.splice(index, 1);
            CURRENT_WINDOWS.push(elementRef.current);
        }
        bringToTop();
    }, [bringToTop]);

    const onMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            moveCurrentWindow();
        },
        [moveCurrentWindow]
    );

    const onTouchStart = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            moveCurrentWindow();
        },
        [moveCurrentWindow]
    );

    const clampPosition = useCallback((newX: number, newY: number) => {
        if (unconstrainedPosition) return { x: newX, y: newY };
        if (!elementRef.current) return { x: newX, y: newY };

        const windowWidth = elementRef.current.offsetWidth;
        const windowHeight = elementRef.current.offsetHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxOutX = windowWidth * DRAG_OUTSIDE_PERCENT;
        const maxOutY = windowHeight * DRAG_OUTSIDE_PERCENT;
        const clampedX = Math.max(-maxOutX, Math.min(newX, viewportWidth - windowWidth + maxOutX));
        const clampedY = Math.max(BOUNDS_THRESHOLD_TOP, Math.min(newY, viewportHeight - windowHeight + maxOutY));

        return { x: clampedX, y: clampedY };
    }, [unconstrainedPosition]);

    const initialX = initialPosition?.x;
    const initialY = initialPosition?.y;
    const hasInitialPosition = initialPosition !== undefined;

    useLayoutEffect(() => {
        const element = elementRef.current as HTMLElement;
        if (!element) return;

        CURRENT_WINDOWS.push(element);
        bringToTop();

        return () => {
            const index = CURRENT_WINDOWS.indexOf(element);
            if (index >= 0) CURRENT_WINDOWS.splice(index, 1);
        };
    }, [handleSelector, windowPosition, uniqueKey, disableDrag, offsetLeft, offsetTop, bringToTop]);

    useLayoutEffect(() => {
        const element = elementRef.current as HTMLElement;
        if (!element) return;

        if (!disableDrag) {
            const handle = element.querySelector(handleSelector);
            if (handle) setDragHandler(handle as HTMLElement);
        }

        const windowWidth = element.offsetWidth || 340;
        const windowHeight = element.offsetHeight || 462;
        let offsetX = 0;
        let offsetY = 0;

        switch (windowPosition) {
            case DraggableWindowPosition.TOP_CENTER:
                offsetY = 50 + offsetTop;
                offsetX = (window.innerWidth - windowWidth) / 2 + offsetLeft;
                break;
            case DraggableWindowPosition.CENTER:
                offsetY = (window.innerHeight - windowHeight) / 2 + offsetTop;
                offsetX = (window.innerWidth - windowWidth) / 2 + offsetLeft;
                break;
            case DraggableWindowPosition.TOP_LEFT:
                offsetY = 50 + offsetTop;
                offsetX = 50 + offsetLeft;
                break;
        }

        const clampedPos = clampPosition(initialX ?? offsetX, initialY ?? offsetY);
        offsetRef.current = { x: clampedPos.x, y: clampedPos.y };
        deltaRef.current = { x: 0, y: 0 };
        setOffset({ x: clampedPos.x, y: clampedPos.y });
        setDelta({ x: 0, y: 0 });
        setIsPositioned(true);
        if (hasInitialPosition && (clampedPos.x !== initialX || clampedPos.y !== initialY)) onPositionChange?.(clampedPos);
    }, [handleSelector, windowPosition, uniqueKey, disableDrag, offsetLeft, offsetTop, clampPosition, initialX, initialY, hasInitialPosition, onPositionChange]);


    useEffect(() => {
        if (!dragHandler) return;

        const onPointerDown = (event: PointerEvent) => {
            if ((event.target as HTMLElement)?.closest?.('button, input, select, textarea, a')) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;

            dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false };
            deltaRef.current = { x: 0, y: 0 };
        };

        const onPointerMove = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;

            if (!drag.active) {
                if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) < DRAG_START_THRESHOLD_PX) return;

                drag.active = true;

                try {
                    dragHandler.setPointerCapture(event.pointerId);
                } catch {}

                setIsDragging(true);
            }

            const clampedPos = clampPosition(offsetRef.current.x + (event.clientX - drag.startX), offsetRef.current.y + (event.clientY - drag.startY));
            const nextDelta = { x: clampedPos.x - offsetRef.current.x, y: clampedPos.y - offsetRef.current.y };

            deltaRef.current = nextDelta;
            setDelta(nextDelta);
        };

        const onPointerEnd = (event: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || event.pointerId !== drag.pointerId) return;

            dragRef.current = null;

            if (!drag.active) return;

            try {
                dragHandler.releasePointerCapture(event.pointerId);
            } catch {}

            const clampedPos = clampPosition(offsetRef.current.x + deltaRef.current.x, offsetRef.current.y + deltaRef.current.y);

            deltaRef.current = { x: 0, y: 0 };
            offsetRef.current = clampedPos;
            setDelta({ x: 0, y: 0 });
            setOffset(clampedPos);
            setIsDragging(false);
            onPositionChange?.(clampedPos);

            if (uniqueKey !== null && !hasInitialPosition) {
                const newStorage = { ...GetLocalStorage<WindowSaveOptions>(`nitro.windows.${uniqueKey}`) };
                newStorage.offset = { x: clampedPos.x, y: clampedPos.y };
                SetLocalStorage<WindowSaveOptions>(`nitro.windows.${uniqueKey}`, newStorage);
            }
        };

        dragHandler.addEventListener('pointerdown', onPointerDown);
        dragHandler.addEventListener('pointermove', onPointerMove);
        dragHandler.addEventListener('pointerup', onPointerEnd);
        dragHandler.addEventListener('pointercancel', onPointerEnd);

        return () => {
            dragHandler.removeEventListener('pointerdown', onPointerDown);
            dragHandler.removeEventListener('pointermove', onPointerMove);
            dragHandler.removeEventListener('pointerup', onPointerEnd);
            dragHandler.removeEventListener('pointercancel', onPointerEnd);
        };
    }, [dragHandler, uniqueKey, clampPosition, hasInitialPosition, onPositionChange]);

    useEffect(() => {
        if (!uniqueKey || hasInitialPosition) return;

        const localStorage = GetLocalStorage<WindowSaveOptions>(`nitro.windows.${uniqueKey}`);
        if (!localStorage || !localStorage.offset) return;

        const clampedPos = clampPosition(localStorage.offset.x, localStorage.offset.y);
        offsetRef.current = { x: clampedPos.x, y: clampedPos.y };
        deltaRef.current = { x: 0, y: 0 };
        setDelta({ x: 0, y: 0 });
        setOffset({ x: clampedPos.x, y: clampedPos.y });
        setIsPositioned(true);
    }, [uniqueKey, clampPosition, hasInitialPosition]);

    return createPortal(
        <div
            ref={elementRef}
            className="absolute draggable-window"
            data-window-key={uniqueKey ?? undefined}
            style={{
                ...dragStyle,
                left: 0,
                top: 0,
                transform: `translate3d(${Math.round(offset.x + delta.x)}px, ${Math.round(offset.y + delta.y)}px, 0)`,
                willChange: isDragging ? 'transform' : undefined,
                backfaceVisibility: 'hidden',
                visibility: isPositioned ? 'visible' : 'hidden'
            }}
            onMouseDownCapture={onMouseDown}
            onTouchStartCapture={onTouchStart}
        >
            {children}
        </div>,
        document.getElementById('draggable-windows-container')
    );
};
