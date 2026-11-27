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
import { HandheldPeekOptions, resolveHandheldPeek } from '../../api/handheld/handheldPeek';
import {
    HANDHELD_WINDOW_MARGIN,
    HandheldWindowMode,
    fitAboveKeyboard,
    fitHandheldFrame,
    handheldUsableArea,
    placeHandheldWindow,
    readSafeInsets
} from '../../api/handheld/handheldWindowFit';
import { useHandheldStore } from '../../state/handheldStore';
import { NativeTextTransformScale } from '../native-text/NativeTextTransformScale';
import { HandheldPeekControls } from './HandheldPeekControls';

const CURRENT_WINDOWS: HTMLElement[] = [];
const POS_MEMORY: Map<Key, { x: number; y: number }> = new Map();
const BOUNDS_THRESHOLD_TOP: number = 0;
const BOUNDS_THRESHOLD_LEFT: number = 0;
const DRAG_OUTSIDE_PERCENT: number = 0.8;
const DRAG_START_THRESHOLD_PX: number = 3;
const CLOSE_BUTTON_SELECTOR: string = '.octane-card-close-button';
const TEXT_FIELD_SELECTOR: string = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/**
 * Escape closes the window on top by pressing its own close button, so every window keeps its own close
 * behaviour. Nothing happens while the user types in a field, or when anything else handled the key and
 * prevented its default (Base UI does when it closes a menu, select or dialog). That is checked once the
 * whole dispatch is over, so listeners registered after this one are seen too. Windows without the
 * standard close button are skipped.
 */
const closeTopWindowOnEscape = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;

    const target = event.target as HTMLElement | null;

    if (target?.closest?.(TEXT_FIELD_SELECTOR)) return;

    window.setTimeout(() => {
        if (event.defaultPrevented) return;

        for (let index = CURRENT_WINDOWS.length - 1; index >= 0; index--) {
            const closeButton = CURRENT_WINDOWS[index].querySelector<HTMLElement>(CLOSE_BUTTON_SELECTOR);

            if (!closeButton) continue;

            closeButton.click();

            return;
        }
    }, 0);
};

const trackWindow = (element: HTMLElement): void => {
    if (!CURRENT_WINDOWS.length) window.addEventListener('keydown', closeTopWindowOnEscape);

    CURRENT_WINDOWS.push(element);
};

const untrackWindow = (element: HTMLElement): void => {
    const index = CURRENT_WINDOWS.indexOf(element);

    if (index >= 0) CURRENT_WINDOWS.splice(index, 1);
    if (!CURRENT_WINDOWS.length) window.removeEventListener('keydown', closeTopWindowOnEscape);
};

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
    /** Phone layout: always shown as a sheet over the usable area, even when the window would fit as a dialog. */
    handheldSheet?: boolean;
    /**
     * Phone layout: the window has a fixed pixel layout that cannot reflow. It is drawn smaller as a whole to fit the
     * screen, down to this scale (0..1); what still does not fit is panned inside the window.
     */
    handheldScale?: number;
    /**
     * Phone layout, with `handheldScale`: a small window may also be drawn bigger, up to this scale (above 1), so its pixel text and
     * buttons are not desktop-sized on a phone.
     */
    handheldMaxScale?: number;
    /** Phone layout: the window works on the room and can be put aside to reach it (see resolveHandheldPeek). */
    handheldPeek?: HandheldPeekOptions;
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
        onPositionChange,
        handheldSheet = false,
        handheldScale,
        handheldMaxScale,
        handheldPeek
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
    // Phone layout: windows are not dragged but shown as a centred dialog or a sheet over the usable area.
    const handheldActive = useHandheldStore((state) => state.layout.active);
    const [handheldMode, setHandheldMode] = useState<HandheldWindowMode | null>(null);
    const [handheldSheetSize, setHandheldSheetSize] = useState<{ width: number; height: number } | null>(null);
    const [handheldFrame, setHandheldFrame] = useState<{ scale: number; pan: boolean } | null>(null);
    const handheldKeyboardInset = useHandheldStore((state) => state.keyboardInset);
    const naturalSizeRef = useRef<{ width: number; height: number } | null>(null);
    const frameScaleRef = useRef(1);
    const modeRef = useRef<HandheldWindowMode | null>(null);
    const [peekHiddenByUser, setPeekHiddenByUser] = useState(false);
    const peek = resolveHandheldPeek(handheldActive, handheldPeek, peekHiddenByUser);
    const scaledFit = handheldScale !== undefined && handheldScale > 0 && !handheldSheet;
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

    /** Places the window for the phone layout from the size it had before it was ever stretched into a sheet. */
    const placeForHandheld = useCallback(() => {
        const element = elementRef.current;

        if (!element) return;

        if (!naturalSizeRef.current) naturalSizeRef.current = { width: element.offsetWidth || 340, height: element.offsetHeight || 462 };

        // A dialog is never stretched, so its size is its content's: it is measured again, for content that changed size since.
        if (!scaledFit && !handheldSheet && modeRef.current === 'dialog' && element.offsetWidth > 0 && element.offsetHeight > 0) {
            naturalSizeRef.current = { width: element.offsetWidth, height: element.offsetHeight };
        }

        // A scaled window is measured again each time: its content can change size (the avatar editor's wardrobe).
        if (scaledFit) {
            const rect = (element.firstElementChild as HTMLElement | null)?.getBoundingClientRect();

            if (rect && rect.width > 0 && rect.height > 0) {
                naturalSizeRef.current = { width: Math.round(rect.width / frameScaleRef.current), height: Math.round(rect.height / frameScaleRef.current) };
            }
        }

        const natural = naturalSizeRef.current;
        const area = handheldUsableArea(window.innerWidth, window.innerHeight, readSafeInsets(document));
        let mode: HandheldWindowMode;
        let position: { x: number; y: number };
        let box: { width: number; height: number } | null = null;
        let frame: { scale: number; pan: boolean } | null = null;
        let height = natural.height;

        if (scaledFit) {
            const fit = fitHandheldFrame(natural.width, natural.height, area, handheldScale, HANDHELD_WINDOW_MARGIN, handheldMaxScale ?? 1);
            const centred = placeHandheldWindow(fit.width, fit.height, area);
            const pan = fit.panX || fit.panY || centred.mode === 'sheet';

            mode = 'scaled';
            frame = { scale: fit.scale, pan };
            position = pan ? { x: area.left, y: area.top } : { x: centred.x, y: centred.y };
            box = pan ? { width: area.width, height: area.height } : null;
            height = fit.height;
        } else {
            // A window that asks to be a sheet is a full screen of its own: it covers the whole viewport, the HUD and
            // the toolbar included (its header has the way back); the CSS pads it by the safe-area insets.
            const sheetArea = handheldSheet ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } : area;
            const placement = handheldSheet ? { mode: 'sheet' as const, x: 0, y: 0 } : placeHandheldWindow(natural.width, natural.height, area);

            mode = placement.mode;
            position = { x: placement.x, y: placement.y };
            box = placement.mode === 'sheet' ? { width: sheetArea.width, height: sheetArea.height } : null;
        }

        const keyboardArea = handheldSheet && !scaledFit ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } : area;

        // The on-screen keyboard opened for a field in this window: the window keeps clear of it.
        const keyboardInset = useHandheldStore.getState().keyboardInset;

        if (keyboardInset > 0 && element.contains(document.activeElement)) {
            const raised = fitAboveKeyboard(
                { mode: box ? 'sheet' : 'dialog', x: position.x, y: position.y },
                { width: box?.width ?? natural.width, height: box?.height ?? height },
                keyboardArea,
                window.innerHeight,
                keyboardInset
            );

            position = { x: raised.x, y: raised.y };
            if (box) box = { width: box.width, height: raised.height };
        }

        frameScaleRef.current = frame?.scale ?? 1;
        modeRef.current = mode;
        offsetRef.current = { x: position.x, y: position.y };
        deltaRef.current = { x: 0, y: 0 };
        setOffset({ x: position.x, y: position.y });
        setDelta({ x: 0, y: 0 });
        setHandheldMode(mode);
        setHandheldSheetSize(box);
        setHandheldFrame(frame);
        setIsPositioned(true);
    }, [scaledFit, handheldSheet, handheldScale, handheldMaxScale]);

    const initialX = initialPosition?.x;
    const initialY = initialPosition?.y;
    const hasInitialPosition = initialPosition !== undefined;

    useLayoutEffect(() => {
        const element = elementRef.current as HTMLElement;
        if (!element) return;

        trackWindow(element);
        bringToTop();

        return () => untrackWindow(element);
    }, [handleSelector, windowPosition, uniqueKey, disableDrag, offsetLeft, offsetTop, bringToTop]);

    useLayoutEffect(() => {
        const element = elementRef.current as HTMLElement;
        if (!element) return;

        if (handheldActive) {
            placeForHandheld();
            return;
        }

        if (handheldMode !== null) {
            setHandheldMode(null);
            setHandheldSheetSize(null);
            setHandheldFrame(null);
            frameScaleRef.current = 1;
            modeRef.current = null;
            setPeekHiddenByUser(false);
        }

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
        // handheldMode is only read to clear it when the phone layout ends; it is no dependency, so it never re-places the window.
    }, [handleSelector, windowPosition, uniqueKey, disableDrag, offsetLeft, offsetTop, clampPosition, initialX, initialY, hasInitialPosition, onPositionChange, handheldActive, placeForHandheld]);


    useEffect(() => {
        if (!dragHandler || handheldActive) return;

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
    }, [dragHandler, uniqueKey, clampPosition, hasInitialPosition, onPositionChange, handheldActive]);

    // A smaller browser window or another monitor must not leave a window out of reach.
    useEffect(() => {
        const keepInView = () => {
            if (handheldActive) {
                placeForHandheld();
                return;
            }

            if (dragRef.current?.active) return;

            const clampedPos = clampPosition(offsetRef.current.x, offsetRef.current.y);

            if (clampedPos.x === offsetRef.current.x && clampedPos.y === offsetRef.current.y) return;

            offsetRef.current = clampedPos;
            setOffset(clampedPos);
        };

        window.addEventListener('resize', keepInView);

        return () => window.removeEventListener('resize', keepInView);
    }, [clampPosition, handheldActive, placeForHandheld]);

    // The on-screen keyboard opening or closing moves a window that holds the focused field.
    useEffect(() => {
        if (!handheldActive) return;

        const element = elementRef.current;

        if (!element || (handheldKeyboardInset > 0 && !element.contains(document.activeElement))) return;

        placeForHandheld();
    }, [handheldActive, handheldKeyboardInset, placeForHandheld]);

    // A scaled window or a dialog is fitted again when its content changes size (a sheet already fills the area).
    useEffect(() => {
        if (!handheldActive || handheldSheet || typeof ResizeObserver === 'undefined') return;

        const content = elementRef.current?.firstElementChild;

        if (!content) return;

        let last = naturalSizeRef.current;
        const observer = new ResizeObserver(() => {
            const rect = content.getBoundingClientRect();
            const width = Math.round(rect.width / frameScaleRef.current);
            const height = Math.round(rect.height / frameScaleRef.current);

            if (!rect.width || modeRef.current === 'sheet' || (last && Math.abs(last.width - width) <= 1 && Math.abs(last.height - height) <= 1)) return;

            last = { width, height };
            placeForHandheld();
        });

        observer.observe(content);

        return () => observer.disconnect();
    }, [handheldActive, handheldSheet, placeForHandheld]);

    useEffect(() => {
        if (!uniqueKey || hasInitialPosition || handheldActive) return;

        const localStorage = GetLocalStorage<WindowSaveOptions>(`nitro.windows.${uniqueKey}`);
        if (!localStorage || !localStorage.offset) return;

        const clampedPos = clampPosition(localStorage.offset.x, localStorage.offset.y);
        offsetRef.current = { x: clampedPos.x, y: clampedPos.y };
        deltaRef.current = { x: 0, y: 0 };
        setDelta({ x: 0, y: 0 });
        setOffset({ x: clampedPos.x, y: clampedPos.y });
        setIsPositioned(true);
    }, [uniqueKey, clampPosition, hasInitialPosition, handheldActive]);

    return createPortal(
        <div
            ref={elementRef}
            className="absolute draggable-window"
            data-window-key={uniqueKey ?? undefined}
            data-handheld-window={handheldActive && handheldMode ? handheldMode : undefined}
            data-handheld-fullscreen={handheldActive && handheldSheet && handheldMode === 'sheet' ? '' : undefined}
            data-handheld-pan={handheldActive && handheldFrame?.pan ? '' : undefined}
            data-handheld-peeked={peek.hidden ? '' : undefined}
            data-handheld-fixed={handheldActive && scaledFit ? '' : undefined}
            style={{
                ...dragStyle,
                ...(handheldActive && handheldSheetSize ? { width: `${handheldSheetSize.width}px`, height: `${handheldSheetSize.height}px` } : null),
                ...(handheldActive && handheldFrame ? ({ '--octane-handheld-scale': String(handheldFrame.scale) } as CSSProperties) : null),
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
            {/* Labels in a window drawn smaller or bigger are rasterised at the size they are shown, not stretched. Always mounted, so a
                change of scale never remounts the window's content. */}
            <NativeTextTransformScale scale={handheldActive && handheldFrame ? handheldFrame.scale : 1} stage={elementRef}>
                {children}
            </NativeTextTransformScale>
            {handheldPeek && (peek.canHide || peek.hidden) && (
                <HandheldPeekControls options={handheldPeek} state={peek} onHide={() => setPeekHiddenByUser(true)} onShow={() => setPeekHiddenByUser(false)} />
            )}
        </div>,
        document.getElementById('draggable-windows-container')
    );
};
