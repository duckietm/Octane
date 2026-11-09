import { Dispatch, PointerEvent, useCallback, useRef } from 'react';
import { FloorplanAction, FloorplanState } from '../state/types';
import { PointerProjection } from './usePointerToTile';

type Handlers = {
    onPointerDown: (e: PointerEvent<Element>) => void;
    onPointerMove: (e: PointerEvent<Element>) => void;
    onPointerUp: (e: PointerEvent<Element>) => void;
};

const tileKey = (row: number, col: number) => `${row},${col}` as const;

const dispatchForBrush = (action: FloorplanState['brush']['action'], h: number, row: number, col: number, dispatch: Dispatch<FloorplanAction>): void => {
    switch (action) {
        case 'SET':
            dispatch({ type: 'PAINT_TILE', row, col, h, source: 'local' });
            return;
        case 'UNSET':
            dispatch({ type: 'ERASE_TILE', row, col, source: 'local' });
            return;
        case 'UP':
            dispatch({ type: 'ADJUST_HEIGHT', row, col, delta: 1, source: 'local' });
            return;
        case 'DOWN':
            dispatch({ type: 'ADJUST_HEIGHT', row, col, delta: -1, source: 'local' });
            return;
        case 'DOOR':
            dispatch({ type: 'SET_DOOR', x: col, y: row, source: 'local' });
            return;
    }
};

export const useTool = (state: FloorplanState, dispatch: Dispatch<FloorplanAction>, projection: PointerProjection): Handlers => {
    const isDownRef = useRef(false);
    const lastTileRef = useRef<string | null>(null);
    const squareStartRef = useRef<{ row: number; col: number } | null>(null);

    const apply = useCallback(
        (e: PointerEvent<Element>) => {
            const hit = projection.fromClient(e.clientX, e.clientY);
            if (!hit) return;
            const key = tileKey(hit.row, hit.col);
            if (key === lastTileRef.current) return;
            lastTileRef.current = key;
            dispatchForBrush(state.brush.action, state.brush.h, hit.row, hit.col, dispatch);
        },
        [projection, state.brush.action, state.brush.h, dispatch]
    );

    const onPointerDown = useCallback(
        (e: PointerEvent<Element>) => {
            isDownRef.current = true;
            lastTileRef.current = null;
            try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
            } catch {}

            if (state.squareSelect) {
                const hit = projection.fromClient(e.clientX, e.clientY);
                if (!hit) return;
                squareStartRef.current = hit;
                dispatch({ type: 'SELECT_RECT', from: [hit.row, hit.col], to: [hit.row, hit.col] });
                return;
            }

            apply(e);
        },
        [apply, state.squareSelect, projection, dispatch]
    );

    const onPointerMove = useCallback(
        (e: PointerEvent<Element>) => {
            if (!isDownRef.current) return;

            if (state.squareSelect && squareStartRef.current) {
                const hit = projection.fromClient(e.clientX, e.clientY);
                if (!hit) return;
                const start = squareStartRef.current;
                dispatch({ type: 'SELECT_RECT', from: [start.row, start.col], to: [hit.row, hit.col] });
                return;
            }

            if (state.brush.action === 'DOOR') return;
            apply(e);
        },
        [apply, state.brush.action, state.squareSelect, projection, dispatch]
    );

    const onPointerUp = useCallback(
        (e: PointerEvent<Element>) => {
            isDownRef.current = false;
            lastTileRef.current = null;
            try {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
            } catch {}

            if (state.squareSelect && squareStartRef.current) {
                squareStartRef.current = null;
                dispatch({ type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
                dispatch({ type: 'SQUARE_SELECT_TOGGLE' });
            }
        },
        [state.squareSelect, dispatch]
    );

    return { onPointerDown, onPointerMove, onPointerUp };
};
