import { CSSProperties, PointerEvent as ReactPointerEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { GetLocalStorage, SetLocalStorage } from '../../../api';

export interface LoginWindowOffset {
    x: number;
    y: number;
}

export const loginWindowStorageKey = (id: string) => `octane.login.window.${id}`;

const VIEWPORT_MARGIN = 8;
const DRAG_DISABLED_QUERY = '(max-width: 900px)';
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, option, [role="button"]';

const readStoredOffset = (id: string): LoginWindowOffset => {
    const stored = GetLocalStorage<Partial<LoginWindowOffset>>(loginWindowStorageKey(id));
    const x = Number(stored?.x);
    const y = Number(stored?.y);

    return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
};

export interface DraggableLoginWindow {
    style: CSSProperties;
	
    dragging: boolean;
	
    handleProps: {
        onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
        onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
        onDoubleClick: () => void;
    };
}

export const useDraggableLoginWindow = (id: string, rootRef: RefObject<HTMLElement>): DraggableLoginWindow => {
    const [offset, setOffset] = useState<LoginWindowOffset>(() => readStoredOffset(id));
    const [dragging, setDragging] = useState(false);
    const offsetRef = useRef<LoginWindowOffset>(offset);
    const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

    const applyOffset = useCallback((next: LoginWindowOffset) => {
        offsetRef.current = next;
        setOffset(next);
    }, []);

    const clampOffset = useCallback(
        (next: LoginWindowOffset): LoginWindowOffset => {
            const element = rootRef.current;

            if (!element) return next;

            const rect = element.getBoundingClientRect();

            if (!rect.width || !rect.height) return next;

            const baseLeft = rect.left - offsetRef.current.x;
            const baseTop = rect.top - offsetRef.current.y;
            const minX = VIEWPORT_MARGIN - baseLeft;
            const maxX = window.innerWidth - rect.width - VIEWPORT_MARGIN - baseLeft;
            const minY = VIEWPORT_MARGIN - baseTop;
            const maxY = window.innerHeight - rect.height - VIEWPORT_MARGIN - baseTop;

            return {
                x: Math.round(Math.min(Math.max(next.x, minX), Math.max(minX, maxX))),
                y: Math.round(Math.min(Math.max(next.y, minY), Math.max(minY, maxY)))
            };
        },
        [rootRef]
    );

    const persist = useCallback(
        (next: LoginWindowOffset) => {
            try {
                if (!next.x && !next.y) window.localStorage.removeItem(loginWindowStorageKey(id));
                else SetLocalStorage<LoginWindowOffset>(loginWindowStorageKey(id), next);
            } catch {}
        },
        [id]
    );

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;

        const target = event.target as HTMLElement | null;

        if (target?.closest?.(INTERACTIVE_SELECTOR)) return;

        try {
            if (window.matchMedia?.(DRAG_DISABLED_QUERY)?.matches) return;
        } catch {}

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: offsetRef.current.x,
            originY: offsetRef.current.y
        };

        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {}

        setDragging(true);
        event.preventDefault();
    }, []);

    const onPointerMove = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            const drag = dragRef.current;

            if (!drag || drag.pointerId !== event.pointerId) return;

            applyOffset(clampOffset({ x: drag.originX + (event.clientX - drag.startX), y: drag.originY + (event.clientY - drag.startY) }));
        },
        [applyOffset, clampOffset]
    );

    const endDrag = useCallback(
        (event: ReactPointerEvent<HTMLElement>) => {
            const drag = dragRef.current;

            if (!drag || drag.pointerId !== event.pointerId) return;

            dragRef.current = null;

            try {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
            } catch {}

            setDragging(false);
            persist(offsetRef.current);
        },
        [persist]
    );

    const reset = useCallback(() => {
        dragRef.current = null;
        setDragging(false);
        applyOffset({ x: 0, y: 0 });
        persist({ x: 0, y: 0 });
    }, [applyOffset, persist]);

    useEffect(() => {
        const keepOnScreen = () => {
            const clamped = clampOffset(offsetRef.current);

            if (clamped.x !== offsetRef.current.x || clamped.y !== offsetRef.current.y) applyOffset(clamped);
        };

        keepOnScreen();
        window.addEventListener('resize', keepOnScreen);

        return () => window.removeEventListener('resize', keepOnScreen);
    }, [applyOffset, clampOffset]);

    const style = { '--login-drag-x': `${offset.x}px`, '--login-drag-y': `${offset.y}px` } as CSSProperties;

    return {
        style,
        dragging,
        handleProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onDoubleClick: reset }
    };
};
