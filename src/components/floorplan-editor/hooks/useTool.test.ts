/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { initialState } from '../state/reducer';
import { FloorplanAction, FloorplanState } from '../state/types';
import { useTool } from './useTool';

const withBrush = (action: FloorplanState['brush']['action'], h = 0): FloorplanState => ({ ...initialState, brush: { h, action } });

const mockProjection = (tile: { row: number; col: number } | null) => ({
    fromClient: () => tile
});

describe('useTool', () => {
    it('SET dispatches PAINT_TILE on pointer down at hit tile', () => {
        const dispatch = vi.fn();
        const { result } = renderHook(() => useTool(withBrush('SET', 3), dispatch as React.Dispatch<FloorplanAction>, mockProjection({ row: 1, col: 2 })));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'PAINT_TILE', row: 1, col: 2, h: 3, source: 'local' });
    });

    it('UNSET dispatches ERASE_TILE', () => {
        const dispatch = vi.fn();
        const { result } = renderHook(() => useTool(withBrush('UNSET'), dispatch as React.Dispatch<FloorplanAction>, mockProjection({ row: 0, col: 0 })));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'ERASE_TILE', row: 0, col: 0, source: 'local' });
    });

    it('UP dispatches ADJUST_HEIGHT delta=+1', () => {
        const dispatch = vi.fn();
        const { result } = renderHook(() => useTool(withBrush('UP'), dispatch as React.Dispatch<FloorplanAction>, mockProjection({ row: 5, col: 6 })));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'ADJUST_HEIGHT', row: 5, col: 6, delta: 1, source: 'local' });
    });

    it('DOWN dispatches ADJUST_HEIGHT delta=-1', () => {
        const dispatch = vi.fn();
        const { result } = renderHook(() => useTool(withBrush('DOWN'), dispatch as React.Dispatch<FloorplanAction>, mockProjection({ row: 1, col: 1 })));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'ADJUST_HEIGHT', row: 1, col: 1, delta: -1, source: 'local' });
    });

    it('DOOR dispatches SET_DOOR with row→y, col→x', () => {
        const dispatch = vi.fn();
        const { result } = renderHook(() => useTool(withBrush('DOOR'), dispatch as React.Dispatch<FloorplanAction>, mockProjection({ row: 4, col: 7 })));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DOOR', x: 7, y: 4, source: 'local' });
    });

    it('does nothing when projection returns null', () => {
        const dispatch = vi.fn();
        const { result } = renderHook(() => useTool(withBrush('SET'), dispatch as React.Dispatch<FloorplanAction>, mockProjection(null)));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('PAINT continues on pointer move when dragging', () => {
        const dispatch = vi.fn();
        let projTile: { row: number; col: number } = { row: 0, col: 0 };
        const projection = { fromClient: () => projTile };
        const { result } = renderHook(() => useTool(withBrush('SET', 0), dispatch as React.Dispatch<FloorplanAction>, projection));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        dispatch.mockClear();
        projTile = { row: 0, col: 1 };
        act(() => result.current.onPointerMove({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'PAINT_TILE', row: 0, col: 1, h: 0, source: 'local' });
    });

    it('PAINT does not re-dispatch on move within same tile', () => {
        const dispatch = vi.fn();
        const projection = { fromClient: () => ({ row: 0, col: 0 }) };
        const { result } = renderHook(() => useTool(withBrush('SET'), dispatch as React.Dispatch<FloorplanAction>, projection));
        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        dispatch.mockClear();
        act(() => result.current.onPointerMove({ clientX: 1, clientY: 1, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).not.toHaveBeenCalled();
    });

    it('square-select drag dispatches SELECT_RECT (down + move) then APPLY_BRUSH_TO_SELECTION + SQUARE_SELECT_TOGGLE on release', () => {
        const dispatch = vi.fn();
        let projTile: { row: number; col: number } = { row: 2, col: 3 };
        const projection = { fromClient: () => projTile };
        const state: FloorplanState = { ...withBrush('SET'), squareSelect: true };
        const { result } = renderHook(() => useTool(state, dispatch as React.Dispatch<FloorplanAction>, projection));

        act(() => result.current.onPointerDown({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SELECT_RECT', from: [2, 3], to: [2, 3] });

        projTile = { row: 5, col: 7 };
        dispatch.mockClear();
        act(() => result.current.onPointerMove({ clientX: 10, clientY: 10, pointerId: 1, currentTarget: { setPointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenCalledWith({ type: 'SELECT_RECT', from: [2, 3], to: [5, 7] });
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'PAINT_TILE' }));

        dispatch.mockClear();
        act(() => result.current.onPointerUp({ clientX: 10, clientY: 10, pointerId: 1, currentTarget: { releasePointerCapture: () => {} } } as never));
        expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
        expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SQUARE_SELECT_TOGGLE' });
    });

    it('square-select pointer up without a prior down is a no-op', () => {
        const dispatch = vi.fn();
        const projection = { fromClient: () => ({ row: 0, col: 0 }) };
        const state: FloorplanState = { ...withBrush('SET'), squareSelect: true };
        const { result } = renderHook(() => useTool(state, dispatch as React.Dispatch<FloorplanAction>, projection));
        act(() => result.current.onPointerUp({ clientX: 0, clientY: 0, pointerId: 1, currentTarget: { releasePointerCapture: () => {} } } as never));
        expect(dispatch).not.toHaveBeenCalled();
    });
});
