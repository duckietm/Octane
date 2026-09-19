import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFloorplanReducer } from './useFloorplanReducer';

describe('useFloorplanReducer', () => {
    it('starts with initialState', () => {
        const { result } = renderHook(() => useFloorplanReducer());
        expect(result.current.state.tiles).toEqual([]);
        expect(result.current.state.brush.action).toBe('SET');
    });

    it('loadFromServer seeds tiles + door + wallHeight', () => {
        const { result } = renderHook(() => useFloorplanReducer());
        act(() => {
            result.current.loadFromServer({
                tilemap: '00\rxq',
                entryPoint: [1, 0],
                entryPointDir: 4,
                thicknessWall: 1,
                thicknessFloor: 0,
                wallHeight: 5
            });
        });
        expect(result.current.state.tiles).toHaveLength(2);
        expect(result.current.state.door).toEqual({ x: 1, y: 0, dir: 4 });
        expect(result.current.state.thickness).toEqual({ wall: 1, floor: 0 });
        expect(result.current.state.wallHeight).toBe(5);
    });

    it('dispatch updates state synchronously', () => {
        const { result } = renderHook(() => useFloorplanReducer());
        act(() => {
            result.current.dispatch({ type: 'BRUSH_SET', action: 'DOOR' });
        });
        expect(result.current.state.brush.action).toBe('DOOR');
    });
});

describe('useFloorplanReducer — undo keeps furniture-occupied tiles', () => {
    it('restores the tilemap without dropping occupied flags', () => {
        const { result } = renderHook(() => useFloorplanReducer());
        act(() => {
            result.current.loadFromServer({ tilemap: '00\r00', entryPoint: [0, 0], entryPointDir: 2, thicknessWall: 1, thicknessFloor: 1, wallHeight: 0 });
            result.current.dispatch({ type: 'SET_OCCUPIED_TILES', map: [[false, true], [false, false]] });
        });
        act(() => {
            result.current.dispatch({ type: 'PAINT_TILE', row: 1, col: 1, h: 4, source: 'local' });
        });
        expect(result.current.state.tiles[1][1].h).toBe(4);
        expect(result.current.canUndo).toBe(true);

        act(() => result.current.undo());
        expect(result.current.state.tiles[1][1].h).toBe(0);
        expect(result.current.state.tiles[0][1].occupied).toBe(true);

        act(() => result.current.redo());
        expect(result.current.state.tiles[1][1].h).toBe(4);
        expect(result.current.state.tiles[0][1].occupied).toBe(true);
    });
});
